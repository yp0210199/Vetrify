import React, { useState } from 'react';
import { Search, Layers, AlertCircle, ArrowUpRight, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ShadeVelocityItem } from '../../types/analytics';

interface ShadeVelocityMatrixProps {
  items: ShadeVelocityItem[];
}

export const ShadeVelocityMatrix: React.FC<ShadeVelocityMatrixProps> = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [velocityFilter, setVelocityFilter] = useState<'ALL' | 'FAST' | 'STEADY' | 'SLOW' | 'NON_MOVING'>('ALL');

  const filtered = items.filter((item) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.productName.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      (item.shadeNumber && item.shadeNumber.toLowerCase().includes(q)) ||
      (item.batchNumber && item.batchNumber.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (velocityFilter !== 'ALL' && item.velocity !== velocityFilter) return false;
    return true;
  });

  const getVelocityBadge = (v: ShadeVelocityItem['velocity']) => {
    switch (v) {
      case 'FAST':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
            <Flame className="w-3 h-3 text-rose-500" />
            Fast Moving
          </span>
        );
      case 'STEADY':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Steady
          </span>
        );
      case 'SLOW':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            Slow Moving
          </span>
        );
      case 'NON_MOVING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <ShieldAlert className="w-3 h-3 text-slate-400" />
            Dead Lot
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Tile Shade & Lot Velocity Matrix</h3>
          <p className="text-[11px] text-slate-500">Track demand per lot/shade to prevent shade mismatch on reorders</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shade, tile name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <select
            value={velocityFilter}
            onChange={(e) => setVelocityFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
          >
            <option value="ALL">All Velocities</option>
            <option value="FAST">Fast Moving Only</option>
            <option value="STEADY">Steady Demand</option>
            <option value="SLOW">Slow Moving</option>
            <option value="NON_MOVING">Dead Lots</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <th className="py-3 px-4">Tile Master & Brand</th>
              <th className="py-3 px-4">Shade / Lot / Tone</th>
              <th className="py-3 px-4 text-right">Boxes Sold</th>
              <th className="py-3 px-4 text-right">Sq. Ft Billed</th>
              <th className="py-3 px-4 text-right">Yard Stock (Boxes)</th>
              <th className="py-3 px-4 text-right">Total Revenue (₹)</th>
              <th className="py-3 px-4">Velocity Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No shade lot records matching your filter.
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => (
                <tr key={`${item.productId}_${idx}`} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{item.productName}</div>
                    <div className="text-[11px] text-slate-500">{item.brand}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                      {item.shadeNumber || 'STD-01'}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-2">Tone: {item.toneCode || 'T1'}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {item.boxesSold.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    {item.sqFtSold.toLocaleString('en-IN')} Sq.Ft
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                    {item.currentStockBoxes.toLocaleString('en-IN')} bxs
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    ₹{item.revenue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    {getVelocityBadge(item.velocity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
