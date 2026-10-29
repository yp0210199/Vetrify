import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { DestructionRecord } from '../../types/firestore';
import { Printer, Flame, ShieldCheck, CheckCircle2, FileText } from 'lucide-react';
import { safeToFixed, formatDate } from '../../lib/formatting/formatters';

interface DestructionCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DestructionRecord | null;
  storeName?: string;
  storeAddress?: string;
}

export const DestructionCertificateModal: React.FC<DestructionCertificateModalProps> = ({
  isOpen,
  onClose,
  record,
  storeName = 'Vetrify Showroom & Central Godown',
  storeAddress = 'Plot 45, Marble & Tile Market, Ring Road, Hyderabad, Telangana',
}) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Damaged Stock & Scrap Disposal Certificate" size="lg">
      <div className="space-y-6">
        <div className="flex justify-end gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="w-4 h-4" />
            Print Certificate
          </Button>
        </div>

        {/* Printable Canvas */}
        <div className="bg-white border-2 border-slate-800 p-8 rounded-lg text-slate-800 text-xs font-sans print:border-none print:p-0">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
            <div className="flex justify-center mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700">
                <Flame className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">{storeName}</h1>
            <p className="text-slate-600 text-[11px] mt-0.5">{storeAddress}</p>
            <div className="mt-3 inline-block px-4 py-1 bg-[#0B1F33] text-white font-bold uppercase tracking-wider text-xs rounded-full">
              Certificate of Damaged Stock & Breakage Scrap Disposal
            </div>
          </div>

          {/* Certificate Metadata */}
          <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Certificate Number</p>
              <p className="font-mono text-sm font-bold text-slate-900">{record.certificateNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500">Disposal Reference</p>
              <p className="font-mono text-sm font-bold text-slate-900">{record.destructionNumber}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500">Disposal Date</p>
              <p className="font-medium text-slate-800">{record.destructionDate || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-slate-500">Status</p>
              <p className="font-bold text-emerald-700 uppercase">{record.status.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {/* Item Details Table */}
          <div className="mb-6">
            <table className="w-full border-collapse border border-slate-300 text-left text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300">
                  <th className="p-2.5 font-bold border-r border-slate-300">Item / Model Name</th>
                  <th className="p-2.5 font-bold border-r border-slate-300">Lot / Shade No</th>
                  <th className="p-2.5 font-bold border-r border-slate-300">Mfg / Date</th>
                  <th className="p-2.5 font-bold text-right border-r border-slate-300">Scrap Qty</th>
                  <th className="p-2.5 font-bold text-right border-r border-slate-300">Purchase Val</th>
                  <th className="p-2.5 font-bold text-right">Total Loss</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2.5 font-semibold border-r border-slate-300">{record.productName}</td>
                  <td className="p-2.5 font-mono border-r border-slate-300">{record.batchNumber}</td>
                  <td className="p-2.5 border-r border-slate-300">{record.expiryDate || 'N/A'}</td>
                  <td className="p-2.5 text-right font-bold border-r border-slate-300">{record.quantity}</td>
                  <td className="p-2.5 text-right font-mono border-r border-slate-300">₹{safeToFixed(record.purchasePrice, 2)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-red-600">₹{safeToFixed(record.totalValuation, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Destruction Method & Protocol */}
          <div className="mb-6 space-y-2 text-xs">
            <div className="flex gap-2">
              <span className="font-bold text-slate-700 w-36">Disposal Method:</span>
              <span className="capitalize font-medium text-slate-900">{record.destructionMethod.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-slate-700 w-36">Reason for Scrap:</span>
              <span className="text-slate-900">{record.reason}</span>
            </div>
            {record.notes && (
              <div className="flex gap-2">
                <span className="font-bold text-slate-700 w-36">Surveyor Notes:</span>
                <span className="text-slate-700 italic">{record.notes}</span>
              </div>
            )}
          </div>

          {/* Statutory Declaration */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 mb-8 leading-relaxed">
            <span className="font-bold">Inventory Scrap Audit Affirmation:</span> We hereby certify that the tile slabs, sanitaryware ceramics, or building materials enumerated above were rendered unserviceable due to transit impact breakage, surface defects, chips, or chemical curing expiry, and have been surveyed and written off in accordance with standard inventory scrap accounting and GST ITC reversal requirements.
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-400 text-center text-xs">
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
                <span className="font-medium text-slate-800">{record.requestedByName || 'Godown In-Charge'}</span>
              </div>
              <p className="font-bold text-slate-900">Surveyed & Logged By</p>
              <p className="text-[10px] text-slate-500">Yard / Godown In-Charge</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
                <span className="font-medium text-slate-800">{record.witnessedByName || 'Quality Inspector'}</span>
              </div>
              <p className="font-bold text-slate-900">Witnessed By</p>
              <p className="text-[10px] text-slate-500">{record.witnessedByDesignation || 'Quality Officer / Witness'}</p>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-slate-400 mb-2 flex items-end justify-center pb-1">
                <span className="font-medium text-slate-800">{record.approvedByName || 'Showroom Manager'}</span>
              </div>
              <p className="font-bold text-slate-900">Authorized Signatory</p>
              <p className="text-[10px] text-slate-500">Showroom / Business Head</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DestructionCertificateModal;
