import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  SaleInvoice,
  SalesReturn,
  CreditNote,
  ReturnCondition,
} from '../../types/firestore';
import { returnsService, CreateReturnRequestItem } from '../../services/returnsService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { calculateLineTaxes } from '../../services/posService';
import { safeToFixed } from '../../lib/formatting/formatters';
import {
  Search,
  RotateCcw,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Lock,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

interface SalesReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (returnRecord: SalesReturn, creditNote: CreditNote) => void;
}

export function SalesReturnModal({ isOpen, onClose, onSuccess }: SalesReturnModalProps) {
  const { organization: currentOrganization, currentStore } = useWorkspace();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [previousReturns, setPreviousReturns] = useState<SalesReturn[]>([]);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Return Items Selection State
  const [returnItemsMap, setReturnItemsMap] = useState<
    Record<
      string,
      {
        returnQty: number;
        condition: ReturnCondition;
        unitPrice: number;
        discountPercent: number;
        gstRate: number;
      }
    >
  >({});

  const [reason, setReason] = useState('Customer changed mind / defective product');
  const [refundMethod, setRefundMethod] = useState<SalesReturn['refundMethod']>('cash');
  const [isManagerOverride, setIsManagerOverride] = useState(false);
  const [overrideManagerUid, setOverrideManagerUid] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto search invoices on query change
  useEffect(() => {
    if (!currentOrganization?.id || !currentStore?.id || !isOpen) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await returnsService.searchInvoices(
          currentOrganization.id,
          currentStore.id,
          searchQuery
        );
        setInvoices(results);
      } catch (err: any) {
        console.error('Invoice search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, currentOrganization?.id, currentStore?.id, isOpen]);

  // Handle selecting an invoice
  const handleSelectInvoice = async (inv: SaleInvoice) => {
    if (!currentOrganization?.id) return;
    setIsLoadingInvoice(true);
    setError(null);
    try {
      const { invoice, previousReturns: prevRets } = await returnsService.getInvoiceForReturn(
        currentOrganization.id,
        inv.id
      );
      setSelectedInvoice(invoice);
      setPreviousReturns(prevRets);

      // Default refund method based on invoice payment mode
      if (invoice.paymentMode === 'credit' || invoice.customerId) {
        setRefundMethod('khata_credit');
      } else if (invoice.paymentMode === 'upi') {
        setRefundMethod('upi');
      } else if (invoice.paymentMode === 'card') {
        setRefundMethod('card');
      } else {
        setRefundMethod('cash');
      }

      // Pre-initialize return items map
      const initialMap: Record<string, any> = {};
      invoice.items.forEach((item, idx) => {
        const key = `${item.productId}_${item.batchId || idx}`;
        initialMap[key] = {
          returnQty: 0,
          condition: 'sealed_resalable' as ReturnCondition,
          unitPrice: item.unitPrice || item.mrp,
          discountPercent: item.discountPercent || 0,
          gstRate: item.gstRate || 12,
        };
      });
      setReturnItemsMap(initialMap);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoice details');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  // Compute total returned qty per batch
  const getPreviouslyReturnedQty = (productId: string, batchId?: string, batchNumber?: string) => {
    let sum = 0;
    if (!previousReturns || !Array.isArray(previousReturns)) return 0;
    previousReturns.forEach((ret) => {
      ret.items?.forEach((i) => {
        if (i.productId === productId && (i.batchId === batchId || i.batchNumber === batchNumber)) {
          sum += Number(i.returnQty) || 0;
        }
      });
    });
    return Number.isFinite(sum) ? sum : 0;
  };

  // Calculate live summary
  const calculateTotals = () => {
    if (!selectedInvoice) return { subtotal: 0, totalTax: 0, grandTotal: 0, totalQty: 0 };

    let subtotal = 0;
    let totalTax = 0;
    let totalQty = 0;

    selectedInvoice.items.forEach((item, idx) => {
      const key = `${item.productId}_${item.batchId || item.batch || idx}`;
      const state = returnItemsMap[key];
      if (state && state.returnQty > 0) {
        const tax = calculateLineTaxes(
          state.returnQty,
          state.unitPrice,
          state.discountPercent,
          state.gstRate
        );
        subtotal += tax.taxableAmount;
        totalTax += tax.totalTax;
        totalQty += state.returnQty;
      }
    });

    const rawTotal = subtotal + totalTax;
    const grandTotal = Math.round(rawTotal);

    return { subtotal, totalTax, grandTotal, totalQty };
  };

  const totals = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !currentStore?.id || !user || !selectedInvoice) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const requestItems: CreateReturnRequestItem[] = [];

      selectedInvoice.items.forEach((item, idx) => {
        const key = `${item.productId}_${item.batchId || item.batch || idx}`;
        const state = returnItemsMap[key];
        if (state && state.returnQty > 0) {
          requestItems.push({
            productId: item.productId,
            productName: item.productName,
            batchId: item.batchId || item.batch || `batch_${idx}`,
            batchNumber: item.batch || 'NO BATCH',
            expiryDate: typeof item.expiry === 'string' ? item.expiry : '2028-12-31',
            originallySoldQty: item.qty,
            returnQty: state.returnQty,
            unitPrice: state.unitPrice,
            mrp: item.mrp || item.salePrice,
            discountPercent: state.discountPercent,
            gstRate: state.gstRate,
            condition: state.condition,
          });
        }
      });

      if (requestItems.length === 0) {
        throw new Error('Please enter a return quantity greater than 0 for at least one item.');
      }

      const { returnRecord, creditNote } = await returnsService.createSalesReturn(
        currentOrganization.id,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Showroom Staff',
        },
        {
          storeId: currentStore.id,
          originalInvoiceId: selectedInvoice.id,
          originalInvoiceNumber: selectedInvoice.invoiceNumber,
          customerId: selectedInvoice.customerId,
          customerName: selectedInvoice.customerName,
          customerPhone: selectedInvoice.customerPhone,
          items: requestItems,
          reason,
          refundMethod,
          isManagerOverride,
          overrideManagerUid: isManagerOverride ? overrideManagerUid || user.uid : undefined,
          overrideReason: isManagerOverride ? overrideReason : undefined,
        }
      );

      onSuccess(returnRecord, creditNote);
      onClose();
    } catch (err: any) {
      console.error('Failed to create sales return:', err);
      setError(err.message || 'Failed to process sales return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Customer Sales Return" size="xl">
      <div className="space-y-6">
        {!selectedInvoice ? (
          /* Step 1: Search & Select Sale Invoice */
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>
                Search for original sale invoice by <strong>Invoice #</strong>, <strong>Customer Name</strong>, or <strong>Phone Number</strong>.
              </span>
            </div>

            <Input
              label="Search Invoice"
              placeholder="e.g. INV-2026-1042 or 9876543210..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4 text-slate-400" />}
            />

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {isSearching ? (
                <div className="p-6 text-center text-slate-500 text-sm">Searching invoices...</div>
              ) : invoices.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No matching invoices found.</div>
              ) : (
                invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv)}
                    className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
                        <Badge variant={inv.paymentMode === 'credit' ? 'warning' : 'success'}>
                          {inv.paymentMode?.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                        <span>Customer: {inv.customerName || 'Walk-in'}</span>
                        {inv.customerPhone && <span>Phone: {inv.customerPhone}</span>}
                        <span>Items: {inv.items?.length || 0}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">₹{safeToFixed(inv.grandTotal)}</div>
                      <Button size="xs" variant="outline" className="mt-1">
                        Select Invoice
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Step 2: Configure Return Items & Conditions */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 uppercase font-semibold">Selected Invoice</div>
                <div className="text-base font-bold text-slate-900">{selectedInvoice.invoiceNumber}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Customer: <strong>{selectedInvoice.customerName || 'Walk-in'}</strong> ({selectedInvoice.customerPhone || 'N/A'})
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
              >
                Change Invoice
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase">
                Select Return Quantities & Stock Condition
              </label>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Item Name</th>
                      <th className="p-2.5">Batch / Exp</th>
                      <th className="p-2.5 text-center">Sold Qty</th>
                      <th className="p-2.5 text-center">Prev. Ret.</th>
                      <th className="p-2.5 text-center">Return Qty</th>
                      <th className="p-2.5">Condition / Stock Routing</th>
                      <th className="p-2.5 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items.map((item, idx) => {
                      const key = `${item.productId}_${item.batchId || item.batch || idx}`;
                      const soldQty = Number(item.qty) || Number((item as any).quantity) || 0;
                      const prevRet = getPreviouslyReturnedQty(item.productId, item.batchId, item.batch);
                      const rawMax = soldQty - prevRet;
                      const maxReturnable = Math.max(0, Number.isFinite(rawMax) ? rawMax : 0);
                      const currentState = returnItemsMap[key] || {
                        returnQty: 0,
                        condition: 'sealed_resalable',
                        unitPrice: item.salePrice || item.mrp || 0,
                        discountPercent: item.discountPercent || 0,
                        gstRate: item.gstRate || 12,
                      };

                      return (
                        <tr key={key} className={currentState.returnQty > 0 ? 'bg-blue-50/40' : ''}>
                          <td className="p-2.5 font-medium text-slate-900">
                            {item.productName}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">
                            {item.batch || 'N/A'}
                          </td>
                          <td className="p-2.5 text-center font-semibold text-slate-800">
                            {soldQty}
                          </td>
                          <td className="p-2.5 text-center text-amber-700 font-semibold">
                            {prevRet}
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max={Number.isFinite(maxReturnable) ? maxReturnable : 0}
                              value={currentState.returnQty}
                              onChange={(e) => {
                                const val = Math.min(
                                  maxReturnable,
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                );
                                setReturnItemsMap((prev) => ({
                                  ...prev,
                                  [key]: { ...currentState, returnQty: val },
                                }));
                              }}
                              className="w-16 p-1 text-center font-bold border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                            />
                            <div className="text-[10px] text-slate-400 mt-0.5">Max: {maxReturnable}</div>
                          </td>
                          <td className="p-2.5">
                            <select
                              value={currentState.condition}
                              onChange={(e) => {
                                setReturnItemsMap((prev) => ({
                                  ...prev,
                                  [key]: {
                                    ...currentState,
                                    condition: e.target.value as ReturnCondition,
                                  },
                                }));
                              }}
                              disabled={currentState.returnQty === 0}
                              className="p-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 w-full"
                            >
                              <option value="sealed_resalable">Original Box / Intact (Restock)</option>
                              <option value="opened">Open Box / Loose Pieces (Inspect)</option>
                              <option value="damaged">Chipped / Broken / Damaged (Scrap)</option>
                              <option value="temperature_compromised">Shade / Caliber Mismatch (Quarantine)</option>
                              <option value="expired">Hardened / Expired Chemical (Scrap)</option>
                              <option value="recalled">Factory Batch Defect / Recall (Quarantine)</option>
                              <option value="unknown">Other Reason (Inspect)</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-right font-medium text-slate-900">
                            ₹{safeToFixed((currentState.unitPrice || 0) * (currentState.returnQty || 0))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary & Refund Workflow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="space-y-3">
                <Input
                  label="Return Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for return..."
                  required
                />

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Refund / Settlement Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="p-2 text-sm border border-slate-300 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="khata_credit">Customer Khata Credit (Reduce Outstanding Debt)</option>
                    <option value="cash">Cash Refund</option>
                    <option value="upi">UPI Instant Refund</option>
                    <option value="card">Card Refund</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-700 border-l border-slate-200 pl-4 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Return Tax Breakdown
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Return Items Qty:</span>
                    <span className="font-bold text-slate-900">{totals.totalQty}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>Taxable Amount:</span>
                    <span>₹{safeToFixed(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span>GST (CGST + SGST):</span>
                    <span>₹{safeToFixed(totals.totalTax)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-300">
                  <span className="text-base font-bold text-slate-900">Total Credit Amount:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ₹{safeToFixed(totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manager Override Checkbox */}
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-3.5 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-amber-900">
                <input
                  type="checkbox"
                  checked={isManagerOverride}
                  onChange={(e) => setIsManagerOverride(e.target.checked)}
                  className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Require Manager Approval / Policy Override</span>
              </label>

              {isManagerOverride && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <Input
                    label="Override Manager UID"
                    value={overrideManagerUid}
                    onChange={(e) => setOverrideManagerUid(e.target.value)}
                    placeholder="Enter Manager UID"
                    required
                  />
                  <Input
                    label="Override Reason"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="e.g. Return beyond 15 days window approved"
                    required
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || totals.totalQty === 0}
                className="gap-2"
              >
                <Receipt className="w-4 h-4" />
                {isSubmitting ? 'Processing Return...' : `Issue Credit Note (₹${totals.grandTotal})`}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
