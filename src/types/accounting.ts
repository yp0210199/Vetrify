import { Timestamp } from 'firebase/firestore';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  id: string;
  organizationId: string;
  name: string;
  type: AccountType;
  subType?: string;
  systemAccount?: string; // e.g., 'CASH', 'SALES', 'OUTPUT_CGST'
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type JournalEntrySourceType = 
  | 'RETAIL_SALE'
  | 'WHOLESALE_SALE'
  | 'PURCHASE'
  | 'SALES_RETURN'
  | 'PURCHASE_RETURN'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'MANUAL_ADJUSTMENT'
  | 'GST_ADJUSTMENT';

export interface JournalEntryLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  storeId?: string;
  date: Timestamp;
  financialYear: string;
  sourceType: JournalEntrySourceType;
  sourceId: string;
  documentNumber?: string;
  reference?: string;
  description: string;
  lines: JournalEntryLine[];
  totalAmount: number;
  status: 'DRAFT' | 'POSTED' | 'VOIDED';
  postedByUid?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
