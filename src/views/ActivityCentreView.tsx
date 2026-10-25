import React, { useState, useEffect } from 'react';
import {
  Activity,
  Filter,
  CheckSquare,
  ShieldAlert,
  Bell,
  Cpu,
  Clock,
  ChevronRight,
  TrendingUp,
  Inbox,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { activityService } from '../services/activityService';
import { ActivityEvent, NavModuleId } from '../types';

interface ActivityCentreViewProps {
  onNavigateToModule: (moduleId: NavModuleId) => void;
}

export const ActivityCentreView: React.FC<ActivityCentreViewProps> = ({ onNavigateToModule }) => {
  const { organization, currentStore } = useWorkspace();
  const orgId = organization?.id || '';

  // State
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'audit' | 'task' | 'notification' | 'system'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'success'>('all');

  const loadStream = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const stream = await activityService.getActivityStream(orgId, currentStore ? currentStore.id : null, 100);
      setEvents(stream);
    } catch (err) {
      console.warn('Failed to load activity stream', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStream();
  }, [orgId, currentStore?.id]);

  // Filter local events
  const filteredEvents = events.filter((ev) => {
    if (typeFilter !== 'all' && ev.type !== typeFilter) return false;
    if (severityFilter !== 'all' && ev.severity !== severityFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-slate-50 overflow-y-auto pb-12" id="activity-centre-root">
      {/* Banner */}
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Activity className="w-5.5 h-5.5 text-sky-600" />
              Unified Activity Centre
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Real-time chronological timeline fusing task updates, audit logs, and system notifications.
            </p>
          </div>
          <button
            onClick={loadStream}
            className="self-start sm:self-center text-xs font-bold px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Refresh Stream
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 w-full space-y-6">
        {/* Filters Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Event Type */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="all">All Activities</option>
                <option value="audit">Audit Logs Only</option>
                <option value="task">Tasks Logs Only</option>
                <option value="notification">In-App Notifications</option>
              </select>
            </div>

            {/* Filter by Severity */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error / Critical</option>
                <option value="success">Success</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            Stream Volume: {filteredEvents.length} items
          </div>
        </div>

        {/* Timeline Component */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Clock className="w-8 h-8 animate-spin text-sky-600" />
            <p className="text-xs font-semibold">Aggregating timeline streams...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <Inbox className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold mt-3">No activity matching active criteria</p>
            <p className="text-xs mt-1">Timeline streams are compiled in real-time from active store nodes.</p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4.5 pl-6.5 space-y-6">
            {filteredEvents.map((ev) => {
              // Icon styling depending on action type
              const typeIcon = () => {
                switch (ev.type) {
                  case 'task':
                    return <CheckSquare className="w-4 h-4 text-emerald-600" />;
                  case 'audit':
                    return <ShieldAlert className="w-4 h-4 text-rose-600" />;
                  case 'notification':
                    return <Bell className="w-4 h-4 text-amber-500" />;
                  default:
                    return <Cpu className="w-4 h-4 text-slate-600" />;
                }
              };

              const severityIndicator = {
                info: 'bg-blue-100 border-blue-200',
                warning: 'bg-amber-100 border-amber-200',
                error: 'bg-rose-100 border-rose-200 animate-pulse',
                success: 'bg-emerald-100 border-emerald-200',
              };

              const date = ev.timestamp?.toDate ? ev.timestamp.toDate() : new Date(ev.timestamp);

              return (
                <div key={ev.id} className="relative bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all hover:border-sky-200 hover:shadow-sm">
                  {/* Timeline point bullet */}
                  <span className={`absolute -left-[41px] top-4.5 w-6.5 h-6.5 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${severityIndicator[ev.severity] || 'border-slate-200'}`}>
                    {typeIcon()}
                  </span>

                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">
                      {ev.title}
                      <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                        {ev.type}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {ev.description}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {date.toLocaleString()}
                      </span>
                      {ev.actorName && (
                        <span>Actor: {ev.actorName}</span>
                      )}
                    </div>
                  </div>

                  {ev.route && (
                    <button
                      onClick={() => onNavigateToModule(ev.route as NavModuleId)}
                      className="self-end sm:self-center flex items-center gap-1.5 text-sky-700 hover:text-sky-900 text-[11px] font-extrabold bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      Inspect Source
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
