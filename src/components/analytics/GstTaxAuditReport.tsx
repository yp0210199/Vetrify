import React from 'react';
import { HsnTaxAuditRow } from '../../types/analytics';
import { Download, ReceiptText } from 'lucide-react';

interface GstTaxAuditReportProps {
  rows: HsnTaxAuditRow[];
}

export const GstTaxAuditReport: React.FC<GstTaxAuditReportProps> = ({ rows }) => {
  const totalTaxable = rows.reduce((s, r) => s + r.taxableValue, 0);
  const totalCgst = rows.reduce((s, r) => s + r.cgstAmount, 0);
  const totalSgst = rows.reduce((s, r) => s + r.sgstAmount, 0);
  const totalTax = rows.reduce((s, r) => s + r.totalTax, 0);

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const headers = ['HSN Code', 'Description', 'GST Rate (%)', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Total Invoice Amount'];
    const csvRows = rows.map((r) => [
      `"${r.hsnCode}"`,
      `"${r.description}"`,
      r.gstRate,
      r.taxableValue,
      r.cgstAmount,
      r.sgstAmount,
      r.igstAmount,
      r.totalTax,
      r.totalInvoiceAmount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vetrify_hsn_tax_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">HSN-wise GST Audit Summary</h3>
          <p className="text-[11px] text-slate-500">Statutory tax reconciliation for GSTR-1 & GSTR-3B monthly ceramic returns</p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Download GST CSV</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
              <th className="py-3 px-4">HSN Code</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">GST Rate</th>
              <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
              <th className="py-3 px-4 text-right">CGST (₹)</th>
              <th className="py-3 px-4 text-right">SGST (₹)</th>
              <th className="py-3 px-4 text-right">Total Tax (₹)</th>
              <th className="py-3 px-4 text-right">Gross Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                  No tax records found for the selected period.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.hsnCode}_${row.gstRate}`} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{row.hsnCode}</td>
                  <td className="py-3 px-4 font-sans text-slate-700">{row.description}</td>
                  <td className="py-3 px-4 text-center text-slate-700">{row.gstRate}%</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ₹{row.taxableValue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    ₹{row.cgstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    ₹{row.sgstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 font-bold">
                    ₹{row.totalTax.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-900 font-bold">
                    ₹{row.totalInvoiceAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 font-mono font-bold text-slate-900 border-t-2 border-slate-200">
                <td colSpan={3} className="py-3 px-4 font-sans uppercase text-[11px]">
                  Total Statutory Tax Liability
                </td>
                <td className="py-3 px-4 text-right">₹{totalTaxable.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{totalCgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{totalSgst.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-emerald-700">₹{totalTax.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right">₹{(totalTaxable + totalTax).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
