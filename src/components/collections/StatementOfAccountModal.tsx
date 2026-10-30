import React from 'react';
import { X, Printer, FileText, Download } from 'lucide-react';
import { StatementOfAccount } from '../../types/collections';

interface StatementOfAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  statement: StatementOfAccount | null;
}

export const StatementOfAccountModal: React.FC<StatementOfAccountModalProps> = ({
  isOpen,
  onClose,
  statement,
}) => {
  if (!isOpen || !statement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">Statement of Accounts (SOA) Preview</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Statement</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Statement Sheet */}
        <div className="p-8 space-y-6 text-slate-800 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start pb-6 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {statement.organizationName}
              </h1>
              <p className="text-xs text-slate-600 mt-1">Tiles, Sanitaryware, Faucets & Construction Materials</p>
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">GSTIN: {statement.organizationGstin}</p>
              {statement.organizationPhone && (
                <p className="text-[11px] text-slate-500">Phone: {statement.organizationPhone}</p>
              )}
            </div>
            <div className="text-right">
              <span className="px-3 py-1 bg-slate-100 font-bold uppercase text-[10px] tracking-wider text-slate-700 rounded-md">
                Statement of Account
              </span>
              <p className="text-[11px] text-slate-500 mt-2">
                Period: <strong className="text-slate-800">{statement.periodStart}</strong> to{' '}
                <strong className="text-slate-800">{statement.periodEnd}</strong>
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                Generated: {new Date(statement.generatedAt).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          {/* Customer / Project Details */}
          <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Account Holder / Contractor
              </span>
              <div className="font-bold text-sm text-slate-900">{statement.customer.name}</div>
              <p className="text-slate-600 mt-0.5">Phone: {statement.customer.phone}</p>
              {statement.customer.email && <p className="text-slate-500">{statement.customer.email}</p>}
              {(statement.customer as any).gstin && (
                <p className="font-mono text-slate-600 mt-0.5">GSTIN: {(statement.customer as any).gstin}</p>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Site Address & Terms
              </span>
              <p className="text-slate-700">{statement.customer.address || 'Showroom Account Customer'}</p>
              <div className="mt-2 flex gap-4 text-[11px]">
                <span>Credit Limit: <strong className="font-mono">₹{(statement.customer.creditLimit || 0).toLocaleString('en-IN')}</strong></span>
                <span>Closing Balance: <strong className="font-mono text-rose-600">₹{statement.closingBalance.toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Doc / Receipt #</th>
                  <th className="py-2.5 px-3">Transaction Details</th>
                  <th className="py-2.5 px-3 text-right">Debit (Sale)</th>
                  <th className="py-2.5 px-3 text-right">Credit (Payment)</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {statement.entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                      No transaction history recorded for this period.
                    </td>
                  </tr>
                ) : (
                  statement.entries.map((entry) => {
                    const dateStr =
                      (entry.createdAt as any)?.toDate?.()?.toLocaleDateString('en-IN') ||
                      new Date(entry.createdAt as any || 0).toLocaleDateString('en-IN');

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-600">{dateStr}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{entry.referenceNumber || '-'}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-700">{entry.notes || entry.type}</td>
                        <td className="py-2.5 px-3 text-right text-slate-900">
                          {entry.debitAmount > 0 ? `₹${entry.debitAmount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                          {entry.creditAmount > 0 ? `₹${entry.creditAmount.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          ₹{entry.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-72 bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Material Billed:</span>
                <span className="font-mono font-semibold text-slate-900">₹{statement.totalDebits.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Payments Received:</span>
                <span className="font-mono font-semibold text-emerald-700">₹{statement.totalCredits.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Net Balance Due:</span>
                <span className="font-mono text-rose-600">₹{statement.closingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Signature Lines */}
          <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs text-slate-500">
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">Customer / Receiver Signature</div>
            </div>
            <div>
              <div className="border-t border-slate-300 pt-2 font-medium">For {statement.organizationName} (Authorized Signatory)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
