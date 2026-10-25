import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  ShoppingBag,
  Truck,
  DollarSign,
  Tag,
  Users,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useWorkspace } from '../context/WorkspaceContext';
import { wholesaleService } from '../services/wholesaleService';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import {
  WholesaleMetrics,
  WholesaleOrder,
  WholesaleQuotation,
  WholesaleInvoice,
  DeliveryChallan,
  WholesalePriceRule,
} from '../types/wholesale';
import { Customer, Product } from '../types';

import { WholesaleOverview } from '../components/wholesale/WholesaleOverview';
import { WholesaleCustomers } from '../components/wholesale/WholesaleCustomers';
import { WholesaleQuotations } from '../components/wholesale/WholesaleQuotations';
import { WholesaleOrders } from '../components/wholesale/WholesaleOrders';
import { WholesaleFulfillmentModal } from '../components/wholesale/WholesaleFulfillmentModal';
import { WholesaleInvoices } from '../components/wholesale/WholesaleInvoices';
import { DeliveryChallans } from '../components/wholesale/DeliveryChallans';
import { WholesaleReceivables } from '../components/wholesale/WholesaleReceivables';
import { WholesalePricing } from '../components/wholesale/WholesalePricing';
import { PrintableWholesaleDocModal } from '../components/wholesale/PrintableWholesaleDocModal';

export const WholesaleView: React.FC = () => {
  const { user } = useAuth();
  const { organization, currentStore, currentStaff } = useWorkspace();

  const orgId = organization?.id || 'demo-org';
  const storeId = currentStore?.id || 'main-store';
  const caller = {
    uid: user?.uid || 'usr_staff',
    email: user?.email,
    displayName: user?.displayName,
  };

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [loading, setLoading] = useState(true);

  // Firestore state
  const [metrics, setMetrics] = useState<WholesaleMetrics | null>(null);
  const [orders, setOrders] = useState<WholesaleOrder[]>([]);
  const [quotations, setQuotations] = useState<WholesaleQuotation[]>([]);
  const [invoices, setInvoices] = useState<WholesaleInvoice[]>([]);
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [priceRules, setPriceRules] = useState<WholesalePriceRule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Modals state
  const [isOpenCustomerModal, setIsOpenCustomerModal] = useState(false);
  const [isOpenQuoteModal, setIsOpenQuoteModal] = useState(false);
  const [isOpenOrderWizard, setIsOpenOrderWizard] = useState(false);
  const [isOpenChallanModal, setIsOpenChallanModal] = useState(false);
  const [isOpenPaymentModal, setIsOpenPaymentModal] = useState(false);
  const [selectedOrderForFulfillment, setSelectedOrderForFulfillment] = useState<WholesaleOrder | null>(null);
  const [selectedOrderForChallan, setSelectedOrderForChallan] = useState<WholesaleOrder | null>(null);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<WholesaleInvoice | null>(null);

  // Printable document modal
  const [printableDocType, setPrintableDocType] = useState<'quotation' | 'invoice' | 'challan' | null>(null);
  const [printableDocData, setPrintableDocData] = useState<any>(null);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, ords, quotes, invs, dcs, rules, custs, prods] = await Promise.all([
        wholesaleService.getWholesaleMetrics(orgId, storeId),
        wholesaleService.getWholesaleOrders(orgId, { storeId }),
        wholesaleService.getQuotations(orgId, storeId),
        wholesaleService.getWholesaleInvoices(orgId, storeId),
        wholesaleService.getDeliveryChallans(orgId, storeId),
        wholesaleService.getPriceRules(orgId),
        customerService.getCustomers(orgId, { limitCount: 200 }),
        productService.getProducts(orgId, { pageSize: 300 }),
      ]);

      setMetrics(m);
      setOrders(Array.isArray(ords) ? ords : []);
      setQuotations(Array.isArray(quotes) ? quotes : []);
      setInvoices(Array.isArray(invs) ? invs : []);
      setChallans(Array.isArray(dcs) ? dcs : []);
      setPriceRules(Array.isArray(rules) ? rules : []);
      setCustomers(Array.isArray(custs) ? custs : []);
      setProducts(Array.isArray(prods) ? prods : (prods?.products || []));
    } catch (err) {
      console.error('Failed loading wholesale dataset:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [orgId, storeId]);

  // Handlers
  const handleAddB2BCustomer = async (payload: any) => {
    await wholesaleService.createB2BCustomer(orgId, caller, payload);
    await loadAllData();
  };

  const handleUpdateCustomer = async (id: string, updates: any) => {
    await customerService.updateCustomer(orgId, caller, id, updates);
    await loadAllData();
  };

  const handleCreateQuotation = async (payload: any) => {
    const q = await wholesaleService.createQuotation(orgId, storeId, caller, payload);
    await loadAllData();
    return q;
  };

  const handleConvertToOrder = async (quotationId: string) => {
    const quote = quotations.find((q) => q.id === quotationId);
    if (!quote) return;

    const buildItems = () =>
      quote.items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        brand: i.brand,
        strength: i.strength,
        dosageForm: i.dosageForm,
        manufacturer: i.manufacturer,
        sku: i.sku,
        hsnCode: i.hsnCode,
        orderedQty: i.requestedQty,
        reservedQty: 0,
        fulfilledQty: 0,
        unitPrice: i.wholesalePrice,
        wholesalePrice: i.wholesalePrice,
        discountPercent: i.discountPercent,
        discountAmount: i.discountAmount,
        taxableAmount: i.taxableAmount,
        gstRate: i.gstRate,
        cgstAmount: i.cgstAmount,
        sgstAmount: i.sgstAmount,
        totalTaxAmount: i.totalTaxAmount,
        totalAmount: i.totalAmount,
      }));

    try {
      const newOrder = await wholesaleService.createWholesaleOrder(orgId, storeId, caller, {
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerGstin: quote.customerGstin,
        quotationId: quote.id,
        items: buildItems(),
        paymentTerms: 'NET_30',
      });

      await loadAllData();
      alert(`Quotation ${quote.quotationNumber} successfully converted to Order ${newOrder.orderNumber}!`);
    } catch (err: any) {
      if (err.message && err.message.includes('Credit Limit Exceeded')) {
        const confirmOverride = window.confirm(
          `${err.message}\n\nDo you want to apply a Manager Credit Override to approve and convert this quotation to an order?`
        );
        if (confirmOverride) {
          try {
            const newOrder = await wholesaleService.createWholesaleOrder(orgId, storeId, caller, {
              customerId: quote.customerId,
              customerName: quote.customerName,
              customerGstin: quote.customerGstin,
              quotationId: quote.id,
              creditOverrideUsed: true,
              overrideReason: 'Manager approved quotation conversion exceeding credit limit',
              items: buildItems(),
              paymentTerms: 'NET_30',
            });

            await loadAllData();
            alert(`Quotation ${quote.quotationNumber} converted to Order ${newOrder.orderNumber} with Manager Credit Override!`);
          } catch (overrideErr: any) {
            alert(overrideErr.message || 'Failed to convert quotation.');
          }
        }
      } else {
        alert(err.message || 'Failed to convert quotation to order.');
      }
    }
  };

  const handleCreateOrder = async (payload: any) => {
    const ord = await wholesaleService.createWholesaleOrder(orgId, storeId, caller, payload);
    await loadAllData();
    return ord;
  };

  const handleReserveStock = async (orderId: string) => {
    try {
      await wholesaleService.reserveWholesaleOrderStock(orgId, storeId, caller, orderId);
      await loadAllData();
      alert('Stock successfully reserved in FEFO sequence!');
    } catch (err: any) {
      alert(err.message || 'Stock reservation failed.');
    }
  };

  const handleFulfillStock = async (orderId: string, items: { productId: string; fulfillQty: number }[]) => {
    await wholesaleService.fulfillWholesaleOrder(orgId, storeId, caller, {
      orderId,
      fulfillmentItems: items,
    });
    await loadAllData();
  };

  const handleCreateInvoice = async (orderId: string) => {
    try {
      const inv = await wholesaleService.createWholesaleInvoice(orgId, storeId, caller, {
        orderId,
        paymentMode: 'credit',
      });
      await loadAllData();
      alert(`Wholesale Invoice ${inv.invoiceNumber} generated!`);
    } catch (err: any) {
      alert(err.message || 'Invoice creation failed.');
    }
  };

  const handleCreateChallan = async (payload: any) => {
    const dc = await wholesaleService.createDeliveryChallan(orgId, storeId, caller, payload);
    await loadAllData();
    return dc;
  };

  const handleRecordPayment = async (customerId: string, payload: any) => {
    await customerService.recordPayment(orgId, caller, customerId, {
      amount: payload.amount,
      paymentMethod: payload.paymentMode as any,
      referenceNumber: payload.referenceNumber,
      notes: payload.notes,
      storeId,
    });
    await loadAllData();
  };

  const handleCreatePriceRule = async (payload: any) => {
    const rule = await wholesaleService.createPriceRule(orgId, caller, payload);
    await loadAllData();
    return rule;
  };

  const handlePrintDoc = (type: 'quotation' | 'invoice' | 'challan', docData: any) => {
    setPrintableDocType(type);
    setPrintableDocData(docData);
  };

  return (
    <div className="min-h-screen bg-slate-100/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation Sub-header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-400" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'customers'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-blue-400" />
            B2B Accounts ({customers.length})
          </button>

          <button
            onClick={() => setActiveTab('quotations')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'quotations'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-400" />
            Quotations ({quotations.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Orders Hub ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'invoices'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            GST Invoices ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('challans')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'challans'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4 text-cyan-400" />
            Challans ({challans.length})
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'receivables'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Receivables (Khata)
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Tag className="w-4 h-4 text-rose-400" />
            Pricing Rules ({priceRules.length})
          </button>
        </div>

        <button
          onClick={loadAllData}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors self-end md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Content Area based on Tab */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-xs font-bold text-slate-600">Loading Wholesale B2B Dataset...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <WholesaleOverview
              metrics={metrics}
              recentOrders={orders}
              onNavigateTab={(t) => setActiveTab(t)}
              onOpenOrderWizard={() => setIsOpenOrderWizard(true)}
              onOpenCustomerModal={() => setIsOpenCustomerModal(true)}
              onOpenQuoteModal={() => setIsOpenQuoteModal(true)}
            />
          )}

          {activeTab === 'customers' && (
            <WholesaleCustomers
              customers={customers}
              onAddCustomer={handleAddB2BCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onSelectCustomerLedger={(cust) => setActiveTab('receivables')}
              isOpenModal={isOpenCustomerModal}
              onOpenModal={() => setIsOpenCustomerModal(true)}
              onCloseModal={() => setIsOpenCustomerModal(false)}
            />
          )}

          {activeTab === 'quotations' && (
            <WholesaleQuotations
              quotations={quotations}
              customers={customers}
              products={products}
              onCreateQuotation={handleCreateQuotation}
              onConvertToOrder={handleConvertToOrder}
              onPrintDoc={handlePrintDoc}
              isOpenModal={isOpenQuoteModal}
              onOpenModal={() => setIsOpenQuoteModal(true)}
              onCloseModal={() => setIsOpenQuoteModal(false)}
            />
          )}

          {activeTab === 'orders' && (
            <WholesaleOrders
              orders={orders}
              customers={customers}
              products={products}
              onCreateOrder={handleCreateOrder}
              onReserveStock={handleReserveStock}
              onFulfillOrderModal={(ord) => setSelectedOrderForFulfillment(ord)}
              onCreateInvoice={handleCreateInvoice}
              onCreateChallanModal={(ord) => {
                setSelectedOrderForChallan(ord);
                setIsOpenChallanModal(true);
              }}
              onPrintDoc={handlePrintDoc}
              isOpenWizard={isOpenOrderWizard}
              onOpenWizard={() => setIsOpenOrderWizard(true)}
              onCloseWizard={() => setIsOpenOrderWizard(false)}
            />
          )}

          {activeTab === 'invoices' && (
            <WholesaleInvoices
              invoices={invoices}
              onPrintDoc={handlePrintDoc}
              onRecordPaymentModal={(inv) => {
                setSelectedInvoiceForPayment(inv);
                setIsOpenPaymentModal(true);
              }}
            />
          )}

          {activeTab === 'challans' && (
            <DeliveryChallans
              challans={challans}
              ordersReadyForDispatch={orders.filter(
                (o) => o.status === 'READY_FOR_DISPATCH' || o.status === 'PARTIALLY_FULFILLED'
              )}
              onCreateChallan={handleCreateChallan}
              onPrintDoc={handlePrintDoc}
              isOpenModal={isOpenChallanModal}
              onOpenModal={() => setIsOpenChallanModal(true)}
              onCloseModal={() => setIsOpenChallanModal(false)}
              selectedOrderForChallan={selectedOrderForChallan}
            />
          )}

          {activeTab === 'receivables' && (
            <WholesaleReceivables
              customers={customers}
              invoices={invoices}
              onRecordPayment={handleRecordPayment}
              selectedInvoiceForPayment={selectedInvoiceForPayment}
              isOpenPaymentModal={isOpenPaymentModal}
              onOpenPaymentModal={(inv) => {
                if (inv) setSelectedInvoiceForPayment(inv);
                setIsOpenPaymentModal(true);
              }}
              onClosePaymentModal={() => setIsOpenPaymentModal(false)}
            />
          )}

          {activeTab === 'pricing' && (
            <WholesalePricing
              priceRules={priceRules}
              customers={customers}
              products={products}
              onCreatePriceRule={handleCreatePriceRule}
            />
          )}
        </>
      )}

      {/* Stock Fulfillment Modal */}
      {selectedOrderForFulfillment && (
        <WholesaleFulfillmentModal
          order={selectedOrderForFulfillment}
          onFulfill={handleFulfillStock}
          onClose={() => setSelectedOrderForFulfillment(null)}
        />
      )}

      {/* Document Printing Modal */}
      {printableDocType && printableDocData && (
        <PrintableWholesaleDocModal
          type={printableDocType}
          docData={printableDocData}
          onClose={() => {
            setPrintableDocType(null);
            setPrintableDocData(null);
          }}
        />
      )}
    </div>
  );
};
