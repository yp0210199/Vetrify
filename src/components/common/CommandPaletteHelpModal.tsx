import React, { useState } from 'react';
import {
  Command,
  HelpCircle,
  Keyboard,
  Zap,
  BookOpen,
  Store,
  Package,
  Warehouse,
  ArrowLeftRight,
  ShieldCheck,
  ReceiptText,
  Search,
  Settings,
  X,
  ExternalLink,
  ThermometerSnowflake,
  FileCheck2,
  Users,
  CheckCircle2,
  CornerDownLeft,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { NavModuleId } from '../../types';

interface CommandPaletteHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: NavModuleId) => void;
  onOpenSearch: () => void;
}

export const CommandPaletteHelpModal: React.FC<CommandPaletteHelpModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onOpenSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'commands' | 'shortcuts' | 'guide'>('commands');
  const [searchFilter, setSearchFilter] = useState('');

  const quickCommands = [
    {
      id: 'pos',
      label: 'Open Retail POS Billing',
      desc: 'Instant counter billing, batch barcode scan & thermal receipt print',
      icon: Store,
      hotkey: 'F1',
      category: 'Billing',
      action: () => {
        onNavigate('pos');
        onClose();
      },
    },
    {
      id: 'search',
      label: 'Universal Global Search',
      desc: 'Instant lookup across medicines, batches, customers, invoices & tasks',
      icon: Search,
      hotkey: 'Ctrl + K',
      category: 'Search',
      action: () => {
        onClose();
        onOpenSearch();
      },
    },
    {
      id: 'inventory',
      label: 'Inventory & Batch Master',
      desc: 'Manage pharmaceutical catalog, MRPs, batch expiries and stock levels',
      icon: Package,
      hotkey: 'Alt + 2',
      category: 'Inventory',
      action: () => {
        onNavigate('inventory');
        onClose();
      },
    },
    {
      id: 'warehouses',
      label: 'Warehouses & Supply Hubs',
      desc: 'Central depot hubs, warehouse storage zones & stock tracking',
      icon: Warehouse,
      hotkey: 'Alt + 3',
      category: 'Logistics',
      action: () => {
        onNavigate('warehouses');
        onClose();
      },
    },
    {
      id: 'transfers',
      label: 'Inter-Branch Stock Transfers',
      desc: 'Transfer stock between pharmacy branches and centralized warehouses',
      icon: ArrowLeftRight,
      hotkey: 'Alt + 4',
      category: 'Logistics',
      action: () => {
        onNavigate('transfers');
        onClose();
      },
    },
    {
      id: 'gst',
      label: 'GST & Financial Accounts',
      desc: 'GST tax reports, HSN breakdown, GSTR-1 preparation and ledgers',
      icon: ReceiptText,
      hotkey: 'Alt + 5',
      category: 'Compliance',
      action: () => {
        onNavigate('gst_accounts');
        onClose();
      },
    },
    {
      id: 'compliance',
      label: 'Schedule H1 & Drug Compliance',
      desc: 'Schedule H/H1 registers, doctor prescriptions & regulatory audits',
      icon: ShieldCheck,
      hotkey: 'Alt + 6',
      category: 'Compliance',
      action: () => {
        onNavigate('compliance');
        onClose();
      },
    },
    {
      id: 'settings',
      label: 'Organization & Staff Settings',
      desc: 'Manage pharmacy branches, staff roles, security and system ledger',
      icon: Settings,
      hotkey: 'Alt + S',
      category: 'System',
      action: () => {
        onNavigate('settings');
        onClose();
      },
    },
  ];

  const shortcutsList = [
    {
      group: 'Core Navigation & Search',
      items: [
        { label: 'Universal Quick Search', keys: ['Ctrl', 'K'] },
        { label: 'Command Palette & Help Guide', keys: ['Ctrl', '/'] },
        { label: 'Instant Retail POS Counter', keys: ['F1'] },
        { label: 'Close Active Modal / Window', keys: ['Esc'] },
      ],
    },
    {
      group: 'Operational Views',
      items: [
        { label: 'Main Overview Dashboard', keys: ['Alt', '1'] },
        { label: 'Inventory & Stock Catalog', keys: ['Alt', '2'] },
        { label: 'Warehouses & Central Hubs', keys: ['Alt', '3'] },
        { label: 'Inter-Branch Stock Transfers', keys: ['Alt', '4'] },
        { label: 'GST Reports & Ledgers', keys: ['Alt', '5'] },
        { label: 'Organization & Staff Settings', keys: ['Alt', 'S'] },
      ],
    },
    {
      group: 'POS Counter Shortcuts',
      items: [
        { label: 'Focus Medicine Search Input', keys: ['F2'] },
        { label: 'Select Customer / Patient', keys: ['F4'] },
        { label: 'Apply Bill Discount', keys: ['F7'] },
        { label: 'Complete Cash / UPI Checkout', keys: ['F9'] },
        { label: 'Print Last Thermal Invoice', keys: ['Ctrl', 'P'] },
      ],
    },
  ];

  const filteredCommands = quickCommands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cmd.desc.toLowerCase().includes(searchFilter.toLowerCase()) ||
      cmd.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Command Palette & System Help"
      subtitle="Operational shortcuts, fast actions, and pharmaceutical guidelines"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Vetrify Suite v2.4</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setActiveTab('commands')}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'commands'
                ? 'bg-white text-[#0D5C63] shadow-xs'
                : 'text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Quick Actions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'shortcuts'
                ? 'bg-white text-[#0D5C63] shadow-xs'
                : 'text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keyboard Shortcuts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-[#0D5C63] shadow-xs'
                : 'text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Compliance Guide</span>
          </button>
        </div>

        {/* Tab 1: Quick Actions & Commands */}
        {activeTab === 'commands' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter quick commands..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0B1F33] focus:border-[#0D5C63] outline-none transition-all placeholder:text-[#94A3B8]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={cmd.action}
                    className="p-3 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#0D5C63]/50 rounded-xl flex items-start gap-3 text-left transition-all group cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#E6F4F1] text-[#0D5C63] group-hover:bg-[#0D5C63] group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold text-[#0B1F33] group-hover:text-[#0D5C63] truncate">
                          {cmd.label}
                        </span>
                        <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-[#F1F5F9] text-[#64748B] rounded border border-[#CBD5E1] flex-shrink-0">
                          {cmd.hotkey}
                        </kbd>
                      </div>
                      <p className="text-[11px] text-[#64748B] line-clamp-2 mt-0.5 leading-snug">
                        {cmd.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Keyboard Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {shortcutsList.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="text-xs font-bold text-[#0B1F33] uppercase tracking-wider text-[11px] text-[#64748B]">
                  {sec.group}
                </h4>
                <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
                  {sec.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 text-xs">
                      <span className="text-[#334155] font-medium">{item.label}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="px-2 py-0.5 text-[10px] font-bold font-mono text-[#0B1F33] bg-white border border-[#CBD5E1] rounded shadow-2xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Compliance & Help Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
            {/* Drug License & Schedule Notice */}
            <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl flex items-start gap-3 text-[#1E40AF]">
              <FileCheck2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#2563EB]" />
              <div>
                <p className="font-bold text-xs">Drug License Compliance (Form 20B & 21B)</p>
                <p className="text-[11px] text-[#1D4ED8] mt-0.5 leading-relaxed">
                  All Schedule H and H1 medicines must be dispensed against valid registered doctor prescriptions. 
                  The patient details, prescriber registration number, and dispensing batch numbers are auto-logged to the regulatory register.
                </p>
              </div>
            </div>

            {/* Cold Chain Storage */}
            <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl flex items-start gap-3 text-[#065F46]">
              <ThermometerSnowflake className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#059669]" />
              <div>
                <p className="font-bold text-xs">Cold Chain Temperature Guidelines</p>
                <p className="text-[11px] text-[#047857] mt-0.5 leading-relaxed">
                  Vaccines, insulins, and biologic serums require uninterrupted temperature monitoring:
                  Standard Cold Chain (+2°C to +8°C) and Deep Freeze (-20°C). Any excursions trigger immediate alerts.
                </p>
              </div>
            </div>

            {/* GST & Invoicing */}
            <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-start gap-3 text-[#92400E]">
              <ReceiptText className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#D97706]" />
              <div>
                <p className="font-bold text-xs">GST Rates & HSN Coding</p>
                <p className="text-[11px] text-[#B45309] mt-0.5 leading-relaxed">
                  Pharmaceutical formulations typically fall under HSN 3004 with 5% or 12% GST brackets. 
                  E-Way bills are mandatory for inter-state consignment movements exceeding ₹50,000.
                </p>
              </div>
            </div>

            {/* Multi-Tenant Security */}
            <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start gap-3 text-[#475569]">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#0D5C63]" />
              <div>
                <p className="font-bold text-xs text-[#0B1F33]">Data Segregation & Store Isolation</p>
                <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">
                  All inventory batches, patient billing ledgers, and staff permission matrices are strictly segregated 
                  by Organization and Store Branch context with real-time cloud synchronization.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
