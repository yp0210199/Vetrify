import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Layers,
  Users,
  ReceiptText,
  RefreshCw,
  Download,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { analyticsService } from '../services/analyticsService';
import {
  AnalyticsTimeframe,
  TileFinancialSummary,
  CategorySalesBreakdown,
  ShadeVelocityItem,
  ArchitectAttribution,
  HsnTaxAuditRow,
} from '../types/analytics';
import { ProfitAndLossSummary } from '../components/analytics/ProfitAndLossSummary';
import { TileSqFtVelocityReport } from '../components/analytics/TileSqFtVelocityReport';
import { ShadeVelocityMatrix } from '../components/analytics/ShadeVelocityMatrix';
import { ArchitectAttributionReport } from '../components/analytics/ArchitectAttributionReport';
import { GstTaxAuditReport } from '../components/analytics/GstTaxAuditReport';
import { useToast } from '../context/ToastContext';

export const TileAnalyticsReportsView: React.FC = () => {
  const { organization, currentStore } = useWorkspace();
  const { error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'pnl_margins' | 'shade_velocity' | 'architects' | 'gst_audit'>('pnl_margins');
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>('month');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [summary, setSummary] = useState<TileFinancialSummary>({
    timeframe: 'month',
    grossSalesTurnover: 0,
    netSalesTurnover: 0,
    totalDiscount: 0,
    totalTaxCollected: 0,
    freightAndHandlingRevenue: 0,
    cogsTotal: 0,
    grossProfit: 0,
    grossMarginPercent: 0,
    totalInvoicesCount: 0,
    averageOrderValue: 0,
    totalSqFtSold: 0,
    totalBoxesSold: 0,
    totalSanitaryPiecesSold: 0,
    totalFaucetPiecesSold: 0,
  });

  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySalesBreakdown[]>([]);
  const [shadeVelocity, setShadeVelocity] = useState<ShadeVelocityItem[]>([]);
  const [architects, setArchitects] = useState<ArchitectAttribution[]>([]);
  const [hsnRows, setHsnRows] = useState<HsnTaxAuditRow[]>([]);

  const loadAllAnalytics = useCallback(async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    try {
      const [sumRes, catRes, shadeRes, archRes, hsnRes] = await Promise.all([
        analyticsService.getFinancialSummary(organization.id, currentStore?.id, timeframe),
        analyticsService.getCategoryBreakdown(organization.id, currentStore?.id),
        analyticsService.getShadeLotVelocity(organization.id, currentStore?.id),
        analyticsService.getArchitectReport(organization.id),
        analyticsService.getHsnTaxAudit(organization.id, currentStore?.id),
      ]);

      setSummary(sumRes);
      setCategoryBreakdown(catRes);
      setShadeVelocity(shadeRes);
      setArchitects(archRes);
      setHsnRows(hsnRes);
    } catch (err: any) {
      console.error('Failed to load tile analytics:', err);
      toastError('Failed to load live financial calculations');
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, currentStore?.id, timeframe, toastError]);

  useEffect(() => {
    loadAllAnalytics();
  }, [loadAllAnalytics]);

  return (
    <div className="space-y-6">
      {/* Module Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Analytics & Tile Financial Reports
            </h1>
          </div>
          <p className="text-xs text-slate-400 pl-9">
            Profit & loss analysis, ceramic sq.ft throughput, shade/lot movement velocity, and architect commissions.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAllAnalytics}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Recalculate Reports</span>
        </button>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('pnl_margins')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pnl_margins'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>P&L Financials & Category Margins</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shade_velocity')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'shade_velocity'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-[#0D5C63]" />
          <span>Tile Shade & Lot Velocity</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('architects')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'architects'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-violet-600" />
          <span>Architect Referrals ({architects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gst_audit')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'gst_audit'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ReceiptText className="w-4 h-4 text-amber-600" />
          <span>HSN 6907 Ceramic Tax Audit</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0D5C63] mb-2" />
          <span>Aggregating real sales records, landed costs, and shade batches...</span>
        </div>
      ) : (
        <>
          {activeTab === 'pnl_margins' && (
            <div className="space-y-6">
              <ProfitAndLossSummary
                summary={summary}
                timeframe={timeframe}
                onSelectTimeframe={(tf) => setTimeframe(tf)}
              />
              <TileSqFtVelocityReport categories={categoryBreakdown} />
            </div>
          )}

          {activeTab === 'shade_velocity' && (
            <ShadeVelocityMatrix items={shadeVelocity} />
          )}

          {activeTab === 'architects' && (
            <ArchitectAttributionReport partners={architects} />
          )}

          {activeTab === 'gst_audit' && (
            <GstTaxAuditReport rows={hsnRows} />
          )}
        </>
      )}
    </div>
  );
};
