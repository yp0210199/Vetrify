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
  RotateCcw,
  Layers,
  FileText,
  History,
  RefreshCw,
  Calculator,
  Truck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users as UsersIcon,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import {
  PosCartItem,
  PosProductItem,
  SaleInvoice,
  PaymentMode,
  TileLotBatch,
  Customer,
  ArchitectPartner,
} from '../types';
import { posService, calculateBillSummary } from '../services/posService';
import { safeToFixed } from '../lib/formatting/formatters';
import { BatchSelectorModal } from '../components/pos/BatchSelectorModal';
import { InvoicePrintModal } from '../components/pos/InvoicePrintModal';
import { CustomerSelectModal } from '../components/pos/CustomerSelectModal';
import { ManagerCreditOverrideModal } from '../components/pos/ManagerCreditOverrideModal';
import { TileCalculatorModal } from '../components/pos/TileCalculatorModal';
import { QuotationModal, PosQuotation } from '../components/pos/QuotationModal';
import { ComboSuiteBuilderModal } from '../components/pos/ComboSuiteBuilderModal';
import {
  ArchitectCommissionModal,
  INITIAL_ARCHITECT_PARTNERS,
} from '../components/pos/ArchitectCommissionModal';

interface HeldBill {
  id: string;
  timestamp: Date;
  customerName: string;
  customerPhone?: string;
  items: PosCartItem[];
  freightAmount?: string;
  loadingUnloadingAmount?: string;
  selectedArchitect?: ArchitectPartner | null;
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
  const [freightAmount, setFreightAmount] = useState('');
  const [loadingUnloadingAmount, setLoadingUnloadingAmount] = useState('');
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

  // Active Cart
  const [cartItems, setCartItems] = useState<PosCartItem[]>([]);

  // Tile Area & Box Calculator State
  const [isTileCalcOpen, setIsTileCalcOpen] = useState(false);
  const [activeCalcItem, setActiveCalcItem] = useState<{
    cartItemId?: string;
    productName: string;
    coveragePerBoxSqFt?: number;
    piecesPerBox?: number;
  } | null>(null);

  // Quotations / Proforma Estimates State
  const [isQuotationsModalOpen, setIsQuotationsModalOpen] = useState(false);
  const [quotations, setQuotations] = useState<PosQuotation[]>(() => {
    try {
      const saved = localStorage.getItem('vetrify_pos_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isQuotationPrint, setIsQuotationPrint] = useState(false);

  // Combo & Bathroom Suite Builder State
  const [isComboSuiteOpen, setIsComboSuiteOpen] = useState(false);

  // Architect, Interior Designer & Contractor Referral Commission State
  const [isArchitectModalOpen, setIsArchitectModalOpen] = useState(false);
  const [architectPartners, setArchitectPartners] = useState<ArchitectPartner[]>(() => {
    try {
      const saved = localStorage.getItem('vetrify_architect_partners');
      return saved ? JSON.parse(saved) : INITIAL_ARCHITECT_PARTNERS;
    } catch {
      return INITIAL_ARCHITECT_PARTNERS;
    }
  });
  const [selectedArchitect, setSelectedArchitect] = useState<ArchitectPartner | null>(null);

  // Modals State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [activeBatchProduct, setActiveBatchProduct] = useState<{
    productId: string;
    productName: string;
    brand: string;
    selectedBatchId: string;
    cartItemId: string;
  } | null>(null);
  const [productBatches, setProductBatches] = useState<TileLotBatch[]>([]);
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

  // Bill Financial Summary
  const billSummary = useMemo(() => {
    return calculateBillSummary(
      cartItems,
      parseFloat(freightAmount) || 0,
      parseFloat(loadingUnloadingAmount) || 0
    );
  }, [cartItems, freightAmount, loadingUnloadingAmount]);

  // 2. Add product to cart with Lot/Shade batch allocation
  const handleAddToCart = (product: PosProductItem) => {
    setErrorMessage(null);
    if (!product.hasBatches || product.stock <= 0) {
      setErrorMessage(`No available stock for "${product.name}" in this showroom.`);
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
        isPrescriptionRequired: false,
        shadeNumber: product.shadeNumber,
        toneCode: product.toneCode,
        caliberCode: product.caliberCode,
        finish: product.finish,
        grade: product.grade,
        dimensionsMm: product.dimensionsMm,
        coveragePerBoxSqFt: product.coveragePerBoxSqFt,
        piecesPerBox: product.piecesPerBox,
        weightPerBoxKg: product.weightPerBoxKg,
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
      setErrorMessage(`No product or lot found matching: "${barcodeInput}"`);
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
              setErrorMessage(`Cannot exceed available lot stock (${item.availableStock} units).`);
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

  // 5. Manual Batch/Lot Selector Trigger
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

  const handleSelectAlternativeBatch = (newBatch: TileLotBatch) => {
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
            shadeNumber: newBatch.shadeNumber || '',
            toneCode: newBatch.toneCode || '',
            caliberCode: newBatch.caliberCode || '',
            grade: (newBatch as any).grade || item.grade,
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

  // 6. Tile Area & Box Calculator Handlers
  const handleApplyTileCalculation = (result: {
    boxesNeeded: number;
    totalSqFtNeeded: number;
    wastagePercent: number;
  }) => {
    if (activeCalcItem?.cartItemId) {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item.id === activeCalcItem.cartItemId) {
            const newQty = result.boxesNeeded;
            const base = newQty * item.price;
            const disc = (base * item.discountPercent) / 100;
            const taxable = base - disc;
            return {
              ...item,
              qty: newQty,
              sqFtCalculated: result.totalSqFtNeeded,
              discountAmount: disc,
              taxableAmount: taxable,
              total: taxable + (taxable * item.gstPercent) / 100,
            };
          }
          return item;
        })
      );
    }
  };

  // 7. Combo Suite Builder Handler
  const handleAddSuiteToCart = (suiteItems: PosCartItem[]) => {
    setErrorMessage(null);
    if (!suiteItems || suiteItems.length === 0) return;

    setCartItems((prev) => {
      const updated = [...prev];
      for (const sItem of suiteItems) {
        const existingIdx = updated.findIndex((u) => u.id === sItem.id);
        if (existingIdx > -1) {
          const item = updated[existingIdx];
          item.qty += sItem.qty;
          const base = item.qty * item.price;
          const disc = (base * item.discountPercent) / 100;
          item.discountAmount = disc;
          item.taxableAmount = base - disc;
          item.total = item.taxableAmount + (item.taxableAmount * item.gstPercent) / 100;
        } else {
          updated.push(sItem);
        }
      }
      return updated;
    });
    setIsComboSuiteOpen(false);
  };

  // 8. Architect / Referral Partner Handlers
  const handleAddArchitectPartner = (
    partnerData: Omit<
      ArchitectPartner,
      'id' | 'totalBusinessDriven' | 'totalCommissionAccrued' | 'totalCommissionPaid' | 'pendingBalance'
    >
  ) => {
    const newPartner: ArchitectPartner = {
      ...partnerData,
      id: `arch_${Date.now()}`,
      totalBusinessDriven: 0,
      totalCommissionAccrued: 0,
      totalCommissionPaid: 0,
      pendingBalance: 0,
    };
    const updated = [newPartner, ...architectPartners];
    setArchitectPartners(updated);
    try {
      localStorage.setItem('vetrify_architect_partners', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save architect partners', e);
    }
  };

  const handleRecordArchitectPayout = (partnerId: string, amount: number, _notes?: string) => {
    const updated = architectPartners.map((p) => {
      if (p.id === partnerId) {
        const newPaid = (p.totalCommissionPaid || 0) + amount;
        const newBal = (p.totalCommissionAccrued || 0) - newPaid;
        return {
          ...p,
          totalCommissionPaid: newPaid,
          pendingBalance: Math.max(0, newBal),
        };
      }
      return p;
    });
    setArchitectPartners(updated);
    try {
      localStorage.setItem('vetrify_architect_partners', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update architect payout', e);
    }
  };

  // 9. Quotation / Proforma Estimate Handlers
  const handleSaveQuotation = () => {
    if (cartItems.length === 0) {
      setErrorMessage('Cannot generate quotation for an empty cart. Add items first.');
      return;
    }

    const quotNum = `EST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuotation: PosQuotation = {
      id: `quot_${Date.now()}`,
      quotationNumber: quotNum,
      customerName: customerName.trim() || 'Project Client',
      customerPhone: customerPhone.trim() || undefined,
      timestamp: new Date(),
      validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
      items: [...cartItems],
      billSummary: billSummary,
      subtotal: billSummary.subtotal,
      discountAmount: billSummary.discountAmount,
      taxableAmount: billSummary.taxableAmount,
      taxAmount: billSummary.cgstAmount + billSummary.sgstAmount,
      freightAmount: parseFloat(freightAmount) || 0,
      loadingUnloadingAmount: parseFloat(loadingUnloadingAmount) || 0,
      grandTotal: billSummary.grandTotal,
      status: 'active',
      notes: 'Estimate valid for 15 days. Subject to stock availability in specified shade/lot.',
    };

    const updated = [newQuotation, ...quotations];
    setQuotations(updated);
    try {
      localStorage.setItem('vetrify_pos_quotations', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save quotation to localStorage', e);
    }
    setIsQuotationsModalOpen(true);
  };

  const handleConvertQuotation = (quotation: PosQuotation) => {
    setCartItems(quotation.items);
    setCustomerName(quotation.customerName);
    setCustomerPhone(quotation.customerPhone || '');
    setFreightAmount(quotation.freightAmount ? String(quotation.freightAmount) : '');
    setLoadingUnloadingAmount(quotation.loadingUnloadingAmount ? String(quotation.loadingUnloadingAmount) : '');

    const updated = quotations.map((q) =>
      q.id === quotation.id ? { ...q, status: 'converted' as const } : q
    );
    setQuotations(updated);
    try {
      localStorage.setItem('vetrify_pos_quotations', JSON.stringify(updated));
    } catch {}

    setIsQuotationsModalOpen(false);
  };

  const handlePrintQuotation = (quotation: PosQuotation) => {
    const subtotal = quotation.subtotal ?? quotation.billSummary?.subtotal ?? 0;
    const discountAmount = quotation.discountAmount ?? quotation.billSummary?.discountAmount ?? 0;
    const taxableAmount = quotation.taxableAmount ?? quotation.billSummary?.taxableAmount ?? 0;
    const taxAmount = quotation.taxAmount ?? ((quotation.billSummary?.cgstAmount || 0) + (quotation.billSummary?.sgstAmount || 0));
    const grandTotal = quotation.grandTotal ?? quotation.billSummary?.grandTotal ?? 0;

    const mockInvoice: SaleInvoice = {
      id: quotation.id,
      invoiceNumber: quotation.quotationNumber,
      organizationId: organization?.id || '',
      storeId: currentStore?.id || '',
      customerId: selectedCustomer?.id,
      customerName: quotation.customerName,
      customerPhone: quotation.customerPhone,
      paymentMode: 'cash',
      items: quotation.items.map((item) => {
        const line = calculateBillSummary([item]);
        return {
          productId: item.productId,
          productName: item.name,
          brand: item.brand,
          dosageForm: item.dosageForm,
          sku: item.sku,
          batchId: item.batchId,
          batchNumber: item.batch,
          shadeNumber: item.shadeNumber,
          toneCode: item.toneCode,
          caliberCode: item.caliberCode,
          finish: item.finish,
          dimensionsMm: item.dimensionsMm,
          coverageSqFt: item.sqFtCalculated || (item.coveragePerBoxSqFt ? item.coveragePerBoxSqFt * item.qty : undefined),
          expiryDate: item.expiry,
          hsnCode: item.hsnCode || '6907',
          schedule: item.schedule,
          isPrescriptionRequired: false,
          quantity: item.qty,
          unit: item.unit,
          mrp: item.mrp,
          unitPrice: item.price,
          discountPercent: item.discountPercent,
          discountAmount: line.discountAmount,
          taxableAmount: line.taxableAmount,
          gstRate: item.gstPercent,
          cgstRate: item.gstPercent / 2,
          cgstAmount: line.cgstAmount,
          sgstRate: item.gstPercent / 2,
          sgstAmount: line.sgstAmount,
          totalTaxAmount: line.cgstAmount + line.sgstAmount,
          total: line.grandTotal,
        };
      }),
      subtotal: subtotal,
      totalDiscount: discountAmount,
      taxableAmount: taxableAmount,
      cgstTotal: taxAmount / 2,
      sgstTotal: taxAmount / 2,
      totalTax: taxAmount,
      freightAmount: quotation.freightAmount || 0,
      loadingUnloadingAmount: quotation.loadingUnloadingAmount || 0,
      roundOff: 0,
      grandTotal: grandTotal,
      status: 'completed',
      itemsCount: quotation.items.length,
      totalQuantity: quotation.items.reduce((sum, item) => sum + item.qty, 0),
      createdByUid: user?.uid || 'user',
      createdByName: currentStaff?.displayName || user?.displayName || 'Sales Consultant',
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
    };

    setCompletedInvoice(mockInvoice);
    setIsQuotationPrint(true);
    setIsPrintModalOpen(true);
  };

  // 8. Settle & Execute Atomic Firestore Sale Transaction
  const handleSettle = async () => {
    if (!organization?.id || !currentStore?.id) {
      setErrorMessage('No active organization or store selected.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Cart is empty. Add products to proceed with billing.');
      return;
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
        freightAmount: parseFloat(freightAmount) || 0,
        loadingUnloadingAmount: parseFloat(loadingUnloadingAmount) || 0,
        creditOverrideUsed: creditOverrideApproved,
        clinicalOverrideReason: null,
        caller: {
          uid: user?.uid || currentStaff?.uid || 'cashier',
          email: user?.email || currentStaff?.email || null,
          displayName: currentStaff?.displayName || user?.displayName || 'Sales Counter',
        },
      });

      // Record architect/referral partner commission if selected
      if (selectedArchitect) {
        const commissionPct = selectedArchitect.defaultCommissionPercent || 5;
        const commissionEarned = (billSummary.taxableAmount * commissionPct) / 100;
        const updatedPartners = architectPartners.map((p) => {
          if (p.id === selectedArchitect.id) {
            const newDriven = (p.totalBusinessDriven || 0) + billSummary.grandTotal;
            const newAccrued = (p.totalCommissionAccrued || 0) + commissionEarned;
            const newBal = newAccrued - (p.totalCommissionPaid || 0);
            return {
              ...p,
              totalBusinessDriven: newDriven,
              totalCommissionAccrued: newAccrued,
              pendingBalance: Math.max(0, newBal),
            };
          }
          return p;
        });
        setArchitectPartners(updatedPartners);
        try {
          localStorage.setItem('vetrify_architect_partners', JSON.stringify(updatedPartners));
        } catch {}
      }

      setCompletedInvoice(invoice);
      setRecentInvoices((prev) => [invoice, ...prev.filter((i) => i.id !== invoice.id)]);
      try {
        const stored = JSON.parse(localStorage.getItem(`vetrify_recent_invoices_${organization.id}`) || '[]');
        localStorage.setItem(
          `vetrify_recent_invoices_${organization.id}`,
          JSON.stringify([invoice, ...stored.filter((i: any) => i.id !== invoice.id)].slice(0, 50))
        );
      } catch {}
      setIsQuotationPrint(false);
      setIsPrintModalOpen(true);
      setCartItems([]);
      setSelectedCustomer(null);
      setSelectedArchitect(null);
      setCreditOverrideApproved(false);
      setFreightAmount('');
      setLoadingUnloadingAmount('');
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

  // 10. Hold / Park Bill
  const handleHoldBill = () => {
    if (cartItems.length === 0) return;
    const newHeld: HeldBill = {
      id: `hold_${Date.now()}`,
      timestamp: new Date(),
      customerName,
      customerPhone,
      items: [...cartItems],
      freightAmount,
      loadingUnloadingAmount,
      selectedArchitect: selectedArchitect || null,
    };
    setHeldBills([newHeld, ...heldBills]);
    setCartItems([]);
    setSelectedArchitect(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setFreightAmount('');
    setLoadingUnloadingAmount('');
  };

  const handleResumeHeldBill = (held: HeldBill) => {
    setCartItems(held.items);
    setCustomerName(held.customerName);
    setCustomerPhone(held.customerPhone || '');
    setFreightAmount(held.freightAmount || '');
    setLoadingUnloadingAmount(held.loadingUnloadingAmount || '');
    setSelectedArchitect(held.selectedArchitect || null);
    setHeldBills(heldBills.filter((h) => h.id !== held.id));
    setIsHeldBillsDrawerOpen(false);
  };

  // 8. Fetch Recent Invoices
  const handleOpenRecentInvoices = async () => {
    if (!organization?.id) return;
    setIsRecentInvoicesDrawerOpen(true);
    setIsLoadingRecentInvoices(true);
    try {
      let invs = await posService.getRecentInvoices(organization.id, currentStore?.id, 30);
      if (invs.length === 0) {
        try {
          const cached = JSON.parse(localStorage.getItem(`vetrify_recent_invoices_${organization.id}`) || '[]');
          if (cached && cached.length > 0) invs = cached;
        } catch {}
      }
      setRecentInvoices(invs);
    } catch (err) {
      console.error('Error fetching recent invoices:', err);
      try {
        const cached = JSON.parse(localStorage.getItem(`vetrify_recent_invoices_${organization.id}`) || '[]');
        if (cached && cached.length > 0) setRecentInvoices(cached);
      } catch {}
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
          {/* Combo & Bathroom Suite Builder */}
          <button
            type="button"
            onClick={() => setIsComboSuiteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Suite Builder</span>
          </button>

          {/* Architects & Designers Referral Tracker */}
          <button
            type="button"
            onClick={() => setIsArchitectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 text-xs font-bold text-violet-700 dark:text-violet-300 transition-colors cursor-pointer"
          >
            <UsersIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            <span>Architects</span>
            <span className="px-1.5 py-0.2 bg-violet-500 text-white rounded-full text-[10px] font-mono font-bold">
              {architectPartners.length}
            </span>
          </button>

          {/* Tile Area & Box Calculator */}
          <button
            type="button"
            onClick={() => {
              setActiveCalcItem(null);
              setIsTileCalcOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-xs font-bold text-teal-700 dark:text-teal-300 transition-colors cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Tile Calculator</span>
          </button>

          {/* Quotations / Estimates Drawer */}
          <button
            type="button"
            onClick={() => setIsQuotationsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-xs font-bold text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Quotations</span>
            {quotations.length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-mono font-bold">
                {quotations.length}
              </span>
            )}
          </button>

          {/* Recent Invoices Button */}
          <button
            type="button"
            onClick={handleOpenRecentInvoices}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Bills</span>
          </button>

          {/* Hold Bills Counter */}
          <button
            type="button"
            onClick={() => setIsHeldBillsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
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
            title="Refresh Showroom Catalog"
            className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-600 dark:text-slate-300 cursor-pointer"
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
            className="text-rose-600 font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 3-Panel POS Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT PANEL: Live Product Master & Showroom Catalog (4 Cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 flex flex-col max-h-[calc(100vh-190px)]">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Showroom Catalog &amp; Yard Stock
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
              placeholder="Search tiles, marble, sanitaryware, finishes..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1">
            {isLoadingProducts ? (
              <div className="col-span-2 py-12 flex flex-col items-center justify-center text-slate-400">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <p className="text-xs">Querying showroom catalog...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400">
                <p className="text-xs font-semibold">No products match your search.</p>
                <p className="text-[11px] text-slate-500 mt-1">Check inward lots or add ceramic product master items.</p>
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
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 capitalize truncate">
                        {prod.finish || prod.dosageForm || 'Tile'}
                      </span>
                      {prod.grade && (
                        <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-1.5 py-0.2 rounded">
                          {prod.grade}
                        </span>
                      )}
                    </div>

                    <div className="my-1.5">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 leading-tight line-clamp-1">
                        {prod.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {prod.brand} {prod.dimensionsMm ? `• ${prod.dimensionsMm.length}×${prod.dimensionsMm.width}mm` : ''}
                      </p>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">
                          ₹{safeToFixed(prod.price)}
                          <span className="text-[9px] text-slate-400 font-normal">/{prod.unit || 'box'}</span>
                        </span>
                        <span className={`text-[10px] font-bold ${hasStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                          {hasStock ? `${prod.stock} ${prod.unit}s` : 'Out of stock'}
                        </span>
                      </div>
                      {hasStock && (
                        <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                          <span>Lot: {prod.shadeNumber || prod.batch}</span>
                          {prod.coveragePerBoxSqFt ? (
                            <span>{prod.coveragePerBoxSqFt} sq.ft/bx</span>
                          ) : (
                            <span>{prod.toneCode ? `Tone: ${prod.toneCode}` : ''}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* MIDDLE PANEL: Active Cart & Area Calculator (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 flex flex-col min-h-[520px]">
          {/* Customer Selection Header */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 flex items-center justify-center transition-colors cursor-pointer"
                title="Select customer or project khata account"
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
                    className="text-3xs text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    [Select / Change]
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {customerPhone ? `Phone: ${customerPhone}` : 'Walk-in Retail / Contractor'}
                  {selectedCustomer?.creditEnabled && (
                    <span className="ml-1 text-teal-600 font-bold">
                      | Avail Credit: ₹{safeToFixed((selectedCustomer.creditLimit || 0) - (selectedCustomer.currentOutstanding || 0))}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Tile Calculator Trigger */}
            <button
              type="button"
              onClick={() => {
                setActiveCalcItem(null);
                setIsTileCalcOpen(true);
              }}
              className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Area Calc</span>
            </button>
          </div>

          {/* Architect / Designer Referral Bar */}
          {selectedArchitect ? (
            <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <UsersIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  Referral: <strong className="text-indigo-700 dark:text-indigo-300">{selectedArchitect.name}</strong> ({selectedArchitect.role} • {selectedArchitect.defaultCommissionPercent}% Comm.)
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsArchitectModalOpen(true)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  Change
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedArchitect(null)}
                  className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <UsersIcon className="w-3 h-3 text-slate-400" />
                <span>No Architect / Contractor tagged</span>
              </span>
              <button
                type="button"
                onClick={() => setIsArchitectModalOpen(true)}
                className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                + Tag Architect / Mistri
              </button>
            </div>
          )}

          {/* Barcode / SKU Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-teal-600 dark:text-teal-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="pos-barcode-input"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan barcode, Lot/Shade, or press Enter..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Cart Items List with Dual UOM & Calc triggers */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border rounded-xl border-slate-200 dark:border-slate-800 p-2 bg-white dark:bg-slate-900">
            {cartItems.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Barcode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Active bill cart is empty</p>
                <p className="text-[11px] mt-0.5 text-slate-500">
                  Select tiles or sanitaryware from the catalog or open the Area Calculator.
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="py-2.5 px-1.5 flex items-center justify-between gap-2">
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </span>
                      {item.finish && (
                        <span className="text-[9px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-1 rounded capitalize">
                          {item.finish}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono flex-wrap">
                      {/* Clickable Batch/Lot Pill for Manual Override */}
                      <button
                        type="button"
                        onClick={() => handleOpenBatchSelector(item)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                        title="Click to switch lot/shade"
                      >
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>Lot: <strong>{item.shadeNumber || item.batch}</strong></span>
                      </button>
                      {item.toneCode && (
                        <span className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          Tone: {item.toneCode}
                        </span>
                      )}
                      {item.caliberCode && (
                        <span className="px-1 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-400">
                          Cal: {item.caliberCode}
                        </span>
                      )}
                      <span>Rate: ₹{safeToFixed(item.price)}</span>
                    </div>

                    {/* Dual UOM Box & Sq. Ft calculation line */}
                    {item.coveragePerBoxSqFt && (
                      <div className="flex items-center gap-2 text-[10px] text-teal-600 dark:text-teal-400 mt-0.5 font-semibold">
                        <span>
                          {item.qty} Boxes = {safeToFixed(item.qty * item.coveragePerBoxSqFt)} Sq. Ft
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveCalcItem({
                              cartItemId: item.id,
                              productName: item.name,
                              coveragePerBoxSqFt: item.coveragePerBoxSqFt,
                              piecesPerBox: item.piecesPerBox,
                            });
                            setIsTileCalcOpen(true);
                          }}
                          className="text-[9px] px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950/80 rounded hover:bg-teal-200 dark:hover:bg-teal-900 flex items-center gap-0.5 cursor-pointer"
                          title="Recalculate boxes from room dimensions"
                        >
                          <Calculator className="w-2.5 h-2.5" />
                          <span>Calc Area</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded transition-colors cursor-pointer"
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
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Bill Summary, Freight/Hamali & Settlement (3 Cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Bill Summary &amp; Settlement
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
                      className={`p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all cursor-pointer ${
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

            {/* Freight & Loading Charges Inputs */}
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <Truck className="w-3 h-3 text-teal-600" />
                  Freight (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freightAmount}
                  onChange={(e) => setFreightAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                  <span>Hamali (₹)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={loadingUnloadingAmount}
                  onChange={(e) => setLoadingUnloadingAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Material Gross ({cartItems.length} items, {billSummary.totalQty} bxs)</span>
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
                <span>GST (CGST + SGST)</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  ₹{safeToFixed(billSummary.cgstAmount + billSummary.sgstAmount)}
                </span>
              </div>
              {billSummary.freightAmount > 0 && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1">
                    <Truck className="w-3 h-3 text-teal-600" />
                    Freight / Transport
                  </span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    +₹{safeToFixed(billSummary.freightAmount)}
                  </span>
                </div>
              )}
              {billSummary.loadingUnloadingAmount > 0 && (
                <div className="flex justify-between text-slate-700 dark:text-slate-300">
                  <span>Loading / Hamali</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">
                    +₹{safeToFixed(billSummary.loadingUnloadingAmount)}
                  </span>
                </div>
              )}
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

          {/* Settle / Quotation / Hold Action Buttons */}
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
                  <span>Settle &amp; Print Tax Invoice</span>
                </>
              )}
            </button>

            {/* Save as Quotation Button */}
            <button
              type="button"
              onClick={handleSaveQuotation}
              disabled={cartItems.length === 0}
              className="w-full py-2 px-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Save as Quotation / Estimate</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleHoldBill}
                disabled={cartItems.length === 0}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Hold Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setCartItems([])}
                disabled={cartItems.length === 0}
                className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tile Area & Box Calculator Modal */}
      <TileCalculatorModal
        isOpen={isTileCalcOpen}
        onClose={() => {
          setIsTileCalcOpen(false);
          setActiveCalcItem(null);
        }}
        onApplyCalculation={handleApplyTileCalculation}
        initialCoverageSqFt={activeCalcItem?.coveragePerBoxSqFt}
        initialPiecesPerBox={activeCalcItem?.piecesPerBox}
        productName={activeCalcItem?.productName}
      />

      {/* Quotations / Proforma Estimates Modal */}
      <QuotationModal
        isOpen={isQuotationsModalOpen}
        onClose={() => setIsQuotationsModalOpen(false)}
        quotations={quotations}
        onConvertQuotation={handleConvertQuotation}
        onPrintQuotation={handlePrintQuotation}
        onDeleteQuotation={(id) => {
          const updated = quotations.filter((q) => q.id !== id);
          setQuotations(updated);
          try {
            localStorage.setItem('vetrify_pos_quotations', JSON.stringify(updated));
          } catch {}
        }}
      />

      {/* Manual Batch/Lot Selector Modal */}
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

      {/* Statutory Invoice & Quotation Print Modal */}
      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setCompletedInvoice(null);
          setIsQuotationPrint(false);
        }}
        invoice={completedInvoice}
        organization={organization}
        store={currentStore}
        isQuotation={isQuotationPrint}
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

      {/* Combo & Bathroom Suite Builder Modal */}
      <ComboSuiteBuilderModal
        isOpen={isComboSuiteOpen}
        onClose={() => setIsComboSuiteOpen(false)}
        onAddSuiteToCart={handleAddSuiteToCart}
      />

      {/* Architect & Interior Designer Commission Tracker Modal */}
      <ArchitectCommissionModal
        isOpen={isArchitectModalOpen}
        onClose={() => setIsArchitectModalOpen(false)}
        partners={architectPartners}
        onAddPartner={handleAddArchitectPartner}
        onRecordPayout={handleRecordArchitectPayout}
        onSelectPartnerForSale={(partner) => {
          setSelectedArchitect(partner);
          setIsArchitectModalOpen(false);
        }}
      />
    </div>
  );
};
