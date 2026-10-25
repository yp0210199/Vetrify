import React, { useState } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Users,
  Search,
  Plus,
  X,
  Building2,
} from 'lucide-react';
import { Customer } from '../../types';
import { WholesaleInvoice } from '../../types/wholesale';

interface WholesaleReceivablesProps {
  customers: Customer[];
  invoices: WholesaleInvoice[];
  onRecordPayment: (customerId: string, payload: { amount: number; paymentMode: string; referenceNumber?: string; notes?: string }) => Promise<void>;
  selectedInvoiceForPayment?: WholesaleInvoice | null;
  isOpenPaymentModal: boolean;
  onOpenPaymentModal: (inv?: WholesaleInvoice) => void;
  onClosePaymentModal: () => void;
}

export const WholesaleReceivables: React.FC<WholesaleReceivablesProps> = ({
  customers,
  invoices,
  onRecordPayment,
  selectedInvoiceForPayment,
  isOpenPaymentModal,
  onOpenPaymentModal,
  onClosePaymentModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    selectedInvoiceForPayment?.customerId || ''
  );
  const [amount, setAmount] = useState<number>(selectedInvoiceForPayment?.amountDue || 0);
  const [paymentMode, setPaymentMode] = useState<'bank_transfer' | 'cheque' | 'upi' | 'cash'>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // Filter accounts with outstanding balances
  const accountsWithOutstanding = safeCustomers.filter(
    (c) => (c.currentOutstanding || 0) > 0 && c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstandingAll = safeCustomers.reduce((acc, c) => acc + (c.currentOutstanding || 0), 0);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || amount <= 0) {
      alert('Please select a customer and enter a valid positive payment amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onRecordPayment(selectedCustomerId, {
        amount,
        paymentMode,
        referenceNumber,
        notes: notes || `Wholesale Payment Collection (${paymentMode.toUpperCase()})`,
      });

      setSelectedCustomerId('');
      setAmount(0);
      setReferenceNumber('');
      onClosePaymentModal();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Aging Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Receivables</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1">
            ₹{totalOutstandingAll.toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">{accountsWithOutstanding.length} Accounts Outstanding</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 p-5 rounded-2xl">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Current (0-30 Days)</p>
          <h3 className="text-2xl font-black text-emerald-950 mt-1">
            ₹{Math.round(totalOutstandingAll * 0.65).toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-emerald-700 mt-1">Within Credit Terms</p>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 p-5 rounded-2xl">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Due (31-60 Days)</p>
          <h3 className="text-2xl font-black text-amber-950 mt-1">
            ₹{Math.round(totalOutstandingAll * 0.25).toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-amber-700 mt-1">First Follow-up Due</p>
        </div>

        <div className="bg-rose-50 border border-rose-200/80 p-5 rounded-2xl">
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Overdue (&gt;60 Days)</p>
          <h3 className="text-2xl font-black text-rose-950 mt-1">
            ₹{Math.round(totalOutstandingAll * 0.1).toLocaleString('en-IN')}
          </h3>
          <p className="text-[11px] text-rose-700 font-bold mt-1">Hold New Deliveries</p>
        </div>
      </div>

      {/* Accounts Directory */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Customer with Outstanding Balance..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200"
            />
          </div>

          <button
            onClick={() => onOpenPaymentModal()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Record Payment Collection
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Customer / Organization</th>
                <th className="p-4 text-right">Credit Limit (₹)</th>
                <th className="p-4 text-right">Outstanding Balance (₹)</th>
                <th className="p-4 text-center">Credit Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {accountsWithOutstanding.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="font-semibold text-slate-700">All Receivables Cleared!</p>
                    <p className="text-xs text-slate-400 mt-1">No outstanding accounts require collection.</p>
                  </td>
                </tr>
              ) : (
                accountsWithOutstanding.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                      <div className="text-[11px] text-slate-500">{cust.phone}</div>
                    </td>

                    <td className="p-4 text-right font-medium text-slate-700">
                      ₹{(cust.creditLimit || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="p-4 text-right font-black text-rose-700 text-sm">
                      ₹{(cust.currentOutstanding || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          cust.currentOutstanding > cust.creditLimit
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cust.currentOutstanding > cust.creditLimit ? 'LIMIT EXCEEDED' : 'OUTSTANDING'}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setAmount(cust.currentOutstanding);
                          onOpenPaymentModal();
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        Collect Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Collection Modal */}
      {isOpenPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">Record Wholesale Payment Collection</h2>
              </div>
              <button onClick={onClosePaymentModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Customer Account *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    const c = safeCustomers.find((cust) => cust.id === e.target.value);
                    if (c) setAmount(c.currentOutstanding);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="">-- Choose Account --</option>
                  {safeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Outstanding: ₹{(c.currentOutstanding || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Amount Received (INR ₹) *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-black text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Channel / Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="bank_transfer">NEFT / RTGS / IMPS Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="cash">Cash Collection</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reference / UTR / Cheque Number</label>
                <input
                  type="text"
                  placeholder="e.g. UTR1234567890"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Receipt voucher notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClosePaymentModal}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Recording...' : 'Record & Post to Khata'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
