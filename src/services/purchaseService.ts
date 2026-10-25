import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { PurchaseOrder, POStatus, POItem } from '../types/firestore';
import { validatePurchaseOrder } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';

export function getPurchaseOrdersRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'purchaseOrders');
}

export function getPurchaseOrderDocRef(organizationId: string, poId: string) {
  return doc(db, 'organizations', organizationId, 'purchaseOrders', poId);
}

export function generatePONumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `PO-${dateStr}-${randomStr}`;
}

export const purchaseService = {
  async createPurchaseOrder(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      storeId: string;
      supplierId: string;
      supplierName: string;
      items: Omit<POItem, 'receivedQuantity'>[];
      expectedDeliveryDate?: string;
      notes?: string;
    }
  ): Promise<PurchaseOrder> {
    const poId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = getPurchaseOrderDocRef(organizationId, poId);
    const poNumber = generatePONumber();

    const formattedItems: POItem[] = payload.items.map((it: any) => {
      const lineTaxable = (it.orderedQuantity || 0) * (it.unitCost || 0);
      const lineTax = (lineTaxable * (it.gstRate || it.taxRate || 0)) / 100;
      const lineTotal = lineTaxable + lineTax;
      return {
        productId: it.productId,
        productName: it.productName,
        brand: it.brand || '',
        sku: it.sku || '',
        hsnCode: it.hsnCode || '',
        orderedQuantity: Number(it.orderedQuantity) || 0,
        receivedQuantity: 0,
        unitCost: Number(it.unitCost) || 0,
        gstRate: Number(it.gstRate || it.taxRate) || 0,
        taxableAmount: Number(lineTaxable.toFixed(2)),
        taxAmount: Number(lineTax.toFixed(2)),
        totalAmount: Number(lineTotal.toFixed(2)),
      };
    });

    const totalOrderedQty = formattedItems.reduce((acc, item) => acc + item.orderedQuantity, 0);
    const subtotal = formattedItems.reduce((acc, item) => acc + item.taxableAmount, 0);
    const totalTax = formattedItems.reduce((acc, item) => acc + item.taxAmount, 0);
    const grandTotal = subtotal + totalTax;

    const fullPayload: Record<string, any> = {
      id: poId,
      organizationId,
      storeId: payload.storeId,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName,
      poNumber,
      items: formattedItems,
      itemsCount: formattedItems.length,
      totalOrderedQty,
      totalReceivedQty: 0,
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
      status: 'draft',
      expectedDeliveryDate: payload.expectedDeliveryDate || null,
      notes: payload.notes || '',
      createdByUid: caller.uid,
      createdByName: caller.displayName || caller.email || 'Staff',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validatePurchaseOrder(fullPayload, organizationId)) {
      console.error('Validation failure payload detail:', JSON.stringify(fullPayload, null, 2));
      throw new Error('Malformed purchase order payload. Validation failed.');
    }

    await setDoc(docRef, fullPayload);

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'purchase_order.created',
      entityType: 'purchase_order',
      entityId: poId,
      storeId: payload.storeId,
      metadata: {
        poNumber,
        supplierId: payload.supplierId,
        supplierName: payload.supplierName,
        grandTotal: fullPayload.grandTotal,
        itemsCount: formattedItems.length,
      },
    });

    return {
      ...fullPayload,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as PurchaseOrder;
  },

  async getPurchaseOrder(organizationId: string, poId: string): Promise<PurchaseOrder | null> {
    const docRef = getPurchaseOrderDocRef(organizationId, poId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = { id: snap.id, ...snap.data() };
    if (validatePurchaseOrder(data, organizationId)) {
      return data as PurchaseOrder;
    }
    return null;
  },

  async getPurchaseOrders(
    organizationId: string,
    optionsOrStoreId?: string | {
      storeId?: string;
      supplierId?: string;
      status?: POStatus | 'all';
    },
    statusFilter?: POStatus | 'all'
  ): Promise<PurchaseOrder[]> {
    const options = typeof optionsOrStoreId === 'string'
      ? { storeId: optionsOrStoreId, status: statusFilter }
      : (optionsOrStoreId || {});
    const ref = getPurchaseOrdersRef(organizationId);
    const constraints: any[] = [];

    if (options.storeId) {
      constraints.push(where('storeId', '==', options.storeId));
    }
    if (options.supplierId) {
      constraints.push(where('supplierId', '==', options.supplierId));
    }
    if (options.status && options.status !== 'all') {
      constraints.push(where('status', '==', options.status));
    }

    constraints.push(orderBy('createdAt', 'desc'));

    const q = query(ref, ...constraints);
    const snap = await getDocs(q);
    const results: PurchaseOrder[] = [];
    snap.docs.forEach((docSnap) => {
      const data = { id: docSnap.id, ...(docSnap.data() as object) };
      if (validatePurchaseOrder(data, organizationId)) {
        results.push(data as PurchaseOrder);
      }
    });
    return results;
  },

  async updatePOStatus(
    organizationId: string,
    poId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    newStatus: POStatus,
    reason?: string
  ): Promise<void> {
    const docRef = getPurchaseOrderDocRef(organizationId, poId);
    const po = await this.getPurchaseOrder(organizationId, poId);
    if (!po) {
      throw new Error('Purchase order not found.');
    }

    if (po.status === 'fulfilled' || po.status === 'cancelled') {
      throw new Error(`Cannot update PO in terminal state '${po.status}'.`);
    }

    await updateDoc(docRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
      ...(newStatus === 'approved' ? {
        approvedByUid: caller.uid,
        approvedAt: serverTimestamp(),
      } : {}),
    });

    const auditActionMap: Record<POStatus, any> = {
      draft: 'purchase_order.draft',
      pending_approval: 'purchase_order.pending_approval',
      approved: 'purchase_order.approved',
      partially_fulfilled: 'purchase_order.partially_fulfilled',
      fulfilled: 'purchase_order.fulfilled',
      cancelled: 'purchase_order.cancelled',
    };

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: auditActionMap[newStatus] || 'purchase_order.updated',
      entityType: 'purchase_order',
      entityId: poId,
      storeId: po.storeId,
      metadata: {
        poNumber: po.poNumber,
        previousStatus: po.status,
        newStatus,
        reason: reason || null,
      },
    });
  },
};
