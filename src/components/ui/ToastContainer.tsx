import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { ToastMessage } from '../../types/foundation';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  const getToastIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#2FA36A] flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-[#38BDF8] animate-spin flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-[#38BDF8] flex-shrink-0" />;
    }
  };

  const getToastBorder = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'border-l-4 border-l-[#2FA36A]';
      case 'error':
        return 'border-l-4 border-l-[#EF4444]';
      case 'warning':
        return 'border-l-4 border-l-[#F59E0B]';
      default:
        return 'border-l-4 border-l-[#38BDF8]';
    }
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 bg-[#0B1F33] text-white border border-[#183654] ${getToastBorder(
            toast.type
          )} rounded-xl shadow-2xl transition-all transform translate-y-0 animate-in fade-in slide-in-from-bottom-2`}
        >
          {getToastIcon(toast.type)}

          <div className="flex-1 min-w-0 space-y-0.5">
            {toast.title && <h5 className="text-xs font-bold text-white">{toast.title}</h5>}
            <p className="text-xs text-[#CBD5E1] leading-relaxed">{toast.message}</p>
            {toast.action && (
              <button
                onClick={() => {
                  toast.action?.onClick();
                  dismissToast(toast.id);
                }}
                className="mt-1.5 text-xs font-bold text-[#38BDF8] hover:underline cursor-pointer"
              >
                {toast.action.label}
              </button>
            )}
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#183654] transition-colors cursor-pointer flex-shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
