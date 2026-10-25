import { Timestamp, FieldValue } from 'firebase/firestore';

export interface CustomerAddress {
  id: string;
  organizationId: string;
  customerId: string;
  fullName: string;
  phone: string;
  houseNo: string;
  street: string;
  locality: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  addressType: 'home' | 'work' | 'other';
  isDefault: boolean;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface OnlineOrderItem {
  productId: string;
  productName: string;
  brand?: string;
  sku: string;
  batchId?: string;
  batchNumber?: string;
  qty: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  isPrescriptionRequired: boolean;
  schedule?: string;
}

export type OnlineOrderStatus =
  | 'pending_payment'
  | 'payment_confirmed'
  | 'pending_review'
  | 'pharmacist_review'
  | 'confirmed'
  | 'stock_reserved'
  | 'picking'
  | 'packed'
  | 'ready_for_dispatch'
  | 'out_for_delivery'
  | 'delivered'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'cancelled';

export type DeliveryStatus =
  | 'unassigned'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'rescheduled'
  | 'cancelled';

export interface OnlineOrder {
  id: string;
  orderNumber: string;
  organizationId: string;
  storeId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddressId?: string;
  deliveryAddressSnapshot?: CustomerAddress;
  items: OnlineOrderItem[];
  itemsCount: number;
  totalQuantity: number;
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: 'upi' | 'card' | 'net_banking' | 'cod' | 'store_pickup';
  paymentStatus: 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
  orderStatus: OnlineOrderStatus;
  prescriptionRequired: boolean;
  prescriptionIds: string[];
  fulfilmentType: 'delivery' | 'pickup';
  deliveryStatus: DeliveryStatus;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  deliveryRunId?: string;
  trackingReference?: string;
  notes?: string;
  cancellationReason?: string;
  refundStatus?: 'none' | 'pending' | 'completed';
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  acceptedAt?: Timestamp | FieldValue | null;
  packedAt?: Timestamp | FieldValue | null;
  dispatchedAt?: Timestamp | FieldValue | null;
  deliveredAt?: Timestamp | FieldValue | null;
  cancelledAt?: Timestamp | FieldValue | null;
  createdByUid: string;
  createdByName: string;
}

export interface DeliveryPartner {
  id: string;
  organizationId: string;
  name: string;
  phone: string;
  employeeId: string;
  activeStoreId: string;
  vehicleType: 'bike' | 'ev' | 'car' | 'foot';
  vehicleRegistration: string;
  status: 'available' | 'on_delivery' | 'offline';
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface DeliveryRun {
  id: string;
  organizationId: string;
  storeId: string;
  deliveryPartnerId: string;
  orderIds: string[];
  status: 'planned' | 'dispatched' | 'completed' | 'failed';
  notes?: string;
  dispatchedAt?: Timestamp | FieldValue | null;
  completedAt?: Timestamp | FieldValue | null;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}
