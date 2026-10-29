import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { SearchResult, NavModuleId } from '../types';

export const globalSearchService = {
  /**
   * Run a global tenant-isolated search across all core transactional and reference domains in Vetrify.
   */
  async searchAll(
    orgId: string,
    storeId: string | null,
    queryText: string,
    categoryFilter: 'all' | 'products' | 'batches' | 'customers' | 'invoices' | 'tasks' | 'audit' = 'all'
  ): Promise<SearchResult[]> {
    if (!orgId || !queryText || queryText.trim().length < 2) return [];

    const db = getFirestoreDb();
    const term = queryText.trim().toLowerCase();
    const uppercaseTerm = queryText.trim().toUpperCase();

    const results: SearchResult[] = [];

    // Parallel search routines for each core domain to respect Firestore boundaries.
    const searchTasks: Promise<void>[] = [];

    // --- 1. Products (Tiles, Sanitaryware, Faucets & SKUs) ---
    if (categoryFilter === 'all' || categoryFilter === 'products') {
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'products');
            // Fetch products - typical size is small to medium; we can filter client-side for maximum flexibility
            const snap = await getDocs(query(collRef, limit(100)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const name = (data.name || '').toLowerCase();
              const sku = (data.sku || '').toLowerCase();
              const barcode = (data.barcode || '').toLowerCase();
              const comp = (data.genericComposition || '').toLowerCase();

              if (
                name.includes(term) ||
                sku.includes(term) ||
                barcode.includes(term) ||
                comp.includes(term)
              ) {
                results.push({
                  entityType: 'Product',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: null,
                  title: data.name || 'Unnamed Product',
                  subtitle: `SKU: ${data.sku || 'N/A'} • Salt: ${data.genericComposition || 'N/A'} • MRP: ₹${data.mrp || 0}`,
                  status: data.status || 'Active',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'inventory',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Product search failed:', err);
          }
        })()
      );
    }

    // --- 2. Batches & FEFO ---
    if (categoryFilter === 'all' || categoryFilter === 'batches') {
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'batches');
            const snap = await getDocs(query(collRef, limit(100)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const batchNum = (data.batchNumber || '').toLowerCase();
              const prodName = (data.productName || '').toLowerCase();

              if (batchNum.includes(term) || prodName.includes(term)) {
                results.push({
                  entityType: 'Batch',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: `Batch #${data.batchNumber || 'N/A'}`,
                  subtitle: `Product: ${data.productName || 'N/A'} • Exp: ${data.expiryDate || 'N/A'} • Qty: ${data.currentQuantity || 0}`,
                  status: data.status || 'Active',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'inventory',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Batch search failed:', err);
          }
        })()
      );
    }

    // --- 3. Customers (Khata, Loyalty, Retail) ---
    if (categoryFilter === 'all' || categoryFilter === 'customers') {
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'customers');
            const snap = await getDocs(query(collRef, limit(100)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const name = (data.name || '').toLowerCase();
              const mobile = (data.mobile || '').toLowerCase();

              if (name.includes(term) || mobile.includes(term)) {
                results.push({
                  entityType: 'Customer',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: null,
                  title: data.name || 'Unnamed Customer',
                  subtitle: `Mobile: ${data.mobile || 'N/A'} • Loyalty Points: ${data.loyaltyPoints || 0} • Khata Balance: ₹${data.outstandingBalance || 0}`,
                  status: 'Active',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'customers',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Customer search failed:', err);
          }
        })()
      );
    }

    // --- 4. Invoices, Purchases, GRNs ---
    if (categoryFilter === 'all' || categoryFilter === 'invoices') {
      // Invoices
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'invoices');
            const snap = await getDocs(query(collRef, limit(50)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const invoiceNum = (data.invoiceNumber || '').toLowerCase();
              const custName = (data.customerName || '').toLowerCase();

              if (invoiceNum.includes(term) || custName.includes(term)) {
                results.push({
                  entityType: 'Invoice',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: `Invoice #${data.invoiceNumber || 'N/A'}`,
                  subtitle: `Customer: ${data.customerName || 'Walk-In'} • Total: ₹${data.totalAmount || 0} • Mode: ${data.paymentMode || 'N/A'}`,
                  status: data.status || 'Paid',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'pos',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Invoice search failed:', err);
          }
        })()
      );

      // Purchase Orders
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'purchaseOrders');
            const snap = await getDocs(query(collRef, limit(50)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const poNum = (data.poNumber || '').toLowerCase();
              const supName = (data.supplierName || '').toLowerCase();

              if (poNum.includes(term) || supName.includes(term)) {
                results.push({
                  entityType: 'Purchase Order',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: `PO #${data.poNumber || 'N/A'}`,
                  subtitle: `Supplier: ${data.supplierName || 'N/A'} • Total Value: ₹${data.totalAmount || 0}`,
                  status: data.status || 'Draft',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'purchases',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Purchase Order search failed:', err);
          }
        })()
      );

      // Goods Receipt Notes (GRN)
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'grns');
            const snap = await getDocs(query(collRef, limit(50)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const grnNum = (data.grnNumber || '').toLowerCase();
              const supName = (data.supplierName || '').toLowerCase();

              if (grnNum.includes(term) || supName.includes(term)) {
                results.push({
                  entityType: 'GRN',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: `GRN #${data.grnNumber || 'N/A'}`,
                  subtitle: `Supplier: ${data.supplierName || 'N/A'} • Invoice: ${data.invoiceNumber || 'N/A'} • Items: ${(data.items || []).length}`,
                  status: data.status || 'Completed',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'purchases',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('GRN search failed:', err);
          }
        })()
      );
    }

    // --- 5. Tasks (Task Engine) ---
    if (categoryFilter === 'all' || categoryFilter === 'tasks') {
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'tasks');
            const snap = await getDocs(query(collRef, limit(50)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const title = (data.title || '').toLowerCase();
              const desc = (data.description || '').toLowerCase();
              const type = (data.taskType || '').toLowerCase();

              if (title.includes(term) || desc.includes(term) || type.includes(term)) {
                results.push({
                  entityType: 'Task',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: data.title || 'Untitled Task',
                  subtitle: `Type: ${data.taskType} • Priority: ${data.priority} • Assignee: ${data.assignedToName || 'Unassigned'}`,
                  status: data.status || 'OPEN',
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  route: 'tasks',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Task search failed:', err);
          }
        })()
      );
    }

    // --- 6. Audit Logs ---
    if (categoryFilter === 'all' || categoryFilter === 'audit') {
      searchTasks.push(
        (async () => {
          try {
            const collRef = collection(db, 'organizations', orgId, 'auditLogs');
            const snap = await getDocs(query(collRef, limit(50)));
            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const action = (data.action || '').toLowerCase();
              const actor = (data.actorDisplayName || data.actorName || '').toLowerCase();
              const entityT = (data.entityType || '').toLowerCase();

              if (action.includes(term) || actor.includes(term) || entityT.includes(term)) {
                results.push({
                  entityType: 'Audit Log',
                  entityId: docSnap.id,
                  organizationId: orgId,
                  storeId: data.storeId || null,
                  title: `Audit: ${data.action} on ${data.entityType}`,
                  subtitle: `Actor: ${data.actorDisplayName || data.actorName || 'Staff'} • Severity: ${data.severity || 'INFO'} • Module: ${data.module || 'System'}`,
                  status: 'Immutable',
                  createdAt: data.createdAt || data.timestamp,
                  updatedAt: data.createdAt || data.timestamp,
                  route: 'audit_centre',
                  metadata: { ...data },
                });
              }
            });
          } catch (err) {
            console.warn('Audit search failed:', err);
          }
        })()
      );
    }

    // Resolve all searches in parallel
    await Promise.all(searchTasks);

    // Filter by store context if authorized
    return results.filter((res) => {
      if (storeId && res.storeId && res.storeId !== storeId) return false;
      return true;
    });
  },
};
