import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, AlertCircle, ArrowRight, Store, Package } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select, SearchInput } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PharmacyStore } from '../../types/firestore';
import { Product } from '../../types/product';
import { TransferPriority } from '../../types/transfer';
import { storeService } from '../../services/storeService';
import { getProducts } from '../../services/productService';
import { batchService } from '../../services/batchService';
import { transferService } from '../../services/transferService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { safeToFixed } from '../../lib/formatting/formatters';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledSourceStoreId?: string;
  prefilledDestinationStoreId?: string;
  prefilledProductId?: string;
  prefilledQty?: number;
}

interface SelectedTransferItem {
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  dosageForm?: string;
  strength?: string;
  manufacturerName?: string;
  availableStockAtSource: number;
  requestedQty: number;
  unitPurchaseCost: number;
  unitMrp: number;
  unitSalePrice: number;
  remarks?: string;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledSourceStoreId,
  prefilledDestinationStoreId,
  prefilledProductId,
  prefilledQty,
}) => {
  const { organization, currentStore, stores } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [sourceStoreId, setSourceStoreId] = useState<string>('');
  const [destinationStoreId, setDestinationStoreId] = useState<string>('');
  const [priority, setPriority] = useState<TransferPriority>('ROUTINE');
  const [reason, setReason] = useState<string>('');
  const [items, setItems] = useState<SelectedTransferItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Product search state
  const [productSearch, setProductSearch] = useState<string>('');
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const srcId = prefilledSourceStoreId || currentStore?.id || stores[0]?.id || '';
      const destId =
        prefilledDestinationStoreId ||
        stores.find((s) => s.id !== srcId)?.id ||
        '';
      setSourceStoreId(srcId);
      setDestinationStoreId(destId);
      setPriority('ROUTINE');
      setReason('');
      setItems([]);
      setProductSearch('');

      if (prefilledProductId && organization) {
        // Pre-fill item if requested
        loadPrefilledProduct(organization.id, srcId, prefilledProductId, prefilledQty || 10);
      }
    }
  }, [isOpen, prefilledSourceStoreId, prefilledDestinationStoreId, prefilledProductId, prefilledQty]);

  const loadPrefilledProduct = async (orgId: string, srcStoreId: string, prodId: string, qty: number) => {
    try {
      const res = await getProducts(orgId, { searchQuery: '', pageSize: 100 });
      const prod = res.products.find((p) => p.id === prodId);
      if (prod) {
        const saleableBatches = await batchService.getSaleableBatchesForProduct(orgId, prod.id, srcStoreId);
        const availStock = saleableBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

        setItems([
          {
            productId: prod.id,
            productName: prod.productName,
            brand: prod.brand,
            sku: prod.sku,
            manufacturerName: prod.manufacturerName,
            availableStockAtSource: availStock,
            requestedQty: qty,
            unitPurchaseCost: prod.defaultPurchaseCost || 0,
            unitMrp: prod.defaultMrp || 0,
            unitSalePrice: prod.defaultSalePrice || 0,
          },
        ]);
      }
    } catch (e) {
      console.error('Failed to prefill product for transfer:', e);
    }
  };

  // Search products when productSearch query updates
  useEffect(() => {
    if (!productSearch.trim() || !organization || !sourceStoreId) {
      setSearchedProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await getProducts(organization.id, {
          searchQuery: productSearch,
          pageSize: 10,
        });
        setSearchedProducts(res.products);
      } catch (e) {
        console.error('Product search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, organization?.id, sourceStoreId]);

  const handleAddProduct = async (prod: Product) => {
    if (!organization || !sourceStoreId) return;
    if (items.some((i) => i.productId === prod.id)) {
      error('Product already added to transfer list.', 'Duplicate Item');
      return;
    }

    try {
      const saleableBatches = await batchService.getSaleableBatchesForProduct(
        organization.id,
        prod.id,
        sourceStoreId
      );
      const availStock = saleableBatches.reduce((sum, b) => sum + b.availableQuantity, 0);

      setItems([
        ...items,
        {
          productId: prod.id,
          productName: prod.productName,
          brand: prod.brand,
          sku: prod.sku,
          manufacturerName: prod.manufacturerName,
          availableStockAtSource: availStock,
          requestedQty: Math.min(10, Math.max(1, availStock)),
          unitPurchaseCost: prod.defaultPurchaseCost || 0,
          unitMrp: prod.defaultMrp || 0,
          unitSalePrice: prod.defaultSalePrice || 0,
        },
      ]);
      setProductSearch('');
      setSearchedProducts([]);
    } catch (e: any) {
      error(e?.message || 'Failed to check stock for product.', 'Stock Error');
    }
  };

  const handleRemoveItem = (prodId: string) => {
    setItems(items.filter((i) => i.productId !== prodId));
  };

  const handleUpdateItemQty = (prodId: string, qty: number) => {
    setItems(
      items.map((i) => (i.productId === prodId ? { ...i, requestedQty: Math.max(1, qty) } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) return;

    if (!sourceStoreId || !destinationStoreId) {
      error('Please select both source and destination store branches.', 'Missing Store');
      return;
    }

    if (sourceStoreId === destinationStoreId) {
      error('Source store and destination store cannot be the same branch.', 'Invalid Route');
      return;
    }

    if (items.length === 0) {
      error('Please add at least one medicine item to transfer.', 'Empty Items');
      return;
    }

    const sourceStore = stores.find((s) => s.id === sourceStoreId);
    const destStore = stores.find((s) => s.id === destinationStoreId);

    try {
      setIsSubmitting(true);
      const caller = { uid: user.uid, email: user.email, displayName: user.displayName };

      await transferService.createTransferRequest(organization.id, caller, {
        sourceStoreId,
        sourceStoreName: sourceStore?.name || 'Source Branch',
        destinationStoreId,
        destinationStoreName: destStore?.name || 'Destination Branch',
        priority,
        reason,
        items,
      });

      success('Inter-store transfer request created successfully.', 'Transfer Initiated');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create stock transfer request:', err);
      error(err?.message || 'Failed to submit stock transfer request.', 'Transfer Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalQty = items.reduce((sum, i) => sum + i.requestedQty, 0);
  const totalValue = items.reduce((sum, i) => sum + i.requestedQty * i.unitPurchaseCost, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Inter-Store Stock Transfer Request" size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Route Header (Source -> Destination) */}
        <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#0D5C63]" />
              Source Branch (Dispatching)
            </label>
            <Select
              value={sourceStoreId}
              onChange={(e) => {
                const newSrc = e.target.value;
                setSourceStoreId(newSrc);
                if (newSrc === destinationStoreId) {
                  const alt = stores.find((s) => s.id !== newSrc)?.id || '';
                  setDestinationStoreId(alt);
                }
              }}
              required
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) {s.isMainBranch ? '• Main HQ' : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="md:col-span-2 flex justify-center py-1">
            <div className="w-8 h-8 rounded-full bg-[#E6F4F1] text-[#0D5C63] flex items-center justify-center font-bold">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          <div className="md:col-span-5 space-y-1">
            <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#38BDF8]" />
              Destination Branch (Receiving)
            </label>
            <Select
              value={destinationStoreId}
              onChange={(e) => setDestinationStoreId(e.target.value)}
              required
            >
              {stores
                .filter((s) => s.id !== sourceStoreId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) {s.isMainBranch ? '• Main HQ' : ''}
                  </option>
                ))}
            </Select>
          </div>
        </div>

        {/* Priority & Reason Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#475569]">Priority Level</label>
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TransferPriority)}
            >
              <option value="ROUTINE">Routine Rebalancing</option>
              <option value="URGENT">Urgent Stock Deficit</option>
              <option value="EMERGENCY">Emergency Patient Need</option>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold text-[#475569]">Rebalancing Reason / Remarks</label>
            <Input
              type="text"
              placeholder="e.g. Branch stock-out, Near-expiry redistribution, Emergency prescription fulfillment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {/* Product Search & Selection Bar */}
        <div className="space-y-2 relative">
          <label className="text-xs font-bold text-[#475569] flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#0D5C63]" />
            Search & Add Medicine Items to Transfer
          </label>
          <SearchInput
            placeholder="Search catalog by medicine name, salt composition, or SKU..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />

          {/* Search Dropdown Results */}
          {searchedProducts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-[#F1F5F9]">
              {searchedProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleAddProduct(prod)}
                  className="p-3 hover:bg-[#F8FAFC] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-xs font-bold text-[#0B1F33]">{prod.productName}</p>
                    <p className="text-[10px] text-[#64748B]">
                      {prod.brand} • {prod.composition} • SKU: {prod.sku}
                    </p>
                  </div>
                  <Button variant="ghost" size="xs" icon={Plus}>
                    Add Item
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold">
                <th className="py-2.5 px-3">Medicine Master</th>
                <th className="py-2.5 px-3 text-center">Avail at Source</th>
                <th className="py-2.5 px-3 text-center min-w-[120px]">Requested Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                    No items added yet. Search and add products above.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const itemTotal = item.requestedQty * item.unitPurchaseCost;
                  const isStockWarning = item.requestedQty > item.availableStockAtSource;

                  return (
                    <tr key={item.productId} className="hover:bg-[#F8FAFC]">
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-[#0B1F33]">{item.productName}</p>
                        <p className="text-[10px] text-[#64748B] font-mono">
                          {item.brand} • SKU: {item.sku}
                        </p>
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            item.availableStockAtSource > 0
                              ? 'bg-[#E6F4F1] text-[#0D5C63]'
                              : 'bg-[#FEE2E2] text-[#DC2626]'
                          }`}
                        >
                          {item.availableStockAtSource} units
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min={1}
                            value={item.requestedQty}
                            onChange={(e) =>
                              handleUpdateItemQty(item.productId, parseInt(e.target.value) || 1)
                            }
                            className="w-20 px-2 py-1 border border-[#CBD5E1] rounded-lg text-center font-bold text-xs focus:ring-2 focus:ring-[#0D5C63] outline-none"
                          />
                          {isStockWarning && (
                            <span className="text-[9px] text-[#DC2626] font-semibold mt-0.5 flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5" /> Exceeds stock
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono">
                        ₹{safeToFixed(item.unitPurchaseCost)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0D5C63]">
                        ₹{safeToFixed(itemTotal)}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.productId)}
                          className="p-1 text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Transfer Summary Footer */}
        {items.length > 0 && (
          <div className="bg-[#E6F4F1]/60 p-3.5 rounded-xl border border-[#0D5C63]/20 flex items-center justify-between text-xs font-bold text-[#0D5C63]">
            <span>
              Total Items: <span className="font-mono">{items.length}</span>
            </span>
            <span>
              Total Transfer Units: <span className="font-mono">{totalQty}</span>
            </span>
            <span>
              Estimated Transfer Value: <span className="font-mono text-sm">₹{safeToFixed(totalValue)}</span>
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            isLoading={isSubmitting}
            disabled={items.length === 0}
          >
            Submit Transfer Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
