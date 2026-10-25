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
      title: 'Wholesale B2B Billing',
      phase: 2,
      subtitle: 'Bulk orders, distributor discounting, credit terms, and multi-tier pricing',
      description:
        'Manage institutional pharmacy sales, bulk stock orders, and trade invoices with automated credit limit enforcement.',
      plannedFeatures: [
        'Multi-tier wholesale rate cards & volume discounts',
        'Customer credit limits & ledger balancing',
        'E-Way bill generation & B2B GST compliance',
        'Bulk order pick-list & dispatch manifests',
      ],
      icon: Boxes,
    },
    purchases: {
      title: 'Purchases & Goods Inwards',
      phase: 2,
      subtitle: 'Supplier purchase orders, inwards batch inspection, and vendor bills',
      description:
        'Streamline procurement with automated purchase order generation based on min/max inventory levels and FEFO batch reconciliation.',
      plannedFeatures: [
        'Automated reorder suggestion engine based on sales velocity',
        'Direct supplier invoice entry with GST & discount matching',
        'Batch creation & barcoding on goods inwards',
        'Supplier returns & debit notes management',
      ],
      icon: ShoppingBag,
    },
    sales_returns: {
      title: 'Sales & Returns Ledger',
      phase: 2,
      subtitle: 'Counter returns, credit notes, customer refund history, and replacement ledger',
      description:
        'Track all historical sales invoices, process customer medicine returns against original batch numbers, and issue credit vouchers.',
      plannedFeatures: [
        'Instant bill lookup by barcode or customer phone',
        'Batch verification for returned pharmaceutical items',
        'Automatic inventory restocking or quarantine routing',
        'Credit voucher & cash refund processing',
      ],
      icon: RotateCcw,
    },
    customers: {
      title: 'Customers & Chronic Care Management',
      phase: 2,
      subtitle: 'Patient profiles, chronic disease refill cycles, loyalty points, and credit accounts',
      description:
        'Maintain comprehensive patient records, track chronic medication refilling reminders, and manage customer credit ledgers.',
      plannedFeatures: [
        'Chronic patient refill scheduler & WhatsApp alert foundation',
        'Customer loyalty points earning & redemption rules',
        'Outstanding khata balance & payment receipt generation',
        'Prescription history archive with doctor tags',
      ],
      icon: Users,
    },
    suppliers: {
      title: 'Suppliers & Distributors Master',
      phase: 2,
      subtitle: 'Pharmaceutical distributors, drug license records, GSTIN, and payment terms',
      description:
        'Maintain complete distributor records, track payment schedules, drug licenses, and purchase volume histories.',
      plannedFeatures: [
        'Distributor drug license verification & expiry monitoring',
        'Credit period & payment milestone tracking',
        'Purchase volume analytics & rebate reconciliation',
        'Direct purchase order dispatch foundation',
      ],
      icon: Building2,
    },
    collections: {
      title: 'Collections & Receivables Aging',
      phase: 2,
      subtitle: 'Customer credit aging (0-30, 31-60, 60+ days), reminders, and receipts',
      description:
        'Monitor outstanding receivables across retail chronic accounts and wholesale buyers with automated aging buckets.',
      plannedFeatures: [
        'Aging analysis: 0-30, 31-60, 61-90, 90+ days breakdown',
        'Automated payment reminder notifications',
        'Multiple payment receipt logging (Cash, Cheque, NEFT, UPI)',
        'Customer statement of accounts PDF generation',
      ],
      icon: Wallet,
    },
    ecommerce: {
      title: 'E-commerce & Digital Storefront',
      phase: 4,
      subtitle: 'Online medicine catalog, consumer orders, delivery dispatch, and prescription uploads',
      description:
        'Direct-to-consumer pharmacy web store integrated seamlessly with live inventory and FEFO batch allocation.',
      plannedFeatures: [
        'Real-time inventory synchronization with web store',
        'Digital prescription upload & pharmacist verification flow',
        'Delivery boy dispatch & route tracking foundation',
        'Customer order status notifications',
      ],
      icon: Globe,
    },
    reports: {
      title: 'Analytics & Financial Reports',
      phase: 2,
      subtitle: 'Profit & loss, sales analysis, fast/slow moving items, and doctor wise sales',
      description:
        'Generate deep operational insights, sales breakdowns by department, margins by salt, and doctor referral reports.',
      plannedFeatures: [
        'Daily, weekly, and monthly P&L financial summaries',
        'Fast-moving vs non-moving inventory dead-stock report',
        'Prescription doctor referral sales analysis',
        'Tax & GST audit reports with 1-click export',
      ],
      icon: BarChart3,
    },
    gst_accounts: {
      title: 'GST Filings & Financial Accounts',
      phase: 2,
      subtitle: 'GSTR-1, GSTR-3B summaries, HSN summary, and Day Book reconciliation',
      description:
        'Pharmacy-specific GST calculation, HSN-wise tax breakdowns, and end-of-day register reconciliation.',
      plannedFeatures: [
        'GSTR-1 ready JSON/CSV export with B2B & B2C breakdown',
        'HSN summary table with 5%, 12%, 18% tax distribution',
        'Daily cashier register variance & shift day book closing',
        'Bank deposit tracking & ledger integration',
      ],
      icon: ReceiptText,
    },
    tasks: {
      title: 'Pharmacy Tasks & Daily Checklists',
      phase: 2,
      subtitle: 'Temperature logs, cleaning checklists, shift handovers, and compliance audits',
      description:
        'Track statutory pharmacy compliance requirements, daily cold-chain temperature recordings, and staff shift checklists.',
      plannedFeatures: [
        'Refrigerator temperature log (2°C - 8°C twice daily)',
        'Controlled drug register physical verification logs',
        'Shift handover cash count & pending orders checklist',
        'Statutory drug inspector audit readiness checklist',
      ],
      icon: CheckSquare,
    },
    settings: {
      title: 'Pharmacy System Settings',
      phase: 2,
      subtitle: 'Store branches, drug licenses, print templates, invoice series, and user roles',
      description:
        'Configure your pharmacy operating entities, billing serial numbers, thermal printer templates, and staff permission matrices.',
      plannedFeatures: [
        'Branch configuration & multi-store inventory routing',
        'Drug License (DL 20B/21B) & FSSAI registration profile',
        'Thermal receipt (2-inch, 3-inch, A4, A5) design templates',
        'Role-based access control (Pharmacist, Cashier, Store Manager, Owner)',
      ],
      icon: Settings,
    },
  };

  const config = moduleConfigs[moduleId] || {
    title: 'Operational Module',
    phase: 2,
    subtitle: 'Scheduled in Vetrify roadmap',
    description: 'This operational module is part of the next implementation phase.',
    plannedFeatures: ['Core data tables', 'Role access control', 'Export utilities'],
    icon: Lock,
  };

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-xs font-bold border border-[#FCD34D]">
            Phase {config.phase} Roadmap
          </span>
        }
        primaryAction={
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigateToActive('dashboard')}
          >
            Back to Active Dashboard
          </Button>
        }
      />

      {/* Blueprint Architecture Card */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-xs max-w-4xl mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0D5C63]/10 text-[#0D5C63] flex items-center justify-center mx-auto shadow-xs">
          <Icon className="w-8 h-8" />
        </div>

        <div className="max-w-xl mx-auto">
          <h3 className="text-xl font-extrabold text-[#0B1F33]">{config.title}</h3>
          <p className="text-xs text-[#64748B] mt-2 leading-relaxed">{config.description}</p>
        </div>

        {/* Planned Capabilities Grid */}
        <div className="pt-4 border-t border-[#F1F5F9] text-left">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Planned Pharmaceutical Features for Phase {config.phase}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {config.plannedFeatures.map((feat, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-start gap-2.5 text-xs text-[#0B1F33]"
              >
                <ShieldCheck className="w-4 h-4 text-[#2FA36A] flex-shrink-0 mt-0.5" />
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Nav Action */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => onNavigateToActive('inventory')}
          >
            Explore Inventory Master
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => onNavigateToActive('pos')}
          >
            Open Retail POS
          </Button>
        </div>
      </div>
    </div>
  );
};
