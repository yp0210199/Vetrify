import { Timestamp, FieldValue } from 'firebase/firestore';

export type ReorderStrategy = 'MIN_MAX' | 'REORDER_POINT' | 'PAR_LEVEL' | 'DEMAND_BASED' | 'FORECAST_BASED';
export type ForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
export type RecommendationUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
export type RecommendationStatus = 'NEW' | 'REVIEWED' | 'APPROVED' | 'REJECTED' | 'PO_CREATED' | 'SNOOZED' | 'EXPIRED';

export interface ReorderRule {
  id: string;
  organizationId: string;
  storeId: string;
  productId: string;
  strategy: ReorderStrategy;
  
  // MIN_MAX / REORDER_POINT thresholds
  minimumStock: number;
  maximumStock: number;
  reorderPoint: number;
  safetyStock: number;
  
  // Quantities
  reorderQuantity: number;
  minimumOrderQuantity: number;
  maximumOrderQuantity: number;
  orderMultiple: number;
  
  // Configuration
  preferredSupplierId?: string | null;
  leadTimeDays: number;
  reviewPeriodDays: number;
  targetServiceLevel: number;
  
  // Auto-PO
  enabled: boolean;
  priority: number;
  autoCreatePO: boolean;
  autoApprovalAllowed: boolean;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReorderRuleCreatePayload = Omit<ReorderRule, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export interface ReorderRecommendation {
  id: string;
  organizationId: string;
  storeId: string;
  productId: string;
  productName: string;
  brand?: string;
  sku?: string;
  runId: string;
  
  // Inventory at time of analysis
  currentStock: number;
  reservedStock: number;
  inboundStock: number;
  inTransitStock: number;
  effectiveAvailableStock: number; // current - reserved + inbound
  
  // Calculated Demand
  averageDailyDemand: number;
  leadTimeDemand: number;
  daysOfStockRemaining: number;
  reorderPoint: number;
  safetyStock: number;
  
  // Supplier & Qty
  recommendedQuantity: number;
  preferredSupplierId: string | null;
  preferredSupplierName: string | null;
  supplierLeadTimeDays: number;
  estimatedCost: number;
  
  // Analysis Metadata
  forecastConfidence: ForecastConfidence;
  urgency: RecommendationUrgency;
  status: RecommendationStatus;
  explanation: string;
  
  // PO Tracking
  linkedPurchaseOrderId?: string | null;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ReorderRecommendationCreatePayload = Omit<ReorderRecommendation, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
};

export interface SupplierPerformanceProfile {
  id: string; // Same as supplierId
  organizationId: string;
  supplierId: string;
  supplierName: string;
  
  // Metrics calculated from actual GRNs/POs
  totalPurchaseOrders: number;
  totalGrns: number;
  averageLeadTimeDays: number;
  medianLeadTimeDays: number;
  poFulfillmentRate: number; // percentage (received / ordered)
  onTimeDeliveryRate: number; // percentage
  
  lastPurchaseAt?: Timestamp | null;
  lastGrnAt?: Timestamp | null;
  
  active: boolean;
  supplierScore: number; // e.g., 0-100 based on fulfillment and lead time
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DemandForecast {
  id: string;
  organizationId: string;
  storeId: string;
  productId: string;
  
  // Historical Period
  forecastWindowDays: number; // e.g. 30, 60, 90
  sampleDays: number;
  transactionCount: number;
  
  // Averages
  totalUnitsSold: number;
  averageDailyDemand: number;
  weightedDailyDemand: number;
  demandVolatility: number;
  
  lastSaleAt?: Timestamp | null;
  confidenceLevel: ForecastConfidence;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type RunStatus = 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface ReplenishmentRun {
  id: string;
  organizationId: string;
  storeId: string;
  triggeredByUid: string;
  startedAt: Timestamp;
  completedAt?: Timestamp | null;
  status: RunStatus;
  
  productsAnalyzed: number;
  recommendationsCreated: number;
  recommendationsUpdated: number;
  criticalAlerts: number;
  errors: string[];
  durationMs?: number;
}

export interface ReplenishmentSettings {
  id: string; // Usually 'default' or orgId
  organizationId: string;
  defaultAnalysisWindowDays: number;
  defaultSafetyStockDays: number;
  defaultLeadTimeDays: number;
  defaultReorderStrategy: ReorderStrategy;
  minForecastConfidenceForAutoPO: ForecastConfidence;
  
  // Auto PO guards
  autoPOEnabled: boolean;
  maxAutoPOValue: number;
  maxAutoPOItems: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedByUid: string;
}
