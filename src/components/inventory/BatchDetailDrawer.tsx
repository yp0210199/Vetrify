import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, Package, MapPin, ClipboardList, ShieldCheck, FileText, Layers, Tag, Grid } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { PharmacyBatch } from '../../types/batch';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { safeToFixed } from '../../lib/formatting/formatters';

interface BatchDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  batch: PharmacyBatch | null;
}

interface MiniAuditLog {
  id: string;
  action: string;
  timestamp: any;
  actorEmail: string | null;
  actorDisplayName: string | null;
  metadata?: any;
}

export const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({
  isOpen,
  onClose,
  batch,
}) => {
  const { organization } = useWorkspace();
  const { error } = useToast();
  
  const [auditLogs, setAuditLogs] = useState<MiniAuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    if (isOpen && batch && organization) {
      fetchBatchAuditLogs();
    } else {
      setAuditLogs([]);
    }
  }, [isOpen, batch, organization?.id]);

  const fetchBatchAuditLogs = async () => {
    if (!organization || !batch) return;
    try {
      setIsLoadingAudit(true);
      const auditRef = collection(db, 'organizations', organization.id, 'auditLogs');
      const q = query(
        auditRef,
        where('entityId', '==', batch.id),
        orderBy('timestamp', 'desc')
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as MiniAuditLog[];
      setAuditLogs(logs);
    } catch (err) {
      console.error('Error loading batch audit footprint:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  if (!isOpen || !batch) return null;

  const mfgDateStr = batch.manufacturingDate
    ? (typeof (batch.manufacturingDate as any).toDate === 'function'
        ? (batch.manufacturingDate as any).toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date(batch.manufacturingDate as any).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }))
    : '—';

  return (
    <div className="fixed inset-0 bg-[#0B1F33]/40 backdrop-blur-xs flex justify-end z-50">
      {/* Click-out backdrop overlay */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-[#E2E8F0] flex flex-col overflow-hidden animate-slide-left">
        {/* Drawer Header */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#64748B] block">Stock Lot & Shade Dossier</span>
            <h3 className="font-extrabold text-[#0B1F33] text-sm flex items-center gap-1.5 font-mono">
              <Layers className="w-4 h-4 text-[#0D5C63]" />
              {batch.shadeNumber || batch.batchNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0B1F33] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
          
          {/* Status Alert Banner */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
            batch.status === 'active'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : batch.status === 'quarantined'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold block">
                {batch.status === 'active'
                  ? 'Sellable Showroom Stock Lot'
                  : batch.status === 'quarantined'
                  ? 'Quarantined Lot (Excluded from Sales)'
                  : `Status: ${batch.status.toUpperCase()}`}
              </span>
              <p className="opacity-90 mt-0.5">
                Current Lot status: <strong className="uppercase font-mono text-[10px]">{batch.status}</strong>. Available for showroom billing and warehouse dispatch.
              </p>
            </div>
          </div>

          {/* Product Info Summary */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">Catalog Item Master</h4>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
              <span className="text-[10px] font-mono font-bold text-[#64748B] block">SKU: {batch.productSku || '—'}</span>
              <span className="font-extrabold text-xs text-[#0B1F33] block mt-0.5">{batch.productName || '—'}</span>
            </div>
          </div>

          {/* Tile Specifications: Shade, Tone, Caliber & Grade */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">Shade, Tone & Caliber Specs</h4>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[9px] text-[#64748B] block font-semibold uppercase">Shade Code</span>
                <span className="text-xs font-bold text-[#0B1F33] font-mono block mt-1">{batch.shadeNumber || batch.batchNumber}</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[9px] text-[#64748B] block font-semibold uppercase">Tone Code</span>
                <span className="text-xs font-bold text-[#0D5C63] font-mono block mt-1">{batch.toneCode || 'Standard'}</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[9px] text-[#64748B] block font-semibold uppercase">Caliber / Grade</span>
                <span className="text-xs font-bold text-[#0B1F33] font-mono block mt-1">{batch.caliberCode || 'Premium'}</span>
              </div>
            </div>
          </div>

          {/* Production & Inward Timeline */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">Manufacturing & Inward Timeline</h4>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] flex items-center gap-2.5">
                <Calendar className="w-4 h-4 text-[#94A3B8]" />
                <div>
                  <span className="text-[10px] text-[#64748B] block">Production Date</span>
                  <span className="text-xs font-bold text-[#0B1F33]">
                    {mfgDateStr}
                  </span>
                </div>
              </div>
              <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#94A3B8]" />
                <div>
                  <span className="text-[10px] text-[#64748B] block">Godown / Yard Bay</span>
                  <span className="text-xs font-bold text-[#0B1F33]">
                    {batch.storageLocation || 'Main Yard A-01'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quantities */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">Physical Stock Balances (Boxes / Units)</h4>
            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[9px] text-[#64748B] block font-semibold uppercase">Total Inwarded</span>
                <span className="text-sm font-bold text-[#0B1F33] font-mono-num block mt-1">{batch.quantity}</span>
              </div>
              <div className="bg-[#F8FAFC] p-2.5 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[9px] text-[#64748B] block font-semibold uppercase">Reserved / In Cart</span>
                <span className="text-sm font-bold text-amber-600 font-mono-num block mt-1">{batch.reservedQuantity}</span>
              </div>
              <div className="bg-teal-50/50 p-2.5 rounded-2xl border border-teal-200 text-teal-900">
                <span className="text-[9px] text-teal-700 block font-bold uppercase">Sellable Available</span>
                <span className="text-sm font-black font-mono-num block mt-1">{batch.availableQuantity}</span>
              </div>
            </div>
          </div>

          {/* Pricing Info */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B]">Commercial Rate Structure</h4>
            <div className="bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]/80 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#64748B]">Purchase Unit Cost (Net GST):</span>
                <strong className="font-mono text-[#0B1F33]">₹{safeToFixed(batch.purchasePrice)}</strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-2">
                <span className="text-[#64748B]">Max Retail Price (MRP):</span>
                <strong className="font-mono text-[#0B1F33]">₹{safeToFixed(batch.mrp)}</strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-2">
                <span className="text-[#64748B]">Showroom Sale Price:</span>
                <strong className="font-mono text-[#0D5C63]">₹{safeToFixed(batch.salePrice)}</strong>
              </div>
            </div>
          </div>

          {/* Notes */}
          {batch.notes && (
            <div className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] text-xs">
              <span className="font-bold text-[#475569] block mb-1">Inwarding Remarks</span>
              <p className="text-[#64748B] leading-relaxed italic">"{batch.notes}"</p>
            </div>
          )}

          {/* Tamper-Proof Audit Footprint */}
          <div className="space-y-2.5 border-t border-[#E2E8F0] pt-4">
            <h4 className="text-[11px] uppercase font-extrabold tracking-wider text-[#64748B] flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-[#94A3B8]" />
              Immutable Audit Footprint
            </h4>

            {isLoadingAudit ? (
              <div className="space-y-2.5">
                <div className="h-10 bg-[#F1F5F9] animate-pulse rounded-xl" />
                <div className="h-10 bg-[#F1F5F9] animate-pulse rounded-xl" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
                <FileText className="w-5 h-5 mx-auto text-[#CBD5E1] mb-1.5" />
                No custom audit actions recorded yet.
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#E2E8F0]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="relative pl-6 text-xs flex flex-col">
                    <div className="absolute left-[9px] top-1.5 w-1.5 h-1.5 rounded-full bg-[#0D5C63] ring-4 ring-white" />
                    <span className="font-bold text-[#0B1F33] capitalize">{log.action.replace('batch.', '')}</span>
                    <span className="text-[10px] text-[#64748B] mt-0.5">
                      {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString('en-IN') : '—'} by {log.actorDisplayName || log.actorEmail || 'System'}
                    </span>
                    {log.metadata?.updatedFields && (
                      <span className="text-[10px] bg-[#F1F5F9] text-[#475569] px-1.5 py-0.5 rounded mt-1.5 self-start font-mono text-[9px]">
                        Modified: {log.metadata.updatedFields.join(', ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
