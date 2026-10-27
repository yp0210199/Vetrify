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

describe('Phase 1 - Step 11: Returns, Credit Notes & Damage Write-Offs', () => {
  const orgId = 'org_test_tiles';
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
          productName: 'Kajaria 600x1200mm GVT Glossy Tile',
          batchId: 'batch_1',
          batchNumber: 'SHADE-A12',
          expiryDate: '2030-12-31',
          originallySoldQty: 10,
          previouslyReturnedQty: 0,
          returnQty: 2,
          unitPrice: 750,
          mrp: 900,
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 1500,
          gstRate: 18,
          cgstAmount: 135,
          sgstAmount: 135,
          totalTaxAmount: 270,
          totalAmount: 1770,
          condition: 'sealed_resalable',
          restocked: true,
        },
      ],
      itemsCount: 1,
      totalReturnQty: 2,
      subtotal: 1500,
      totalDiscount: 0,
      taxableAmount: 1500,
      cgstTotal: 135,
      sgstTotal: 135,
      totalTax: 270,
      roundOff: 0,
      grandTotal: 1770,
      reason: 'Customer project excess boxes return',
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
      taxableAmount: 1500,
      cgstTotal: 135,
      sgstTotal: 135,
      totalTax: 270,
      roundOff: 0,
      totalCreditAmount: 1770,
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
      supplierName: 'Kajaria Ceramics Distributors',
      items: [
        {
          productId: 'prod_1',
          productName: 'Kajaria 600x1200mm GVT Glossy Tile',
          batchId: 'batch_1',
          batchNumber: 'SHADE-A12',
          expiryDate: '2030-01-01',
          quantity: 5,
          unitPurchaseCost: 500,
          gstRate: 18,
          taxableAmount: 2500,
          cgstAmount: 225,
          sgstAmount: 225,
          totalAmount: 2950,
          reason: 'damaged',
        },
      ],
      itemsCount: 1,
      totalQuantity: 5,
      subtotal: 2500,
      taxableAmount: 2500,
      cgstTotal: 225,
      sgstTotal: 225,
      totalTax: 450,
      roundOff: 0,
      grandTotal: 2950,
      reason: 'Transit chip damage return',
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
      productName: 'Kajaria 600x1200mm GVT Glossy Tile',
      batchId: 'batch_1',
      batchNumber: 'SHADE-A12',
      expiryDate: '2030-01-01',
      quantity: 5,
      source: 'manual_quarantine',
      reason: 'Transit chip damage',
      condition: 'damaged',
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
      productName: 'Kajaria 600x1200mm GVT Glossy Tile',
      batchId: 'batch_1',
      batchNumber: 'SHADE-A12',
      expiryDate: '2030-01-01',
      quantity: 5,
      mrp: 900,
      purchasePrice: 500,
      totalValuation: 2500,
      reason: 'Cracked boxes write-off',
      destructionMethod: 'recycle_scrap',
      destructionDate: '2026-08-24',
      requestedByUid: 'user_123',
      status: 'destruction_pending',
    };

    expect(validateDestructionRecord(validDestruction, orgId)).toBe(true);
  });
});
