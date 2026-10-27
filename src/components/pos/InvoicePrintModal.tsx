import React, { useState } from 'react';
import { Printer, X, CheckCircle2, FileText, Truck, ShieldCheck, Phone, MapPin, Building2 } from 'lucide-react';
import { SaleInvoice, Organization, PharmacyStore } from '../../types';
import { safeToFixed, formatBatchExpiryDate, formatDateTime } from '../../lib/formatting/formatters';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleInvoice | null;
  organization: Organization | null;
  store: PharmacyStore | null;
  isQuotation?: boolean;
}

type PrintFormat = 'thermal58' | 'thermal80' | 'a4';

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  organization,
  store,
  isQuotation = false,
}) => {
  const [format, setFormat] = useState<PrintFormat>('a4');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDateStr = formatDateTime(invoice.createdAt) || new Date().toLocaleString('en-IN');

  const orgName = organization?.legalName || organization?.name || 'Vetrify Ceramics & Sanitaryware Studio';
  const orgGstin = store?.gstin || organization?.gstin || '27AADCB2230M1ZT';
  const storeName = store?.name || 'City Flagship Experience Showroom';
  const storePhone = store?.phone || '+91 98765 43210';
  const storeAddress = store?.address
    ? `${store.address.line1 || ''}, ${store.address.city || ''}, ${store.address.state || ''} - ${store.address.postalCode || ''}`
    : 'Plot No. 12, Ring Road Ceramic Complex, Marble Market';

  const totalBoxes = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalWeightKg = invoice.items.reduce((sum, item) => sum + (item.quantity * 28), 0);
  const totalWeightTonnes = (totalWeightKg / 1000).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="invoice-modal-wrapper"
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top Control Bar (Hidden during Print) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isQuotation
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
              }`}
            >
              {isQuotation ? <FileText className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isQuotation ? 'Proforma Estimate / Quotation' : 'Sale Completed & Tax Invoice'}
                <span
                  className={`font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    isQuotation
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                      : 'bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300'
                  }`}
                >
                  {invoice.invoiceNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isQuotation
                  ? 'Dual UOM Material Estimate with Freight & Loading Charges'
                  : 'Statutory GST Ceramics, Marble & Bathware Tax Invoice'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector Pills */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFormat('thermal58')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  format === 'thermal58'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                58mm Slip
              </button>
              <button
                type="button"
                onClick={() => setFormat('thermal80')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  format === 'thermal80'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                80mm Thermal
              </button>
              <button
                type="button"
                onClick={() => setFormat('a4')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  format === 'a4'
                    ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                A4 Document
              </button>
            </div>

            <button
              id="btn-trigger-print"
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{isQuotation ? 'Print Estimate' : 'Print Invoice'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Preview Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          {/* ================================================================
              FORMAT 1: 58mm / 80mm THERMAL RECEIPT SLIP
              ================================================================ */}
          {(format === 'thermal58' || format === 'thermal80') && (
            <div
              id="printable-thermal-invoice"
              className={`bg-white text-slate-950 p-4 shadow-xl border border-slate-200 font-mono text-[11px] leading-tight ${
                format === 'thermal58' ? 'w-[58mm] min-w-[58mm]' : 'w-[80mm] min-w-[80mm]'
              } print:shadow-none print:border-none print:w-full print:p-1`}
            >
              {/* Header */}
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <div className="text-xs font-black uppercase tracking-wider">{orgName}</div>
                <div className="text-[10px] text-slate-700 font-semibold">{storeName}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{storeAddress}</div>
                <div className="text-[9px] text-slate-600 font-semibold mt-1">
                  GSTIN: {orgGstin}
                </div>
                <div className="text-[9px] text-slate-500">Phone: {storePhone}</div>
                <div className="mt-1 inline-block px-2 py-0.5 border border-slate-800 text-[9px] font-bold uppercase">
                  {isQuotation ? 'Proforma Estimate' : 'Tax Invoice / Cash Memo'}
                </div>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Doc No: <strong>{invoice.invoiceNumber}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {invoiceDateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer: {invoice.customerName}</span>
                </div>
                {invoice.customerPhone && (
                  <div className="flex justify-between">
                    <span>Contact: {invoice.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Payment: <strong className="uppercase">{invoice.paymentMode}</strong></span>
                </div>
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-[10px]">
                  <span className="w-1/2">Item (Lot/Shade)</span>
                  <span className="w-1/6 text-center">Qty</span>
                  <span className="w-1/6 text-right">Rate</span>
                  <span className="w-1/6 text-right">Amt</span>
                </div>
                <div className="space-y-1.5 pt-1.5">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="text-[10px]">
                      <div className="font-semibold flex justify-between">
                        <span className="truncate pr-1">{item.productName}</span>
                        <span>₹{safeToFixed(item.total)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-600">
                        <span>
                          {item.shadeNumber ? `Shade: ${item.shadeNumber}` : `Lot: ${item.batchNumber}`}
                          {item.toneCode ? ` | Tone: ${item.toneCode}` : ''}
                        </span>
                        <span>
                          {item.quantity} x ₹{safeToFixed(item.unitPrice)}
                          {item.discountPercent > 0 && ` (-${item.discountPercent}%)`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Total Summary */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span>Materials Subtotal:</span>
                  <span>₹{safeToFixed(invoice.subtotal)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount Savings:</span>
                    <span>-₹{safeToFixed(invoice.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span>₹{safeToFixed(invoice.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST + SGST:</span>
                  <span>₹{safeToFixed(invoice.totalTax)}</span>
                </div>
                {invoice.freightAmount ? (
                  <div className="flex justify-between text-slate-800">
                    <span>Freight / Transport:</span>
                    <span>+₹{safeToFixed(invoice.freightAmount)}</span>
                  </div>
                ) : null}
                {invoice.loadingUnloadingAmount ? (
                  <div className="flex justify-between text-slate-800">
                    <span>Loading / Hamali:</span>
                    <span>+₹{safeToFixed(invoice.loadingUnloadingAmount)}</span>
                  </div>
                ) : null}
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span>
                      {invoice.roundOff > 0
                        ? `+₹${safeToFixed(invoice.roundOff)}`
                        : `-₹${safeToFixed(Math.abs(invoice.roundOff))}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>{isQuotation ? 'ESTIMATED TOTAL:' : `NET PAYABLE (${(invoice.paymentMode || 'CASH').toUpperCase()}):`}</span>
                  <span>₹{safeToFixed(invoice.grandTotal)}</span>
                </div>
              </div>

              {/* Ceramics Statutory Notice */}
              <div className="text-center pt-2 text-[8px] text-slate-600 space-y-0.5">
                <p className="font-semibold">Thank you for choosing {orgName}!</p>
                <p>1. Check Shade &amp; Lot before fixing. No claim accepted after tiles are laid.</p>
                <p>2. Breakage allowance: 2% standard transport toleration.</p>
                <p>3. Goods once delivered cannot be returned or exchanged.</p>
                <p className="pt-1 font-mono text-[7px] text-slate-400">Powered by Vetrify Ceramic ERP</p>
              </div>
            </div>
          )}

          {/* ================================================================
              FORMAT 2: FULL STATUTORY A4 GST TAX INVOICE / ESTIMATE
              ================================================================ */}
          {format === 'a4' && (
            <div
              id="printable-a4-invoice"
              className="bg-white text-slate-900 p-8 shadow-xl border border-slate-200 w-[210mm] min-h-[297mm] text-xs leading-normal print:shadow-none print:border-none print:w-full print:p-2"
            >
              {/* Header Box */}
              <div className="border border-slate-300 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black text-slate-950 uppercase tracking-wide">
                      {orgName}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">{storeName}</p>
                    <p className="text-[11px] text-slate-600 mt-1 max-w-md">{storeAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-700">
                      <span><strong>GSTIN:</strong> {orgGstin}</span>
                      <span><strong>Phone:</strong> {storePhone}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-block px-3 py-1 font-bold text-xs rounded uppercase tracking-wider mb-2 ${
                        isQuotation ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'
                      }`}
                    >
                      {isQuotation ? 'Project Estimate / Quotation' : 'Tax Invoice / Cash Memo'}
                    </div>
                    <div className="text-xs">
                      <strong>Document No:</strong>{' '}
                      <span className="font-mono font-bold text-teal-700">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Date &amp; Time:</strong> {invoiceDateStr}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Payment Mode:</strong> <span className="uppercase font-semibold">{invoice.paymentMode}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Handled By:</strong> {invoice.createdByName || 'Sales Executive'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer / Project Site Details Box */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Customer &amp; Billing Details
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{invoice.customerName}</p>
                  {invoice.customerPhone && (
                    <p className="text-[11px] text-slate-600">Phone: {invoice.customerPhone}</p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1">
                    Delivery Address: {storeAddress.includes('Market') ? 'Site Delivery as per dispatch memo' : 'Customer Site'}
                  </p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Dispatch &amp; Godown Reference
                  </h3>
                  <p className="text-xs font-bold text-slate-900">Primary Godown / Yard Dispatch</p>
                  <p className="text-[11px] text-slate-600">
                    Mode of Transport: <strong>{invoice.freightAmount ? 'Showroom Fleet / Commercial Truck' : 'Customer Vehicle / Pickup'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Loading Status: <strong>{invoice.loadingUnloadingAmount ? 'Hamali Included' : 'Self Unloading'}</strong>
                  </p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2">Item Description &amp; Specifications</th>
                      <th className="p-2 w-16">HSN</th>
                      <th className="p-2 w-24">Lot / Shade</th>
                      <th className="p-2 w-16 text-center">Boxes</th>
                      <th className="p-2 w-20 text-right">Rate</th>
                      <th className="p-2 w-14 text-right">Disc%</th>
                      <th className="p-2 w-20 text-right">Taxable</th>
                      <th className="p-2 w-14 text-right">GST%</th>
                      <th className="p-2 w-24 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-slate-200 ${
                          idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                        }`}
                      >
                        <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          <span className="font-bold text-slate-900">{item.productName}</span>
                          {item.dosageForm && (
                            <span className="text-[10px] text-slate-500 ml-1">({item.dosageForm})</span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-slate-600">{item.hsnCode || '6907'}</td>
                        <td className="p-2 font-mono font-semibold text-slate-800">
                          {item.shadeNumber || item.batchNumber || '-'}
                          {item.toneCode ? ` / ${item.toneCode}` : ''}
                        </td>
                        <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="p-2 text-right text-slate-900 font-semibold">₹{safeToFixed(item.unitPrice)}</td>
                        <td className="p-2 text-right text-slate-600">
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                        </td>
                        <td className="p-2 text-right text-slate-900">₹{safeToFixed(item.taxableAmount)}</td>
                        <td className="p-2 text-right text-slate-600">{item.gstRate}%</td>
                        <td className="p-2 text-right font-bold text-slate-950">₹{safeToFixed(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* GST Tax Breakup & Grand Totals */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* GST Breakup Table */}
                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-200 pb-1">
                    GST Tax Analysis
                  </h3>
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="pb-1">HSN/SAC</th>
                        <th className="pb-1 text-right">Taxable</th>
                        <th className="pb-1 text-right">CGST</th>
                        <th className="pb-1 text-right">SGST</th>
                        <th className="pb-1 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-mono">6907 (Ceramics)</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.taxableAmount)}</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.cgstTotal)}</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.sgstTotal)}</td>
                        <td className="py-1 text-right font-bold">₹{safeToFixed(invoice.totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-3 text-[10px] text-slate-500">
                    <p>Transport / Hamali charges billed at applicable non-composite freight terms.</p>
                  </div>
                </div>

                {/* Totals Summary Card with Freight & Hamali */}
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Material Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.subtotal)}</span>
                  </div>
                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Total Savings / Discount:</span>
                      <span className="font-semibold">-₹{safeToFixed(invoice.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxable Goods Value:</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CGST + SGST (18% / 28%):</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.totalTax)}</span>
                  </div>
                  {invoice.freightAmount ? (
                    <div className="flex justify-between text-slate-700">
                      <span className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-teal-600" />
                        Freight / Transportation:
                      </span>
                      <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.freightAmount)}</span>
                    </div>
                  ) : null}
                  {invoice.loadingUnloadingAmount ? (
                    <div className="flex justify-between text-slate-700">
                      <span>Loading / Unloading (Hamali):</span>
                      <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.loadingUnloadingAmount)}</span>
                    </div>
                  ) : null}
                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span>
                        {invoice.roundOff > 0
                          ? `+₹${safeToFixed(invoice.roundOff)}`
                          : `-₹${safeToFixed(Math.abs(invoice.roundOff || 0))}`}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-950 uppercase">
                      {isQuotation ? 'Estimated Grand Total:' : 'Grand Total:'}
                    </span>
                    <span className="text-base font-black text-teal-700">₹{safeToFixed(invoice.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Ceramics Terms & Signature Block */}
              <div className="border-t border-slate-300 pt-4 grid grid-cols-2 gap-4 text-[10px] text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Standard Industry Terms &amp; Conditions:</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-[9px]">
                    <li>Goods once fixed, laid with adhesive or mortar will not be accepted for exchange or return under any condition.</li>
                    <li>Verify shade number, caliber, and surface finish before laying. No claims entertained for shade difference after laying.</li>
                    <li>Natural stones, granite &amp; marble have natural variations in colour and texture which are inherent qualities.</li>
                    <li>Breakage up to 2% during transit is customary and acceptable as per industry standards.</li>
                  </ul>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <div className="mb-8 font-semibold text-slate-800">For {orgName}</div>
                  <div className="flex justify-end gap-10">
                    <div className="text-[10px] font-bold text-slate-900 border-t border-slate-300 pt-1 w-36 text-center">
                      Customer Signature
                    </div>
                    <div className="text-[10px] font-bold text-slate-900 border-t border-slate-300 pt-1 w-36 text-center">
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              FORMAT 3: GODOWN DISPATCH CHALLAN & WAREHOUSE GATE-PASS
              ================================================================ */}
          {format === 'godownChallan' && (
            <div
              id="printable-godown-challan"
              className="bg-white text-slate-900 p-8 shadow-xl border border-slate-200 w-[210mm] min-h-[297mm] text-xs leading-normal print:shadow-none print:border-none print:w-full print:p-2"
            >
              {/* Warehouse Warning Ribbon */}
              <div className="bg-amber-500 text-slate-950 font-black text-center py-1.5 px-3 uppercase tracking-wider text-[11px] rounded mb-4">
                Godown Dispatch Challan &amp; Gate-Pass — Non-Commercial Document (Quantity &amp; Lot Verification Only)
              </div>

              {/* Header Box */}
              <div className="border border-slate-300 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black text-slate-950 uppercase tracking-wide">
                      {orgName}
                    </h1>
                    <p className="text-xs font-bold text-slate-700">Central Logistics Godown &amp; Bulk Yard</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{storeAddress}</p>
                    <p className="text-[11px] text-slate-700 mt-1">
                      <strong>Yard Contact:</strong> {storePhone} • <strong>Security Desk:</strong> Ext #4
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-teal-800 text-white font-bold text-xs rounded uppercase tracking-wider mb-2">
                      Dispatch Gate-Pass
                    </div>
                    <div className="text-xs">
                      <strong>Challan No:</strong>{' '}
                      <span className="font-mono font-bold text-teal-700">
                        CHL-{invoice.invoiceNumber.replace(/^INV-/, '')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Linked Tax Invoice:</strong>{' '}
                      <span className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Date &amp; Time:</strong> {invoiceDateStr}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Site & Transport Details */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Customer &amp; Site Destination
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{invoice.customerName}</p>
                  {invoice.customerPhone && (
                    <p className="text-[11px] text-slate-600">Site Contact: {invoice.customerPhone}</p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1">
                    <strong>Delivery Location:</strong> Customer Project Site / Unloading Point
                  </p>
                </div>

                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Transport &amp; Vehicle Reference
                  </h3>
                  <p className="text-xs font-bold text-slate-900">
                    Vehicle: {invoice.freightAmount ? 'Showroom Fleet / Commercial Tempo' : 'Customer Pickup Vehicle'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Loading Mode: <strong>{invoice.loadingUnloadingAmount ? 'Hamali Handled by Godown Crew' : 'Driver / Self Loading'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Dispatched From: <strong>Main Yard Bay 2 (Rack Aisle C)</strong>
                  </p>
                </div>
              </div>

              {/* Physical Quantities Table (Prices Intentionally Omitted) */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2">Material Description &amp; Finish</th>
                      <th className="p-2 w-28">Lot / Shade</th>
                      <th className="p-2 w-24">Tone / Caliber</th>
                      <th className="p-2 w-24">Yard Location</th>
                      <th className="p-2 w-20 text-center">Boxes</th>
                      <th className="p-2 w-24 text-right">Sq. Ft Area</th>
                      <th className="p-2 w-24 text-right">Weight (Est)</th>
                      <th className="p-2 w-16 text-center">Tally [✓]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => {
                      const estSqFt = item.coverageSqFt || (item.quantity * 15.5);
                      const estWeight = item.quantity * 28;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-slate-200 ${
                            idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-2">
                            <span className="font-bold text-slate-900">{item.productName}</span>
                            {item.dosageForm && (
                              <span className="text-[10px] text-slate-500 ml-1">({item.dosageForm})</span>
                            )}
                          </td>
                          <td className="p-2 font-mono font-bold text-slate-900">
                            {item.shadeNumber || item.batchNumber || 'STANDARD'}
                          </td>
                          <td className="p-2 font-mono text-slate-600">
                            {item.toneCode ? `T:${item.toneCode}` : '-'} {item.caliberCode ? `C:${item.caliberCode}` : ''}
                          </td>
                          <td className="p-2 font-mono text-slate-600">
                            Bay {((idx % 4) + 1)} - Rack {String.fromCharCode(65 + (idx % 5))}
                          </td>
                          <td className="p-2 text-center font-black text-slate-950 text-xs">
                            {item.quantity}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {safeToFixed(estSqFt)}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {estWeight} kg
                          </td>
                          <td className="p-2 text-center text-slate-400">
                            <span className="inline-block w-4 h-4 border border-slate-400 rounded"></span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Load Metrics Strip */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Items to Dispatch</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">{invoice.items.length} Lines</div>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Boxes Tally</div>
                  <div className="text-base font-black text-teal-700 font-mono mt-0.5">{totalBoxes} Boxes</div>
                </div>

                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Gross Weight</div>
                  <div className="text-base font-black text-slate-900 font-mono mt-0.5">
                    ~{totalWeightTonnes} Metric Tonnes
                  </div>
                </div>
              </div>

              {/* Warehouse Dispatch Verification & Gate-Pass Signatures */}
              <div className="border border-slate-300 rounded-lg p-4 space-y-4">
                <h4 className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Mandatory Godown Quality &amp; Gate-Pass Verification:
                </h4>
                <div className="grid grid-cols-3 gap-3 text-[10px] text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded shrink-0 mt-0.5"></span>
                    <span>1. Verified all cartons have matching Shade &amp; Lot codes.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded shrink-0 mt-0.5"></span>
                    <span>2. Inspect corner guards &amp; plastic pallet wrapping.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded shrink-0 mt-0.5"></span>
                    <span>3. Physical box tally matched before gate exit.</span>
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-4 gap-4 text-center text-[10px]">
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800">Storekeeper / Loader</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800">Yard Supervisor</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800">Driver / Transporter</span>
                  </div>
                  <div className="border-t border-slate-400 pt-1">
                    <span className="font-bold text-slate-800">Gate Security Stamp</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Document ID: <code className="font-mono text-slate-700 dark:text-slate-300">{invoice.id}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Done &amp; Start New Bill
          </button>
        </div>
      </div>
    </div>
  );
};
