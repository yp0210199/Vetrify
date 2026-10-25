import React from 'react';

export * from '../loading/Skeletons';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 6, cols = 7 }) => {
  return (
    <div className="w-full bg-white rounded-xl border border-[#E2E8F0] overflow-hidden animate-pulse">
      {/* Table Header */}
      <div className="flex items-center gap-4 px-6 py-3.5 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-[#CBD5E1] rounded flex-1" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-[#F1F5F9]">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-6 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] flex-shrink-0" />
            <div className="h-4 bg-[#E2E8F0] rounded flex-2" />
            <div className="h-4 bg-[#F1F5F9] rounded flex-1" />
            <div className="h-4 bg-[#F1F5F9] rounded flex-1" />
            <div className="h-4 bg-[#E2E8F0] rounded flex-1" />
            <div className="h-4 bg-[#F1F5F9] rounded flex-1" />
            <div className="h-6 w-16 bg-[#E2E8F0] rounded-full flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-4 h-24 flex flex-col justify-between">
            <div className="h-3 bg-[#E2E8F0] rounded w-20" />
            <div className="h-6 bg-[#CBD5E1] rounded w-28" />
            <div className="h-2.5 bg-[#F1F5F9] rounded w-16" />
          </div>
        ))}
      </div>

      {/* Main Charts & Overview Skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] p-6 h-72 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className="h-4 bg-[#CBD5E1] rounded w-36" />
            <div className="h-4 bg-[#E2E8F0] rounded w-24" />
          </div>
          <div className="h-44 bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1]" />
        </div>
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 h-72 flex flex-col justify-between">
          <div className="h-4 bg-[#CBD5E1] rounded w-32" />
          <div className="w-36 h-36 rounded-full bg-[#F1F5F9] mx-auto border-8 border-[#E2E8F0]" />
          <div className="h-3 bg-[#E2E8F0] rounded w-full" />
        </div>
      </div>
    </div>
  );
};

export const PosSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-140px)] animate-pulse">
      <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-3">
        <div className="h-8 bg-[#E2E8F0] rounded" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#F1F5F9] rounded-lg" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-6 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4">
        <div className="h-10 bg-[#E2E8F0] rounded" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#F8FAFC] rounded border border-[#E2E8F0]" />
          ))}
        </div>
      </div>
      <div className="lg:col-span-3 bg-white rounded-xl border border-[#E2E8F0] p-4 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="h-4 bg-[#CBD5E1] rounded w-28" />
          <div className="h-14 bg-[#F1F5F9] rounded" />
        </div>
        <div className="h-12 bg-[#0D5C63]/20 rounded" />
      </div>
    </div>
  );
};
