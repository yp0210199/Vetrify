import React, { useState } from 'react';
import {
  X,
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Trash2,
  ArrowRight,
  Clock,
  User,
  Phone,
  Building,
  Plus,
} from 'lucide-react';
import { PosCartItem, PosBillSummary } from '../../types';
import { safeToFixed } from '../../lib/formatting/formatters';

export interface PosQuotation {
  id: string;
  quotationNumber: string;
  timestamp: Date;
  validUntil: string;
  customerName: string;
  customerPhone?: string;
  items: PosCartItem[];
  freightAmount: number;
  loadingUnloadingAmount: number;
  billSummary: PosBillSummary;
  subtotal?: number;
  discountAmount?: number;
  taxableAmount?: number;
  taxAmount?: number;
  grandTotal?: number;
  notes?: string;
  status: 'active' | 'converted' | 'expired';
}

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: PosQuotation[];
  onConvertQuotation: (quotation: PosQuotation) => void;
  onDeleteQuotation: (id: string) => void;
  onPrintQuotation: (quotation: PosQuotation) => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  isOpen,
  onClose,
  quotations,
  onConvertQuotation,
  onDeleteQuotation,
  onPrintQuotation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<PosQuotation | null>(null);

  if (!isOpen) return null;

  const filteredQuotes = quotations.filter((q) => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      q.quotationNumber.toLowerCase().includes(term) ||
      q.customerName.toLowerCase().includes(term) ||
      (q.customerPhone && q.customerPhone.includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Quotations & Project Estimates
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {quotations.length} Active
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Proforma quotes for builders, architects & homeowners with 1-click invoice conversion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by estimate number, customer name or phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Content Body: Split view (List on left, preview on right) */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Quotes List */}
          <div className="w-full md:w-1/2 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-2.5">
            {filteredQuotes.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No saved quotations found
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click &apos;Save as Quotation&apos; on any active cart to create formal estimates.
                </p>
              </div>
            ) : (
              filteredQuotes.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-white">
                            {q.quotationNumber}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                            ₹{safeToFixed(q.billSummary.grandTotal)}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                          {q.customerName}
                        </div>
                        {q.customerPhone && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            {q.customerPhone}
                          </div>
                        )}
                      </div>

                      <div className="text-right text-[10px] text-slate-500">
                        <div>{q.timestamp.toLocaleDateString('en-IN')}</div>
                        <span className="inline-block mt-1 text-[9px] font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {q.items.length} items
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quote Details & Conversion Actions */}
          <div className="w-full md:w-1/2 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
            {selectedQuote ? (
              <div className="space-y-4">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                        Estimate Reference
                      </span>
                      <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                        {selectedQuote.quotationNumber}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-1 rounded-lg">
                      Valid for 7 Days
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Client / Project</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedQuote.customerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-semibold">Contact Phone</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">{selectedQuote.customerPhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Items Summary Table */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700/60 text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    Itemized Material Breakdown
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-48 overflow-y-auto p-1">
                    {selectedQuote.items.map((it, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                        <div className="flex-1 overflow-hidden pr-2">
                          <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{it.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {it.batch ? `Lot/Shade: ${it.batch}` : ''} • {it.qty} Boxes
                          </p>
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                          ₹{safeToFixed(it.total)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Total */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Materials Total:</span>
                      <span className="font-mono">₹{safeToFixed(selectedQuote.billSummary.subtotal)}</span>
                    </div>
                    {selectedQuote.freightAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Transport / Freight:</span>
                        <span className="font-mono">₹{safeToFixed(selectedQuote.freightAmount)}</span>
                      </div>
                    )}
                    {selectedQuote.loadingUnloadingAmount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Loading (Hamali):</span>
                        <span className="font-mono">₹{safeToFixed(selectedQuote.loadingUnloadingAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>GST Taxes:</span>
                      <span className="font-mono">₹{safeToFixed(selectedQuote.billSummary.cgstAmount + selectedQuote.billSummary.sgstAmount)}</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-black text-sm text-slate-900 dark:text-white">
                      <span>Estimated Grand Total:</span>
                      <span className="text-teal-600 dark:text-teal-400 font-mono text-base">
                        ₹{safeToFixed(selectedQuote.billSummary.grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conversion and Print Buttons */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => onConvertQuotation(selectedQuote)}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <span>1-Click Convert to Tax Invoice</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onPrintQuotation(selectedQuote)}
                      className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>Print Proforma Estimate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onDeleteQuotation(selectedQuote.id);
                        setSelectedQuote(null);
                      }}
                      className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Quote</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Select a quotation from the list
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  View itemized breakdown or convert into a finalized retail/wholesale invoice.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
