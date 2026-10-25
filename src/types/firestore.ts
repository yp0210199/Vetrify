import { Timestamp, FieldValue } from 'firebase/firestore';
import { Product } from './product';
import { WarehousePermission } from './warehouse';

export type PharmacyProduct = Product;

/**
 * ============================================================================
 * 1. Global User Model (/users/{uid})
 * ============================================================================
 * IMPORTANT SECURITY PRINCIPLE:
 * The /users/{uid} document has ZERO authorization authority.
 * primaryOrganizationId is ONLY a workspace/UI preference hint.
 * It must NEVER be used for security rules, role checks, or tenant authorization.
 */
export interface FirestoreUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  primaryOrganizationId: string | null;
  status: 'active' | 'suspended' | 'pending';
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  lastLoginAt?: Timestamp | null;
}

export type FirestoreUserCreatePayload = Omit<FirestoreUser, 'createdAt' | 'updatedAt' | 'lastLoginAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  lastLoginAt: FieldValue | null;
};

export type FirestoreUserUpdatePayload = Partial<
  Pick<FirestoreUser, 'displayName' | 'photoURL' | 'phoneNumber' | 'primaryOrganizationId'>
> & {
  updatedAt: FieldValue;
  lastLoginAt?: FieldValue;
};

/**
 * ============================================================================
 * 2. Organization Model (/organizations/{organizationId})
 * ============================================================================
 * Top-level legal tenant entity.
 * Must NOT contain ownerUid. The owner is represented exclusively through
 * /organizations/{organizationId}/staff/{ownerUid} with roleId: 'owner'.
 */
export interface OrganizationSettings {
  fefoStrictEnforcement?: boolean;
  scheduleHAutoRegister?: boolean;
  taxInclusivePricing?: boolean;
  autoReorderTriggers?: boolean;
  nearExpiryThresholdDays?: number;
}

export interface Organization {
  id: string;
  name: string;
  legalName: string;
  gstin?: string;
  drugLicenseNumber?: string;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  status: 'active' | 'inactive' | 'trial';
  settings?: OrganizationSettings;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type OrganizationCreatePayload = Omit<Organization, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type OrganizationUpdatePayload = Partial<
  Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 3. Store / Pharmacy Branch Model (/organizations/{organizationId}/stores/{storeId})
 * ============================================================================
 */
export interface PharmacyStoreAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface PharmacyStore {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  address?: PharmacyStoreAddress;
  phone?: string;
  email?: string;
  drugLicenseNumber?: string;
  gstin?: string;
  isMainBranch: boolean;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PharmacyStoreCreatePayload = Omit<PharmacyStore, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type PharmacyStoreUpdatePayload = Partial<
  Omit<PharmacyStore, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 4. System Roles & Hierarchy
 * ============================================================================
 * Protected system roles with centralized immutable hierarchy rank.
 * owner (6) > admin (5) > manager (4) > pharmacist (3) > cashier (2) > staff (1)
 */
export type SystemRoleId =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'pharmacist'
  | 'cashier'
  | 'staff';

export const ROLE_RANKS: Readonly<Record<SystemRoleId, number>> = Object.freeze({
  owner: 6,
  admin: 5,
  manager: 4,
  pharmacist: 3,
  cashier: 2,
  staff: 1,
});

/**
 * Helper to get numeric hierarchy rank of any role ID
 */
export function getRoleRank(roleId: string): number {
  if (roleId in ROLE_RANKS) {
    return ROLE_RANKS[roleId as SystemRoleId];
  }
  return 0; // Custom operational roles default to rank 0 (lowest)
}

/**
 * Checks if a given role is a protected system role
 */
export function isSystemRole(roleId: string): roleId is SystemRoleId {
  return roleId in ROLE_RANKS;
}

/**
 * ============================================================================
 * 5. Typed Permission Namespaces (No Firestore Collection)
 * ============================================================================
 */
export type ProductPermission =
  | 'product.read'
  | 'product.create'
  | 'product.update'
  | 'product.archive'
  | 'product.import'
  | 'product.export';

export type MasterDataPermission =
  | 'master_data.read'
  | 'master_data.manage';

export type InventoryPermission =
  | 'inventory.read'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'inventory.audit'
  | 'inventory.batch.read'
  | 'inventory.batch.create'
  | 'inventory.batch.update'
  | 'inventory.batch.archive'
  | 'inventory.batch.adjust';

export type PosPermission =
  | 'pos.create'
  | 'pos.void'
  | 'pos.discount'
  | 'pos.return';

export type PurchasesPermission =
  | 'purchases.read'
  | 'purchases.create'
  | 'purchases.approve';

export type GstPermission =
  | "gst.view"
  | "gst.export"
  | "gst.prepare"
  | "gst.reconcile"
  | "gst.lock_period"
  | "gst.manage_configuration";

export type AccountingPermission =
  | "accounting.view"
  | "accounting.post"
  | "accounting.adjust";

export type EInvoicePermission =
  | "einvoice.generate"
  | "einvoice.cancel";

export type ReplenishmentPermission =
  | 'replenishment.read'
  | 'replenishment.manage_rules'
  | 'replenishment.run'
  | 'replenishment.approve'
  | 'replenishment.auto_po';

export type StaffPermission =
  | 'staff.read'
  | 'staff.invite'
  | 'staff.update_role'
  | 'staff.remove';

export type CompliancePermission =
  | 'compliance.schedule_h_read'
  | 'compliance.schedule_h_write';

export type SettingsPermission =
  | 'settings.read'
  | 'settings.update';

export type SupplierPermission =
  | 'supplier.read'
  | 'supplier.create'
  | 'supplier.update'
  | 'supplier.delete';

export type GRNPermission =
  | 'grn.read'
  | 'grn.create';

export type CustomerPermission =
  | 'customer.read'
  | 'customer.create'
  | 'customer.update'
  | 'customer.credit_sale'
  | 'customer.payment_record'
  | 'customer.credit_override'
  | 'customer.ledger_read'
  | 'customer.ledger_adjust';

export type ReturnsPermission =
  | 'returns.read'
  | 'returns.create'
  | 'returns.approve'
  | 'returns.process'
  | 'returns.refund';

export type CreditNotePermission =
  | 'credit_note.read'
  | 'credit_note.create'
  | 'credit_note.approve';

export type SupplierReturnPermission =
  | 'supplier_return.read'
  | 'supplier_return.create'
  | 'supplier_return.approve';

export type ExpiryPermission =
  | 'expiry.read'
  | 'expiry.quarantine'
  | 'expiry.destruction_request'
  | 'expiry.destruction_approve'
  | 'expiry.destruction_complete';

export type WholesalePermission =
  | 'wholesale.read'
  | 'wholesale.customer_manage'
  | 'wholesale.pricing_manage'
  | 'wholesale.quote_create'
  | 'wholesale.order_create'
  | 'wholesale.order_approve'
  | 'wholesale.fulfill'
  | 'wholesale.invoice_create'
  | 'wholesale.dispatch'
  | 'wholesale.credit_override';

export type StockTransferPermission =
  | 'stock_transfer.read'
  | 'stock_transfer.create'
  | 'stock_transfer.approve'
  | 'stock_transfer.allocate'
  | 'stock_transfer.dispatch'
  | 'stock_transfer.receive'
  | 'stock_transfer.cancel'
  | 'stock_transfer.manage';

export type Permission =
  | ProductPermission
  | MasterDataPermission
  | InventoryPermission
  | PosPermission
  | PurchasesPermission
  | SupplierPermission
  | GRNPermission
  | CustomerPermission
  | ReturnsPermission
  | CreditNotePermission
  | SupplierReturnPermission
  | ExpiryPermission
  | WholesalePermission
  | StockTransferPermission
  | StaffPermission
  | CompliancePermission
  | SettingsPermission
  | ReplenishmentPermission
  | GstPermission
  | AccountingPermission
  | EInvoicePermission
  | WarehousePermission;

export type PermissionCategory =
  | 'products'
  | 'master_data'
  | 'inventory'
  | 'pos'
  | 'purchases'
  | 'suppliers'
  | 'customers'
  | 'returns'
  | 'credit_notes'
  | 'supplier_returns'
  | 'expiry'
  | 'wholesale'
  | 'gst'
  | 'accounting'
  | 'einvoice'
  | 'stock_transfers'
  | 'staff'
  | 'compliance'
  | 'settings'
  | 'replenishment'
  | 'warehouses';

export const ALL_PERMISSIONS: ReadonlyArray<Permission> = Object.freeze([
  "gst.view",
  "gst.export",
  "gst.prepare",
  "gst.reconcile",
  "gst.lock_period",
  "gst.manage_configuration",
  "accounting.view",
  "accounting.post",
  "accounting.adjust",
  "einvoice.generate",
  "einvoice.cancel",
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
  'wholesale.read',
  'wholesale.customer_manage',
  'wholesale.pricing_manage',
  'wholesale.quote_create',
  'wholesale.order_create',
  'wholesale.order_approve',
  'wholesale.fulfill',
  'wholesale.invoice_create',
  'wholesale.dispatch',
  'wholesale.credit_override',
  'stock_transfer.read',
  'stock_transfer.create',
  'stock_transfer.approve',
  'stock_transfer.allocate',
  'stock_transfer.dispatch',
  'stock_transfer.receive',
  'stock_transfer.cancel',
  'stock_transfer.manage',
  'staff.read',
  'staff.invite',
  'staff.update_role',
  'staff.remove',
  'compliance.schedule_h_read',
  'compliance.schedule_h_write',
  'replenishment.read',
  'replenishment.manage_rules',
  'replenishment.run',
  'replenishment.approve',
  'replenishment.auto_po',
  'settings.read',
  'settings.update',
  'warehouse.view',
  'warehouse.create',
  'warehouse.edit',
  'warehouse.manageStock',
]);

/**
 * ============================================================================
 * 6. Custom Role Model (/organizations/{organizationId}/roles/{roleId})
 * ============================================================================
 * Operational permission bundles only.
 * Custom roles can never escalate to owner or admin.
 */
export interface Role {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RoleCreatePayload = Omit<Role, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type RoleUpdatePayload = Partial<
  Omit<Role, 'id' | 'organizationId' | 'isSystem' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 7. Staff Membership Model (/organizations/{organizationId}/staff/{uid})
 * ============================================================================
 * Document ID MUST equal Firebase Auth UID.
 * SINGLE SOURCE OF TRUTH for organization membership, role, and store access.
 */
export type StaffStatus = 'active' | 'suspended' | 'invited';

export interface StaffMember {
  uid: string;
  organizationId: string;
  allStoresAccess: boolean;
  storeIds: string[];
  roleId: SystemRoleId | string;
  employeeId?: string;
  displayName: string;
  email: string;
  phone?: string;
  phoneNumber?: string | null;
  photoURL?: string | null;
  status: StaffStatus;
  joinedAt: Timestamp;
  updatedAt: Timestamp;
}

export type StaffMemberCreatePayload = Omit<StaffMember, 'joinedAt' | 'updatedAt'> & {
  joinedAt: FieldValue;
  updatedAt: FieldValue;
};

export type StaffMemberUpdatePayload = Partial<
  Omit<StaffMember, 'uid' | 'organizationId' | 'joinedAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 7b. Staff Invitation Model (/organizations/{organizationId}/staffInvitations/{invitationId})
 * ============================================================================
 * Secure internal team onboarding invitation record.
 * Status lifecycle: pending -> accepted | revoked | expired
 */
export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface StaffInvitation {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  phone?: string;
  employeeId?: string;
  roleId: SystemRoleId | string;
  allStoresAccess: boolean;
  storeIds: string[];
  invitedByUid: string;
  invitedByEmail?: string | null;
  status: InvitationStatus;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  acceptedAt?: Timestamp | null;
  acceptedByUid?: string | null;
}

export type StaffInvitationCreatePayload = Omit<
  StaffInvitation,
  'createdAt' | 'updatedAt' | 'acceptedAt' | 'acceptedByUid'
> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  acceptedAt?: FieldValue | null;
  acceptedByUid?: string | null;
};

export type StaffInvitationUpdatePayload = Partial<
  Omit<StaffInvitation, 'id' | 'organizationId' | 'createdAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * Reusable Client-Side Store Access Helper (For UI state only; Security Rules enforce DB boundary)
 */
export function canAccessStore(
  staff: Pick<StaffMember, 'allStoresAccess' | 'storeIds' | 'status'> | null | undefined,
  storeId: string
): boolean {
  if (!staff || staff.status !== 'active') return false;
  if (staff.allStoresAccess) return true;
  return Array.isArray(staff.storeIds) && staff.storeIds.includes(storeId);
}

/**
 * ============================================================================
 * 8. Immutable Audit Log Model (/organizations/{organizationId}/auditLogs/{auditLogId})
 * ============================================================================
 * Append-only operational event logging.
 */
export type AuditAction =
  | 'organization.provisioned'
  | 'organization.updated'
  | 'store.created'
  | 'store.updated'
  | 'staff.invited'
  | 'staff.invitation_resent'
  | 'staff.invitation_revoked'
  | 'staff.activated'
  | 'staff.role_updated'
  | 'staff.store_access_updated'
  | 'staff.suspended'
  | 'staff.reactivated'
  | 'staff.removed'
  | 'role.created'
  | 'role.updated'
  | 'product.created'
  | 'product.updated'
  | 'product.archived'
  | 'product.restored'
  | 'product.deleted'
  | 'product.imported'
  | 'product.exported'
  | 'category.created'
  | 'category.updated'
  | 'manufacturer.created'
  | 'manufacturer.updated'
  | 'tax.updated'
  | 'hsn.updated'
  | 'notification.created'
  | 'notification.read'
  | 'media.uploaded'
  | 'media.replaced'
  | 'media.deleted'
  | 'batch.created'
  | 'batch.updated'
  | 'batch.archived'
  | 'batch.quarantined'
  | 'batch.recalled'
  | 'batch.status_changed'
  | 'sale.created'
  | 'sale.voided'
  | 'stock.depleted'
  | 'prescription.sale.completed'
  | 'supplier.created'
  | 'supplier.updated'
  | 'supplier.payment_recorded'
  | 'purchase_order.created'
  | 'purchase_order.draft'
  | 'purchase_order.pending_approval'
  | 'purchase_order.updated'
  | 'purchase_order.approved'
  | 'purchase_order.cancelled'
  | 'purchase_order.partially_fulfilled'
  | 'purchase_order.fulfilled'
  | 'grn.created'
  | 'grn.completed'
  | 'grn.finalized'
  | 'supplier_ledger.entry_created'
  | 'customer.created'
  | 'customer.updated'
  | 'credit.sale.created'
  | 'credit.payment.received'
  | 'credit.limit.changed'
  | 'credit.override.used'
  | 'customer.ledger.adjusted'
  | 'destruction.requested'
  | 'destruction.approved'
  | 'destruction.completed'
  | 'return.created'
  | 'return.override.used'
  | 'credit_note.created'
  | 'supplier_return.created'
  | 'stock_transfer.created'
  | 'stock_transfer.approved'
  | 'stock_transfer.allocated'
  | 'stock_transfer.dispatched'
  | 'stock_transfer.received'
  | 'stock_transfer.rejected'
  | 'stock_transfer.cancelled'
  | 'replenishment.settings.updated'
  | 'reorder.rule.created'
  | 'reorder.rule.updated'
  | 'reorder.recommendation.new'
  | 'reorder.recommendation.reviewed'
  | 'reorder.recommendation.approved'
  | 'reorder.recommendation.rejected'
  | 'reorder.recommendation.po_created'
  | 'reorder.recommendation.snoozed'
  | 'reorder.recommendation.expired'
  | 'reorder.po.created'
  | 'gst.configuration.updated'
  | 'gst.period.created'
  | 'gst.period.prepared'
  | 'gst.period.locked'
  | 'gst.report.exported'
  | 'gst.reconciliation.created'
  | 'gst.reconciliation.updated'
  | 'einvoice.validation.started'
  | 'einvoice.generated'
  | 'einvoice.failed'
  | 'einvoice.cancelled'
  | 'journal.created'
  | 'journal.adjustment.created'
  | 'tax.ledger.created';

export type AuditEntityType =
  | 'organization'
  | 'store'
  | 'staff'
  | 'role'
  | 'invitation'
  | 'product'
  | 'category'
  | 'manufacturer'
  | 'tax'
  | 'hsn'
  | 'notification'
  | 'media'
  | 'batch'
  | 'sale'
  | 'invoice'
  | 'supplier'
  | 'purchase_order'
  | 'grn'
  | 'supplier_ledger'
  | 'customer'
  | 'replenishment_setting'
  | 'reorder_rule'
  | 'reorder_recommendation'
  | 'customer_ledger'
  | 'customer_payment'
  | 'destruction'
  | 'quarantine'
  | 'stock_transfer'
  | 'sales_return'
  | 'credit_note'
  | 'supplier_return'
  | 'gst_ledger_entry'
  | 'journal_entry'
  | 'account'
  | 'einvoice_record'
  | 'einvoice_configuration'
  | 'gst_reconciliation_record'
  | 'gst_filing_period';

export interface AuditLog {
  id: string;
  organizationId: string;
  storeId: string | null;
  actorUid: string;
  actorEmail: string | null;
  actorDisplayName: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
}

export type AuditLogCreatePayload = Omit<AuditLog, 'timestamp'> & {
  timestamp: FieldValue;
};

/**
 * ============================================================================
 * 8b. Organization Notification Model (/organizations/{organizationId}/notifications/{notificationId})
 * ============================================================================
 * Tenant-isolated in-app notification records.
 */
export type NotificationType =
  | 'security'
  | 'staff'
  | 'inventory'
  | 'purchases'
  | 'pos'
  | 'compliance'
  | 'system'
  | 'announcements';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success';

export interface NotificationEntityRef {
  collection: string;
  id: string;
}

export interface Notification {
  id: string;
  organizationId: string;
  recipientUid: string; // 'all' or specific user UID
  type: NotificationType | string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  targetModule?: string;
  actionUrl?: string;
  entityRef?: NotificationEntityRef | null;
  read: boolean;
  readAt?: Timestamp | null;
  createdAt: Timestamp;
  expiresAt?: Timestamp | null;
}

export type NotificationCreatePayload = Omit<
  Notification,
  'createdAt' | 'readAt' | 'expiresAt'
> & {
  createdAt: FieldValue;
  readAt?: FieldValue | null;
  expiresAt?: FieldValue | null;
};

export type NotificationUpdatePayload = Partial<
  Pick<Notification, 'read'>
> & {
  readAt?: FieldValue | null;
};

/**
 * ============================================================================
 * 8c. Notification Preferences Model (/users/{uid}/notificationPreferences/{organizationId})
 * ============================================================================
 * User-level notification delivery preferences. Note: Preferences are NOT authorization!
 */
export interface CategoryPreference {
  inApp: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export type NotificationCategoryPreferences = Record<NotificationType, CategoryPreference>;

export interface UserNotificationPreferences {
  uid: string;
  organizationId: string;
  categories: NotificationCategoryPreferences;
  updatedAt: Timestamp;
}

/**
 * ============================================================================
 * 9. Organization Workspace Context State
 * ============================================================================
 */
export interface WorkspaceState {
  organization: Organization | null;
  currentStore: PharmacyStore | null;
  stores: PharmacyStore[];
  currentStaff: StaffMember | null;
  isLoading: boolean;
  hasWorkspace: boolean;
  error: string | null;
}

/**
 * ============================================================================
 * 10. POS Sale Invoice Model (/organizations/{organizationId}/invoices/{invoiceId})
 * ============================================================================
 */
export interface PrescriptionDetails {
  patientName: string;
  patientAge: number | string;
  patientGender?: 'male' | 'female' | 'other';
  patientPhone?: string;
  doctorName: string;
  doctorRegNo: string;
  hospitalClinic?: string;
  prescriptionDate?: string;
  notes?: string;
  prescriptionId?: string;
  secureUrl?: string;
  prescriptionUrl?: string;
}

export interface SaleInvoiceItem {
  productId: string;
  productName: string;
  brand: string;
  dosageForm?: string;
  sku: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string; // MM/YYYY or YYYY-MM-DD string representation for printable display
  expiryTimestamp?: Timestamp;
  hsnCode?: string;
  schedule?: 'OTC' | 'H' | 'H1' | 'X' | 'G' | string;
  isPrescriptionRequired: boolean;
  quantity: number;
  unit?: string;
  mrp: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTaxAmount: number;
  total: number;
}

export type PaymentMode = 'cash' | 'upi' | 'card' | 'credit';

export interface SaleInvoice {
  id: string;
  organizationId: string;
  storeId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  items: SaleInvoiceItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  hasScheduleHDrugs: boolean;
  prescription?: PrescriptionDetails | null;
  status: 'completed' | 'voided' | 'refunded';
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SaleInvoiceCreatePayload = Omit<SaleInvoice, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 11. Supplier Master Model (/organizations/{organizationId}/suppliers/{supplierId})
 * ============================================================================
 */
export interface SupplierAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  country?: string;
}

export type SupplierStatus = 'active' | 'inactive' | 'blocked';

export interface Supplier {
  id: string;
  organizationId: string;
  name: string;
  displayName?: string;
  code?: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  drugLicenseNumber?: string;
  drugLicense20B?: string;
  drugLicense21B?: string;
  panNumber?: string;
  address?: SupplierAddress;
  paymentTerms?: string; // NET_30, NET_15, IMMEDIATE, etc.
  paymentTermsDays?: number;
  creditLimit?: number;
  currentBalance: number; // Ledger debt balance
  status: SupplierStatus;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SupplierCreatePayload = Omit<Supplier, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type SupplierUpdatePayload = Partial<
  Omit<Supplier, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 12. Supplier Ledger Model (/organizations/{organizationId}/suppliers/{supplierId}/ledger/{entryId})
 * ============================================================================
 */
export interface SupplierLedgerEntry {
  id: string;
  organizationId: string;
  supplierId: string;
  type: 'grn' | 'payment' | 'adjustment' | 'return';
  referenceId: string; // GRN ID or Payment Txn ID
  referenceNumber: string; // GRN number or Payment Ref
  creditAmount: number; // Balance owed increases
  debitAmount: number; // Payment made decreases balance
  runningBalance: number;
  notes?: string;
  paymentMode?: string;
  createdByUid: string;
  createdAt: Timestamp;
}

export type SupplierLedgerEntryCreatePayload = Omit<SupplierLedgerEntry, 'createdAt'> & {
  createdAt: FieldValue;
};

/**
 * ============================================================================
 * 13. Purchase Order Model (/organizations/{organizationId}/purchaseOrders/{purchaseOrderId})
 * ============================================================================
 */
export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  brand?: string;
  sku?: string;
  hsnCode?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  gstRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export type POItem = PurchaseOrderItem;

export type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'cancelled';

export interface PurchaseOrder {
  id: string;
  organizationId: string;
  storeId: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  items: PurchaseOrderItem[];
  itemsCount: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  subtotal: number;
  totalTax: number;
  grandTotal: number;
  notes?: string;
  expectedDeliveryDate?: string;
  status: POStatus;
  createdByUid: string;
  createdByName?: string;
  approvedByUid?: string | null;
  approvedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PurchaseOrderCreatePayload = Omit<PurchaseOrder, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type PurchaseOrderUpdatePayload = Partial<
  Omit<PurchaseOrder, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 14. Goods Receipt Note (GRN) Model (/organizations/{organizationId}/grns/{grnId})
 * ============================================================================
 */
export interface GRNItem {
  productId: string;
  productName: string;
  brand?: string;
  sku?: string;
  hsnCode?: string;
  batchNumber: string;
  manufacturingDate?: string;
  expiryDate: string; // YYYY-MM-DD
  orderedQuantity: number;
  receivedQuantity: number;
  freeQuantity: number;
  unitPurchaseCost: number;
  unitMrp: number;
  unitSalePrice: number;
  discountPercent: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTaxAmount: number;
  totalAmount: number;
}

export type GRNStatus = 'draft' | 'completed' | 'cancelled';

export interface GRN {
  id: string;
  organizationId: string;
  storeId: string;
  poId: string;
  poNumber: string;
  grnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  supplierInvoiceDate: string;
  items: GRNItem[];
  itemsCount: number;
  totalReceivedQty: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  remarks?: string;
  status: GRNStatus;
  receivedByUid: string;
  receivedByName?: string;
  completedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GRNCreatePayload = Omit<GRN, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type GRNUpdatePayload = Partial<
  Omit<GRN, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 15. Customer Master Model (/organizations/{organizationId}/customers/{customerId})
 * ============================================================================
 */
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

export interface Customer {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateOfBirth?: string;
  gender?: string;
  notes?: string;
  creditEnabled: boolean;
  creditLimit: number;
  currentOutstanding: number;
  status: CustomerStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid?: string;
}

export type CustomerCreatePayload = Omit<Customer, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export type CustomerUpdatePayload = Partial<
  Omit<Customer, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
> & {
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 15b. Customer Khata Ledger Entry (/organizations/{organizationId}/customers/{customerId}/ledger/{ledgerEntryId})
 * ============================================================================
 */
export type CustomerLedgerType =
  | 'credit_sale'
  | 'payment_received'
  | 'sales_return'
  | 'credit_adjustment'
  | 'debit_adjustment'
  | 'opening_balance';

export interface CustomerLedgerEntry {
  id: string;
  organizationId: string;
  customerId: string;
  type: CustomerLedgerType;
  referenceId: string;
  referenceNumber: string;
  amount: number;
  creditAmount: number; // Amount added to outstanding balance (sale)
  debitAmount: number;  // Amount reduced from outstanding balance (payment)
  runningBalance: number;
  notes?: string;
  storeId?: string;
  createdByUid: string;
  createdAt: Timestamp;
}

export type CustomerLedgerEntryCreatePayload = Omit<CustomerLedgerEntry, 'createdAt'> & {
  createdAt: FieldValue;
};

/**
 * ============================================================================
 * 15c. Customer Payment Receipt (/organizations/{organizationId}/customerPayments/{paymentId})
 * ============================================================================
 */
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'other';

export interface CustomerPayment {
  id: string;
  organizationId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  receiptNumber: string;
  amount: number;
  paymentMode: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  previousOutstanding: number;
  remainingOutstanding: number;
  storeId?: string;
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
}

export type CustomerPaymentCreatePayload = Omit<CustomerPayment, 'createdAt'> & {
  createdAt: FieldValue;
};

/**
 * ============================================================================
 * 16. Customer Sales Returns (/organizations/{organizationId}/returns/{returnId})
 * ============================================================================
 */
export type ReturnCondition =
  | 'sealed_resalable'
  | 'opened'
  | 'damaged'
  | 'suspected_tampering'
  | 'temperature_compromised'
  | 'expired'
  | 'recalled'
  | 'unknown';

export type SalesReturnStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'processed'
  | 'refunded'
  | 'completed'
  | 'rejected'
  | 'cancelled';

export interface SalesReturnItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  originallySoldQty: number;
  previouslyReturnedQty: number;
  returnQty: number;
  unitPrice: number;
  mrp: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTaxAmount: number;
  totalAmount: number;
  condition: ReturnCondition;
  restocked: boolean;
  quarantineId?: string;
}

export interface SalesReturn {
  id: string;
  organizationId: string;
  storeId: string;
  returnNumber: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SalesReturnItem[];
  itemsCount: number;
  totalReturnQty: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  reason: string;
  creditNoteId?: string;
  refundMethod: 'khata_credit' | 'cash' | 'upi' | 'card' | 'bank_transfer' | 'none';
  refundStatus: 'pending' | 'processed' | 'not_applicable';
  isManagerOverride?: boolean;
  overrideManagerUid?: string;
  overrideReason?: string;
  status: SalesReturnStatus;
  createdByUid: string;
  createdByName?: string;
  approvedByUid?: string | null;
  approvedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SalesReturnCreatePayload = Omit<SalesReturn, 'createdAt' | 'updatedAt' | 'approvedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  approvedAt?: FieldValue | null;
};

/**
 * ============================================================================
 * 17. Credit Notes (/organizations/{organizationId}/creditNotes/{creditNoteId})
 * ============================================================================
 */
export type CreditNoteStatus = 'issued' | 'applied' | 'refunded' | 'cancelled';

export interface CreditNoteItem {
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalAmount: number;
}

export interface CreditNote {
  id: string;
  organizationId: string;
  storeId: string;
  creditNoteNumber: string;
  returnId: string;
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  issueDate: string;
  reason: string;
  items: CreditNoteItem[];
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  totalCreditAmount: number;
  refundMethod: string;
  status: CreditNoteStatus;
  createdByUid: string;
  createdByName?: string;
  approvedByUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CreditNoteCreatePayload = Omit<CreditNote, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 18. Supplier Returns (/organizations/{organizationId}/supplierReturns/{supplierReturnId})
 * ============================================================================
 */
export type SupplierReturnReason =
  | 'near_expiry'
  | 'damaged'
  | 'recalled'
  | 'wrong_supplied'
  | 'short_supplied'
  | 'other';

export type SupplierReturnStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'dispatched'
  | 'acknowledged'
  | 'completed'
  | 'cancelled';

export interface SupplierReturnItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPurchaseCost: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalAmount: number;
  reason: SupplierReturnReason;
}

export interface SupplierReturn {
  id: string;
  organizationId: string;
  storeId: string;
  supplierReturnNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNumber?: string;
  grnId?: string;
  grnNumber?: string;
  poId?: string;
  poNumber?: string;
  items: SupplierReturnItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  reason: string;
  status: SupplierReturnStatus;
  createdByUid: string;
  createdByName?: string;
  approvedByUid?: string | null;
  approvedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SupplierReturnCreatePayload = Omit<SupplierReturn, 'createdAt' | 'updatedAt' | 'approvedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  approvedAt?: FieldValue | null;
};

/**
 * ============================================================================
 * 19. Quarantine Records (/organizations/{organizationId}/quarantineRecords/{quarantineId})
 * ============================================================================
 */
export type QuarantineSource =
  | 'sales_return'
  | 'expiry'
  | 'damage'
  | 'recall'
  | 'supplier_return'
  | 'manual';

export type QuarantineStatus =
  | 'quarantined'
  | 'moved_to_destruction'
  | 'returned_to_supplier'
  | 'released';

export interface QuarantineRecord {
  id: string;
  organizationId: string;
  storeId: string;
  quarantineNumber: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  source: QuarantineSource;
  sourceReferenceId?: string;
  sourceReferenceNumber?: string;
  reason: string;
  condition: string;
  status: QuarantineStatus;
  quarantinedByUid: string;
  quarantinedByName?: string;
  quarantinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type QuarantineRecordCreatePayload = Omit<QuarantineRecord, 'quarantinedAt' | 'createdAt' | 'updatedAt'> & {
  quarantinedAt: FieldValue;
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

/**
 * ============================================================================
 * 20. Statutory Destruction Records (/organizations/{organizationId}/destructionRecords/{destructionId})
 * ============================================================================
 */
export type DestructionMethod =
  | 'incineration'
  | 'chemical_neutralization'
  | 'deep_burial'
  | 'authorized_waste_vendor'
  | 'other';

export type DestructionStatus =
  | 'destruction_pending'
  | 'approved_for_destruction'
  | 'destroyed'
  | 'rejected';

export interface DestructionRecord {
  id: string;
  organizationId: string;
  storeId: string;
  destructionNumber: string;
  certificateNumber: string;
  quarantineId?: string;
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  totalValuation: number;
  supplierId?: string;
  supplierName?: string;
  reason: string;
  destructionMethod: DestructionMethod;
  destructionDate: string;
  requestedByUid: string;
  requestedByName?: string;
  approvedByUid?: string | null;
  approvedByName?: string | null;
  witnessedByName?: string;
  witnessedByDesignation?: string;
  supportingDocUrl?: string;
  notes?: string;
  status: DestructionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type DestructionRecordCreatePayload = Omit<DestructionRecord, 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

