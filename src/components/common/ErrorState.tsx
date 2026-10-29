import React from 'react';
import { AlertOctagon, WifiOff, ShieldX, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface ErrorStateProps {
  type?: 'load_failed' | 'network' | 'permission' | 'generic';
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  type = 'load_failed',
  title,
  message,
  onRetry,
  className = '',
}) => {
  const configs = {
    load_failed: {
      icon: AlertOctagon,
      defaultTitle: 'Unable to load workspace data',
      defaultMsg: 'There was a temporary problem retrieving the records. Please try again.',
      color: 'text-[#EF4444] bg-[#FEE2E2]',
    },
    network: {
      icon: WifiOff,
      defaultTitle: 'Connection Interrupted',
      defaultMsg: 'Your device is currently offline or experiencing unstable network connectivity.',
      color: 'text-[#F59E0B] bg-[#FEF3C7]',
    },
    permission: {
      icon: ShieldX,
      defaultTitle: 'Permission Denied',
      defaultMsg: 'Your current user role does not have authorization to access this operational module.',
      color: 'text-[#64748B] bg-[#F1F5F9]',
    },
    generic: {
      icon: AlertOctagon,
      defaultTitle: 'Something went wrong',
      defaultMsg: 'An unexpected application state occurred. The error has been logged for review.',
      color: 'text-[#EF4444] bg-[#FEE2E2]',
    },
  };

  const current = configs[type] || configs.generic;
  const Icon = current.icon;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-8 bg-white rounded-2xl border border-[#FCA5A5] shadow-xs ${className}`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${current.color}`}>
        <Icon className="w-7 h-7" />
      </div>

      <h4 className="text-base font-bold text-[#0B1F33] mb-1.5">{title || current.defaultTitle}</h4>
      <p className="text-xs text-[#64748B] leading-relaxed mb-5 max-w-xs">{message || current.defaultMsg}</p>

      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};
