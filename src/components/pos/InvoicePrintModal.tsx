import React, { useState } from 'react';
import { Printer, X, Download, Share2, CheckCircle2, FileText, Phone, Building2 } from 'lucide-react';
import { SaleInvoice, Organization, PharmacyStore } from '../../types';
import { safeToFixed, formatBatchExpiryDate, formatDateTime } from '../../lib/formatting/formatters';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SaleInvoice | null;
  organization: Organization | null;
  store: PharmacyStore | null;
}

type PrintFormat = 'thermal58' | 'thermal80' | 'a4';

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  organization,
  store,
}) => {
  const [format, setFormat] = useState<PrintFormat>('thermal80');

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceDateStr = formatDateTime(invoice.createdAt) || new Date().toLocaleString('en-IN');

  const orgName = organization?.legalName || organization?.name || 'Vetrify Retail & Wholesale';
  const orgGstin = store?.gstin || organization?.gstin || '27AADCB2230M1ZT';
  const orgDL = store?.drugLicenseNumber || organization?.drugLicenseNumber || 'MH-TZ1-48291 / MH-TZ1-48292';
  const storeName = store?.name || 'Main Dispensary Branch';
  const storePhone = store?.phone || '+91 98765 43210';
  const storeAddress = store?.address
    ? `${store.address.line1 || ''}, ${store.address.city || ''}, ${store.address.state || ''} - ${store.address.postalCode || ''}`
    : 'Shop No. 4, Medical Square, Central Healthcare Avenue';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="invoice-modal-wrapper"
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[95vh]"
      >
        {/* Top Control Bar (Hidden during Print) */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Sale Completed & Billed
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {invoice.invoiceNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statutory GST Pharmacy Tax Invoice Generated
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
                A4 Tax Invoice
              </button>
            </div>

            <button
              id="btn-trigger-print"
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-600/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
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
                <div className="text-[10px] text-slate-600">{storeName}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{storeAddress}</div>
                <div className="text-[9px] text-slate-600 font-semibold mt-1">
                  GSTIN: {orgGstin}
                </div>
                <div className="text-[9px] text-slate-600">DL: {orgDL}</div>
                <div className="text-[9px] text-slate-500">Phone: {storePhone}</div>
              </div>

              {/* Invoice Meta */}
              <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Bill No: <strong>{invoice.invoiceNumber}</strong></span>
                </div>
                <div className="flex justify-between">
                  <span>Date: {invoiceDateStr}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer: {invoice.customerName}</span>
                  {invoice.customerPhone && <span>Ph: {invoice.customerPhone}</span>}
                </div>
                {invoice.prescription && (
                  <div className="mt-1 pt-1 border-t border-dotted border-slate-300 text-[9px]">
                    <div>Dr: {invoice.prescription.doctorName} (Reg: {invoice.prescription.doctorRegNo})</div>
                    <div>Pt: {invoice.prescription.patientName} ({invoice.prescription.patientAge}y)</div>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between font-bold border-b border-slate-300 pb-1 text-[10px]">
                  <span className="w-1/2">Item (Batch/Exp)</span>
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
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>B: {item.batchNumber} | E: {formatBatchExpiryDate(item.expiryDate)}</span>
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
                  <span>Subtotal:</span>
                  <span>₹{safeToFixed(invoice.subtotal)}</span>
                </div>
                {invoice.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount:</span>
                    <span>-₹{safeToFixed(invoice.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Taxable:</span>
                  <span>₹{safeToFixed(invoice.taxableAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>CGST + SGST:</span>
                  <span>₹{safeToFixed(invoice.totalTax)}</span>
                </div>
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Round Off:</span>
                    <span>{invoice.roundOff > 0 ? `+₹${safeToFixed(invoice.roundOff)}` : `-₹${safeToFixed(Math.abs(invoice.roundOff))}`}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300">
                  <span>NET PAYABLE ({(invoice.paymentMode || 'CASH').toUpperCase()}):</span>
                  <span>₹{safeToFixed(invoice.grandTotal)}</span>
                </div>
              </div>

              {/* Statutory Notice */}
              <div className="text-center pt-2 text-[8px] text-slate-500 space-y-0.5">
                <p className="font-semibold">Thank you for visiting {orgName}!</p>
                <p>Goods once sold will not be returned without bill.</p>
                <p>Store medicines in a cool & dry place away from sunlight.</p>
                <p className="pt-1 font-mono text-[7px]">Powered by Vetrify Billing &amp; Inventory Cloud OS</p>
              </div>
            </div>
          )}

          {/* ================================================================
              FORMAT 2: FULL STATUTORY A4 GST TAX INVOICE
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
                    <h1 className="text-lg font-black text-slate-950 uppercase tracking-wide">
                      {orgName}
                    </h1>
                    <p className="text-xs font-semibold text-slate-700">{storeName}</p>
                    <p className="text-[11px] text-slate-600 mt-1 max-w-md">{storeAddress}</p>
                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-700">
                      <span><strong>GSTIN:</strong> {orgGstin}</span>
                      <span><strong>Phone:</strong> {storePhone}</span>
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      <strong>Drug License (DL 20B/21B):</strong> {orgDL}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded uppercase tracking-wider mb-2">
                      Tax Invoice / Cash Memo
                    </div>
                    <div className="text-xs">
                      <strong>Invoice No:</strong> <span className="font-mono font-bold text-teal-700">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Date & Time:</strong> {invoiceDateStr}
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Payment Mode:</strong> <span className="uppercase font-semibold">{invoice.paymentMode}</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      <strong>Billed By:</strong> {invoice.createdByName || 'Pharmacist'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient / Doctor Details Box */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Customer / Patient Details
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{invoice.customerName}</p>
                  {invoice.customerPhone && (
                    <p className="text-[11px] text-slate-600">Phone: {invoice.customerPhone}</p>
                  )}
                  {invoice.prescription?.patientAge && (
                    <p className="text-[11px] text-slate-600">
                      Age/Gender: {invoice.prescription.patientAge} Years / {invoice.prescription.patientGender || 'N/A'}
                    </p>
                  )}
                </div>

                <div className="border border-slate-300 rounded-lg p-3">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 border-b border-slate-200 pb-1">
                    Doctor & Compliance Details
                  </h3>
                  {invoice.prescription ? (
                    <>
                      <p className="text-xs font-bold text-slate-900">{invoice.prescription.doctorName}</p>
                      <p className="text-[11px] text-slate-600">
                        Reg No: <strong>{invoice.prescription.doctorRegNo}</strong>
                      </p>
                      {invoice.prescription.hospitalClinic && (
                        <p className="text-[11px] text-slate-600">{invoice.prescription.hospitalClinic}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Over-The-Counter (OTC) / Non-Restricted Formulation
                    </p>
                  )}
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden mb-4">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="p-2 w-8 text-center">#</th>
                      <th className="p-2">Medicine / Product Details</th>
                      <th className="p-2 w-16">HSN</th>
                      <th className="p-2 w-20">Batch</th>
                      <th className="p-2 w-16">Exp</th>
                      <th className="p-2 w-12 text-center">Qty</th>
                      <th className="p-2 w-16 text-right">MRP</th>
                      <th className="p-2 w-16 text-right">Rate</th>
                      <th className="p-2 w-14 text-right">Disc%</th>
                      <th className="p-2 w-16 text-right">Taxable</th>
                      <th className="p-2 w-14 text-right">GST%</th>
                      <th className="p-2 w-20 text-right">Total</th>
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
                          {item.schedule && (item.schedule === 'H' || item.schedule === 'H1' || item.schedule === 'X') && (
                            <span className="ml-1.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                              Sch {item.schedule}
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-mono text-slate-600">{item.hsnCode || '3004'}</td>
                        <td className="p-2 font-mono font-semibold text-slate-800">{item.batchNumber}</td>
                        <td className="p-2 font-mono text-slate-600">{formatBatchExpiryDate(item.expiryDate)}</td>
                        <td className="p-2 text-center font-bold text-slate-900">{item.quantity}</td>
                        <td className="p-2 text-right text-slate-600">₹{safeToFixed(item.mrp)}</td>
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
                        <th className="pb-1">HSN</th>
                        <th className="pb-1 text-right">Taxable</th>
                        <th className="pb-1 text-right">CGST</th>
                        <th className="pb-1 text-right">SGST</th>
                        <th className="pb-1 text-right">Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-1 font-mono">3004</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.taxableAmount)}</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.cgstTotal)}</td>
                        <td className="py-1 text-right">₹{safeToFixed(invoice.sgstTotal)}</td>
                        <td className="py-1 text-right font-bold">₹{safeToFixed(invoice.totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Summary Card */}
                <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal Gross:</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.subtotal)}</span>
                  </div>
                  {invoice.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Total Savings / Discount:</span>
                      <span className="font-semibold">-₹{safeToFixed(invoice.totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">Taxable Value:</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">CGST + SGST:</span>
                    <span className="font-semibold text-slate-900">₹{safeToFixed(invoice.totalTax)}</span>
                  </div>
                  {invoice.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Round Off:</span>
                      <span>{invoice.roundOff > 0 ? `+₹${safeToFixed(invoice.roundOff)}` : `-₹${safeToFixed(Math.abs(invoice.roundOff || 0))}`}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-2 flex justify-between items-center">
                    <span className="text-sm font-black text-slate-950 uppercase">Grand Total:</span>
                    <span className="text-base font-black text-teal-700">₹{safeToFixed(invoice.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Statutory Terms & Signature Block */}
              <div className="border-t border-slate-300 pt-4 grid grid-cols-2 gap-4 text-[10px] text-slate-600">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Terms & Conditions:</h4>
                  <ul className="list-disc pl-4 space-y-0.5 text-[9px]">
                    <li>Medicines once sold will not be accepted back without original cash invoice.</li>
                    <li>Restricted Schedule drugs dispensed strictly against prescription of RMP.</li>
                    <li>Consult prescribing doctor before changing medicine dosage or regimen.</li>
                  </ul>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <div className="mb-8 font-semibold text-slate-800">For {orgName}</div>
                  <div className="text-[10px] font-bold text-slate-900 border-t border-slate-300 inline-block pt-1 ml-auto w-48 text-center">
                    Registered Pharmacist Signature
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500">
            Invoice permanent document ID: <code className="font-mono text-slate-700 dark:text-slate-300">{invoice.id}</code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-semibold transition-colors"
          >
            Done & Start New Bill
          </button>
        </div>
      </div>
    </div>
  );
};
