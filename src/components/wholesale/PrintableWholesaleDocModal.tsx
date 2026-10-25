import React from 'react';
import { X, Printer, Download, Building2, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { WholesaleQuotation, WholesaleInvoice, DeliveryChallan } from '../../types/wholesale';

interface PrintableWholesaleDocModalProps {
  type: 'quotation' | 'invoice' | 'challan';
  docData: WholesaleQuotation | WholesaleInvoice | DeliveryChallan | null;
  onClose: () => void;
}

export const PrintableWholesaleDocModal: React.FC<PrintableWholesaleDocModalProps> = ({
  type,
  docData,
  onClose,
}) => {
  if (!docData) return null;

  const handlePrint = () => {
    window.print();
  };

  const isQuotation = type === 'quotation';
  const isInvoice = type === 'invoice';
  const isChallan = type === 'challan';

  const q = isQuotation ? (docData as WholesaleQuotation) : null;
  const inv = isInvoice ? (docData as WholesaleInvoice) : null;
  const dc = isChallan ? (docData as DeliveryChallan) : null;

  const docNumber = q?.quotationNumber || inv?.invoiceNumber || dc?.challanNumber || '';
  const customerName = docData.customerName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              Rx
            </div>
            <div>
              <h2 className="text-base font-semibold text-white capitalize">
                {type} Preview — {docNumber}
              </h2>
              <p className="text-xs text-slate-400">{customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 text-sm print:p-0 print:overflow-visible" id="printable-doc">
          {/* Company Branding & Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">Vetrify</span>
                <span className="text-xs px-2 py-0.5 font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded">
                  Wholesale & B2B
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">Vetrify Institutional Distribution Pvt. Ltd.</p>
              <p className="text-xs text-slate-500">Plot 42, Healthcare City, Industrial Area, Sector 62</p>
              <p className="text-xs text-slate-500">DL2026-WHOLESALE-001 | GSTIN: 07AAAAA0000A1Z5</p>
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> +91 1800-419-8800</span>
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> b2b@vetrify.com</span>
              </div>
            </div>

            <div className="text-right">
              <h1 className="text-2xl font-black tracking-wide text-slate-900 uppercase">
                {isQuotation && 'WHOLESALE QUOTATION'}
                {isInvoice && 'TAX INVOICE'}
                {isChallan && 'DELIVERY CHALLAN'}
              </h1>
              <p className="text-base font-bold text-emerald-700 mt-1">{docNumber}</p>
              <div className="mt-2 text-xs text-slate-600 space-y-1">
                <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                {q && <p><span className="font-semibold">Valid Until:</span> {q.validUntil}</p>}
                {inv && <p><span className="font-semibold">Order Ref:</span> {inv.orderNumber}</p>}
                {inv && <p><span className="font-semibold">Due Date:</span> {inv.dueDate}</p>}
                {dc && <p><span className="font-semibold">Dispatch Date:</span> {dc.dispatchDate}</p>}
              </div>
            </div>
          </div>

          {/* Customer & Shipping Information */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Billed To (Customer)</h3>
              <p className="font-bold text-slate-900 text-base">{customerName}</p>
              {inv?.customerGstin && (
                <p className="text-xs text-slate-600 font-medium mt-0.5">GSTIN: {inv.customerGstin}</p>
              )}
              {inv?.billingAddress && (
                <p className="text-xs text-slate-600 mt-1">{inv.billingAddress}</p>
              )}
              {dc?.deliveryAddress && (
                <p className="text-xs text-slate-600 mt-1">{dc.deliveryAddress}</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Logistics & Payment Details</h3>
              <div className="text-xs space-y-1 text-slate-700">
                {inv && (
                  <>
                    <p><span className="font-semibold">Payment Terms:</span> {inv.creditTerms || 'Net 30'}</p>
                    <p><span className="font-semibold">Payment Mode:</span> <span className="uppercase font-bold text-slate-900">{inv.paymentMode}</span></p>
                    <p><span className="font-semibold">Status:</span> <span className="font-bold text-emerald-700">{inv.paymentStatus}</span></p>
                  </>
                )}
                {dc && (
                  <>
                    <p><span className="font-semibold">Transporter:</span> {dc.transporterName || 'Self / Direct'}</p>
                    <p><span className="font-semibold">Vehicle No:</span> {dc.vehicleNumber || 'N/A'}</p>
                    <p><span className="font-semibold">Driver:</span> {dc.driverName || 'N/A'} ({dc.driverPhone || 'N/A'})</p>
                    <p><span className="font-semibold">Total Packages:</span> {dc.totalPackages || 1}</p>
                  </>
                )}
                {q && (
                  <p><span className="font-semibold">Quotation Status:</span> <span className="font-bold text-blue-700">{q.status}</span></p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse border border-slate-200 mb-6">
            <thead>
              <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                <th className="p-2.5 border border-slate-800">#</th>
                <th className="p-2.5 border border-slate-800">Item Description</th>
                <th className="p-2.5 border border-slate-800 text-center">Batch / Expiry</th>
                <th className="p-2.5 border border-slate-800 text-right">Qty</th>
                {!isChallan && <th className="p-2.5 border border-slate-800 text-right">Rate (₹)</th>}
                {!isChallan && <th className="p-2.5 border border-slate-800 text-right">Disc %</th>}
                {!isChallan && <th className="p-2.5 border border-slate-800 text-right">GST %</th>}
                {!isChallan && <th className="p-2.5 border border-slate-800 text-right">Total (₹)</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {q &&
                q.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 border border-slate-200 font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 border border-slate-200">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">{item.brand} | HSN: {item.hsnCode || '3004'}</p>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-600">N/A</td>
                    <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">{item.requestedQty}</td>
                    <td className="p-2.5 border border-slate-200 text-right">₹{item.wholesalePrice.toFixed(2)}</td>
                    <td className="p-2.5 border border-slate-200 text-right">{item.discountPercent}%</td>
                    <td className="p-2.5 border border-slate-200 text-right">{item.gstRate}%</td>
                    <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}

              {inv &&
                inv.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 border border-slate-200 font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 border border-slate-200">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">{item.brand} | SKU: {item.sku}</p>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-700">
                      <span className="font-bold">{item.batchNumber}</span>
                      <span className="text-[10px] text-slate-500 block">Exp: {item.expiryDate}</span>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">{item.quantity}</td>
                    <td className="p-2.5 border border-slate-200 text-right">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="p-2.5 border border-slate-200 text-right">{item.discountPercent}%</td>
                    <td className="p-2.5 border border-slate-200 text-right">{item.gstRate}%</td>
                    <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900">₹{item.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}

              {dc &&
                dc.items.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-2.5 border border-slate-200 font-medium text-slate-500">{idx + 1}</td>
                    <td className="p-2.5 border border-slate-200" colSpan={2}>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-500">{item.brand}</p>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-center font-mono text-slate-700">
                      <span className="font-bold">{item.batchNumber}</span>
                      <span className="text-[10px] text-slate-500 block">Exp: {item.expiryDate}</span>
                    </td>
                    <td className="p-2.5 border border-slate-200 text-right font-bold text-slate-900" colSpan={4}>
                      {item.quantity} Units
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>

          {/* Tax Breakdown & Totals Summary */}
          {!isChallan && (
            <div className="flex justify-between items-start pt-2 mb-8">
              <div className="w-1/2 text-xs text-slate-600 pr-6">
                <p className="font-bold text-slate-900 mb-1 uppercase tracking-wider">Statutory Tax Note</p>
                <p>Goods once sold will not be accepted back without prior written authorization.</p>
                <p className="mt-1">All disputes subject to local jurisdiction only.</p>
              </div>

              <div className="w-1/2 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{(q?.subtotal || inv?.subtotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Discount:</span>
                  <span className="font-medium text-emerald-700">-₹{(q?.totalDiscount || inv?.totalDiscount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Amount:</span>
                  <span className="font-medium">₹{(q?.taxableAmount || inv?.taxableAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST Total:</span>
                  <span className="font-medium">₹{(q?.cgstTotal || inv?.cgstTotal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>SGST Total:</span>
                  <span className="font-medium">₹{(q?.sgstTotal || inv?.sgstTotal || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Grand Total (INR):</span>
                  <span className="text-lg text-emerald-700">₹{(q?.grandTotal || inv?.grandTotal || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-8 pt-12 border-t border-slate-200 mt-8 text-xs">
            <div>
              <p className="font-bold text-slate-900 mb-8">Customer Acceptance Stamp / Sign</p>
              <div className="border-b border-dashed border-slate-400 w-3/4"></div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized Representative</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-slate-900 mb-8">For Vetrify Institutional Distribution</p>
              <div className="border-b border-dashed border-slate-400 w-3/4 ml-auto"></div>
              <p className="text-[11px] text-slate-500 mt-1">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
