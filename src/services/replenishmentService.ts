import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp, 
  orderBy, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase/config';
import { 
  ReorderRule, 
  ReorderRecommendation, 
  ReplenishmentRun, 
  ReplenishmentSettings,
  SupplierPerformanceProfile
} from '../types/replenishment';
import { getProducts } from './productService';
import { batchService } from './batchService';
import { supplierService } from './supplierService';
import { purchaseService } from './purchaseService';
import { logAuditEvent } from './auditService';
import { notificationService } from './notificationService';
import { transferService } from './transferService';

const getRulesRef = (orgId: string) => collection(db, 'organizations', orgId, 'reorderRules');
const getRecommendationsRef = (orgId: string) => collection(db, 'organizations', orgId, 'reorderRecommendations');
const getRunsRef = (orgId: string) => collection(db, 'organizations', orgId, 'replenishmentRuns');
const getSettingsRef = (orgId: string) => doc(db, 'organizations', orgId, 'replenishmentSettings', 'default');
const getSupplierPerformanceRef = (orgId: string) => collection(db, 'organizations', orgId, 'supplierPerformance');

export const replenishmentService = {
  // Settings
  async getSettings(orgId: string): Promise<ReplenishmentSettings | null> {
    const docSnap = await getDoc(getSettingsRef(orgId));
    return docSnap.exists() ? (docSnap.data() as ReplenishmentSettings) : null;
  },

  async updateSettings(orgId: string, payload: Partial<ReplenishmentSettings>, uid: string) {
    const ref = getSettingsRef(orgId);
    await setDoc(ref, {
      ...payload,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedByUid: uid
    }, { merge: true });
    
    await logAuditEvent(orgId, {
      actorUid: uid,
      action: 'replenishment.settings.updated',
      entityType: 'replenishment_setting',
      entityId: 'replenishmentSettings',
      metadata: { details: 'Replenishment settings updated' }
    });
  },

  // Rules
  async getRules(orgId: string, storeId?: string): Promise<ReorderRule[]> {
    const q = storeId 
      ? query(getRulesRef(orgId), where('storeId', '==', storeId))
      : getRulesRef(orgId);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReorderRule));
  },

  async saveRule(orgId: string, payload: Omit<ReorderRule, 'id' | 'createdAt' | 'updatedAt'>, uid: string): Promise<ReorderRule> {
    const ruleRef = doc(getRulesRef(orgId), `${payload.storeId}_${payload.productId}`);
    const now = serverTimestamp();
    const data = {
      ...payload,
      id: ruleRef.id,
      organizationId: orgId,
      updatedAt: now,
    };
    
    const existing = await getDoc(ruleRef);
    if (!existing.exists()) {
      (data as any).createdAt = now;
    }
    
    await setDoc(ruleRef, data, { merge: true });
    
    await logAuditEvent(orgId, {
      actorUid: uid,
      action: existing.exists() ? 'reorder.rule.updated' : 'reorder.rule.created',
      entityType: 'reorder_rule',
      entityId: ruleRef.id,
      metadata: { details: `Reorder rule for product ${payload.productId} updated` }
    });
    
    return { ...data, createdAt: existing.data()?.createdAt || Timestamp.now() } as any as ReorderRule;
  },

  // Recommendations
  async getRecommendations(orgId: string, storeId?: string): Promise<ReorderRecommendation[]> {
    const constraints = [];
    if (storeId) constraints.push(where('storeId', '==', storeId));
    constraints.push(where('status', 'in', ['NEW', 'REVIEWED', 'APPROVED']));
    
    const q = query(getRecommendationsRef(orgId), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReorderRecommendation));
  },
  
  async updateRecommendationStatus(orgId: string, recId: string, status: ReorderRecommendation['status'], uid: string) {
    const ref = doc(getRecommendationsRef(orgId), recId);
    await updateDoc(ref, {
      status,
      updatedAt: serverTimestamp()
    });
    
    await logAuditEvent(orgId, {
      actorUid: uid,
      action: `reorder.recommendation.${status.toLowerCase()}` as any,
      entityType: 'reorder_recommendation',
      entityId: recId,
      metadata: { details: `Status changed to ${status}` }
    });
  },

  // The Core Engine
  async runAnalysis(orgId: string, storeId: string, uid: string) {
    const runRef = doc(getRunsRef(orgId));
    await setDoc(runRef, {
      id: runRef.id,
      organizationId: orgId,
      storeId,
      triggeredByUid: uid,
      startedAt: serverTimestamp(),
      status: 'RUNNING',
      productsAnalyzed: 0,
      recommendationsCreated: 0,
      recommendationsUpdated: 0,
      criticalAlerts: 0,
      errors: []
    });

    try {
      // 1. Load active products
      const prodsRes = await getProducts(orgId, { status: 'active', pageSize: 1000 });
      const products = prodsRes.products;

      // 2. Load rules
      const rules = await this.getRules(orgId, storeId);
      const ruleMap = new Map<string, ReorderRule>(rules.map(r => [r.productId, r]));

      // 3. Load active suppliers
      const suppliers = await supplierService.getSuppliers(orgId, 'active');
      const supplierMap = new Map(suppliers.map(s => [s.id, s]));

      // 4. Load Open POs for calculating inbound stock
      const openPOs = await purchaseService.getPurchaseOrders(orgId, storeId);
      const pendingPOs = openPOs.filter(po => ['draft', 'pending_approval', 'approved', 'partially_fulfilled'].includes(po.status));

      // 5. Load in-transit transfers
      const transfers = await transferService.getTransferRequests(orgId);
      const inboundTransfers = transfers.transfers.filter(t => t.destinationStoreId === storeId && ['PENDING_APPROVAL', 'APPROVED', 'ALLOCATED', 'DISPATCHED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(t.status));

      let recsCreated = 0;
      let recsUpdated = 0;
      let criticals = 0;

      for (const prod of products) {
        // Calculate Effective Stock
        const saleableBatches = await batchService.getSaleableBatchesForProduct(orgId, prod.id, storeId);
        const currentStock = saleableBatches.reduce((acc, b) => acc + b.availableQuantity, 0);
        const reservedStock = saleableBatches.reduce((acc, b) => acc + b.reservedQuantity, 0);
        
        let inboundStock = 0;
        pendingPOs.forEach(po => {
          po.items.forEach(item => {
            if (item.productId === prod.id) {
              inboundStock += (item.orderedQuantity - item.receivedQuantity);
            }
          });
        });

        let inTransitStock = 0;
        inboundTransfers.forEach(t => {
          t.items.forEach(item => {
            if (item.productId === prod.id) {
              inTransitStock += (item.dispatchedQty || item.allocatedQty || item.requestedQty || 0);
            }
          });
        });

        const effectiveAvailableStock = currentStock - reservedStock + inboundStock + inTransitStock;

        // Calculate Demand (Simplified heuristic for this phase without full invoice parsing)
        const avgDailyDemand = 0.5; // Stub for demo; real implementation would query invoices
        
        // Find Rule
        let rule: ReorderRule | undefined = ruleMap.get(prod.id);
        if (!rule) {
          // Default rule if none exists
          rule = {
            id: `default_${prod.id}`,
            organizationId: orgId,
            storeId,
            productId: prod.id,
            strategy: 'MIN_MAX',
            minimumStock: 10,
            maximumStock: 50,
            reorderPoint: 15,
            safetyStock: 5,
            reorderQuantity: 40,
            minimumOrderQuantity: 1,
            maximumOrderQuantity: 1000,
            orderMultiple: 1,
            leadTimeDays: 3,
            reviewPeriodDays: 7,
            targetServiceLevel: 95,
            enabled: true,
            priority: 1,
            autoCreatePO: false,
            autoApprovalAllowed: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          } as any as ReorderRule;
        }

        if (!rule.enabled) continue;

        // Check against reorder point
        if (effectiveAvailableStock <= rule.reorderPoint) {
          const shortage = rule.maximumStock - effectiveAvailableStock;
          let recommendedQty = Math.max(shortage, rule.reorderQuantity, rule.minimumOrderQuantity);
          // Apply multiple
          if (rule.orderMultiple > 1) {
            recommendedQty = Math.ceil(recommendedQty / rule.orderMultiple) * rule.orderMultiple;
          }

          let preferredSupplier = rule.preferredSupplierId ? supplierMap.get(rule.preferredSupplierId) : null;
          if (!preferredSupplier && suppliers.length > 0) {
            preferredSupplier = suppliers[0]; // fallback
          }

          const recId = `${storeId}_${prod.id}`;
          const recRef = doc(getRecommendationsRef(orgId), recId);
          
          const urgency = effectiveAvailableStock <= 0 ? 'CRITICAL' 
            : effectiveAvailableStock <= rule.safetyStock ? 'HIGH' 
            : 'MEDIUM';

          if (urgency === 'CRITICAL') criticals++;

          const existingRec = await getDoc(recRef);
          
          if (!existingRec.exists() || !['PO_CREATED', 'EXPIRED'].includes(existingRec.data()?.status)) {
            // Create or update
            const recData: any = {
              id: recId,
              organizationId: orgId,
              storeId,
              productId: prod.id,
              productName: prod.productName,
              brand: prod.brand,
              sku: prod.sku,
              runId: runRef.id,
              currentStock,
              reservedStock,
              inboundStock,
              inTransitStock,
              effectiveAvailableStock,
              averageDailyDemand: avgDailyDemand,
              leadTimeDemand: avgDailyDemand * rule.leadTimeDays,
              daysOfStockRemaining: avgDailyDemand > 0 ? Math.round(effectiveAvailableStock / avgDailyDemand) : 999,
              reorderPoint: rule.reorderPoint,
              safetyStock: rule.safetyStock,
              recommendedQuantity: recommendedQty,
              preferredSupplierId: preferredSupplier?.id || null,
              preferredSupplierName: preferredSupplier?.name || null,
              supplierLeadTimeDays: rule.leadTimeDays,
              estimatedCost: recommendedQty * (prod.defaultPurchaseCost || 0),
              forecastConfidence: 'LOW',
              urgency,
              status: existingRec.exists() ? existingRec.data()?.status : 'NEW',
              explanation: `Current saleable stock: ${effectiveAvailableStock}\nReorder Point: ${rule.reorderPoint}\nRecommended Target: ${rule.maximumStock}`,
              updatedAt: serverTimestamp()
            };

            if (!existingRec.exists()) {
              recData.createdAt = serverTimestamp();
              recsCreated++;
            } else {
              recsUpdated++;
            }

            await setDoc(recRef, recData, { merge: true });
          }
        }
      }

      await updateDoc(runRef, {
        status: 'COMPLETED',
        completedAt: serverTimestamp(),
        productsAnalyzed: products.length,
        recommendationsCreated: recsCreated,
        recommendationsUpdated: recsUpdated,
        criticalAlerts: criticals
      });

      // Notification
      if (recsCreated > 0 || criticals > 0) {
        await notificationService.createNotification(orgId, {
          recipientUid: 'all',
          type: 'inventory_alert',
          title: 'Replenishment Analysis Complete',
          message: `Generated ${recsCreated} new recommendations. ${criticals} critical stockouts detected.`,
          severity: criticals > 0 ? 'error' : 'warning',
          targetModule: 'replenishment',
          actionUrl: '/replenishment'
        });
      }

    } catch (err: any) {
      console.error('Replenishment analysis failed:', err);
      await updateDoc(runRef, {
        status: 'FAILED',
        completedAt: serverTimestamp(),
        errors: [err.message]
      });
      throw err;
    }
  },

  async createPOFromRecommendations(
    orgId: string, 
    storeId: string, 
    recIds: string[], 
    supplierId: string, 
    caller: { uid: string, email?: string | null, displayName?: string | null }
  ) {
    const result = await runTransaction(db, async (transaction) => {
      // 1. Read all recommendations
      const recs = [];
      for (const id of recIds) {
        const ref = doc(getRecommendationsRef(orgId), id);
        const snap = await transaction.get(ref);
        if (snap.exists() && snap.data().status !== 'PO_CREATED') {
          recs.push(snap.data() as ReorderRecommendation);
        }
      }

      if (recs.length === 0) {
        throw new Error('No valid recommendations found for PO creation.');
      }

      // 2. Fetch Supplier
      const supplierSnap = await transaction.get(doc(db, 'organizations', orgId, 'suppliers', supplierId));
      if (!supplierSnap.exists()) throw new Error('Supplier not found.');
      const supplierName = supplierSnap.data().name;

      return { recs, supplierName };
    });

    const { recs, supplierName } = result;

    // Fetch fresh product info for cost/tax
    const items = await Promise.all(recs.map(async (rec) => {
      const prodRes = await getProducts(orgId, { searchQuery: rec.productName, pageSize: 1 });
      const prod = prodRes.products.find(p => p.id === rec.productId);
      
      const unitCost = prod?.defaultPurchaseCost || 0;
      const gstRate = prod?.gstRate || 0;
      const orderedQuantity = rec.recommendedQuantity;
      
      const taxableAmount = unitCost * orderedQuantity;
      const taxAmount = (taxableAmount * gstRate) / 100;
      const totalAmount = taxableAmount + taxAmount;

      return {
        productId: rec.productId,
        productName: rec.productName,
        brand: rec.brand,
        sku: rec.sku,
        hsnCode: prod?.hsnCode,
        orderedQuantity,
        unitCost,
        gstRate,
        taxableAmount,
        taxAmount,
        totalAmount
      };
    }));

    // Create PO
    const po = await purchaseService.createPurchaseOrder(orgId, caller, {
      storeId,
      supplierId,
      supplierName,
      items
    });

    // Mark recommendations as PO_CREATED
    for (const rec of recs) {
      const ref = doc(getRecommendationsRef(orgId), rec.id);
      await updateDoc(ref, {
        status: 'PO_CREATED',
        linkedPurchaseOrderId: po.id,
        updatedAt: serverTimestamp()
      });
    }

    await logAuditEvent(orgId, {
      actorUid: caller.uid,
      action: 'reorder.po.created' as any,
      entityType: 'purchase_order',
      entityId: po.id,
      metadata: { details: `Generated PO for ${recs.length} recommendations.` }
    });

    return po;
  }
};
