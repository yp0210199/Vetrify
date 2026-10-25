import React from 'react';
import { Loader2 } from 'lucide-react';

export const InlineLoader: React.FC<{ message?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex items-center gap-2.5 text-[#64748B] text-xs font-medium py-2">
      <Loader2 className={`${sizeClasses[size]} text-[#0D5C63] animate-spin flex-shrink-0`} />
      {message && <span>{message}</span>}
    </div>
  );
};

export const FullPageLoader: React.FC<{ message?: string }> = ({
  message = 'Loading pharmacy workspace...',
}) => {
  return (
    <div className="min-h-screen w-screen bg-[#0B1F33] flex flex-col items-center justify-center p-6 text-white antialiased z-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0D5C63] border border-[#38BDF8]/20 flex items-center justify-center shadow-2xl">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
        <p className="text-xs font-semibold text-[#CBD5E1] tracking-wide">{message}</p>
      </div>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E2E8F0] p-5 space-y-3 shadow-xs">
          <div className="h-4 bg-[#E2E8F0] rounded w-2/3" />
          <div className="h-7 bg-[#CBD5E1] rounded w-1/2" />
          <div className="h-3 bg-[#F1F5F9] rounded w-full" />
        </div>
      ))}
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#F1F5F9] animate-pulse overflow-hidden">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-9 h-9 rounded-lg bg-[#E2E8F0] flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 bg-[#E2E8F0] rounded w-1/3" />
              <div className="h-2.5 bg-[#F1F5F9] rounded w-1/2" />
            </div>
          </div>
          <div className="h-6 w-16 bg-[#E2E8F0] rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const FormSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-5 animate-pulse">
      <div className="h-5 bg-[#CBD5E1] rounded w-1/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-3 bg-[#E2E8F0] rounded w-20" />
          <div className="h-10 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-[#E2E8F0] rounded w-20" />
          <div className="h-10 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-[#E2E8F0] rounded w-28" />
        <div className="h-20 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <div className="h-9 w-20 bg-[#E2E8F0] rounded-lg" />
        <div className="h-9 w-28 bg-[#0D5C63]/30 rounded-lg" />
      </div>
    </div>
  );
};

export const PageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 bg-[#CBD5E1] rounded w-48" />
          <div className="h-3 bg-[#E2E8F0] rounded w-72" />
        </div>
        <div className="h-9 w-32 bg-[#0D5C63]/20 rounded-lg" />
      </div>
      <CardSkeleton count={3} />
      <ListSkeleton items={4} />
    </div>
  );
};
