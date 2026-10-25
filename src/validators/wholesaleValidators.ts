import {
  WholesalePriceRule,
  WholesaleQuotation,
  WholesaleOrder,
  WholesaleInvoice,
  DeliveryChallan,
} from '../types/wholesale';
import { Customer } from '../types/firestore';

export function validateB2BCustomer(customer: unknown, expectedOrgId: string): boolean {
  if (!customer || typeof customer !== 'object') return false;
  const c = customer as Partial<Customer>;
  if (c.organizationId !== expectedOrgId) return false;
  if (!c.id || typeof c.id !== 'string') return false;
  if (!c.name || typeof c.name !== 'string') return false;
  if (!c.phone || typeof c.phone !== 'string') return false;
  return true;
}

export function validateWholesalePriceRule(rule: unknown, expectedOrgId: string): boolean {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Partial<WholesalePriceRule>;
  if (r.organizationId !== expectedOrgId) return false;
  if (!r.id || !r.ruleName || !r.productId || !r.productName) return false;
  if (typeof r.wholesalePrice !== 'number' || r.wholesalePrice < 0) return false;
  if (typeof r.minQuantity !== 'number' || r.minQuantity < 1) return false;
  return true;
}

export function validateWholesaleQuotation(quote: unknown, expectedOrgId: string): boolean {
  if (!quote || typeof quote !== 'object') return false;
  const q = quote as Partial<WholesaleQuotation>;
  if (q.organizationId !== expectedOrgId) return false;
  if (!q.id || !q.quotationNumber || !q.customerId || !q.customerName) return false;
  if (!Array.isArray(q.items) || q.items.length === 0) return false;
  if (typeof q.grandTotal !== 'number' || q.grandTotal < 0) return false;
  return true;
}

export function validateWholesaleOrder(order: unknown, expectedOrgId: string): boolean {
  if (!order || typeof order !== 'object') return false;
  const o = order as Partial<WholesaleOrder>;
  if (o.organizationId !== expectedOrgId) return false;
  if (!o.id || !o.orderNumber || !o.customerId || !o.customerName || !o.storeId) return false;
  if (!Array.isArray(o.items) || o.items.length === 0) return false;
  if (typeof o.grandTotal !== 'number' || o.grandTotal < 0) return false;
  return true;
}

export function validateWholesaleInvoice(inv: unknown, expectedOrgId: string): boolean {
  if (!inv || typeof inv !== 'object') return false;
  const i = inv as Partial<WholesaleInvoice>;
  if (i.organizationId !== expectedOrgId) return false;
  if (!i.id || !i.invoiceNumber || !i.orderId || !i.customerId || !i.storeId) return false;
  if (!Array.isArray(i.items) || i.items.length === 0) return false;
  if (typeof i.grandTotal !== 'number' || i.grandTotal < 0) return false;
  return true;
}

export function validateDeliveryChallan(challan: unknown, expectedOrgId: string): boolean {
  if (!challan || typeof challan !== 'object') return false;
  const dc = challan as Partial<DeliveryChallan>;
  if (dc.organizationId !== expectedOrgId) return false;
  if (!dc.id || !dc.challanNumber || !dc.orderId || !dc.customerId || !dc.storeId) return false;
  if (!Array.isArray(dc.items) || dc.items.length === 0) return false;
  return true;
}
