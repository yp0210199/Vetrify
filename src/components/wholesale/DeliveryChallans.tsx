import React, { useState } from 'react';
import { Truck, Plus, Search, Printer, X, CheckCircle2 } from 'lucide-react';
import { DeliveryChallan, WholesaleOrder } from '../../types/wholesale';

interface DeliveryChallansProps {
  challans: DeliveryChallan[];
  ordersReadyForDispatch: WholesaleOrder[];
  onCreateChallan: (payload: any) => Promise<DeliveryChallan>;
  onPrintDoc: (type: 'quotation' | 'invoice' | 'challan', doc: any) => void;
  isOpenModal: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
  selectedOrderForChallan?: WholesaleOrder | null;
}

export const DeliveryChallans: React.FC<DeliveryChallansProps> = ({
  challans,
  ordersReadyForDispatch,
  onCreateChallan,
  onPrintDoc,
  isOpenModal,
  onOpenModal,
  onCloseModal,
  selectedOrderForChallan,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(selectedOrderForChallan?.id || '');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [totalPackages, setTotalPackages] = useState(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) {
      alert('Please select an order for dispatch.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateChallan({
        orderId: selectedOrderId,
        transporterName,
        vehicleNumber,
        driverName,
        driverPhone,
        totalPackages,
        notes,
      });

      setSelectedOrderId('');
      setTransporterName('');
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      onCloseModal();
    } catch (err: any) {
      alert(err.message || 'Failed to generate Delivery Challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeChallans = Array.isArray(challans) ? challans : [];
  const safeOrdersReadyForDispatch = Array.isArray(ordersReadyForDispatch) ? ordersReadyForDispatch : [];

  const filteredChallans = safeChallans.filter(
    (c) =>
      c.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-auto flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Challan #, Order #, or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Generate Delivery Challan
        </button>
      </div>

      {/* Delivery Challans Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Challan #</th>
                <th className="p-4">Order Ref</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4 text-center">Dispatch Date</th>
                <th className="p-4">Transporter & Vehicle</th>
                <th className="p-4 text-center">Packages</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No Delivery Challans Found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Challans document physical dispatch of wholesale inventory.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredChallans.map((dc) => (
                  <tr key={dc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{dc.challanNumber}</td>
                    <td className="p-4 font-mono text-slate-600">{dc.orderNumber}</td>
                    <td className="p-4 font-semibold text-slate-800">{dc.customerName}</td>
                    <td className="p-4 text-center text-slate-600 font-medium">{dc.dispatchDate}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{dc.transporterName || 'Self Transport'}</div>
                      <div className="text-[11px] font-mono text-slate-500">{dc.vehicleNumber || 'N/A'}</div>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-900">{dc.totalPackages || 1} Box(es)</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {dc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => onPrintDoc('challan', dc)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        title="Print Delivery Challan"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Challan Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">New Delivery Challan</h2>
              </div>
              <button onClick={onCloseModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Order for Dispatch *</label>
                <select
                  required
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="">-- Choose Fulfilled Order --</option>
                  {safeOrdersReadyForDispatch.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} — {o.customerName} ({o.totalFulfilledQty} units)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transporter / Carrier Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BlueDart Logistics"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Registration No.</label>
                  <input
                    type="text"
                    placeholder="e.g. DL-01-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Name</label>
                  <input
                    type="text"
                    placeholder="Driver full name"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Number of Sealed Packages / Boxes</label>
                <input
                  type="number"
                  min="1"
                  value={totalPackages}
                  onChange={(e) => setTotalPackages(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Delivery Instructions / Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Cold-chain temperature requirement, gate pass details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all"
                >
                  {isSubmitting ? 'Dispatching...' : 'Confirm Dispatch & Create Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
