import { Timestamp } from 'firebase/firestore';

export type CustomerType = 'RETAIL' | 'B2B' | 'INSTITUTIONAL';

export type CreditStatus = 'CLEAR' | 'NEAR_LIMIT' | 'LIMIT_REACHED' | 'OVERDUE' | 'ON_HOLD';

export interface B2BCustomerExtension {
  customerType: CustomerType;
  legalName?: string;
  customerCode: string;
  contactPerson?: string;
  gstin?: string;
  panNumber?: string;
  businessRegistration?: string;
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  creditPeriodDays: number;
  assignedPriceListId?: string;
  assignedPriceTier?: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
  assignedSalespersonUid?: string;
  creditStatus: CreditStatus;
  overdueAmount?: number;
}

export type PricingRuleType = 
  | 'CUSTOMER_PRODUCT'
  | 'CONTRACT'
  | 'CUSTOMER_TIER'
  | 'PRODUCT_WHOLESALE'
  | 'STANDARD';

export interface WholesalePriceRule {
  id: string;
  organizationId: string;
  ruleName: string;
  ruleType: PricingRuleType;
  customerId?: string; // For customer-specific
  customerName?: string;
  productId: string;
  productName: string;
  sku?: string;
  tier?: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
  minQuantity: number;
  wholesalePrice: number;
  discountPercent?: number;
  fixedDiscount?: number;
  effectiveDate?: string; // YYYY-MM-DD
  expiryDate?: string;    // YYYY-MM-DD
  status: 'active' | 'inactive';
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WholesaleQuotationStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface WholesaleQuotationItem {
  productId: string;
  productName: string;
  brand: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  sku: string;
  hsnCode?: string;
  requestedQty: number;
  unitPrice: number;
  wholesalePrice: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTaxAmount: number;
  totalAmount: number;
}

export interface WholesaleQuotation {
  id: string;
  organizationId: string;
  storeId: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  items: WholesaleQuotationItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal?: number;
  totalTax: number;
  grandTotal: number;
  validUntil: string; // YYYY-MM-DD
  status: WholesaleQuotationStatus;
  convertedOrderId?: string;
  notes?: string;
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WholesaleOrderStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'RESERVED'
  | 'PARTIALLY_FULFILLED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string; // MM/YYYY or YYYY-MM-DD
  allocatedQty: number;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
}

export interface WholesaleOrderItem {
  productId: string;
  productName: string;
  brand: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  sku: string;
  hsnCode?: string;
  orderedQty: number;
  reservedQty: number;
  fulfilledQty: number;
  unitPrice: number;
  mrp?: number;
  wholesalePrice: number;
  priceSource?: string;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount?: number;
  totalTaxAmount: number;
  totalAmount: number;
  allocatedBatches?: BatchAllocation[];
}

export interface WholesaleOrder {
  id: string;
  organizationId: string;
  storeId: string;
  orderNumber: string;
  quotationId?: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  customerGstin?: string;
  customerPhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  items: WholesaleOrderItem[];
  itemsCount: number;
  totalOrderedQty: number;
  totalReservedQty: number;
  totalFulfilledQty: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal?: number;
  totalTax: number;
  grandTotal: number;
  paymentTerms: string; // e.g. NET_30, IMMEDIATE, CREDIT
  creditOverrideUsed?: boolean;
  overrideManagerUid?: string;
  overrideReason?: string;
  deliveryMethod?: string;
  notes?: string;
  status: WholesaleOrderStatus;
  createdByUid: string;
  createdByName?: string;
  approvedByUid?: string | null;
  approvedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WholesaleInvoiceItem {
  productId: string;
  productName: string;
  brand: string;
  strength?: string;
  dosageForm?: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  wholesalePrice: number;
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
}

export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export interface WholesaleInvoice {
  id: string;
  organizationId: string;
  storeId: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  challanId?: string;
  challanNumber?: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  items: WholesaleInvoiceItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal?: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: 'credit' | 'cash' | 'upi' | 'card' | 'bank_transfer';
  creditTerms?: string;
  dueDate: string; // YYYY-MM-DD
  paymentStatus: PaymentStatus;
  amountPaid: number;
  amountDue: number;
  createdByUid: string;
  createdByName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ChallanStatus = 'DRAFT' | 'READY' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

export interface DeliveryChallanItem {
  productId: string;
  productName: string;
  brand: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
}

export interface DeliveryChallan {
  id: string;
  organizationId: string;
  storeId: string;
  challanNumber: string;
  orderId: string;
  orderNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  items: DeliveryChallanItem[];
  totalPackages?: number;
  dispatchDate: string;
  vehicleNumber?: string;
  transporterName?: string;
  driverName?: string;
  driverPhone?: string;
  preparedBy: string;
  authorizedBy?: string;
  status: ChallanStatus;
  notes?: string;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WholesaleMetrics {
  salesToday: number;
  ordersTodayCount: number;
  pendingOrdersCount: number;
  pendingDispatchCount: number;
  outstandingReceivables: number;
  creditUtilizationPercent: number;
  overdueReceivables: number;
  grossMarginPercent: number;
  ordersAwaitingApprovalCount: number;
  ordersAwaitingFulfillmentCount: number;
  partiallyFulfilledOrdersCount: number;
  customersNearCreditLimitCount: number;
  overdueAccountsCount: number;
}
