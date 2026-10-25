import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ecommerceService } from '../../services/ecommerceService';
import { OnlineOrder, DeliveryPartner } from '../../types/ecommerce';
import { 
  Package, Truck, CheckCircle2, Clock, ShieldCheck, AlertCircle, 
  UserCheck, Send, ArrowRight, Store, XCircle, FileText, MapPin 
} from 'lucide-react';

export const StaffEcommerceView: React.FC = () => {
  const { organization, currentStore, firestoreUser, currentStaff } = useWorkspace();
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending_review' | 'picking' | 'ready_dispatch' | 'out_for_delivery' | 'completed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [loading, setLoading] = useState(false);

  const orgId = organization?.id || '';
  const storeId = currentStore?.id || organization?.id || '';
  const staff = { 
    uid: firestoreUser?.uid || 'staff-admin', 
    name: firestoreUser?.displayName || currentStaff?.displayName || 'Staff Pharmacist' 
  };

  useEffect(() => {
    if (orgId) {
      loadData();
    }
  }, [orgId, storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ords = await ecommerceService.getOnlineOrders(orgId, storeId);
      setOrders(ords);
      const prts = await ecommerceService.getDeliveryPartners(orgId);
      setPartners(prts);
    } catch (e) {
      console.error('Failed to load fulfillment data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: any) => {
    try {
      await ecommerceService.updateOrderStatus(orgId, orderId, status, staff);
      loadData();
      alert(`Order status updated to ${status}`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleAssignRider = async (orderId: string) => {
    if (!selectedPartnerId) {
      alert('Please select a delivery partner.');
      return;
    }
    const partner = partners.find(p => p.id === selectedPartnerId);
    if (!partner) return;
    try {
      await ecommerceService.assignOrderToDeliveryPartner(orgId, orderId, partner.id, partner.name, staff);
      loadData();
      alert(`Order assigned to delivery rider ${partner.name}`);
    } catch (err: any) {
      alert('Failed to assign delivery partner: ' + err.message);
    }
  };

  const handleDispatch = async (orderId: string) => {
    try {
      await ecommerceService.dispatchOrder(orgId, orderId, staff);
      loadData();
      alert('Order dispatched out for delivery!');
    } catch (err: any) {
      alert('Dispatch failed: ' + err.message);
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    try {
      await ecommerceService.completeDelivery(orgId, orderId, staff);
      loadData();
      alert('Order marked as successfully delivered!');
    } catch (err: any) {
      alert('Failed to complete delivery: ' + err.message);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'pending_review') return ['pending_review', 'pharmacist_review'].includes(o.orderStatus);
    if (activeTab === 'picking') return ['confirmed', 'stock_reserved', 'picking'].includes(o.orderStatus);
    if (activeTab === 'ready_dispatch') return ['packed', 'ready_for_dispatch'].includes(o.orderStatus);
    if (activeTab === 'out_for_delivery') return o.orderStatus === 'out_for_delivery';
    if (activeTab === 'completed') return ['delivered', 'picked_up'].includes(o.orderStatus);
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C63]">Omnichannel Fulfillment Suite</span>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Staff E-Commerce & Delivery Control Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage online orders, FEFO stock reservation, pharmacist review, and delivery dispatch.</p>
        </div>
        <button onClick={loadData} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-xs font-bold transition-all">
          Refresh Orders
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: `All Orders (${orders.length})` },
          { id: 'pending_review', label: 'Rx Review' },
          { id: 'picking', label: 'Pick & Pack' },
          { id: 'ready_dispatch', label: 'Ready for Dispatch' },
          { id: 'out_for_delivery', label: 'Out for Delivery' },
          { id: 'completed', label: 'Completed' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#0D5C63] text-white shadow' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No orders found in this queue.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-base text-slate-900 dark:text-white">{order.orderNumber}</span>
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                      {order.fulfilmentType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Customer: <strong className="text-slate-700 dark:text-slate-300">{order.customerName}</strong> ({order.customerPhone})</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">₹{order.grandTotal}</span>
                  <p className="text-[10px] text-slate-400 uppercase">{order.paymentMode} • {order.paymentStatus}</p>
                </div>
              </div>

              {/* Items summary */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Order Items ({order.itemsCount})</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.productName}</span>
                        <span className="text-slate-400 ml-2">x{item.qty}</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">₹{item.totalAmount}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address Snapshot */}
              {order.fulfilmentType === 'delivery' && order.deliveryAddressSnapshot && (
                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#0D5C63] mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-slate-700 dark:text-slate-300">{order.deliveryAddressSnapshot.fullName}</strong> — {order.deliveryAddressSnapshot.houseNo}, {order.deliveryAddressSnapshot.street}, {order.deliveryAddressSnapshot.city}, {order.deliveryAddressSnapshot.state} - {order.deliveryAddressSnapshot.postalCode} (Ph: {order.deliveryAddressSnapshot.phone})
                  </div>
                </div>
              )}

              {/* Action Controls */}
              <div className="pt-2 flex flex-wrap gap-2 items-center justify-between">
                <div className="flex items-center gap-2">
                  {order.orderStatus === 'pending_review' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'confirmed')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all">
                      Approve & Confirm Order
                    </button>
                  )}
                  {['confirmed', 'stock_reserved'].includes(order.orderStatus) && (
                    <button onClick={() => handleUpdateStatus(order.id, 'picking')} className="bg-[#0D5C63] hover:bg-[#0a494f] text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all">
                      Start Picking & Packing
                    </button>
                  )}
                  {order.orderStatus === 'picking' && (
                    <button onClick={() => handleUpdateStatus(order.id, 'packed')} className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all">
                      Mark Packed & Ready
                    </button>
                  )}
                  {order.fulfilmentType === 'delivery' && ['packed', 'ready_for_dispatch'].includes(order.orderStatus) && (
                    <div className="flex items-center gap-2">
                      <select 
                        value={selectedPartnerId}
                        onChange={e => setSelectedPartnerId(e.target.value)}
                        className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        <option value="">Select Delivery Rider...</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.vehicleType})</option>
                        ))}
                      </select>
                      <button onClick={() => handleAssignRider(order.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow">
                        Assign Rider
                      </button>
                    </div>
                  )}
                  {order.deliveryStatus === 'assigned' && (
                    <button onClick={() => handleDispatch(order.id)} className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all">
                      Dispatch Out for Delivery
                    </button>
                  )}
                  {order.orderStatus === 'out_for_delivery' && (
                    <button onClick={() => handleCompleteDelivery(order.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-all">
                      Mark Delivered & Collected
                    </button>
                  )}
                </div>

                <button onClick={() => handleUpdateStatus(order.id, 'cancelled')} className="text-rose-600 hover:text-rose-700 text-xs font-bold px-3 py-2">
                  Cancel Order
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
