import React, { useState } from 'react';
import {
  X,
  Users,
  Search,
  Plus,
  Building,
  Phone,
  Mail,
  Percent,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  FileText,
  Wallet,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { ArchitectPartner } from '../../types';
import { safeToFixed } from '../../lib/formatting/formatters';

interface ArchitectCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  partners: ArchitectPartner[];
  onAddPartner: (partner: Omit<ArchitectPartner, 'id' | 'totalBusinessDriven' | 'totalCommissionAccrued' | 'totalCommissionPaid' | 'pendingBalance'>) => void;
  onRecordPayout: (partnerId: string, amount: number, notes?: string) => void;
  onSelectPartnerForSale?: (partner: ArchitectPartner) => void;
}

export const INITIAL_ARCHITECT_PARTNERS: ArchitectPartner[] = [
  {
    id: 'arch_01',
    name: 'Ar. Rajesh Sharma',
    firmName: 'Studio Design & Architecture',
    phone: '+91 98220 12345',
    email: 'rajesh@studiodesign.in',
    role: 'Architect',
    defaultCommissionPercent: 8,
    totalBusinessDriven: 485000,
    totalCommissionAccrued: 38800,
    totalCommissionPaid: 30000,
    pendingBalance: 8800,
    status: 'active',
  },
  {
    id: 'arch_02',
    name: 'Pooja Varma',
    firmName: 'Interiors by Pooja',
    phone: '+91 98221 67890',
    email: 'pooja@poojainteriors.com',
    role: 'Interior Designer',
    defaultCommissionPercent: 10,
    totalBusinessDriven: 320000,
    totalCommissionAccrued: 32000,
    totalCommissionPaid: 25000,
    pendingBalance: 7000,
    status: 'active',
  },
  {
    id: 'arch_03',
    name: 'Suresh Mistri & Sons',
    firmName: 'Shree Ram Tile Contractors',
    phone: '+91 98450 44321',
    role: 'Tile Mason / Mistri',
    defaultCommissionPercent: 5,
    totalBusinessDriven: 175000,
    totalCommissionAccrued: 8750,
    totalCommissionPaid: 8000,
    pendingBalance: 750,
    status: 'active',
  },
  {
    id: 'arch_04',
    name: 'Vikram Mehta',
    firmName: 'Mehta Civil & Infrastructure',
    phone: '+91 98900 99887',
    email: 'vikram@mehtacivil.com',
    role: 'Civil Contractor',
    defaultCommissionPercent: 6,
    totalBusinessDriven: 620000,
    totalCommissionAccrued: 37200,
    totalCommissionPaid: 20000,
    pendingBalance: 17200,
    status: 'active',
  },
];

export const ArchitectCommissionModal: React.FC<ArchitectCommissionModalProps> = ({
  isOpen,
  onClose,
  partners,
  onAddPartner,
  onRecordPayout,
  onSelectPartnerForSale,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [selectedPartnerForPayout, setSelectedPartnerForPayout] = useState<ArchitectPartner | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  // New Partner Form State
  const [newName, setNewName] = useState('');
  const [newFirmName, setNewFirmName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<ArchitectPartner['role']>('Architect');
  const [newCommissionPercent, setNewCommissionPercent] = useState('8');

  if (!isOpen) return null;

  const filteredPartners = partners.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.firmName && p.firmName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.phone.includes(searchQuery);
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totals = partners.reduce(
    (acc, p) => ({
      totalBusiness: acc.totalBusiness + p.totalBusinessDriven,
      totalCommissionAccrued: acc.totalCommissionAccrued + p.totalCommissionAccrued,
      totalPaid: acc.totalPaid + p.totalCommissionPaid,
      totalPending: acc.totalPending + p.pendingBalance,
    }),
    { totalBusiness: 0, totalCommissionAccrued: 0, totalPaid: 0, totalPending: 0 }
  );

  const handleCreatePartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    onAddPartner({
      name: newName.trim(),
      firmName: newFirmName.trim() || undefined,
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      role: newRole,
      defaultCommissionPercent: parseFloat(newCommissionPercent) || 5,
      status: 'active',
    });

    setNewName('');
    setNewFirmName('');
    setNewPhone('');
    setNewEmail('');
    setIsAddFormOpen(false);
  };

  const handleExecutePayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerForPayout) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) return;

    onRecordPayout(selectedPartnerForPayout.id, amount, payoutNotes.trim() || undefined);
    setSelectedPartnerForPayout(null);
    setPayoutAmount('');
    setPayoutNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                Architect, Designer &amp; Contractor Commission Ledger
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-900 text-teal-300 font-mono font-bold">
                  {partners.length} Partners
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track referral business, commission accruals, and settlements for design partners &amp; masons
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddFormOpen(!isAddFormOpen)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddFormOpen ? 'Close Form' : 'Add New Partner'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Financial Metric Tiles */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Total Business Driven
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{safeToFixed(totals.totalBusiness)}
            </div>
            <div className="text-[10px] text-teal-600 font-semibold mt-0.5">Showroom Referral Sales</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Accrued Commissions
            </div>
            <div className="text-base font-black text-slate-900 dark:text-white font-mono mt-0.5">
              ₹{safeToFixed(totals.totalCommissionAccrued)}
            </div>
            <div className="text-[10px] text-slate-500 font-semibold mt-0.5">Lifetime Earned</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Disbursed Payouts
            </div>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              ₹{safeToFixed(totals.totalPaid)}
            </div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Paid via Voucher / Bank</div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Net Pending Payable
            </div>
            <div className="text-base font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
              ₹{safeToFixed(totals.totalPending)}
            </div>
            <div className="text-[10px] text-amber-600 font-semibold mt-0.5">Outstanding Balance</div>
          </div>
        </div>

        {/* Add Partner Form Drawer */}
        {isAddFormOpen && (
          <form
            onSubmit={handleCreatePartner}
            className="p-4 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900 grid grid-cols-1 md:grid-cols-6 gap-3 animate-in fade-in"
          >
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Partner Full Name *
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ar. Suresh Patel"
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98..."
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Role / Profession
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Architect">Architect</option>
                <option value="Interior Designer">Interior Designer</option>
                <option value="Civil Contractor">Civil Contractor</option>
                <option value="Tile Mason / Mistri">Tile Mason / Mistri</option>
              </select>
            </div>

            <div className="md:col-span-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Default Commission %
              </label>
              <input
                type="number"
                min="1"
                max="25"
                value={newCommissionPercent}
                onChange={(e) => setNewCommissionPercent(e.target.value)}
                className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Save Partner
              </button>
            </div>
          </form>
        )}

        {/* Payout Dialog Modal */}
        {selectedPartnerForPayout && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  Record Commission Payout
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedPartnerForPayout(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs">
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedPartnerForPayout.name} ({selectedPartnerForPayout.role})
                </div>
                <div className="text-slate-500">
                  Current Pending Commission Balance: <strong>₹{safeToFixed(selectedPartnerForPayout.pendingBalance)}</strong>
                </div>
              </div>

              <form onSubmit={handleExecutePayout} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Disbursement Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedPartnerForPayout.pendingBalance || 1000000}
                    required
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Mode &amp; Reference
                  </label>
                  <input
                    type="text"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder="e.g. UPI Ref / Bank IMPS / Cash Voucher No."
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPartnerForPayout(null)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20"
                  >
                    Confirm Payout Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, firm, or phone number..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            {['all', 'Architect', 'Interior Designer', 'Civil Contractor', 'Tile Mason / Mistri'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg transition-all capitalize cursor-pointer ${
                  roleFilter === r
                    ? 'bg-white dark:bg-slate-900 text-teal-600 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {r === 'all' ? 'All Roles' : r.replace('Tile Mason / Mistri', 'Masons')}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Partners */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="pb-2.5">Partner / Firm</th>
                <th className="pb-2.5">Contact Details</th>
                <th className="pb-2.5 text-center">Comm. %</th>
                <th className="pb-2.5 text-right">Business Driven</th>
                <th className="pb-2.5 text-right">Accrued</th>
                <th className="pb-2.5 text-right">Paid Out</th>
                <th className="pb-2.5 text-right">Pending Balance</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPartners.map((p) => {
                return (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {p.role}
                        </span>
                        {p.firmName && <span>• {p.firmName}</span>}
                      </div>
                    </td>

                    <td className="py-3 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <div>{p.phone}</div>
                      {p.email && <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.email}</div>}
                    </td>

                    <td className="py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-mono font-bold text-[11px]">
                        {p.defaultCommissionPercent}%
                      </span>
                    </td>

                    <td className="py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                      ₹{safeToFixed(p.totalBusinessDriven)}
                    </td>

                    <td className="py-3 text-right font-mono text-slate-600 dark:text-slate-300">
                      ₹{safeToFixed(p.totalCommissionAccrued)}
                    </td>

                    <td className="py-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      ₹{safeToFixed(p.totalCommissionPaid)}
                    </td>

                    <td className="py-3 text-right font-mono font-bold">
                      <span
                        className={p.pendingBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}
                      >
                        ₹{safeToFixed(p.pendingBalance)}
                      </span>
                    </td>

                    <td className="py-3 text-right space-x-1">
                      {onSelectPartnerForSale && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectPartnerForSale(p);
                            onClose();
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                          title="Tag to current POS bill"
                        >
                          Tag to POS
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedPartnerForPayout(p)}
                        disabled={p.pendingBalance <= 0}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        title="Record payment"
                      >
                        Payout
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
