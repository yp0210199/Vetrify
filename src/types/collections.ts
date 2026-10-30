import { Customer, CustomerLedgerEntry } from './firestore';

export interface AgingBucketItem {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  daysOverdue: number;
  bucket: '0-30' | '31-60' | '61-90' | '90+';
}

export interface CustomerAgingSummary {
  customerId: string;
  customerName: string;
  phone: string;
  email?: string | null;
  gstin?: string | null;
  siteAddress?: string | null;
  creditEnabled: boolean;
  creditLimit: number;
  currentOutstanding: number;
  availableCredit: number;
  buckets: {
    b0_30: number;
    b31_60: number;
    b61_90: number;
    b90_plus: number;
  };
  totalOverdue: number;
  oldestInvoiceDays: number;
  invoicesCount: number;
  lastPaymentDate?: string | null;
  lastPaymentAmount?: number | null;
}

export interface AgingPortfolioMetrics {
  totalReceivables: number;
  totalCustomersCount: number;
  overdueCustomersCount: number;
  b0_30_total: number;
  b31_60_total: number;
  b61_90_total: number;
  b90_plus_total: number;
  highRiskAmount: number; // 90+ days
  weightedAverageDaysOverdue: number;
}

export type PaymentReceiptMode = 'cash' | 'cheque' | 'neft_rtgs' | 'upi' | 'bank_transfer';

export interface PaymentReceiptPayload {
  customerId: string;
  amount: number;
  paymentMode: PaymentReceiptMode;
  referenceNumber?: string;
  bankName?: string;
  chequeNumber?: string;
  clearingDate?: string;
  depositAccount?: string;
  notes?: string;
  storeId?: string;
}

export interface StatementOfAccount {
  organizationId: string;
  organizationName: string;
  organizationGstin?: string;
  organizationPhone?: string;
  customer: Customer;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  totalDebits: number;
  totalCredits: number;
  closingBalance: number;
  entries: CustomerLedgerEntry[];
  generatedAt: string;
}
