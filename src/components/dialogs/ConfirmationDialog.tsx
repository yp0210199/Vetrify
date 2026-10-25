import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';

export type ConfirmationVariant = 'danger' | 'warning' | 'info';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  isLoading?: boolean;
  requireTextConfirm?: string; // Optional text match requirement (e.g., "DELETE")
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  isLoading = false,
  requireTextConfirm,
}) => {
  const [inputText, setInputText] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) {
      setInputText('');
    }
  }, [isOpen]);

  const isConfirmDisabled = isLoading || (requireTextConfirm ? inputText.trim() !== requireTextConfirm : false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-6 h-6 text-[#EF4444]" />,
          iconBg: 'bg-[#EF4444]/10 border-[#EF4444]/20',
          confirmBtnVariant: 'primary' as const,
          confirmBtnClass: 'bg-[#EF4444] text-white hover:bg-[#DC2626]',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />,
          iconBg: 'bg-[#F59E0B]/10 border-[#F59E0B]/20',
          confirmBtnVariant: 'primary' as const,
          confirmBtnClass: 'bg-[#F59E0B] text-white hover:bg-[#D97706]',
        };
      default:
        return {
          icon: <Info className="w-6 h-6 text-[#0D5C63]" />,
          iconBg: 'bg-[#E6F4F1] border-[#0D5C63]/20',
          confirmBtnVariant: 'primary' as const,
          confirmBtnClass: 'bg-[#0D5C63] text-white hover:bg-[#09484E]',
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoading && onClose()}
      title={title}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${vStyles.confirmBtnClass}`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${vStyles.iconBg}`}>
            {vStyles.icon}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>
          </div>
        </div>

        {requireTextConfirm && (
          <div className="space-y-1.5 pt-2 border-t border-[#F1F5F9]">
            <p className="text-[11px] font-medium text-[#64748B]">
              Type <span className="font-bold text-[#0B1F33] select-all">{requireTextConfirm}</span> to confirm:
            </p>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={requireTextConfirm}
              className="w-full px-3 py-2 rounded-lg bg-[#F8FAFC] border border-[#CBD5E1] text-xs font-bold text-[#0B1F33] focus:outline-none focus:border-[#0D5C63]"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
