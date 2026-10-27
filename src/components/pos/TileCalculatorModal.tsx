import React, { useState, useEffect } from 'react';
import { X, Calculator, Plus, ArrowRight, Sparkles, Check, Layers } from 'lucide-react';
import { safeToFixed } from '../../lib/formatting/formatters';

interface TileCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  defaultCoveragePerBox?: number;
  defaultPricePerBox?: number;
  defaultPricePerSqFt?: number;
  onApply: (boxes: number, totalSqFt: number, notes?: string) => void;
}

export const TileCalculatorModal: React.FC<TileCalculatorModalProps> = ({
  isOpen,
  onClose,
  productName,
  defaultCoveragePerBox = 15.5,
  defaultPricePerBox,
  defaultPricePerSqFt,
  onApply,
}) => {
  const [calcMode, setCalcMode] = useState<'dimensions' | 'directArea'>('dimensions');
  
  // Dimensions mode
  const [lengthFt, setLengthFt] = useState<string>('12');
  const [widthFt, setWidthFt] = useState<string>('10');
  
  // Direct area mode
  const [directArea, setDirectArea] = useState<string>('120');
  
  // Box coverage & wastage
  const [coveragePerBox, setCoveragePerBox] = useState<string>(defaultCoveragePerBox.toString());
  const [wastagePercent, setWastagePercent] = useState<number>(8);
  const [pricePerSqFt, setPricePerSqFt] = useState<string>(defaultPricePerSqFt?.toString() || '');
  const [pricePerBox, setPricePerBox] = useState<string>(defaultPricePerBox?.toString() || '');

  useEffect(() => {
    if (defaultCoveragePerBox) {
      setCoveragePerBox(defaultCoveragePerBox.toString());
    }
    if (defaultPricePerBox) {
      setPricePerBox(defaultPricePerBox.toString());
    }
    if (defaultPricePerSqFt) {
      setPricePerSqFt(defaultPricePerSqFt.toString());
    }
  }, [defaultCoveragePerBox, defaultPricePerBox, defaultPricePerSqFt, isOpen]);

  if (!isOpen) return null;

  // Calculation Logic
  const l = parseFloat(lengthFt) || 0;
  const w = parseFloat(widthFt) || 0;
  const covPerBox = parseFloat(coveragePerBox) || 15.5;

  const netAreaSqFt = calcMode === 'dimensions' ? l * w : (parseFloat(directArea) || 0);
  const wastageSqFt = (netAreaSqFt * wastagePercent) / 100;
  const totalRequiredSqFt = netAreaSqFt + wastageSqFt;
  
  const requiredBoxes = covPerBox > 0 ? Math.ceil(totalRequiredSqFt / covPerBox) : 0;
  const actualCoverageSqFt = requiredBoxes * covPerBox;
  
  const boxRate = parseFloat(pricePerBox) || (parseFloat(pricePerSqFt) ? parseFloat(pricePerSqFt) * covPerBox : 0);
  const estimatedCost = requiredBoxes * boxRate;

  const handleApply = () => {
    if (requiredBoxes <= 0) return;
    const note = calcMode === 'dimensions' 
      ? `Room: ${l}ft × ${w}ft (${safeToFixed(netAreaSqFt)} sq.ft + ${wastagePercent}% wastage)`
      : `Area: ${safeToFixed(netAreaSqFt)} sq.ft + ${wastagePercent}% wastage`;
    onApply(requiredBoxes, actualCoverageSqFt, note);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Tile Area & Box Calculator
              </h3>
              <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                {productName ? productName : 'Calculate required boxes from room dimensions'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Mode Switcher */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setCalcMode('dimensions')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                calcMode === 'dimensions'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Room Dimensions (L × W)
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('directArea')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                calcMode === 'directArea'
                  ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Direct Total Area (Sq. Ft)
            </button>
          </div>

          {/* Area Inputs */}
          {calcMode === 'dimensions' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Length (Feet)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lengthFt}
                  onChange={(e) => setLengthFt(e.target.value)}
                  placeholder="e.g. 12"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Width (Feet)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={widthFt}
                  onChange={(e) => setWidthFt(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Total Required Area (Sq. Ft)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={directArea}
                onChange={(e) => setDirectArea(e.target.value)}
                placeholder="e.g. 150"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          {/* Box Coverage & Wastage Allowance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Box Coverage (Sq. Ft / Box)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={coveragePerBox}
                onChange={(e) => setCoveragePerBox(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Cutting Wastage ({wastagePercent}%)
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[5, 8, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setWastagePercent(pct)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      wastagePercent === pct
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rate / Price inputs (Optional) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Price per Box (₹) <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerBox}
                onChange={(e) => setPricePerBox(e.target.value)}
                placeholder="e.g. 850"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Price / Sq. Ft (₹) <span className="text-[10px] text-slate-400">Optional</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={pricePerSqFt}
                onChange={(e) => setPricePerSqFt(e.target.value)}
                placeholder="e.g. 55"
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Calculation Result Summary Card */}
          <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
              <span>Net Carpet Area:</span>
              <span className="font-mono font-bold">{safeToFixed(netAreaSqFt)} Sq. Ft</span>
            </div>
            <div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300">
              <span>Wastage Allowance ({wastagePercent}%):</span>
              <span className="font-mono">+{safeToFixed(wastageSqFt)} Sq. Ft</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-teal-950 dark:text-teal-100">
              <span>Total Area Required:</span>
              <span className="font-mono font-bold">{safeToFixed(totalRequiredSqFt)} Sq. Ft</span>
            </div>

            <div className="pt-2 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold block">
                  Recommended Quantity
                </span>
                <span className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
                  {requiredBoxes} <span className="text-sm font-semibold text-teal-600">Boxes</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-teal-700 dark:text-teal-400 font-bold block">
                  Actual Dispatch Area
                </span>
                <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                  {safeToFixed(actualCoverageSqFt)} Sq. Ft
                </span>
              </div>
            </div>

            {boxRate > 0 && (
              <div className="pt-2 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">Estimated Amount:</span>
                <span className="text-base font-black text-teal-700 dark:text-teal-300 font-mono">
                  ₹{safeToFixed(estimatedCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={requiredBoxes <= 0}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply {requiredBoxes} Boxes to Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
