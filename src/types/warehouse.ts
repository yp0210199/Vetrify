import { Timestamp, FieldValue } from 'firebase/firestore';

export type WarehouseType = 'DISTRIBUTION' | 'REGIONAL' | 'FULFILLMENT' | 'COLD_CHAIN' | 'QUARANTINE' | 'TRANSIT';

export type WarehouseStatus = 'ACTIVE' | 'INACTIVE';

export interface Warehouse {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: WarehouseType;
  address: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  gstin?: string;
  drugLicense?: string;
  status: WarehouseStatus;
  coldChainEnabled: boolean;
  capacity?: number; // Total capacity
  occupiedCapacity?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid: string;
}

export interface WarehouseStock {
  id: string;
  organizationId: string;
  warehouseId: string;
  productId: string;
  batchId: string;
  availableQty: number;
  reservedQty: number;
  quarantinedQty: number;
  damagedQty: number;
  expiredQty: number;
  inTransitQty: number;
  unitCost: number;
  expiryDate: Timestamp;
  mrp: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdByUid: string;
  updatedByUid: string;
}

export interface WarehouseMetrics {
  totalWarehouses: number;
  activeWarehouses: number;
  totalStockValue: number;
  lowStockSkus: number;
  criticalStockouts: number;
  expiringBatches: number;
  inTransitShipments: number;
  pendingAllocations: number;
  warehouseUtilization: number;
}

export type WarehousePermission =
  | 'warehouse.view'
  | 'warehouse.create'
  | 'warehouse.edit'
  | 'warehouse.manageStock';
