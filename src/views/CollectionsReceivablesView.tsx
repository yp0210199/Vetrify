import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  RefreshCw,
  Download,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { collectionsService } from '../services/collectionsService';
import {
  CustomerAgingSummary,
  AgingPortfolioMetrics,
  PaymentReceiptPayload,
  StatementOfAccount,
} from '../types/collections';
import { AgingSummaryCards } from '../components/collections/AgingSummaryCards';
import { CustomerAgingTable } from '../components/collections/CustomerAgingTable';
import { RecordPaymentModal } from '../components/collections/RecordPaymentModal';
import { PaymentReminderDrawer } from '../components/collections/PaymentReminderDrawer';
import { StatementOfAccountModal } from '../components/collections/StatementOfAccountModal';
import { useToast } from '../context/ToastContext';

export const CollectionsReceivablesView: React.FC = () => {
  const { organization, firestoreUser, currentStore } = useWorkspace();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [summaries, setSummaries] = useState<CustomerAgingSummary[]>([]);
  const [metrics, setMetrics] = useState<AgingPortfolioMetrics>({
    totalReceivables: 0,
    totalCustomersCount: 0,
    overdueCustomersCount: 0,
    b0_30_total: 0,
    b31_60_total: 0,
    b61_90_total: 0,
    b90_plus_total: 0,
    highRiskAmount: 0,
    weightedAverageDaysOverdue: 0,
  });

  const [selectedBucket, setSelectedBucket] = useState('all');

  // Modals state
  const [activePaymentSummary, setActivePaymentSummary] = useState<CustomerAgingSummary | null>(null);
  const [activeReminderSummary, setActiveReminderSummary] = useState<CustomerAgingSummary | null>(null);
  const [activeStatement, setActiveStatement] = useState<StatementOfAccount | null>(null);

  const loadAgingData = useCallback(async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    try {
      const res = await collectionsService.getCustomerAgingSummaries(organization.id);
      setSummaries(res.summaries);
      setMetrics(res.metrics);
    } catch (err: any) {
      console.error('Failed to load aging data:', err);
      toastError(err.message || 'Error calculating receivables aging');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, toastError]);

  useEffect(() => {
    loadAgingData();
  }, [loadAgingData]);

  // Handle Recording Payment
  const handlePaymentSubmit = async (payload: PaymentReceiptPayload) => {
    if (!organization?.id || !firestoreUser?.uid) return;
    try {
      const res = await collectionsService.recordPaymentReceipt(
        organization.id,
        {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName || 'Cashier',
        },
        {
          ...payload,
          storeId: currentStore?.id,
        }
      );
      success(`Payment receipt #${res.receiptNumber} recorded! New balance: ₹${res.remainingOutstanding.toLocaleString('en-IN')}`);
      loadAgingData();
    } catch (err: any) {
      toastError(err.message || 'Payment recording failed');
      throw err;
    }
  };

  // Handle View Statement
  const handleViewStatement = async (summary: CustomerAgingSummary) => {
    if (!organization?.id) return;
    try {
      const soa = await collectionsService.generateStatementOfAccount(
        organization.id,
        summary.customerId,
        {
          name: organization.name,
          gstin: organization.gstin,
          phone: currentStore?.phone || '',
        }
      );
      if (soa) {
        setActiveStatement(soa);
      } else {
        toastError('No ledger records found for this account.');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to generate statement of accounts');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (summaries.length === 0) {
      toastError('No aging accounts available to export.');
      return;
    }

    const headers = [
      'Customer Name',
      'Phone',
      'GSTIN',
      'Total Outstanding (INR)',
      '0-30 Days (INR)',
      '31-60 Days (INR)',
      '61-90 Days (INR)',
      '90+ Days (INR)',
      'Overdue Total (INR)',
      'Credit Limit (INR)',
    ];

    const rows = summaries.map((s) => [
      `"${s.customerName.replace(/"/g, '""')}"`,
      `"${s.phone}"`,
      `"${s.gstin || 'N/A'}"`,
      s.currentOutstanding,
      s.buckets.b0_30,
      s.buckets.b31_60,
      s.buckets.b61_90,
      s.buckets.b90_plus,
      s.totalOverdue,
      s.creditLimit,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vetrify_aging_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Receivables Aging CSV downloaded!');
  };

  return (
    <div className="space-y-6">
      {/* Module Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Wallet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Collections & Receivables Aging
            </h1>
          </div>
          <p className="text-xs text-slate-400 pl-9">
            Invoice-level FIFO aging analysis (0-30, 31-60, 61-90, 90+ days), builder khata reminders, and payment receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={loadAgingData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AgingSummaryCards
        metrics={metrics}
        selectedBucket={selectedBucket}
        onFilterBucket={(b) => setSelectedBucket(b)}
      />

      {/* Table Section */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0D5C63] mb-2" />
          <span>Calculating live FIFO aging from sales invoices and customer ledgers...</span>
        </div>
      ) : (
        <CustomerAgingTable
          summaries={summaries}
          onRecordPayment={(s) => setActivePaymentSummary(s)}
          onSendReminder={(s) => setActiveReminderSummary(s)}
          onViewStatement={(s) => handleViewStatement(s)}
        />
      )}

      {/* Payment Receipt Modal */}
      <RecordPaymentModal
        isOpen={Boolean(activePaymentSummary)}
        onClose={() => setActivePaymentSummary(null)}
        summary={activePaymentSummary}
        onSubmit={handlePaymentSubmit}
      />

      {/* Payment Reminder Drawer */}
      <PaymentReminderDrawer
        isOpen={Boolean(activeReminderSummary)}
        onClose={() => setActiveReminderSummary(null)}
        summary={activeReminderSummary}
        showroomName={organization?.name || 'Vetrify Tiles'}
      />

      {/* Statement of Account Modal */}
      <StatementOfAccountModal
        isOpen={Boolean(activeStatement)}
        onClose={() => setActiveStatement(null)}
        statement={activeStatement}
      />
    </div>
  );
};
