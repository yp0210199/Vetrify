import React from 'react';
import { Layers, Calendar, PackageCheck, AlertCircle, X, Check, Clock } from 'lucide-react';
import { PharmacyBatch } from '../../types';
import { formatBatchExpiry } from '../../services/posService';
import { getDaysUntilExpiry, isBatchExpiringSoon } from '../../utils/batchUtils';
import { safeToFixed } from '../../lib/formatting/formatters';

interface BatchSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  brand: string;
  batches: PharmacyBatch[];
  selectedBatchId: string;
  onSelectBatch: (batch: PharmacyBatch) => void;
  isLoading?: boolean;
}

export const BatchSelectorModal: React.FC<BatchSelectorModalProps> = ({
  isOpen,
  onClose,
  productName,
  brand,
  batches,
  selectedBatchId,
  onSelectBatch,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="batch-selector-modal-container"
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Select Inventory Batch
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {productName} <span className="text-slate-400">• {brand}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subheader Notice */}
        <div className="px-6 py-2.5 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-900/50 flex items-center gap-2 text-xs text-sky-800 dark:text-sky-300">
          <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
          <span>
            Batches are automatically sorted by <strong>FEFO (First Expiry, First Out)</strong> to minimize wastage and comply with CDSCO standards.
          </span>
        </div>

        {/* Batch List Body */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs">Loading available store batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No active batches available in this store
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Please check inward purchase goods receipt or inward batch transfers.
              </p>
            </div>
          ) : (
            batches.map((batch, index) => {
              const isSelected = batch.id === selectedBatchId;
              const isFefo = index === 0;
              const daysLeft = getDaysUntilExpiry(batch.expiryDate);
              const expiringSoon = isBatchExpiringSoon(batch);
              const isExpired = daysLeft <= 0;

              return (
                <div
                  key={batch.id}
                  id={`batch-row-${batch.id}`}
                  onClick={() => {
                    if (!isExpired && batch.availableQuantity > 0) {
                      onSelectBatch(batch);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-teal-500 bg-teal-500/5 dark:bg-teal-500/10 shadow-sm ring-1 ring-teal-500'
                      : isExpired || batch.availableQuantity === 0
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 opacity-50 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700 bg-white dark:bg-slate-800/80 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {batch.batchNumber}
                        </span>
                        {isFefo && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            ★ FEFO Recommended
                          </span>
                        )}
                        {expiringSoon && !isExpired && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Expiring in {daysLeft}d
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            EXPIRED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Exp: <strong className="text-slate-700 dark:text-slate-200">{formatBatchExpiry(batch.expiryDate)}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5 text-slate-400" />
                          Stock: <strong className="text-slate-700 dark:text-slate-200">{batch.availableQuantity} units</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        ₹{safeToFixed(batch.salePrice)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        MRP ₹{safeToFixed(batch.mrp)}
                      </div>
                      {isSelected && (
                        <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                          <Check className="w-3.5 h-3.5" />
                          Active Cart Batch
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
