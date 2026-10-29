import React from 'react';
import { Printer, CheckCircle, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { CustomerPayment } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { safeToFixed, formatDateTime } from '../../lib/formatting/formatters';

interface CustomerPaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: CustomerPayment | null;
}

export const CustomerPaymentReceiptModal: React.FC<CustomerPaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  const { organization, currentStore } = useWorkspace();

  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const paymentDate = formatDateTime(payment.createdAt) || new Date().toLocaleString('en-IN');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col my-auto">
        {/* Header Actions */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" /> Payment Recorded Successfully
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> Print Receipt
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div className="p-6 space-y-4 print:p-0 print:m-0 text-slate-900 dark:text-white" id="customer-payment-receipt">
          {/* Header */}
          <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-lg font-black tracking-tight">{organization?.name || 'Vetrify Store'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentStore?.name || 'Main Showroom'}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{currentStore?.address?.street || ''} {currentStore?.address?.city || ''}</p>
            {currentStore?.phone && <p className="text-2xs text-slate-400">Phone: {currentStore.phone}</p>}
            
            <div className="inline-block mt-3 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold rounded-full uppercase tracking-wider">
              Khata Payment Receipt
            </div>
          </div>

          {/* Receipt Details Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider font-semibold">Receipt No</span>
              <span className="font-mono font-bold">{payment.receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider font-semibold">Date & Time</span>
              <span className="font-semibold">{paymentDate}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider font-semibold">Received From</span>
              <span className="font-bold">{payment.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider font-semibold">Payment Mode</span>
              <span className="font-semibold uppercase">{payment.paymentMode}</span>
            </div>
            {payment.referenceNumber && (
              <div className="col-span-2">
                <span className="text-slate-500 dark:text-slate-400 block text-2xs uppercase tracking-wider font-semibold">Transaction Reference</span>
                <span className="font-mono">{payment.referenceNumber}</span>
              </div>
            )}
          </div>

          {/* Ledger Account Summary Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Previous Outstanding Balance:</span>
              <span className="font-semibold">₹{safeToFixed(payment.previousOutstanding)}</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Amount Received:</span>
              <span>₹{safeToFixed(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-700">
              <span>Remaining Outstanding Balance:</span>
              <span>₹{safeToFixed(payment.remainingOutstanding)}</span>
            </div>
          </div>

          {payment.notes && (
            <div className="text-xs text-slate-500 dark:text-slate-400 italic">
              Note: {payment.notes}
            </div>
          )}

          {/* Footer Signature */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-2xs text-slate-400">
            <div>
              <span>Processed by Cashier</span>
            </div>
            <div className="text-right">
              <span>Authorized Stamp / Signature</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
