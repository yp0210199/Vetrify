export * from './product';
export * from './batch';
export * from './transfer';
export * from './replenishment';
export * from './ecommerce';
export * from './foundation';
export type NavModuleId =
  | 'dashboard'
  | 'pos'
  | 'wholesale'
  | 'inventory'
  | 'transfers'
  | 'purchases'
  | 'sales_returns'
  | 'customers'
  | 'suppliers'
  | 'collections'
  | 'ecommerce'
  | 'reports'
  | 'gst_accounts'
  | 'notifications'
  | 'tasks'
  | 'compliance'
  | 'prescriptions'
  | 'replenishment'
  | 'audit_centre'
  | 'activity_centre'
  | 'clinical_support'
  | 'warehouses'
  | 'settings';

export interface NavItem {
  id: NavModuleId;
  label: string;
  icon: string;
  badge?: string | number;
  badgeVariant?: 'primary' | 'warning' | 'critical' | 'neutral';
  isFuture?: boolean;
  phase?: number;
  shortcut?: string;
}

export type StatusVariant =
  | 'active'
  | 'inactive'
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'near_expiry'
  | 'expired'
  | 'paid'
  | 'pending'
  | 'failed'
  | 'completed'
  | 'draft'
  | 'cancelled'
  | 'returned';

export interface KpiCardProps {
  id?: string;
  title: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    comparisonText: string;
  };
  icon?: string;
  statusVariant?: 'default' | 'success' | 'warning' | 'critical' | 'info';
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  actionLabel?: string;
  onAction?: () => void;
  subValue?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface StoreContext {
  id: string;
  name: string;
  location: string;
  gstin: string;
  dlNumber: string;
  status: 'online' | 'offline' | 'syncing';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Cashier' | 'Pharmacist' | 'Accountant';
  avatarUrl?: string;
  storeName: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'inventory' | 'expiry' | 'procurement' | 'collections' | 'orders' | 'tasks' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  actionUrl?: string;
}

export interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  composition: string;
  batchNumber: string;
  expiryDate: string;
  stockQuantity: number;
  stockUnit: string;
  mrp: number;
  purchaseCost: number;
  salePrice: number;
  marginPercent: number;
  rackLocation: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'near_expiry' | 'expired';
  category?: string;
  imageUrl?: string;
  hsnCode?: string;
  gstRate?: number;
  schedule?: 'H' | 'H1' | 'X' | 'G' | 'OTC';
  dosageForm?: string;
  manufacturer?: string;
  strength?: string;
  daysToExpiry?: number;
  isColdChain?: boolean;
}

export * from './warehouse';
export * from './firestore';
export * from './warehouse';
export * from './product';
export * from './batch';
export * from './wholesale';
export * from './prescription';

export interface PosProductItem {
  id: string; // Product ID
  name: string;
  brand: string;
  composition?: string;
  sku: string;
  dosageForm: string;
  batchId: string;
  batch: string;
  expiry: string;
  stock: number;
  unit: string;
  mrp: number;
  price: number;
  gst: number;
  hsnCode?: string;
  schedule?: 'H' | 'H1' | 'X' | 'G' | 'OTC' | string;
  isPrescriptionRequired?: boolean;
  isColdChain?: boolean;
  hasBatches?: boolean;
  totalStoreStock?: number;
}

export interface PosCartItem {
  id: string; // Unique cart item ID (typically `${productId}_${batchId}`)
  productId: string;
  name: string;
  brand: string;
  composition?: string;
  sku: string;
  batchId: string;
  batch: string;
  expiry: string;
  qty: number;
  availableStock: number;
  unit: string;
  mrp: number;
  price: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  total: number;
  dosageForm?: string;
  hsnCode?: string;
  schedule?: 'H' | 'H1' | 'X' | 'G' | 'OTC' | string;
  isPrescriptionRequired?: boolean;
  isManualBatchOverride?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  dosageForm: string;
  strength: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  salePrice: number;
  discountPercent: number;
  taxPercent: number;
  availableStock: number;
  isPrescriptionRequired?: boolean;
  imageUrl?: string;
}

export interface PosBillSummary {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOff: number;
  grandTotal: number;
  totalSavings: number;
  totalItems: number;
  totalQty: number;
}
export * from './accounting';
export * from './gst';
