import React, { useState } from 'react';
import {
  Search,
  Filter,
  CreditCard,
  MessageSquare,
  FileText,
  Phone,
  Building,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { CustomerAgingSummary } from '../../types/collections';

interface CustomerAgingTableProps {
  summaries: CustomerAgingSummary[];
  onRecordPayment: (summary: CustomerAgingSummary) => void;
  onSendReminder: (summary: CustomerAgingSummary) => void;
  onViewStatement: (summary: CustomerAgingSummary) => void;
}

export const CustomerAgingTable: React.FC<CustomerAgingTableProps> = ({
  summaries,
  onRecordPayment,
  onSendReminder,
  onViewStatement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [bucketFilter, setBucketFilter] = useState<'all' | 'overdue' | 'critical' | 'current'>('all');

  const filtered = summaries.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.customerName.toLowerCase().includes(q) ||
      (item.phone && item.phone.includes(q)) ||
      (item.gstin && item.gstin.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (bucketFilter === 'current') return item.buckets.b0_30 > 0 && item.totalOverdue === 0;
    if (bucketFilter === 'overdue') return item.totalOverdue > 0;
    if (bucketFilter === 'critical') return item.buckets.b90_plus > 0;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      {/* Search & Filter Header Strip */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search contractor, phone, GSTIN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/20"
          />
        </div>

        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setBucketFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              bucketFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Accounts ({summaries.length})
          </button>
          <button
            type="button"
            onClick={() => setBucketFilter('overdue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              bucketFilter === 'overdue'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Overdue ({summaries.filter((s) => s.totalOverdue > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setBucketFilter('critical')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              bucketFilter === 'critical'
                ? 'bg-white text-rose-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Critical 90+ ({summaries.filter((s) => s.buckets.b90_plus > 0).length})
          </button>
          <button
            type="button"
            onClick={() => setBucketFilter('current')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              bucketFilter === 'current'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current (0-30d)
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
              <th className="py-3 px-4">Contractor / Builder</th>
              <th className="py-3 px-4 text-right">Total Outstanding</th>
              <th className="py-3 px-3 text-right">0-30 Days</th>
              <th className="py-3 px-3 text-right">31-60 Days</th>
              <th className="py-3 px-3 text-right">61-90 Days</th>
              <th className="py-3 px-3 text-right">90+ Days</th>
              <th className="py-3 px-4">Credit Limit & Usage</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <p className="font-semibold text-sm">No receivable accounts found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchTerm
                      ? 'Try adjusting your search criteria'
                      : 'All builder and customer ledger balances are cleared or no credit sales recorded.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const creditUtilization =
                  item.creditLimit > 0
                    ? Math.min(100, Math.round((item.currentOutstanding / item.creditLimit) * 100))
                    : 0;

                return (
                  <tr key={item.customerId} className="hover:bg-slate-50/70 transition-colors">
                    {/* Customer Info */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.customerName}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{item.phone}</span>
                        {item.gstin && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[10px] text-slate-600">{item.gstin}</span>
                          </>
                        )}
                      </div>
                      {item.siteAddress && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">
                          {item.siteAddress}
                        </div>
                      )}
                    </td>

                    {/* Total Outstanding */}
                    <td className="py-3 px-4 text-right">
                      <div className="font-mono font-bold text-sm text-slate-900">
                        ₹{item.currentOutstanding.toLocaleString('en-IN')}
                      </div>
                      {item.totalOverdue > 0 && (
                        <div className="text-[10px] font-semibold text-rose-600 mt-0.5">
                          Overdue: ₹{item.totalOverdue.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* 0-30 Days */}
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {item.buckets.b0_30 > 0 ? (
                        <span className="text-emerald-700 font-semibold">
                          ₹{item.buckets.b0_30.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 31-60 Days */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.buckets.b31_60 > 0 ? (
                        <span className="text-amber-700 font-semibold">
                          ₹{item.buckets.b31_60.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 61-90 Days */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.buckets.b61_90 > 0 ? (
                        <span className="text-orange-700 font-bold">
                          ₹{item.buckets.b61_90.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* 90+ Days */}
                    <td className="py-3 px-3 text-right font-mono">
                      {item.buckets.b90_plus > 0 ? (
                        <span className="text-rose-700 font-black">
                          ₹{item.buckets.b90_plus.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Credit Limit & Progress */}
                    <td className="py-3 px-4">
                      {item.creditLimit > 0 ? (
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1">
                            <span>₹{(item.creditLimit / 1000).toFixed(0)}k Limit</span>
                            <span className={creditUtilization > 85 ? 'text-rose-600 font-bold' : ''}>
                              {creditUtilization}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                creditUtilization > 90
                                  ? 'bg-rose-600'
                                  : creditUtilization > 75
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${creditUtilization}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">No Limit Set</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRecordPayment(item)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          title="Record Payment"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendReminder(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Send WhatsApp / SMS Reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewStatement(item)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="Statement of Accounts (SOA)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View (< md) */}
      <div className="md:hidden divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No receivable accounts found.
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.customerId} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.customerName}</h4>
                  <p className="text-xs text-slate-500">{item.phone}</p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    ₹{item.currentOutstanding.toLocaleString('en-IN')}
                  </div>
                  {item.totalOverdue > 0 && (
                    <span className="text-[10px] font-bold text-rose-600">
                      Overdue: ₹{item.totalOverdue.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              {/* Bucket chips */}
              <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                <div>
                  <div className="text-[9px] text-slate-400">0-30d</div>
                  <div className="font-bold text-emerald-700">₹{item.buckets.b0_30}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">31-60d</div>
                  <div className="font-bold text-amber-700">₹{item.buckets.b31_60}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">61-90d</div>
                  <div className="font-bold text-orange-700">₹{item.buckets.b61_90}</div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">90+d</div>
                  <div className="font-bold text-rose-700">₹{item.buckets.b90_plus}</div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onRecordPayment(item)}
                  className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSendReminder(item)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Remind</span>
                </button>
                <button
                  type="button"
                  onClick={() => onViewStatement(item)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>SOA</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
