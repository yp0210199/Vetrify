import React, { useState } from 'react';
import { ShieldAlert, Key, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Customer } from '../../types';
import { safeToFixed } from '../../lib/formatting/formatters';

interface ManagerCreditOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  saleTotal: number;
  onApproveOverride: () => void;
}

export const ManagerCreditOverrideModal: React.FC<ManagerCreditOverrideModalProps> = ({
  isOpen,
  onClose,
  customer,
  saleTotal,
  onApproveOverride,
}) => {
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOutstanding = customer.currentOutstanding || 0;
  const projectedOutstanding = currentOutstanding + saleTotal;
  const creditLimit = customer.creditLimit || 0;
  const excessAmount = projectedOutstanding - creditLimit;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setError('An override reason or authorization note is required for audit logs.');
      return;
    }
    setError(null);
    onApproveOverride();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/50 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Credit Limit Exceeded
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                Manager Authorization Required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Customer:</span>
              <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Credit Limit:</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{safeToFixed(creditLimit)}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Current Outstanding:</span>
              <span className="font-bold text-slate-900 dark:text-white">₹{safeToFixed(currentOutstanding)}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Current Sale Total:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">₹{safeToFixed(saleTotal)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-rose-600 dark:text-rose-400">
              <span>Projected Balance:</span>
              <span>₹{safeToFixed(projectedOutstanding)} (+₹{safeToFixed(excessAmount)} over limit)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Manager Authorization Note *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Approved by Manager - Regular monthly client"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel Sale
            </Button>
            <Button type="submit" variant="danger" size="sm" className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Approve Credit Override
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
