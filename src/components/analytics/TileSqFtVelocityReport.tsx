import React from 'react';
import { CategorySalesBreakdown } from '../../types/analytics';
import { Grid, Sparkles, Droplet, Hammer, Wrench } from 'lucide-react';

interface TileSqFtVelocityReportProps {
  categories: CategorySalesBreakdown[];
}

export const TileSqFtVelocityReport: React.FC<TileSqFtVelocityReportProps> = ({ categories }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'tiles':
        return <Grid className="w-4 h-4 text-emerald-600" />;
      case 'sanitaryware':
        return <Sparkles className="w-4 h-4 text-cyan-600" />;
      case 'faucets':
        return <Droplet className="w-4 h-4 text-blue-600" />;
      case 'adhesives':
        return <Hammer className="w-4 h-4 text-amber-600" />;
      default:
        return <Wrench className="w-4 h-4 text-slate-600" />;
    }
  };

  const totalRev = categories.reduce((s, c) => s + c.revenue, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Category Sales & Margin Breakdown</h3>
          <p className="text-[11px] text-slate-500">Revenue contribution across ceramic tiles, sanitaryware, and hardware</p>
        </div>
        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
          Total: ₹{totalRev.toLocaleString('en-IN')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <th className="py-3 px-4">Product Line</th>
              <th className="py-3 px-4 text-right">Revenue (₹)</th>
              <th className="py-3 px-4 text-right">Share (%)</th>
              <th className="py-3 px-4 text-right">Volume (Sq.Ft / Units)</th>
              <th className="py-3 px-4 text-right">Gross Profit (₹)</th>
              <th className="py-3 px-4 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((cat) => (
              <tr key={cat.categoryType} className="hover:bg-slate-50/70">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-100 rounded-lg">{getIcon(cat.categoryType)}</div>
                    <span className="font-bold text-slate-900">{cat.label}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  ₹{cat.revenue.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${cat.percentageOfTotal}%` }}
                      />
                    </div>
                    <span className="font-mono font-semibold text-slate-700">{cat.percentageOfTotal}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-700">
                  {cat.sqFtEquivalent ? (
                    <div>
                      <strong className="text-slate-900">{cat.sqFtEquivalent.toLocaleString('en-IN')}</strong> Sq.Ft
                      <div className="text-[10px] text-slate-400">({cat.unitsCount} boxes)</div>
                    </div>
                  ) : (
                    <span>{cat.unitsCount} Units</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                  ₹{cat.grossProfit.toLocaleString('en-IN')}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    cat.marginPercent >= 25 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {cat.marginPercent}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
