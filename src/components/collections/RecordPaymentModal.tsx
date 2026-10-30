import React, { useState } from 'react';
import { X, CreditCard, Check, Banknote, Landmark, Smartphone, FileCheck } from 'lucide-react';
import { CustomerAgingSummary, PaymentReceiptMode, PaymentReceiptPayload } from '../../types/collections';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CustomerAgingSummary | null;
  onSubmit: (payload: PaymentReceiptPayload) => Promise<void>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  summary,
  onSubmit,
}) => {
  if (!isOpen || !summary) return null;

  const [amount, setAmount] = useState<number>(summary.currentOutstanding);
  const [paymentMode, setPaymentMode] = useState<PaymentReceiptMode>('neft_rtgs');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [clearingDate, setClearingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remainingBalance = Math.max(0, summary.currentOutstanding - (amount || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        customerId: summary.customerId,
        amount,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        chequeNumber: chequeNumber.trim() || undefined,
        clearingDate: clearingDate || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment receipt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Record Customer Payment Receipt</h3>
              <p className="text-[11px] text-slate-400">Ledger clearing & cashbook balancing</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Outstanding Banner */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500">Contractor / Customer</span>
            <div className="font-bold text-slate-900 text-sm">{summary.customerName}</div>
            <div className="text-xs text-slate-500 font-mono mt-0.5">{summary.phone}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500">Current Outstanding</span>
            <div className="font-mono font-black text-slate-900 text-lg">
              ₹{summary.currentOutstanding.toLocaleString('en-IN')}
            </div>
            {summary.totalOverdue > 0 && (
              <div className="text-[10px] font-bold text-rose-600">
                Overdue: ₹{summary.totalOverdue.toLocaleString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Payment Mode Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 uppercase text-[10px] tracking-wider">
              Payment Mode
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('neft_rtgs')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'neft_rtgs'
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>NEFT / RTGS</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('upi')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'upi'
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI / QR</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('cheque')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'cheque'
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Cheque</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('cash')}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  paymentMode === 'cash'
                    ? 'border-[#0D5C63] bg-[#E6F4F1] text-[#0D5C63] font-bold shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Cash</span>
              </button>
            </div>
          </div>

          {/* Amount Input & Quick Fill */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-700 uppercase text-[10px] tracking-wider">
                Receipt Amount (₹)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Remaining Balance: <strong className="font-mono text-slate-900">₹{remainingBalance.toLocaleString('en-IN')}</strong>
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">₹</span>
              <input
                type="number"
                min="1"
                step="0.01"
                max={summary.currentOutstanding * 2}
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 text-base font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/20"
                required
              />
            </div>

            {/* Quick Fill Shortcuts */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setAmount(summary.currentOutstanding)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                Full Balance
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(summary.currentOutstanding / 2))}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
              >
                50% (₹{Math.round(summary.currentOutstanding / 2).toLocaleString('en-IN')})
              </button>
              {summary.currentOutstanding >= 10000 && (
                <button
                  type="button"
                  onClick={() => setAmount(10000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  ₹10,000
                </button>
              )}
              {summary.currentOutstanding >= 50000 && (
                <button
                  type="button"
                  onClick={() => setAmount(50000)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[10px] transition-colors cursor-pointer"
                >
                  ₹50,000
                </button>
              )}
            </div>
          </div>

          {/* Conditional Mode Details */}
          {paymentMode === 'neft_rtgs' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">UTR / Transfer Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. UTR192837482"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC / SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {paymentMode === 'upi' && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">UPI Transaction Reference / App</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref 382910482912 or PhonePe"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                required
              />
            </div>
          )}

          {paymentMode === 'cheque' && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Cheque #</label>
                <input
                  type="text"
                  placeholder="6-digit Cheque No."
                  value={chequeNumber}
                  onChange={(e) => setChequeNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="Drawn Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Clearing Date</label>
                <input
                  type="date"
                  value={clearingDate}
                  onChange={(e) => setClearingDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px] tracking-wider">
              Ledger Remarks / Site Tag (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Part payment for Tower B master bedroom tiles"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Receipt...' : 'Confirm & Post Receipt'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
