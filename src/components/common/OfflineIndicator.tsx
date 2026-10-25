import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

interface OfflineIndicatorProps {
  status?: 'online' | 'offline' | 'syncing';
  pendingTransactionsCount?: number;
  onSyncNow?: () => void;
  compact?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  status = 'online',
  pendingTransactionsCount = 0,
  onSyncNow,
  compact = false,
}) => {
  if (status === 'online') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold border border-[#86EFAC]/50">
        <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
        <span>Online</span>
      </div>
    );
  }

  if (status === 'syncing') {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[11px] font-bold border border-[#93C5FD]">
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>Syncing Data...</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] text-xs font-bold border border-[#FCD34D] shadow-xs">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode</span>
      {pendingTransactionsCount > 0 && (
        <span className="px-1.5 py-0.2 bg-[#B45309] text-white rounded text-[10px]">
          {pendingTransactionsCount} queued
        </span>
      )}
      {onSyncNow && (
        <button
          onClick={onSyncNow}
          className="ml-1 underline hover:text-[#78350F] cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
};
