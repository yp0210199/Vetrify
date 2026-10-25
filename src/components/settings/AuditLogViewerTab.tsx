import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  User,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SearchInput, Select } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useWorkspace } from '../../context/WorkspaceContext';
import { auditService } from '../../services/auditService';
import { AuditLog } from '../../types/firestore';
import { formatDate, formatRelativeTime } from '../../lib/formatting/formatters';

export const AuditLogViewerTab: React.FC = () => {
  const { organization } = useWorkspace();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      if (!organization?.id) return;
      setIsLoading(true);
      try {
        const fetched = await auditService.getAuditLogs(organization.id, 100);
        setLogs(fetched);
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [organization?.id]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      log.action.toLowerCase().includes(q) ||
      (log.actorDisplayName && log.actorDisplayName.toLowerCase().includes(q)) ||
      (log.actorEmail && log.actorEmail.toLowerCase().includes(q)) ||
      (log.resourceType && log.resourceType.toLowerCase().includes(q)) ||
      (log.resourceId && log.resourceId.toLowerCase().includes(q));

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const availableActions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Resource Type', 'Resource ID', 'Actor Name', 'Actor Email', 'Details'];
    const rows = filteredLogs.map((l) => [
      l.timestamp ? new Date(l.timestamp.seconds * 1000).toISOString() : '',
      l.action,
      l.resourceType,
      l.resourceId,
      l.actorDisplayName || '',
      l.actorEmail || '',
      JSON.stringify(l.details || {}).replace(/"/g, '""'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rx_omni_audit_log_${organization?.id || 'org'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('revoked') || action.includes('suspended')) {
      return 'bg-[#EF4444]/10 text-[#EF4444] border-[#FECACA]';
    }
    if (action.includes('created') || action.includes('invited')) {
      return 'bg-[#15803D]/10 text-[#15803D] border-[#BBF7D0]';
    }
    if (action.includes('updated')) {
      return 'bg-[#0D5C63]/10 text-[#0D5C63] border-[#0D5C63]/20';
    }
    return 'bg-[#64748B]/10 text-[#475569] border-[#CBD5E1]';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B1F33] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0D5C63]" />
            Immutable Organization Audit Log & Compliance Ledger
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Cryptographically sealed, append-only trail of all administrative and operational transactions.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={handleExportCsv}
          disabled={filteredLogs.length === 0}
        >
          Export CSV Ledger
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <SearchInput
            placeholder="Search audit trail by actor, action, or document ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="all">All Action Types ({logs.length})</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#64748B]">Loading audit ledger...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#64748B]">
            No audit records matching criteria.
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const dateStr = log.timestamp
                ? new Date(log.timestamp.seconds * 1000).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Pending';

              return (
                <div key={log.id} className="p-4 hover:bg-[#F8FAFC]/60 transition-colors">
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-start gap-3">
                      <button className="text-[#64748B] mt-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                          <span className="text-xs font-semibold text-[#0B1F33]">
                            {log.resourceType} : <span className="font-mono text-[#0D5C63]">{log.resourceId}</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#64748B] flex-wrap">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-[#94A3B8]" />
                            {log.actorDisplayName || log.actorEmail || 'System'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[#94A3B8]" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-[#94A3B8] hidden sm:block">
                      ID: {log.id.slice(0, 10)}...
                    </div>
                  </div>

                  {/* Expanded JSON Details */}
                  {isExpanded && (
                    <div className="mt-3 ml-7 p-3.5 bg-[#0B1F33] text-[#E2E8F0] rounded-xl font-mono text-xs overflow-x-auto">
                      <div className="text-[#94A3B8] text-[10px] mb-1 font-semibold uppercase tracking-wider">
                        Event Payload Details
                      </div>
                      <pre className="text-[11px] leading-relaxed">
                        {JSON.stringify(log.details || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
