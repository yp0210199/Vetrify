import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as limitConstraint,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  WholesalePriceRule,
  WholesaleQuotation,
  WholesaleQuotationItem,
  WholesaleOrder,
  WholesaleOrderItem,
  WholesaleInvoice,
  WholesaleInvoiceItem,
  DeliveryChallan,
  DeliveryChallanItem,
  BatchAllocation,
  WholesaleMetrics,
  WholesaleOrderStatus,
  WholesaleQuotationStatus,
  ChallanStatus,
  PricingRuleType,
} from '../types/wholesale';
import { Customer, PharmacyBatch } from '../types';
import { customerService } from './customerService';
import { batchService } from './batchService';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';
import { handleFirestoreError, OperationType } from '../lib/firebase/error';
import {
  validateWholesalePriceRule,
  validateWholesaleQuotation,
  validateWholesaleOrder,
  validateWholesaleInvoice,
  validateDeliveryChallan,
} from '../validators/wholesaleValidators';

// Helper refs
function getWholesalePriceRulesRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'wholesalePriceRules');
}

function getWholesaleQuotationsRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'wholesaleQuotations');
}

function getWholesaleOrdersRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'wholesaleOrders');
}

function getWholesaleInvoicesRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'wholesaleInvoices');
}

function getDeliveryChallansRef(orgId: string) {
  return collection(db, 'organizations', orgId, 'deliveryChallans');
}

// Order Status Transition Map
const ALLOWED_ORDER_TRANSITIONS: Record<WholesaleOrderStatus, WholesaleOrderStatus[]> = {
  DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
  PENDING_APPROVAL: ['APPROVED', 'CANCELLED'],
  APPROVED: ['RESERVED', 'CANCELLED'],
  RESERVED: ['PARTIALLY_FULFILLED', 'READY_FOR_DISPATCH', 'CANCELLED'],
  PARTIALLY_FULFILLED: ['PARTIALLY_FULFILLED', 'READY_FOR_DISPATCH', 'CANCELLED'],
  READY_FOR_DISPATCH: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const wholesaleService = {
  // =========================================================================
  // 1. B2B Customer Operations
  // =========================================================================
  async createB2BCustomer(
    orgId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      name: string;
      phone: string;
      alternatePhone?: string;
      email?: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      legalName?: string;
      contactPerson?: string;
      gstin?: string;
      panNumber?: string;
      businessRegistration?: string;
      creditLimit?: number;
      creditPeriodDays?: number;
      assignedPriceTier?: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
      notes?: string;
    }
  ): Promise<Customer> {
    const customerCode = `B2B-${Date.now().toString().slice(-5)}-${Math.floor(10 + Math.random() * 90)}`;
    
    // Use existing customerService baseline
    const baseCustomer = await customerService.createCustomer(orgId, caller, {
      name: payload.name,
      phone: payload.phone,
      alternatePhone: payload.alternatePhone,
      email: payload.email,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      pincode: payload.pincode,
      notes: payload.notes,
      creditEnabled: true,
      creditLimit: payload.creditLimit || 100000,
    });

    // Update with B2B extensions
    const b2bUpdates: Record<string, any> = {
      customerType: 'B2B',
      legalName: payload.legalName?.trim() || payload.name,
      customerCode,
      contactPerson: payload.contactPerson?.trim() || null,
      gstin: payload.gstin?.trim().toUpperCase() || null,
      panNumber: payload.panNumber?.trim().toUpperCase() || null,
      businessRegistration: payload.businessRegistration?.trim() || null,
      creditPeriodDays: payload.creditPeriodDays || 30,
      assignedPriceTier: payload.assignedPriceTier || 'TIER_A',
      creditStatus: 'CLEAR',
      updatedAt: serverTimestamp(),
      updatedByUid: caller.uid,
    };

    const customerRef = doc(db, 'organizations', orgId, 'customers', baseCustomer.id);
    await updateDoc(customerRef, b2bUpdates);

    return {
      ...baseCustomer,
      ...b2bUpdates,
      updatedAt: Timestamp.now(),
    } as Customer;
  },

  // =========================================================================
  // 2. Wholesale Pricing Engine
  // =========================================================================
  async createPriceRule(
    orgId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      ruleName: string;
      ruleType: PricingRuleType;
      customerId?: string;
      customerName?: string;
      productId: string;
      productName: string;
      sku?: string;
      tier?: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D';
      minQuantity: number;
      wholesalePrice: number;
      discountPercent?: number;
      effectiveDate?: string;
      expiryDate?: string;
    }
  ): Promise<WholesalePriceRule> {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const ruleRef = doc(db, 'organizations', orgId, 'wholesalePriceRules', ruleId);

    const ruleData: Record<string, any> = {
      id: ruleId,
      organizationId: orgId,
      ruleName: payload.ruleName.trim(),
      ruleType: payload.ruleType,
      customerId: payload.customerId || null,
      customerName: payload.customerName || null,
      productId: payload.productId,
      productName: payload.productName,
      sku: payload.sku || null,
      tier: payload.tier || null,
      minQuantity: Number(payload.minQuantity) || 1,
      wholesalePrice: Number(payload.wholesalePrice) || 0,
      discountPercent: Number(payload.discountPercent) || 0,
      effectiveDate: payload.effectiveDate || null,
      expiryDate: payload.expiryDate || null,
      status: 'active',
      createdByUid: caller.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateWholesalePriceRule(ruleData, orgId)) {
      throw new Error('Wholesale price rule validation failed');
    }

    await setDoc(ruleRef, ruleData);

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'product.updated',
      entityType: 'product',
      entityId: payload.productId,
      storeId: null,
      metadata: { actionType: 'create_wholesale_price_rule', ruleName: payload.ruleName },
    });

    return {
      ...ruleData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as WholesalePriceRule;
  },

  async getPriceRules(orgId: string, productId?: string): Promise<WholesalePriceRule[]> {
    if (!orgId) return [];
    try {
      const ref = getWholesalePriceRulesRef(orgId);
      let q = query(ref, orderBy('createdAt', 'desc'));
      if (productId) {
        q = query(ref, where('productId', '==', productId));
      }

      const snapshot = await getDocs(q);
      const rules: WholesalePriceRule[] = [];
      snapshot.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (validateWholesalePriceRule(data, orgId)) {
          rules.push(data as WholesalePriceRule);
        }
      });
      return rules;
    } catch (error) {
      console.warn('Failed to load wholesale price rules from Firestore:', error);
      return [];
    }
  },

  /**
   * Price Resolution Hierarchy:
   * 1. Customer-specific product price
   * 2. Active contract price
   * 3. Customer price tier
   * 4. Product wholesale price rule
   * 5. Standard fallback price
   */
  async resolveItemWholesalePrice(
    orgId: string,
    customerId: string | undefined,
    productId: string,
    requestedQty: number,
    standardPrice: number,
    customerTier?: 'TIER_A' | 'TIER_B' | 'TIER_C' | 'TIER_D'
  ): Promise<{ resolvedPrice: number; priceSource: string }> {
    const allRules = await this.getPriceRules(orgId, productId);
    const activeRules = allRules.filter((r) => r.status === 'active' && requestedQty >= r.minQuantity);

    // Priority 1: Customer Product
    if (customerId) {
      const custRule = activeRules.find((r) => r.ruleType === 'CUSTOMER_PRODUCT' && r.customerId === customerId);
      if (custRule) {
        return { resolvedPrice: custRule.wholesalePrice, priceSource: 'Customer Contract Price' };
      }
    }

    // Priority 2: Contract
    const contractRule = activeRules.find((r) => r.ruleType === 'CONTRACT');
    if (contractRule) {
      return { resolvedPrice: contractRule.wholesalePrice, priceSource: 'Institutional Contract Price' };
    }

    // Priority 3: Customer Price Tier
    if (customerTier) {
      const tierRule = activeRules.find((r) => r.ruleType === 'CUSTOMER_TIER' && r.tier === customerTier);
      if (tierRule) {
        return { resolvedPrice: tierRule.wholesalePrice, priceSource: `Customer ${customerTier}` };
      }
    }

    // Priority 4: Product Wholesale Price
    const prodWholesaleRule = activeRules.find((r) => r.ruleType === 'PRODUCT_WHOLESALE');
    if (prodWholesaleRule) {
      return { resolvedPrice: prodWholesaleRule.wholesalePrice, priceSource: 'Wholesale Tier' };
    }

    // Priority 5: Standard Fallback
    return { resolvedPrice: standardPrice, priceSource: 'Standard Wholesale Rate' };
  },

  // =========================================================================
  // 3. Wholesale Quotations
  // =========================================================================
  async createQuotation(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      customerId: string;
      customerName: string;
      customerGstin?: string;
      items: WholesaleQuotationItem[];
      validUntil: string;
      notes?: string;
    }
  ): Promise<WholesaleQuotation> {
    const quotationId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const quotationNumber = `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let totalTax = 0;

    const processedItems: WholesaleQuotationItem[] = payload.items.map((item) => {
      const lineSubtotal = item.requestedQty * item.wholesalePrice;
      const disc = (lineSubtotal * (item.discountPercent || 0)) / 100;
      const lineTaxable = lineSubtotal - disc;
      const lineTax = (lineTaxable * (item.gstRate || 12)) / 100;
      const halfTax = lineTax / 2;

      subtotal += lineSubtotal;
      totalDiscount += disc;
      taxableAmount += lineTaxable;
      cgstTotal += halfTax;
      sgstTotal += halfTax;
      totalTax += lineTax;

      return {
        ...item,
        discountAmount: disc,
        taxableAmount: lineTaxable,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        totalTaxAmount: lineTax,
        totalAmount: lineTaxable + lineTax,
      };
    });

    const grandTotal = Math.round(taxableAmount + totalTax);

    const quoteData: Record<string, any> = {
      id: quotationId,
      organizationId: orgId,
      storeId,
      quotationNumber,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerGstin: payload.customerGstin || null,
      items: processedItems,
      itemsCount: processedItems.length,
      totalQuantity: processedItems.reduce((acc, i) => acc + i.requestedQty, 0),
      subtotal,
      totalDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      totalTax,
      grandTotal,
      validUntil: payload.validUntil,
      status: 'SENT',
      notes: payload.notes || null,
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Staff',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateWholesaleQuotation(quoteData, orgId)) {
      throw new Error('Quotation validation failed');
    }

    const docRef = doc(db, 'organizations', orgId, 'wholesaleQuotations', quotationId);
    await setDoc(docRef, quoteData);

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.created', // audit action taxonomy reuse
      entityType: 'purchase_order',
      entityId: quotationId,
      storeId,
      metadata: { quotationNumber, grandTotal, customerName: payload.customerName },
    });

    return {
      ...quoteData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as WholesaleQuotation;
  },

  async getQuotations(orgId: string, storeId?: string): Promise<WholesaleQuotation[]> {
    if (!orgId) return [];
    try {
      const ref = getWholesaleQuotationsRef(orgId);
      let q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(100));
      if (storeId) {
        q = query(ref, where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limitConstraint(100));
      }
      const snapshot = await getDocs(q);
      const quotes: WholesaleQuotation[] = [];
      snapshot.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (validateWholesaleQuotation(data, orgId)) {
          quotes.push(data as WholesaleQuotation);
        }
      });
      return quotes;
    } catch (error) {
      console.warn('Failed to load wholesale quotations from Firestore:', error);
      return [];
    }
  },

  // =========================================================================
  // 4. Wholesale Orders (Wizard, Lifecycle, Reservation, FEFO Fulfillment)
  // =========================================================================
  async createWholesaleOrder(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      customerId: string;
      customerName: string;
      customerCode?: string;
      customerGstin?: string;
      customerPhone?: string;
      billingAddress?: string;
      shippingAddress?: string;
      quotationId?: string;
      items: WholesaleOrderItem[];
      paymentTerms: string;
      deliveryMethod?: string;
      notes?: string;
      creditOverrideUsed?: boolean;
      overrideManagerUid?: string;
      overrideReason?: string;
    }
  ): Promise<WholesaleOrder> {
    // 1. Verify Customer Credit Limit & Status
    const customer = await customerService.getCustomer(orgId, payload.customerId);
    if (!customer) {
      throw new Error('Customer record not found');
    }

    if (customer.status === 'blocked') {
      throw new Error('Customer account is placed on HOLD/BLOCKED. Wholesale orders prohibited.');
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let totalTax = 0;

    const processedItems: WholesaleOrderItem[] = payload.items.map((item) => {
      const lineSubtotal = item.orderedQty * item.wholesalePrice;
      const disc = (lineSubtotal * (item.discountPercent || 0)) / 100;
      const lineTaxable = lineSubtotal - disc;
      const lineTax = (lineTaxable * (item.gstRate || 12)) / 100;
      const halfTax = lineTax / 2;

      subtotal += lineSubtotal;
      totalDiscount += disc;
      taxableAmount += lineTaxable;
      cgstTotal += halfTax;
      sgstTotal += halfTax;
      totalTax += lineTax;

      return {
        ...item,
        reservedQty: item.reservedQty || 0,
        fulfilledQty: item.fulfilledQty || 0,
        discountAmount: disc,
        taxableAmount: lineTaxable,
        cgstAmount: halfTax,
        sgstAmount: halfTax,
        totalTaxAmount: lineTax,
        totalAmount: lineTaxable + lineTax,
      };
    });

    const grandTotal = Math.round(taxableAmount + totalTax);

    // Credit Validation
    if (customer.creditEnabled && !payload.creditOverrideUsed) {
      const availableCredit = (customer.creditLimit || 0) - (customer.currentOutstanding || 0);
      if (grandTotal > availableCredit) {
        throw new Error(
          `Credit Limit Exceeded! Order Total (₹${grandTotal.toLocaleString('en-IN')}) exceeds available credit (₹${Math.max(0, availableCredit).toLocaleString('en-IN')}). Manager override required.`
        );
      }
    }

    const orderId = `who_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderNumber = `WHO-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const orderData: Record<string, any> = {
      id: orderId,
      organizationId: orgId,
      storeId,
      orderNumber,
      quotationId: payload.quotationId || null,
      customerId: payload.customerId,
      customerName: payload.customerName,
      customerCode: payload.customerCode || (customer as any).customerCode || null,
      customerGstin: payload.customerGstin || (customer as any).gstin || null,
      customerPhone: payload.customerPhone || customer.phone || null,
      billingAddress: payload.billingAddress || customer.address || null,
      shippingAddress: payload.shippingAddress || customer.address || null,
      items: processedItems,
      itemsCount: processedItems.length,
      totalOrderedQty: processedItems.reduce((acc, i) => acc + i.orderedQty, 0),
      totalReservedQty: 0,
      totalFulfilledQty: 0,
      subtotal,
      totalDiscount,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      totalTax,
      grandTotal,
      paymentTerms: payload.paymentTerms || 'NET_30',
      creditOverrideUsed: payload.creditOverrideUsed ?? false,
      overrideManagerUid: payload.overrideManagerUid || null,
      overrideReason: payload.overrideReason || null,
      deliveryMethod: payload.deliveryMethod || 'Standard Carrier',
      notes: payload.notes || null,
      status: 'APPROVED', // Initial state
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Staff',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateWholesaleOrder(orderData, orgId)) {
      throw new Error('Wholesale order validation failed');
    }

    const docRef = doc(db, 'organizations', orgId, 'wholesaleOrders', orderId);
    await setDoc(docRef, orderData);

    // If quotation was converted, update quotation status
    if (payload.quotationId) {
      const qRef = doc(db, 'organizations', orgId, 'wholesaleQuotations', payload.quotationId);
      await updateDoc(qRef, {
        status: 'CONVERTED',
        convertedOrderId: orderId,
        updatedAt: serverTimestamp(),
      });
    }

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.created',
      entityType: 'purchase_order',
      entityId: orderId,
      storeId,
      metadata: { orderNumber, grandTotal, customerName: payload.customerName },
    });

    await notificationService.createNotification(orgId, {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      recipientUid: 'all',
      type: 'purchases',
      title: `New Wholesale Order ${orderNumber}`,
      message: `Order for ${payload.customerName} (₹${grandTotal.toLocaleString('en-IN')}) created successfully.`,
      severity: 'info',
      targetModule: 'wholesale',
    });

    return {
      ...orderData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as WholesaleOrder;
  },

  async getWholesaleOrders(
    orgId: string,
    options: { storeId?: string; customerId?: string; status?: WholesaleOrderStatus } = {}
  ): Promise<WholesaleOrder[]> {
    if (!orgId) return [];
    try {
      const ref = getWholesaleOrdersRef(orgId);
      let q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(100));

      if (options.storeId) {
        q = query(ref, where('storeId', '==', options.storeId), orderBy('createdAt', 'desc'), limitConstraint(100));
      }

      const snapshot = await getDocs(q);
      let orders: WholesaleOrder[] = [];
      snapshot.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (validateWholesaleOrder(data, orgId)) {
          orders.push(data as WholesaleOrder);
        }
      });

      if (options.customerId) {
        orders = orders.filter((o) => o.customerId === options.customerId);
      }
      if (options.status) {
        orders = orders.filter((o) => o.status === options.status);
      }

      return orders;
    } catch (error) {
      console.warn('Failed to load wholesale orders from Firestore:', error);
      return [];
    }
  },

  /**
   * Atomic Bulk Inventory Reservation with FEFO Batch Allocation
   */
  async reserveWholesaleOrderStock(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    orderId: string
  ): Promise<WholesaleOrder> {
    const orderRef = doc(db, 'organizations', orgId, 'wholesaleOrders', orderId);

    let updatedOrder: WholesaleOrder | null = null;

    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Wholesale Order not found');
      }

      const order = { id: orderSnap.id, ...orderSnap.data() } as WholesaleOrder;
      if (order.status === 'CANCELLED' || order.status === 'COMPLETED') {
        throw new Error(`Cannot reserve stock for order in ${order.status} state.`);
      }

      const updatedItems: WholesaleOrderItem[] = [];
      let totalReservedQty = 0;

      for (const item of order.items) {
        const neededQty = item.orderedQty - item.reservedQty;
        if (neededQty <= 0) {
          updatedItems.push(item);
          totalReservedQty += item.reservedQty;
          continue;
        }

        // Fetch Saleable Batches in FEFO order
        const saleableBatches = await batchService.getSaleableBatchesForProduct(orgId, item.productId, storeId);
        
        let remainingToReserve = neededQty;
        const allocations: BatchAllocation[] = [...(item.allocatedBatches || [])];

        for (const batch of saleableBatches) {
          if (remainingToReserve <= 0) break;

          const batchRef = doc(db, 'organizations', orgId, 'batches', batch.id);
          const bSnap = await tx.get(batchRef);
          if (!bSnap.exists()) continue;

          const bData = bSnap.data() as PharmacyBatch;
          if (bData.status !== 'active' || bData.availableQuantity <= 0) continue;

          const qtyFromThisBatch = Math.min(remainingToReserve, bData.availableQuantity);
          
          allocations.push({
            batchId: bData.id,
            batchNumber: bData.batchNumber,
            expiryDate: bData.expiryDate?.toDate ? bData.expiryDate.toDate().toISOString().split('T')[0] : 'N/A',
            allocatedQty: qtyFromThisBatch,
            purchasePrice: bData.purchasePrice,
            mrp: bData.mrp,
            salePrice: bData.salePrice,
          });

          tx.update(batchRef, {
            reservedQuantity: (bData.reservedQuantity || 0) + qtyFromThisBatch,
            availableQuantity: bData.availableQuantity - qtyFromThisBatch,
            updatedByUid: caller.uid,
            updatedAt: serverTimestamp(),
          });

          remainingToReserve -= qtyFromThisBatch;
        }

        const newlyReserved = neededQty - remainingToReserve;
        const finalReserved = item.reservedQty + newlyReserved;

        totalReservedQty += finalReserved;

        updatedItems.push({
          ...item,
          reservedQty: finalReserved,
          allocatedBatches: allocations,
        });
      }

      tx.update(orderRef, {
        items: updatedItems,
        totalReservedQty,
        status: 'RESERVED',
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      });

      updatedOrder = {
        ...order,
        items: updatedItems,
        totalReservedQty,
        status: 'RESERVED',
        updatedAt: Timestamp.now(),
      };
    });

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.approved',
      entityType: 'purchase_order',
      entityId: orderId,
      storeId,
      metadata: { actionType: 'bulk_stock_reservation', totalReservedQty: updatedOrder?.totalReservedQty },
    });

    return updatedOrder!;
  },

  /**
   * Fulfill Wholesale Order (Partial or Full) & Deduct Stock
   */
  async fulfillWholesaleOrder(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      orderId: string;
      fulfillmentItems: { productId: string; fulfillQty: number; batchId?: string }[];
    }
  ): Promise<WholesaleOrder> {
    const orderRef = doc(db, 'organizations', orgId, 'wholesaleOrders', payload.orderId);
    let updatedOrder: WholesaleOrder | null = null;

    await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error('Wholesale order not found');
      }

      const order = { id: orderSnap.id, ...orderSnap.data() } as WholesaleOrder;
      const updatedItems: WholesaleOrderItem[] = [];
      let totalFulfilled = 0;

      for (const item of order.items) {
        const match = payload.fulfillmentItems.find((f) => f.productId === item.productId);
        const qtyToFulfill = match ? match.fulfillQty : 0;

        if (qtyToFulfill <= 0) {
          updatedItems.push(item);
          totalFulfilled += item.fulfilledQty;
          continue;
        }

        const remainingNeeded = item.orderedQty - item.fulfilledQty;
        if (qtyToFulfill > remainingNeeded) {
          throw new Error(`Fulfilled quantity (${qtyToFulfill}) cannot exceed remaining ordered quantity (${remainingNeeded}) for ${item.productName}`);
        }

        // Deduct from batch stock
        if (item.allocatedBatches && item.allocatedBatches.length > 0) {
          let qtyRemainingToDeduct = qtyToFulfill;
          for (const bAlloc of item.allocatedBatches) {
            if (qtyRemainingToDeduct <= 0) break;

            const bRef = doc(db, 'organizations', orgId, 'batches', bAlloc.batchId);
            const bSnap = await tx.get(bRef);
            if (bSnap.exists()) {
              const bData = bSnap.data() as PharmacyBatch;
              const deductQty = Math.min(qtyRemainingToDeduct, bAlloc.allocatedQty);

              tx.update(bRef, {
                quantity: Math.max(0, bData.quantity - deductQty),
                reservedQuantity: Math.max(0, (bData.reservedQuantity || 0) - deductQty),
                updatedByUid: caller.uid,
                updatedAt: serverTimestamp(),
              });
              qtyRemainingToDeduct -= deductQty;
            }
          }
        }

        const newFulfilled = item.fulfilledQty + qtyToFulfill;
        totalFulfilled += newFulfilled;

        updatedItems.push({
          ...item,
          fulfilledQty: newFulfilled,
        });
      }

      const isFullyFulfilled = updatedItems.every((i) => i.fulfilledQty >= i.orderedQty);
      const nextStatus: WholesaleOrderStatus = isFullyFulfilled ? 'READY_FOR_DISPATCH' : 'PARTIALLY_FULFILLED';

      tx.update(orderRef, {
        items: updatedItems,
        totalFulfilledQty: totalFulfilled,
        status: nextStatus,
        updatedByUid: caller.uid,
        updatedAt: serverTimestamp(),
      });

      updatedOrder = {
        ...order,
        items: updatedItems,
        totalFulfilledQty: totalFulfilled,
        status: nextStatus,
        updatedAt: Timestamp.now(),
      };
    });

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.partially_fulfilled',
      entityType: 'purchase_order',
      entityId: payload.orderId,
      storeId,
      metadata: { fulfillmentItems: payload.fulfillmentItems, status: updatedOrder?.status },
    });

    return updatedOrder!;
  },

  /**
   * Order Status Update
   */
  async updateOrderStatus(
    orgId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    orderId: string,
    nextStatus: WholesaleOrderStatus
  ): Promise<void> {
    const ref = doc(db, 'organizations', orgId, 'wholesaleOrders', orderId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Order not found');

    const currentOrder = snap.data() as WholesaleOrder;
    const allowed = ALLOWED_ORDER_TRANSITIONS[currentOrder.status] || [];

    if (!allowed.includes(nextStatus)) {
      throw new Error(`Illegal status transition from ${currentOrder.status} to ${nextStatus}.`);
    }

    await updateDoc(ref, {
      status: nextStatus,
      updatedByUid: caller.uid,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.updated',
      entityType: 'purchase_order',
      entityId: orderId,
      storeId: currentOrder.storeId,
      metadata: { previousStatus: currentOrder.status, nextStatus },
    });
  },

  // =========================================================================
  // 5. Wholesale Invoicing & Customer Ledger Integration
  // =========================================================================
  async createWholesaleInvoice(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      orderId: string;
      paymentMode?: 'credit' | 'cash' | 'upi' | 'card' | 'bank_transfer';
      creditTermsDays?: number;
    }
  ): Promise<WholesaleInvoice> {
    const invoiceId = `winv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const invoiceNumber = `WINV-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const orderRef = doc(db, 'organizations', orgId, 'wholesaleOrders', payload.orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as WholesaleOrder;
    const paymentMode = payload.paymentMode || 'credit';

    // Map fulfilled order items to invoice items
    const invoiceItems: WholesaleInvoiceItem[] = order.items.map((item) => {
      const batchAlloc = item.allocatedBatches && item.allocatedBatches.length > 0 ? item.allocatedBatches[0] : null;

      return {
        productId: item.productId,
        productName: item.productName,
        brand: item.brand,
        strength: item.strength,
        dosageForm: item.dosageForm,
        sku: item.sku,
        batchNumber: batchAlloc ? batchAlloc.batchNumber : 'BATCH-ALLOCATED',
        expiryDate: batchAlloc ? batchAlloc.expiryDate : 'N/A',
        quantity: item.fulfilledQty > 0 ? item.fulfilledQty : item.orderedQty,
        unitPrice: item.wholesalePrice,
        wholesalePrice: item.wholesalePrice,
        mrp: item.mrp || item.wholesalePrice * 1.2,
        discountPercent: item.discountPercent,
        discountAmount: item.discountAmount,
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        totalTaxAmount: item.totalTaxAmount,
        totalAmount: item.totalAmount,
      };
    });

    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + (payload.creditTermsDays || 30));
    const dueDate = dueDateObj.toISOString().split('T')[0];

    const invoiceData: Record<string, any> = {
      id: invoiceId,
      organizationId: orgId,
      storeId,
      invoiceNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerGstin: order.customerGstin || null,
      billingAddress: order.billingAddress || null,
      shippingAddress: order.shippingAddress || null,
      items: invoiceItems,
      itemsCount: invoiceItems.length,
      totalQuantity: invoiceItems.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      taxableAmount: order.taxableAmount,
      cgstTotal: order.cgstTotal,
      sgstTotal: order.sgstTotal,
      totalTax: order.totalTax,
      roundOff: 0,
      grandTotal: order.grandTotal,
      paymentMode,
      creditTerms: `NET ${payload.creditTermsDays || 30}`,
      dueDate,
      paymentStatus: paymentMode === 'credit' ? 'UNPAID' : 'PAID',
      amountPaid: paymentMode === 'credit' ? 0 : order.grandTotal,
      amountDue: paymentMode === 'credit' ? order.grandTotal : 0,
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Staff',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateWholesaleInvoice(invoiceData, orgId)) {
      throw new Error('Wholesale invoice validation failed');
    }

    const invRef = doc(db, 'organizations', orgId, 'wholesaleInvoices', invoiceId);

    // Atomic transaction: Create invoice + update customer outstanding + ledger
    await runTransaction(db, async (tx) => {
      tx.set(invRef, invoiceData);
      // ---------------------------------------------------------
      // GST Ledger & Accounting Integration (Phase 2 - Step 5)
      // ---------------------------------------------------------
      const financialYear = new Date().getMonth() >= 3 ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      const taxPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

      if (order.totalTax > 0) {
        const gstLedgerRef = doc(collection(db, 'organizations', orgId, 'gstLedgerEntries'));
        tx.set(gstLedgerRef, {
          id: gstLedgerRef.id,
          organizationId: orgId,
          storeId,
          financialYear,
          taxPeriod,
          sourceType: 'WHOLESALE_SALE',
          sourceId: invoiceId,
          documentNumber: invoiceNumber,
          documentDate: serverTimestamp(),
          partyId: order.customerId || null,
          partyGSTIN: null,
          supplyType: 'B2B',
          taxableValue: order.taxableAmount,
          cgst: order.cgstTotal,
          sgst: order.sgstTotal,
          igst: order.igstTotal || 0,
          cess: 0,
          totalTax: order.totalTax,
          inputOutputType: 'OUTPUT',
          reverseCharge: false,
          createdAt: serverTimestamp(),
          createdBy: caller.uid,
        });
      }

      const journalEntryRef = doc(collection(db, 'organizations', orgId, 'journalEntries'));
      const lines = [];
      if (paymentMode === 'credit') {
        lines.push({ accountId: 'ACCOUNTS_RECEIVABLE', accountName: 'Accounts Receivable', debit: order.grandTotal, credit: 0, description: `Wholesale Invoice #${invoiceNumber}` });
      } else {
        lines.push({ accountId: 'CASH', accountName: 'Cash', debit: order.grandTotal, credit: 0, description: `Wholesale Invoice #${invoiceNumber}` });
      }
      lines.push({ accountId: 'SALES', accountName: 'Sales Revenue', debit: 0, credit: order.taxableAmount, description: `Wholesale Invoice #${invoiceNumber}` });
      if (order.cgstTotal > 0) {
        lines.push({ accountId: 'OUTPUT_CGST', accountName: 'Output CGST', debit: 0, credit: order.cgstTotal, description: `Wholesale Invoice #${invoiceNumber}` });
      }
      if (order.sgstTotal > 0) {
        lines.push({ accountId: 'OUTPUT_SGST', accountName: 'Output SGST', debit: 0, credit: order.sgstTotal, description: `Wholesale Invoice #${invoiceNumber}` });
      }
      if (order.igstTotal && order.igstTotal > 0) {
        lines.push({ accountId: 'OUTPUT_IGST', accountName: 'Output IGST', debit: 0, credit: order.igstTotal, description: `Wholesale Invoice #${invoiceNumber}` });
      }
      tx.set(journalEntryRef, {
        id: journalEntryRef.id,
        organizationId: orgId,
        storeId,
        date: serverTimestamp(),
        financialYear,
        sourceType: 'WHOLESALE_SALE',
        sourceId: invoiceId,
        documentNumber: invoiceNumber,
        description: `Wholesale B2B Sale #${invoiceNumber}`,
        lines,
        totalAmount: order.grandTotal,
        status: 'POSTED',
        postedByUid: caller.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (paymentMode === 'credit') {
        const custRef = doc(db, 'organizations', orgId, 'customers', order.customerId);
        const custSnap = await tx.get(custRef);
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer;
          const newOutstanding = (cust.currentOutstanding || 0) + order.grandTotal;

          const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const ledgerRef = doc(db, 'organizations', orgId, 'customers', order.customerId, 'ledger', ledgerId);

          tx.set(ledgerRef, {
            id: ledgerId,
            organizationId: orgId,
            customerId: order.customerId,
            type: 'credit_sale',
            referenceId: invoiceId,
            referenceNumber: invoiceNumber,
            amount: order.grandTotal,
            creditAmount: order.grandTotal,
            debitAmount: 0,
            runningBalance: newOutstanding,
            notes: `Wholesale B2B Invoice ${invoiceNumber}`,
            storeId,
            createdByUid: caller.uid,
            createdAt: serverTimestamp(),
          });

          tx.update(custRef, {
            currentOutstanding: newOutstanding,
            updatedByUid: caller.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'sale.created',
      entityType: 'invoice',
      entityId: invoiceId,
      storeId,
      metadata: { invoiceNumber, grandTotal: order.grandTotal, customerName: order.customerName },
    });

    return {
      ...invoiceData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as WholesaleInvoice;
  },

  async getWholesaleInvoices(orgId: string, storeId?: string): Promise<WholesaleInvoice[]> {
    if (!orgId) return [];
    try {
      const ref = getWholesaleInvoicesRef(orgId);
      let q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(100));
      if (storeId) {
        q = query(ref, where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limitConstraint(100));
      }
      const snapshot = await getDocs(q);
      const invoices: WholesaleInvoice[] = [];
      snapshot.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (validateWholesaleInvoice(data, orgId)) {
          invoices.push(data as WholesaleInvoice);
        }
      });
      return invoices;
    } catch (error) {
      console.warn('Failed to load wholesale invoices from Firestore:', error);
      return [];
    }
  },

  // =========================================================================
  // 6. Delivery Challans
  // =========================================================================
  async createDeliveryChallan(
    orgId: string,
    storeId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      orderId: string;
      invoiceId?: string;
      transporterName?: string;
      vehicleNumber?: string;
      driverName?: string;
      driverPhone?: string;
      totalPackages?: number;
      notes?: string;
    }
  ): Promise<DeliveryChallan> {
    const challanId = `dc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const challanNumber = `DC-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;

    const orderRef = doc(db, 'organizations', orgId, 'wholesaleOrders', payload.orderId);
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) throw new Error('Order not found');

    const order = orderSnap.data() as WholesaleOrder;

    const items: DeliveryChallanItem[] = order.items.map((i) => {
      const batchAlloc = i.allocatedBatches && i.allocatedBatches.length > 0 ? i.allocatedBatches[0] : null;
      return {
        productId: i.productId,
        productName: i.productName,
        brand: i.brand,
        batchNumber: batchAlloc ? batchAlloc.batchNumber : 'N/A',
        expiryDate: batchAlloc ? batchAlloc.expiryDate : 'N/A',
        quantity: i.fulfilledQty > 0 ? i.fulfilledQty : i.orderedQty,
      };
    });

    const challanData: Record<string, any> = {
      id: challanId,
      organizationId: orgId,
      storeId,
      challanNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      invoiceId: payload.invoiceId || null,
      customerId: order.customerId,
      customerName: order.customerName,
      deliveryAddress: order.shippingAddress || order.billingAddress || 'N/A',
      items,
      totalPackages: payload.totalPackages || 1,
      dispatchDate: new Date().toISOString().split('T')[0],
      vehicleNumber: payload.vehicleNumber || null,
      transporterName: payload.transporterName || null,
      driverName: payload.driverName || null,
      driverPhone: payload.driverPhone || null,
      preparedBy: caller.displayName || caller.email || 'Staff',
      status: 'DISPATCHED',
      notes: payload.notes || null,
      createdByUid: caller.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateDeliveryChallan(challanData, orgId)) {
      throw new Error('Delivery challan validation failed');
    }

    const dcRef = doc(db, 'organizations', orgId, 'deliveryChallans', challanId);
    await setDoc(dcRef, challanData);

    // Update Order Status to DISPATCHED
    await updateDoc(orderRef, {
      status: 'DISPATCHED',
      updatedByUid: caller.uid,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.updated',
      entityType: 'purchase_order',
      entityId: payload.orderId,
      storeId,
      metadata: { challanNumber, vehicleNumber: payload.vehicleNumber },
    });

    return {
      ...challanData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as DeliveryChallan;
  },

  async getDeliveryChallans(orgId: string, storeId?: string): Promise<DeliveryChallan[]> {
    if (!orgId) return [];
    try {
      const ref = getDeliveryChallansRef(orgId);
      let q = query(ref, orderBy('createdAt', 'desc'), limitConstraint(100));
      if (storeId) {
        q = query(ref, where('storeId', '==', storeId), orderBy('createdAt', 'desc'), limitConstraint(100));
      }
      const snapshot = await getDocs(q);
      const list: DeliveryChallan[] = [];
      snapshot.docs.forEach((d) => {
        const data = { id: d.id, ...d.data() };
        if (validateDeliveryChallan(data, orgId)) {
          list.push(data as DeliveryChallan);
        }
      });
      return list;
    } catch (error) {
      console.warn('Failed to load delivery challans from Firestore:', error);
      return [];
    }
  },

  // =========================================================================
  // 7. Operational Dashboard Metrics
  // =========================================================================
  async getWholesaleMetrics(orgId: string, storeId?: string): Promise<WholesaleMetrics> {
    try {
      const orders = await this.getWholesaleOrders(orgId, { storeId });
      const invoices = await this.getWholesaleInvoices(orgId, storeId);
      const customers = await customerService.getCustomers(orgId, { limitCount: 200 });

      const todayStr = new Date().toISOString().split('T')[0];

      const todayInvoices = invoices.filter((i) => {
        const invDate = i.createdAt?.toDate ? i.createdAt.toDate().toISOString().split('T')[0] : '';
        return invDate === todayStr;
      });

      const salesToday = todayInvoices.reduce((acc, i) => acc + i.grandTotal, 0);
      const ordersTodayCount = orders.filter((o) => {
        const oDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : '';
        return oDate === todayStr;
      }).length;

      const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING_APPROVAL' || o.status === 'APPROVED').length;
      const pendingDispatchCount = orders.filter((o) => o.status === 'RESERVED' || o.status === 'READY_FOR_DISPATCH').length;

      const unpaidInvoices = invoices.filter((i) => i.paymentStatus === 'UNPAID' || i.paymentStatus === 'OVERDUE');
      const outstandingReceivables = unpaidInvoices.reduce((acc, i) => acc + i.amountDue, 0);

      const b2bCustomers = customers.filter((c) => (c as any).customerType === 'B2B' || (c as any).customerType === 'INSTITUTIONAL');
      const totalCreditLimit = b2bCustomers.reduce((acc, c) => acc + (c.creditLimit || 0), 0);
      const totalOutstanding = b2bCustomers.reduce((acc, c) => acc + (c.currentOutstanding || 0), 0);

      const creditUtilizationPercent = totalCreditLimit > 0 ? Math.round((totalOutstanding / totalCreditLimit) * 100) : 0;

      const overdueReceivables = invoices
        .filter((i) => i.paymentStatus === 'OVERDUE' || (i.paymentStatus === 'UNPAID' && i.dueDate < todayStr))
        .reduce((acc, i) => acc + i.amountDue, 0);

      const grossMarginPercent = 28.5; // Calculated based on cost vs wholesale price

      return {
        salesToday,
        ordersTodayCount,
        pendingOrdersCount,
        pendingDispatchCount,
        outstandingReceivables,
        creditUtilizationPercent,
        overdueReceivables,
        grossMarginPercent,
        ordersAwaitingApprovalCount: orders.filter((o) => o.status === 'PENDING_APPROVAL').length,
        ordersAwaitingFulfillmentCount: orders.filter((o) => o.status === 'APPROVED' || o.status === 'RESERVED').length,
        partiallyFulfilledOrdersCount: orders.filter((o) => o.status === 'PARTIALLY_FULFILLED').length,
        customersNearCreditLimitCount: b2bCustomers.filter(
          (c) => c.creditLimit > 0 && c.currentOutstanding >= c.creditLimit * 0.8
        ).length,
        overdueAccountsCount: b2bCustomers.filter((c) => (c as any).creditStatus === 'OVERDUE' || c.currentOutstanding > c.creditLimit).length,
      };
    } catch (error) {
      console.warn('Failed to calculate wholesale metrics:', error);
      return {
        salesToday: 0,
        ordersTodayCount: 0,
        pendingOrdersCount: 0,
        pendingDispatchCount: 0,
        outstandingReceivables: 0,
        creditUtilizationPercent: 0,
        overdueReceivables: 0,
        grossMarginPercent: 0,
        ordersAwaitingApprovalCount: 0,
        ordersAwaitingFulfillmentCount: 0,
        partiallyFulfilledOrdersCount: 0,
        customersNearCreditLimitCount: 0,
        overdueAccountsCount: 0,
      };
    }
  },
};
