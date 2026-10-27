import React from 'react';
import {
  Boxes,
  ShoppingBag,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  Globe,
  BarChart3,
  ReceiptText,
  CheckSquare,
  Settings,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { NavModuleId } from '../types';

interface FutureModuleViewProps {
  moduleId: NavModuleId;
  onNavigateToActive: (id: NavModuleId) => void;
}

export const FutureModuleView: React.FC<FutureModuleViewProps> = ({
  moduleId,
  onNavigateToActive,
}) => {
  const moduleConfigs: Record<
    string,
    {
      title: string;
      phase: number;
      subtitle: string;
      description: string;
      plannedFeatures: string[];
      icon: any;
    }
  > = {
    wholesale: {
      title: 'Wholesale B2B Billing & Builder Credit',
      phase: 2,
      subtitle: 'Bulk tile orders, contractor discounting, credit terms, and multi-tier project pricing',
      description:
        'Manage institutional builder orders, bulk vitrified slab shipments, and commercial trade invoices with automated credit limit enforcement.',
      plannedFeatures: [
        'Multi-tier wholesale rate cards & volume slab discounts',
        'Builder & contractor credit limits & ledger balancing',
        'E-Way bill generation & B2B Ceramic GST compliance',
        'Bulk order pick-list & yard dispatch manifests',
      ],
      icon: Boxes,
    },
    purchases: {
      title: 'Purchases & Yard Inwards',
      phase: 2,
      subtitle: 'Factory purchase orders, container inwards inspection, and vendor bills',
      description:
        'Streamline procurement with automated purchase order generation based on min/max tile inventory levels and shade/lot reconciliation.',
      plannedFeatures: [
        'Automated reorder suggestion engine based on tile sales velocity',
        'Direct factory invoice entry with GST & freight matching',
        'Shade/Lot creation & box barcoding on goods inwards',
        'Supplier returns & transit damage debit notes management',
      ],
      icon: ShoppingBag,
    },
    sales_returns: {
      title: 'Sales & Returns Ledger',
      phase: 2,
      subtitle: 'Showroom returns, credit notes, customer refund history, and tile replacement ledger',
      description:
        'Track all historical sales invoices, process customer box returns against original shade/lot numbers, and issue credit vouchers.',
      plannedFeatures: [
        'Instant bill lookup by barcode, invoice number or customer phone',
        'Shade & Lot verification for returned ceramic items',
        'Automatic yard restocking or breakage routing',
        'Credit voucher & cash refund processing',
      ],
      icon: RotateCcw,
    },
    customers: {
      title: 'Customers, Builders & Project Khata',
      phase: 2,
      subtitle: 'Architect profiles, homeowner project khata, loyalty points, and credit accounts',
      description:
        'Maintain comprehensive contractor records, track site delivery schedules, and manage builder credit ledgers.',
      plannedFeatures: [
        'Project Khata ledger & WhatsApp payment alert foundation',
        'Architect & Plumber referral commission tracking',
        'Outstanding site balance & payment receipt generation',
        'Quotations and estimate history archive with site tags',
      ],
      icon: Users,
    },
    suppliers: {
      title: 'Suppliers & Tile Manufacturers Master',
      phase: 2,
      subtitle: 'Ceramic manufacturers, factory GSTIN, freight agreements, and payment terms',
      description:
        'Maintain complete manufacturer records, track freight schedules, factory GSTINs, and purchase volume histories.',
      plannedFeatures: [
        'Tile factory GSTIN verification & credit period monitoring',
        'Freight & Hamali loading charge agreement tracking',
        'Purchase volume analytics & tile rebate reconciliation',
        'Direct factory purchase order dispatch foundation',
      ],
      icon: Building2,
    },
    collections: {
      title: 'Collections & Receivables Aging',
      phase: 2,
      subtitle: 'Builder credit aging (0-30, 31-60, 60+ days), site reminders, and receipts',
      description:
        'Monitor outstanding receivables across retail homeowners and wholesale project contractors with automated aging buckets.',
      plannedFeatures: [
        'Aging analysis: 0-30, 31-60, 61-90, 90+ days breakdown',
        'Automated payment reminder notifications for construction sites',
        'Multiple payment receipt logging (Cash, Cheque, NEFT, UPI)',
        'Customer statement of accounts PDF generation for builders',
      ],
      icon: Wallet,
    },
    ecommerce: {
      title: 'E-commerce & Digital Tile Storefront',
      phase: 4,
      subtitle: 'Online tile catalog, room visualizer preview, consumer orders, and yard dispatch',
      description:
        'Direct-to-consumer showroom web store integrated seamlessly with live godown inventory and shade allocation.',
      plannedFeatures: [
        'Real-time inventory synchronization with web catalog',
        'Digital room area & box coverage calculator flow',
        'Tempo / truck loading dispatch & route tracking foundation',
        'Customer site delivery status notifications',
      ],
      icon: Globe,
    },
    reports: {
      title: 'Analytics & Tile Financial Reports',
      phase: 2,
      subtitle: 'Profit & loss, sales analysis, fast/slow moving shades, and architect wise sales',
      description:
        'Generate deep operational insights, sales breakdowns by tile category, gross margins per sq. ft, and architect referral reports.',
      plannedFeatures: [
        'Daily, weekly, and monthly P&L financial summaries',
        'Fast-moving vs non-moving slab inventory report',
        'Architect & interior designer referral sales analysis',
        'Tax & GST audit reports with 1-click export',
      ],
      icon: BarChart3,
    },
    gst_accounts: {
      title: 'GST Filings & Financial Accounts',
      phase: 2,
      subtitle: 'GSTR-1, GSTR-3B summaries, HSN 6907 summary, and Day Book reconciliation',
      description:
        'Ceramic-specific GST calculation, HSN-wise tax breakdowns, and end-of-day register reconciliation.',
      plannedFeatures: [
        'GSTR-1 ready JSON/CSV export with B2B & B2C breakdown',
        'HSN summary table with 18% (Tiles/Sanitary) tax distribution',
        'Daily cashier register variance & shift day book closing',
        'Bank deposit tracking & ledger integration',
      ],
      icon: ReceiptText,
    },
    tasks: {
      title: 'Yard Tasks & Daily Checklists',
      phase: 2,
      subtitle: 'Godown loading logs, breakage audits, shift handovers, and site delivery checklists',
      description:
        'Track yard operations, truck loading safety recordings, and godown staff shift checklists.',
      plannedFeatures: [
        'Daily yard loading gate pass audit logs',
        'Transit breakage & damaged box physical verification logs',
        'Shift handover cash count & pending site deliveries',
        'Yard inventory audit readiness checklist',
      ],
      icon: CheckSquare,
    },
    settings: {
      title: 'Vetrify ERP System Settings',
      phase: 2,
      subtitle: 'Showroom branches, godowns, print templates, invoice series, and user roles',
      description:
        'Configure your ceramic operating entities, billing serial numbers, tax invoice templates, and staff permission matrices.',
      plannedFeatures: [
        'Branch & Godown yard configuration with inter-yard routing',
        'GSTIN & statutory business registration profiles',
        'Invoice & Yard Gate Pass print design templates',
        'Role-based access control (Showroom Salesman, Yard Manager, Accountant, Owner)',
      ],
      icon: Settings,
    },
  };

  const config = moduleConfigs[moduleId] || {
    title: 'Operational Module',
    phase: 2,
    subtitle: 'Advanced ERP capability currently under phased deployment',
    description:
      'This feature is scheduled in the Vetrify roadmap for multi-branch sync and yard logistics.',
    plannedFeatures: [
      'Multi-branch state synchronization',
      'Advanced audit trails and event streaming',
      'Role-based granular access control',
      'Export to Excel / PDF reporting suite',
    ],
    icon: Sparkles,
  };

  const IconComponent = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
            <Lock className="w-3 h-3 text-amber-600" /> Phase {config.phase} Roadmap
          </span>
        }
        primaryAction={
          <Button
            variant="primary"
            size="md"
            icon={ArrowRight}
            onClick={() => onNavigateToActive('pos')}
          >
            Go to Showroom POS Billing
          </Button>
        }
      />

      {/* Main Roadmap Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-2xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center shrink-0">
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#0B1F33]">{config.title}</h3>
            <p className="text-xs text-[#475569] mt-1 leading-relaxed max-w-2xl">{config.description}</p>
          </div>
        </div>

        {/* Planned Features List */}
        <div>
          <h4 className="text-xs font-extrabold text-[#0B1F33] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#0D5C63]" /> Core Vetrify ERP Features in Development
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.plannedFeatures.map((feature, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-[#0D5C63] shrink-0" />
                <span className="text-xs font-semibold text-[#334155]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#E6F4F1]/60 border border-[#0D5C63]/20 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-[#0D5C63]">
            <Sparkles className="w-4 h-4" />
            <span>Showroom Billing POS, Room Coverage Calculator, and Yard Gate Pass are live!</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToActive('inventory')}
          >
            Open Tile Catalog
          </Button>
        </div>
      </div>
    </div>
  );
};
