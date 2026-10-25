import React, { useState } from 'react';
import { CreditCard, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Customer, CustomerPayment } from '../../types';
import { customerService } from '../../services/customerService';
import { safeToFixed } from '../../lib/formatting/formatters';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';

interface CustomerRecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onPaymentSuccess: (payment: CustomerPayment) => void;
}

export const CustomerRecordPaymentModal: React.FC<CustomerRecordPaymentModalProps> = ({
  isOpen,
  onClose,
  customer,
  onPaymentSuccess,
}) => {
  const { organization, currentStore, currentStaff } = useWorkspace();
  const { user } = useAuth();

  const [amount, setAmount] = useState<number>(customer?.currentOutstanding || 0);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'bank_transfer' | 'other'>('upi');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !currentStore?.id) return;

    if (amount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const callerObj = {
      uid: user?.uid || currentStaff?.uid || 'cashier',
      email: user?.email || currentStaff?.email,
      displayName: currentStaff?.displayName || user?.displayName,
    };

    try {
      const payment = await customerService.recordCustomerPayment(organization.id, callerObj, {
        customerId: customer.id,
        amount,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        storeId: currentStore.id,
      });

      onPaymentSuccess(payment);
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to record customer payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Record Customer Khata Payment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive outstanding dues from {customer.name}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Customer Name:</span>
              <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
            </div>
            <div className="flex justify-between font-medium text-slate-600 dark:text-slate-400">
              <span>Mobile Phone:</span>
              <span className="font-bold text-slate-900 dark:text-white">{customer.phone}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Current Outstanding Dues:</span>
              <span className="text-rose-600 dark:text-rose-400">₹{safeToFixed(customer.currentOutstanding)}</span>
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
              Payment Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmount(customer.currentOutstanding || 0)}
              className="text-3xs text-emerald-600 dark:text-emerald-400 font-bold mt-1 hover:underline"
            >
              Fill Full Outstanding (₹{safeToFixed(customer.currentOutstanding)})
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Payment Mode *
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="cash">Cash Received</option>
              <option value="card">Debit / Credit Card</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="other">Other Mode</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Reference / UTR / Transaction No
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-9872134567"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes / Payment Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Partial payment for August month bill"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="success" size="sm" isLoading={isSubmitting} className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Save & Generate Receipt
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
