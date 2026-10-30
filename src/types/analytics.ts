export type AnalyticsTimeframe = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';

export interface TileFinancialSummary {
  timeframe: AnalyticsTimeframe;
  grossSalesTurnover: number;
  netSalesTurnover: number;
  totalDiscount: number;
  totalTaxCollected: number;
  freightAndHandlingRevenue: number;
  cogsTotal: number; // Cost of goods sold based on landed purchase cost
  grossProfit: number;
  grossMarginPercent: number;
  totalInvoicesCount: number;
  averageOrderValue: number;
  totalSqFtSold: number;
  totalBoxesSold: number;
  totalSanitaryPiecesSold: number;
  totalFaucetPiecesSold: number;
}

export interface CategorySalesBreakdown {
  categoryType: 'tiles' | 'sanitaryware' | 'faucets' | 'adhesives' | 'other';
  label: string;
  revenue: number;
  percentageOfTotal: number;
  unitsCount: number;
  sqFtEquivalent?: number;
  grossProfit: number;
  marginPercent: number;
}

export interface ShadeVelocityItem {
  productId: string;
  productName: string;
  brand: string;
  shadeNumber?: string;
  toneCode?: string;
  caliberCode?: string;
  batchNumber?: string;
  dimensions?: string;
  finish?: string;
  boxesSold: number;
  sqFtSold: number;
  revenue: number;
  currentStockBoxes: number;
  velocity: 'FAST' | 'STEADY' | 'SLOW' | 'NON_MOVING';
  daysInStock: number;
}

export interface ArchitectAttribution {
  partnerId: string;
  partnerName: string;
  phone: string;
  firmName?: string;
  defaultCommissionPercent: number;
  totalInvoicesCount: number;
  totalBusinessDriven: number;
  totalCommissionAccrued: number;
  totalCommissionPaid: number;
  pendingBalance: number;
}

export interface HsnTaxAuditRow {
  hsnCode: string;
  description: string;
  gstRate: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalInvoiceAmount: number;
  invoiceCount: number;
}
