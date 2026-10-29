import React, { useState, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  FileText,
  Trash2,
  Lock,
  Unlock,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Eye,
  BadgeAlert,
  Archive,
  Ban,
  TrendingDown,
  Calculator,
  X,
  Layers,
  Box,
  MapPin,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { batchService } from '../../services/batchService';
import { PharmacyBatch, BatchStatus } from '../../types/batch';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SearchInput, Select } from '../ui/Input';
import { AddBatchModal } from './AddBatchModal';
import { BatchDetailDrawer } from './BatchDetailDrawer';
import { safeToFixed } from '../../lib/formatting/formatters';

export const BatchLedgerPanel: React.FC = () => {
  const { organization, stores, currentStore } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [batches, setBatches] = useState<PharmacyBatch[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'active' | 'aging' | 'quarantined'>('active');
  
  // Filtering & searching states
  const [selectedStoreId, setSelectedStoreId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer & Modals states
  const [selectedBatch, setSelectedBatch] = useState<PharmacyBatch | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInwardOpen, setIsInwardOpen] = useState(false);
  
  // Stock adjustment modal states
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustBatch, setAdjustBatch] = useState<PharmacyBatch | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Audit Discrepancy');

  // KPI states
  const [totalLiveLots, setTotalLiveLots] = useState(0);
  const [totalBoxesCount, setTotalBoxesCount] = useState(0);
  const [agingCount, setAgingCount] = useState(0);
  const [quarantinedCount, setQuarantinedCount] = useState(0);

  useEffect(() => {
    if (currentStore && selectedStoreId === 'all') {
      setSelectedStoreId(currentStore.id);
    }
  }, [currentStore]);

  const isBatchAging = (b: PharmacyBatch) => {
    if (!b.manufacturingDate) return false;
    const mfgMillis = typeof (b.manufacturingDate as any).toMillis === 'function'
      ? (b.manufacturingDate as any).toMillis()
      : new Date(b.manufacturingDate as any).getTime();
    if (isNaN(mfgMillis)) return false;
    const ageDays = (Date.now() - mfgMillis) / (1000 * 60 * 60 * 24);
    return ageDays > 180;
  };

  const fetchBatchesList = async () => {
    if (!organization) return;
    try {
      setIsLoading(true);
      const storeParam = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      
      const res = await batchService.getBatches(organization.id, {
        storeId: storeParam,
        status: 'all',
        pageSize: 200,
      });

      setBatches(res.batches);

      let live = 0;
      let totalBoxes = 0;
      let aging = 0;
      let quarantined = 0;

      res.batches.forEach((b) => {
        if (b.status === 'active') {
          live++;
          totalBoxes += (b.availableQuantity || 0);
          if (isBatchAging(b)) {
            aging++;
          }
        } else if (b.status === 'quarantined') {
          quarantined++;
        }
      });

      setTotalLiveLots(live);
      setTotalBoxesCount(totalBoxes);
      setAgingCount(aging);
      setQuarantinedCount(quarantined);

    } catch (err: any) {
      console.error('Error fetching batches:', err);
      error(err?.message || 'Failed to fetch lot stock ledger.', 'Ledger Load Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchBatchesList();
    }
  }, [organization?.id, selectedStoreId]);

  // Handle status update
  const handleUpdateStatus = async (batchId: string, newStatus: BatchStatus) => {
    if (!organization || !user) return;
    try {
      const caller = { uid: user.uid, email: user.email, displayName: user.displayName };
      await batchService.updateBatch(organization.id, batchId, caller, { status: newStatus });
      success(`Lot status updated to ${newStatus.toUpperCase()}`, 'Ledger Synchronized');
      fetchBatchesList();
    } catch (err: any) {
      error(err?.message || 'Failed to update lot status.', 'Operation Rejected');
    }
  };

  // Handle quantity adjustment
  const handleAdjustQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user || !adjustBatch) return;

    const qtyVal = parseInt(adjustQty, 10);
    if (isNaN(qtyVal) || qtyVal < 0) {
      error('Adjusted quantity must be a non-negative integer.', 'Validation Error');
      return;
    }

    if (qtyVal < (adjustBatch.reservedQuantity || 0)) {
      error(`Cannot adjust quantity below reserved quantity (${adjustBatch.reservedQuantity}).`, 'Validation Error');
      return;
    }

    try {
      const caller = { uid: user.uid, email: user.email, displayName: user.displayName };
      const availQty = qtyVal - (adjustBatch.reservedQuantity || 0);

      await batchService.updateBatch(organization.id, adjustBatch.id, caller, {
        quantity: qtyVal,
        availableQuantity: availQty,
        notes: `Manual Stock Discrepancy Adjustment (${adjustReason}). Previous Qty: ${adjustBatch.quantity}.`
      });

      success(`Successfully adjusted Lot ${adjustBatch.shadeNumber || adjustBatch.batchNumber} stock to ${qtyVal} boxes.`, 'Stock Adjusted');
      setIsAdjustmentOpen(false);
      setAdjustBatch(null);
      fetchBatchesList();
    } catch (err: any) {
      error(err?.message || 'Failed to adjust stock quantity.', 'Operation Failed');
    }
  };

  // Filter batches based on tab and search
  const filteredBatches = batches.filter((b) => {
    // 1. Filter by Tab
    if (activeSubTab === 'active') {
      if (b.status !== 'active') return false;
    } else if (activeSubTab === 'aging') {
      if (b.status !== 'active' || !isBatchAging(b)) return false;
    } else if (activeSubTab === 'quarantined') {
      if (b.status === 'active') return false;
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchBatch = b.batchNumber.toLowerCase().includes(query);
      const matchShade = b.shadeNumber?.toLowerCase().includes(query) || false;
      const matchName = b.productName?.toLowerCase().includes(query) || false;
      const matchSku = b.productSku?.toLowerCase().includes(query) || false;
      const matchTone = b.toneCode?.toLowerCase().includes(query) || false;
      return matchBatch || matchShade || matchName || matchSku || matchTone;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-50 text-teal-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Active Stock Lots</span>
            <span className="text-xl font-black text-[#0B1F33] font-mono-num">{totalLiveLots}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Available Boxes</span>
            <span className="text-xl font-black text-emerald-700 font-mono-num">{totalBoxesCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Aging Lots (&gt;180D)</span>
            <span className="text-xl font-black text-amber-700 font-mono-num">{agingCount}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F1F5F9] text-[#475569]">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Quarantined / Scrap</span>
            <span className="text-xl font-black text-[#475569] font-mono-num">{quarantinedCount}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:max-w-md flex items-center gap-2">
          <SearchInput
            placeholder="Search by lot number, shade, tone, caliber, tile name, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#64748B] font-bold whitespace-nowrap">Filter Godown / Store:</span>
            <Select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-xs py-1.5"
            >
              <option value="all">All Accessible Branches</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchBatchesList}
            isLoading={isLoading}
            title="Refresh Ledger"
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setIsInwardOpen(true)}
          >
            Inward Stock Lot
          </Button>
        </div>
      </div>

      {/* Sub tabs for Lots */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        <button
          onClick={() => setActiveSubTab('active')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeSubTab === 'active' ? 'text-[#0D5C63]' : 'text-[#64748B] hover:text-[#0B1F33]'
          }`}
        >
          Active Lots & Shades ({totalLiveLots})
          {activeSubTab === 'active' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0D5C63] rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('aging')}
          className={`pb-3 text-xs font-bold transition-all relative flex items-center gap-1.5 ${
            activeSubTab === 'aging' ? 'text-amber-700' : 'text-[#64748B] hover:text-[#0B1F33]'
          }`}
        >
          Aging Stock Lots
          {agingCount > 0 && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black font-mono-num">
              {agingCount}
            </span>
          )}
          {activeSubTab === 'aging' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-700 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveSubTab('quarantined')}
          className={`pb-3 text-xs font-bold transition-all relative ${
            activeSubTab === 'quarantined' ? 'text-[#475569]' : 'text-[#64748B] hover:text-[#0B1F33]'
          }`}
        >
          Quarantined & Damage ({quarantinedCount})
          {activeSubTab === 'quarantined' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#475569] rounded-full" />}
        </button>
      </div>

      {/* Lots Table */}
      {isLoading ? (
        <div className="space-y-3.5">
          <div className="h-12 bg-[#F8FAFC] rounded-2xl animate-pulse border border-[#E2E8F0]" />
          <div className="h-20 bg-white rounded-2xl animate-pulse border border-[#E2E8F0]" />
          <div className="h-20 bg-white rounded-2xl animate-pulse border border-[#E2E8F0]" />
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-[#64748B]">
          <SlidersHorizontal className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2.5" />
          <h4 className="font-extrabold text-[#0B1F33] text-sm">No stock lots found</h4>
          <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1">
            Try adjusting your store filter or search query, or inward new material stock lots.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold select-none">
                  <th className="py-3 px-3">Lot / Shade No</th>
                  <th className="py-3 px-3 min-w-[180px]">Product Master SKU</th>
                  <th className="py-3 px-3">Tone / Caliber</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Available Boxes</th>
                  <th className="py-3 px-3 text-right">Showroom Price</th>
                  <th className="py-3 px-3 text-right">Purchase Cost</th>
                  <th className="py-3 px-3">Godown Bay / Rack</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filteredBatches.map((b) => {
                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-[11px] font-black text-[#0B1F33]">{b.shadeNumber || b.batchNumber}</span>
                          {b.shadeNumber && b.batchNumber !== b.shadeNumber && (
                            <span className="text-[9px] font-mono text-[#64748B] mt-0.5">Ref: {b.batchNumber}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-extrabold text-[#0B1F33] block">{b.productName}</span>
                        <span className="text-[10px] text-[#64748B] font-mono">{b.productSku}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-xs text-[#475569]">{b.toneCode || 'Std'} / {b.caliberCode || 'C-1'}</span>
                      </td>
                      <td className="py-3.5 px-3">
                        <Badge status={b.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`font-mono-num font-black ${
                            b.availableQuantity === 0 ? 'text-red-500' : 'text-[#0B1F33]'
                          }`}>
                            {b.availableQuantity} Boxes
                          </span>
                          <span className="text-[9px] text-[#64748B]">of {b.quantity} inwarded</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num font-bold text-[#0D5C63]">
                        ₹{safeToFixed(b.salePrice || b.mrp)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono-num text-[#64748B]">
                        ₹{safeToFixed(b.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-[#475569]">{b.storageLocation || 'Yard Bay A-01'}</span>
                      </td>
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedBatch(b);
                              setIsDetailOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D5C63] hover:bg-[#E6F4F1] rounded-lg transition-colors cursor-pointer"
                            title="Audit Stock Lot Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setAdjustBatch(b);
                              setAdjustQty(b.quantity.toString());
                              setIsAdjustmentOpen(true);
                            }}
                            className="p-1.5 text-[#64748B] hover:text-[#0D5C63] hover:bg-[#E6F4F1] rounded-lg transition-colors cursor-pointer"
                            title="Adjust Stock Quantity"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>

                          {b.status === 'active' ? (
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'quarantined')}
                              className="p-1.5 text-[#64748B] hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Quarantine Lot (Exclude from sales)"
                            >
                              <Lock className="w-4 h-4" />
                            </button>
                          ) : (
                            b.status === 'quarantined' && (
                              <button
                                onClick={() => handleUpdateStatus(b.id, 'active')}
                                className="p-1.5 text-[#64748B] hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Approve / Re-activate Lot"
                              >
                                <Unlock className="w-4 h-4" />
                              </button>
                            )
                          )}

                          {b.status !== 'archived' && (
                            <button
                              onClick={() => handleUpdateStatus(b.id, 'archived')}
                              className="p-1.5 text-[#64748B] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Archive Lot"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Inward Batch Modal */}
      <AddBatchModal
        isOpen={isInwardOpen}
        onClose={() => setIsInwardOpen(false)}
        onSuccess={fetchBatchesList}
      />

      {/* Batch Details Drawer */}
      <BatchDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedBatch(null);
        }}
        batch={selectedBatch}
      />

      {/* Physical Stock Quantity Adjustment Dialog */}
      {isAdjustmentOpen && adjustBatch && (
        <div className="fixed inset-0 bg-[#0B1F33]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#0B1F33] text-sm">Adjust Lot Stock Quantity</h3>
                <p className="text-[10px] text-[#64748B]">Shade: {adjustBatch.shadeNumber || adjustBatch.batchNumber} | {adjustBatch.productName}</p>
              </div>
              <button onClick={() => { setIsAdjustmentOpen(false); setAdjustBatch(null); }} className="p-1 text-[#64748B] hover:bg-[#F1F5F9] rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustQuantity} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#334155] block">Counted Physical Stock (Boxes)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] font-mono-num focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
                <span className="text-[10px] text-[#64748B] block">
                  Reserved in carts/orders: {adjustBatch.reservedQuantity}. Sellable quantity will resolve as Adjusted - {adjustBatch.reservedQuantity}.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#334155] block">Adjustment Reason</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
                >
                  <option value="Audit Discrepancy">Physical Godown Count Discrepancy</option>
                  <option value="Breakage Write-Off">Transit / Yard Breakage Write-Off</option>
                  <option value="Supplier Replacement">Supplier Factory Defect Replacement</option>
                  <option value="System Correction">Data Entry Error Correction</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <Button variant="ghost" size="sm" onClick={() => { setIsAdjustmentOpen(false); setAdjustBatch(null); }}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save Stock Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
