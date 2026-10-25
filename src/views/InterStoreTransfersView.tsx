import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Truck,
  PackageCheck,
  AlertTriangle,
  Store,
  Sparkles,
  DollarSign,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select, SearchInput } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  StockTransferRequest,
  StockTransferStatus,
  StockTransferMetrics,
  RebalanceRecommendation,
} from '../types/transfer';
import { transferService } from '../services/transferService';
import { useWorkspace } from '../context/WorkspaceContext';
import { CreateTransferModal } from '../components/transfers/CreateTransferModal';
import { TransferDetailDrawer } from '../components/transfers/TransferDetailDrawer';
import { RebalanceRecommendationsPanel } from '../components/transfers/RebalanceRecommendationsPanel';
import { safeToFixed, formatDisplayDate } from '../lib/formatting/formatters';

export const InterStoreTransfersView: React.FC = () => {
  const { organization, currentStore, stores } = useWorkspace();

  const [transfers, setTransfers] = useState<StockTransferRequest[]>([]);
  const [metrics, setMetrics] = useState<StockTransferMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter state
  const [activeTab, setActiveTab] = useState<'all' | 'in_transit' | 'pending' | 'rebalance'>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransferRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Recommendation prefill state
  const [prefilledRecommendation, setPrefilledRecommendation] = useState<RebalanceRecommendation | null>(null);

  const loadData = async () => {
    if (!organization) return;
    try {
      setIsLoading(true);

      const storeIdToFilter = selectedStoreId !== 'all' ? selectedStoreId : undefined;
      const effectiveStatus =
        activeTab === 'pending'
          ? 'PENDING_APPROVAL'
          : activeTab === 'in_transit'
          ? 'DISPATCHED'
          : statusFilter;

      const [res, metricsRes] = await Promise.all([
        transferService.getTransferRequests(organization.id, {
          storeId: storeIdToFilter,
          status: effectiveStatus,
          pageSize: 100,
        }),
        transferService.getTransferMetrics(organization.id, storeIdToFilter),
      ]);

      setTransfers(res.transfers);
      setMetrics(metricsRes);
    } catch (e) {
      console.error('Failed to load stock transfers data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [organization?.id, selectedStoreId, statusFilter, activeTab]);

  const handleOpenRecommendation = (rec: RebalanceRecommendation) => {
    setPrefilledRecommendation(rec);
    setIsCreateModalOpen(true);
  };

  const filteredTransfers = transfers.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceStoreName.toLowerCase().includes(q) ||
      t.destinationStoreName.toLowerCase().includes(q) ||
      t.requestedByName.toLowerCase().includes(q) ||
      t.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
    );
  });

  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="bg-[#FEF3C7] text-[#D97706] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Approval
          </span>
        );
      case 'APPROVED':
      case 'ALLOCATED':
        return (
          <span className="bg-[#E6F4F1] text-[#0D5C63] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            Approved & Allocated
          </span>
        );
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        return (
          <span className="bg-[#E0F2FE] text-[#0284C7] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            <Truck className="w-3 h-3" /> In-Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> Received
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="bg-[#FEF3C7] text-[#B45309] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Discrepancy / Partial
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="bg-[#FEE2E2] text-[#DC2626] font-bold px-2.5 py-1 rounded-full text-xs inline-flex items-center gap-1">
            {status}
          </span>
        );
      default:
        return (
          <span className="bg-[#F1F5F9] text-[#64748B] font-bold px-2.5 py-1 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F33] flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#0D5C63]" />
            Inter-Store Stock Transfers & Branch Rebalancing
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Manage multi-branch inventory transfers, FEFO batch allocations, in-transit tracking, and rule-based rebalancing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={RefreshCw} onClick={loadData} isLoading={isLoading}>
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setPrefilledRecommendation(null);
              setIsCreateModalOpen(true);
            }}
          >
            New Transfer Request
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#64748B]">Total Transfers</span>
          <p className="text-lg font-bold font-mono text-[#0B1F33]">
            {metrics?.totalTransfersCount ?? 0}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#D97706] flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending Approvals
          </span>
          <p className="text-lg font-bold font-mono text-[#D97706]">
            {metrics?.pendingApprovalCount ?? 0}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#0284C7] flex items-center gap-1">
            <Truck className="w-3 h-3" /> In-Transit
          </span>
          <p className="text-lg font-bold font-mono text-[#0284C7]">
            {metrics?.inTransitCount ?? 0}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#16A34A] flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> Completed
          </span>
          <p className="text-lg font-bold font-mono text-[#16A34A]">
            {metrics?.completedCount ?? 0}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#0D5C63] flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Rebalance Alerts
          </span>
          <p className="text-lg font-bold font-mono text-[#0D5C63]">
            {metrics?.rebalanceAlertsCount ?? 0}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E2E8F0] shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-[#64748B]">Value In-Transit</span>
          <p className="text-lg font-bold font-mono text-[#0D5C63]">
            ₹{safeToFixed(metrics?.totalValueInTransit || 0)}
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-[#CBD5E1] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
          {/* Sub Tabs */}
          <div className="flex gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#0D5C63] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              All Transfers
            </button>
            <button
              onClick={() => setActiveTab('in_transit')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'in_transit'
                  ? 'bg-[#0284C7] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" /> In-Transit ({metrics?.inTransitCount ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[#D97706] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Pending Approvals ({metrics?.pendingApprovalCount ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('rebalance')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'rebalance'
                  ? 'bg-[#0D5C63] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Multi-Branch Rebalancing
            </button>
          </div>

          {/* Branch & Status Selectors */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-xs w-48"
            >
              <option value="all">All Store Branches</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>

            {activeTab === 'all' && (
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs w-44"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved / Allocated</option>
                <option value="DISPATCHED">Dispatched / In-Transit</option>
                <option value="RECEIVED">Received</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            )}
          </div>
        </div>

        {activeTab !== 'rebalance' && (
          <div className="flex items-center justify-between gap-3">
            <SearchInput
              placeholder="Filter transfers by STR number, store name, requested medicine, or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md"
            />
            <span className="text-xs font-mono text-[#64748B]">
              Showing {filteredTransfers.length} transfer records
            </span>
          </div>
        )}
      </div>

      {/* Main Body Content based on Active Tab */}
      {activeTab === 'rebalance' ? (
        <RebalanceRecommendationsPanel onSelectRecommendation={handleOpenRecommendation} />
      ) : (
        <div className="bg-white rounded-xl border border-[#CBD5E1] overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <th className="py-3 px-4">Transfer Ref</th>
                <th className="py-3 px-4">Route (Source → Destination)</th>
                <th className="py-3 px-4 text-center">Items & Qty</th>
                <th className="py-3 px-4 text-right">Transfer Valuation</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Date Requested</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    Loading stock transfer records...
                  </td>
                </tr>
              ) : filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    No stock transfer requests match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedTransfer(t);
                      setIsDrawerOpen(true);
                    }}
                    className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4">
                      <p className="font-mono font-bold text-[#0D5C63]">{t.transferNumber}</p>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          t.priority === 'EMERGENCY'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : t.priority === 'URGENT'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[#0B1F33] font-bold">
                        <span>{t.sourceStoreName}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                        <span>{t.destinationStoreName}</span>
                      </div>
                      <p className="text-[10px] text-[#64748B]">Requested by: {t.requestedByName}</p>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-bold text-[#0B1F33]">{t.itemsCount} items</span>
                      <p className="text-[10px] text-[#64748B] font-mono">{t.totalRequestedQty} units</p>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0D5C63]">
                      ₹{safeToFixed(t.totalTransferValue)}
                    </td>

                    <td className="py-3 px-4 text-center">{getStatusBadge(t.status)}</td>

                    <td className="py-3 px-4 text-center font-mono text-[#64748B]">
                      {formatDisplayDate(t.createdAt)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <Button variant="ghost" size="xs">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Transfer Modal */}
      <CreateTransferModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        prefilledSourceStoreId={prefilledRecommendation?.sourceStoreId}
        prefilledDestinationStoreId={prefilledRecommendation?.destinationStoreId}
        prefilledProductId={prefilledRecommendation?.productId}
        prefilledQty={prefilledRecommendation?.suggestedTransferQty}
      />

      {/* Transfer Detail & Action Drawer */}
      <TransferDetailDrawer
        transfer={selectedTransfer}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={() => {
          loadData();
          if (selectedTransfer && organization) {
            transferService.getTransferById(organization.id, selectedTransfer.id).then((t) => {
              if (t) setSelectedTransfer(t);
            });
          }
        }}
      />
    </div>
  );
};
