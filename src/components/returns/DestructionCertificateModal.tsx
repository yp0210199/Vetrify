import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DestructionRecord } from '../../types/firestore';
import { Printer, ShieldCheck, Flame, FileText } from 'lucide-react';
import { safeToFixed, formatBatchExpiryDate, formatDate } from '../../lib/formatting/formatters';

interface DestructionCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DestructionRecord | null;
  storeName?: string;
  drugLicenseNumber?: string;
  storeAddress?: string;
}

export function DestructionCertificateModal({
  isOpen,
  onClose,
  record,
  storeName = 'Vetrify Branch',
  drugLicenseNumber = 'TS/HYD/2024-2029/DL-20B-10492',
  storeAddress = '12-4-567, Healthcare Plaza, Jubilee Hills, Hyderabad, Telangana',
}: DestructionCertificateModalProps) {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statutory Drug Destruction Certificate" size="lg">
      <div className="space-y-6">
        <div className="flex justify-end gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print Certificate
          </Button>
        </div>

        {/* Certificate Printable Canvas */}
        <div className="bg-white border-2 border-slate-900 p-8 rounded-lg text-slate-800 text-xs font-sans print:border-none print:p-0">
          {/* Official Emblem Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-full mb-2">
              <ShieldCheck className="w-8 h-8 text-slate-900" />
            </div>
            <h1 className="text-xl font-extrabold uppercase tracking-widest text-slate-900">
              FORM OF STATUTORY DRUG DESTRUCTION CERTIFICATE
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">
              Issued in compliance with Drugs & Cosmetics Rules and Bio-Medical Waste Regulations
            </p>
          </div>

          {/* Certificate Registration info */}
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 mb-6 font-mono text-xs">
            <div>
              <span className="text-slate-400">Cert No:</span>{' '}
              <strong className="text-slate-900">{record.certificateNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400">Audit Ref:</span>{' '}
              <strong className="text-slate-900">{record.destructionNumber}</strong>
            </div>
            <div>
              <span className="text-slate-400">Date:</span>{' '}
              <strong className="text-slate-900">{formatDate(record.destructionDate)}</strong>
            </div>
          </div>

          {/* Pharmacy Credentials */}
          <div className="mb-6 space-y-1 bg-slate-50/50 p-3 rounded border border-slate-200">
            <p className="font-bold text-sm text-slate-900">{storeName}</p>
            <p className="text-slate-600">{storeAddress}</p>
            <p className="font-semibold text-slate-800">Drug License No: {drugLicenseNumber}</p>
          </div>

          {/* Destroyed Stock Schedule */}
          <div className="space-y-2 mb-6">
            <h3 className="font-bold uppercase text-slate-900 text-xs border-b border-slate-300 pb-1">
              Schedule of Destroyed Pharmaceutical Products
            </h3>
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 font-bold uppercase border-b border-slate-300 text-slate-700">
                  <th className="p-2 border-r border-slate-300">Product Name</th>
                  <th className="p-2 border-r border-slate-300">Batch #</th>
                  <th className="p-2 border-r border-slate-300">Expiry</th>
                  <th className="p-2 border-r border-slate-300 text-center">Destroyed Qty</th>
                  <th className="p-2 border-r border-slate-300 text-right">Unit Price</th>
                  <th className="p-2 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{record.productName}</td>
                  <td className="p-2 border-r border-slate-300 font-mono">{record.batchNumber}</td>
                  <td className="p-2 border-r border-slate-300 font-mono text-red-700 font-bold">{formatBatchExpiryDate(record.expiryDate)}</td>
                  <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-900">{record.quantity}</td>
                  <td className="p-2 border-r border-slate-300 text-right">₹{safeToFixed(record.purchasePrice)}</td>
                  <td className="p-2 text-right font-bold text-slate-900">₹{safeToFixed(record.totalValuation)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destruction Method & Justification */}
          <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-4 rounded border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Destruction Method</p>
              <p className="font-bold text-slate-900 uppercase">{record.destructionMethod.replace('_', ' ')}</p>
              <p className="text-slate-600 text-[11px] mt-1">Status: <strong className="text-emerald-700 font-bold uppercase">{record.status}</strong></p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Reason for Destruction</p>
              <p className="font-medium text-slate-800">{record.reason}</p>
            </div>
          </div>

          {/* Declaration Statement */}
          <div className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-slate-900 pl-3 mb-10">
            "I hereby certify that the pharmaceutical products listed above were physically destroyed under my direct supervision in accordance with state drug disposal protocols and environmental guidelines. The inventory batch stock cards have been permanently written off."
          </div>

          {/* Witness Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-slate-900 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Registered Pharmacist / Officer</p>
              <p className="font-bold text-slate-900 mt-6">{record.requestedByName}</p>
              <p className="text-[10px] text-slate-500">Signature & Reg. License Stamp</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Witness / Authorized Manager</p>
              <p className="font-bold text-slate-900 mt-6">{record.witnessedByName || record.approvedByName || 'Authorized Inspector'}</p>
              <p className="text-[10px] text-slate-500">{record.witnessedByDesignation || 'Quality Controller'}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
