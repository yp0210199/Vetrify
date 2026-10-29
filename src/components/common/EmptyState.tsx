import React from 'react';
import {
  PackageSearch,
  ShoppingCart,
  Users,
  Building2,
  Bell,
  Search,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';

export type EmptyStateType =
  | 'products'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'suppliers'
  | 'notifications'
  | 'search'
  | 'purchases'
  | 'batches'
  | 'staff'
  | 'stores'
  | 'permissions'
  | 'generic';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'products',
  title,
  description,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon: CustomIcon,
  className = '',
}) => {
  const configs: Record<
    EmptyStateType,
    { icon: LucideIcon; defaultTitle: string; defaultDesc: string; defaultAction?: string }
  > = {
    products: {
      icon: PackageSearch,
      defaultTitle: 'No products in catalog yet',
      defaultDesc: 'Add your first tile, slab, sanitaryware, or CP faucet catalog item to get started.',
      defaultAction: 'Add Product',
    },
    inventory: {
      icon: FileSpreadsheet,
      defaultTitle: 'No inventory stock found',
      defaultDesc: 'Receive a purchase invoice or add opening stock to track lot quantities, tone, and caliber.',
      defaultAction: 'Receive Purchase',
    },
    sales: {
      icon: ShoppingCart,
      defaultTitle: 'No sales recorded today',
      defaultDesc: 'Start a new showroom billing sale in the POS or scan a tile barcode.',
      defaultAction: 'Open Showroom POS',
    },
    customers: {
      icon: Users,
      defaultTitle: 'No customer records yet',
      defaultDesc: 'Register retail clients, architects, and building contractors to track project estimates and credit history.',
      defaultAction: 'Add Customer',
    },
    suppliers: {
      icon: Building2,
      defaultTitle: 'No registered suppliers or manufacturers',
      defaultDesc: 'Add tile manufacturers, sanitary brands, and chemical distributors to manage purchase orders.',
      defaultAction: 'Add Supplier',
    },
    notifications: {
      icon: Bell,
      defaultTitle: 'All caught up!',
      defaultDesc: 'No urgent breakage alerts, inventory shortages, or pending tasks at this moment.',
    },
    search: {
      icon: Search,
      defaultTitle: 'No matching records found',
      defaultDesc: 'Check your search spelling, brand name, dimensions, or try searching by shade lot/barcode.',
    },
    purchases: {
      icon: Receipt,
      defaultTitle: 'No purchase invoices received',
      defaultDesc: 'Record your supplier deliveries and inwards stock ledger with tax breakdown.',
      defaultAction: 'New Purchase Inward',
    },
    batches: {
      icon: PackageSearch,
      defaultTitle: 'No active lots for this product',
      defaultDesc: 'This product currently has 0 active stock lots registered in this showroom/godown.',
    },
    staff: {
      icon: Users,
      defaultTitle: 'No team members added yet',
      defaultDesc: 'Invite sales staff, cashiers, and godown managers to join your business workspace.',
      defaultAction: 'Invite Staff',
    },
    stores: {
      icon: Building2,
      defaultTitle: 'No showroom or godown branches assigned',
      defaultDesc: 'Contact your administrator or create a showroom or godown branch.',
    },
    permissions: {
      icon: AlertCircle,
      defaultTitle: 'Access Restricted',
      defaultDesc: 'You do not have permission to view or manage this module.',
    },
    generic: {
      icon: AlertCircle,
      defaultTitle: 'No records available',
      defaultDesc: 'There is no data to display in this view yet.',
    },
  };

  const currentConfig = configs[type] || configs.generic;
  const Icon = CustomIcon || currentConfig.icon;
  const displayTitle = title || currentConfig.defaultTitle;
  const displayDesc = description || currentConfig.defaultDesc;
  const actionLabel = primaryActionLabel || currentConfig.defaultAction;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-6 bg-white rounded-2xl border border-dashed border-[#CBD5E1] shadow-2xs ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <h4 className="text-base font-bold text-[#0B1F33] tracking-tight mb-1.5">{displayTitle}</h4>
      <p className="text-xs text-[#64748B] leading-relaxed mb-5 max-w-xs">{displayDesc}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2.5">
          {actionLabel && onPrimaryAction && (
            <Button variant="primary" size="sm" onClick={onPrimaryAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
