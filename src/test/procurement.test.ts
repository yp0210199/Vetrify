import {
  validateSupplier,
  validateSupplierLedgerEntry,
  validatePurchaseOrder,
  validateGRN,
} from '../lib/firebase/validators';
import { ALL_PERMISSIONS } from '../types/firestore';

describe('Phase 1 - Step 9: Procurement & Inventory Requisition Audit Test', () => {
  const orgId = 'org_test_omni';
  const storeId = 'store_test_main';

  test('RBAC System Roles include Step 9 permissions', () => {
    expect(ALL_PERMISSIONS).toContain('supplier.read');
    expect(ALL_PERMISSIONS).toContain('supplier.create');
    expect(ALL_PERMISSIONS).toContain('supplier.update');
    expect(ALL_PERMISSIONS).toContain('purchases.read');
    expect(ALL_PERMISSIONS).toContain('purchases.create');
    expect(ALL_PERMISSIONS).toContain('purchases.approve');
    expect(ALL_PERMISSIONS).toContain('grn.read');
    expect(ALL_PERMISSIONS).toContain('grn.create');
  });

  test('Runtime Validators for Supplier Entities', () => {
    const validSupplier = {
      id: 'sup_999',
      organizationId: orgId,
      name: 'Acme Pharmaceuticals',
      code: 'SUP-ACME',
      phone: '+919876543210',
      currentBalance: 0,
      status: 'active' as const,
      createdByUid: 'user_admin_123',
    };

    expect(validateSupplier(validSupplier, orgId)).toBe(true);

    // Negative tests
    expect(validateSupplier({ ...validSupplier, name: '' }, orgId)).toBe(false);
    expect(validateSupplier({ ...validSupplier, phone: '' }, orgId)).toBe(false);
    expect(validateSupplier({ ...validSupplier, currentBalance: 'invalid' }, orgId)).toBe(false);
    expect(validateSupplier(validSupplier, 'different_org')).toBe(false);
  });

  test('Runtime Validators for Supplier Ledger Entries', () => {
    const validLedgerEntry = {
      id: 'led_111',
      organizationId: orgId,
      supplierId: 'sup_999',
      type: 'grn' as const,
      referenceId: 'grn_111',
      referenceNumber: 'GRN-2026-0001',
      creditAmount: 15000,
      debitAmount: 0,
      runningBalance: 15000,
      createdByUid: 'user_admin_123',
    };

    expect(validateSupplierLedgerEntry(validLedgerEntry, orgId)).toBe(true);

    // Negative tests
    expect(validateSupplierLedgerEntry({ ...validLedgerEntry, creditAmount: -500 }, orgId)).toBe(false);
    expect(validateSupplierLedgerEntry({ ...validLedgerEntry, type: 'invalid_type' }, orgId)).toBe(false);
  });

  test('Runtime Validators for Purchase Orders', () => {
    const validPO = {
      id: 'po_555',
      organizationId: orgId,
      storeId,
      supplierId: 'sup_999',
      supplierName: 'Acme Pharmaceuticals',
      poNumber: 'PO-2026-0001',
      items: [
        {
          productId: 'prod_1',
          productName: 'Paracetamol 500mg',
          sku: 'SKU-PARA-500',
          orderedQuantity: 100,
          receivedQuantity: 0,
          unitCost: 1.5,
          taxRate: 12,
          taxAmount: 18,
          totalAmount: 168,
        },
      ],
      itemsCount: 1,
      totalOrderedQty: 100,
      totalReceivedQty: 0,
      subtotal: 150,
      totalTax: 18,
      grandTotal: 168,
      status: 'approved' as const,
      createdByUid: 'user_admin_123',
    };

    expect(validatePurchaseOrder(validPO, orgId)).toBe(true);

    // Negative tests
    expect(validatePurchaseOrder({ ...validPO, items: [] }, orgId)).toBe(false);
    expect(validatePurchaseOrder({ ...validPO, status: 'invalid_status' }, orgId)).toBe(false);
  });

  test('Runtime Validators for Goods Receipt Notes (GRN)', () => {
    const validGRN = {
      id: 'grn_777',
      organizationId: orgId,
      storeId,
      poId: 'po_555',
      poNumber: 'PO-2026-0001',
      grnNumber: 'GRN-2026-0001',
      supplierId: 'sup_999',
      supplierName: 'Acme Pharmaceuticals',
      supplierInvoiceNumber: 'INV-ACME-991',
      items: [
        {
          productId: 'prod_1',
          productName: 'Paracetamol 500mg',
          sku: 'SKU-PARA-500',
          batchNumber: 'BATCH-A1',
          expiryDate: '2028-12-31',
          receivedQuantity: 100,
          unitPurchaseCost: 1.5,
          unitMrp: 3.0,
          unitSalePrice: 2.5,
          taxRate: 12,
          taxableAmount: 150,
          taxAmount: 18,
          totalAmount: 168,
        },
      ],
      itemsCount: 1,
      totalReceivedQty: 100,
      subtotal: 150,
      taxableAmount: 150,
      totalTaxAmount: 18,
      grandTotal: 168,
      status: 'completed' as const,
      receivedByUid: 'user_admin_123',
    };

    expect(validateGRN(validGRN, orgId)).toBe(true);

    // Negative tests
    expect(validateGRN({ ...validGRN, items: [] }, orgId)).toBe(false);
    expect(validateGRN({ ...validGRN, supplierInvoiceNumber: '' }, orgId)).toBe(false);
  });
});
