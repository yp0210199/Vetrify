import { Timestamp } from 'firebase/firestore';

export type GSTSupplyType = 'B2B' | 'B2C' | 'B2CL' | 'B2CS' | 'EXPORT' | 'SEZ_WITH_PAYMENT' | 'SEZ_WITHOUT_PAYMENT' | 'DEEMED_EXPORT';
export type EInvoiceStatus = 'DRAFT' | 'VALIDATING' | 'READY' | 'SUBMITTING' | 'GENERATED' | 'FAILED' | 'CANCEL_REQUESTED' | 'CANCELLED';

export interface GSTLedgerEntry {
  id: string;
  organizationId: string;
  storeId?: string;
  financialYear: string;
  taxPeriod: string; // e.g., '2023-04'
  sourceType: string;
  sourceId: string;
  documentNumber: string;
  documentDate: Timestamp;
  partyId?: string;
  partyGSTIN?: string;
  supplyType: GSTSupplyType;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  inputOutputType: 'INPUT' | 'OUTPUT';
  reverseCharge: boolean;
  hsnSummaryReference?: string;
  createdAt: Timestamp;
  createdBy: string;
}

export interface EInvoiceConfiguration {
  id: string;
  organizationId: string;
  legalName: string;
  gstin: string;
  pan: string;
  taxpayerType: 'REGULAR' | 'COMPOSITION' | 'ISD' | 'SEZ';
  aggregateTurnover: number;
  eInvoiceApplicable: boolean;
  eInvoiceEffectiveDate?: string;
  defaultIRPProvider: string;
  apiEnvironment: 'SANDBOX' | 'PRODUCTION';
  enableEInvoiceGeneration: boolean;
  enableEWayBill: boolean;
  invoiceSeries?: string[];
  financialYear: string;
  updatedAt: Timestamp;
  updatedBy: string;
}

export interface EInvoiceRecord {
  id: string;
  organizationId: string;
  storeId: string;
  sourceId: string; // ID of the invoice/credit note
  sourceType: string;
  documentNumber: string;
  documentDate: string;
  status: EInvoiceStatus;
  attemptedAt?: Timestamp;
  generatedAt?: Timestamp;
  cancelledAt?: Timestamp;
  failureCode?: string;
  failureMessage?: string;
  irn?: string;
  acknowledgementNumber?: string;
  acknowledgementDate?: string;
  signedInvoice?: string;
  signedQRCode?: string;
  provider: string;
  providerResponseMetadata?: any;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GSTPeriodStatus = 'OPEN' | 'PREPARING' | 'RECONCILIATION' | 'READY_FOR_REVIEW' | 'LOCKED' | 'EXPORTED';

export interface GSTFilingPeriod {
  id: string; // Format: orgId_yyyy-MM e.g. org123_2024-04
  organizationId: string;
  financialYear: string;
  month: number;
  quarter?: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
  status: GSTPeriodStatus;
  lockedAt?: Timestamp;
  lockedBy?: string;
  preparedAt?: Timestamp;
  preparedBy?: string;
  exportedAt?: Timestamp;
  exportedBy?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HSNSummary {
  hsnCode: string;
  description: string;
  uqc: string;
  quantity: number;
  taxableValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
}

export interface EWayBillRecord {
  id: string;
  organizationId: string;
  storeId?: string;
  irn?: string;
  invoiceNumber: string;
  invoiceDate: string;
  ewayBillNumber: string;
  ewayBillDate: string;
  validUpto: string;
  vehicleNumber: string;
  vehicleType: 'REGULAR' | 'ODC';
  transporterId?: string;
  transporterName?: string;
  distanceKm: number;
  supplyType: GSTSupplyType;
  fromPincode: string;
  toPincode: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  generatedByUid: string;
  createdAt: Timestamp;
}

