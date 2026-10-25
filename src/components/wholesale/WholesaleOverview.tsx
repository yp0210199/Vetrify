import React from 'react';
import {
  Building2,
  TrendingUp,
  FileText,
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  DollarSign,
  Users,
  Percent,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { WholesaleMetrics, WholesaleOrder } from '../../types/wholesale';

interface WholesaleOverviewProps {
  metrics: WholesaleMetrics | null;
  recentOrders: WholesaleOrder[];
  onNavigateTab: (tab: string) => void;
  onOpenOrderWizard: () => void;
  onOpenCustomerModal: () => void;
  onOpenQuoteModal: () => void;
}

export const WholesaleOverview: React.FC<WholesaleOverviewProps> = ({
  metrics,
  recentOrders,
  onNavigateTab,
  onOpenOrderWizard,
  onOpenCustomerModal,
  onOpenQuoteModal,
}) => {
  const m = metrics || {
    salesToday: 0,
    ordersTodayCount: 0,
    pendingOrdersCount: 0,
    pendingDispatchCount: 0,
    outstandingReceivables: 0,
    creditUtilizationPercent: 0,
    overdueReceivables: 0,
    grossMarginPercent: 28.5,
    ordersAwaitingApprovalCount: 0,
    ordersAwaitingFulfillmentCount: 0,
    partiallyFulfilledOrdersCount: 0,
    customersNearCreditLimitCount: 0,
    overdueAccountsCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Wholesale B2B & Institutional Control Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 pl-9">
            Auditable bulk sales, credit control, quotation workflows, FEFO reservation, and delivery dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenOrderWizard}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Wholesale Order
          </button>
          <button
            onClick={onOpenQuoteModal}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            New Quotation
          </button>
          <button
            onClick={onOpenCustomerModal}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-all border border-slate-700"
          >
            <Users className="w-4 h-4 text-blue-400" />
            Add B2B Customer
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Wholesale Sales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ₹{m.salesToday.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {m.ordersTodayCount} Wholesale Orders Created Today
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-between justify-center font-bold">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Orders & Dispatch */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Pipeline</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {m.pendingOrdersCount + m.pendingDispatchCount} <span className="text-sm font-medium text-slate-500">orders</span>
            </h3>
            <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {m.pendingDispatchCount} Pending Dispatch
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Receivables (Khata)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ₹{m.outstandingReceivables.toLocaleString('en-IN')}
            </h3>
            <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              ₹{m.overdueReceivables.toLocaleString('en-IN')} Overdue
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Credit Utilization & Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit Utilization</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {m.creditUtilizationPercent}%
            </h3>
            <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              Gross Margin: {m.grossMarginPercent}%
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Operational Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Orders Awaiting Approval</span>
            <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-3xl font-black text-amber-950">{m.ordersAwaitingApprovalCount}</div>
          <p className="text-xs text-amber-700 mt-1">Require credit verification or manager sign-off</p>
        </div>

        <div
          onClick={() => onNavigateTab('orders')}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/70 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Awaiting Stock Reservation</span>
            <ChevronRight className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-3xl font-black text-blue-950">{m.ordersAwaitingFulfillmentCount}</div>
          <p className="text-xs text-blue-700 mt-1">Approved orders ready for FEFO batch allocation</p>
        </div>

        <div
          onClick={() => onNavigateTab('customers')}
          className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200/70 p-5 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Customers Near Credit Limit</span>
            <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <div className="text-3xl font-black text-rose-950">{m.customersNearCreditLimitCount}</div>
          <p className="text-xs text-rose-700 mt-1">Accounts at &gt;80% credit limit utilization</p>
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Wholesale Orders</h2>
            <p className="text-xs text-slate-500">Live order status and fulfillment progress</p>
          </div>
          <button
            onClick={() => onNavigateTab('orders')}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            View All Orders
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <FileText className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No Wholesale Orders Yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Start by creating your first wholesale order or quotation for a hospital, clinic, or pharmacy customer.
            </p>
            <button
              onClick={onOpenOrderWizard}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition-colors"
            >
              Create First Wholesale Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Payment Terms</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Total (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {recentOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{order.orderNumber}</td>
                    <td className="p-3 font-semibold text-slate-800">{order.customerName}</td>
                    <td className="p-3 text-slate-600">{order.paymentTerms}</td>
                    <td className="p-3 text-right font-medium">{order.itemsCount}</td>
                    <td className="p-3 text-right font-black text-slate-900">₹{order.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'RESERVED'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'READY_FOR_DISPATCH'
                            ? 'bg-purple-100 text-purple-800'
                            : order.status === 'DISPATCHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onNavigateTab('orders')}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
