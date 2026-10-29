import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import {
  SalesReturn,
  CreditNote,
  SupplierReturn,
  QuarantineRecord,
  DestructionRecord,
} from '../../types/firestore';
import { PharmacyBatch } from '../../types/batch';
import { returnsService } from '../../services/returnsService';
import { supplierReturnService } from '../../services/supplierReturnService';
import { quarantineService, QuarantineBatchRequest } from '../../services/quarantineService';
import { destructionService, RequestDestructionPayload } from '../../services/destructionService';
import { batchService } from '../../services/batchService';
import { safeToFixed, formatBatchExpiryDate, formatDate, parseFirestoreTimestamp } from '../../lib/formatting/formatters';
import { KpiCard } from '../ui/KpiCard';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { SalesReturnModal } from './SalesReturnModal';
import { CreditNotePrintModal } from './CreditNotePrintModal';
import { SupplierReturnModal } from './SupplierReturnModal';
import { DestructionCertificateModal } from './DestructionCertificateModal';
import {
  RotateCcw,
  Receipt,
  Truck,
  AlertTriangle,
  Flame,
  Plus,
  Printer,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';

export function ReturnsWorkspace() {
  const { organization: currentOrganization, currentStore } = useWorkspace();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'sales_returns' | 'credit_notes' | 'supplier_returns' | 'quarantine' | 'destruction'
  >('sales_returns');

  // State data
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  const [quarantineRecords, setQuarantineRecords] = useState<QuarantineRecord[]>([]);
  const [destructionRecords, setDestructionRecords] = useState<DestructionRecord[]>([]);
  const [expiringBatches, setExpiringBatches] = useState<PharmacyBatch[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isSalesReturnModalOpen, setIsSalesReturnModalOpen] = useState(false);
  const [isSupplierReturnModalOpen, setIsSupplierReturnModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [selectedDestructionCert, setSelectedDestructionCert] = useState<DestructionRecord | null>(null);

  // Quick Quarantine modal
  const [quarantineModalBatch, setQuarantineModalBatch] = useState<PharmacyBatch | null>(null);
  const [quarantineQty, setQuarantineQty] = useState(1);
  const [quarantineReason, setQuarantineReason] = useState('Chipped / Broken Ceramic & Damaged Lot Quarantine');
  const [isQuarantining, setIsQuarantining] = useState(false);

  // Destruction Request modal
  const [destructionModalItem, setDestructionModalItem] = useState<{
    batchId: string;
    productId: string;
    productName: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    mrp: number;
    purchasePrice: number;
    quarantineId?: string;
  } | null>(null);

  const [destructionMethod, setDestructionMethod] = useState<'incineration' | 'autoclaving' | 'chemical' | 'deep_burial' | 'vendor_takeback'>('incineration');
  const [destructionReason, setDestructionReason] = useState('Disposal of Broken Slabs, Damaged Tiles & Scrap Materials');
  const [witnessName, setWitnessName] = useState('');
  const [witnessDesignation, setWitnessDesignation] = useState('');
  const [isSubmittingDestruction, setIsSubmittingDestruction] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = async () => {
    if (!currentOrganization?.id || !currentStore?.id) return;
    setIsLoading(true);
    try {
      const [rets, cns, sRets, qRecs, dRecs, batchResult] = await Promise.all([
        returnsService.getSalesReturns(currentOrganization.id, { storeId: currentStore.id }),
        returnsService.getCreditNotes(currentOrganization.id, { storeId: currentStore.id }),
        supplierReturnService.getSupplierReturns(currentOrganization.id, { storeId: currentStore.id }),
        quarantineService.getQuarantineRecords(currentOrganization.id, { storeId: currentStore.id }),
        destructionService.getDestructionRecords(currentOrganization.id, { storeId: currentStore.id }),
        batchService.getBatches(currentOrganization.id, { storeId: currentStore.id, pageSize: 100 }),
      ]);

      setSalesReturns(rets);
      setCreditNotes(cns);
      setSupplierReturns(sRets);
      setQuarantineRecords(qRecs);
      setDestructionRecords(dRecs);

      // Filter expiring or expired batches
      const ninetyDaysLimit = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const filteredExpiring = batchResult.batches.filter((b) => {
        const expDate = parseFirestoreTimestamp(b.expiryDate);
        return b.availableQuantity > 0 && expDate !== null && expDate <= ninetyDaysLimit;
      });
      setExpiringBatches(filteredExpiring);
    } catch (err: any) {
      console.error('Failed to load returns workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentOrganization?.id, currentStore?.id]);

  // Handle Quick Quarantine Action
  const handleConfirmQuarantine = async () => {
    if (!currentOrganization?.id || !currentStore?.id || !user || !quarantineModalBatch) return;
    setIsQuarantining(true);
    try {
      await quarantineService.quarantineBatch(
        currentOrganization.id,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Quality Inspector',
        },
        {
          storeId: currentStore.id,
          productId: quarantineModalBatch.productId,
          productName: quarantineModalBatch.productName,
          batchId: quarantineModalBatch.id,
          batchNumber: quarantineModalBatch.batchNumber,
          expiryDate: quarantineModalBatch.expiryDate,
          quantity: quarantineQty,
          source: 'manual',
          reason: quarantineReason,
          condition: 'expired',
        }
      );

      setQuarantineModalBatch(null);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to quarantine batch stock.');
    } finally {
      setIsQuarantining(false);
    }
  };

  // Handle Destruction Request
  const handleConfirmDestructionRequest = async () => {
    if (!currentOrganization?.id || !currentStore?.id || !user || !destructionModalItem) return;
    setIsSubmittingDestruction(true);
    try {
      await destructionService.requestDestruction(
        currentOrganization.id,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Quality Inspector',
        },
        {
          storeId: currentStore.id,
          quarantineId: destructionModalItem.quarantineId,
          productId: destructionModalItem.productId,
          productName: destructionModalItem.productName,
          batchId: destructionModalItem.batchId,
          batchNumber: destructionModalItem.batchNumber,
          expiryDate: destructionModalItem.expiryDate,
          quantity: destructionModalItem.quantity,
          mrp: destructionModalItem.mrp,
          purchasePrice: destructionModalItem.purchasePrice,
          reason: destructionReason,
          destructionMethod,
          destructionDate: new Date().toISOString().split('T')[0],
          witnessedByName: witnessName,
          witnessedByDesignation: witnessDesignation,
        }
      );

      setDestructionModalItem(null);
      await refreshData();
    } catch (err: any) {
      alert(err.message || 'Failed to request destruction.');
    } finally {
      setIsSubmittingDestruction(false);
    }
  };

  const handleApproveDestruction = async (id: string) => {
    if (!currentOrganization?.id || !user) return;
    try {
      await destructionService.approveDestruction(currentOrganization.id, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Manager',
      }, id);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteDestruction = async (id: string) => {
    if (!currentOrganization?.id || !user) return;
    try {
      await destructionService.completeDestruction(currentOrganization.id, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Manager',
      }, id);
      await refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <RotateCcw className="w-7 h-7 text-blue-600" />
            Returns, Credit Notes & Expiry Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Customer Returns, Statutory Credit Notes, Vendor Returns, Stock Quarantine & Pharmaceutical Destruction
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsSupplierReturnModalOpen(true)}
            className="gap-2"
          >
            <Truck className="w-4 h-4 text-slate-600" />
            Vendor Return (Debit Note)
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsSalesReturnModalOpen(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Customer Sales Return
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Sales Returns"
          value={salesReturns.length.toString()}
          subtitle="Processed Customer Returns"
          icon={<RotateCcw className="w-5 h-5 text-blue-600" />}
        />
        <KpiCard
          title="Credit Notes"
          value={`₹${safeToFixed(creditNotes.reduce((sum, c) => sum + (c.totalCreditAmount || 0), 0), 0)}`}
          subtitle={`${creditNotes.length} Issued Tax Credit Notes`}
          icon={<Receipt className="w-5 h-5 text-indigo-600" />}
        />
        <KpiCard
          title="Vendor Returns"
          value={`₹${safeToFixed(supplierReturns.reduce((sum, s) => sum + (s.grandTotal || 0), 0), 0)}`}
          subtitle={`${supplierReturns.length} Supplier Debit Notes`}
          icon={<Truck className="w-5 h-5 text-purple-600" />}
        />
        <KpiCard
          title="Quarantined Stock"
          value={quarantineRecords.filter((q) => q.status === 'quarantined').length.toString()}
          subtitle="Non-Saleable Items"
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
        />
        <KpiCard
          title="Destructions"
          value={destructionRecords.length.toString()}
          subtitle="Scrap & Damaged Disposals"
          icon={<Flame className="w-5 h-5 text-red-600" />}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 bg-white rounded-xl shadow-sm p-2 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('sales_returns')}
          className={`px-4 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'sales_returns'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> Sales Returns ({salesReturns.length})
        </button>
        <button
          onClick={() => setActiveTab('credit_notes')}
          className={`px-4 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'credit_notes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" /> Credit Notes ({creditNotes.length})
        </button>
        <button
          onClick={() => setActiveTab('supplier_returns')}
          className={`px-4 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'supplier_returns'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" /> Supplier Returns ({supplierReturns.length})
        </button>
        <button
          onClick={() => setActiveTab('quarantine')}
          className={`px-4 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'quarantine'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Expiry & Quarantine ({quarantineRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('destruction')}
          className={`px-4 py-2.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 ${
            activeTab === 'destruction'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-4 h-4" /> Statutory Destruction ({destructionRecords.length})
        </button>
      </div>

      {/* Main Tab Content Panels */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by reference #, customer, supplier, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={refreshData} className="gap-1 text-slate-600">
            <Clock className="w-4 h-4" /> Refresh
          </Button>
        </div>

        {/* TAB 1: Sales Returns */}
        {activeTab === 'sales_returns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Return #</th>
                  <th className="p-3">Original Invoice</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-center">Items</th>
                  <th className="p-3">Refund Method</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No sales returns recorded yet.
                    </td>
                  </tr>
                ) : (
                  salesReturns.map((ret) => (
                    <tr key={ret.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{ret.returnNumber}</td>
                      <td className="p-3 font-mono text-slate-600">{ret.originalInvoiceNumber}</td>
                      <td className="p-3 font-medium text-slate-800">{ret.customerName || 'Walk-in'}</td>
                      <td className="p-3 text-center font-bold">{ret.totalReturnQty}</td>
                      <td className="p-3">
                        <Badge variant="neutral" className="uppercase text-[10px]">
                          {ret.refundMethod?.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">₹{safeToFixed(ret.grandTotal)}</td>
                      <td className="p-3">
                        <Badge variant={ret.status === 'completed' ? 'success' : 'info'}>
                          {ret.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            const cn = creditNotes.find((c) => c.returnId === ret.id);
                            if (cn) setSelectedCreditNote(cn);
                          }}
                          className="gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Credit Note
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Credit Notes */}
        {activeTab === 'credit_notes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Credit Note #</th>
                  <th className="p-3">Return Ref</th>
                  <th className="p-3">Invoice Ref</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3 text-right">Taxable</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Total Credit</th>
                  <th className="p-3 text-center">Print</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {creditNotes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No statutory credit notes issued yet.
                    </td>
                  </tr>
                ) : (
                  creditNotes.map((cn) => (
                    <tr key={cn.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{cn.creditNoteNumber}</td>
                      <td className="p-3 font-mono text-slate-600">{cn.returnId}</td>
                      <td className="p-3 font-mono text-slate-600">{cn.originalInvoiceNumber}</td>
                      <td className="p-3 font-medium text-slate-800">{cn.customerName || 'Walk-in'}</td>
                      <td className="p-3 text-right">₹{safeToFixed(cn.taxableAmount)}</td>
                      <td className="p-3 text-right">₹{safeToFixed(cn.totalTax)}</td>
                      <td className="p-3 text-right font-bold text-blue-600">₹{safeToFixed(cn.totalCreditAmount)}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setSelectedCreditNote(cn)}
                          className="gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" /> View / Print
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Supplier Returns */}
        {activeTab === 'supplier_returns' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Debit Note #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3 font-mono">Invoice Ref</th>
                  <th className="p-3 text-center">Total Qty</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-right">GST</th>
                  <th className="p-3 text-right">Debit Total</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {supplierReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No supplier debit notes recorded yet.
                    </td>
                  </tr>
                ) : (
                  supplierReturns.map((sr) => (
                    <tr key={sr.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-slate-900">{sr.supplierReturnNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{sr.supplierName}</td>
                      <td className="p-3 font-mono text-slate-500">{sr.supplierInvoiceNumber || 'N/A'}</td>
                      <td className="p-3 text-center font-bold">{sr.totalQuantity}</td>
                      <td className="p-3 text-right">₹{safeToFixed(sr.subtotal)}</td>
                      <td className="p-3 text-right">₹{safeToFixed(sr.totalTax)}</td>
                      <td className="p-3 text-right font-bold text-purple-700">₹{safeToFixed(sr.grandTotal)}</td>
                      <td className="p-3">
                        <Badge variant="success" className="uppercase">
                          {sr.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: Expiry & Quarantine Register */}
        {activeTab === 'quarantine' && (
          <div className="p-4 space-y-6">
            {/* Expiring Soon / Expired Stock Alert Banner */}
            {expiringBatches.length > 0 && (
              <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span>Expiring Soon Stock Alert ({expiringBatches.length} Batches)</span>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto border border-amber-200 rounded-lg bg-white divide-y divide-amber-100">
                  {expiringBatches.map((batch) => (
                    <div key={batch.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{batch.productName}</span>
                        <span className="ml-2 font-mono text-slate-500">Batch: {batch.batchNumber}</span>
                        <span className="ml-2 text-red-700 font-bold">Exp: {formatBatchExpiryDate(batch.expiryDate)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">Avail: {batch.availableQuantity}</span>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setQuarantineModalBatch(batch);
                            setQuarantineQty(batch.availableQuantity);
                          }}
                        >
                          Quarantine Stock
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quarantined Records Register */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 text-sm uppercase">Active Quarantined Register</h3>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Ref #</th>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Batch & Expiry</th>
                      <th className="p-3 text-center">Quarantined Qty</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quarantineRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No active quarantined stock records.
                        </td>
                      </tr>
                    ) : (
                      quarantineRecords.map((q) => (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{q.quarantineNumber}</td>
                          <td className="p-3 font-bold text-slate-900">{q.productName}</td>
                          <td className="p-3 font-mono">
                            {q.batchNumber} | <span className="text-red-600 font-bold">{formatBatchExpiryDate(q.expiryDate)}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-900">{q.quantity}</td>
                          <td className="p-3 text-slate-600">{q.reason}</td>
                          <td className="p-3">
                            <Badge variant={q.status === 'quarantined' ? 'warning' : 'neutral'}>
                              {q.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            {q.status === 'quarantined' && (
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  setDestructionModalItem({
                                    batchId: q.batchId,
                                    productId: q.productId,
                                    productName: q.productName,
                                    batchNumber: q.batchNumber,
                                    expiryDate: q.expiryDate,
                                    quantity: q.quantity,
                                    mrp: 100,
                                    purchasePrice: 50,
                                    quarantineId: q.id,
                                  });
                                }}
                                className="gap-1"
                              >
                                <Flame className="w-3.5 h-3.5 text-red-600" /> Move to Destruction
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Statutory Destruction Workspace */}
        {activeTab === 'destruction' && (
          <div className="p-4 space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Cert #</th>
                    <th className="p-3">Audit Ref</th>
                    <th className="p-3">Product / Batch</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Valuation</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {destructionRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No pharmaceutical destruction records logged.
                      </td>
                    </tr>
                  ) : (
                    destructionRecords.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-slate-900">{d.certificateNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{d.destructionNumber}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {d.productName} ({d.batchNumber})
                        </td>
                        <td className="p-3 text-center font-bold">{d.quantity}</td>
                        <td className="p-3 text-right font-bold">₹{safeToFixed(d.totalValuation)}</td>
                        <td className="p-3 uppercase font-medium text-slate-700">
                          {d.destructionMethod.replace('_', ' ')}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              d.status === 'destroyed'
                                ? 'success'
                                : d.status === 'approved_for_destruction'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {d.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 text-center flex justify-center gap-2">
                          {d.status === 'destruction_pending' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleApproveDestruction(d.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {d.status === 'approved_for_destruction' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleCompleteDestruction(d.id)}
                            >
                              Execute Disposal
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelectedDestructionCert(d)}
                          >
                            <Printer className="w-3.5 h-3.5" /> Certificate
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SalesReturnModal
        isOpen={isSalesReturnModalOpen}
        onClose={() => setIsSalesReturnModalOpen(false)}
        onSuccess={(ret, cn) => {
          setSelectedCreditNote(cn);
          refreshData();
        }}
      />

      <SupplierReturnModal
        isOpen={isSupplierReturnModalOpen}
        onClose={() => setIsSupplierReturnModalOpen(false)}
        onSuccess={() => refreshData()}
      />

      <CreditNotePrintModal
        isOpen={!!selectedCreditNote}
        onClose={() => setSelectedCreditNote(null)}
        creditNote={selectedCreditNote}
      />

      <DestructionCertificateModal
        isOpen={!!selectedDestructionCert}
        onClose={() => setSelectedDestructionCert(null)}
        record={selectedDestructionCert}
      />

      {/* Quick Quarantine Modal */}
      {quarantineModalBatch && (
        <Modal
          isOpen={!!quarantineModalBatch}
          onClose={() => setQuarantineModalBatch(null)}
          title="Quarantine Expired / Damaged Batch Stock"
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <div className="font-bold text-slate-900">{quarantineModalBatch.productName}</div>
              <div className="text-xs text-slate-600 flex gap-3 mt-1">
                <span>Batch: {quarantineModalBatch.batchNumber}</span>
                <span>Expiry: {formatBatchExpiryDate(quarantineModalBatch.expiryDate)}</span>
                <span>Available: {quarantineModalBatch.availableQuantity}</span>
              </div>
            </div>

            <Input
              label="Quarantine Quantity"
              type="number"
              min="1"
              max={
                Number.isFinite(quarantineModalBatch.availableQuantity)
                  ? quarantineModalBatch.availableQuantity
                  : undefined
              }
              value={quarantineQty}
              onChange={(e) => setQuarantineQty(parseInt(e.target.value, 10) || 1)}
            />

            <Input
              label="Quarantine Reason"
              value={quarantineReason}
              onChange={(e) => setQuarantineReason(e.target.value)}
              placeholder="Reason for quarantine..."
            />

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" onClick={() => setQuarantineModalBatch(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmQuarantine}
                disabled={isQuarantining}
              >
                Confirm Quarantine
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Destruction Request Modal */}
      {destructionModalItem && (
        <Modal
          isOpen={!!destructionModalItem}
          onClose={() => setDestructionModalItem(null)}
          title="Initiate Damaged Stock & Scrap Disposal"
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
              This action initiates formal scrap accounting and disposal of broken ceramic tiles, cracked sanitaryware, or damaged stock.
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded border border-slate-200">
              <div>Product: <strong>{destructionModalItem.productName}</strong></div>
              <div>Batch: <strong>{destructionModalItem.batchNumber}</strong></div>
              <div>Quantity: <strong>{destructionModalItem.quantity}</strong></div>
              <div>Valuation: <strong>₹{safeToFixed((destructionModalItem.quantity || 0) * (destructionModalItem.purchasePrice || 0))}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Disposal Method
              </label>
              <select
                value={destructionMethod}
                onChange={(e) => setDestructionMethod(e.target.value as any)}
                className="p-2 text-sm border border-slate-300 rounded-lg w-full"
              >
                <option value="incineration">Mechanical Crushing & Aggregate Recycling</option>
                <option value="autoclaving">Ceramic Scrap Yard Landfill</option>
                <option value="chemical">Defective Glaze Scrap Disposal</option>
                <option value="deep_burial">Hardened Adhesive Disposal</option>
                <option value="vendor_takeback">Factory Warranty Take-back / Replacement</option>
              </select>
            </div>

            <Input
              label="Disposal Justification / Reason"
              value={destructionReason}
              onChange={(e) => setDestructionReason(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Witness / Inspector Name"
                value={witnessName}
                onChange={(e) => setWitnessName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
              />
              <Input
                label="Inspector Designation"
                value={witnessDesignation}
                onChange={(e) => setWitnessDesignation(e.target.value)}
                placeholder="e.g. Godown Quality Supervisor"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" onClick={() => setDestructionModalItem(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmDestructionRequest}
                disabled={isSubmittingDestruction}
                className="gap-1.5"
              >
                <Flame className="w-4 h-4 text-red-500" />
                Submit Destruction Request
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
