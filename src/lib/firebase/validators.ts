import {
  FirestoreUser,
  Organization,
  PharmacyStore,
  StaffMember,
  StaffInvitation,
  Role,
  AuditLog,
  Permission,
  ALL_PERMISSIONS,
  ROLE_RANKS,
  SystemRoleId,
  SaleInvoice,
  PrescriptionDetails,
  Supplier,
  SupplierLedgerEntry,
  PurchaseOrder,
  GRN,
  Customer,
  CustomerLedgerEntry,
  CustomerPayment,
  SalesReturn,
  CreditNote,
  SupplierReturn,
  QuarantineRecord,
  DestructionRecord,
} from '../../types/firestore';

/**
 * Type guard for non-empty string
 */
function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Type guard for valid Permission
 */
export function isValidPermission(val: unknown): val is Permission {
  return typeof val === 'string' && (ALL_PERMISSIONS as readonly string[]).includes(val);
}

/**
 * Type guard for SystemRoleId
 */
export function isValidSystemRoleId(val: unknown): val is SystemRoleId {
  return typeof val === 'string' && val in ROLE_RANKS;
}

/**
 * Format validation helpers
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function isValidGstin(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  // Standard Indian 15-character GSTIN format: 2 digits (state) + 10 PAN chars + 1 entity code + 'Z' + 1 checksum char
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.trim().toUpperCase());
}

export function isValidPostalCode(postalCode: string, country = 'India'): boolean {
  if (!postalCode || typeof postalCode !== 'string') return false;
  const trimmed = postalCode.trim();
  if (country.toLowerCase() === 'india') {
    // 6-digit Indian PIN code
    return /^[1-9][0-9]{5}$/.test(trimmed);
  }
  // Generic 3-10 character postal code for international entries
  return /^[0-9A-Za-z -]{3,10}$/.test(trimmed);
}

export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  // 10 to 15 digits, allows optional + prefix and spaces/hyphens
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

/**
 * Runtime Validator for User Documents (/users/{uid})
 */
export function validateFirestoreUser(data: unknown): data is FirestoreUser {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    isNonEmptyString(d.uid) &&
    (d.status === 'active' || d.status === 'suspended' || d.status === 'pending')
  );
}

/**
 * Runtime Validator for Organization Documents (/organizations/{orgId})
 */
export function validateOrganization(data: unknown): data is Organization {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.name) &&
    isNonEmptyString(d.legalName) &&
    d.currency === 'INR' &&
    d.timezone === 'Asia/Kolkata' &&
    (d.status === 'active' || d.status === 'inactive' || d.status === 'trial') &&
    !('ownerUid' in d) // Enforces rule: Organization document must NOT contain ownerUid
  );
}

/**
 * Runtime Validator for Store Documents (/organizations/{orgId}/stores/{storeId})
 */
export function validatePharmacyStore(data: unknown, expectedOrgId?: string): data is PharmacyStore {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    isNonEmptyString(d.code) &&
    typeof d.isMainBranch === 'boolean' &&
    (d.status === 'active' || d.status === 'inactive');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Staff Membership Documents (/organizations/{orgId}/staff/{uid})
 */
export function validateStaffMember(data: unknown, expectedOrgId?: string): data is StaffMember {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.uid) &&
    isNonEmptyString(d.organizationId) &&
    typeof d.allStoresAccess === 'boolean' &&
    Array.isArray(d.storeIds) &&
    isNonEmptyString(d.roleId) &&
    isNonEmptyString(d.displayName) &&
    isNonEmptyString(d.email) &&
    (d.status === 'active' || d.status === 'suspended' || d.status === 'invited');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Staff Invitation Documents (/organizations/{orgId}/staffInvitations/{invitationId})
 */
export function validateStaffInvitation(data: unknown, expectedOrgId?: string): data is StaffInvitation {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.email) &&
    isValidEmail(d.email as string) &&
    isNonEmptyString(d.displayName) &&
    isNonEmptyString(d.roleId) &&
    typeof d.allStoresAccess === 'boolean' &&
    Array.isArray(d.storeIds) &&
    isNonEmptyString(d.invitedByUid) &&
    (d.status === 'pending' || d.status === 'accepted' || d.status === 'revoked' || d.status === 'expired');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Role Documents (/organizations/{orgId}/roles/{roleId})
 */
export function validateRole(data: unknown, expectedOrgId?: string): data is Role {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    Array.isArray(d.permissions) &&
    d.permissions.every(isValidPermission) &&
    typeof d.isSystem === 'boolean';

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Audit Log Documents (/organizations/{orgId}/auditLogs/{logId})
 */
export function validateAuditLog(data: unknown, expectedOrgId?: string): data is AuditLog {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.actorUid) &&
    isNonEmptyString(d.action) &&
    isNonEmptyString(d.entityType) &&
    isNonEmptyString(d.entityId) &&
    typeof d.metadata === 'object' &&
    d.metadata !== null;

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Notification Documents (/organizations/{orgId}/notifications/{notificationId})
 */
export function validateNotification(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.recipientUid) &&
    isNonEmptyString(d.title) &&
    isNonEmptyString(d.message) &&
    typeof d.read === 'boolean';

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Product Documents (/organizations/{orgId}/products/{productId})
 */
export function validateProduct(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.sku) &&
    isNonEmptyString(d.productName) &&
    isNonEmptyString(d.brand) &&
    isNonEmptyString(d.composition) &&
    typeof d.defaultMrp === 'number' && d.defaultMrp >= 0 &&
    typeof d.defaultPurchaseCost === 'number' && d.defaultPurchaseCost >= 0 &&
    typeof d.defaultSalePrice === 'number' && d.defaultSalePrice >= 0 &&
    (d.status === 'active' || d.status === 'inactive' || d.status === 'archived');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Category Documents (/organizations/{orgId}/categories/{categoryId})
 */
export function validateProductCategory(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    (d.status === 'active' || d.status === 'inactive');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Manufacturer Documents (/organizations/{orgId}/manufacturers/{mfrId})
 */
export function validateManufacturer(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    isNonEmptyString(d.normalizedName) &&
    (d.status === 'active' || d.status === 'inactive');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Tax Slab Documents (/organizations/{orgId}/taxes/{taxId})
 */
export function validateTaxSlab(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    typeof d.gstRate === 'number' && d.gstRate >= 0 &&
    (d.status === 'active' || d.status === 'inactive');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for HSN Documents (/organizations/{orgId}/hsnCodes/{hsnId})
 */
export function validateHsnRecord(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.code) &&
    typeof d.defaultGstRate === 'number' &&
    (d.status === 'active' || d.status === 'inactive');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Robust Timestamp / Date checking helper
 */
function isValidTimestamp(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === 'object') {
    const v = val as any;
    return (
      (typeof v.seconds === 'number' && typeof v.nanoseconds === 'number') ||
      typeof v.toDate === 'function' ||
      v instanceof Date ||
      typeof v.toMillis === 'function'
    );
  }
  return false;
}

/**
 * Millisecond getter for robust comparison of Timestamp or Date
 */
function getMillis(val: unknown): number | null {
  if (!val) return null;
  const v = val as any;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  return null;
}

/**
 * Runtime Validator for Pharmacy Batch Documents (/organizations/{orgId}/batches/{batchId})
 */
export function validatePharmacyBatch(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  const hasValidFields =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.productId) &&
    isNonEmptyString(d.batchNumber) &&
    isNonEmptyString(d.normalizedBatchNumber) &&
    isValidTimestamp(d.manufacturingDate) &&
    isValidTimestamp(d.expiryDate) &&
    typeof d.purchasePrice === 'number' && d.purchasePrice >= 0 &&
    typeof d.mrp === 'number' && d.mrp >= 0 &&
    typeof d.salePrice === 'number' && d.salePrice >= 0 &&
    typeof d.quantity === 'number' && d.quantity >= 0 &&
    typeof d.reservedQuantity === 'number' && d.reservedQuantity >= 0 &&
    typeof d.availableQuantity === 'number' && d.availableQuantity >= 0 &&
    (d.status === 'active' ||
      d.status === 'depleted' ||
      d.status === 'expired' ||
      d.status === 'quarantined' ||
      d.status === 'recalled' ||
      d.status === 'archived');

  if (!hasValidFields) return false;

  const mfgMillis = getMillis(d.manufacturingDate);
  const expMillis = getMillis(d.expiryDate);
  if (mfgMillis !== null && expMillis !== null && mfgMillis > expMillis) {
    return false;
  }

  if (expectedOrgId && d.organizationId !== expectedOrgId) {
    return false;
  }

  return true;
}

/**
 * Runtime Validator for Statutory Prescription Details
 */
export function validatePrescriptionDetails(data: unknown): data is PrescriptionDetails {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    isNonEmptyString(d.patientName) &&
    (typeof d.patientAge === 'number' || isNonEmptyString(d.patientAge)) &&
    isNonEmptyString(d.doctorName) &&
    isNonEmptyString(d.doctorRegNo)
  );
}

/**
 * Runtime Validator for Sale Invoice Documents (/organizations/{orgId}/invoices/{invoiceId})
 */
export function validateSaleInvoice(data: unknown, expectedOrgId?: string): data is SaleInvoice {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;

  const hasValidFields =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.invoiceNumber) &&
    isNonEmptyString(d.customerName) &&
    (d.paymentMode === 'cash' || d.paymentMode === 'upi' || d.paymentMode === 'card' || d.paymentMode === 'credit') &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.itemsCount === 'number' &&
    typeof d.totalQuantity === 'number' &&
    typeof d.subtotal === 'number' &&
    typeof d.totalDiscount === 'number' &&
    typeof d.taxableAmount === 'number' &&
    typeof d.cgstTotal === 'number' &&
    typeof d.sgstTotal === 'number' &&
    typeof d.totalTax === 'number' &&
    typeof d.roundOff === 'number' &&
    typeof d.grandTotal === 'number' &&
    typeof d.hasScheduleHDrugs === 'boolean' &&
    (d.status === 'completed' || d.status === 'voided' || d.status === 'refunded') &&
    isNonEmptyString(d.createdByUid);

  if (!hasValidFields) return false;

  if (expectedOrgId && d.organizationId !== expectedOrgId) {
    return false;
  }

  // If Schedule H/H1/X drugs are present, prescription must be provided and valid
  if (d.hasScheduleHDrugs) {
    if (!validatePrescriptionDetails(d.prescription)) {
      return false;
    }
  }

  // Validate items
  for (const item of d.items as any[]) {
    if (
      !isNonEmptyString(item.productId) ||
      !isNonEmptyString(item.productName) ||
      !isNonEmptyString(item.batchId) ||
      !isNonEmptyString(item.batchNumber) ||
      typeof item.quantity !== 'number' ||
      item.quantity <= 0 ||
      typeof item.unitPrice !== 'number' ||
      item.unitPrice < 0 ||
      typeof item.total !== 'number'
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Runtime Validator for Supplier Documents (/organizations/{orgId}/suppliers/{supplierId})
 */
export function validateSupplier(data: unknown, expectedOrgId?: string): data is Supplier {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    isNonEmptyString(d.phone) &&
    typeof d.currentBalance === 'number' &&
    (d.status === 'active' || d.status === 'inactive' || d.status === 'blocked') &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Supplier Ledger Entry Documents
 */
export function validateSupplierLedgerEntry(data: unknown, expectedOrgId?: string): data is SupplierLedgerEntry {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.supplierId) &&
    (d.type === 'grn' || d.type === 'payment' || d.type === 'adjustment' || d.type === 'return') &&
    isNonEmptyString(d.referenceId) &&
    isNonEmptyString(d.referenceNumber) &&
    typeof d.creditAmount === 'number' && d.creditAmount >= 0 &&
    typeof d.debitAmount === 'number' && d.debitAmount >= 0 &&
    typeof d.runningBalance === 'number' &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Purchase Order Documents (/organizations/{orgId}/purchaseOrders/{poId})
 */
export function validatePurchaseOrder(data: unknown, expectedOrgId?: string): data is PurchaseOrder {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.supplierId) &&
    isNonEmptyString(d.supplierName) &&
    isNonEmptyString(d.poNumber) &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.itemsCount === 'number' &&
    typeof d.totalOrderedQty === 'number' && d.totalOrderedQty > 0 &&
    typeof d.totalReceivedQty === 'number' && d.totalReceivedQty >= 0 &&
    typeof d.subtotal === 'number' && d.subtotal >= 0 &&
    typeof d.totalTax === 'number' && d.totalTax >= 0 &&
    typeof d.grandTotal === 'number' && d.grandTotal >= 0 &&
    (d.status === 'draft' ||
      d.status === 'pending_approval' ||
      d.status === 'approved' ||
      d.status === 'partially_fulfilled' ||
      d.status === 'fulfilled' ||
      d.status === 'cancelled') &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;

  for (const item of d.items as any[]) {
    if (
      !isNonEmptyString(item.productId) ||
      !isNonEmptyString(item.productName) ||
      typeof item.orderedQuantity !== 'number' ||
      item.orderedQuantity <= 0 ||
      typeof item.unitCost !== 'number' ||
      item.unitCost < 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Runtime Validator for Goods Receipt Note Documents (/organizations/{orgId}/grns/{grnId})
 */
export function validateGRN(data: unknown, expectedOrgId?: string): data is GRN {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.poId) &&
    isNonEmptyString(d.poNumber) &&
    isNonEmptyString(d.grnNumber) &&
    isNonEmptyString(d.supplierId) &&
    isNonEmptyString(d.supplierName) &&
    isNonEmptyString(d.supplierInvoiceNumber) &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.itemsCount === 'number' &&
    typeof d.totalReceivedQty === 'number' && d.totalReceivedQty >= 0 &&
    typeof d.subtotal === 'number' && d.subtotal >= 0 &&
    typeof d.taxableAmount === 'number' && d.taxableAmount >= 0 &&
    typeof d.grandTotal === 'number' && d.grandTotal >= 0 &&
    (d.status === 'draft' || d.status === 'completed' || d.status === 'cancelled') &&
    isNonEmptyString(d.receivedByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;

  for (const item of d.items as any[]) {
    if (
      !isNonEmptyString(item.productId) ||
      !isNonEmptyString(item.productName) ||
      !isNonEmptyString(item.batchNumber) ||
      !isNonEmptyString(item.expiryDate) ||
      typeof item.receivedQuantity !== 'number' ||
      item.receivedQuantity <= 0 ||
      typeof item.unitPurchaseCost !== 'number' ||
      item.unitPurchaseCost < 0 ||
      typeof item.unitMrp !== 'number' ||
      item.unitMrp < 0 ||
      typeof item.unitSalePrice !== 'number' ||
      item.unitSalePrice < 0
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Runtime Validator for Customer Documents (/organizations/{orgId}/customers/{customerId})
 */
export function validateCustomer(data: unknown, expectedOrgId?: string): data is Customer {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.name) &&
    isNonEmptyString(d.phone) &&
    typeof d.creditEnabled === 'boolean' &&
    typeof d.creditLimit === 'number' && d.creditLimit >= 0 &&
    typeof d.currentOutstanding === 'number' &&
    (d.status === 'active' || d.status === 'inactive' || d.status === 'blocked') &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Customer Ledger Entry Documents
 */
export function validateCustomerLedgerEntry(data: unknown, expectedOrgId?: string): data is CustomerLedgerEntry {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.customerId) &&
    (d.type === 'credit_sale' ||
      d.type === 'payment_received' ||
      d.type === 'sales_return' ||
      d.type === 'credit_adjustment' ||
      d.type === 'debit_adjustment' ||
      d.type === 'opening_balance') &&
    isNonEmptyString(d.referenceId) &&
    isNonEmptyString(d.referenceNumber) &&
    typeof d.creditAmount === 'number' && d.creditAmount >= 0 &&
    typeof d.debitAmount === 'number' && d.debitAmount >= 0 &&
    typeof d.runningBalance === 'number' &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Customer Payment Documents
 */
export function validateCustomerPayment(data: unknown, expectedOrgId?: string): data is CustomerPayment {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.customerId) &&
    isNonEmptyString(d.customerName) &&
    isNonEmptyString(d.receiptNumber) &&
    typeof d.amount === 'number' && d.amount > 0 &&
    (d.paymentMode === 'cash' ||
      d.paymentMode === 'upi' ||
      d.paymentMode === 'card' ||
      d.paymentMode === 'bank_transfer' ||
      d.paymentMode === 'other') &&
    typeof d.previousOutstanding === 'number' &&
    typeof d.remainingOutstanding === 'number' &&
    isNonEmptyString(d.createdByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Sales Return Documents
 */
export function validateSalesReturn(data: unknown, expectedOrgId?: string): data is SalesReturn {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.returnNumber) &&
    isNonEmptyString(d.originalInvoiceId) &&
    isNonEmptyString(d.originalInvoiceNumber) &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.grandTotal === 'number' && d.grandTotal >= 0 &&
    isNonEmptyString(d.createdByUid) &&
    (d.status === 'draft' ||
      d.status === 'submitted' ||
      d.status === 'approved' ||
      d.status === 'processed' ||
      d.status === 'refunded' ||
      d.status === 'completed' ||
      d.status === 'rejected' ||
      d.status === 'cancelled');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Credit Note Documents
 */
export function validateCreditNote(data: unknown, expectedOrgId?: string): data is CreditNote {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.creditNoteNumber) &&
    isNonEmptyString(d.returnId) &&
    isNonEmptyString(d.originalInvoiceId) &&
    Array.isArray(d.items) &&
    typeof d.totalCreditAmount === 'number' && d.totalCreditAmount >= 0 &&
    isNonEmptyString(d.createdByUid) &&
    (d.status === 'issued' || d.status === 'applied' || d.status === 'refunded' || d.status === 'cancelled');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Supplier Return Documents
 */
export function validateSupplierReturn(data: unknown, expectedOrgId?: string): data is SupplierReturn {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.supplierReturnNumber) &&
    isNonEmptyString(d.supplierId) &&
    isNonEmptyString(d.supplierName) &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.grandTotal === 'number' && d.grandTotal >= 0 &&
    isNonEmptyString(d.createdByUid) &&
    (d.status === 'draft' ||
      d.status === 'submitted' ||
      d.status === 'approved' ||
      d.status === 'dispatched' ||
      d.status === 'acknowledged' ||
      d.status === 'completed' ||
      d.status === 'cancelled');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Quarantine Record Documents
 */
export function validateQuarantineRecord(data: unknown, expectedOrgId?: string): data is QuarantineRecord {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.quarantineNumber) &&
    isNonEmptyString(d.productId) &&
    isNonEmptyString(d.batchId) &&
    typeof d.quantity === 'number' && d.quantity > 0 &&
    isNonEmptyString(d.quarantinedByUid) &&
    (d.status === 'quarantined' ||
      d.status === 'moved_to_destruction' ||
      d.status === 'returned_to_supplier' ||
      d.status === 'released');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Destruction Record Documents
 */
export function validateDestructionRecord(data: unknown, expectedOrgId?: string): data is DestructionRecord {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.storeId) &&
    isNonEmptyString(d.destructionNumber) &&
    isNonEmptyString(d.certificateNumber) &&
    isNonEmptyString(d.productId) &&
    isNonEmptyString(d.batchId) &&
    typeof d.quantity === 'number' && d.quantity > 0 &&
    isNonEmptyString(d.requestedByUid) &&
    (d.status === 'destruction_pending' ||
      d.status === 'approved_for_destruction' ||
      d.status === 'destroyed' ||
      d.status === 'rejected');

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;
  return true;
}

/**
 * Runtime Validator for Stock Transfer Documents (/organizations/{orgId}/stockTransfers/{transferId})
 */
export function validateStockTransferRequest(data: unknown, expectedOrgId?: string): boolean {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  const isValid =
    isNonEmptyString(d.id) &&
    isNonEmptyString(d.organizationId) &&
    isNonEmptyString(d.transferNumber) &&
    isNonEmptyString(d.sourceStoreId) &&
    isNonEmptyString(d.destinationStoreId) &&
    d.sourceStoreId !== d.destinationStoreId &&
    isNonEmptyString(d.status) &&
    (d.priority === 'ROUTINE' || d.priority === 'URGENT' || d.priority === 'EMERGENCY') &&
    Array.isArray(d.items) &&
    d.items.length > 0 &&
    typeof d.itemsCount === 'number' &&
    typeof d.totalRequestedQty === 'number' && d.totalRequestedQty > 0 &&
    typeof d.totalTransferValue === 'number' && d.totalTransferValue >= 0 &&
    isNonEmptyString(d.requestedByUid);

  if (!isValid) return false;
  if (expectedOrgId && d.organizationId !== expectedOrgId) return false;

  for (const item of d.items as any[]) {
    if (
      !isNonEmptyString(item.productId) ||
      !isNonEmptyString(item.productName) ||
      !isNonEmptyString(item.sku) ||
      typeof item.requestedQty !== 'number' ||
      item.requestedQty <= 0
    ) {
      return false;
    }
  }

  return true;
}


