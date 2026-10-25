import React, { useState, useEffect } from 'react';
import {
  Search,
  Pill,
  Users,
  Building2,
  Receipt,
  FileText,
  Clock,
  ArrowRight,
  X,
  CornerDownLeft,
  Sparkles,
  CheckSquare,
  ShieldAlert,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { globalSearchService } from '../../services/globalSearchService';
import { SearchResult, NavModuleId } from '../../types';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult?: (route: string, item: any) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose, onSelectResult }) => {
  const { organization, currentStore } = useWorkspace();
  const orgId = organization?.id || '';

  const [queryText, setQueryText] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'products' | 'batches' | 'customers' | 'invoices' | 'tasks' | 'audit'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Execute live search
  useEffect(() => {
    if (!orgId || queryText.trim().length < 2) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const matches = await globalSearchService.searchAll(
          orgId,
          currentStore ? currentStore.id : null,
          queryText,
          activeCategory
        );
        setResults(matches);
      } catch (err) {
        console.warn('Live search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250); // 250ms debounce

    return () => clearTimeout(delayDebounce);
  }, [orgId, currentStore?.id, queryText, activeCategory]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Records' },
    { id: 'products', label: 'Medicines' },
    { id: 'batches', label: 'Batches' },
    { id: 'customers', label: 'Customers' },
    { id: 'invoices', label: 'Invoices & Orders' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'audit', label: 'Audits' },
  ];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'Product':
      case 'Batch':
        return Pill;
      case 'Customer':
        return Users;
      case 'Invoice':
        return Receipt;
      case 'Purchase Order':
      case 'GRN':
        return FileText;
      case 'Task':
        return CheckSquare;
      case 'Audit Log':
        return ShieldAlert;
      default:
        return FileText;
    }
  };

  const getBadgeStyle = (status: string, type: string) => {
    const s = status.toUpperCase();
    if (s === 'ACTIVE' || s === 'PAID' || s === 'COMPLETED' || s === 'IMMUTABLE') {
      return 'text-[#15803D] bg-[#DCFCE7]';
    }
    if (s === 'URGENT' || s === 'BLOCKED' || s === 'EXPIRED') {
      return 'text-red-700 bg-red-50';
    }
    if (s === 'OPEN' || s === 'DRAFT' || s === 'ASSIGNED') {
      return 'text-[#0D5C63] bg-[#E6F4F1]';
    }
    return 'text-slate-600 bg-slate-100';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-[#0B1F33]/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#CBD5E1] overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E2E8F0] gap-3 bg-white">
          <Search className="w-5 h-5 text-[#0D5C63] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search medicines, batches, customers, invoices, POs, tasks... (e.g. Paracetamol, rahul)"
            className="w-full text-base text-[#0B1F33] placeholder-[#94A3B8] focus:outline-none"
          />
          {queryText ? (
            <button
              onClick={() => setQueryText('')}
              className="p-1 text-[#94A3B8] hover:text-[#0B1F33] rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] rounded shadow-2xs font-mono">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Categories Bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-[#0D5C63] text-white'
                  : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-[#F1F5F9]">
          {queryText.trim().length < 2 ? (
            /* Recent Searches & Quick Suggestions Foundation */
            <div className="py-2 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5 px-2">
                  <Clock className="w-3.5 h-3.5" /> Quick Suggestions
                </span>
                <div className="mt-2 space-y-1">
                  {[
                    { text: 'Paracetamol', category: 'Medicine' },
                    { text: 'Batch', category: 'Batch / SKU' },
                    { text: 'Rahul', category: 'Customer' },
                    { text: 'Invoice', category: 'Invoice' },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQueryText(item.text)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-[#F1F5F9] text-left transition-colors cursor-pointer group"
                    >
                      <span className="font-medium text-[#0B1F33] group-hover:text-[#0D5C63]">{item.text}</span>
                      <span className="text-[10px] text-[#64748B] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                        {item.category}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#E6F4F1]/60 rounded-xl p-3 border border-[#0D5C63]/20 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#0D5C63] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#0D5C63] leading-relaxed">
                  <strong className="font-bold">Live Global Search Connected:</strong> Typing queries live-scans across your active organization products, batches, customer records, billing registers, task flows, and regulatory audit entries.
                </p>
              </div>
            </div>
          ) : searching ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Clock className="w-6 h-6 animate-spin text-[#0D5C63]" />
              <p className="text-xs font-semibold">Searching database records...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
              <p className="text-sm font-bold mt-2">No matching records found</p>
              <p className="text-xs mt-1">Refine your search spelling or change the category filter.</p>
            </div>
          ) : (
            /* Filtered Search Output Visual Foundation */
            <div className="py-2 space-y-2">
              <div className="px-2 py-1 flex items-center justify-between text-xs text-[#64748B]">
                <span>Showing search results for &ldquo;<strong>{queryText}</strong>&rdquo;</span>
                <span>{results.length} items found</span>
              </div>

              <div className="space-y-1">
                {results.map((res, i) => {
                  const Icon = getEntityIcon(res.entityType);
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        onSelectResult?.(res.route, res);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#F8FAFC] border border-transparent hover:border-[#CBD5E1] transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] text-[#0D5C63] flex items-center justify-center flex-shrink-0 group-hover:bg-[#0D5C63] group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-sm font-bold text-[#0B1F33] group-hover:text-[#0D5C63] flex items-center gap-2">
                            {res.title}
                            <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {res.entityType}
                            </span>
                          </h5>
                          <p className="text-xs text-[#64748B]">{res.subtitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {res.status && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeStyle(res.status, res.entityType)}`}>
                            {res.status}
                          </span>
                        )}
                        <ArrowRight className="w-4 h-4 text-[#94A3B8] group-hover:text-[#0D5C63] transition-colors" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Search Footer */}
        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white border border-[#CBD5E1] rounded text-[10px]">ESC</kbd> to exit
            </span>
          </div>
          <span className="font-semibold text-[#0D5C63]">Vetrify Search Center</span>
        </div>
      </div>
    </div>
  );
};
