import { CustomerAddress, OnlineOrder, DeliveryPartner, DeliveryRun } from '../types/ecommerce';

export function validateCustomerAddress(address: Partial<CustomerAddress>): boolean {
  if (!address.fullName || address.fullName.trim().length === 0) return false;
  if (!address.phone || address.phone.trim().length < 10) return false;
  if (!address.houseNo || address.houseNo.trim().length === 0) return false;
  if (!address.street || address.street.trim().length === 0) return false;
  if (!address.city || address.city.trim().length === 0) return false;
  if (!address.state || address.state.trim().length === 0) return false;
  if (!address.postalCode || !/^\d{6}$/.test(address.postalCode.trim())) return false;
  return true;
}

export function validateOnlineOrder(order: Partial<OnlineOrder>): boolean {
  if (!order.organizationId || !order.storeId || !order.customerName) return false;
  if (!order.items || order.items.length === 0) return false;
  if (typeof order.grandTotal !== 'number' || order.grandTotal < 0) return false;
  return true;
}

export function validateDeliveryPartner(partner: Partial<DeliveryPartner>): boolean {
  if (!partner.name || partner.name.trim().length === 0) return false;
  if (!partner.phone || partner.phone.trim().length < 10) return false;
  if (!partner.employeeId || partner.employeeId.trim().length === 0) return false;
  return true;
}

export function validateDeliveryRun(run: Partial<DeliveryRun>): boolean {
  if (!run.storeId || !run.deliveryPartnerId || !run.orderIds || run.orderIds.length === 0) return false;
  return true;
}
