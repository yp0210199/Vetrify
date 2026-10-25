import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input, SearchableSelect } from '../ui/Input';
import {
  Supplier,
  SupplierReturn,
  SupplierReturnReason,
} from '../../types/firestore';
import { PharmacyBatch } from '../../types/batch';
import { supplierReturnService, CreateSupplierReturnRequestItem } from '../../services/supplierReturnService';
import { supplierService } from '../../services/supplierService';
import { batchService } from '../../services/batchService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { Truck, AlertTriangle, Plus, Trash2, ArrowLeftRight } from 'lucide-react';
import { safeToFixed, formatBatchExpiryDate } from '../../lib/formatting/formatters';

interface SupplierReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplierReturn: SupplierReturn) => void;
}

export function SupplierReturnModal({ isOpen, onClose, onSuccess }: SupplierReturnModalProps) {
  const { organization: currentOrganization, currentStore } = useWorkspace();
  const { user } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [reason, setReason] = useState('Vendor Return for Expired / Damaged Stock');

  const [batches, setBatches] = useState<PharmacyBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Line items for vendor return
  const [returnItems, setReturnItems] = useState<
    {
      productId: string;
      productName: string;
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      maxAvailQty: number;
      quantity: number;
      unitPurchaseCost: number;
      gstRate: number;
      reason: SupplierReturnReason;
    }[]
  >([]);

  const [selectedBatchId, setSelectedBatchId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentOrganization?.id || !isOpen) return;

    supplierService.getSuppliers(currentOrganization.id).then(setSuppliers).catch(console.error);

    if (currentStore?.id) {
      setIsLoadingBatches(true);
      batchService
        .getBatches(currentOrganization.id, { storeId: currentStore.id, pageSize: 100 })
        .then((res) => setBatches(res.batches))
        .catch(console.error)
        .finally(() => setIsLoadingBatches(false));
    }
  }, [currentOrganization?.id, currentStore?.id, isOpen]);

  const handleAddBatchLine = () => {
    if (!selectedBatchId) return;
    const batch = batches.find((b) => b.id === selectedBatchId);
    if (!batch) return;

    if (returnItems.some((i) => i.batchId === batch.id)) {
      setError('Batch is already added to return lines.');
      return;
    }

    const availQty = Number.isFinite(batch.availableQuantity)
      ? Number(batch.availableQuantity)
      : Number.isFinite((batch as any).currentStock)
      ? Number((batch as any).currentStock)
      : Number.isFinite((batch as any).quantity)
      ? Number((batch as any).quantity)
      : 0;

    setReturnItems((prev) => [
      ...prev,
      {
        productId: batch.productId,
        productName: batch.productName,
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: formatBatchExpiryDate(batch.expiryDate),
        maxAvailQty: availQty,
        quantity: Math.max(1, Math.min(10, availQty || 1)),
        unitPurchaseCost: batch.unitPurchaseCost || (batch as any).purchasePrice || 0,
        gstRate: batch.gstRate || 12,
        reason: 'near_expiry',
      },
    ]);

    setSelectedBatchId('');
    setError(null);
  };

  const handleRemoveLine = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineQtyChange = (index: number, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const maxQ = Number.isFinite(item.maxAvailQty) ? item.maxAvailQty : 9999;
          const validQty = Math.min(maxQ, Math.max(1, qty));
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const calculateGrandTotal = () => {
    let sum = 0;
    returnItems.forEach((item) => {
      const taxable = item.quantity * item.unitPurchaseCost;
      const tax = taxable * (item.gstRate / 100);
      sum += taxable + tax;
    });
    return Math.round(sum);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization?.id || !currentStore?.id || !user) return;
    if (!selectedSupplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (returnItems.length === 0) {
      setError('Please add at least one batch item to return to vendor.');
      return;
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);

    setIsSubmitting(true);
    setError(null);

    try {
      const itemsPayload: CreateSupplierReturnRequestItem[] = returnItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        batchId: i.batchId,
        batchNumber: i.batchNumber,
        expiryDate: i.expiryDate,
        quantity: i.quantity,
        unitPurchaseCost: i.unitPurchaseCost,
        gstRate: i.gstRate,
        reason: i.reason,
      }));

      const record = await supplierReturnService.createSupplierReturn(
        currentOrganization.id,
        {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Pharmacist',
        },
        {
          storeId: currentStore.id,
          supplierId: selectedSupplierId,
          supplierName: supplier?.name || 'Supplier',
          supplierInvoiceNumber,
          items: itemsPayload,
          reason,
        }
      );

      onSuccess(record);
      onClose();
    } catch (err: any) {
      console.error('Failed to create supplier return:', err);
      setError(err.message || 'Failed to process supplier return.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Vendor Return & Debit Note" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <SearchableSelect
              label="Select Supplier / Distributor"
              required
              placeholder="-- Search & Choose Supplier --"
              searchPlaceholder="Search supplier by name, code, GST..."
              value={selectedSupplierId}
              onChange={(val) => setSelectedSupplierId(val)}
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.name,
                subLabel: `GSTIN: ${s.gstin || 'N/A'} • Phone: ${s.phone || 'N/A'}`,
                badge: s.status || 'Vendor',
                keywords: [s.name, s.gstin || '', s.phone || '', s.code || ''],
              }))}
            />
          </div>

          <Input
            label="Supplier Purchase Invoice Ref #"
            value={supplierInvoiceNumber}
            onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
            placeholder="e.g. PINV-8942"
          />
        </div>

        {/* Batch Picker */}
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <SearchableSelect
                label="Select Stock Batch to Return to Vendor"
                placeholder="-- Search Medicine Name or Batch Number --"
                searchPlaceholder="Search product, batch #, expiry..."
                value={selectedBatchId}
                onChange={(val) => setSelectedBatchId(val)}
                options={batches.map((b) => ({
                  value: b.id,
                  label: b.productName,
                  subLabel: `Batch: ${b.batchNumber} | Exp: ${formatBatchExpiryDate(b.expiryDate)} | Avail: ${b.availableQuantity}`,
                  badge: `Qty: ${b.availableQuantity}`,
                  badgeColor: b.availableQuantity > 0 ? 'emerald' : 'red',
                  keywords: [b.productName, b.batchNumber, b.expiryDate || ''],
                }))}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleAddBatchLine}
              disabled={!selectedBatchId}
              className="gap-1 mb-0.5 h-10"
            >
              <Plus className="w-4 h-4" /> Add Item
            </Button>
          </div>
        </div>

        {/* Return Lines Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-2.5">Product & Batch</th>
                <th className="p-2.5">Expiry</th>
                <th className="p-2.5 text-center">Avail</th>
                <th className="p-2.5 text-center">Return Qty</th>
                <th className="p-2.5 text-right">Cost</th>
                <th className="p-2.5">Return Reason</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returnItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                    No batch lines added for vendor return. Select a batch above.
                  </td>
                </tr>
              ) : (
                returnItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium text-slate-900">
                      <div>{item.productName}</div>
                      <div className="text-[10px] font-mono text-slate-500">Batch: {item.batchNumber}</div>
                    </td>
                    <td className="p-2.5 font-mono">{item.expiryDate}</td>
                    <td className="p-2.5 text-center font-bold text-slate-800">{item.maxAvailQty}</td>
                    <td className="p-2.5 text-center">
                      <input
                        type="number"
                        min="1"
                        max={Number.isFinite(item.maxAvailQty) ? item.maxAvailQty : undefined}
                        value={item.quantity}
                        onChange={(e) => handleLineQtyChange(idx, parseInt(e.target.value, 10) || 1)}
                        className="w-16 p-1 text-center font-bold border border-slate-300 rounded"
                      />
                    </td>
                    <td className="p-2.5 text-right font-medium text-slate-900">
                      ₹{safeToFixed(item.unitPurchaseCost)}
                    </td>
                    <td className="p-2.5">
                      <select
                        value={item.reason}
                        onChange={(e) => {
                          const val = e.target.value as SupplierReturnReason;
                          setReturnItems((prev) =>
                            prev.map((line, i) => (i === idx ? { ...line, reason: val } : line))
                          );
                        }}
                        className="p-1 text-xs border border-slate-300 rounded"
                      >
                        <option value="near_expiry">Near Expiry Stock</option>
                        <option value="expired">Expired Stock</option>
                        <option value="damaged">Damaged Goods</option>
                        <option value="recalled">Drug Recalled</option>
                        <option value="overstock">Overstock Agreement</option>
                      </select>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Input
          label="Overall Return Remarks / Agreement Details"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Remarks..."
          required
        />

        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <span className="text-xs text-slate-500 uppercase font-semibold">Total Debit Note Amount</span>
            <div className="text-xl font-bold text-slate-900">₹{safeToFixed(calculateGrandTotal())}</div>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || returnItems.length === 0}
              className="gap-2"
            >
              <Truck className="w-4 h-4" />
              {isSubmitting ? 'Processing...' : 'Issue Vendor Debit Note'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
