import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CreditNote, SalesReturn } from '../../types/firestore';
import { Printer, Download, Receipt, CheckCircle } from 'lucide-react';
import { safeToFixed } from '../../lib/formatting/formatters';

interface CreditNotePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: CreditNote | null;
  salesReturn?: SalesReturn | null;
  storeName?: string;
  storeGstin?: string;
  storeAddress?: string;
}

export function CreditNotePrintModal({
  isOpen,
  onClose,
  creditNote,
  salesReturn,
  storeName = 'Vetrify Branch',
  storeGstin = '36ABCDE1234F1Z5',
  storeAddress = '12-4-567, Healthcare Plaza, Jubilee Hills, Hyderabad, Telangana',
}: CreditNotePrintModalProps) {
  if (!creditNote) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statutory Credit Note" size="lg">
      <div className="space-y-6">
        <div className="flex justify-end gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print Credit Note
          </Button>
        </div>

        {/* Printable Credit Note Canvas */}
        <div className="bg-white border border-slate-300 p-6 rounded-lg text-slate-800 text-xs font-sans print:border-none print:p-0">
          {/* Header */}
          <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-wider text-slate-900">{storeName}</h2>
              <p className="text-slate-600 text-[11px] max-w-sm mt-0.5">{storeAddress}</p>
              <p className="text-slate-700 font-semibold mt-1">GSTIN: {storeGstin}</p>
            </div>
            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-slate-900 text-white font-bold uppercase tracking-wider text-xs rounded mb-1">
                Credit Note
              </span>
              <p className="font-mono text-sm font-bold text-slate-900">{creditNote.creditNoteNumber}</p>
              <p className="text-slate-500 mt-1">Date: {creditNote.issueDate || new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-200 mb-4">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Issued To Customer</p>
              <p className="font-bold text-slate-900">{creditNote.customerName || 'Walk-in Customer'}</p>
              {creditNote.customerPhone && <p className="text-slate-600">Phone: {creditNote.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Reference Sale Invoice</p>
              <p className="font-bold text-slate-900">{creditNote.originalInvoiceNumber}</p>
              <p className="text-slate-600">Return Ref: {creditNote.returnId}</p>
            </div>
          </div>

          {/* Line Items */}
          <table className="w-full text-left border-collapse border border-slate-200 mb-4 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                <th className="p-2 border-r border-slate-200">#</th>
                <th className="p-2 border-r border-slate-200">Item Description</th>
                <th className="p-2 border-r border-slate-200">Batch</th>
                <th className="p-2 border-r border-slate-200 text-center">Qty</th>
                <th className="p-2 border-r border-slate-200 text-right">Price</th>
                <th className="p-2 border-r border-slate-200 text-right">Taxable</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {creditNote.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 border-r border-slate-200 text-slate-500">{idx + 1}</td>
                  <td className="p-2 border-r border-slate-200 font-medium text-slate-900">
                    {item.productName}
                  </td>
                  <td className="p-2 border-r border-slate-200 font-mono">{item.batchNumber}</td>
                  <td className="p-2 border-r border-slate-200 text-center font-bold">{item.quantity}</td>
                  <td className="p-2 border-r border-slate-200 text-right">₹{safeToFixed(item.unitPrice)}</td>
                  <td className="p-2 border-r border-slate-200 text-right">₹{safeToFixed(item.taxableAmount)}</td>
                  <td className="p-2 text-right font-bold">₹{safeToFixed(item.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Breakdown & Total */}
          <div className="flex justify-between items-start pt-2">
            <div className="max-w-xs space-y-1">
              <p className="font-semibold text-slate-700">Reason for Credit Note:</p>
              <p className="text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
                "{creditNote.reason}"
              </p>
              <p className="text-[10px] text-slate-500 mt-2">
                Settlement Method: <span className="font-bold uppercase text-slate-800">{creditNote.refundMethod}</span>
              </p>
            </div>

            <div className="w-56 space-y-1 text-right">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>Taxable Value:</span>
                <span>₹{safeToFixed(creditNote.taxableAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>CGST:</span>
                <span>₹{safeToFixed(creditNote.cgstTotal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span>SGST:</span>
                <span>₹{safeToFixed(creditNote.sgstTotal)}</span>
              </div>
              {creditNote.roundOff !== 0 && (
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span>Round Off:</span>
                  <span>₹{safeToFixed(creditNote.roundOff)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 font-bold text-sm text-slate-900 border-t-2 border-slate-800">
                <span>Total Credit Value:</span>
                <span>₹{safeToFixed(creditNote.totalCreditAmount)}</span>
              </div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-400 uppercase">Issued By Staff</p>
              <p className="font-semibold text-slate-800">{creditNote.createdByName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase mb-6">Authorized Signatory</p>
              <p className="font-bold text-slate-900">For {storeName}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
