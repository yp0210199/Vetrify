import React, { useState } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  AlertTriangle,
  FileText,
  User,
  Store,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  XCircle,
  Sparkles,
  Send,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { StockTransferRequest, StockTransferStatus } from '../../types/transfer';
import { transferService } from '../../services/transferService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { safeToFixed, formatDisplayDate } from '../../lib/formatting/formatters';

interface TransferDetailDrawerProps {
  transfer: StockTransferRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const TransferDetailDrawer: React.FC<TransferDetailDrawerProps> = ({
  transfer,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const { organization, hasPermission } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'items' | 'fefo' | 'dispatch' | 'receipt'>('items');

  // Dispatch details state
  const [driverName, setDriverName] = useState<string>('');
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  // Receipt details state
  const [receiptNotes, setReceiptNotes] = useState<string>('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>('');
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({});

  if (!isOpen || !transfer) return null;

  const canApprove = hasPermission('stock_transfer.approve') || hasPermission('inventory.transfer');
  const canDispatch = hasPermission('stock_transfer.dispatch') || hasPermission('inventory.transfer');
  const canReceive = hasPermission('stock_transfer.receive') || hasPermission('inventory.transfer');
  const canManage = hasPermission('stock_transfer.manage') || hasPermission('inventory.transfer');

  const caller = {
    uid: user?.uid || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
  };

  const handleApprove = async () => {
    if (!organization) return;
    try {
      setIsProcessing(true);
      await transferService.approveTransferRequest(organization.id, transfer.id, caller);
      success('Stock transfer request approved & FEFO batches allocated.', 'Transfer Approved');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to approve transfer.', 'Approval Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAllocateFEFO = async () => {
    if (!organization) return;
    try {
      setIsProcessing(true);
      await transferService.allocateFEFOForTransfer(organization.id, transfer.id, caller);
      success('FEFO batch allocation calculated successfully.', 'FEFO Allocated');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to allocate FEFO.', 'Allocation Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = async () => {
    if (!organization) return;
    try {
      setIsProcessing(true);
      await transferService.dispatchTransfer(organization.id, transfer.id, caller, {
        driverName,
        vehicleNumber,
        trackingNumber,
        dispatchNotes,
      });
      success('Stock transfer dispatched & source inventory deducted.', 'Transfer Dispatched');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to dispatch transfer.', 'Dispatch Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReceive = async () => {
    if (!organization) return;
    try {
      setIsProcessing(true);
      await transferService.receiveTransfer(organization.id, transfer.id, caller, {
        receivedItemQtyMap: receivedQtyMap,
        receiptNotes,
        discrepancyNotes,
      });
      success('Stock transfer received & destination inventory updated.', 'Transfer Received');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to receive transfer.', 'Receipt Error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!organization) return;
    const reason = prompt('Please enter reason for rejecting transfer request:');
    if (!reason) return;

    try {
      setIsProcessing(true);
      await transferService.rejectTransfer(organization.id, transfer.id, caller, reason);
      success('Stock transfer rejected.', 'Transfer Rejected');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to reject transfer.', 'Action Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!organization) return;
    const reason = prompt('Please enter reason for cancelling transfer request:');
    if (!reason) return;

    try {
      setIsProcessing(true);
      await transferService.cancelTransfer(organization.id, transfer.id, caller, reason);
      success('Stock transfer request cancelled.', 'Transfer Cancelled');
      onRefresh();
    } catch (err: any) {
      error(err?.message || 'Failed to cancel transfer.', 'Action Failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: StockTransferStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="bg-[#FEF3C7] text-[#D97706] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Pending Approval
          </span>
        );
      case 'APPROVED':
      case 'ALLOCATED':
        return (
          <span className="bg-[#E6F4F1] text-[#0D5C63] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved & FEFO Ready
          </span>
        );
      case 'DISPATCHED':
      case 'IN_TRANSIT':
        return (
          <span className="bg-[#E0F2FE] text-[#0284C7] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" /> In-Transit / Dispatched
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="bg-[#DCFCE7] text-[#16A34A] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5" /> Received & Settled
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="bg-[#FEF3C7] text-[#B45309] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Partially Received
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="bg-[#FEE2E2] text-[#DC2626] font-bold px-2.5 py-1 rounded-full text-xs flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> {status}
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-3xl h-full flex flex-col shadow-2xl border-l border-[#CBD5E1] animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-[#E6F4F1] text-[#0D5C63] px-2 py-0.5 rounded">
                {transfer.transferNumber}
              </span>
              {getStatusBadge(transfer.status)}
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  transfer.priority === 'EMERGENCY'
                    ? 'bg-[#FEE2E2] text-[#DC2626]'
                    : transfer.priority === 'URGENT'
                    ? 'bg-[#FEF3C7] text-[#D97706]'
                    : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {transfer.priority} Priority
              </span>
            </div>
            <h2 className="text-base font-bold text-[#0B1F33] mt-1.5 flex items-center gap-2">
              <Store className="w-4 h-4 text-[#0D5C63]" />
              {transfer.sourceStoreName}
              <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
              {transfer.destinationStoreName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#E2E8F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transfer Lifecycle Stepper */}
        <div className="bg-white px-6 py-4 border-b border-[#E2E8F0]">
          <div className="flex items-center justify-between text-xs font-bold text-[#64748B]">
            <div
              className={`flex items-center gap-1.5 ${
                transfer.status !== 'REJECTED' && transfer.status !== 'CANCELLED'
                  ? 'text-[#0D5C63]'
                  : 'text-[#94A3B8]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" /> 1. Requested
            </div>
            <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-2" />
            <div
              className={`flex items-center gap-1.5 ${
                ['APPROVED', 'ALLOCATED', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED'].includes(
                  transfer.status
                )
                  ? 'text-[#0D5C63]'
                  : 'text-[#94A3B8]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> 2. Approved & FEFO
            </div>
            <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-2" />
            <div
              className={`flex items-center gap-1.5 ${
                ['DISPATCHED', 'IN_TRANSIT', 'RECEIVED', 'PARTIALLY_RECEIVED'].includes(transfer.status)
                  ? 'text-[#0284C7]'
                  : 'text-[#94A3B8]'
              }`}
            >
              <Truck className="w-4 h-4" /> 3. In-Transit
            </div>
            <div className="h-0.5 flex-1 bg-[#E2E8F0] mx-2" />
            <div
              className={`flex items-center gap-1.5 ${
                ['RECEIVED', 'PARTIALLY_RECEIVED'].includes(transfer.status)
                  ? 'text-[#16A34A]'
                  : 'text-[#94A3B8]'
              }`}
            >
              <PackageCheck className="w-4 h-4" /> 4. Received
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="bg-[#F8FAFC] px-6 border-b border-[#E2E8F0] flex gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('items')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'items'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            Transfer Manifest ({transfer.items.length})
          </button>
          <button
            onClick={() => setActiveTab('fefo')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'fefo'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            FEFO Batch Allocation
          </button>
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'dispatch'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            Dispatch & Logistics
          </button>
          <button
            onClick={() => setActiveTab('receipt')}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'receipt'
                ? 'border-[#0D5C63] text-[#0D5C63]'
                : 'border-transparent text-[#64748B] hover:text-[#0B1F33]'
            }`}
          >
            Branch Receipt Verification
          </button>
        </div>

        {/* Drawer Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#64748B]">Requested By:</span>
                  <p className="font-bold text-[#0B1F33]">{transfer.requestedByName}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Total Items:</span>
                  <p className="font-bold font-mono text-[#0B1F33]">{transfer.itemsCount}</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Total Quantity:</span>
                  <p className="font-bold font-mono text-[#0B1F33]">{transfer.totalRequestedQty} units</p>
                </div>
                <div>
                  <span className="text-[#64748B]">Transfer Valuation:</span>
                  <p className="font-bold font-mono text-[#0D5C63]">₹{safeToFixed(transfer.totalTransferValue)}</p>
                </div>
              </div>

              {transfer.reason && (
                <div className="bg-[#E6F4F1]/40 p-3 rounded-lg border border-[#0D5C63]/20 text-xs text-[#0D5C63]">
                  <span className="font-bold">Transfer Reason:</span> {transfer.reason}
                </div>
              )}

              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#F8FAFC] text-[#64748B] font-bold border-b border-[#E2E8F0]">
                      <th className="py-2.5 px-3">Medicine Master</th>
                      <th className="py-2.5 px-3 text-center">Req Qty</th>
                      <th className="py-2.5 px-3 text-center">Dispatched Qty</th>
                      <th className="py-2.5 px-3 text-center">Received Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {transfer.items.map((item) => (
                      <tr key={item.productId} className="hover:bg-[#F8FAFC]">
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-[#0B1F33]">{item.productName}</p>
                          <p className="text-[10px] text-[#64748B] font-mono">SKU: {item.sku}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{item.requestedQty}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#0284C7] font-bold">
                          {item.dispatchedQty ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#16A34A] font-bold">
                          {item.receivedQty ?? '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">₹{safeToFixed(item.unitPurchaseCost)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0D5C63]">
                          ₹{safeToFixed(item.totalValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'fefo' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-[#0B1F33]">FEFO Batch Allocations</h3>
                  <p className="text-[11px] text-[#64748B]">
                    Batches auto-selected from {transfer.sourceStoreName} in order of earliest expiration.
                  </p>
                </div>
                {transfer.status === 'PENDING_APPROVAL' && canApprove && (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={Sparkles}
                    onClick={handleAllocateFEFO}
                    isLoading={isProcessing}
                  >
                    Recalculate FEFO
                  </Button>
                )}
              </div>

              {transfer.items.map((item) => (
                <div key={item.productId} className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0] space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#0B1F33]">{item.productName}</span>
                    <span className="text-[#0D5C63] font-mono">
                      Allocated: {item.allocatedQty || 0} / {item.requestedQty} units
                    </span>
                  </div>

                  {!item.allocatedBatches || item.allocatedBatches.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] italic">No batch allocated yet.</p>
                  ) : (
                    <div className="divide-y divide-[#E2E8F0]">
                      {item.allocatedBatches.map((b) => (
                        <div key={b.batchId} className="py-1.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-[#0B1F33]">Batch: {b.batchNumber}</span>
                            <span className="ml-2 text-[10px] text-[#D97706] font-mono">Exp: {b.expiryDate}</span>
                          </div>
                          <span className="font-mono font-bold text-[#0D5C63]">{b.allocatedQty} units</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0B1F33]">Logistics & Dispatch Information</h3>

              {transfer.dispatchedAt ? (
                <div className="bg-[#F0F9FF] p-4 rounded-xl border border-[#BAE6FD] space-y-2 text-xs">
                  <p className="font-bold text-[#0284C7] flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> Dispatched on {formatDisplayDate(transfer.dispatchedAt)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[#0F172A]">
                    <div>
                      <span className="text-[#64748B]">Dispatched By:</span> {transfer.dispatchedByName}
                    </div>
                    <div>
                      <span className="text-[#64748B]">Driver:</span> {transfer.driverName || 'N/A'}
                    </div>
                    <div>
                      <span className="text-[#64748B]">Vehicle No:</span> {transfer.vehicleNumber || 'N/A'}
                    </div>
                    <div>
                      <span className="text-[#64748B]">Tracking No:</span> {transfer.trackingNumber || 'N/A'}
                    </div>
                  </div>
                  {transfer.dispatchNotes && (
                    <p className="text-[#64748B] italic border-t border-[#BAE6FD] pt-1.5 mt-1.5">
                      Notes: {transfer.dispatchNotes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  <p className="text-xs font-bold text-[#475569]">Enter Logistics Details to Dispatch</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Driver Name"
                      placeholder="e.g. Ramesh Kumar"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                    <Input
                      label="Vehicle Number"
                      placeholder="e.g. KA-01-AB-1234"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                    />
                  </div>
                  <Input
                    label="Tracking / Waybill Ref"
                    placeholder="e.g. WB-998877"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                  />
                  <Input
                    label="Dispatch Notes"
                    placeholder="e.g. Temperature controlled transit container applied..."
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'receipt' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0B1F33]">Destination Receipt Verification</h3>

              {transfer.receivedAt ? (
                <div className="bg-[#F0FDF4] p-4 rounded-xl border border-[#BBF7D0] space-y-2 text-xs">
                  <p className="font-bold text-[#16A34A] flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4" /> Received on {formatDisplayDate(transfer.receivedAt)}
                  </p>
                  <p className="text-[#0F172A]">
                    Received By: <span className="font-bold">{transfer.receivedByName}</span>
                  </p>
                  <p className="text-[#0F172A]">
                    Total Units Received:{' '}
                    <span className="font-mono font-bold text-[#16A34A]">{transfer.totalReceivedQty} units</span>
                  </p>
                  {transfer.receiptNotes && (
                    <p className="text-[#64748B] italic">Notes: {transfer.receiptNotes}</p>
                  )}
                  {transfer.discrepancyNotes && (
                    <p className="text-[#DC2626] font-semibold bg-[#FEE2E2] p-2 rounded">
                      Discrepancies Noted: {transfer.discrepancyNotes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                  <p className="text-xs font-bold text-[#475569]">Physical Inward Verification at Destination</p>

                  <div className="divide-y divide-[#E2E8F0]">
                    {transfer.items.map((item) => (
                      <div key={item.productId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-[#0B1F33]">{item.productName}</p>
                          <p className="text-[10px] text-[#64748B]">Dispatched: {item.dispatchedQty || item.requestedQty} units</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#64748B]">Received Qty:</span>
                          <input
                            type="number"
                            min={0}
                            defaultValue={item.dispatchedQty || item.requestedQty}
                            onChange={(e) =>
                              setReceivedQtyMap({
                                ...receivedQtyMap,
                                [item.productId]: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-20 px-2 py-1 border border-[#CBD5E1] rounded text-center font-bold font-mono"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Input
                    label="Branch Receipt Notes"
                    placeholder="e.g. Package intact, seal verified..."
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                  />

                  <Input
                    label="Discrepancy / Damage Notes (If Any)"
                    placeholder="e.g. 2 units damaged during transport..."
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Action Bar */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(transfer.status === 'PENDING_APPROVAL' || transfer.status === 'APPROVED') && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReject}
                  isLoading={isProcessing}
                  className="text-[#DC2626] border-[#FCA5A5] hover:bg-[#FEE2E2]"
                >
                  Reject
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={isProcessing}
                >
                  Cancel Request
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {transfer.status === 'PENDING_APPROVAL' && canApprove && (
              <Button
                variant="primary"
                size="md"
                onClick={handleApprove}
                isLoading={isProcessing}
                icon={CheckCircle2}
              >
                Approve & Allocate FEFO
              </Button>
            )}

            {(transfer.status === 'APPROVED' || transfer.status === 'ALLOCATED') && canDispatch && (
              <Button
                variant="primary"
                size="md"
                onClick={handleDispatch}
                isLoading={isProcessing}
                icon={Truck}
                className="bg-[#0284C7] hover:bg-[#0369A1]"
              >
                Confirm Dispatch (In-Transit)
              </Button>
            )}

            {(transfer.status === 'DISPATCHED' || transfer.status === 'IN_TRANSIT') && canReceive && (
              <Button
                variant="primary"
                size="md"
                onClick={handleReceive}
                isLoading={isProcessing}
                icon={PackageCheck}
                className="bg-[#16A34A] hover:bg-[#15803D]"
              >
                Confirm Receipt & Inward Stock
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
