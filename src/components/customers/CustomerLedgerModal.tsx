import React, { useState, useEffect } from 'react';
import { FileText, Printer, ArrowUpRight, ArrowDownLeft, X, RefreshCw, Calendar, CreditCard } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Customer, CustomerLedgerEntry } from '../../types';
import { customerService } from '../../services/customerService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { formatDateTime } from '../../lib/formatting/formatters';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onOpenRecordPayment: (customer: Customer) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onOpenRecordPayment,
}) => {
  const { organization } = useWorkspace();
  const [entries, setEntries] = useState<CustomerLedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer && organization?.id) {
      loadLedger();
    }
  }, [isOpen, customer?.id, organization?.id]);

  const loadLedger = async () => {
    if (!customer || !organization?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomerLedger(organization.id, customer.id);
      setEntries(data);
    } catch (err: any) {
      console.error('Error loading customer ledger:', err);
      setError('Failed to fetch ledger statement entries.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  const handlePrint = () => {
    window.print();
  };

  const availableCredit = (customer.creditLimit || 0) - (customer.currentOutstanding || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Khata Statement: {customer.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phone: {customer.phone} {customer.customerCode && `| ID: ${customer.customerCode}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenRecordPayment(customer)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"
            >
              <CreditCard className="w-4 h-4" /> Record Payment
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> Print Statement
            </Button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Banner */}
        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Current Outstanding Balance
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400">
              ₹{(customer.currentOutstanding || 0).toFixed(2)}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Sanctioned Credit Limit
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              ₹{(customer.creditLimit || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <span className="text-2xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Available Credit Margin
            </span>
            <span
              className={`text-lg font-black ${
                availableCredit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              ₹{availableCredit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Statement Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Fetching ledger transaction statement...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-rose-500">{error}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
              No ledger transactions recorded for this customer yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase text-3xs tracking-wider">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Ref Number</th>
                    <th className="py-2.5 px-3 text-right">Debit (Added Outstanding)</th>
                    <th className="py-2.5 px-3 text-right">Credit (Paid Off)</th>
                    <th className="py-2.5 px-3 text-right">Running Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {entries.map((entry) => {
                    const entryDate = formatDateTime(entry.createdAt) || '-';

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {entryDate}
                        </td>
                        <td className="py-3 px-3">
                          {entry.type === 'credit_sale' ? (
                            <Badge variant="warning" className="text-3xs py-0 flex items-center gap-1 w-max">
                              <ArrowUpRight className="w-3 h-3 text-rose-500" /> Credit Sale
                            </Badge>
                          ) : entry.type === 'payment_received' ? (
                            <Badge variant="success" className="text-3xs py-0 flex items-center gap-1 w-max">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-500" /> Payment Received
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-3xs py-0">
                              {entry.type}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                          {entry.referenceNumber || entry.referenceId || '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          {entry.creditAmount && entry.creditAmount > 0 ? `+₹${entry.creditAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {entry.debitAmount && entry.debitAmount > 0 ? `-₹${entry.debitAmount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          ₹{entry.runningBalance.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
