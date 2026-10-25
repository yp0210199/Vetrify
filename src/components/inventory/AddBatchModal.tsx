import React, { useState, useEffect } from 'react';
import { X, Search, Calendar, DollarSign, Package, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { getProducts } from '../../services/productService';
import { batchService } from '../../services/batchService';
import { Product } from '../../types/product';
import { Button } from '../ui/Button';
import { Timestamp } from 'firebase/firestore';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetProduct?: Product | null;
  onSuccess: () => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({
  isOpen,
  onClose,
  presetProduct,
  onSuccess,
}) => {
  const { organization, stores } = useWorkspace();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);

  const [storeId, setStoreId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Handle Preset Product
  useEffect(() => {
    if (presetProduct) {
      setSelectedProduct(presetProduct);
      setProductSearchQuery(presetProduct.productName);
      // Auto-populate default prices from product master data
      setPurchasePrice(presetProduct.defaultPurchaseCost?.toString() || '');
      setMrp(presetProduct.defaultMrp?.toString() || '');
      setSalePrice(presetProduct.defaultSalePrice?.toString() || '');
    } else {
      setSelectedProduct(null);
      setProductSearchQuery('');
      setPurchasePrice('');
      setMrp('');
      setSalePrice('');
    }
  }, [presetProduct, isOpen]);

  // Set default store from context if available
  useEffect(() => {
    if (stores && stores.length > 0 && !storeId) {
      setStoreId(stores[0].id);
    }
  }, [stores, isOpen]);

  // Search products debounced
  useEffect(() => {
    if (presetProduct || !productSearchQuery.trim() || selectedProduct?.productName === productSearchQuery) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      if (!organization) return;
      try {
        setIsSearchingProducts(true);
        const res = await getProducts(organization.id, {
          searchQuery: productSearchQuery,
          pageSize: 5,
        });
        setSearchResults(res.products);
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setIsSearchingProducts(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearchQuery, selectedProduct, presetProduct, organization]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!organization || !user) return;

    if (!selectedProduct) {
      setErrorMessage('Please select a medicine product from the catalog master.');
      return;
    }

    if (!storeId) {
      setErrorMessage('Please choose a valid store destination.');
      return;
    }

    if (!batchNumber.trim()) {
      setErrorMessage('Batch number is required.');
      return;
    }

    if (!manufacturingDate) {
      setErrorMessage('Manufacturing date is required.');
      return;
    }

    if (!expiryDate) {
      setErrorMessage('Expiry date is required.');
      return;
    }

    const mfgDateObj = new Date(manufacturingDate);
    const expDateObj = new Date(expiryDate);

    if (mfgDateObj > expDateObj) {
      setErrorMessage('Manufacturing date cannot be after the expiry date.');
      return;
    }

    const qtyVal = parseInt(quantity, 10);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setErrorMessage('Quantity must be a positive integer.');
      return;
    }

    const purchaseVal = parseFloat(purchasePrice);
    const mrpVal = parseFloat(mrp);
    const saleVal = parseFloat(salePrice);

    if (isNaN(purchaseVal) || purchaseVal < 0) {
      setErrorMessage('Purchase cost must be a non-negative number.');
      return;
    }
    if (isNaN(mrpVal) || mrpVal < 0) {
      setErrorMessage('MRP must be a non-negative number.');
      return;
    }
    if (isNaN(saleVal) || saleVal < 0) {
      setErrorMessage('Sale price must be a non-negative number.');
      return;
    }

    try {
      setIsLoading(true);
      const caller = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      };

      await batchService.createBatch(organization.id, caller, {
        storeId,
        productId: selectedProduct.id,
        productName: selectedProduct.productName,
        productSku: selectedProduct.sku,
        batchNumber: batchNumber.trim(),
        manufacturingDate: Timestamp.fromDate(mfgDateObj),
        expiryDate: Timestamp.fromDate(expDateObj),
        purchasePrice: purchaseVal,
        mrp: mrpVal,
        salePrice: saleVal,
        quantity: qtyVal,
        reservedQuantity: 0,
        availableQuantity: qtyVal,
        status: 'active',
        storageLocation: storageLocation.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Successfully inwarded Batch ${batchNumber.toUpperCase()} for ${selectedProduct.productName}`, 'Batch Lots Saved');
      
      // Reset non-preset form fields
      if (!presetProduct) {
        setSelectedProduct(null);
        setProductSearchQuery('');
      }
      setBatchNumber('');
      setManufacturingDate('');
      setExpiryDate('');
      setQuantity('');
      setNotes('');
      setStorageLocation('');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating batch:', err);
      setErrorMessage(err?.message || 'Failed to register the batch lot.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0B1F33]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-[#0B1F33] text-sm">Inward Medicine Batch Lot</h3>
            <p className="text-[11px] text-[#64748B]">Physically inward stock lots tied to a catalog master SKU</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#64748B] hover:text-[#0B1F33] hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Selector */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-bold text-[#334155] block">Medicine Product Master <span className="text-red-500">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search catalog by name, brand, SKU..."
                value={productSearchQuery}
                disabled={!!presetProduct}
                onChange={(e) => {
                  setProductSearchQuery(e.target.value);
                  if (selectedProduct && selectedProduct.productName !== e.target.value) {
                    setSelectedProduct(null);
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] disabled:bg-[#E2E8F0] disabled:cursor-not-allowed border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63]"
              />
            </div>

            {/* Results popup */}
            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E2E8F0] rounded-xl shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-[#F1F5F9]">
                {searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSelectedProduct(prod);
                      setProductSearchQuery(prod.productName);
                      setSearchResults([]);
                      // Prepopulate default pricing from product master
                      setPurchasePrice(prod.defaultPurchaseCost?.toString() || '');
                      setMrp(prod.defaultMrp?.toString() || '');
                      setSalePrice(prod.defaultSalePrice?.toString() || '');
                    }}
                    className="p-2.5 hover:bg-[#E6F4F1] cursor-pointer text-left transition-colors"
                  >
                    <div className="font-extrabold text-xs text-[#0B1F33]">{prod.productName}</div>
                    <div className="text-[10px] text-[#64748B]">Brand: {prod.brand} | SKU: {prod.sku}</div>
                  </div>
                ))}
              </div>
            )}
            {isSearchingProducts && (
              <div className="absolute right-3 top-8">
                <div className="w-3.5 h-3.5 border-2 border-t-[#0D5C63] border-[#CBD5E1] rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Store Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#334155] block">Target Store <span className="text-red-500">*</span></label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
            >
              <option value="">Select a target store...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Number & Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#334155] block">Batch Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. B-ST202"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] font-mono focus:outline-hidden focus:border-[#0D5C63]"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#334155] block">Physical Quantity <span className="text-red-500">*</span></label>
              <div className="relative">
                <Package className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="number"
                  placeholder="e.g. 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] font-mono-num focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Manufacturing & Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#334155] block">Mfg Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="date"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#334155] block">Expiry Date <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-[#94A3B8]" />
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Pricing Fields */}
          <div className="grid grid-cols-3 gap-3 bg-[#F8FAFC] p-3 rounded-2xl border border-[#E2E8F0]">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Purchase Cost <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-[#94A3B8]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0B1F33] font-mono-num focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">MRP <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-[#94A3B8]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0B1F33] font-mono-num focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#64748B] uppercase block">Sale Price <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs font-bold text-[#94A3B8]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0B1F33] font-mono-num focus:outline-hidden focus:border-[#0D5C63]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Storage Location & Shelf Info */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#334155] block">Storage Shelf / Cabinet Location</label>
            <input
              type="text"
              placeholder="e.g. Rack A - Shelf 2"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#334155] block">Inwarding Remarks / Notes</label>
            <textarea
              placeholder="Provide supplier lot numbers, quarantine notes, or physical observations..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-xs text-[#0B1F33] focus:outline-hidden focus:border-[#0D5C63]"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} isLoading={isLoading}>
            Submit Inward Entry
          </Button>
        </div>

      </div>
    </div>
  );
};
