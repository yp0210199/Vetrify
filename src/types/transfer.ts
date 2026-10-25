import { Timestamp } from 'firebase/firestore';

export type StockTransferStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ALLOCATED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'CANCELLED'
  | 'REJECTED';

export type TransferPriority = 'ROUTINE' | 'URGENT' | 'EMERGENCY';

export interface StockTransferBatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string; // ISO or YYYY-MM-DD
  allocatedQty: number;
  dispatchedQty?: number;
  receivedQty?: number;
  purchasePrice: number;
  mrp: number;
  salePrice: number;
}

export interface StockTransferItem {
  productId: string;
  productName: string;
  brand?: string;
  sku: string;
  dosageForm?: string;
  strength?: string;
  manufacturerName?: string;
  requestedQty: number;
  approvedQty?: number;
  allocatedQty?: number;
  dispatchedQty?: number;
  receivedQty?: number;
  unitPurchaseCost: number;
  unitMrp: number;
  unitSalePrice: number;
  totalValue: number;
  allocatedBatches?: StockTransferBatchAllocation[];
  remarks?: string;
}

export interface StockTransferRequest {
  id: string;
  organizationId: string;
  transferNumber: string; // e.g., STR-2026-00001
  sourceStoreId: string;
  sourceStoreName: string;
  destinationStoreId: string;
  destinationStoreName: string;
  status: StockTransferStatus;
  priority: TransferPriority;
  reason?: string;
  items: StockTransferItem[];
  itemsCount: number;
  totalRequestedQty: number;
  totalDispatchedQty?: number;
  totalReceivedQty?: number;
  totalTransferValue: number;
  driverName?: string;
  vehicleNumber?: string;
  trackingNumber?: string;
  dispatchNotes?: string;
  receiptNotes?: string;
  discrepancyNotes?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  requestedByUid: string;
  requestedByName?: string;
  approvedByUid?: string;
  approvedByName?: string;
  approvedAt?: Timestamp | null;
  dispatchedByUid?: string;
  dispatchedByName?: string;
  dispatchedAt?: Timestamp | null;
  receivedByUid?: string;
  receivedByName?: string;
  receivedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RebalanceRecommendation {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  sourceStoreId: string;
  sourceStoreName: string;
  sourceAvailableStock: number;
  destinationStoreId: string;
  destinationStoreName: string;
  destinationCurrentStock: number;
  suggestedTransferQty: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

export interface StockTransferMetrics {
  totalTransfersCount: number;
  pendingApprovalCount: number;
  inTransitCount: number;
  completedCount: number;
  discrepancyCount: number;
  rebalanceAlertsCount: number;
  totalValueInTransit: number;
}
