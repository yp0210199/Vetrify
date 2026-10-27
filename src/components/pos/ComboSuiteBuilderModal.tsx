import React, { useState, useMemo } from 'react';
import {
  X,
  Sparkles,
  Bath,
  Home,
  CheckCircle2,
  Plus,
  Percent,
  Layers,
  ArrowRight,
  Package,
  Wrench,
  ChevronRight,
  Check,
} from 'lucide-react';
import { PosCartItem } from '../../types';
import { safeToFixed } from '../../lib/formatting/formatters';

interface ComboSuiteBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSuiteToCart: (items: PosCartItem[]) => void;
}

interface SuitePreset {
  id: string;
  title: string;
  tagline: string;
  category: 'bathroom' | 'living' | 'kitchen';
  defaultAreaSqFt: number;
  discountPercent: number;
  components: {
    categoryLabel: string;
    productName: string;
    brand: string;
    finish: string;
    size: string;
    unitPrice: number;
    unit: string;
    coveragePerBoxSqFt?: number;
    calcQtyRatio: (areaSqFt: number) => number; // e.g. how many boxes or pcs per sq.ft
    isOptional?: boolean;
    defaultSelected?: boolean;
    hsnCode: string;
    gstPercent: number;
  }[];
}

const SUITE_PRESETS: SuitePreset[] = [
  {
    id: 'master-bath-luxury',
    title: 'Master Bathroom Luxury Suite',
    tagline: 'GVT 600×1200mm Wall Tiles, Anti-skid Floor, Rimless Wall-hung WC, Vanity & Diverter',
    category: 'bathroom',
    defaultAreaSqFt: 220,
    discountPercent: 12,
    components: [
      {
        categoryLabel: 'Wall Tiles (Light Shade)',
        productName: 'Kajaria Royal Calacatta Statuario Glossy (600×1200mm)',
        brand: 'Kajaria',
        finish: 'Glossy',
        size: '600×1200mm',
        unitPrice: 1250,
        unit: 'Box',
        coveragePerBoxSqFt: 15.5,
        calcQtyRatio: (area) => Math.ceil((area * 0.65) / 15.5),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Wall Tiles (Dark Highlighter)',
        productName: 'Kajaria Nero Marquina Carving Finish (600×1200mm)',
        brand: 'Kajaria',
        finish: 'Carving',
        size: '600×1200mm',
        unitPrice: 1380,
        unit: 'Box',
        coveragePerBoxSqFt: 15.5,
        calcQtyRatio: (area) => Math.ceil((area * 0.25) / 15.5),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Floor Tiles (Anti-Skid)',
        productName: 'Somany Anti-Skid Gris Matt Punch (600×600mm)',
        brand: 'Somany',
        finish: 'Matt',
        size: '600×600mm',
        unitPrice: 780,
        unit: 'Box',
        coveragePerBoxSqFt: 15.5,
        calcQtyRatio: (area) => Math.ceil((area * 0.2) / 15.5),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Tile Adhesive (Polymer Mod.)',
        productName: 'Roff T02 Grey Tile Adhesive (20 Kg Bag)',
        brand: 'Pidilite Roff',
        finish: 'Grey',
        size: '20 Kg',
        unitPrice: 420,
        unit: 'Bag',
        calcQtyRatio: (area) => Math.max(2, Math.ceil(area / 50)),
        hsnCode: '3506',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Epoxy Grout (Stain Proof)',
        productName: 'Laticrete Spectralock Pro Epoxy Grout (1 Kg Kit)',
        brand: 'Laticrete',
        finish: 'Silver Shadow',
        size: '1 Kg',
        unitPrice: 650,
        unit: 'Kit',
        calcQtyRatio: (area) => Math.max(1, Math.ceil(area / 90)),
        hsnCode: '3214',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Sanitaryware (WC Suite)',
        productName: 'Jaquar Rimless Wall-hung Commode with UF Soft Close Seat',
        brand: 'Jaquar',
        finish: 'Alpine White',
        size: '540×360mm',
        unitPrice: 8490,
        unit: 'Piece',
        calcQtyRatio: () => 1,
        hsnCode: '6910',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Basin & Vanity',
        productName: 'Hindware Italian Collection Tabletop Art Ceramic Basin',
        brand: 'Hindware',
        finish: 'Gloss White',
        size: '480×370mm',
        unitPrice: 3850,
        unit: 'Piece',
        calcQtyRatio: () => 1,
        hsnCode: '6910',
        gstPercent: 18,
      },
      {
        categoryLabel: 'CP Faucets & Shower',
        productName: 'Jaquar Alive Single Lever Concealed Diverter & Overhead Shower',
        brand: 'Jaquar',
        finish: 'Chrome',
        size: 'Standard',
        unitPrice: 6990,
        unit: 'Set',
        calcQtyRatio: () => 1,
        isOptional: true,
        defaultSelected: true,
        hsnCode: '8481',
        gstPercent: 18,
      },
    ],
  },
  {
    id: 'living-hall-package',
    title: 'Living & Dining Vitrified Flooring Package',
    tagline: 'Large Format 800×1600mm Porcelain Slabs with Heavy Duty Adhesive & Levellers',
    category: 'living',
    defaultAreaSqFt: 450,
    discountPercent: 10,
    components: [
      {
        categoryLabel: 'Main Hall Floor Slabs',
        productName: 'Simpolo Armani Brown Polished Vitrified Slab (800×1600mm)',
        brand: 'Simpolo',
        finish: 'High Gloss',
        size: '800×1600mm',
        unitPrice: 2450,
        unit: 'Box',
        coveragePerBoxSqFt: 27.56,
        calcQtyRatio: (area) => Math.ceil((area * 1.08) / 27.56), // +8% wastage
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Border / Skirting Strip',
        productName: 'Simpolo Nero High Density Border Tile (600×150mm)',
        brand: 'Simpolo',
        finish: 'Polished',
        size: '600×150mm',
        unitPrice: 580,
        unit: 'Box',
        coveragePerBoxSqFt: 10.0,
        calcQtyRatio: (area) => Math.max(2, Math.ceil(area / 150)),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Heavy Duty Adhesive (Type 2)',
        productName: 'MYK Laticrete 335 Super Flexible Adhesive (20 Kg)',
        brand: 'MYK Laticrete',
        finish: 'White',
        size: '20 Kg',
        unitPrice: 720,
        unit: 'Bag',
        calcQtyRatio: (area) => Math.ceil(area / 45),
        hsnCode: '3506',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Tile Levelling System',
        productName: 'ProLevel Reusable Spin-Cap Tile Levelling Spacers (Pack of 100)',
        brand: 'ProTools',
        finish: '2mm',
        size: '100 pcs',
        unitPrice: 480,
        unit: 'Pack',
        calcQtyRatio: (area) => Math.max(2, Math.ceil(area / 200)),
        isOptional: true,
        defaultSelected: true,
        hsnCode: '3926',
        gstPercent: 18,
      },
    ],
  },
  {
    id: 'compact-bath-standard',
    title: 'Guest Washroom Compact Combo',
    tagline: '300×600mm Ceramic Wall Tiles, Floor, One-Piece EWC Commode & Basin',
    category: 'bathroom',
    defaultAreaSqFt: 120,
    discountPercent: 8,
    components: [
      {
        categoryLabel: 'Wall Tiles (Light)',
        productName: 'Cera Travertino Crema Gloss Ceramic (300×600mm)',
        brand: 'Cera',
        finish: 'Glossy',
        size: '300×600mm',
        unitPrice: 560,
        unit: 'Box',
        coveragePerBoxSqFt: 11.62,
        calcQtyRatio: (area) => Math.ceil((area * 0.7) / 11.62),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Wall Tiles (Highlighter)',
        productName: 'Cera Moroccan Motif Decor Ceramic (300×600mm)',
        brand: 'Cera',
        finish: 'Glossy',
        size: '300×600mm',
        unitPrice: 620,
        unit: 'Box',
        coveragePerBoxSqFt: 11.62,
        calcQtyRatio: (area) => Math.ceil((area * 0.2) / 11.62),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Floor Tiles (Anti-skid)',
        productName: 'Cera Ivory Anti-Skid Floor Tile (300×300mm)',
        brand: 'Cera',
        finish: 'Matt',
        size: '300×300mm',
        unitPrice: 420,
        unit: 'Box',
        coveragePerBoxSqFt: 9.68,
        calcQtyRatio: (area) => Math.ceil((area * 0.25) / 9.68),
        hsnCode: '6907',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Tile Adhesive',
        productName: 'Roff New Construction Tile Adhesive (20 Kg)',
        brand: 'Pidilite Roff',
        finish: 'Grey',
        size: '20 Kg',
        unitPrice: 340,
        unit: 'Bag',
        calcQtyRatio: (area) => Math.max(1, Math.ceil(area / 60)),
        hsnCode: '3506',
        gstPercent: 18,
      },
      {
        categoryLabel: 'One-Piece EWC Toilet',
        productName: 'Cera Belis One-Piece S-Trap Ceramic Water Closet',
        brand: 'Cera',
        finish: 'White',
        size: '650×360mm',
        unitPrice: 4990,
        unit: 'Piece',
        calcQtyRatio: () => 1,
        hsnCode: '6910',
        gstPercent: 18,
      },
      {
        categoryLabel: 'Wall Hung Basin',
        productName: 'Cera Mini Wall Hung Wash Basin with Bottle Trap',
        brand: 'Cera',
        finish: 'White',
        size: '420×300mm',
        unitPrice: 1250,
        unit: 'Piece',
        calcQtyRatio: () => 1,
        hsnCode: '6910',
        gstPercent: 18,
      },
    ],
  },
];

export const ComboSuiteBuilderModal: React.FC<ComboSuiteBuilderModalProps> = ({
  isOpen,
  onClose,
  onAddSuiteToCart,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(SUITE_PRESETS[0].id);
  const [roomAreaSqFt, setRoomAreaSqFt] = useState<number>(SUITE_PRESETS[0].defaultAreaSqFt);
  const [roomLengthFt, setRoomLengthFt] = useState<string>('12');
  const [roomWidthFt, setRoomWidthFt] = useState<string>('10');
  const [dimensionMode, setDimensionMode] = useState<'area' | 'dimensions'>('dimensions');
  const [disabledComponents, setDisabledComponents] = useState<Record<string, boolean>>({});

  const activePreset = useMemo(() => {
    return SUITE_PRESETS.find((p) => p.id === selectedPresetId) || SUITE_PRESETS[0];
  }, [selectedPresetId]);

  // Compute effective area
  const effectiveArea = useMemo(() => {
    if (dimensionMode === 'dimensions') {
      const l = parseFloat(roomLengthFt) || 0;
      const w = parseFloat(roomWidthFt) || 0;
      const wallPerimeter = (l + w) * 2;
      const wallHeight = 8; // standard 8 ft height for bathroom tiling
      // If bathroom, calculate total wall + floor area
      if (activePreset.category === 'bathroom') {
        return Math.round(wallPerimeter * wallHeight + l * w);
      }
      return Math.round(l * w);
    }
    return roomAreaSqFt;
  }, [dimensionMode, roomLengthFt, roomWidthFt, roomAreaSqFt, activePreset.category]);

  // Compute component quantities and costs
  const evaluatedComponents = useMemo(() => {
    return activePreset.components.map((c, index) => {
      const isExcluded = disabledComponents[`${activePreset.id}_${index}`];
      const qty = c.calcQtyRatio(effectiveArea);
      const gross = qty * c.unitPrice;
      const discount = (gross * activePreset.discountPercent) / 100;
      const net = gross - discount;
      return {
        ...c,
        index,
        isExcluded: Boolean(isExcluded),
        qty,
        gross,
        discount,
        net,
      };
    });
  }, [activePreset, effectiveArea, disabledComponents]);

  const summary = useMemo(() => {
    const included = evaluatedComponents.filter((c) => !c.isExcluded);
    const grossTotal = included.reduce((s, c) => s + c.gross, 0);
    const totalDiscount = included.reduce((s, c) => s + c.discount, 0);
    const netTotal = included.reduce((s, c) => s + c.net, 0);
    const totalItems = included.reduce((s, c) => s + c.qty, 0);
    return { grossTotal, totalDiscount, netTotal, totalItems };
  }, [evaluatedComponents]);

  const toggleComponent = (index: number) => {
    const key = `${activePreset.id}_${index}`;
    setDisabledComponents((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleApplySuite = () => {
    const included = evaluatedComponents.filter((c) => !c.isExcluded);
    const cartItems: PosCartItem[] = included.map((c) => {
      const base = c.qty * c.unitPrice;
      const discAmt = (base * activePreset.discountPercent) / 100;
      const taxable = base - discAmt;
      const halfGst = c.gstPercent / 2;
      const cgst = (taxable * halfGst) / 100;
      const sgst = (taxable * halfGst) / 100;
      const total = taxable + cgst + sgst;

      return {
        id: `suite_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: `prod_suite_${c.index}`,
        name: c.productName,
        brand: c.brand,
        composition: `${activePreset.title} Bundle Component`,
        sku: `SUITE-${c.brand.slice(0, 3).toUpperCase()}-${c.unit.slice(0, 2).toUpperCase()}`,
        batchId: `batch_suite_${c.index}`,
        batch: 'SUITE-LOT-01',
        shadeNumber: 'SUITE-SHADE-A',
        toneCode: 'T01',
        caliberCode: 'CAL-0',
        finish: c.finish,
        grade: 'Premium',
        expiry: 'N/A',
        qty: c.qty,
        availableStock: 999,
        unit: c.unit,
        mrp: c.unitPrice * 1.15,
        price: c.unitPrice,
        discountPercent: activePreset.discountPercent,
        discountAmount: discAmt,
        taxableAmount: taxable,
        gstPercent: c.gstPercent,
        cgstAmount: cgst,
        sgstAmount: sgst,
        totalTax: cgst + sgst,
        total: total,
        dosageForm: c.finish,
        hsnCode: c.hsnCode,
        coveragePerBoxSqFt: c.coveragePerBoxSqFt,
        sqFtCalculated: c.coveragePerBoxSqFt ? c.qty * c.coveragePerBoxSqFt : undefined,
      };
    });

    onAddSuiteToCart(cartItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md">
              <Sparkles className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider flex items-center gap-2">
                Ceramic Suite &amp; Room Combo Package Builder
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  PRO POS
                </span>
              </h2>
              <p className="text-xs text-teal-100 mt-0.5">
                Auto-bundles Wall Tiles, Floor, Adhesive, Epoxy Grout &amp; Fixtures with Package Discounts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Selection Strip */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto">
          {SUITE_PRESETS.map((p) => {
            const isSelected = p.id === selectedPresetId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedPresetId(p.id);
                  setRoomAreaSqFt(p.defaultAreaSqFt);
                  setDisabledComponents({});
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.category === 'bathroom' ? <Bath className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                <span>{p.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20' : 'bg-teal-100 text-teal-800'}`}>
                  {p.discountPercent}% OFF
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Dimensions & Presets Config (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                <span>Room Dimensions &amp; Area</span>
                <span className="text-[10px] text-teal-600 font-mono font-bold">
                  Effective: {effectiveArea} Sq. Ft
                </span>
              </h3>

              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDimensionMode('dimensions')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    dimensionMode === 'dimensions'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Room L × W (Feet)
                </button>
                <button
                  type="button"
                  onClick={() => setDimensionMode('area')}
                  className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                    dimensionMode === 'area'
                      ? 'bg-white dark:bg-slate-800 text-teal-600 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Total Sq. Ft Area
                </button>
              </div>

              {dimensionMode === 'dimensions' ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Length (Feet)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={roomLengthFt}
                      onChange={(e) => setRoomLengthFt(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      Width (Feet)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={roomWidthFt}
                      onChange={(e) => setRoomWidthFt(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Total Net Carpet Area (Sq. Ft)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={roomAreaSqFt}
                    onChange={(e) => setRoomAreaSqFt(Number(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              )}

              <p className="text-[10px] text-slate-500 leading-relaxed">
                {activePreset.category === 'bathroom'
                  ? 'Tile requirement automatically includes 4-wall perimeter tiling up to 8 ft height plus anti-skid floor area.'
                  : 'Tile requirement includes an integrated 8% cutting and breakage buffer.'}
              </p>
            </div>

            {/* Package Summary Card */}
            <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Total Items Included
                </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                  {summary.totalItems} units / boxes
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Standard Catalog Price:</span>
                <span className="font-mono">₹{safeToFixed(summary.grossTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <span className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  Suite Combo Discount ({activePreset.discountPercent}%):
                </span>
                <span className="font-mono">-₹{safeToFixed(summary.totalDiscount)}</span>
              </div>
              <div className="pt-2 border-t border-teal-200 dark:border-teal-800 flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">
                  Net Suite Price:
                </span>
                <span className="text-lg font-black text-teal-700 dark:text-teal-400 font-mono">
                  ₹{safeToFixed(summary.netTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Components Breakdown (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Suite Components Breakdown ({evaluatedComponents.filter((c) => !c.isExcluded).length}/{evaluatedComponents.length} Selected)
              </h3>
              <span className="text-[11px] text-slate-500">Uncheck to omit individual fittings</span>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {evaluatedComponents.map((c) => {
                return (
                  <div
                    key={c.index}
                    onClick={() => toggleComponent(c.index)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      c.isExcluded
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 opacity-50'
                        : 'border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800/70 shadow-xs hover:border-teal-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          !c.isExcluded
                            ? 'bg-teal-600 border-teal-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {!c.isExcluded && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
                            {c.categoryLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">• {c.size}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {c.productName}
                        </h4>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          ₹{c.unitPrice} / {c.unit} {c.coveragePerBoxSqFt ? `(${c.coveragePerBoxSqFt} sq.ft/bx)` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-black text-slate-900 dark:text-white font-mono">
                        {c.qty} {c.unit}s
                      </div>
                      <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono font-bold">
                        ₹{safeToFixed(c.net)}
                      </div>
                      {c.discount > 0 && (
                        <div className="text-[9px] text-emerald-600 line-through">
                          ₹{safeToFixed(c.gross)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Selected Suite will be loaded into active bill cart as individual items with pre-applied combo discount.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplySuite}
              disabled={summary.totalItems === 0}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Suite to POS Cart (₹{safeToFixed(summary.netTotal)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
