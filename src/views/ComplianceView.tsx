import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  ShieldAlert,
  User,
  Activity,
  FileText,
  Clock,
  Eye,
  ExternalLink,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { prescriptionService } from '../services/prescriptionService';
import { useWorkspace } from '../context/WorkspaceContext';
import { ScheduleH1RegisterEntry } from '../types';

// Self-contained high-fidelity date formatter
const formatDate = (dateInput: any, pattern?: string) => {
  if (!dateInput) return '';
  const date = typeof dateInput.toDate === 'function' ? dateInput.toDate() : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  if (pattern === 'dd/MM/yyyy') {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }
  
  if (pattern === 'yyyy-MM-dd HH:mm') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hr = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hr}:${min}`;
  }

  if (pattern === 'yyyy-MM-dd') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // default pattern: 'dd MMM yyyy, HH:mm'
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear();
  const hr = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${m} ${y}, ${hr}:${min}`;
};

export const ComplianceView: React.FC = () => {
  const { organization, currentStore, stores } = useWorkspace();
  const [entries, setEntries] = useState<ScheduleH1RegisterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<ScheduleH1RegisterEntry | null>(null);

  useEffect(() => {
    fetchRegisterEntries();
  }, [organization?.id, currentStore?.id, selectedStoreId]);

  const fetchRegisterEntries = async () => {
    if (!organization?.id) return;
    setIsLoading(true);
    try {
      const storeIdFilter = selectedStoreId || currentStore?.id || undefined;
      const data = await prescriptionService.getScheduleH1RegisterEntries(
        organization.id,
        storeIdFilter
      );
      setEntries(data);
    } catch (err) {
      console.error('Failed to fetch statutory compliance register:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = [
      'Date',
      'Tax Invoice No',
      'Customer / Client Name',
      'Contact',
      'Contractor / Architect / Site',
      'Material / Item Name',
      'HSN / Category',
      'Lot / Shade Batch',
      'Quantity (Boxes/Units)',
      'Authorized Officer',
      'Audit Reference'
    ];

    const rows = filteredEntries.flatMap((entry) =>
      entry.items.map((item) => [
        entry.createdAt ? formatDate(entry.createdAt, 'yyyy-MM-dd HH:mm') : '',
        entry.invoiceNumber,
        entry.patientName || 'Walk-in Customer',
        entry.patientPhone || '',
        entry.doctorName || 'General Project',
        item.productName,
        item.schedule || 'HSN-6907',
        item.batchNumber,
        item.quantity,
        entry.createdByName,
        entry.prescriptionUrl || 'Direct Billing'
      ])
    );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Vetrify_GST_Compliance_Register_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredEntries = entries.filter((entry) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      entry.invoiceNumber.toLowerCase().includes(q) ||
      (entry.patientName && entry.patientName.toLowerCase().includes(q)) ||
      (entry.doctorName && entry.doctorName.toLowerCase().includes(q)) ||
      (entry.doctorRegNo && entry.doctorRegNo.toLowerCase().includes(q)) ||
      entry.items.some(
        (it) =>
          it.productName.toLowerCase().includes(q) ||
          it.batchNumber.toLowerCase().includes(q)
      );

    const matchesCat =
      selectedCategory === 'ALL' ||
      entry.items.some((it) => it.schedule === selectedCategory || it.productName.toLowerCase().includes(selectedCategory.toLowerCase()));

    return matchesSearch && matchesCat;
  });

  const totalUnitsSold = entries.reduce(
    (acc, entry) => acc + entry.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const uniqueClients = new Set(entries.map((e) => e.patientName).filter(Boolean)).size;
  const uniqueSites = new Set(entries.map((e) => e.doctorName).filter(Boolean)).size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Printable Area Wrapper for Regulatory Audits */}
      <div className="print:block hidden p-8 bg-white text-black font-sans text-xs">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">{organization?.name || 'Vetrify Enterprise'}</h1>
          <p className="text-xs uppercase mt-1">
            Showroom Code: {currentStore?.code || 'MAIN-01'} | GSTIN: {organization?.gstin || 'GST Registered'}
          </p>
          <h2 className="text-xl font-bold uppercase underline mt-3">
            GST Invoicing & Lot Quality Statutory Register
          </h2>
          <p className="text-xs italic mt-1">
            [Under Central Goods & Services Tax (CGST) Act & National Quality Certification Standards]
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-1.5 text-left">Date</th>
              <th className="border border-black p-1.5 text-left">Tax Invoice No</th>
              <th className="border border-black p-1.5 text-left">Customer / Consignee</th>
              <th className="border border-black p-1.5 text-left">Site / Project Ref</th>
              <th className="border border-black p-1.5 text-left">Material & HSN</th>
              <th className="border border-black p-1.5 text-left">Lot / Shade No</th>
              <th className="border border-black p-1.5 text-center">Qty (Boxes/Units)</th>
              <th className="border border-black p-1.5 text-left">Showroom In-Charge</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.flatMap((entry) =>
              entry.items.map((item, idx) => (
                <tr key={`${entry.id}-${idx}`}>
                  <td className="border border-black p-1.5">
                    {entry.createdAt ? formatDate(entry.createdAt, 'dd/MM/yyyy') : ''}
                  </td>
                  <td className="border border-black p-1.5 font-mono">{entry.invoiceNumber}</td>
                  <td className="border border-black p-1.5">
                    {entry.patientName || 'Counter Buyer'}
                    {entry.patientPhone && <><br />Ph: {entry.patientPhone}</>}
                  </td>
                  <td className="border border-black p-1.5">
                    {entry.doctorName || 'Showroom Dispatch'}<br />Site: {entry.doctorRegNo || 'N/A'}
                  </td>
                  <td className="border border-black p-1.5 font-bold">{item.productName} ({item.schedule || 'HSN 6907'})</td>
                  <td className="border border-black p-1.5 font-mono">{item.batchNumber}</td>
                  <td className="border border-black p-1.5 text-center">{item.quantity}</td>
                  <td className="border border-black p-1.5">{entry.createdByName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-between text-xs pt-12 border-t border-dashed border-slate-400">
          <div>
            <p>Printed on: {new Date().toLocaleString()}</p>
            <p>Total Statutory Transactions: {filteredEntries.length}</p>
          </div>
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="font-bold">Authorized Showroom Signatory</p>
            <p className="text-[10px] mt-1 text-slate-500">(Stamp & Verification Code)</p>
          </div>
        </div>
      </div>

      {/* Screen Interface */}
      <div className="print:hidden space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              GST Invoicing & Lot Quality Statutory Register
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Statutory audit trails, HSN tax classifications (Tiles, Sanitaryware, CP & Adhesives), and shade/lot quality tracking.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              disabled={filteredEntries.length === 0}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-[#0066FF]" />
              Print Register
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-semibold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-[#0066FF] rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statutory Invoices</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {entries.length}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 text-[#00C9A7] rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Units Dispatched</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {totalUnitsSold}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Clients / GSTIN</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {uniqueClients}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sites / Projects</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {uniqueSites}
              </h3>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTERS PANEL */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Invoice, Client, Project, or Lot Number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Filter By:</span>
            </div>

            {/* Store Filter */}
            {stores.length > 1 && (
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">All Showroom Branches</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            )}

            {/* Category / HSN Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">All Categories & HSN</option>
              <option value="HSN 6907">Tiles & Slabs (HSN 6907)</option>
              <option value="HSN 6910">Sanitaryware (HSN 6910)</option>
              <option value="HSN 8481">Faucets & CP (HSN 8481)</option>
              <option value="HSN 3214">Tile Adhesive & Grout (HSN 3214)</option>
            </select>
          </div>
        </div>

        {/* REGISTER TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Statutory Register Entry Records
            </h4>
            <span className="text-xs font-semibold text-[#0066FF] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full">
              {filteredEntries.length} Records Found
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-[#0066FF] animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading statutory compliance trails...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center max-w-md mx-auto space-y-2">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full w-fit mx-auto">
                <ShieldAlert className="w-6 h-6 text-[#0066FF]" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No statutory compliance entries recorded yet
              </p>
              <p className="text-xs text-slate-500">
                Transactions processed through Showroom Billing POS or Wholesale Invoicing will automatically generate permanent audit records here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Tax Invoice No</th>
                    <th className="p-4">Customer / Consignee</th>
                    <th className="p-4">Site / Project Reference</th>
                    <th className="p-4">Materials & Shade Lot</th>
                    <th className="p-4">Showroom In-Charge</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredEntries.map((entry) => {
                    const formattedDate = formatDate(entry.createdAt);

                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formattedDate}
                          </div>
                        </td>
                        <td className="p-4 font-bold text-[#0066FF] font-mono">
                          {entry.invoiceNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {entry.patientName || 'Direct Counter Sale'}
                          </div>
                          {entry.patientPhone && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Ph: {entry.patientPhone}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {entry.doctorName || 'General Site'}
                          </div>
                          {entry.doctorRegNo && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Ref: {entry.doctorRegNo}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            {entry.items.map((item, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-[11px] bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800 w-fit"
                              >
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {item.productName}
                                </span>
                                <span className="text-[9px] px-1 rounded font-extrabold bg-[#0066FF] text-white">
                                  {item.schedule || '6907'}
                                </span>
                                <span className="text-slate-400">|</span>
                                <span className="font-mono text-slate-500">Lot: {item.batchNumber}</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-slate-600 dark:text-slate-400">Qty: {item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          <div className="font-semibold">{entry.createdByName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">UID: {entry.createdByUid.slice(0, 8)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedEntry(entry)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="View compliance audit details"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DETAILED MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-[#0066FF]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0066FF]" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Statutory Tax & Batch Audit Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col md:flex-row gap-6">
              {/* Left Panel: invoice/dispatch document */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[300px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 w-full flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0066FF]" />
                  Attached Document / E-Way Bill Record
                </h4>
                {selectedEntry.prescriptionUrl ? (
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow bg-white flex-1 flex items-center justify-center w-full max-h-[50vh]">
                    <img
                      src={selectedEntry.prescriptionUrl}
                      alt="Verified invoice document"
                      className="max-h-full max-w-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                    <a
                      href={selectedEntry.prescriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2.5 right-2.5 px-3 py-1 bg-slate-900/80 hover:bg-slate-950 text-white text-[11px] font-bold rounded-lg flex items-center gap-1"
                    >
                      Open in new tab <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-400 space-y-2 flex-1 flex flex-col items-center justify-center">
                    <FileText className="w-12 h-12 text-[#0066FF]/40" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Point of Sale Automated Entry</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      This entry was validated automatically upon invoice completion at showroom billing terminal with digital tax hash.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Panel: digital metadata fields */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Customer / Consignee Details
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Customer / Client</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEntry.patientName || 'Counter Buyer'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Contact Phone</p>
                      <p className="text-sm font-semibold">{selectedEntry.patientPhone || 'Direct Store'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Project / Architect / Contractor Reference
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Site Reference</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEntry.doctorName || 'Direct Billing'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Reference Code / PO</p>
                      <p className="text-sm font-mono font-bold text-[#0066FF]">{selectedEntry.doctorRegNo || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Material Lots & Tax Classifications
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold">INVOICE:</span>{' '}
                        <span className="font-bold text-[#0066FF] font-mono">{selectedEntry.invoiceNumber}</span>
                      </div>
                      <div className="text-slate-500">
                        {selectedEntry.createdAt ? formatDate(selectedEntry.createdAt, 'yyyy-MM-dd') : ''}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {selectedEntry.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                              {item.productName}
                              <span className="text-[8px] font-extrabold px-1 rounded bg-[#0066FF] text-white">
                                {item.schedule || 'HSN-6907'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Lot/Shade: {item.batchNumber}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#0066FF]">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Authorized Verification Record
                  </h4>
                  <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/50 p-3 rounded-xl flex items-center gap-3 text-xs text-teal-800 dark:text-teal-400">
                    <ShieldCheck className="w-6 h-6 text-[#00C9A7] shrink-0" />
                    <div>
                      <p className="font-bold">Digitally Logged by {selectedEntry.createdByName}</p>
                      <p className="text-[10px] text-teal-700/80 mt-0.5">
                        Staff UID: {selectedEntry.createdByUid} | Statutory Permanent Tax & Lot Audit Trail
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-150 bg-slate-50 dark:bg-slate-900 text-right">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplianceView;
