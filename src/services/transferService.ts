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
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import {
  StockTransferRequest,
  StockTransferItem,
  StockTransferBatchAllocation,
  StockTransferStatus,
  TransferPriority,
  RebalanceRecommendation,
  StockTransferMetrics,
} from '../types/transfer';
import { PharmacyBatch } from '../types/batch';
import { validateStockTransferRequest } from '../lib/firebase/validators';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';
import { batchService, normalizeBatchNumber } from './batchService';
import { storeService } from './storeService';
import { getProducts } from './productService';
import { handleFirestoreError, OperationType } from '../lib/firebase/error';

export function getStockTransfersRef(organizationId: string) {
  return collection(db, 'organizations', organizationId, 'stockTransfers');
}

export function getStockTransferDocRef(organizationId: string, transferId: string) {
  return doc(db, 'organizations', organizationId, 'stockTransfers', transferId);
}

export const transferService = {
  /**
   * Create a new inter-store stock transfer request
   */
  async createTransferRequest(
    organizationId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    payload: {
      sourceStoreId: string;
      sourceStoreName: string;
      destinationStoreId: string;
      destinationStoreName: string;
      priority: TransferPriority;
      reason?: string;
      items: {
        productId: string;
        productName: string;
        brand?: string;
        sku: string;
        dosageForm?: string;
        strength?: string;
        manufacturerName?: string;
        requestedQty: number;
        unitPurchaseCost: number;
        unitMrp: number;
        unitSalePrice: number;
        remarks?: string;
      }[];
    }
  ): Promise<StockTransferRequest> {
    if (payload.sourceStoreId === payload.destinationStoreId) {
      throw new Error('Source store and destination store must be different.');
    }

    if (!payload.items || payload.items.length === 0) {
      throw new Error('Transfer request must contain at least one item.');
    }

    const transferId = `str_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const transferNumber = `STR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const docRef = getStockTransferDocRef(organizationId, transferId);

    const items: StockTransferItem[] = payload.items.map((item) => ({
      ...item,
      totalValue: Number((item.requestedQty * item.unitPurchaseCost).toFixed(2)),
    }));

    const itemsCount = items.length;
    const totalRequestedQty = items.reduce((sum, item) => sum + item.requestedQty, 0);
    const totalTransferValue = Number(items.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2));

    const transferData: Record<string, any> = {
      id: transferId,
      organizationId,
      transferNumber,
      sourceStoreId: payload.sourceStoreId,
      sourceStoreName: payload.sourceStoreName,
      destinationStoreId: payload.destinationStoreId,
      destinationStoreName: payload.destinationStoreName,
      status: 'PENDING_APPROVAL' as StockTransferStatus,
      priority: payload.priority || 'ROUTINE',
      reason: payload.reason || '',
      items,
      itemsCount,
      totalRequestedQty,
      totalTransferValue,
      requestedByUid: caller.uid,
      requestedByName: caller.displayName || caller.email || 'Staff Member',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (!validateStockTransferRequest(transferData, organizationId)) {
      throw new Error('Invalid stock transfer payload validation failed.');
    }

    await setDoc(docRef, transferData);

    // Audit log
    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.created',
      entityType: 'stock_transfer',
      entityId: transferId,
      storeId: payload.sourceStoreId,
      metadata: {
        transferNumber,
        sourceStoreId: payload.sourceStoreId,
        destinationStoreId: payload.destinationStoreId,
        itemsCount,
        totalRequestedQty,
        totalTransferValue,
      },
    });

    // Notify managers & destination store
    try {
      await notificationService.createNotification(organizationId, {
        recipientUid: 'all',
        title: 'New Stock Transfer Request',
        message: `Transfer ${transferNumber} requested from ${payload.sourceStoreName} to ${payload.destinationStoreName} (${totalRequestedQty} units).`,
        type: 'inventory',
        severity: 'info',
        entityRef: { collection: 'stockTransfers', id: transferId },
      });
    } catch (e) {
      console.warn('Failed to send transfer creation notification:', e);
    }

    return {
      ...transferData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as StockTransferRequest;
  },

  /**
   * Fetch a single stock transfer request by ID
   */
  async getTransferById(organizationId: string, transferId: string): Promise<StockTransferRequest | null> {
    const docRef = getStockTransferDocRef(organizationId, transferId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as StockTransferRequest;
  },

  /**
   * Fetch transfer requests with filters & pagination
   */
  async getTransferRequests(
    organizationId: string,
    options: {
      storeId?: string;
      roleInTransfer?: 'source' | 'destination' | 'both';
      status?: StockTransferStatus | 'all';
      pageSize?: number;
      lastDoc?: unknown;
    } = {}
  ): Promise<{ transfers: StockTransferRequest[]; lastDoc: unknown; hasMore: boolean }> {
    const { storeId, roleInTransfer = 'both', status = 'all', pageSize = 50, lastDoc } = options;
    const ref = getStockTransfersRef(organizationId);
    const constraints: any[] = [];

    if (status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    if (storeId) {
      if (roleInTransfer === 'source') {
        constraints.push(where('sourceStoreId', '==', storeId));
      } else if (roleInTransfer === 'destination') {
        constraints.push(where('destinationStoreId', '==', storeId));
      }
    }

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(pageSize + 1));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    try {
      const q = query(ref, ...constraints);
      const snapshot = await getDocs(q);

      let transfers = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as StockTransferRequest[];

      // If storeId is provided with 'both' mode, client filter locally if needed
      if (storeId && roleInTransfer === 'both') {
        transfers = transfers.filter(
          (t) => t.sourceStoreId === storeId || t.destinationStoreId === storeId
        );
      }

      const hasMore = transfers.length > pageSize;
      if (hasMore) {
        transfers.pop();
      }

      const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

      return { transfers, lastDoc: newLastDoc, hasMore };
    } catch (error) {
      if ((error as any)?.code === 'permission-denied' || String(error).includes('permissions')) {
        handleFirestoreError(error, OperationType.LIST, `organizations/${organizationId}/stockTransfers`);
      }
      throw error;
    }
  },

  /**
   * FEFO Auto-Allocation for Transfer Items from Source Store
   */
  async allocateFEFOForTransfer(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<StockTransferRequest> {
    const transfer = await this.getTransferById(organizationId, transferId);
    if (!transfer) throw new Error('Transfer request not found.');

    if (transfer.status !== 'PENDING_APPROVAL' && transfer.status !== 'APPROVED') {
      throw new Error(`Cannot allocate FEFO for transfer in status ${transfer.status}`);
    }

    const updatedItems: StockTransferItem[] = [];

    for (const item of transfer.items) {
      const saleableBatches = await batchService.getSaleableBatchesForProduct(
        organizationId,
        item.productId,
        transfer.sourceStoreId
      );

      let remainingToAllocate = item.requestedQty;
      const batchAllocations: StockTransferBatchAllocation[] = [];

      for (const batch of saleableBatches) {
        if (remainingToAllocate <= 0) break;
        const allocQty = Math.min(batch.availableQuantity, remainingToAllocate);
        if (allocQty > 0) {
          batchAllocations.push({
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: typeof batch.expiryDate === 'object' && 'toDate' in batch.expiryDate
              ? (batch.expiryDate as any).toDate().toISOString().split('T')[0]
              : String(batch.expiryDate),
            allocatedQty: allocQty,
            purchasePrice: batch.purchasePrice,
            mrp: batch.mrp,
            salePrice: batch.salePrice,
          });
          remainingToAllocate -= allocQty;
        }
      }

      const totalAllocated = batchAllocations.reduce((acc, b) => acc + b.allocatedQty, 0);

      updatedItems.push({
        ...item,
        allocatedQty: totalAllocated,
        allocatedBatches: batchAllocations,
      });
    }

    const docRef = getStockTransferDocRef(organizationId, transferId);
    await updateDoc(docRef, {
      items: updatedItems,
      status: 'ALLOCATED',
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.allocated',
      entityType: 'stock_transfer',
      entityId: transferId,
      storeId: transfer.sourceStoreId,
      metadata: {
        transferNumber: transfer.transferNumber,
        itemsCount: updatedItems.length,
      },
    });

    return (await this.getTransferById(organizationId, transferId))!;
  },

  /**
   * Approve a Transfer Request
   */
  async approveTransferRequest(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<StockTransferRequest> {
    const transfer = await this.getTransferById(organizationId, transferId);
    if (!transfer) throw new Error('Transfer request not found.');

    if (transfer.status !== 'PENDING_APPROVAL' && transfer.status !== 'DRAFT') {
      throw new Error(`Cannot approve transfer in status ${transfer.status}`);
    }

    // Run FEFO auto allocation
    const allocatedTransfer = await this.allocateFEFOForTransfer(organizationId, transferId, caller);

    const docRef = getStockTransferDocRef(organizationId, transferId);
    await updateDoc(docRef, {
      status: 'APPROVED',
      approvedByUid: caller.uid,
      approvedByName: caller.displayName || caller.email || 'Manager',
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.approved',
      entityType: 'stock_transfer',
      entityId: transferId,
      storeId: transfer.sourceStoreId,
      metadata: { transferNumber: transfer.transferNumber },
    });

    return (await this.getTransferById(organizationId, transferId))!;
  },

  /**
   * Dispatch Transfer (ATOMIC FIRESTORE TRANSACTION)
   * Decrements source store batch quantities and sets status to DISPATCHED / IN_TRANSIT
   */
  async dispatchTransfer(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    dispatchDetails: {
      driverName?: string;
      vehicleNumber?: string;
      trackingNumber?: string;
      dispatchNotes?: string;
    } = {}
  ): Promise<StockTransferRequest> {
    const transferDocRef = getStockTransferDocRef(organizationId, transferId);

    await runTransaction(db, async (transaction) => {
      const transferSnap = await transaction.get(transferDocRef);
      if (!transferSnap.exists()) {
        throw new Error('Stock transfer request doc not found.');
      }

      const transferData = transferSnap.data() as StockTransferRequest;
      if (
        transferData.status !== 'APPROVED' &&
        transferData.status !== 'ALLOCATED' &&
        transferData.status !== 'PENDING_APPROVAL'
      ) {
        throw new Error(`Cannot dispatch transfer in status ${transferData.status}`);
      }

      // Read all source batches referenced in allocatedBatches
      const batchDocRefs: { docRef: any; batchId: string; itemIndex: number; alloc: StockTransferBatchAllocation }[] = [];

      for (let i = 0; i < transferData.items.length; i++) {
        const item = transferData.items[i];
        if (!item.allocatedBatches || item.allocatedBatches.length === 0) {
          throw new Error(`Item "${item.productName}" has no allocated batches. Allocate FEFO before dispatching.`);
        }
        for (const alloc of item.allocatedBatches) {
          const batchRef = doc(db, 'organizations', organizationId, 'batches', alloc.batchId);
          batchDocRefs.push({ docRef: batchRef, batchId: alloc.batchId, itemIndex: i, alloc });
        }
      }

      // Execute all reads first in transaction
      const batchSnaps = await Promise.all(batchDocRefs.map((b) => transaction.get(b.docRef)));

      // Verify stock availability & prepare batch updates
      const updatedBatchesToSave: { docRef: any; newQty: number; newAvailQty: number; newStatus: string }[] = [];
      const updatedItems: StockTransferItem[] = JSON.parse(JSON.stringify(transferData.items));

      for (let k = 0; k < batchDocRefs.length; k++) {
        const { docRef, batchId, itemIndex, alloc } = batchDocRefs[k];
        const snap = batchSnaps[k];

        if (!snap.exists()) {
          throw new Error(`Source batch ID ${batchId} no longer exists in inventory.`);
        }

        const batchData = snap.data() as PharmacyBatch;
        if (batchData.storeId !== transferData.sourceStoreId) {
          throw new Error(`Batch ${batchData.batchNumber} does not belong to source store.`);
        }

        if (batchData.availableQuantity < alloc.allocatedQty) {
          throw new Error(
            `Insufficient available stock in batch ${batchData.batchNumber} (Available: ${batchData.availableQuantity}, Requested: ${alloc.allocatedQty}).`
          );
        }

        const newQty = Math.max(0, batchData.quantity - alloc.allocatedQty);
        const newAvailQty = Math.max(0, batchData.availableQuantity - alloc.allocatedQty);
        const newStatus = newQty === 0 ? 'depleted' : batchData.status;

        updatedBatchesToSave.push({ docRef, newQty, newAvailQty, newStatus });

        // Record dispatched quantity on item and batch allocation
        const targetItem = updatedItems[itemIndex];
        targetItem.dispatchedQty = (targetItem.dispatchedQty || 0) + alloc.allocatedQty;
        const targetAllocBatch = targetItem.allocatedBatches?.find((b) => b.batchId === batchId);
        if (targetAllocBatch) {
          targetAllocBatch.dispatchedQty = alloc.allocatedQty;
        }
      }

      // Execute writes in transaction
      for (const b of updatedBatchesToSave) {
        transaction.update(b.docRef, {
          quantity: b.newQty,
          availableQuantity: b.newAvailQty,
          status: b.newStatus,
          updatedByUid: caller.uid,
          updatedAt: serverTimestamp(),
        });
      }

      const totalDispatchedQty = updatedItems.reduce((sum, item) => sum + (item.dispatchedQty || 0), 0);

      transaction.update(transferDocRef, {
        items: updatedItems,
        totalDispatchedQty,
        status: 'DISPATCHED',
        driverName: dispatchDetails.driverName || '',
        vehicleNumber: dispatchDetails.vehicleNumber || '',
        trackingNumber: dispatchDetails.trackingNumber || '',
        dispatchNotes: dispatchDetails.dispatchNotes || '',
        dispatchedByUid: caller.uid,
        dispatchedByName: caller.displayName || caller.email || 'Store Operator',
        dispatchedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    // Post-transaction Audit & Notification
    const dispatchedTransfer = (await this.getTransferById(organizationId, transferId))!;

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.dispatched',
      entityType: 'stock_transfer',
      entityId: transferId,
      storeId: dispatchedTransfer.sourceStoreId,
      metadata: {
        transferNumber: dispatchedTransfer.transferNumber,
        totalDispatchedQty: dispatchedTransfer.totalDispatchedQty,
        destinationStoreId: dispatchedTransfer.destinationStoreId,
        driverName: dispatchDetails.driverName,
        vehicleNumber: dispatchDetails.vehicleNumber,
      },
    });

    try {
      await notificationService.createNotification(organizationId, {
        recipientUid: 'all',
        title: 'Stock Transfer In-Transit',
        message: `Transfer ${dispatchedTransfer.transferNumber} has been dispatched from ${dispatchedTransfer.sourceStoreName} to ${dispatchedTransfer.destinationStoreName}.`,
        type: 'inventory',
        severity: 'info',
        entityRef: { collection: 'stockTransfers', id: transferId },
      });
    } catch (e) {
      console.warn('Failed to send dispatch notification:', e);
    }

    return dispatchedTransfer;
  },

  /**
   * Receive Transfer (ATOMIC FIRESTORE TRANSACTION)
   * Creates or increments destination store batch inventory and updates status to RECEIVED
   */
  async receiveTransfer(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    receiptDetails: {
      receivedItemQtyMap?: Record<string, number>; // productId -> receivedQty
      receiptNotes?: string;
      discrepancyNotes?: string;
    } = {}
  ): Promise<StockTransferRequest> {
    const transferDocRef = getStockTransferDocRef(organizationId, transferId);

    await runTransaction(db, async (transaction) => {
      const transferSnap = await transaction.get(transferDocRef);
      if (!transferSnap.exists()) {
        throw new Error('Stock transfer request doc not found.');
      }

      const transferData = transferSnap.data() as StockTransferRequest;
      if (
        transferData.status !== 'DISPATCHED' &&
        transferData.status !== 'IN_TRANSIT' &&
        transferData.status !== 'PARTIALLY_RECEIVED'
      ) {
        throw new Error(`Cannot receive transfer in status ${transferData.status}`);
      }

      const updatedItems: StockTransferItem[] = JSON.parse(JSON.stringify(transferData.items));

      // Build destination batch updates/creations
      for (const item of updatedItems) {
        const customReceivedQty = receiptDetails.receivedItemQtyMap?.[item.productId];
        const qtyToReceive = customReceivedQty !== undefined ? customReceivedQty : (item.dispatchedQty || item.requestedQty);

        item.receivedQty = qtyToReceive;

        if (!item.allocatedBatches || item.allocatedBatches.length === 0) continue;

        let itemRemainingToReceive = qtyToReceive;

        for (const allocBatch of item.allocatedBatches) {
          const allocDispatched = allocBatch.dispatchedQty || allocBatch.allocatedQty;
          const batchReceiveQty = Math.min(allocDispatched, itemRemainingToReceive);
          allocBatch.receivedQty = batchReceiveQty;
          itemRemainingToReceive -= batchReceiveQty;

          if (batchReceiveQty <= 0) continue;

          // Find or prepare destination batch
          const normBatchNum = normalizeBatchNumber(allocBatch.batchNumber);
          const batchesCollRef = collection(db, 'organizations', organizationId, 'batches');
          
          // Note: In transaction, query destination batch by matching key
          // We can construct deterministic ID for destination store batch or search snapshot
          const destBatchId = `batch_dest_${transferData.destinationStoreId}_${item.productId}_${normBatchNum}`;
          const destBatchDocRef = doc(db, 'organizations', organizationId, 'batches', destBatchId);

          const destSnap = await transaction.get(destBatchDocRef);

          if (destSnap.exists()) {
            const destBatchData = destSnap.data() as PharmacyBatch;
            const newQty = destBatchData.quantity + batchReceiveQty;
            const newAvailQty = destBatchData.availableQuantity + batchReceiveQty;
            transaction.update(destBatchDocRef, {
              quantity: newQty,
              availableQuantity: newAvailQty,
              status: 'active',
              updatedByUid: caller.uid,
              updatedAt: serverTimestamp(),
            });
          } else {
            // Read source batch to copy expiryDate and mfg details if available
            const sourceBatchRef = doc(db, 'organizations', organizationId, 'batches', allocBatch.batchId);
            const sourceBatchSnap = await transaction.get(sourceBatchRef);
            const sourceBatchData = sourceBatchSnap.exists() ? (sourceBatchSnap.data() as PharmacyBatch) : null;

            const now = Timestamp.now();
            const expiryTimestamp = sourceBatchData?.expiryDate || Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
            const mfgTimestamp = sourceBatchData?.manufacturingDate || Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

            const newBatchPayload: Record<string, any> = {
              id: destBatchId,
              organizationId,
              storeId: transferData.destinationStoreId,
              productId: item.productId,
              productName: item.productName,
              brand: item.brand || (sourceBatchData as any)?.brand || '',
              batchNumber: allocBatch.batchNumber,
              normalizedBatchNumber: normBatchNum,
              manufacturingDate: mfgTimestamp,
              expiryDate: expiryTimestamp,
              purchasePrice: allocBatch.purchasePrice || item.unitPurchaseCost || 0,
              mrp: allocBatch.mrp || item.unitMrp || 0,
              salePrice: allocBatch.salePrice || item.unitSalePrice || 0,
              quantity: batchReceiveQty,
              reservedQuantity: 0,
              availableQuantity: batchReceiveQty,
              status: 'active',
              createdByUid: caller.uid,
              updatedByUid: caller.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };

            transaction.set(destBatchDocRef, newBatchPayload);
          }
        }
      }

      const totalReceivedQty = updatedItems.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
      const totalDispatchedQty = transferData.totalDispatchedQty || transferData.totalRequestedQty;

      const finalStatus: StockTransferStatus =
        totalReceivedQty >= totalDispatchedQty ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      transaction.update(transferDocRef, {
        items: updatedItems,
        totalReceivedQty,
        status: finalStatus,
        receiptNotes: receiptDetails.receiptNotes || '',
        discrepancyNotes: receiptDetails.discrepancyNotes || '',
        receivedByUid: caller.uid,
        receivedByName: caller.displayName || caller.email || 'Godown Supervisor',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    const receivedTransfer = (await this.getTransferById(organizationId, transferId))!;

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.received',
      entityType: 'stock_transfer',
      entityId: transferId,
      storeId: receivedTransfer.destinationStoreId,
      metadata: {
        transferNumber: receivedTransfer.transferNumber,
        totalReceivedQty: receivedTransfer.totalReceivedQty,
        status: receivedTransfer.status,
      },
    });

    try {
      await notificationService.createNotification(organizationId, {
        recipientUid: 'all',
        title: 'Stock Transfer Received',
        message: `Transfer ${receivedTransfer.transferNumber} received at ${receivedTransfer.destinationStoreName} (${receivedTransfer.totalReceivedQty} units).`,
        type: 'inventory',
        severity: 'success',
        entityRef: { collection: 'stockTransfers', id: transferId },
      });
    } catch (e) {
      console.warn('Failed to send receipt notification:', e);
    }

    return receivedTransfer;
  },

  /**
   * Reject a transfer request
   */
  async rejectTransfer(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    rejectionReason: string
  ): Promise<StockTransferRequest> {
    const transfer = await this.getTransferById(organizationId, transferId);
    if (!transfer) throw new Error('Transfer request not found.');

    if (transfer.status === 'DISPATCHED' || transfer.status === 'RECEIVED') {
      throw new Error(`Cannot reject transfer already in status ${transfer.status}`);
    }

    const docRef = getStockTransferDocRef(organizationId, transferId);
    await updateDoc(docRef, {
      status: 'REJECTED',
      rejectionReason,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.rejected',
      entityType: 'stock_transfer',
      entityId: transferId,
      metadata: { transferNumber: transfer.transferNumber, rejectionReason },
    });

    return (await this.getTransferById(organizationId, transferId))!;
  },

  /**
   * Cancel a transfer request before dispatch
   */
  async cancelTransfer(
    organizationId: string,
    transferId: string,
    caller: { uid: string; email?: string | null; displayName?: string | null },
    cancellationReason: string
  ): Promise<StockTransferRequest> {
    const transfer = await this.getTransferById(organizationId, transferId);
    if (!transfer) throw new Error('Transfer request not found.');

    if (transfer.status === 'DISPATCHED' || transfer.status === 'RECEIVED') {
      throw new Error(`Cannot cancel transfer already in status ${transfer.status}`);
    }

    const docRef = getStockTransferDocRef(organizationId, transferId);
    await updateDoc(docRef, {
      status: 'CANCELLED',
      cancellationReason,
      updatedAt: serverTimestamp(),
    });

    await logAuditEvent(organizationId, {
      actorUid: caller.uid,
      actorEmail: caller.email || null,
      actorDisplayName: caller.displayName || null,
      action: 'stock_transfer.cancelled',
      entityType: 'stock_transfer',
      entityId: transferId,
      metadata: { transferNumber: transfer.transferNumber, cancellationReason },
    });

    return (await this.getTransferById(organizationId, transferId))!;
  },

  /**
   * Smart Algorithmic Multi-Branch Stock Rebalancing Engine
   * Identifies products with stock imbalances across stores and generates recommendations
   */
  async getRebalancingRecommendations(organizationId: string): Promise<RebalanceRecommendation[]> {
    const stores = await storeService.getStores(organizationId);
    if (stores.length < 2) return [];

    const { products } = await getProducts(organizationId, { pageSize: 100 });
    const { batches } = await batchService.getBatches(organizationId, { status: 'active', pageSize: 1000 });

    const recommendations: RebalanceRecommendation[] = [];

    // Map: productId -> storeId -> availableStock
    const stockMap: Record<string, Record<string, number>> = {};

    for (const b of batches) {
      if (!stockMap[b.productId]) stockMap[b.productId] = {};
      stockMap[b.productId][b.storeId] = (stockMap[b.productId][b.storeId] || 0) + b.availableQuantity;
    }

    for (const prod of products) {
      const pStock = stockMap[prod.id] || {};

      // Check pairs of stores for excess vs deficit
      let maxStockStoreId = '';
      let maxStockVal = -1;
      let minStockStoreId = '';
      let minStockVal = Infinity;

      for (const store of stores) {
        const val = pStock[store.id] || 0;
        if (val > maxStockVal) {
          maxStockVal = val;
          maxStockStoreId = store.id;
        }
        if (val < minStockVal) {
          minStockVal = val;
          minStockStoreId = store.id;
        }
      }

      // If one branch has stock >= 30 and another branch has stock <= 5 (imbalance)
      if (maxStockVal >= 25 && minStockVal <= 5 && maxStockStoreId !== minStockStoreId) {
        const sourceStore = stores.find((s) => s.id === maxStockStoreId);
        const destStore = stores.find((s) => s.id === minStockStoreId);

        if (sourceStore && destStore) {
          const suggestedTransferQty = Math.min(Math.floor((maxStockVal - minStockVal) / 2), 50);

          if (suggestedTransferQty > 0) {
            const urgency: 'HIGH' | 'MEDIUM' | 'LOW' = minStockVal === 0 ? 'HIGH' : maxStockVal > 50 ? 'MEDIUM' : 'LOW';

            recommendations.push({
              id: `rec_${prod.id}_${sourceStore.id}_${destStore.id}`,
              productId: prod.id,
              productName: prod.productName,
              sku: prod.sku,
              sourceStoreId: sourceStore.id,
              sourceStoreName: sourceStore.name,
              sourceAvailableStock: maxStockVal,
              destinationStoreId: destStore.id,
              destinationStoreName: destStore.name,
              destinationCurrentStock: minStockVal,
              suggestedTransferQty,
              urgency,
              reason: `${sourceStore.name} has surplus (${maxStockVal} units); ${destStore.name} is ${minStockVal === 0 ? 'Out of Stock' : `Low (${minStockVal} units)`}.`,
            });
          }
        }
      }
    }

    return recommendations;
  },

  /**
   * Calculate summary metrics for Stock Transfers
   */
  async getTransferMetrics(organizationId: string, storeId?: string): Promise<StockTransferMetrics> {
    try {
      const { transfers } = await this.getTransferRequests(organizationId, { storeId, pageSize: 500 });

      const totalTransfersCount = transfers.length;
      const pendingApprovalCount = transfers.filter((t) => t.status === 'PENDING_APPROVAL').length;
      const inTransitCount = transfers.filter((t) => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT').length;
      const completedCount = transfers.filter((t) => t.status === 'RECEIVED').length;
      const discrepancyCount = transfers.filter((t) => t.status === 'PARTIALLY_RECEIVED').length;
      
      const totalValueInTransit = transfers
        .filter((t) => t.status === 'DISPATCHED' || t.status === 'IN_TRANSIT')
        .reduce((sum, t) => sum + (t.totalTransferValue || 0), 0);

      let rebalanceAlertsCount = 0;
      try {
        const rebalanceAlerts = await this.getRebalancingRecommendations(organizationId);
        rebalanceAlertsCount = rebalanceAlerts.length;
      } catch (e) {
        console.warn('Could not fetch rebalance recommendations for metrics:', e);
      }

      return {
        totalTransfersCount,
        pendingApprovalCount,
        inTransitCount,
        completedCount,
        discrepancyCount,
        rebalanceAlertsCount,
        totalValueInTransit: Number(totalValueInTransit.toFixed(2)),
      };
    } catch (error) {
      if ((error as any)?.code === 'permission-denied' || String(error).includes('permissions')) {
        handleFirestoreError(error, OperationType.LIST, `organizations/${organizationId}/stockTransfers`);
      }
      throw error;
    }
  },
};
