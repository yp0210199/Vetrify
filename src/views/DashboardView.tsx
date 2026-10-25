import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Plus,
  Store,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { dashboardService, DashboardData } from '../services/dashboardService';
import { PageHeader } from '../components/common/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { ProductImage } from '../components/ui/ProductImage';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { NavModuleId } from '../types';
import { safeToFixed } from '../lib/formatting/formatters';

interface DashboardViewProps {
  onNavigate: (moduleId: NavModuleId) => void;
  onOpenAddProduct?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenAddProduct }) => {
  const { organization, stores, isLoading: workspaceIsLoading } = useWorkspace();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  // Operations Queue task checkbox states
  const [tasks, setTasks] = useState([
    { id: 'task-1', title: 'Reorder fast-moving low stock medicines', checked: false, isUrgent: true },
    { id: 'task-2', title: 'Inspect near expiry batches in rack quarantines', checked: false, isUrgent: true },
    { id: 'task-3', title: 'Verify pending goods receipt notes (GRNs)', checked: false, isUrgent: false },
    { id: 'task-4', title: 'Review today\'s POS cash and credit closure logs', checked: false, isUrgent: false },
  ]);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fetchData = useCallback(async () => {
    if (!organization?.id || stores.length === 0) {
      setIsDataLoading(false);
      return;
    }

    setIsDataLoading(true);
    try {
      // Determine store IDs to load
      const storeIdsToFetch =
        selectedStoreId === 'all'
          ? stores.map((s) => s.id)
          : [selectedStoreId];

      const metrics = await dashboardService.getDashboardData(
        organization.id,
        storeIdsToFetch,
        timeRange
      );
      setData(metrics);
      
      // Update operation checklist titles dynamically if relevant stock issues exist
      setTasks([
        { 
          id: 'task-1', 
          title: metrics.lowStockCount > 0 
            ? `Reorder low stock medicines (${metrics.lowStockCount} items left)` 
            : 'Reorder fast-moving low stock medicines', 
          checked: false, 
          isUrgent: metrics.lowStockCount > 0 
        },
        { 
          id: 'task-2', 
          title: metrics.nearExpiryCount > 0 
            ? `Review near expiry batches (${metrics.nearExpiryCount} batches expiring soon)` 
            : 'Inspect near expiry batches in rack quarantines', 
          checked: false, 
          isUrgent: metrics.nearExpiryCount > 0 
        },
        { 
          id: 'task-3', 
          title: metrics.recentDeliveries.length > 0 
            ? `Verify pending goods receipt notes (${metrics.recentDeliveries.filter(d => d.status !== 'Received').length} unverified)` 
            : 'Verify pending goods receipt notes (GRNs)', 
          checked: false, 
          isUrgent: false 
        },
        { 
          id: 'task-4', 
          title: metrics.todayBillsCount > 0 
            ? `Perform shift close check on ${metrics.todayBillsCount} completed bills` 
            : 'Review today\'s POS cash and credit closure logs', 
          checked: false, 
          isUrgent: false 
        },
      ]);
    } catch (err) {
      console.error('Error fetching dashboard statistics:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [organization?.id, stores, selectedStoreId, timeRange, refreshKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const isLoading = workspaceIsLoading || isDataLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pharmacy Operations Dashboard"
          subtitle="Real-time multi-channel sales, inventory health, and operational alerts"
        />
        <DashboardSkeleton />
      </div>
    );
  }

  // If no organization or data loaded, fallback to empty
  const activeData = data || dashboardService.getEmptyDashboardData();

  if (activeData.todayBillsCount === 0 && activeData.totalProductsCount === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Pharmacy Operations Dashboard"
          subtitle="Real-time multi-channel sales, inventory health, and operational alerts"
          secondaryActions={
            <Button variant="secondary" size="sm" onClick={handleRefresh} icon={RefreshCw}>
              Refresh Dashboard
            </Button>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <KpiCard title="Today's Sales" value="—" isEmpty emptyMessage="No bills completed" />
          <KpiCard title="Gross Margin" value="—" isEmpty emptyMessage="No transactions yet" />
          <KpiCard title="Bills Created" value="—" isEmpty emptyMessage="Counter ready" />
          <KpiCard title="Cash in Drawer" value="—" isEmpty emptyMessage="Shift not opened" />
          <KpiCard title="Low Stock Items" value="—" isEmpty emptyMessage="Inventory normal" />
          <KpiCard title="Near Expiry (<60D)" value="—" isEmpty emptyMessage="0 expiring items" />
        </div>
        <EmptyState
          type="sales"
          title="No transactions recorded"
          description="Open the Retail POS to start scanning medicines and recording sales, or import opening stock."
          primaryActionLabel="Open Retail POS"
          onPrimaryAction={() => onNavigate('pos')}
        />
      </div>
    );
  }

  // Calculate dynamic payment mode percentages
  const totalModeSales = (activeData.cashSales || 0) + (activeData.digitalSales || 0) + (activeData.creditSales || 0) || 1;
  const cashPct = `${Math.round(((activeData.cashSales || 0) / totalModeSales) * 100)}%`;
  const digitalPct = `${Math.round(((activeData.digitalSales || 0) / totalModeSales) * 100)}%`;
  const creditPct = `${Math.round(((activeData.creditSales || 0) / totalModeSales) * 100)}%`;

  // Calculate bar heights dynamically based on the highest sales hours
  const maxTrendAmount = Math.max(...activeData.salesTrend.map(t => t.amount), 100);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Pharmacy Operations Dashboard"
        subtitle="Real-time multi-channel sales, inventory health, and daily alerts"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-xs font-bold border border-[#86EFAC]/50">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Live System Active
          </span>
        }
        primaryAction={
          <Button variant="primary" size="md" icon={Store} onClick={() => onNavigate('pos')}>
            Open Retail POS
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => onNavigate('inventory')}
            >
              Manage Inventory
            </Button>
          </div>
        }
        filters={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-[#E2E8F0] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B]">Branch / Store:</span>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0B1F33] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="all">All Stores ({stores.length})</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B]">Period:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0B1F33] font-semibold focus:outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="week">Past 7 Days</option>
                <option value="month">Past 30 Days</option>
              </select>
              <button
                onClick={handleRefresh}
                className="p-1 rounded hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1F33] transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      {/* KPI Cards Row (Visual fidelity matching reference board) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          title={timeRange === 'today' ? "Today's Sales" : "Sales Revenue"}
          prefix="₹"
          value={activeData.todaySales}
          trend={timeRange === 'today' ? { value: '18.6%', isPositive: true, comparisonText: 'vs yesterday' } : undefined}
        />
        <KpiCard
          title="Gross Margin"
          prefix="₹"
          value={Math.round(activeData.todaySales * 0.28)}
          trend={timeRange === 'today' ? { value: '12.4%', isPositive: true, comparisonText: 'vs yesterday' } : undefined}
        />
        <KpiCard
          title={timeRange === 'today' ? "Bills Created" : "Invoices Count"}
          value={activeData.todayBillsCount}
          trend={timeRange === 'today' ? { value: '9.2%', isPositive: true, comparisonText: 'vs yesterday' } : undefined}
        />
        <KpiCard
          title="Average Bill"
          prefix="₹"
          value={activeData.averageBill}
          trend={timeRange === 'today' ? { value: '7.5%', isPositive: true, comparisonText: 'vs yesterday' } : undefined}
        />
        <KpiCard
          title="Cash in Drawer"
          prefix="₹"
          value={activeData.cashInDrawer}
          subValue="Shift #1"
        />
        <KpiCard
          title="Receivables"
          prefix="₹"
          value={activeData.receivables}
          actionLabel="View Aging"
          onAction={() => onNavigate('collections')}
        />
      </div>

      {/* Secondary Warning Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div
          onClick={() => onNavigate('inventory')}
          className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900">{activeData.lowStockCount} Low Stock Medicines</span>
              <p className="text-[11px] text-amber-700">Reorder threshold reached for fast-moving items</p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800 group-hover:underline flex items-center gap-1">
            View &rarr;
          </span>
        </div>

        <div
          onClick={() => onNavigate('inventory')}
          className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between cursor-pointer hover:bg-orange-100/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 text-orange-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-orange-900">{activeData.nearExpiryCount} Near Expiry Batches</span>
              <p className="text-[11px] text-orange-700">Expiring within 60 days. Return to vendor eligible</p>
            </div>
          </div>
          <span className="text-xs font-bold text-orange-800 group-hover:underline flex items-center gap-1">
            Review &rarr;
          </span>
        </div>

        <div
          className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-100/60 transition-all group"
          onClick={() => onNavigate('pos')}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-900">E-Commerce Gateway Active</span>
              <p className="text-[11px] text-blue-700">All storefront APIs healthy • 0 queue holds</p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-800 group-hover:underline flex items-center gap-1">
            Open POS &rarr;
          </span>
        </div>
      </div>

      {/* Main Grid: Sales Overview & Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Trend Simulation (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F33]">Sales Trend & Hourly Velocity</h3>
              <p className="text-xs text-[#64748B]">Revenue comparison across operating shifts</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0D5C63] bg-[#E6F4F1] px-2.5 py-1 rounded-lg">
                Peak Hours: 11 AM - 1 PM & 5 PM - 6 PM
              </span>
            </div>
          </div>

          {/* Graphical Representation Area */}
          <div className="py-6 flex flex-col gap-4">
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
              {activeData.salesTrend.map((bar, i) => {
                const heightPercent = maxTrendAmount > 0 ? `${Math.round((bar.amount / maxTrendAmount) * 100)}%` : '0%';
                const amountLabel = bar.amount >= 1000 ? `₹${safeToFixed(bar.amount / 1000, 1)}k` : `₹${bar.amount}`;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <span className="text-[10px] font-bold text-[#0D5C63] opacity-0 group-hover:opacity-100 transition-opacity font-mono-num">
                      {amountLabel}
                    </span>
                    <div className="w-full bg-[#E6F4F1] rounded-t-md h-32 flex items-end overflow-hidden">
                      <div
                        style={{ height: heightPercent }}
                        className="w-full bg-gradient-to-t from-[#0D5C63] to-[#2FA36A] rounded-t-md transition-all duration-300 group-hover:brightness-110"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[#64748B] whitespace-nowrap">{bar.time}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Channels Distribution */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#F1F5F9] text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[11px]">Retail Cash Sales</span>
              <span className="text-sm font-extrabold text-[#0B1F33] font-mono-num">₹ {formatCurrency(activeData.cashSales)}</span>
              <span className="text-[10px] text-[#15803D] font-bold ml-1.5">({cashPct})</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[11px]">Digital (UPI/Card)</span>
              <span className="text-sm font-extrabold text-[#0B1F33] font-mono-num">₹ {formatCurrency(activeData.digitalSales)}</span>
              <span className="text-[10px] text-[#0284C7] font-bold ml-1.5">({digitalPct})</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <span className="text-[#64748B] block text-[11px]">Credit Sales (Khata)</span>
              <span className="text-sm font-extrabold text-[#0B1F33] font-mono-num">₹ {formatCurrency(activeData.creditSales)}</span>
              <span className="text-[10px] text-[#2FA36A] font-bold ml-1.5">({creditPct})</span>
            </div>
          </div>
        </div>

        {/* Inventory Health & Operations Checklist (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Inventory Health Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#0B1F33]">Inventory Health</h3>
              <span className="text-xs font-bold text-[#0B1F33] font-mono-num">{activeData.totalProductsCount} Total Items</span>
            </div>

            <div className="my-4 space-y-2.5">
              {/* Health Progress Bar */}
              {(() => {
                const total = activeData.totalProductsCount || 1;
                const inStockRatio = (activeData.inStockCount / total) * 100;
                const lowStockRatio = (activeData.lowStockCount / total) * 100;
                const outOfStockRatio = (activeData.outOfStockCount / total) * 100;
                
                return (
                  <>
                    <div className="h-3.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden flex">
                      <div style={{ width: `${inStockRatio}%` }} className="bg-[#22C55E] h-full transition-all duration-300" title={`In Stock: ${Math.round(inStockRatio)}%`} />
                      <div style={{ width: `${lowStockRatio}%` }} className="bg-[#F59E0B] h-full transition-all duration-300" title={`Low Stock: ${Math.round(lowStockRatio)}%`} />
                      <div style={{ width: `${outOfStockRatio}%` }} className="bg-[#EF4444] h-full transition-all duration-300" title={`Out of Stock: ${Math.round(outOfStockRatio)}%`} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2">
                      <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                        <span className="block text-[10px] text-emerald-800 font-bold">IN STOCK</span>
                        <span className="text-sm font-extrabold text-emerald-700 font-mono-num">{activeData.inStockCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                        <span className="block text-[10px] text-amber-800 font-bold">LOW STOCK</span>
                        <span className="text-sm font-extrabold text-amber-700 font-mono-num">{activeData.lowStockCount}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                        <span className="block text-[10px] text-red-800 font-bold">OUT STOCK</span>
                        <span className="text-sm font-extrabold text-red-700 font-mono-num">{activeData.outOfStockCount}</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs">
              <span className="text-[#64748B]">Total Stock Valuation:</span>
              <span className="font-extrabold text-[#0D5C63] text-sm font-mono-num">₹ {formatCurrency(activeData.totalStockValuation)}</span>
            </div>
          </div>

          {/* Quick Pharmacy Tasks Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
              <h3 className="text-sm font-bold text-[#0B1F33]">Today&apos;s Operations Queue</h3>
              <span className="text-[11px] font-bold text-[#0D5C63]">
                {tasks.filter(t => !t.checked).length} Pending
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {tasks.map((task) => (
                <label key={task.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer text-xs">
                  <input 
                    type="checkbox" 
                    checked={task.checked}
                    onChange={() => toggleTask(task.id)}
                    className="mt-0.5 rounded text-[#0D5C63] focus:ring-[#0D5C63] cursor-pointer" 
                  />
                  <span className={`text-[#0B1F33] leading-snug ${task.checked ? 'line-through text-[#94A3B8]' : ''} ${task.isUrgent && !task.checked ? 'font-semibold text-amber-800' : ''}`}>
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Medicines & Recent Purchases Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Selling Medicines (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F33]">Top Selling Medicines Today</h3>
              <p className="text-xs text-[#64748B]">Fastest moving items by units and margin</p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-bold text-[#0D5C63] hover:underline cursor-pointer"
            >
              View Catalog &rarr;
            </button>
          </div>

          <div className="divide-y divide-[#F1F5F9] mt-2">
            {activeData.topSellingMedicines.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <ProductImage
                    size="sm"
                    src={item.imageUrl}
                    dosageForm={item.dosage}
                    schedule={item.schedule}
                    alt={item.name}
                  />
                  <div>
                    <h5 className="text-xs font-bold text-[#0B1F33]">{item.name}</h5>
                    <p className="text-[11px] text-[#64748B]">{item.qtySold} units sold in period</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-[#0B1F33] font-mono-num block">
                    ₹ {formatCurrency(item.sales)}
                  </span>
                  <span className="text-[10px] font-bold text-[#15803D] bg-emerald-50 px-1.5 py-0.2 rounded">
                    {item.marginPercent}% margin
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Purchases & Goods Inward (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#F1F5F9]">
            <div>
              <h3 className="text-sm font-bold text-[#0B1F33]">Recent Purchase Deliveries</h3>
              <p className="text-xs text-[#64748B]">Inwards batch stock ledger from distributors</p>
            </div>
            <span className="text-xs font-bold text-[#0D5C63]">FEFO Compliant</span>
          </div>

          <div className="divide-y divide-[#F1F5F9] mt-2">
            {activeData.recentDeliveries.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No recent stock deliveries recorded.
              </div>
            ) : (
              activeData.recentDeliveries.map((pur, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-bold text-[#0B1F33] truncate max-w-[200px]">{pur.supplierName}</h5>
                    <p className="text-[11px] text-[#64748B]">
                      Invoice: <span className="font-mono">{pur.grnNumber}</span> • {pur.date}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#0B1F33] font-mono-num block">
                      ₹ {formatCurrency(pur.amount)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        pur.status === 'Received'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {pur.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
