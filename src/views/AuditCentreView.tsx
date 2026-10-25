import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  Clock,
  User,
  CheckCircle,
  FileText,
  TrendingUp,
  X,
  FileCode,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { auditService } from '../services/auditService';
import { ExtendedAuditLog, AuditSeverity } from '../types';

export const AuditCentreView: React.FC = () => {
  const { organization, currentStore } = useWorkspace();
  const orgId = organization?.id || '';

  // State Management
  const [logs, setLogs] = useState<ExtendedAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ExtendedAuditLog | null>(null);

  // Filter States
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRangeOption, setDateRangeOption] = useState<'all' | 'today' | '7days' | '30days'>('all');

  // Load Audit Logs
  const loadLogs = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      let startDate: Date | undefined;
      const now = new Date();
      if (dateRangeOption === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRangeOption === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRangeOption === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const fetchedLogs = await auditService.getFilteredAuditLogs(orgId, {
        storeId: currentStore ? currentStore.id : null,
        module: moduleFilter || undefined,
        severity: severityFilter || undefined,
        startDate,
        searchTerm: searchTerm || undefined,
      });

      setLogs(fetchedLogs);
    } catch (err) {
      console.warn('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [orgId, currentStore?.id, moduleFilter, severityFilter, dateRangeOption, searchTerm]);

  // Export as CSV
  const handleExportCSV = () => {
    if (logs.length === 0) return;
    try {
      const headers = ['Log ID', 'Timestamp', 'Actor Name', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'Module', 'Reason'];
      const csvRows = [headers.join(',')];

      logs.forEach((log) => {
        const timestamp = log.timestamp?.toDate ? log.timestamp.toDate().toISOString() : new Date(log.timestamp).toISOString();
        const row = [
          log.id,
          timestamp,
          `"${log.actorName || 'Staff'}"`,
          `"${log.actorRole || 'Staff'}"`,
          log.action,
          log.entityType,
          log.entityId,
          log.severity,
          log.module,
          `"${(log.reason || '').replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `rx_omni_audit_export_${Date.now()}.csv`);
      a.click();
    } catch (err) {
      console.warn('Export failed', err);
    }
  };

  // Comparative Diff Helper
  const renderStateDiff = (before: Record<string, any> | null, after: Record<string, any> | null) => {
    if (!before && !after) {
      return <p className="text-[11px] font-bold text-slate-400">No raw data states captured for this log.</p>;
    }

    const b = before || {};
    const a = after || {};
    const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)])).sort();

    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden text-left font-mono text-[11px] divide-y divide-slate-100 bg-slate-50 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2 bg-slate-100 px-3 py-2 font-black text-slate-500 border-b border-slate-200">
          <div>Field Key</div>
          <div>Before Value</div>
          <div>After Value</div>
        </div>
        {allKeys.map((key) => {
          const valB = b[key];
          const valA = a[key];
          const isChanged = JSON.stringify(valB) !== JSON.stringify(valA);

          const strB = valB === undefined ? '—' : typeof valB === 'object' && valB !== null ? JSON.stringify(valB) : String(valB);
          const strA = valA === undefined ? '—' : typeof valA === 'object' && valA !== null ? JSON.stringify(valA) : String(valA);

          return (
            <div
              key={key}
              className={`grid grid-cols-3 gap-2 px-3 py-1.5 font-semibold transition-colors ${
                isChanged ? 'bg-amber-50/70 text-amber-900 font-bold' : 'text-slate-600'
              }`}
            >
              <div className="truncate text-slate-800 font-bold">{key}</div>
              <div className={`truncate ${isChanged && valB !== undefined ? 'text-red-600 line-through' : ''}`}>
                {strB}
              </div>
              <div className={`truncate ${isChanged && valA !== undefined ? 'text-emerald-700 bg-emerald-50 px-1 rounded font-bold' : ''}`}>
                {strA}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Aggregated breakdown for KPI metrics
  const logsCount = logs.length;
  const criticalCount = logs.filter(l => l.severity === 'CRITICAL' || l.severity === 'HIGH').length;
  const userActionCount = logs.filter(l => l.actorType === 'staff').length;
  const sysActionCount = logs.filter(l => l.actorType === 'system' || l.actorType === 'api').length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-slate-50 overflow-y-auto pb-12" id="audit-centre-root">
      {/* Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5.5 h-5.5 text-red-600" />
              Operational Investigation & Audit Centre
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Immutable workspace monitoring, tamper-evident regulatory trails, and system telemetry logging.
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed self-start"
          >
            <Download className="w-4 h-4" />
            Export Audit Trail (CSV)
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 w-full space-y-6">
        {/* KPI metrics row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Scrutinized</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{logsCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Critical Anomalies</p>
              <h3 className="text-xl font-black text-red-600 leading-none mt-1">{criticalCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Staff Actions</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{userActionCount}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">System Automations</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{sysActionCount}</h3>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4.5 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] md:flex-initial">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search actor, action, or log..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0D5C63] focus:bg-white"
              />
            </div>

            {/* Quick Date Range */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={dateRangeOption}
                onChange={(e) => setDateRangeOption(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="all">All Logs</option>
                <option value="today">Today Only</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>

            {/* Module Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="">All Modules</option>
                <option value="inventory">Inventory</option>
                <option value="pos">Retail POS</option>
                <option value="purchases">Purchases</option>
                <option value="transfers">Stock Transfers</option>
                <option value="compliance">Compliance</option>
                <option value="tasks">Task Engine</option>
                <option value="settings">System Rules</option>
              </select>
            </div>

            {/* Severity Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="">All Severities</option>
                <option value="INFO">Info</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <button
            onClick={loadLogs}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer"
          >
            Force Refresh
          </button>
        </div>

        {/* Audit Log Timeline Board */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Clock className="w-8 h-8 animate-spin text-red-600" />
            <p className="text-xs font-semibold">Reading immutable database logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <ShieldAlert className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold mt-3">No matching audit events captured</p>
            <p className="text-xs mt-1">Immutable logging records every update to products, batches, sales, and settings automatically.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {logs.map((log) => {
              const severityColors = {
                INFO: 'bg-slate-50 text-slate-600 border-slate-200',
                LOW: 'bg-blue-50 text-blue-700 border-blue-100',
                MEDIUM: 'bg-amber-50 text-amber-700 border-amber-100',
                HIGH: 'bg-orange-50 text-orange-700 border-orange-100',
                CRITICAL: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
              };

              const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50 transition-all cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${severityColors[log.severity || 'INFO']}`}>
                      {log.severity || 'INFO'}
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800">
                          {log.action} on {log.entityType}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                          {log.module}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Actor: <span className="font-bold text-slate-700">{log.actorName || 'Staff'}</span> ({log.actorRole || 'Staff'}) • ID: {log.entityLabel || log.entityId}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-slate-400 italic font-medium">
                          Reason: {log.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0 self-end md:self-center text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {logDate.toLocaleString()}
                    </span>
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {log.source || 'web'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Audit Detail Slide-out Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 font-mono">
                  LOG ID: {selectedLog.id}
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedLog.module}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 py-6 space-y-6">
              {/* Event Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actor Information</p>
                  <p className="font-bold text-slate-800 mt-1">{selectedLog.actorName || 'Staff'}</p>
                  <p className="text-slate-500 mt-0.5 font-medium">{selectedLog.actorRole || 'Staff'} • {selectedLog.actorType || 'staff'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Timestamp</p>
                  <p className="font-bold text-slate-800 mt-1">
                    {selectedLog.timestamp?.toDate ? selectedLog.timestamp.toDate().toLocaleString() : new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                  <p className="text-slate-500 mt-0.5 font-medium">Source: {selectedLog.source} • Severity: {selectedLog.severity}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Entity Ref</p>
                  <p className="font-bold text-slate-800 mt-1">{selectedLog.entityType} ({selectedLog.entityLabel || selectedLog.entityId})</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-mono truncate">ID: {selectedLog.entityId}</p>
                </div>
                {selectedLog.correlationId && (
                  <div className="col-span-2 pt-2 border-t border-slate-200 flex justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correlation Token</p>
                      <p className="font-mono text-[10px] text-slate-700 font-bold mt-0.5">{selectedLog.correlationId}</p>
                    </div>
                    {selectedLog.transactionId && (
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Txn Token</p>
                        <p className="font-mono text-[10px] text-slate-700 font-bold mt-0.5">{selectedLog.transactionId}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* State Difference Visual Diff */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#0D5C63]" />
                  State Difference Tracking (Before vs. After)
                </h4>
                {renderStateDiff(selectedLog.before, selectedLog.after)}
              </div>

              {/* Extra Metadata Fields */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Captured Context Payload</h4>
                  <pre className="text-[10px] font-mono font-semibold bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
