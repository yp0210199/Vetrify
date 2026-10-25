import React, { useState } from 'react';
import { X, PackageCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WholesaleOrder } from '../../types/wholesale';

interface WholesaleFulfillmentModalProps {
  order: WholesaleOrder | null;
  onFulfill: (orderId: string, items: { productId: string; fulfillQty: number }[]) => Promise<void>;
  onClose: () => void;
}

export const WholesaleFulfillmentModal: React.FC<WholesaleFulfillmentModalProps> = ({
  order,
  onFulfill,
  onClose,
}) => {
  if (!order) return null;

  const [fulfillmentState, setFulfillmentState] = useState<{ [productId: string]: number }>(() => {
    const initial: { [productId: string]: number } = {};
    order.items.forEach((item) => {
      initial[item.productId] = Math.max(0, item.orderedQty - item.fulfilledQty);
    });
    return initial;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQtyChange = (prodId: string, val: number) => {
    const item = order.items.find((i) => i.productId === prodId);
    if (!item) return;
    const maxAllowed = item.orderedQty - item.fulfilledQty;
    const clamped = Math.max(0, Math.min(maxAllowed, val));
    setFulfillmentState({ ...fulfillmentState, [prodId]: clamped });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fulfillmentItems = Object.entries(fulfillmentState)
      .filter(([_, fulfillQty]) => (fulfillQty as number) > 0)
      .map(([productId, fulfillQty]) => ({ productId, fulfillQty: fulfillQty as number }));

    if (fulfillmentItems.length === 0) {
      alert('Please specify at least one item quantity to fulfill.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onFulfill(order.id, fulfillmentItems);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to execute fulfillment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">FEFO Batch Stock Fulfillment — {order.orderNumber}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <p className="font-bold text-slate-900">{order.customerName}</p>
            <p className="text-slate-600">
              Total Ordered Qty: {order.totalOrderedQty} | Reserved Qty: {order.totalReservedQty}
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <th className="p-3">Product Name</th>
                  <th className="p-3 text-center">Allocated Batch / Expiry</th>
                  <th className="p-3 text-right">Ordered</th>
                  <th className="p-3 text-right">Fulfilled</th>
                  <th className="p-3 text-right">Current Dispatch Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const batchAlloc = item.allocatedBatches && item.allocatedBatches.length > 0 ? item.allocatedBatches[0] : null;
                  const remainingToFulfill = item.orderedQty - item.fulfilledQty;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="p-3">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-[11px] text-slate-500">{item.brand}</p>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {batchAlloc ? (
                          <div>
                            <span className="font-bold text-slate-800">{batchAlloc.batchNumber}</span>
                            <span className="text-[10px] text-slate-500 block">Exp: {batchAlloc.expiryDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Auto-FEFO</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">{item.orderedQty}</td>
                      <td className="p-3 text-right text-emerald-700 font-bold">{item.fulfilledQty}</td>
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0"
                          max={remainingToFulfill}
                          value={fulfillmentState[item.productId] ?? 0}
                          onChange={(e) => handleQtyChange(item.productId, Number(e.target.value))}
                          className="w-20 px-2 py-1 text-right font-bold border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
            >
              {isSubmitting ? 'Deducting Stock...' : 'Confirm Stock Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
