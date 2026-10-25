import React from 'react';
import { StatusVariant } from '../../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock, XCircle, FileText, RefreshCw } from 'lucide-react';

interface BadgeProps {
  status?: StatusVariant;
  variant?: 'solid' | 'subtle' | 'outline';
  label?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status = 'active',
  variant = 'subtle',
  label,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const statusConfig: Record<
    StatusVariant,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    active: { label: 'Active', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#86EFAC]', icon: CheckCircle2 },
    inactive: { label: 'Inactive', bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', border: 'border-[#CBD5E1]', icon: Clock },
    in_stock: { label: 'In Stock', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#86EFAC]', icon: CheckCircle2 },
    low_stock: { label: 'Low Stock', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', border: 'border-[#FCD34D]', icon: AlertTriangle },
    out_of_stock: { label: 'Out of Stock', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', border: 'border-[#FCA5A5]', icon: XCircle },
    near_expiry: { label: 'Near Expiry', bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]', border: 'border-[#FDBA74]', icon: AlertTriangle },
    expired: { label: 'Expired', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', border: 'border-[#FCA5A5]', icon: AlertCircle },
    paid: { label: 'Paid', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#86EFAC]', icon: CheckCircle2 },
    pending: { label: 'Pending', bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', border: 'border-[#FCD34D]', icon: Clock },
    failed: { label: 'Failed', bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', border: 'border-[#FCA5A5]', icon: XCircle },
    completed: { label: 'Completed', bg: 'bg-[#DCFCE7]', text: 'text-[#15803D]', border: 'border-[#86EFAC]', icon: CheckCircle2 },
    draft: { label: 'Draft', bg: 'bg-[#F1F5F9]', text: 'text-[#475569]', border: 'border-[#CBD5E1]', icon: FileText },
    cancelled: { label: 'Cancelled', bg: 'bg-[#F1F5F9]', text: 'text-[#64748B]', border: 'border-[#CBD5E1]', icon: XCircle },
    returned: { label: 'Returned', bg: 'bg-[#E0E7FF]', text: 'text-[#4338CA]', border: 'border-[#A5B4FC]', icon: RefreshCw },
  };

  const current = statusConfig[status] || statusConfig.active;
  const displayLabel = label || current.label;
  const IconComponent = current.icon;

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border whitespace-nowrap select-none transition-colors ${current.bg} ${current.text} ${current.border} ${sizeClasses} ${className}`}
    >
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3 flex-shrink-0' : 'w-3.5 h-3.5 flex-shrink-0'} />}
      <span>{displayLabel}</span>
    </span>
  );
};
