import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Printer,
  Trash2,
  X,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { WholesaleQuotation, WholesaleQuotationItem } from '../../types/wholesale';
import { Customer, Product } from '../../types';
import { SearchableSelect } from '../ui/SearchableSelect';

interface WholesaleQuotationsProps {
  quotations: WholesaleQuotation[];
  customers: Customer[];
  products: Product[];
  onCreateQuotation: (payload: any) => Promise<WholesaleQuotation>;
  onConvertToOrder: (quotationId: string) => Promise<void>;
  onPrintDoc: (type: 'quotation' | 'invoice' | 'challan', doc: any) => void;
  isOpenModal: boolean;
  onOpenModal: () => void;
  onCloseModal: () => void;
}

export const WholesaleQuotations: React.FC<WholesaleQuotationsProps> = ({
  quotations,
  customers,
  products,
  onCreateQuotation,
  onConvertToOrder,
  onPrintDoc,
  isOpenModal,
  onOpenModal,
  onCloseModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Quotation form state
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    {
      productId: string;
      requestedQty: number;
      unitPrice: number;
      wholesalePrice: number;
      discountPercent: number;
      gstRate: number;
    }[]
  >([]);

  // Product addition state inside modal
  const [selectedProdId, setSelectedProdId] = useState('');
  const [inputQty, setInputQty] = useState(10);
  const [inputWholesalePrice, setInputWholesalePrice] = useState(0);

  const safeQuotations = Array.isArray(quotations) ? quotations : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeProducts = Array.isArray(products) ? products : [];

  const handleSelectProductAdd = (prodId: string) => {
    setSelectedProdId(prodId);
    const prod = safeProducts.find((p) => p.id === prodId);
    if (prod) {
      setInputWholesalePrice(prod.wholesalePrice || prod.salePrice || 100);
    }
  };

  const handleAddItem = () => {
    if (!selectedProdId) return;
    const prod = safeProducts.find((p) => p.id === selectedProdId);
    if (!prod) return;

    const existingIdx = items.findIndex((i) => i.productId === selectedProdId);
    if (existingIdx >= 0) {
      const copy = [...items];
      copy[existingIdx].requestedQty += Number(inputQty);
      setItems(copy);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProdId,
          requestedQty: Number(inputQty) || 1,
          unitPrice: prod.mrp || prod.salePrice || 100,
          wholesalePrice: Number(inputWholesalePrice) || prod.wholesalePrice || 100,
          discountPercent: 0,
          gstRate: prod.gstRate || 12,
        },
      ]);
    }

    setSelectedProdId('');
    setInputQty(10);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemQtyChange = (idx: number, newQty: number) => {
    const copy = [...items];
    copy[idx].requestedQty = Math.max(1, newQty);
    setItems(copy);
  };

  const handleItemPriceChange = (idx: number, newPrice: number) => {
    const copy = [...items];
    copy[idx].wholesalePrice = Math.max(0, newPrice);
    setItems(copy);
  };

  const handleItemDiscChange = (idx: number, newDisc: number) => {
    const copy = [...items];
    copy[idx].discountPercent = Math.max(0, Math.min(100, newDisc));
    setItems(copy);
  };

  // Calculations for quote modal
  const calculatedItems: WholesaleQuotationItem[] = items.map((i) => {
    const prod = products.find((p) => p.id === i.productId);
    const lineSubtotal = i.requestedQty * i.wholesalePrice;
    const discAmt = (lineSubtotal * i.discountPercent) / 100;
    const taxable = lineSubtotal - discAmt;
    const taxAmt = (taxable * i.gstRate) / 100;
    const halfTax = taxAmt / 2;

    return {
      productId: i.productId,
      productName: prod?.productName || 'Material / Item',
      brand: prod?.brand || 'Brand',
      strength: prod?.strength,
      dosageForm: prod?.dosageForm,
      sku: prod?.sku || 'SKU-001',
      hsnCode: prod?.hsnCode || '6907',
      requestedQty: i.requestedQty,
      unitPrice: i.unitPrice,
      wholesalePrice: i.wholesalePrice,
      discountPercent: i.discountPercent,
      discountAmount: discAmt,
      taxableAmount: taxable,
      gstRate: i.gstRate,
      cgstAmount: halfTax,
      sgstAmount: halfTax,
      totalTaxAmount: taxAmt,
      totalAmount: taxable + taxAmt,
    };
  });

  const subtotal = calculatedItems.reduce((acc, i) => acc + i.requestedQty * i.wholesalePrice, 0);
  const totalDiscount = calculatedItems.reduce((acc, i) => acc + i.discountAmount, 0);
  const taxableAmount = calculatedItems.reduce((acc, i) => acc + i.taxableAmount, 0);
  const totalTax = calculatedItems.reduce((acc, i) => acc + i.totalTaxAmount, 0);
  const grandTotal = Math.round(taxableAmount + totalTax);

  const handleSubmitQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer.');
      return;
    }
    if (items.length === 0) {
      alert('Please add at least one product item to the quotation.');
      return;
    }

    const customer = safeCustomers.find((c) => c.id === selectedCustomerId);
    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);

    setIsSubmitting(true);
    try {
      await onCreateQuotation({
        customerId: selectedCustomerId,
        customerName: customer?.name || 'B2B Customer',
        customerGstin: (customer as any)?.gstin,
        items: calculatedItems,
        validUntil: validUntilDate.toISOString().split('T')[0],
        notes,
      });

      setItems([]);
      setSelectedCustomerId('');
      onCloseModal();
    } catch (err: any) {
      alert(err.message || 'Failed to generate quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredQuotations = safeQuotations.filter((q) => {
    const matchesSearch =
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Quotation # or Customer Name..."
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
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONVERTED">Converted to Order</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <button
          onClick={onOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Create Wholesale Quotation
        </button>
      </div>

      {/* Quotations List Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Quotation #</th>
                <th className="p-4">Customer</th>
                <th className="p-4 text-center">Valid Until</th>
                <th className="p-4 text-right">Items</th>
                <th className="p-4 text-right">Grand Total (₹)</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                    <p className="font-semibold text-slate-700">No Quotations Found</p>
                    <p className="text-xs text-slate-400 mt-1">Generate price quotes for hospital and B2B buyers.</p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quote) => (
                  <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{quote.quotationNumber}</td>
                    <td className="p-4 font-semibold text-slate-800">{quote.customerName}</td>
                    <td className="p-4 text-center text-slate-600 font-medium">{quote.validUntil}</td>
                    <td className="p-4 text-right font-medium">{quote.itemsCount}</td>
                    <td className="p-4 text-right font-black text-slate-900">
                      ₹{quote.grandTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          quote.status === 'CONVERTED'
                            ? 'bg-purple-100 text-purple-800'
                            : quote.status === 'SENT'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onPrintDoc('quotation', quote)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          title="Print Quotation"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {quote.status !== 'CONVERTED' && (
                          <button
                            onClick={() => onConvertToOrder(quote.id)}
                            className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors"
                          >
                            Convert to Order
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
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

      {/* Create Quotation Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold">New Wholesale Price Quotation</h2>
              </div>
              <button onClick={onCloseModal} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuotation} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
              {/* Customer & Quote Header Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="sm:col-span-2">
                  <SearchableSelect
                    label="Select B2B / Hospital Customer"
                    required
                    placeholder="-- Search & Choose B2B Account --"
                    searchPlaceholder="Search customer by name, phone, GST..."
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    options={safeCustomers.map((c) => ({
                      value: c.id,
                      label: c.name,
                      subLabel: `Phone: ${c.phone || 'N/A'} • Type: ${c.type || 'B2B'}`,
                      badge: c.city || 'Client',
                      keywords: [c.name, c.phone || '', c.gstin || '', c.email || ''],
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Validity Period (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  />
                </div>
              </div>

              {/* Add Product Line */}
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/60 space-y-3">
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">Add Line Item to Quotation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <SearchableSelect
                      label="Select Tile / Sanitary Product"
                      placeholder="-- Search & Choose Product --"
                      searchPlaceholder="Search product by name, brand, finish, dimensions, SKU..."
                      value={selectedProdId}
                      onChange={(val) => handleSelectProductAdd(val)}
                      options={safeProducts.map((p) => {
                        const isLow = (p.totalAvailableQuantity || 0) <= (p.reorderLevel || 10);
                        return {
                          value: p.id,
                          label: p.productName,
                          subLabel: `${p.brand || 'Vetrify'} • Avail Stock: ${p.totalAvailableQuantity || 0} units`,
                          sku: p.sku,
                          badge: `Stock: ${p.totalAvailableQuantity || 0}`,
                          badgeColor: isLow ? 'amber' : 'emerald',
                          keywords: [p.productName, p.brand || '', p.sku || '', p.composition || ''],
                        };
                      })}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Requested Quantity</label>
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
                      value={inputWholesalePrice}
                      onChange={(e) => setInputWholesalePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedProdId}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Wholesale Rate (₹)</th>
                      <th className="p-3 text-right">Disc %</th>
                      <th className="p-3 text-right">GST %</th>
                      <th className="p-3 text-right">Line Total (₹)</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No items added yet. Use the selector above to build your quotation.
                        </td>
                      </tr>
                    ) : (
                      calculatedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-3">
                            <p className="font-bold text-slate-900">{item.productName}</p>
                            <p className="text-[11px] text-slate-500">{item.brand}</p>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="1"
                              value={item.requestedQty}
                              onChange={(e) => handleItemQtyChange(idx, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-right font-bold"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.wholesalePrice}
                              onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                              className="w-20 px-2 py-1 border border-slate-300 rounded text-right font-bold"
                            />
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => handleItemDiscChange(idx, Number(e.target.value))}
                              className="w-16 px-2 py-1 border border-slate-300 rounded text-right"
                            />
                          </td>
                          <td className="p-3 text-right text-slate-600 font-medium">{item.gstRate}%</td>
                          <td className="p-3 text-right font-black text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
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

              {/* Totals Summary */}
              {items.length > 0 && (
                <div className="flex justify-between items-start pt-2 border-t border-slate-200">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Special Terms / Notes</label>
                    <textarea
                      rows={3}
                      placeholder="Validity conditions, transport charges, payment terms..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="w-1/3 space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Total Discount:</span>
                      <span className="font-semibold text-emerald-700">-₹{totalDiscount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Amount:</span>
                      <span className="font-semibold">₹{taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>GST Tax Total:</span>
                      <span className="font-semibold">₹{totalTax.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-2 flex justify-between font-black text-sm text-slate-900">
                      <span>Quotation Grand Total:</span>
                      <span className="text-emerald-700 text-base">₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || items.length === 0}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Save & Send Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
