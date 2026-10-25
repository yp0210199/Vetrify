import React, { useState, useEffect } from 'react';
import { GRN, PurchaseOrder, Supplier, PharmacyProduct } from '../../types/firestore';
import { grnService } from '../../services/grnService';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { getProducts } from '../../services/productService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../ui/Button';
import { TextInput, SearchableSelect } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PermissionGate } from '../common/PermissionGate';
import { safeToFixed, formatBatchExpiryDate } from '../../lib/formatting/formatters';
import {
  Boxes,
  Plus,
  Search,
  CheckCircle2,
  FileCheck2,
  Calendar,
  Building2,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';

export const GRNList: React.FC = () => {
  const { organization, currentStore, stores, hasPermission } = useWorkspace();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [grns, setGrns] = useState<GRN[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Inward GRN Modal State
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<PharmacyProduct[]>([]);

  const [selectedPOId, setSelectedPOId] = useState<string>('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState<string>('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [remarks, setRemarks] = useState<string>('');

  // GRN Items State (Batch Inward entries)
  const [grnItems, setGrnItems] = useState<
    Array<{
      productId: string;
      productName: string;
      sku: string;
      batchNumber: string;
      expiryDate: string; // YYYY-MM-DD
      manufacturingDate?: string;
      receivedQuantity: number;
      unitPurchaseCost: number;
      unitMrp: number;
      unitSalePrice: number;
      taxRate: number;
      taxableAmount: number;
      taxAmount: number;
      totalAmount: number;
    }>
  >([]);

  const [submittingGRN, setSubmittingGRN] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);

  useEffect(() => {
    if (currentStore?.id) {
      setSelectedStoreId(currentStore.id);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (organization?.id && selectedStoreId) {
      fetchGRNs();
    }
  }, [organization?.id, selectedStoreId]);

  const fetchGRNs = async () => {
    if (!organization?.id || !selectedStoreId) return;
    setLoading(true);
    try {
      const data = await grnService.getGRNs(organization.id, selectedStoreId);
      setGrns(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch GRNs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInwardModal = async () => {
    if (!organization?.id || !selectedStoreId) return;
    try {
      const [poData, supData, prodData] = await Promise.all([
        purchaseService.getPurchaseOrders(organization.id, selectedStoreId),
        supplierService.getSuppliers(organization.id, 'active'),
        getProducts(organization.id),
      ]);

      const eligiblePOs = poData.filter(
        (po) => po.status === 'approved' || po.status === 'partially_fulfilled'
      );

      setPurchaseOrders(eligiblePOs);
      setSuppliers(supData);
      setProducts(prodData.products as unknown as PharmacyProduct[]);

      setSelectedPOId('');
      setSupplierInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
      setSupplierInvoiceDate(new Date().toISOString().split('T')[0]);
      setGrnItems([]);
      setRemarks('');
      setIsInwardModalOpen(true);
    } catch (err: any) {
      addToast('Failed to load POs and Products for inwarding', 'error');
    }
  };

  const handleSelectPOForInward = (poId: string) => {
    setSelectedPOId(poId);
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;

    // Populate default inward items from PO line items
    const items = po.items.map((item) => {
      const pendingQty = item.orderedQuantity - item.receivedQuantity;
      const receivedQty = pendingQty > 0 ? pendingQty : item.orderedQuantity;
      const unitPurchaseCost = item.unitCost;
      const unitMrp = Number((unitPurchaseCost * 1.5).toFixed(2));
      const unitSalePrice = Number((unitPurchaseCost * 1.35).toFixed(2));
      const taxRate = item.taxRate || 12;
      const taxableAmount = receivedQty * unitPurchaseCost;
      const taxAmount = (taxableAmount * taxRate) / 100;
      const totalAmount = taxableAmount + taxAmount;

      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        batchNumber: `B-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        expiryDate: '2028-12-31',
        manufacturingDate: '2025-01-01',
        receivedQuantity: receivedQty,
        unitPurchaseCost,
        unitMrp,
        unitSalePrice,
        taxRate,
        taxableAmount,
        taxAmount,
        totalAmount,
      };
    });

    setGrnItems(items);
  };

  const handleUpdateItemField = (index: number, field: string, value: any) => {
    setGrnItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (
        field === 'receivedQuantity' ||
        field === 'unitPurchaseCost' ||
        field === 'taxRate'
      ) {
        const taxable = item.receivedQuantity * item.unitPurchaseCost;
        const tax = (taxable * item.taxRate) / 100;
        item.taxableAmount = taxable;
        item.taxAmount = tax;
        item.totalAmount = taxable + tax;
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleCompleteInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !selectedStoreId) return;

    if (!selectedPOId) {
      addToast('Please select a Purchase Order to inward against', 'error');
      return;
    }

    if (!supplierInvoiceNumber.trim()) {
      addToast('Supplier Invoice Number is required for statutory GRN inwarding', 'error');
      return;
    }

    if (grnItems.length === 0) {
      addToast('No items to inward', 'error');
      return;
    }

    // Validate batch numbers and expiries
    for (const item of grnItems) {
      if (!item.batchNumber.trim()) {
        addToast(`Batch number is required for ${item.productName}`, 'error');
        return;
      }
      if (!item.expiryDate) {
        addToast(`Expiry date is required for ${item.productName}`, 'error');
        return;
      }
      if (item.receivedQuantity <= 0) {
        addToast(`Received quantity must be positive for ${item.productName}`, 'error');
        return;
      }
    }

    const po = purchaseOrders.find((p) => p.id === selectedPOId);
    if (!po) return;

    const caller = {
      uid: user?.uid || 'system',
      email: user?.email || 'system@vetrify.internal',
      displayName: user?.displayName || 'Pharmacy Staff',
    };

    setSubmittingGRN(true);
    try {
      await grnService.completeGRNAndInwardBatches(organization.id, selectedStoreId, {
        poId: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        supplierInvoiceNumber,
        supplierInvoiceDate: new Date(supplierInvoiceDate),
        items: grnItems,
        remarks: remarks || undefined,
      }, caller);

      addToast('Goods Receipt Note (GRN) created & inventory batches inwarded atomically!', 'success');
      setIsInwardModalOpen(false);
      fetchGRNs();
    } catch (err: any) {
      addToast(err.message || 'Failed to complete GRN inwarding', 'error');
    } finally {
      setSubmittingGRN(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center font-bold">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0B1F33]">Goods Receipt Note (GRN) & Inwarding</h2>
            <p className="text-xs text-[#64748B]">Atomic batch creation, supplier ledger posting, and FEFO stock ingestion</p>
          </div>
        </div>

        <PermissionGate permission="grn.create">
          <Button onClick={handleOpenInwardModal} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Inward Stock (New GRN)
          </Button>
        </PermissionGate>
      </div>

      {/* Store Branch Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-[#64748B]">Store Branch:</span>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-xl text-xs font-bold text-[#0B1F33]"
        >
          {stores.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name}
            </option>
          ))}
        </select>
      </div>

      {/* GRNs Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          Loading Goods Receipt Notes...
        </div>
      ) : grns.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          No GRNs recorded yet. Click "Inward Stock (New GRN)" to ingest physical inventory into FEFO batches.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                  <th className="p-3.5">GRN Number</th>
                  <th className="p-3.5">PO Ref</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5 text-right">Items Inwarded</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium">
                {grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-[#F8FAFC]">
                    <td className="p-3.5 font-mono font-bold text-[#0D5C63]">{grn.grnNumber}</td>
                    <td className="p-3.5 font-mono text-[11px] text-[#64748B]">{grn.poNumber}</td>
                    <td className="p-3.5 font-bold text-[#0B1F33]">{grn.supplierName}</td>
                    <td className="p-3.5 font-mono text-[11px]">{grn.supplierInvoiceNumber}</td>
                    <td className="p-3.5 text-right font-mono font-bold">{grn.totalReceivedQty}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-[#0B1F33]">
                      ₹{grn.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F4F1] text-[#0D5C63] capitalize">
                        {grn.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedGRN(grn)}>
                        View Inward Slip
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inward Stock (GRN Creation) Modal */}
      <Modal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        title="Stock Inwarding & GRN Generation"
        subtitle="Inward physical batches into store inventory with atomic FEFO batch tracking"
        size="xl"
      >
        <form onSubmit={handleCompleteInward} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <SearchableSelect
                label="Select Purchase Order (PO)"
                required
                placeholder="-- Search & Choose Approved Purchase Order --"
                searchPlaceholder="Search PO by number, supplier name, amount..."
                value={selectedPOId}
                onChange={(val) => handleSelectPOForInward(val)}
                options={purchaseOrders.map((po) => ({
                  value: po.id,
                  label: `${po.poNumber} — ${po.supplierName}`,
                  subLabel: `Total: ₹${po.grandTotal.toFixed(2)} • Items: ${po.items?.length || 0} line(s)`,
                  badge: po.status,
                  badgeColor: po.status === 'approved' ? 'emerald' : 'amber',
                  keywords: [po.poNumber, po.supplierName, String(po.grandTotal)],
                }))}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">
                Supplier Invoice Number <span className="text-red-500">*</span>
              </label>
              <TextInput
                value={supplierInvoiceNumber}
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                placeholder="INV-990101"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Invoice Date</label>
              <TextInput
                type="date"
                value={supplierInvoiceDate}
                onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0B1F33] block mb-1">Remarks / Note</label>
              <TextInput
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Physical verification OK"
              />
            </div>
          </div>

          {/* Batch Entry Inward Table */}
          {grnItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#0B1F33]">Batch Details & Inward Quantities</h4>
              <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                      <th className="p-2.5 w-1/4 min-w-[180px]">Product</th>
                      <th className="p-2.5 w-44 min-w-[150px]">Batch #</th>
                      <th className="p-2.5 w-40 min-w-[140px]">Expiry Date</th>
                      <th className="p-2.5 w-24 text-right">Recv Qty</th>
                      <th className="p-2.5 w-28 text-right">Cost (₹)</th>
                      <th className="p-2.5 w-28 text-right">MRP (₹)</th>
                      <th className="p-2.5 w-28 text-right">Sale (₹)</th>
                      <th className="p-2.5 w-28 text-right text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {grnItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F8FAFC]/50">
                        <td className="p-2.5 font-bold text-[#0B1F33]">{item.productName}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.batchNumber}
                            onChange={(e) => handleUpdateItemField(idx, 'batchNumber', e.target.value)}
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs font-mono font-semibold text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                            placeholder="e.g. B-2026-99"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => handleUpdateItemField(idx, 'expiryDate', e.target.value)}
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs font-medium text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            value={item.receivedQuantity}
                            onChange={(e) =>
                              handleUpdateItemField(idx, 'receivedQuantity', parseInt(e.target.value) || 0)
                            }
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs text-right font-mono font-bold text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPurchaseCost}
                            onChange={(e) =>
                              handleUpdateItemField(idx, 'unitPurchaseCost', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs text-right font-mono font-semibold text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitMrp}
                            onChange={(e) =>
                              handleUpdateItemField(idx, 'unitMrp', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs text-right font-mono text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitSalePrice}
                            onChange={(e) =>
                              handleUpdateItemField(idx, 'unitSalePrice', parseFloat(e.target.value) || 0)
                            }
                            className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded-lg text-xs text-right font-mono font-semibold text-[#0B1F33] bg-white focus:outline-none focus:ring-1 focus:ring-[#0D5C63] focus:border-[#0D5C63]"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-[#0D5C63]">
                          ₹{item.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="ghost" type="button" onClick={() => setIsInwardModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submittingGRN}>
              {submittingGRN ? 'Processing Inward & Batches...' : 'Post GRN & Inward Batches'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Inward Slip Modal */}
      {selectedGRN && (
        <Modal
          isOpen={!!selectedGRN}
          onClose={() => setSelectedGRN(null)}
          title={`Inward Receipt Slip: ${selectedGRN.grnNumber}`}
          subtitle={`Supplier: ${selectedGRN.supplierName} | Invoice: ${selectedGRN.supplierInvoiceNumber}`}
          width="md"
        >
          <div className="space-y-4">
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5">Batch</th>
                    <th className="p-2.5">Expiry</th>
                    <th className="p-2.5 text-right">Inward Qty</th>
                    <th className="p-2.5 text-right">Cost</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {selectedGRN.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{item.productName}</td>
                      <td className="p-2.5 font-mono text-[11px] text-[#0D5C63] font-bold">
                        {item.batchNumber}
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">{formatBatchExpiryDate(item.expiryDate)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{item.receivedQuantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{safeToFixed(item.unitPurchaseCost)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{safeToFixed(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs font-bold text-right space-y-1">
                <p>Taxable Total: ₹{safeToFixed(selectedGRN.taxableAmount)}</p>
                <p>Total Tax (GST): ₹{safeToFixed(selectedGRN.totalTaxAmount)}</p>
                <p className="text-sm text-[#0D5C63]">Inward Grand Total: ₹{safeToFixed(selectedGRN.grandTotal)}</p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#E2E8F0]">
              <Button variant="ghost" size="sm" onClick={() => setSelectedGRN(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
