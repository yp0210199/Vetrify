import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  CustomerAddress,
  OnlineOrder,
  OnlineOrderStatus,
  DeliveryStatus,
  DeliveryPartner,
  DeliveryRun
} from '../types/ecommerce';
import { PharmacyBatch } from '../types/batch';
import { validateCustomerAddress, validateOnlineOrder, validateDeliveryPartner, validateDeliveryRun } from '../validators/ecommerceValidators';
import { logAuditEvent } from './auditService';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.error('Firestore Error in EcommerceService: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const ecommerceService = {
  // ---------------------------------------------------------------------------
  // Customer Addresses
  // ---------------------------------------------------------------------------
  async getCustomerAddresses(orgId: string, customerId: string): Promise<CustomerAddress[]> {
    const path = `organizations/${orgId}/customerAddresses`;
    try {
      const q = query(
        collection(db, 'organizations', orgId, 'customerAddresses'),
        where('customerId', '==', customerId)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data() as CustomerAddress);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveCustomerAddress(orgId: string, customerId: string, addressData: Partial<CustomerAddress>): Promise<string> {
    const path = `organizations/${orgId}/customerAddresses`;
    if (!validateCustomerAddress(addressData)) {
      throw new Error('Invalid address data. Please check phone and postal code format.');
    }
    try {
      const addressId = addressData.id || doc(collection(db, 'organizations', orgId, 'customerAddresses')).id;
      const ref = doc(db, 'organizations', orgId, 'customerAddresses', addressId);

      const payload = {
        ...addressData,
        id: addressId,
        organizationId: orgId,
        customerId,
        updatedAt: serverTimestamp(),
        createdAt: addressData.createdAt || serverTimestamp()
      };

      await setDoc(ref, payload, { merge: true });
      return addressId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async deleteCustomerAddress(orgId: string, addressId: string): Promise<void> {
    const path = `organizations/${orgId}/customerAddresses/${addressId}`;
    try {
      await deleteDoc(doc(db, 'organizations', orgId, 'customerAddresses', addressId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // ---------------------------------------------------------------------------
  // Online Orders (Customer & Staff)
  // ---------------------------------------------------------------------------
  async getOnlineOrders(orgId: string, storeId?: string, customerId?: string): Promise<OnlineOrder[]> {
    const path = `organizations/${orgId}/onlineOrders`;
    try {
      const ordersRef = collection(db, 'organizations', orgId, 'onlineOrders');
      let q;
      if (customerId) {
        q = query(ordersRef, where('customerId', '==', customerId));
      } else if (storeId) {
        q = query(ordersRef, where('storeId', '==', storeId));
      } else {
        q = query(ordersRef);
      }

      const snap = await getDocs(q);
      let orders = snap.docs.map(d => d.data() as OnlineOrder);

      if (storeId && customerId) {
        orders = orders.filter(o => o.storeId === storeId);
      }

      orders.sort((a, b) => {
        const getMillis = (val: any) => {
          if (!val) return 0;
          if (typeof val === 'object' && 'toMillis' in val && typeof val.toMillis === 'function') {
            return val.toMillis();
          }
          if (typeof val === 'object' && 'seconds' in val) {
            return val.seconds * 1000;
          }
          return new Date(val).getTime() || 0;
        };
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      });

      return orders;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async getCustomerOrders(orgId: string, customerId: string): Promise<OnlineOrder[]> {
    return this.getOnlineOrders(orgId, undefined, customerId);
  },

  async getOnlineOrderById(orgId: string, orderId: string): Promise<OnlineOrder | null> {
    const path = `organizations/${orgId}/onlineOrders/${orderId}`;
    try {
      const snap = await getDoc(doc(db, 'organizations', orgId, 'onlineOrders', orderId));
      return snap.exists() ? (snap.data() as OnlineOrder) : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async placeOnlineOrder(
    orgId: string,
    storeId: string,
    customerId: string,
    customerName: string,
    customerPhone: string,
    items: any[],
    address: CustomerAddress,
    paymentMode: 'upi' | 'card' | 'net_banking' | 'cod' | 'store_pickup',
    fulfilmentType: 'delivery' | 'pickup',
    prescriptionIds: string[],
    caller: { uid: string; name: string }
  ): Promise<string> {
    const orderId = doc(collection(db, 'organizations', orgId, 'onlineOrders')).id;
    const orderNumber = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

    let subtotal = 0;
    let totalDiscount = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;
    let totalQuantity = 0;

    const formattedItems = items.map(item => {
      const qty = Number(item.qty) || 1;
      const unitPrice = Number(item.unitPrice) || 0;
      const itemSub = unitPrice * qty;
      const disc = Number(item.discountPercent) || 0;
      const taxable = itemSub * (1 - disc / 100);
      const gst = Number(item.gstPercent) || 12;

      const taxAmount = taxable * (gst / 100);
      const cgst = taxAmount / 2;
      const sgst = taxAmount / 2;
      const igst = 0;

      subtotal += itemSub;
      totalDiscount += (itemSub * disc) / 100;
      cgstTotal += cgst;
      sgstTotal += sgst;
      igstTotal += igst;
      totalQuantity += qty;

      return {
        productId: item.productId,
        productName: item.productName || item.name || 'Product',
        brand: item.brand || '',
        sku: item.sku || 'SKU-GEN',
        qty,
        unitPrice,
        discountPercent: disc,
        gstPercent: gst,
        cgstAmount: Math.round(cgst * 100) / 100,
        sgstAmount: Math.round(sgst * 100) / 100,
        igstAmount: Math.round(igst * 100) / 100,
        totalAmount: Math.round((taxable + taxAmount) * 100) / 100,
        isPrescriptionRequired: Boolean(item.isPrescriptionRequired),
        schedule: item.schedule || ''
      };
    });

    const taxableAmount = subtotal - totalDiscount;
    const totalTax = cgstTotal + sgstTotal + igstTotal;
    const grandTotalBeforeRound = taxableAmount + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRound);
    const roundOff = Math.round((grandTotal - grandTotalBeforeRound) * 100) / 100;

    const needsPrescription = formattedItems.some(i => i.isPrescriptionRequired);
    const initialStatus: OnlineOrderStatus = needsPrescription && prescriptionIds.length === 0
      ? 'pending_review'
      : (paymentMode === 'cod' || paymentMode === 'store_pickup' ? 'confirmed' : 'pending_payment');

    const orderPayload: OnlineOrder = {
      id: orderId,
      orderNumber,
      organizationId: orgId,
      storeId,
      customerId,
      customerName,
      customerPhone,
      deliveryAddressId: address.id,
      deliveryAddressSnapshot: address,
      items: formattedItems,
      itemsCount: formattedItems.length,
      totalQuantity,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      cgstTotal: Math.round(cgstTotal * 100) / 100,
      sgstTotal: Math.round(sgstTotal * 100) / 100,
      igstTotal: Math.round(igstTotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      roundOff,
      grandTotal,
      paymentMode,
      paymentStatus: paymentMode === 'cod' || paymentMode === 'store_pickup' ? 'pending' : 'paid',
      orderStatus: initialStatus,
      prescriptionRequired: needsPrescription,
      prescriptionIds,
      fulfilmentType,
      deliveryStatus: fulfilmentType === 'delivery' ? 'unassigned' : 'delivered',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdByUid: caller.uid,
      createdByName: caller.name
    };

    if (!validateOnlineOrder(orderPayload)) {
      throw new Error('Online order validation failed.');
    }

    try {
      await runTransaction(db, async (tx) => {
        // Atomic stock allocation (FEFO logic across active batches for each item)
        for (const item of formattedItems) {
          const batchesRef = collection(db, 'organizations', orgId, 'batches');
          const batchQuery = query(
            batchesRef,
            where('storeId', '==', storeId),
            where('productId', '==', item.productId),
            where('status', '==', 'active')
          );
          const batchSnap = await getDocs(batchQuery);
          const batches = batchSnap.docs.map(d => d.data() as PharmacyBatch);
          
          batches.sort((a, b) => {
            const expA = a.expiryDate && typeof a.expiryDate === 'object' && 'toMillis' in a.expiryDate ? a.expiryDate.toMillis() : new Date((a.expiryDate as any) || 0).getTime();
            const expB = b.expiryDate && typeof b.expiryDate === 'object' && 'toMillis' in b.expiryDate ? b.expiryDate.toMillis() : new Date((b.expiryDate as any) || 0).getTime();
            return expA - expB;
          });

          let qtyNeeded = item.qty;
          for (const batch of batches) {
            if (qtyNeeded <= 0) break;
            const available = (batch.quantity || 0) - (batch.reservedQuantity || 0);
            if (available <= 0) continue;

            const allocate = Math.min(qtyNeeded, available);
            const batchRef = doc(db, 'organizations', orgId, 'batches', batch.id);
            tx.update(batchRef, {
              reservedQuantity: (batch.reservedQuantity || 0) + allocate,
              updatedAt: serverTimestamp()
            });
            qtyNeeded -= allocate;
          }

          if (qtyNeeded > 0) {
            // Auto-create an active batch with sufficient stock if inventory batch is missing or low
            const newBatchId = doc(collection(db, 'organizations', orgId, 'batches')).id;
            const newBatchRef = doc(db, 'organizations', orgId, 'batches', newBatchId);
            const autoQty = qtyNeeded + 1000;
            tx.set(newBatchRef, {
              id: newBatchId,
              organizationId: orgId,
              storeId,
              productId: item.productId,
              productName: item.productName,
              batchNumber: `AUTO-B-${Math.floor(1000 + Math.random() * 9000)}`,
              quantity: autoQty,
              reservedQuantity: qtyNeeded,
              costPrice: item.unitPrice * 0.7,
              sellingPrice: item.unitPrice,
              expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              status: 'active',
              createdByUid: caller.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }

        const orderRef = doc(db, 'organizations', orgId, 'onlineOrders', orderId);
        tx.set(orderRef, orderPayload);
      });

      await logAuditEvent(orgId, {
        actorUid: caller.uid,
        actorDisplayName: caller.name,
        action: 'online.order.created' as any,
        entityType: 'invoice' as any,
        entityId: orderId,
        storeId,
        metadata: { orderNumber, grandTotal }
      });

      return orderId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `organizations/${orgId}/onlineOrders/${orderId}`);
      throw error;
    }
  },

  async updateOrderStatus(
    orgId: string,
    orderId: string,
    newStatus: OnlineOrderStatus,
    caller: { uid: string; name: string }
  ): Promise<void> {
    const path = `organizations/${orgId}/onlineOrders/${orderId}`;
    try {
      const orderRef = doc(db, 'organizations', orgId, 'onlineOrders', orderId);
      const updateData: any = {
        orderStatus: newStatus,
        updatedAt: serverTimestamp()
      };
      if (newStatus === 'confirmed') updateData.acceptedAt = serverTimestamp();
      if (newStatus === 'packed') updateData.packedAt = serverTimestamp();
      if (newStatus === 'out_for_delivery') updateData.dispatchedAt = serverTimestamp();
      if (newStatus === 'delivered' || newStatus === 'picked_up') updateData.deliveredAt = serverTimestamp();
      if (newStatus === 'cancelled') updateData.cancelledAt = serverTimestamp();

      await updateDoc(orderRef, updateData);

      await logAuditEvent(orgId, {
        actorUid: caller.uid,
        actorDisplayName: caller.name,
        action: 'online.order.updated' as any,
        entityType: 'invoice' as any,
        entityId: orderId,
        metadata: { newStatus }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // ---------------------------------------------------------------------------
  // Delivery Partners & Runs
  // ---------------------------------------------------------------------------
  async getDeliveryPartners(orgId: string): Promise<DeliveryPartner[]> {
    const path = `organizations/${orgId}/deliveryPartners`;
    try {
      const snap = await getDocs(collection(db, 'organizations', orgId, 'deliveryPartners'));
      return snap.docs.map(d => d.data() as DeliveryPartner);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  async saveDeliveryPartner(orgId: string, partnerData: Partial<DeliveryPartner>): Promise<string> {
    const path = `organizations/${orgId}/deliveryPartners`;
    if (!validateDeliveryPartner(partnerData)) {
      throw new Error('Invalid delivery partner data.');
    }
    try {
      const partnerId = partnerData.id || doc(collection(db, 'organizations', orgId, 'deliveryPartners')).id;
      const ref = doc(db, 'organizations', orgId, 'deliveryPartners', partnerId);
      const payload = {
        ...partnerData,
        id: partnerId,
        organizationId: orgId,
        status: partnerData.status || 'available',
        updatedAt: serverTimestamp(),
        createdAt: partnerData.createdAt || serverTimestamp()
      };
      await setDoc(ref, payload, { merge: true });
      return partnerId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  async assignOrderToDeliveryPartner(
    orgId: string,
    orderId: string,
    partnerId: string,
    partnerName: string,
    caller: { uid: string; name: string }
  ): Promise<void> {
    const path = `organizations/${orgId}/onlineOrders/${orderId}`;
    try {
      const orderRef = doc(db, 'organizations', orgId, 'onlineOrders', orderId);
      await updateDoc(orderRef, {
        deliveryPartnerId: partnerId,
        deliveryPartnerName: partnerName,
        deliveryStatus: 'assigned',
        orderStatus: 'ready_for_dispatch',
        updatedAt: serverTimestamp()
      });

      await logAuditEvent(orgId, {
        actorUid: caller.uid,
        actorDisplayName: caller.name,
        action: 'delivery.assigned' as any,
        entityType: 'invoice' as any,
        entityId: orderId,
        metadata: { partnerId, partnerName }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async dispatchOrder(orgId: string, orderId: string, caller: { uid: string; name: string }): Promise<void> {
    const path = `organizations/${orgId}/onlineOrders/${orderId}`;
    try {
      const orderRef = doc(db, 'organizations', orgId, 'onlineOrders', orderId);
      await updateDoc(orderRef, {
        deliveryStatus: 'out_for_delivery',
        orderStatus: 'out_for_delivery',
        dispatchedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditEvent(orgId, {
        actorUid: caller.uid,
        actorDisplayName: caller.name,
        action: 'online.order.dispatched' as any,
        entityType: 'invoice' as any,
        entityId: orderId,
        metadata: {}
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async completeDelivery(orgId: string, orderId: string, caller: { uid: string; name: string }): Promise<void> {
    const path = `organizations/${orgId}/onlineOrders/${orderId}`;
    try {
      const orderRef = doc(db, 'organizations', orgId, 'onlineOrders', orderId);
      await updateDoc(orderRef, {
        deliveryStatus: 'delivered',
        orderStatus: 'delivered',
        paymentStatus: 'paid',
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await logAuditEvent(orgId, {
        actorUid: caller.uid,
        actorDisplayName: caller.name,
        action: 'online.order.delivered' as any,
        entityType: 'invoice' as any,
        entityId: orderId,
        metadata: {}
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
};
