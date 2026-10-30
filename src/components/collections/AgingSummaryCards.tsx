import React from 'react';
import { Wallet, AlertTriangle, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { AgingPortfolioMetrics } from '../../types/collections';

interface AgingSummaryCardsProps {
  metrics: AgingPortfolioMetrics;
  onFilterBucket?: (bucket: string) => void;
  selectedBucket?: string;
}

export const AgingSummaryCards: React.FC<AgingSummaryCardsProps> = ({
  metrics,
  onFilterBucket,
  selectedBucket = 'all',
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* 1. Total Outstanding Receivables */}
      <div
        onClick={() => onFilterBucket?.('all')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedBucket === 'all'
            ? 'bg-[#0B1F33] text-white border-[#0B1F33] shadow-md'
            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            Total Khata Balance
          </span>
          <Wallet className={`w-4 h-4 ${selectedBucket === 'all' ? 'text-emerald-400' : 'text-slate-400'}`} />
        </div>
        <div className="mt-2 text-xl font-black font-mono tracking-tight">
          ₹{metrics.totalReceivables.toLocaleString('en-IN')}
        </div>
        <div className={`mt-1 text-[11px] ${selectedBucket === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
          Across {metrics.totalCustomersCount} active accounts
        </div>
      </div>

      {/* 2. 0 - 30 Days: Current Billing Cycle */}
      <div
        onClick={() => onFilterBucket?.('0-30')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedBucket === '0-30'
            ? 'bg-emerald-700 text-white border-emerald-700 shadow-md'
            : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === '0-30' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            0 - 30 Days (Current)
          </span>
          <CheckCircle2 className={`w-4 h-4 ${selectedBucket === '0-30' ? 'text-white' : 'text-emerald-500'}`} />
        </div>
        <div className="mt-2 text-xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
          ₹{metrics.b0_30_total.toLocaleString('en-IN')}
        </div>
        <div className={`mt-1 text-[11px] ${selectedBucket === '0-30' ? 'text-emerald-100' : 'text-slate-500'}`}>
          Standard credit term window
        </div>
      </div>

      {/* 3. 31 - 60 Days: Due Soon */}
      <div
        onClick={() => onFilterBucket?.('31-60')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedBucket === '31-60'
            ? 'bg-amber-600 text-white border-amber-600 shadow-md'
            : 'bg-white border-slate-200 hover:border-amber-300 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === '31-60' ? 'text-amber-100' : 'text-amber-700'}`}>
            31 - 60 Days (Due)
          </span>
          <Clock className={`w-4 h-4 ${selectedBucket === '31-60' ? 'text-white' : 'text-amber-500'}`} />
        </div>
        <div className="mt-2 text-xl font-black font-mono tracking-tight text-amber-600">
          ₹{metrics.b31_60_total.toLocaleString('en-IN')}
        </div>
        <div className={`mt-1 text-[11px] ${selectedBucket === '31-60' ? 'text-amber-100' : 'text-slate-500'}`}>
          First follow-up cycle
        </div>
      </div>

      {/* 4. 61 - 90 Days: Overdue Alert */}
      <div
        onClick={() => onFilterBucket?.('61-90')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedBucket === '61-90'
            ? 'bg-orange-600 text-white border-orange-600 shadow-md'
            : 'bg-white border-slate-200 hover:border-orange-300 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === '61-90' ? 'text-orange-100' : 'text-orange-700'}`}>
            61 - 90 Days (Overdue)
          </span>
          <AlertTriangle className={`w-4 h-4 ${selectedBucket === '61-90' ? 'text-white' : 'text-orange-500'}`} />
        </div>
        <div className="mt-2 text-xl font-black font-mono tracking-tight text-orange-600">
          ₹{metrics.b61_90_total.toLocaleString('en-IN')}
        </div>
        <div className={`mt-1 text-[11px] ${selectedBucket === '61-90' ? 'text-orange-100' : 'text-slate-500'}`}>
          Site delivery hold warning
        </div>
      </div>

      {/* 5. 90+ Days: Critical Overdue */}
      <div
        onClick={() => onFilterBucket?.('90+')}
        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
          selectedBucket === '90+'
            ? 'bg-rose-700 text-white border-rose-700 shadow-md'
            : 'bg-white border-slate-200 hover:border-rose-300 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedBucket === '90+' ? 'text-rose-100' : 'text-rose-700'}`}>
            90+ Days (Critical)
          </span>
          <ShieldAlert className={`w-4 h-4 ${selectedBucket === '90+' ? 'text-white' : 'text-rose-500'}`} />
        </div>
        <div className="mt-2 text-xl font-black font-mono tracking-tight text-rose-600">
          ₹{metrics.b90_plus_total.toLocaleString('en-IN')}
        </div>
        <div className={`mt-1 text-[11px] ${selectedBucket === '90+' ? 'text-rose-100' : 'text-slate-500'}`}>
          Manager intervention required
        </div>
      </div>
    </div>
  );
};
