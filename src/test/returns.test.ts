import { returnsService } from '../services/returnsService';
import { supplierReturnService } from '../services/supplierReturnService';
import { quarantineService } from '../services/quarantineService';
import { destructionService } from '../services/destructionService';
import {
  validateSalesReturn,
  validateCreditNote,
  validateSupplierReturn,
  validateQuarantineRecord,
  validateDestructionRecord,
} from '../lib/firebase/validators';
import { ALL_PERMISSIONS } from '../types/firestore';
import { roleResolverService } from '../services/roleResolverService';

describe('Phase 1 - Step 11: Returns, Credit Notes & Expiry Management', () => {
  const orgId = 'org_test_pharmacy';
  const storeId = 'store_test_main';

  test('RBAC System Roles include Step 11 permissions', () => {
    expect(ALL_PERMISSIONS).toContain('returns.read');
    expect(ALL_PERMISSIONS).toContain('returns.create');
    expect(ALL_PERMISSIONS).toContain('credit_note.create');
    expect(ALL_PERMISSIONS).toContain('supplier_return.create');
    expect(ALL_PERMISSIONS).toContain('expiry.quarantine');
    expect(ALL_PERMISSIONS).toContain('expiry.destruction_request');
  });

  test('Runtime Validators for Step 11 Entities', () => {
    const validReturnPayload = {
      id: 'ret_123',
      organizationId: orgId,
      storeId,
      returnNumber: 'RET-2026-0001',
      originalInvoiceId: 'inv_101',
      originalInvoiceNumber: 'INV-2026-1001',
      items: [
        {
          productId: 'prod_1',
          productName: 'Paracetamol 500mg',
          batchId: 'batch_1',
          batchNumber: 'B123',
          expiryDate: '2028-12-31',
          originallySoldQty: 10,
          previouslyReturnedQty: 0,
          returnQty: 2,
          unitPrice: 50,
          mrp: 50,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 100,
          gstRate: 12,
          cgstAmount: 6,
          sgstAmount: 6,
          totalTaxAmount: 12,
          totalAmount: 112,
          condition: 'sealed_resalable',
          restocked: true,
        },
      ],
      itemsCount: 1,
      totalReturnQty: 2,
      subtotal: 100,
      totalDiscount: 0,
      taxableAmount: 100,
      cgstTotal: 6,
      sgstTotal: 6,
      totalTax: 12,
      roundOff: 0,
      grandTotal: 112,
      reason: 'Customer return',
      creditNoteId: 'cn_123',
      refundMethod: 'cash',
      refundStatus: 'processed',
      isManagerOverride: false,
      status: 'completed',
      createdByUid: 'user_123',
    };

    expect(validateSalesReturn(validReturnPayload, orgId)).toBe(true);
    expect(validateSalesReturn({ ...validReturnPayload, grandTotal: -10 }, orgId)).toBe(false);

    const validCreditNote = {
      id: 'cn_123',
      organizationId: orgId,
      storeId,
      creditNoteNumber: 'CN-2026-0001',
      returnId: 'ret_123',
      originalInvoiceId: 'inv_101',
      originalInvoiceNumber: 'INV-2026-1001',
      issueDate: '2026-08-24',
      reason: 'Sales return',
      items: [],
      taxableAmount: 100,
      cgstTotal: 6,
      sgstTotal: 6,
      totalTax: 12,
      roundOff: 0,
      totalCreditAmount: 112,
      refundMethod: 'cash',
      status: 'issued',
      createdByUid: 'user_123',
    };

    expect(validateCreditNote(validCreditNote, orgId)).toBe(true);

    const validSupplierReturn = {
      id: 'sret_123',
      organizationId: orgId,
      storeId,
      supplierReturnNumber: 'SR-2026-0001',
      supplierId: 'sup_123',
      supplierName: 'MedLife Distributors',
      items: [
        {
          productId: 'prod_1',
          productName: 'Paracetamol 500mg',
          batchId: 'batch_1',
          batchNumber: 'B123',
          expiryDate: '2025-01-01',
          quantity: 5,
          unitPurchaseCost: 30,
          gstRate: 12,
          taxableAmount: 150,
          cgstAmount: 9,
          sgstAmount: 9,
          totalAmount: 168,
          reason: 'expired',
        },
      ],
      itemsCount: 1,
      totalQuantity: 5,
      subtotal: 150,
      taxableAmount: 150,
      cgstTotal: 9,
      sgstTotal: 9,
      totalTax: 18,
      roundOff: 0,
      grandTotal: 168,
      reason: 'Expired stock return',
      status: 'approved',
      createdByUid: 'user_123',
    };

    expect(validateSupplierReturn(validSupplierReturn, orgId)).toBe(true);

    const validQuarantine = {
      id: 'qrn_123',
      organizationId: orgId,
      storeId,
      quarantineNumber: 'QRN-2026-0001',
      productId: 'prod_1',
      productName: 'Paracetamol 500mg',
      batchId: 'batch_1',
      batchNumber: 'B123',
      expiryDate: '2025-01-01',
      quantity: 5,
      source: 'manual_quarantine',
      reason: 'Expired batch',
      condition: 'expired',
      status: 'quarantined',
      quarantinedByUid: 'user_123',
    };

    expect(validateQuarantineRecord(validQuarantine, orgId)).toBe(true);

    const validDestruction = {
      id: 'des_123',
      organizationId: orgId,
      storeId,
      destructionNumber: 'DES-2026-0001',
      certificateNumber: 'CERT-DES-2026-0001',
      productId: 'prod_1',
      productName: 'Paracetamol 500mg',
      batchId: 'batch_1',
      batchNumber: 'B123',
      expiryDate: '2025-01-01',
      quantity: 5,
      mrp: 50,
      purchasePrice: 30,
      totalValuation: 150,
      reason: 'Expired controlled drug',
      destructionMethod: 'incineration',
      destructionDate: '2026-08-24',
      requestedByUid: 'user_123',
      status: 'destruction_pending',
    };

    expect(validateDestructionRecord(validDestruction, orgId)).toBe(true);
  });
});
