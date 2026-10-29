import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Truck,
  FileCheck,
  ChevronRight,
  ShieldAlert,
  X,
  Printer,
  PackageCheck,
  Building2,
} from 'lucide-react';
import { WholesaleOrder, WholesaleOrderItem, WholesaleOrderStatus } from '../../types/wholesale';
import { Customer, Product } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';

interface WholesaleOrdersProps {
  orders: WholesaleOrder[];
  customers: Customer[];
  products: Product[];
  onCreateOrder: (payload: any) => Promise<WholesaleOrder>;
  onReserveStock: (orderId: string) => Promise<void>;
  onFulfillOrderModal: (order: WholesaleOrder) => void;
  onCreateInvoice: (orderId: string) => Promise<void>;
  onCreateChallanModal: (order: WholesaleOrder) => void;
  onPrintDoc: (type: 'quotation' | 'invoice' | 'challan', doc: any) => void;
  isOpenWizard: boolean;
  onOpenWizard: () => void;
  onCloseWizard: () => void;
}

export const WholesaleOrders: React.FC<WholesaleOrdersProps> = ({
  orders,
  customers,
  products,
  onCreateOrder,
  onReserveStock,
  onFulfillOrderModal,
  onCreateInvoice,
  onCreateChallanModal,
  onPrintDoc,
  isOpenWizard,
  onOpenWizard,
  onCloseWizard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Wizard State
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Carrier');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manager Credit Override state
  const [creditOverrideUsed, setCreditOverrideUsed] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Items added in wizard
  const [items, setItems] = useState<
    {
      productId: string;
      orderedQty: number;
      wholesalePrice: number;
      discountPercent: number;
      gstRate: number;
    }[]
  >([]);

  // Wizard product selection inputs
  const [selectedProdId, setSelectedProdId] = useState('');
  const [inputQty, setInputQty] = useState(50);
  const [inputPrice, setInputPrice] = useState(0);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const selectedCustomer = safeCustomers.find((c) => c.id === selectedCustomerId);

  const handleSelectProduct = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = safeProducts.find((p) => p.id === prodId);
    if (prod) {
      setInputPrice(prod.wholesalePrice || prod.salePrice || 100);
    }
  };

  const handleAddItemToWizard = () => {
    if (!selectedProdId) return;
    const prod = safeProducts.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const existingIdx = items.findIndex((i) => i.productId === selectedProdId);
    if (existingIdx >= 0) {
      const copy = [...items];
      copy[existingIdx].orderedQty += Number(inputQty);
      setItems(copy);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProdId,
          orderedQty: Number(inputQty) || 1,
          wholesalePrice: Number(inputPrice) || prod.wholesalePrice || 100,
          discountPercent: 0,
          gstRate: prod.gstRate || 12,
        },
      ]);
    }
    setSelectedProdId('');
    setInputQty(50);
  };

  const handleRemoveWizardItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Calculations for Wizard Order
  const processedItems: WholesaleOrderItem[] = items.map((i) => {
    const prod = safeProducts.find((p) => p.id === i.productId);
    const lineSubtotal = i.orderedQty * i.wholesalePrice;
    const discAmt = (lineSubtotal * i.discountPercent) / 100;
    const lineTaxable = lineSubtotal - discAmt;
    const lineTax = (lineTaxable * i.gstRate) / 100;
    const halfTax = lineTax / 2;

    return {
      productId: i.productId,
      productName: prod?.productName || 'Material / Item',
      brand: prod?.brand || 'Brand',
      strength: prod?.strength,
      dosageForm: prod?.dosageForm,
      sku: prod?.sku || 'SKU-001',
      hsnCode: prod?.hsnCode || '6907',
      orderedQty: i.orderedQty,
      reservedQty: 0,
      fulfilledQty: 0,
      unitPrice: i.wholesalePrice,
      mrp: prod?.mrp || i.wholesalePrice * 1.2,
      wholesalePrice: i.wholesalePrice,
      discountPercent: i.discountPercent,
      discountAmount: discAmt,
      taxableAmount: lineTaxable,
      gstRate: i.gstRate,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      totalTaxAmount: lineTax,
      totalAmount: lineTaxable + lineTax,
    };
  });

  const subtotal = processedItems.reduce((acc, i) => acc + i.orderedQty * i.wholesalePrice, 0);
  const totalDiscount = processedItems.reduce((acc, i) => acc + i.discountAmount, 0);
  const taxableAmount = processedItems.reduce((acc, i) => acc + i.taxableAmount, 0);
  const totalTax = processedItems.reduce((acc, i) => acc + i.totalTaxAmount, 0);
  const grandTotal = Math.round(taxableAmount + totalTax);

  // Credit calculation
  const creditLimit = selectedCustomer?.creditLimit || 0;
  const currentOutstanding = selectedCustomer?.currentOutstanding || 0;
  const availableCredit = creditLimit - currentOutstanding;
  const isCreditExceeded = selectedCustomer?.creditEnabled && grandTotal > availableCredit;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one line item to the order.');
      return;
    }
    let finalOverrideUsed = creditOverrideUsed;
    let finalOverrideReason = overrideReason;

    if (isCreditExceeded && !creditOverrideUsed) {
      const confirmOverride = window.confirm(
        `Order exceeds customer credit limit!\nAvailable Credit: ₹${Math.max(0, availableCredit).toLocaleString('en-IN')}\nOrder Total: ₹${grandTotal.toLocaleString('en-IN')}\n\nWould you like to apply Manager Credit Override to approve and submit this order?`
      );
      if (confirmOverride) {
        finalOverrideUsed = true;
        setCreditOverrideUsed(true);
        if (!finalOverrideReason) {
          finalOverrideReason = 'Manager approved order exceeding credit limit';
          setOverrideReason(finalOverrideReason);
        }
      } else {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onCreateOrder({
        customerId: selectedCustomerId,
        customerName: selectedCustomer?.name || 'Customer',
        customerGstin: (selectedCustomer as any)?.gstin,
        items: processedItems,
        paymentTerms,
        deliveryMethod,
        notes,
        creditOverrideUsed: finalOverrideUsed,
        overrideReason: finalOverrideUsed ? (finalOverrideReason || 'Manager approved order exceeding credit limit') : null,
      });

      // Reset wizard
      setItems([]);
      setSelectedCustomerId('');
      setWizardStep(1);
      onCloseWizard();
    } catch (err: any) {
      alert(err.message || 'Failed to create wholesale order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = safeOrders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order # or Customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="RESERVED">Reserved</option>
            <option value="PARTIALLY_FULFILLED">Partially Fulfilled</option>
            <option value="READY_FOR_DISPATCH">Ready for Dispatch</option>
            <option value="DISPATCHED">Dispatched</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <button
          onClick={onOpenWizard}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          New Wholesale Order Wizard
        </button>
      </div>

      {/* Wholesale Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Order #</th>
                <th className="p-4">Customer Details</th>
                <th className="p-4 text-right">Qty (Ord / Res / Ful)</th>
                <th className="p-4 text-right">Grand Total (₹)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No Wholesale Orders Found</p>
                    <p className="text-xs text-slate-400 mt-1">Create a new wholesale order using the wizard.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">
                      <div>{order.orderNumber}</div>
                      {order.creditOverrideUsed && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1">
                          <ShieldAlert className="w-3 h-3" /> Override
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{order.customerName}</div>
                      <div className="text-[11px] text-slate-500">
                        {order.paymentTerms} | {order.deliveryMethod || 'Carrier'}
                      </div>
                    </td>

                    <td className="p-4 text-right">
                      <span className="font-bold text-slate-900">{order.totalOrderedQty}</span> /{' '}
                      <span className="text-amber-700 font-medium">{order.totalReservedQty}</span> /{' '}
                      <span className="text-emerald-700 font-bold">{order.totalFulfilledQty}</span>
                    </td>

                    <td className="p-4 text-right font-black text-slate-900">
                      ₹{order.grandTotal.toLocaleString('en-IN')}
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'RESERVED'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'READY_FOR_DISPATCH'
                            ? 'bg-purple-100 text-purple-800'
                            : order.status === 'DISPATCHED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === 'APPROVED' && (
                          <button
                            onClick={() => onReserveStock(order.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Reserve Stock (FEFO)
                          </button>
                        )}

                        {(order.status === 'RESERVED' || order.status === 'PARTIALLY_FULFILLED') && (
                          <button
                            onClick={() => onFulfillOrderModal(order)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1"
                          >
                            Fulfill & Deduct Batch
                          </button>
                        )}

                        {(order.status === 'READY_FOR_DISPATCH' || order.status === 'PARTIALLY_FULFILLED') && (
                          <>
                            <button
                              onClick={() => onCreateInvoice(order.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                            >
                              Gen Invoice
                            </button>
                            <button
                              onClick={() => onCreateChallanModal(order)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-lg transition-colors"
                            >
                              Dispatch Challan
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Step Order Creation Wizard Modal */}
      {isOpenWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">Wholesale B2B Order Wizard</h2>
              </div>
              <button onClick={onCloseWizard} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Wizard Steps Indicator */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-bold text-slate-500 justify-between">
              <span className={wizardStep === 1 ? 'text-emerald-700 underline font-black' : ''}>
                1. Account & Terms
              </span>
              <span className={wizardStep === 2 ? 'text-emerald-700 underline font-black' : ''}>
                2. Select Products & Lot / Shade Stock
              </span>
              <span className={wizardStep === 3 ? 'text-emerald-700 underline font-black' : ''}>
                3. Credit & Review
              </span>
            </div>

            <form onSubmit={handleSubmitOrder} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto">
              {/* STEP 1: Account Selection & Terms */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <SearchableSelect
                        label="Select B2B Account / Customer"
                        required
                        placeholder="-- Search & Choose Account --"
                        searchPlaceholder="Search customer by name, phone, GST..."
                        value={selectedCustomerId}
                        onChange={(val) => setSelectedCustomerId(val)}
                        options={safeCustomers.map((c) => ({
                          value: c.id,
                          label: c.name,
                          subLabel: `Limit: ₹${(c.creditLimit || 0).toLocaleString('en-IN')} • Phone: ${c.phone || 'N/A'}`,
                          badge: c.city || 'B2B',
                          keywords: [c.name, c.phone || '', (c as any)?.gstin || ''],
                        }))}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Payment & Credit Terms</label>
                      <select
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                      >
                        <option value="NET_30">NET 30 Days (Standard Credit)</option>
                        <option value="NET_15">NET 15 Days</option>
                        <option value="NET_60">NET 60 Days (Institutional Contract)</option>
                        <option value="IMMEDIATE">Immediate Cash / UPI / Card</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Logistics / Delivery Method</label>
                      <input
                        type="text"
                        placeholder="e.g. Express Dedicated Van"
                        value={deliveryMethod}
                        onChange={(e) => setDeliveryMethod(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  {selectedCustomer && (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                      <p className="font-bold text-slate-900">{selectedCustomer.name}</p>
                      <p className="text-slate-600">
                        Phone: {selectedCustomer.phone} | GSTIN: {(selectedCustomer as any)?.gstin || 'N/A'}
                      </p>
                      <div className="flex gap-4 pt-1 font-semibold text-slate-700">
                        <span>Credit Limit: ₹{(selectedCustomer.creditLimit || 0).toLocaleString('en-IN')}</span>
                        <span>Outstanding: ₹{(selectedCustomer.currentOutstanding || 0).toLocaleString('en-IN')}</span>
                        <span className="text-emerald-700 font-bold">
                          Available: ₹{Math.max(0, availableCredit).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={!selectedCustomerId}
                      onClick={() => setWizardStep(2)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                      Next: Add Products →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Products & Quantities */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Product Selector & Batch / Lot Stock Availability</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <SearchableSelect
                          label="Select Tile / Sanitary Product"
                          placeholder="-- Search & Choose Product --"
                          searchPlaceholder="Search product by name, brand, finish, dimensions, SKU..."
                          value={selectedProdId}
                          onChange={(val) => handleSelectProduct(val)}
                          options={safeProducts.map((p) => {
                            const isLow = (p.totalAvailableQuantity || 0) <= (p.reorderLevel || 10);
                            return {
                              value: p.id,
                              label: p.productName,
                              subLabel: `${p.brand || 'Vetrify'} • Avail: ${p.totalAvailableQuantity || 0} units`,
                              sku: p.sku,
                              badge: `Avail: ${p.totalAvailableQuantity || 0}`,
                              badgeColor: isLow ? 'amber' : 'emerald',
                              keywords: [p.productName, p.brand || '', p.sku || '', p.composition || ''],
                            };
                          })}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Order Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={inputQty}
                          onChange={(e) => setInputQty(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Wholesale Rate (₹)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={inputPrice}
                          onChange={(e) => setInputPrice(Number(e.target.value))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddItemToWizard}
                        disabled={!selectedProdId}
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                      >
                        + Add Line Item
                      </button>
                    </div>
                  </div>

                  {/* Wizard items list */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <th className="p-3">Product</th>
                          <th className="p-3 text-right">Ordered Qty</th>
                          <th className="p-3 text-right">Wholesale Price (₹)</th>
                          <th className="p-3 text-right">Disc %</th>
                          <th className="p-3 text-right">GST %</th>
                          <th className="p-3 text-right">Total (₹)</th>
                          <th className="p-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400">
                              No products added to order yet.
                            </td>
                          </tr>
                        ) : (
                          processedItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-3">
                                <p className="font-bold text-slate-900">{item.productName}</p>
                                <p className="text-[11px] text-slate-500">{item.brand}</p>
                              </td>
                              <td className="p-3 text-right font-bold">{item.orderedQty}</td>
                              <td className="p-3 text-right font-semibold">₹{item.wholesalePrice.toFixed(2)}</td>
                              <td className="p-3 text-right">{item.discountPercent}%</td>
                              <td className="p-3 text-right">{item.gstRate}%</td>
                              <td className="p-3 text-right font-black text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWizardItem(idx)}
                                  className="text-rose-500 hover:text-rose-700 p-1"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      disabled={items.length === 0}
                      onClick={() => setWizardStep(3)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
                    >
                      Next: Review & Credit Check →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Credit Check & Final Submission */}
              {wizardStep === 3 && (
                <div className="space-y-6">
                  {/* Credit Alert if exceeded */}
                  {isCreditExceeded && (
                    <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-rose-800">
                        <AlertTriangle className="w-5 h-5 text-rose-600" />
                        Credit Limit Exceeded!
                      </div>
                      <p className="text-rose-700">
                        Order total (₹{grandTotal.toLocaleString('en-IN')}) exceeds available credit (₹
                        {Math.max(0, availableCredit).toLocaleString('en-IN')}).
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="overrideCheck"
                          checked={creditOverrideUsed}
                          onChange={(e) => setCreditOverrideUsed(e.target.checked)}
                          className="rounded text-rose-600 focus:ring-rose-500"
                        />
                        <label htmlFor="overrideCheck" className="font-bold text-rose-900 cursor-pointer">
                          Apply Manager Credit Override
                        </label>
                      </div>
                      {creditOverrideUsed && (
                        <input
                          type="text"
                          required
                          placeholder="State reason for credit limit override..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs border border-rose-300 rounded-lg bg-white mt-1"
                        />
                      )}
                    </div>
                  )}

                  {/* Order Summary Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider">Order Summary</h3>
                    <div className="flex justify-between text-slate-600">
                      <span>Customer:</span>
                      <span className="font-bold text-slate-900">{selectedCustomer?.name}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Items:</span>
                      <span className="font-semibold">{items.length} Line Items</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total GST Tax:</span>
                      <span className="font-semibold">₹{totalTax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-sm text-slate-900">
                      <span>Order Grand Total:</span>
                      <span className="text-emerald-700 text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || (isCreditExceeded && !creditOverrideUsed)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting Order...' : 'Submit Wholesale Order'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
