import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase/config';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { ClipboardList, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { TableSkeleton } from '../common/LoadingSkeleton';

interface AuditLogRecord {
  id: string;
  action: string;
  timestamp: any;
  actorEmail: string | null;
  actorDisplayName: string | null;
  entityType: string;
  entityId: string;
  metadata?: {
    batchNumber?: string;
    productName?: string;
    updatedFields?: string[];
    quantity?: number;
    [key: string]: any;
  };
}

export const BatchAdjustmentsPanel: React.FC = () => {
  const { organization } = useWorkspace();
  const { error } = useToast();
  
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdjustmentLogs = async () => {
    if (!organization) return;
    try {
      setIsLoading(true);
      const ref = collection(db, 'organizations', organization.id, 'auditLogs');
      // Query batch modifications/creations ordered by timestamp
      const q = query(
        ref,
        where('entityType', '==', 'batch'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const snap = await getDocs(q);
      const fetched = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as AuditLogRecord[];

      setLogs(fetched);
    } catch (err: any) {
      console.error('Error fetching audit adjustments:', err);
      // Fallback: don't crash if index is building or query fails
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchAdjustmentLogs();
    }
  }, [organization?.id]);

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-[#0B1F33] text-sm">Discrepancy & Stock Audit Logs</h4>
          <p className="text-xs text-[#64748B]">Real-time, immutable transaction logs for all stock inwarding and manual adjustments</p>
        </div>
        <button
          onClick={fetchAdjustmentLogs}
          className="p-1.5 text-[#64748B] hover:text-[#0B1F33] hover:bg-white rounded-lg transition-all border border-transparent hover:border-[#E2E8F0] cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Logs
        </button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-[#64748B]">
          <ClipboardList className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
          <h5 className="font-bold text-[#0B1F33] text-xs">No stock adjustment audits recorded yet</h5>
          <p className="text-[11px] text-[#64748B] max-w-xs mx-auto mt-1">
            Perform batch lot inwarding or adjust quantities inside the Batch Ledger tab to populate audit logs.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Action Type</th>
                  <th className="py-3 px-3">Target Batch</th>
                  <th className="py-3 px-3">Performed By</th>
                  <th className="py-3 px-3">Details / Audit Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]/50 transition-colors">
                    <td className="py-3.5 px-3 font-semibold text-[#0B1F33]">
                      {log.timestamp ? new Date(log.timestamp.toMillis()).toLocaleString('en-IN') : '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded capitalize ${
                        log.action === 'batch.created'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.action === 'batch.archived'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {log.action.replace('batch.', '')}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-[#0B1F33]">
                      {log.metadata?.batchNumber || '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-[#0B1F33]">{log.actorDisplayName || 'System'}</span>
                      <span className="text-[10px] text-[#64748B] block">{log.actorEmail || 'system@vetrify.com'}</span>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs text-ellipsis overflow-hidden">
                      {log.metadata?.productName && (
                        <div className="font-extrabold text-[#0B1F33] truncate">
                          {log.metadata.productName}
                        </div>
                      )}
                      {log.metadata?.updatedFields && (
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Updated fields: <code className="bg-[#F1F5F9] px-1 py-0.5 rounded text-red-700 font-mono">{log.metadata.updatedFields.join(', ')}</code>
                        </div>
                      )}
                      {log.metadata?.quantity !== undefined && (
                        <div className="text-[10px] text-[#64748B] mt-0.5">
                          Inward Quantity: <strong>{log.metadata.quantity}</strong>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
