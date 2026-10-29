import React, { useState, useEffect } from 'react';
import { PurchaseOrder, Supplier, PharmacyProduct } from '../../types/firestore';
import { purchaseService } from '../../services/purchaseService';
import { supplierService } from '../../services/supplierService';
import { getProducts } from '../../services/productService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../ui/Button';
import { TextInput, SearchableSelect } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PermissionGate } from '../common/PermissionGate';
import { safeToFixed } from '../../lib/formatting/formatters';
import {
  ShoppingBag,
  Plus,
  Search,
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';

export const POList: React.FC = () => {
  const { organization, currentStore, stores, currentStaff, hasPermission } = useWorkspace();
  const { addToast } = useToast();

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  // Create PO Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [poNotes, setPoNotes] = useState<string>('');

  // PO Line Items State
  const [poItems, setPoItems] = useState<
    Array<{
      productId: string;
      productName: string;
      sku: string;
      orderedQuantity: number;
      unitCost: number;
      taxRate: number;
      taxAmount: number;
      totalAmount: number;
    }>
  >([]);

  // Item Selector State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(100);
  const [itemUnitCost, setItemUnitCost] = useState<number>(10);

  const [submitting, setSubmitting] = useState(false);

  // Selected PO Details Modal
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    if (currentStore?.id) {
      setSelectedStoreId(currentStore.id);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (organization?.id && selectedStoreId) {
      fetchPOs();
    }
  }, [organization?.id, selectedStoreId, statusFilter]);

  const fetchPOs = async () => {
    if (!organization?.id || !selectedStoreId) return;
    setLoading(true);
    try {
      const data = await purchaseService.getPurchaseOrders(
        organization.id,
        selectedStoreId,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setPurchaseOrders(data);
    } catch (err: any) {
      addToast(err.message || 'Failed to fetch Purchase Orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = async () => {
    if (!organization?.id) return;
    try {
      const [supData, prodData] = await Promise.all([
        supplierService.getSuppliers(organization.id, 'active'),
        getProducts(organization.id),
      ]);
      setSuppliers(supData);
      setProducts(prodData.products as unknown as PharmacyProduct[]);

      setSelectedSupplierId(supData.length > 0 ? supData[0].id : '');
      setPoItems([]);
      setPoNotes('');
      setIsModalOpen(true);
    } catch (err: any) {
      addToast('Failed to load master suppliers and products', 'error');
    }
  };

  const handleAddItem = () => {
    if (!selectedProductId) {
      addToast('Please select a product', 'error');
      return;
    }
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    if (itemQty <= 0 || itemUnitCost < 0) {
      addToast('Please enter valid quantity and unit cost', 'error');
      return;
    }

    const taxRate = prod.gstRate || 12;
    const taxable = itemQty * itemUnitCost;
    const taxAmount = (taxable * taxRate) / 100;
    const totalAmount = taxable + taxAmount;

    setPoItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.productName,
        sku: prod.sku,
        orderedQuantity: itemQty,
        unitCost: itemUnitCost,
        taxRate,
        taxAmount,
        totalAmount,
      },
    ]);

    setSelectedProductId('');
    setItemQty(100);
    setItemUnitCost(10);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !selectedStoreId) return;

    if (!selectedSupplierId) {
      addToast('Please select a supplier', 'error');
      return;
    }

    if (poItems.length === 0) {
      addToast('Please add at least one line item to the Purchase Order', 'error');
      return;
    }

    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) return;

    const caller = {
      uid: currentStaff?.uid || 'user',
      email: currentStaff?.email,
      displayName: currentStaff?.displayName,
    };

    setSubmitting(true);
    try {
      await purchaseService.createPurchaseOrder(organization.id, caller, {
        storeId: selectedStoreId,
        supplierId: sup.id,
        supplierName: sup.name,
        items: poItems,
        notes: poNotes || undefined,
      });
      addToast('Purchase Order created successfully', 'success');
      setIsModalOpen(false);
      fetchPOs();
    } catch (err: any) {
      addToast(err.message || 'Failed to create Purchase Order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePOStatus = async (poId: string, status: 'approved' | 'cancelled') => {
    if (!organization?.id) return;
    const caller = {
      uid: currentStaff?.uid || 'user',
      email: currentStaff?.email,
      displayName: currentStaff?.displayName,
    };

    try {
      await purchaseService.updatePOStatus(organization.id, poId, caller, status);
      addToast(`PO marked as ${status}`, 'success');
      if (selectedPO) setSelectedPO(null);
      fetchPOs();
    } catch (err: any) {
      addToast(err.message || 'Failed to update PO status', 'error');
    }
  };

  const calculatePOTotals = () => {
    const subtotal = poItems.reduce((acc, item) => acc + item.orderedQuantity * item.unitCost, 0);
    const totalTax = poItems.reduce((acc, item) => acc + item.taxAmount, 0);
    const grandTotal = subtotal + totalTax;
    return { subtotal, totalTax, grandTotal };
  };

  const totals = calculatePOTotals();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center font-bold">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0B1F33]">Purchase Orders (PO)</h2>
            <p className="text-xs text-[#64748B]">Procurement requisition & vendor purchase order management</p>
          </div>
        </div>

        <PermissionGate permission="purchases.create">
          <Button onClick={handleOpenCreateModal} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Purchase Order
          </Button>
        </PermissionGate>
      </div>

      {/* Filters: Store Switcher & Status Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
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

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'draft', 'approved', 'partially_fulfilled', 'fulfilled', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0D5C63] text-white'
                  : 'bg-white border border-[#CBD5E1] text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* PO List Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          Loading Purchase Orders...
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#E2E8F0] text-center text-[#64748B] text-xs font-medium">
          No Purchase Orders found. Click "Create Purchase Order" to issue a requisition.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                  <th className="p-3.5">PO Number</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Items</th>
                  <th className="p-3.5 text-right">Ordered Qty</th>
                  <th className="p-3.5 text-right">Grand Total</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs font-medium">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-[#F8FAFC]">
                    <td className="p-3.5 font-mono font-bold text-[#0D5C63]">{po.poNumber}</td>
                    <td className="p-3.5 font-bold text-[#0B1F33]">{po.supplierName}</td>
                    <td className="p-3.5">{po.itemsCount} items</td>
                    <td className="p-3.5 text-right font-mono font-bold">{po.totalOrderedQty}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-[#0B1F33]">
                      ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                          po.status === 'fulfilled'
                            ? 'bg-[#E6F4F1] text-[#0D5C63]'
                            : po.status === 'partially_fulfilled'
                            ? 'bg-[#FEF3C7] text-[#D97706]'
                            : po.status === 'approved'
                            ? 'bg-[#E0F2FE] text-[#0284C7]'
                            : po.status === 'cancelled'
                            ? 'bg-[#FEE2E2] text-[#DC2626]'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPO(po)}>
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Requisition Purchase Order"
        subtitle="Issue purchase order for supplier quotation and stock replenishment"
        width="lg"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <div>
            <SearchableSelect
              label="Select Supplier"
              required
              placeholder="-- Choose Supplier --"
              searchPlaceholder="Search supplier by name, code, phone, or GST..."
              value={selectedSupplierId}
              onChange={(val) => setSelectedSupplierId(val)}
              options={suppliers.map((s) => ({
                value: s.id,
                label: s.name,
                subLabel: `Code: ${s.code || 'N/A'} • Phone: ${s.phone || 'N/A'} • GST: ${s.gstin || 'N/A'}`,
                badge: s.status || 'Active',
                badgeColor: s.status === 'inactive' ? 'red' : 'emerald',
                keywords: [s.code || '', s.phone || '', s.gstin || '', s.email || ''],
              }))}
            />
          </div>

          {/* Line Item Selection Panel */}
          <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0B1F33]">Add Line Items</h4>
              <span className="text-[11px] text-slate-500 font-medium">Search & Select Product</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Select Catalog Item"
                  required
                  placeholder="-- Search & Select Product --"
                  searchPlaceholder="Type tile name, brand, finish, dimensions, SKU..."
                  value={selectedProductId}
                  onChange={(val, opt) => {
                    setSelectedProductId(val);
                    const prod = products.find((p) => p.id === val);
                    if (prod) {
                      setItemUnitCost(prod.defaultPurchaseCost || prod.unitPurchasePrice || 10);
                    }
                  }}
                  options={products.map((p) => {
                    const gradeBadge = p.tileGrade || p.grade || (p.surfaceFinish ? `${p.surfaceFinish}` : 'Tile/Material');
                    return {
                      value: p.id,
                      label: `${p.productName} ${p.tileDimensions ? `(${p.tileDimensions})` : ''}`,
                      subLabel: `${p.manufacturerName || p.brand || 'Vetrify'} • ${p.categoryType ? p.categoryType.toUpperCase() : 'Building Material'}`,
                      sku: p.sku,
                      badge: gradeBadge,
                      badgeColor: 'teal' as any,
                      keywords: [
                        p.productName || '',
                        p.brand || '',
                        p.sku || '',
                        p.barcode || '',
                        p.composition || '',
                        p.manufacturerName || '',
                      ],
                    };
                  })}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#475569] block mb-1">Order Quantity</label>
                <TextInput
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 100 packs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#475569] block mb-1">Unit Cost (₹)</label>
                <TextInput
                  type="number"
                  step="0.01"
                  value={itemUnitCost}
                  onChange={(e) => setItemUnitCost(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 45.00"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={handleAddItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </Button>
            </div>
          </div>

          {/* Items Table */}
          {poItems.length > 0 && (
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-right">Ordered Qty</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">GST %</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {poItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{item.productName}</td>
                      <td className="p-2.5 text-right font-mono">{item.orderedQuantity}</td>
                      <td className="p-2.5 text-right font-mono">₹{safeToFixed(item.unitCost)}</td>
                      <td className="p-2.5 text-right font-mono">{item.taxRate}%</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{safeToFixed(item.totalAmount)}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[#DC2626] hover:text-[#B91C1C]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs font-bold space-y-1 text-right">
                <p>Subtotal: ₹{safeToFixed(totals.subtotal)}</p>
                <p>Total Tax (GST): ₹{safeToFixed(totals.totalTax)}</p>
                <p className="text-sm text-[#0D5C63]">Grand Total: ₹{safeToFixed(totals.grandTotal)}</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-[#0B1F33] block mb-1">Purchase Order Notes</label>
            <TextInput
              value={poNotes}
              onChange={(e) => setPoNotes(e.target.value)}
              placeholder="e.g. Deliver before 5 PM via cold-chain transport"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Issue Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* PO Detail View Modal */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`PO Details: ${selectedPO.poNumber}`}
          subtitle={`Supplier: ${selectedPO.supplierName} | Status: ${selectedPO.status}`}
          width="md"
        >
          <div className="space-y-4">
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase">
                    <th className="p-2.5">Product</th>
                    <th className="p-2.5 text-right">Ordered</th>
                    <th className="p-2.5 text-right">Received</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {selectedPO.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2.5 font-bold">{item.productName}</td>
                      <td className="p-2.5 text-right font-mono">{item.orderedQuantity}</td>
                      <td className="p-2.5 text-right font-mono text-[#0D5C63] font-bold">
                        {item.receivedQuantity}
                      </td>
                      <td className="p-2.5 text-right font-mono">₹{safeToFixed(item.unitCost)}</td>
                      <td className="p-2.5 text-right font-mono font-bold">₹{safeToFixed(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-xs font-bold text-right space-y-1">
                <p>Grand Total: ₹{safeToFixed(selectedPO.grandTotal)}</p>
              </div>
            </div>

            {selectedPO.notes && (
              <p className="text-xs text-[#64748B] italic bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                Notes: {selectedPO.notes}
              </p>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-[#E2E8F0]">
              {selectedPO.status === 'draft' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdatePOStatus(selectedPO.id, 'approved')}
                  >
                    Approve PO
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[#DC2626] border-[#FCA5A5]"
                    onClick={() => handleUpdatePOStatus(selectedPO.id, 'cancelled')}
                  >
                    Cancel PO
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedPO(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
