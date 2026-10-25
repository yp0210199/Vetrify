import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Barcode,
  User,
  Plus,
  Minus,
  Trash2,
  Pause,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  Percent,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  Layers,
  FileText,
  Clock,
  History,
  Store,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Brain } from 'lucide-react';
import { clinicalService } from '../services/clinicalService';
import {
  PosCartItem,
  PosProductItem,
  PrescriptionDetails,
  SaleInvoice,
  PaymentMode,
  PharmacyBatch,
  Customer,
} from '../types';
import { posService, calculateBillSummary } from '../services/posService';
import { safeToFixed } from '../lib/formatting/formatters';
import { PrescriptionModal } from '../components/pos/PrescriptionModal';
import { BatchSelectorModal } from '../components/pos/BatchSelectorModal';
import { InvoicePrintModal } from '../components/pos/InvoicePrintModal';
import { CustomerSelectModal } from '../components/pos/CustomerSelectModal';
import { ManagerCreditOverrideModal } from '../components/pos/ManagerCreditOverrideModal';

interface HeldBill {
  id: string;
  timestamp: Date;
  customerName: string;
  customerPhone?: string;
  items: PosCartItem[];
  prescription?: PrescriptionDetails | null;
}

export const PosView: React.FC = () => {
  const { organization, currentStore, currentStaff } = useWorkspace();
  const { user } = useAuth();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Customer & Khata Credit State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCreditOverrideModalOpen, setIsCreditOverrideModalOpen] = useState(false);
  const [creditOverrideApproved, setCreditOverrideApproved] = useState(false);

  const handleSelectCustomer = (cust: Customer | null) => {
    setSelectedCustomer(cust);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerPhone(cust.phone || '');
    } else {
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      if (paymentMode === 'credit') {
        setPaymentMode('upi');
      }
    }
  };

  // Live Products and Loading States
  const [products, setProducts] = useState<PosProductItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Cart and Prescription
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);
  const [prescription, setPrescription] = useState<PrescriptionDetails | null>(null);

  // Modals State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [activeBatchProduct, setActiveBatchProduct] = useState<{
    productId: string;
    productName: string;
    brand: string;
    selectedBatchId: string;
    cartItemId: string;
  } | null>(null);
  const [productBatches, setProductBatches] = useState<PharmacyBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);

  // Invoices & Printing
  const [completedInvoice, setCompletedInvoice] = useState<SaleInvoice | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Held Bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [isHeldBillsDrawerOpen, setIsHeldBillsDrawerOpen] = useState(false);

  // Recent Invoices Drawer
  const [recentInvoices, setRecentInvoices] = useState<SaleInvoice[]>([]);
  const [isRecentInvoicesDrawerOpen, setIsRecentInvoicesDrawerOpen] = useState(false);
  const [isLoadingRecentInvoices, setIsLoadingRecentInvoices] = useState(false);

  // Clinical Safety State
  const [clinicalResult, setClinicalResult] = useState<any>(null);
  const [isClinicalChecking, setIsClinicalChecking] = useState(false);
  const [clinicalOverrideReason, setClinicalOverrideReason] = useState<string | null>(null);
  const [isClinicalOverrideModalOpen, setIsClinicalOverrideModalOpen] = useState(false);
  const [clinicalOverrideInput, setClinicalOverrideInput] = useState('');

  // Strict RBAC override privilege validation
  const isAuthorizedToOverride = useMemo(() => {
    const role = currentStaff?.roleId;
    return role === 'owner' || role === 'admin' || role === 'pharmacist';
  }, [currentStaff]);

  // 1. Fetch live product master and FEFO stock from Firestore
  const loadProducts = useCallback(async () => {
    if (!organization?.id || !currentStore?.id) return;
    setIsLoadingProducts(true);
    setErrorMessage(null);
    try {
      const items = await posService.searchPosProducts(organization.id, currentStore.id, {
        searchQuery: searchQuery.trim() || undefined,
        pageSize: 60,
      });
      setProducts(items);
    } catch (err: any) {
      console.error('Failed to load POS products:', err);
      setErrorMessage('Unable to load live inventory catalog. Please verify store connection.');
    } finally {
      setIsLoadingProducts(false);
    }
  }, [organization?.id, currentStore?.id, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Check if cart contains Schedule H / H1 / X or prescription-required drugs
  const hasRestrictedDrugs = useMemo(() => {
    return cartItems.some(
      (item) =>
        item.isPrescriptionRequired ||
        item.schedule === 'H' ||
        item.schedule === 'H1' ||
        item.schedule === 'X'
    );
  }, [cartItems]);

  const restrictedItemsCount = useMemo(() => {
    return cartItems.filter(
      (item) =>
        item.isPrescriptionRequired ||
        item.schedule === 'H' ||
        item.schedule === 'H1' ||
        item.schedule === 'X'
    ).length;
  }, [cartItems]);

  // Bill Financial Summary
  const billSummary = useMemo(() => {
    return calculateBillSummary(cartItems);
  }, [cartItems]);

  // 2. Add product to cart with FEFO batch allocation
  const handleAddToCart = (product: PosProductItem) => {
    setErrorMessage(null);
    if (!product.hasBatches || product.stock <= 0) {
      setErrorMessage(`No available stock for "${product.name}" in this store.`);
      return;
    }

    const cartItemId = `${product.id}_${product.batchId}`;
    const existingIndex = cartItems.findIndex((item) => item.id === cartItemId);

    if (existingIndex > -1) {
      const updated = [...cartItems];
      const item = updated[existingIndex];
      if (item.qty + 1 > product.stock) {
        setErrorMessage(`Cannot exceed available batch stock (${product.stock} units) for "${product.name}".`);
        return;
      }
      item.qty += 1;
      const base = item.qty * item.price;
      const disc = (base * item.discountPercent) / 100;
      item.discountAmount = disc;
      item.taxableAmount = base - disc;
      item.total = item.taxableAmount + (item.taxableAmount * item.gstPercent) / 100;
      setCartItems(updated);
    } else {
      const newItem: PosCartItem = {
        id: cartItemId,
        productId: product.id,
        name: `${product.name} (${product.brand})`,
        brand: product.brand,
        composition: product.composition,
        sku: product.sku,
        batchId: product.batchId,
        batch: product.batch,
        expiry: product.expiry,
        qty: 1,
        availableStock: product.stock,
        unit: product.unit,
        mrp: product.mrp,
        price: product.price,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: product.price,
        gstPercent: product.gst,
        cgstAmount: (product.price * (product.gst / 2)) / 100,
        sgstAmount: (product.price * (product.gst / 2)) / 100,
        totalTax: (product.price * product.gst) / 100,
        total: product.price + (product.price * product.gst) / 100,
        dosageForm: product.dosageForm,
        hsnCode: product.hsnCode,
        schedule: product.schedule,
        isPrescriptionRequired: product.isPrescriptionRequired,
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // 3. Handle Barcode Scanning
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const term = barcodeInput.trim().toLowerCase();
    const matched = products.find(
      (p) =>
        p.sku.toLowerCase() === term ||
        p.batch.toLowerCase() === term ||
        p.name.toLowerCase().includes(term)
    );

    if (matched) {
      handleAddToCart(matched);
      setBarcodeInput('');
    } else {
      setErrorMessage(`No product or batch found matching barcode: "${barcodeInput}"`);
    }
  };

  // 4. Quantity Adjustments
  const handleUpdateQty = (cartItemId: string, delta: number) => {
    setCartItems(
      cartItems
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > item.availableStock) {
              setErrorMessage(`Cannot exceed available batch stock (${item.availableStock} units).`);
              return item;
            }
            const base = newQty * item.price;
            const disc = (base * item.discountPercent) / 100;
            const taxable = base - disc;
            return {
              ...item,
              qty: newQty,
              discountAmount: disc,
              taxableAmount: taxable,
              total: taxable + (taxable * item.gstPercent) / 100,
            };
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  };

  const handleUpdateDiscount = (cartItemId: string, discountPercent: number) => {
    const safeDisc = Math.min(100, Math.max(0, discountPercent));
    setCartItems(
      cartItems.map((item) => {
        if (item.id === cartItemId) {
          const base = item.qty * item.price;
          const disc = (base * safeDisc) / 100;
          const taxable = base - disc;
          return {
            ...item,
            discountPercent: safeDisc,
            discountAmount: disc,
            taxableAmount: taxable,
            total: taxable + (taxable * item.gstPercent) / 100,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems(cartItems.filter((i) => i.id !== cartItemId));
  };

  // 5. Manual Batch Selector Trigger
  const handleOpenBatchSelector = async (item: PosCartItem) => {
    if (!organization?.id || !currentStore?.id) return;
    setActiveBatchProduct({
      productId: item.productId,
      productName: item.name,
      brand: item.brand,
      selectedBatchId: item.batchId,
      cartItemId: item.id,
    });
    setIsBatchModalOpen(true);
    setIsLoadingBatches(true);
    try {
      const batches = await posService.getBatchesForProduct(
        organization.id,
        item.productId,
        currentStore.id
      );
      setProductBatches(batches);
    } catch (err) {
      console.error('Error fetching product batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const handleSelectAlternativeBatch = (newBatch: PharmacyBatch) => {
    if (!activeBatchProduct) return;
    setCartItems(
      cartItems.map((item) => {
        if (item.id === activeBatchProduct.cartItemId) {
          const safeQty = Math.min(item.qty, newBatch.availableQuantity);
          const price = newBatch.salePrice || item.price;
          const base = safeQty * price;
          const disc = (base * item.discountPercent) / 100;
          const taxable = base - disc;
          return {
            ...item,
            id: `${item.productId}_${newBatch.id}`,
            batchId: newBatch.id,
            batch: newBatch.batchNumber,
            expiry: newBatch.expiryDate ? new Date((newBatch.expiryDate as any).seconds * 1000).toISOString().slice(2, 7) : item.expiry,
            availableStock: newBatch.availableQuantity,
            qty: safeQty,
            price: price,
            mrp: newBatch.mrp || item.mrp,
            taxableAmount: taxable,
            total: taxable + (taxable * item.gstPercent) / 100,
            isManualBatchOverride: true,
          };
        }
        return item;
      })
    );
  };

  // 6. Settle & Execute Atomic Firestore Sale Transaction
  const handleSettle = async () => {
    if (!organization?.id || !currentStore?.id) {
      setErrorMessage('No active organization or store selected.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Cart is empty. Add medicines to proceed with billing.');
      return;
    }

    // Check Schedule H prescription requirement
    if (hasRestrictedDrugs && !prescription) {
      setIsPrescriptionModalOpen(true);
      setErrorMessage('Statutory Prescription required for Schedule H/H1/X items before checkout.');
      return;
    }

    // Check Credit Sale / Khata requirements
    if (paymentMode === 'credit') {
      if (!selectedCustomer) {
        setIsCustomerModalOpen(true);
        setErrorMessage('Customer selection is mandatory for Khata Credit Sales.');
        return;
      }
      if (!selectedCustomer.creditEnabled) {
        setErrorMessage(`Khata credit facility is disabled for customer '${selectedCustomer.name}'. Select cash/UPI/card mode.`);
        return;
      }
      if (selectedCustomer.status !== 'active') {
        setErrorMessage(`Customer account '${selectedCustomer.name}' is ${selectedCustomer.status}. Credit sale prohibited.`);
        return;
      }

      const projectedOutstanding = (selectedCustomer.currentOutstanding || 0) + billSummary.grandTotal;
      if (projectedOutstanding > (selectedCustomer.creditLimit || 0) && !creditOverrideApproved) {
        setIsCreditOverrideModalOpen(true);
        return;
      }
    }

    // 5.5 Clinical Safety Checks (AI + Local Deterministic)
    if (!clinicalOverrideReason) {
      setIsCheckingOut(true);
      try {
        const patientNameVal = prescription?.patientName || customerName || 'Walk-in Patient';
        const patientAgeVal = prescription?.patientAge ? Number(prescription.patientAge) : 35;
        const patientGenderVal = prescription?.patientGender || 'male';
        const patientHistoryVal = prescription?.notes || '';

        const checkRes = await clinicalService.runComprehensiveClinicalCheck(
          organization.id,
          cartItems,
          patientNameVal,
          patientAgeVal,
          patientGenderVal,
          patientHistoryVal
        );

        setClinicalResult(checkRes);

        const hasSevereInteractions = checkRes.interactions.some((i: any) => i.severity === 'Severe');
        const hasDuplicates = checkRes.duplicates.length > 0;
        const hasBannedSubstances = checkRes.bannedOrSuspended.length > 0;

        if (hasSevereInteractions || hasDuplicates || hasBannedSubstances) {
          setIsClinicalOverrideModalOpen(true);
          setIsCheckingOut(false);
          return;
        }
      } catch (clinicalErr: any) {
        console.error('Clinical safety check engine failed/offline:', clinicalErr);
        // Fail-safe: construct a LOCAL_ONLY clinicalResult forcing override due to engine failure
        const offlineResult = {
          interactions: [],
          duplicates: [],
          contraindications: [],
          dosageWarnings: [],
          bannedOrSuspended: [
            {
              drug: 'SYSTEM_ERROR',
              reason: `Clinical check engine offline or query failed: ${clinicalErr?.message || 'Unknown error'}. Manual clinical verification is mandatory for patient safety.`,
              alternative: 'Perform manual cross-reference of chemical ingredients, drug-drug compatibility, and CDSCO rules.',
            }
          ],
          safeToDispense: false,
          engineType: 'LOCAL_ONLY' as const,
          aiError: clinicalErr?.message || 'Clinical validation engine offline'
        };
        setClinicalResult(offlineResult);
        setIsClinicalOverrideModalOpen(true);
        setIsCheckingOut(false);
        return;
      }
    }

    setIsCheckingOut(true);
    setErrorMessage(null);

    try {
      const invoice = await posService.createSaleInvoice({
        organizationId: organization.id,
        storeId: currentStore.id,
        storeCode: currentStore.code || 'POS',
        customerId: selectedCustomer?.id,
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim() || undefined,
        paymentMode,
        items: cartItems,
        prescription: hasRestrictedDrugs ? prescription : null,
        creditOverrideUsed: creditOverrideApproved,
        clinicalOverrideReason,
        caller: {
          uid: user?.uid || currentStaff?.uid || 'cashier',
          email: user?.email || currentStaff?.email || null,
          displayName: currentStaff?.displayName || user?.displayName || 'Dispenser',
        },
      });

      setCompletedInvoice(invoice);
      setIsPrintModalOpen(true);
      setCartItems([]);
      setPrescription(null);
      setSelectedCustomer(null);
      setCreditOverrideApproved(false);
      setClinicalOverrideReason(null);
      setClinicalResult(null);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');

      // Refresh live inventory products
      loadProducts();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Sale transaction failed.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // 7. Hold / Park Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    const newHeld: HeldBill = {
      id: `hold_${Date.now()}`,
      timestamp: new Date(),
      customerName,
      customerPhone,
      items: [...cartItems],
      prescription,
    };
    setHeldBills([newHeld, ...heldBills]);
    setCartItems([]);
    setPrescription(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  const handleResumeHeldBill = (held: HeldBill) => {
    setCartItems(held.items);
    setPrescription(held.prescription || null);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone || '');
    setHeldBills(heldBills.filter((h) => h.id !== held.id));
    setIsHeldBillsDrawerOpen(false);
  };

  // 8. Fetch Recent Invoices
  const handleOpenRecentInvoices = async () => {
    if (!organization?.id || !currentStore?.id) return;
    setIsRecentInvoicesDrawerOpen(true);
    setIsLoadingRecentInvoices(true);
    try {
      const invs = await posService.getRecentInvoices(organization.id, currentStore.id, 25);
      setRecentInvoices(invs);
    } catch (err) {
      console.error('Error fetching recent invoices:', err);
    } finally {
      setIsLoadingRecentInvoices(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top POS Status Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {currentStore?.name || 'Retail POS Counter'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            Store: <strong className="text-slate-800 dark:text-slate-200">{currentStore?.code || 'MAIN'}</strong> • Cashier: {currentStaff?.displayName || user?.displayName || 'Rahul P.'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Recent Invoices Button */}
          <button
            type="button"
            onClick={handleOpenRecentInvoices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Bills</span>
          </button>

          {/* Hold Bills Counter */}
          <button
            type="button"
            onClick={() => setIsHeldBillsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Held Bills</span>
            {heldBills.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono">
                {heldBills.length}
              </span>
            )}
          </button>

          {/* Refresh Catalog */}
          <button
            type="button"
            onClick={loadProducts}
            disabled={isLoadingProducts}
            title="Refresh Store Catalog"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProducts ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 3-Panel POS Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Live Product Master & FEFO Catalog (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 flex flex-col max-h-[calc(100vh-190px)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Live Store Inventory Catalog
            </h3>
            <span className="text-[11px] text-slate-500">{products.length} Products</span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand, generic, or SKU..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1">
            {isLoadingProducts ? (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center text-slate-400">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs">Querying store catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400">
                <p className="text-xs font-semibold">No medicines match your search.</p>
                <p className="text-[11px] text-slate-500 mt-1">Check inward stock or add product master records.</p>
              </div>
            ) : (
              products.map((prod) => {
                const hasStock = prod.hasBatches && prod.stock > 0;
                return (
                  <div
                    key={prod.id}
                    id={`pos-product-${prod.id}`}
                    onClick={() => handleAddToCart(prod)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group shadow-xs ${
                      hasStock
                        ? 'border-slate-200 dark:border-slate-800 hover:border-teal-500 hover:bg-teal-50/20 dark:hover:bg-teal-950/20 bg-white dark:bg-slate-800/60'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {prod.dosageForm}
                      </span>
                      {prod.schedule && prod.schedule !== 'OTC' && (
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 rounded">
                          Sch {prod.schedule}
                        </span>
                      )}
                    </div>

                    <div className="my-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 leading-tight line-clamp-1">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{prod.brand}</p>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">
                          ₹{safeToFixed(prod.price)}
                        </span>
                        <span className={`text-[10px] font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {hasStock ? `${prod.stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                      {hasStock && (
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                          <span>FEFO: {prod.batch}</span>
                          <span>Exp: {prod.expiry}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Active Cart & Scanner (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 flex flex-col min-h-[520px]">
          {/* Customer & Prescription Header */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 flex items-center justify-center transition-colors"
                title="Select registered customer or Khata account"
              >
                <User className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {customerName}
                  </span>
                  {selectedCustomer && (
                    <Badge variant={selectedCustomer.creditEnabled ? 'success' : 'secondary'} className="text-3xs py-0">
                      {selectedCustomer.creditEnabled ? 'Khata Active' : 'Cash Only'}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    className="text-3xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    [Select / Change]
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {customerPhone ? `Phone: ${customerPhone}` : 'Walk-in Retail Client'}
                  {selectedCustomer?.creditEnabled && (
                    <span className="ml-1 text-teal-600 font-bold">
                      | Avail Credit: ₹{safeToFixed((selectedCustomer.creditLimit || 0) - (selectedCustomer.currentOutstanding || 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasRestrictedDrugs && (
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  prescription
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 animate-bounce'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{prescription ? 'Rx Attached ✓' : 'Attach Rx *'}</span>
              </button>
            )}
          </div>

          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="pos-barcode-input"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode or press Enter to add item..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
            >
              Add
            </button>
          </form>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
            {cartItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Barcode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Active cart is empty</p>
                <p className="text-[11px] mt-0.5 text-slate-500">Scan barcodes or click items on the catalog to begin dispensing.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="py-2.5 px-1.5 flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>
                      {item.schedule && item.schedule !== 'OTC' && (
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-1 rounded">
                          Sch {item.schedule}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {/* Clickable Batch Pill for Manual Override */}
                      <button
                        type="button"
                        onClick={() => handleOpenBatchSelector(item)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Click to switch batch"
                      >
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>B: <strong>{item.batch}</strong></span>
                      </button>
                      <span>Exp: {item.expiry}</span>
                      <span>Rate: ₹{safeToFixed(item.price)}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Total & Discount Input */}
                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono block">
                      ₹{safeToFixed(item.total)}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discountPercent || ''}
                      onChange={(e) => handleUpdateDiscount(item.id, Number(e.target.value))}
                      placeholder="0% disc"
                      className="w-12 text-right text-[9px] bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-teal-500 focus:outline-none text-slate-500"
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Schedule H Statutory Warning */}
          {hasRestrictedDrugs && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Schedule H/H1/X items require registered doctor prescription.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrescriptionModalOpen(true)}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold shrink-0 transition-colors"
              >
                {prescription ? 'Edit Rx' : 'Add Details'}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Bill Summary & Settlement (3 Cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Bill Summary & Settlement
            </h3>

            {/* Payment Method Selector */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Payment Mode</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'upi', label: 'UPI / QR', icon: QrCode },
                  { id: 'cash', label: 'Cash (F9)', icon: Banknote },
                  { id: 'card', label: 'Card / POS', icon: CreditCard },
                  { id: 'credit', label: 'Credit / Khata', icon: RotateCcw },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setPaymentMode(mode.id as PaymentMode)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/10 text-teal-600 dark:text-teal-400 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Items Gross ({cartItems.length} items, {billSummary.totalQty} units)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{safeToFixed(billSummary.subtotal)}
                </span>
              </div>
              {billSummary.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Discount Savings</span>
                  <span className="font-mono font-semibold">-₹{safeToFixed(billSummary.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Taxable Value</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{safeToFixed(billSummary.taxableAmount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>CGST + SGST</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{safeToFixed(billSummary.cgstAmount + billSummary.sgstAmount)}
                </span>
              </div>
              {billSummary.roundOff !== 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Round Off</span>
                  <span className="font-mono">
                    {billSummary.roundOff > 0 ? `+₹${safeToFixed(billSummary.roundOff)}` : `-₹${safeToFixed(Math.abs(billSummary.roundOff))}`}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-baseline justify-between">
                <span className="text-sm font-black text-slate-900 dark:text-white uppercase">Grand Total</span>
                <span className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
                  ₹{safeToFixed(billSummary.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Settle / Hold Buttons */}
          <div className="space-y-2 pt-2">
            <button
              id="btn-pos-settle-bill"
              type="button"
              onClick={handleSettle}
              disabled={cartItems.length === 0 || isCheckingOut}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isCheckingOut ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Sale Transaction...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>Settle & Print Tax Invoice</span>
                </>
              )}
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Hold Bill</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartItems([]);
                  setPrescription(null);
                }}
                disabled={cartItems.length === 0}
                className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Capture Modal */}
      <PrescriptionModal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        onSave={(details) => setPrescription(details)}
        initialData={prescription}
        restrictedItemsCount={restrictedItemsCount}
      />

      {/* Manual Batch Selector Modal */}
      {activeBatchProduct && (
        <BatchSelectorModal
          isOpen={isBatchModalOpen}
          onClose={() => {
            setIsBatchModalOpen(false);
            setActiveBatchProduct(null);
          }}
          productName={activeBatchProduct.productName}
          brand={activeBatchProduct.brand}
          batches={productBatches}
          selectedBatchId={activeBatchProduct.selectedBatchId}
          onSelectBatch={handleSelectAlternativeBatch}
          isLoading={isLoadingBatches}
        />
      )}

      {/* Statutory Invoice Print & Cash Memo Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setCompletedInvoice(null);
        }}
        invoice={completedInvoice}
        organization={organization}
        store={currentStore}
      />

      {/* Held Bills Drawer / Modal */}
      {isHeldBillsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pause className="w-4 h-4 text-amber-500" />
                Parked & Held Bills ({heldBills.length})
              </h3>
              <button
                type="button"
                onClick={() => setIsHeldBillsDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {heldBills.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No held bills at the moment.</p>
            ) : (
              heldBills.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{h.customerName}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {h.timestamp.toLocaleTimeString()} • {h.items.length} items
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResumeHeldBill(h)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Resume Bill
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Recent Invoices Drawer */}
      {isRecentInvoicesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                Recent Store Invoices
              </h3>
              <button
                type="button"
                onClick={() => setIsRecentInvoicesDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {isLoadingRecentInvoices ? (
              <div className="py-8 text-center text-slate-400">Loading invoices...</div>
            ) : recentInvoices.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">No recent invoices recorded yet today.</p>
            ) : (
              <div className="space-y-2">
                {recentInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                          ₹{inv.grandTotal.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {inv.customerName} • {inv.itemsCount} items • {inv.paymentMode.toUpperCase()}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCompletedInvoice(inv);
                        setIsRecentInvoicesDrawerOpen(false);
                        setIsPrintModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Re-Print</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customer Select Modal */}
      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
        selectedCustomerId={selectedCustomer?.id}
      />

      {/* Manager Credit Override Modal */}
      {selectedCustomer && (
        <ManagerCreditOverrideModal
          isOpen={isCreditOverrideModalOpen}
          onClose={() => setIsCreditOverrideModalOpen(false)}
          customer={selectedCustomer}
          saleTotal={billSummary.grandTotal}
          onApproveOverride={() => {
            setCreditOverrideApproved(true);
            setIsCreditOverrideModalOpen(false);
            handleSettle();
          }}
        />
      )}

      {/* Clinical Safety Alert & Compliance Justification Modal */}
      {isClinicalOverrideModalOpen && clinicalResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Clinical Safety & Compliance Block
                </h3>
                <p className="text-3xs text-slate-500 uppercase tracking-wider font-bold">
                  Statutory checks detected risk factors requiring registered pharmacist justification
                </p>
              </div>
            </div>

            {/* Validation Engine Source Badge */}
            <div className="flex flex-wrap gap-2 pt-1">
              {clinicalResult.engineType === 'AI_ENHANCED' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 animate-pulse" />
                  <span>AI-Enhanced Safety Engine Active</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Deterministic Local CDSCO Rules Only</span>
                  {clinicalResult.aiError && (
                    <span className="text-slate-500 dark:text-slate-400 font-normal text-[10px] ml-1">
                      ({clinicalResult.aiError})
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* CDSCO Banned Alerts */}
              {clinicalResult.bannedOrSuspended && clinicalResult.bannedOrSuspended.length > 0 && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl space-y-1">
                  <span className="text-xs font-black text-red-800 dark:text-red-400 uppercase block">
                    🚫 CDSCO Prohibited drug combinations
                  </span>
                  {clinicalResult.bannedOrSuspended.map((ban: any, idx: number) => (
                    <p key={idx} className="text-xs text-red-900 dark:text-red-200">
                      <strong>{ban.drug}</strong>: {ban.reason}
                    </p>
                  ))}
                </div>
              )}

              {/* Severe Interaction Alerts */}
              {clinicalResult.interactions && clinicalResult.interactions.length > 0 && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
                  <span className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase block">
                    ⚠️ Severe Drug-Drug Interactions
                  </span>
                  {clinicalResult.interactions.map((inter: any, idx: number) => (
                    <div key={idx} className="text-xs text-rose-950 dark:text-rose-200">
                      <strong>{inter.drugs.join(' ↔ ')}</strong>: {inter.mechanism}
                      {inter.recommendation && (
                        <p className="mt-1 font-semibold text-rose-700 dark:text-rose-300">Recommendation: {inter.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Duplicate Therapy Alerts */}
              {clinicalResult.duplicates && clinicalResult.duplicates.length > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                  <span className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase block">
                    ⚠️ Duplicate Therapeutic Classes
                  </span>
                  {clinicalResult.duplicates.map((dup: any, idx: number) => (
                    <div key={idx} className="text-xs text-amber-950 dark:text-amber-200">
                      <strong>Overlapping Drugs: {dup.drugs.join(', ')}</strong> — {dup.clinicalNote}
                    </div>
                  ))}
                </div>
              )}

              {/* Patient Contraindications */}
              {clinicalResult.contraindications && clinicalResult.contraindications.length > 0 && (
                <div className="p-3.5 bg-red-50/50 dark:bg-red-950/20 border border-red-200/65 dark:border-red-900/60 rounded-xl space-y-1">
                  <span className="text-xs font-black text-red-800 dark:text-red-400 uppercase block">
                    ❌ Patient Contraindications Detected
                  </span>
                  {clinicalResult.contraindications.map((contra: any, idx: number) => (
                    <div key={idx} className="text-xs text-red-900 dark:text-red-200">
                      <strong>{contra.drug}</strong> ({contra.type}): {contra.clinicalNote}
                      {contra.recommendation && (
                        <p className="mt-0.5 font-semibold text-red-700 dark:text-red-400 font-mono text-[10px]">Rec: {contra.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Dosage Warnings */}
              {clinicalResult.dosageWarnings && clinicalResult.dosageWarnings.length > 0 && (
                <div className="p-3.5 bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200/65 dark:border-yellow-900/60 rounded-xl space-y-1">
                  <span className="text-xs font-black text-yellow-800 dark:text-yellow-400 uppercase block">
                    ⚠️ Dosage & Storage Warnings
                  </span>
                  {clinicalResult.dosageWarnings.map((warn: any, idx: number) => (
                    <div key={idx} className="text-xs text-yellow-950 dark:text-yellow-200">
                      <strong>{warn.drug}</strong>: {warn.warning} — {warn.clinicalNote}
                      {warn.recommendation && (
                        <p className="mt-0.5 font-semibold text-yellow-700 dark:text-yellow-400 font-mono text-[10px]">Rec: {warn.recommendation}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strict RBAC Privilege Validation Message */}
            {!isAuthorizedToOverride && (
              <div className="p-3.5 bg-red-100 dark:bg-red-950/80 border border-red-300 dark:border-red-900 rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-red-900 dark:text-red-200 block">
                    Security Authorization Required
                  </span>
                  <p className="text-[11px] text-red-800 dark:text-red-300">
                    Your active role (<strong>{currentStaff?.roleId || 'staff'}</strong>) is not authorized to bypass clinical safety warnings. Only a registered <strong>Pharmacist</strong>, <strong>Admin</strong>, or <strong>Owner</strong> can authorize this checkout override.
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                Required Audit Override Justification
              </label>
              <textarea
                rows={3}
                disabled={!isAuthorizedToOverride}
                placeholder={isAuthorizedToOverride ? "Enter formal justification (e.g., Physician approved; monitored dosage; patient informed)" : "Pharmacist credentials required to override"}
                value={clinicalOverrideInput}
                onChange={(e) => setClinicalOverrideInput(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
              />
              <p className="text-[10px] text-slate-500">
                * Note: This clinical event, along with your override justification and staff credentials, will be immutably recorded in the Audit Centre and assigned to compliance officers for high-priority review.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsClinicalOverrideModalOpen(false);
                  setClinicalOverrideInput('');
                  setClinicalResult(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Cancel Checkout
              </button>
              <button
                type="button"
                disabled={!isAuthorizedToOverride || clinicalOverrideInput.trim().length < 8}
                onClick={() => {
                  setClinicalOverrideReason(clinicalOverrideInput.trim());
                  setIsClinicalOverrideModalOpen(false);
                  setTimeout(() => {
                    handleSettle();
                  }, 50);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-rose-600/15 transition-all"
              >
                Confirm Override & Dispense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
