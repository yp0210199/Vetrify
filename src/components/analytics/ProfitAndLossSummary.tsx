import React from 'react';
import { TrendingUp, DollarSign, Package, Layers, Percent, ShoppingBag } from 'lucide-react';
import { TileFinancialSummary, AnalyticsTimeframe } from '../../types/analytics';

interface ProfitAndLossSummaryProps {
  summary: TileFinancialSummary;
  timeframe: AnalyticsTimeframe;
  onSelectTimeframe: (tf: AnalyticsTimeframe) => void;
}

export const ProfitAndLossSummary: React.FC<ProfitAndLossSummaryProps> = ({
  summary,
  timeframe,
  onSelectTimeframe,
}) => {
  return (
    <div className="space-y-4">
      {/* Timeframe Selector Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">Financial Performance Period:</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          {(['today', 'week', 'month', 'quarter', 'year', 'all'] as AnalyticsTimeframe[]).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => onSelectTimeframe(tf)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors capitalize whitespace-nowrap cursor-pointer ${
                timeframe === tf
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf === 'all' ? 'All Time' : tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Gross Sales Turnover */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Gross Sales Turnover
            </span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900">
            ₹{summary.grossSalesTurnover.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
            <span>{summary.totalInvoicesCount} invoices</span>
            <span aria-hidden="true">·</span>
            <span>Avg ₹{summary.averageOrderValue.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Landed Purchase Cost (COGS)
            </span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-700">
            ₹{Math.round(summary.cogsTotal).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Factory cost + inwards freight
          </div>
        </div>

        {/* Gross Profit Margin */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Gross Trading Profit
            </span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-700">
            ₹{Math.round(summary.grossProfit).toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] font-bold text-emerald-600">
            {summary.grossMarginPercent}% Gross Margin
          </div>
        </div>

        {/* Tile Throughput (Sq.Ft) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Tile Sq. Ft Billed
            </span>
            <Layers className="w-4 h-4 text-[#0D5C63]" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-[#0D5C63]">
            {summary.totalSqFtSold.toLocaleString('en-IN')} <span className="text-xs font-normal text-slate-500">Sq.Ft</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Across {summary.totalBoxesSold.toLocaleString('en-IN')} tile boxes
          </div>
        </div>
      </div>
    </div>
  );
};
