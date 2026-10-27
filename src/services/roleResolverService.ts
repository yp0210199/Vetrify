import {
  StaffMember,
  SystemRoleId,
  Permission,
  ALL_PERMISSIONS,
  ROLE_RANKS,
  isSystemRole,
} from '../types/firestore';
import { roleService } from './roleService';

export interface ResolvedRolePermissions {
  organizationId: string;
  uid: string;
  roleId: SystemRoleId | string;
  roleType: 'system' | 'custom';
  roleRank: number;
  isSystemRole: boolean;
  allStoresAccess: boolean;
  storeIds: string[];
  permissions: Permission[];
}

/**
 * Default permission maps for protected system roles
 */
const SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleId, Permission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  manager: [
    'product.read',
    'product.create',
    'product.update',
    'product.archive',
    'product.import',
    'product.export',
    'master_data.read',
    'master_data.manage',
    'inventory.read',
    'inventory.adjust',
    'inventory.transfer',
    'inventory.audit',
    'inventory.batch.read',
    'inventory.batch.create',
    'inventory.batch.update',
    'inventory.batch.archive',
    'inventory.batch.adjust',
    'pos.create',
    'pos.void',
    'pos.discount',
    'pos.return',
    'purchases.read',
    'purchases.create',
    'purchases.approve',
    'replenishment.read',
    'replenishment.manage_rules',
    'replenishment.run',
    'replenishment.approve',
    'replenishment.auto_po',
    'supplier.read',
    'supplier.create',
    'supplier.update',
    'supplier.delete',
    'grn.read',
    'grn.create',
    'customer.read',
    'customer.create',
    'customer.update',
    'customer.credit_sale',
    'customer.payment_record',
    'customer.credit_override',
    'customer.ledger_read',
    'customer.ledger_adjust',
    'returns.read',
    'returns.create',
    'returns.approve',
    'returns.process',
    'returns.refund',
    'credit_note.read',
    'credit_note.create',
    'credit_note.approve',
    'supplier_return.read',
    'supplier_return.create',
    'supplier_return.approve',
    'expiry.read',
    'expiry.quarantine',
    'expiry.destruction_request',
    'expiry.destruction_approve',
    'expiry.destruction_complete',
    'inventory.shade_lot_manage',
    'stock_transfer.read',
    'stock_transfer.create',
    'stock_transfer.approve',
    'stock_transfer.allocate',
    'stock_transfer.dispatch',
    'stock_transfer.receive',
    'gst.view',
    'accounting.view',
    'stock_transfer.cancel',
    'stock_transfer.manage',
    'settings.read',
    'gst.view',
    'gst.export',
    'gst.prepare',
    'gst.reconcile',
    'accounting.view',
    'einvoice.generate',
  ],
  sales_staff: [
    'product.read',
    'product.create',
    'product.update',
    'master_data.read',
    'inventory.read',
    'inventory.adjust',
    'inventory.batch.read',
    'inventory.batch.create',
    'inventory.batch.update',
    'inventory.batch.adjust',
    'pos.create',
    'pos.void',
    'pos.discount',
    'pos.return',
    'purchases.read',
    'replenishment.read',
    'supplier.read',
    'grn.read',
    'grn.create',
    'customer.read',
    'customer.create',
    'customer.update',
    'customer.credit_sale',
    'customer.payment_record',
    'customer.ledger_read',
    'returns.read',
    'returns.create',
    'credit_note.read',
    'supplier_return.read',
    'supplier_return.create',
    'expiry.read',
    'expiry.quarantine',
    'expiry.destruction_request',
    'inventory.shade_lot_manage',
    'stock_transfer.read',
    'stock_transfer.create',
    'stock_transfer.receive',
    'gst.view',
    'accounting.view',
  ],
  pharmacist: [
    'product.read',
    'product.create',
    'product.update',
    'master_data.read',
    'inventory.read',
    'inventory.adjust',
    'inventory.batch.read',
    'inventory.batch.create',
    'inventory.batch.update',
    'inventory.batch.adjust',
    'pos.create',
    'pos.void',
    'pos.discount',
    'pos.return',
    'purchases.read',
    'replenishment.read',
    'supplier.read',
    'grn.read',
    'grn.create',
    'customer.read',
    'customer.create',
    'customer.update',
    'customer.credit_sale',
    'customer.payment_record',
    'customer.ledger_read',
    'returns.read',
    'returns.create',
    'credit_note.read',
    'supplier_return.read',
    'supplier_return.create',
    'expiry.read',
    'expiry.quarantine',
    'expiry.destruction_request',
    'inventory.shade_lot_manage',
    'stock_transfer.read',
    'stock_transfer.create',
    'stock_transfer.receive',
    'gst.view',
    'accounting.view',
  ],
  cashier: [
    'product.read',
    'master_data.read',
    'inventory.read',
    'inventory.batch.read',
    'pos.create',
    'pos.return',
    'supplier.read',
    'customer.read',
    'customer.create',
    'customer.credit_sale',
    'customer.payment_record',
    'customer.ledger_read',
    'returns.read',
    'returns.create',
    'credit_note.read',
    'expiry.read',
  ],
  staff: [
    'product.read',
    'master_data.read',
    'inventory.read',
    'inventory.batch.read',
    'supplier.read',
    'customer.read',
    'expiry.read',
  ],
};

export const roleResolverService = {
  /**
   * Centralized role and permission resolver for a staff member.
   * Handles system roles and custom roles fetched from Firestore.
   * Fails closed (empty permissions) if a custom role document is missing or invalid.
   */
  async resolveStaffRole(
    orgId: string,
    uid: string,
    staff: StaffMember
  ): Promise<ResolvedRolePermissions> {
    const roleId = staff.roleId;

    // 1. System Role Resolution
    if (isSystemRole(roleId)) {
      const permissions = SYSTEM_ROLE_PERMISSIONS[roleId] || ['inventory.read'];
      const rank = ROLE_RANKS[roleId] || 1;

      return {
        organizationId: orgId,
        uid,
        roleId,
        roleType: 'system',
        roleRank: rank,
        isSystemRole: true,
        allStoresAccess: staff.allStoresAccess,
        storeIds: staff.storeIds || [],
        permissions,
      };
    }

    // 2. Custom Role Resolution (Operational permission bundles only)
    try {
      const customRole = await roleService.getRole(orgId, roleId);

      if (!customRole || customRole.organizationId !== orgId || customRole.isSystem) {
        console.warn(`Custom role ${roleId} in org ${orgId} is missing or invalid. Failing closed.`);
        return {
          organizationId: orgId,
          uid,
          roleId,
          roleType: 'custom',
          roleRank: 0,
          isSystemRole: false,
          allStoresAccess: staff.allStoresAccess,
          storeIds: staff.storeIds || [],
          permissions: [], // FAIL CLOSED
        };
      }

      return {
        organizationId: orgId,
        uid,
        roleId,
        roleType: 'custom',
        roleRank: 0, // Custom operational roles default to rank 0
        isSystemRole: false,
        allStoresAccess: staff.allStoresAccess,
        storeIds: staff.storeIds || [],
        permissions: customRole.permissions || [],
      };
    } catch (err) {
      console.error(`Failed to resolve custom role ${roleId} for org ${orgId}:`, err);
      return {
        organizationId: orgId,
        uid,
        roleId,
        roleType: 'custom',
        roleRank: 0,
        isSystemRole: false,
        allStoresAccess: staff.allStoresAccess,
        storeIds: staff.storeIds || [],
        permissions: [], // FAIL CLOSED
      };
    }
  },

  /**
   * Helper to check if a resolved role possesses a specific permission
   */
  hasPermission(resolvedRole: ResolvedRolePermissions | null | undefined, permission: Permission): boolean {
    if (!resolvedRole) return false;
    // Owner and Admin possess all permissions
    if (resolvedRole.roleId === 'owner' || resolvedRole.roleId === 'admin') {
      return true;
    }
    return resolvedRole.permissions.includes(permission);
  },
};
