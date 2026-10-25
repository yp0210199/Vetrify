import React from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, AlertCircle, LucideIcon } from 'lucide-react';
import { KpiCardProps } from '../../types';

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  title,
  value,
  prefix,
  suffix,
  trend,
  icon,
  statusVariant = 'default',
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data recorded yet',
  actionLabel,
  onAction,
  subValue,
}) => {
  if (isLoading) {
    return (
      <div id={id} className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-sm animate-pulse flex flex-col justify-between h-full min-h-[110px]">
        <div className="flex items-center justify-between">
          <div className="h-3.5 bg-[#E2E8F0] rounded w-24" />
          <div className="h-7 w-7 bg-[#F1F5F9] rounded-lg" />
        </div>
        <div className="my-2">
          <div className="h-7 bg-[#CBD5E1] rounded w-32" />
        </div>
        <div className="h-3 bg-[#E2E8F0] rounded w-20" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div id={id} className="bg-white rounded-xl border border-[#E2E8F0] p-4.5 shadow-sm flex flex-col justify-between h-full min-h-[110px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">{title}</span>
          <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
        </div>
        <div className="my-2">
          <span className="text-xl font-bold text-[#94A3B8] font-mono-num">—</span>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">{emptyMessage}</p>
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-xs font-semibold text-[#0D5C63] hover:underline flex items-center gap-1 cursor-pointer"
          >
            {actionLabel} &rarr;
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id={id}
      className="bg-white rounded-xl border border-[#E2E8F0] p-4 shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between h-full min-h-[110px] group"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#475569] tracking-wide truncate">{title}</span>
        {subValue && (
          <span className="text-[11px] font-medium text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded-full">
            {subValue}
          </span>
        )}
      </div>

      <div className="my-1.5 flex items-baseline gap-1">
        {prefix && <span className="text-lg font-bold text-[#0B1F33] font-mono-num">{prefix}</span>}
        <span className="text-2xl font-extrabold text-[#0B1F33] tracking-tight font-mono-num">
          {typeof value === 'number' ? value.toLocaleString('en-IN') : value}
        </span>
        {suffix && <span className="text-xs font-semibold text-[#64748B] ml-1">{suffix}</span>}
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F1F5F9]">
        {trend ? (
          <div className="flex items-center gap-1 font-medium">
            <span
              className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded ${
                trend.isPositive ? 'text-[#15803D] bg-[#DCFCE7]' : 'text-[#B91C1C] bg-[#FEE2E2]'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3 h-3 mr-0.5 inline" />
              ) : (
                <ArrowDownRight className="w-3 h-3 mr-0.5 inline" />
              )}
              {trend.value}
            </span>
            <span className="text-[11px] text-[#64748B]">{trend.comparisonText}</span>
          </div>
        ) : (
          <span className="text-[11px] text-[#64748B]">Updated live</span>
        )}

        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-[11px] font-semibold text-[#0D5C63] hover:text-[#0A494F] transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
