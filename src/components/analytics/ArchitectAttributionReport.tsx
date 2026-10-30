import React from 'react';
import { ArchitectAttribution } from '../../types/analytics';
import { Users, Award, DollarSign, Building } from 'lucide-react';

interface ArchitectAttributionReportProps {
  partners: ArchitectAttribution[];
}

export const ArchitectAttributionReport: React.FC<ArchitectAttributionReportProps> = ({ partners }) => {
  const totalDriven = partners.reduce((s, p) => s + p.totalBusinessDriven, 0);
  const totalAccrued = partners.reduce((s, p) => s + p.totalCommissionAccrued, 0);
  const totalPending = partners.reduce((s, p) => s + p.pendingBalance, 0);

  return (
    <div className="space-y-4">
      {/* Mini KPI banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Business Driven
          </span>
          <div className="mt-1 text-xl font-black font-mono text-slate-900">
            ₹{totalDriven.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across {partners.length} registered partners</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Commission Accrued
          </span>
          <div className="mt-1 text-xl font-black font-mono text-emerald-700">
            ₹{totalAccrued.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Calculated on taxable turnover</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-rose-200 bg-rose-50/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
            Pending Commission Payouts
          </span>
          <div className="mt-1 text-xl font-black font-mono text-rose-600">
            ₹{totalPending.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Unpaid partner liabilities</div>
        </div>
      </div>

      {/* Partners List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Architect & Interior Designer Referrals</h3>
            <p className="text-[11px] text-slate-500">Attribution tracking for partner driven tile sales and incentives</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <th className="py-3 px-4">Architect / Designer</th>
                <th className="py-3 px-4">Firm / Studio</th>
                <th className="py-3 px-4 text-center">Comm. %</th>
                <th className="py-3 px-4 text-right">Business Driven (₹)</th>
                <th className="py-3 px-4 text-right">Commission Accrued (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Pending Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No architect referral partners registered yet. You can add them in POS or Wholesale view.
                  </td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.partnerId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.partnerName}</div>
                      <div className="text-[11px] text-slate-500">{p.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {p.firmName || 'Independent Consultant'}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {p.defaultCommissionPercent}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{p.totalBusinessDriven.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                      ₹{p.totalCommissionAccrued.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      ₹{p.totalCommissionPaid.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      ₹{p.pendingBalance.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
