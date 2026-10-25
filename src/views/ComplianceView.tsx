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
  const [selectedSchedule, setSelectedSchedule] = useState<string>('ALL');
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
      console.error('Failed to fetch Schedule H1 Register:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.patientPhone && entry.patientPhone.includes(searchQuery)) ||
      entry.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.doctorRegNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSchedule =
      selectedSchedule === 'ALL' ||
      entry.items.some((item) => item.schedule === selectedSchedule);

    return matchesSearch && matchesSchedule;
  });

  // Calculate high-level compliance metrics
  const totalRestrictedQty = entries.reduce(
    (acc, entry) => acc + entry.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const uniquePatients = new Set(entries.map((e) => e.patientName.toLowerCase())).size;
  const uniqueDoctors = new Set(entries.map((e) => e.doctorName.toLowerCase())).size;

  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;

    // Build CSV Content
    const headers = [
      'Register Entry ID',
      'Invoice Date',
      'Invoice Number',
      'Patient Name',
      'Patient Age',
      'Patient Gender',
      'Patient Contact',
      'Prescribing Doctor',
      'Doctor Reg No',
      'Hospital/Clinic',
      'Drug Name',
      'Schedule',
      'Batch Number',
      'Quantity Sold',
      'Expiry Date',
      'Pharmacist',
      'Prescription Link',
    ];

    const rows = filteredEntries.flatMap((entry) => {
      const formattedDate = entry.createdAt
        ? formatDate(entry.createdAt, 'yyyy-MM-dd HH:mm')
        : '';
      return entry.items.map((item) => [
        entry.id,
        formattedDate,
        entry.invoiceNumber,
        entry.patientName,
        entry.patientAge,
        entry.patientGender,
        entry.patientPhone || 'N/A',
        entry.doctorName,
        entry.doctorRegNo,
        entry.hospitalClinic || 'N/A',
        item.productName,
        item.schedule,
        item.batchNumber,
        item.quantity,
        item.expiryDate,
        entry.createdByName || 'N/A',
        entry.prescriptionUrl || 'N/A',
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Schedule_H1_Register_${organization?.name || 'Rx_Omni'}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Area Wrapper for Regulatory Audits */}
      <div className="print:block hidden p-8 bg-white text-black font-serif text-sm">
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-wider">{organization?.name}</h1>
          <p className="text-xs uppercase mt-1">
            Drug License: {currentStore?.drugLicenseNumber || 'Form 20B/21B Active'} | GSTIN: {organization?.gstin || 'GST Unregistered'}
          </p>
          <h2 className="text-xl font-bold uppercase underline mt-3">
            Schedule H1 Register of Restricted Prescription Drugs
          </h2>
          <p className="text-xs italic mt-1">
            [See Rule 65 (1) & (2) of Drugs and Cosmetics Rules, 1945]
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-1.5 text-left">Date</th>
              <th className="border border-black p-1.5 text-left">Invoice No</th>
              <th className="border border-black p-1.5 text-left">Patient Details</th>
              <th className="border border-black p-1.5 text-left">Prescribing Doctor & Reg No</th>
              <th className="border border-black p-1.5 text-left">Medicine Name</th>
              <th className="border border-black p-1.5 text-left">Batch No</th>
              <th className="border border-black p-1.5 text-left">Qty</th>
              <th className="border border-black p-1.5 text-left">Expiry</th>
              <th className="border border-black p-1.5 text-left">Pharmacist</th>
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
                    {entry.patientName} ({entry.patientAge}y/{entry.patientGender[0].toUpperCase()})
                    {entry.patientPhone && <><br />Ph: {entry.patientPhone}</>}
                  </td>
                  <td className="border border-black p-1.5">
                    {entry.doctorName}<br />Reg: {entry.doctorRegNo}
                  </td>
                  <td className="border border-black p-1.5 font-bold">{item.productName} ({item.schedule})</td>
                  <td className="border border-black p-1.5 font-mono">{item.batchNumber}</td>
                  <td className="border border-black p-1.5 text-center">{item.quantity}</td>
                  <td className="border border-black p-1.5">{item.expiryDate}</td>
                  <td className="border border-black p-1.5">{entry.createdByName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-12 flex justify-between text-xs pt-12 border-t border-dashed border-slate-400">
          <div>
            <p>Printed on: {new Date().toLocaleString()}</p>
            <p>Total Transactions logged: {filteredEntries.length}</p>
          </div>
          <div className="text-center w-64 border-t border-black pt-2">
            <p className="font-bold">Registered Pharmacist Signature</p>
            <p className="text-[10px] mt-1 text-slate-500">(Stamp & Registration Council Reg No.)</p>
          </div>
        </div>
      </div>

      {/* Screen Interface */}
      <div className="print:hidden space-y-6">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Compliance & Statutory Registers
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Audit trails, digital prescription archives, and immutability logs for Indian drug enforcement laws.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              disabled={filteredEntries.length === 0}
              className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print Register
            </button>
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="px-4 py-2 bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white text-sm font-semibold rounded-xl shadow-lg shadow-[#0D5C63]/10 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 rounded-xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">H1 Transactions</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {entries.length}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Restricted Units Sold</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {totalRestrictedQty}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 rounded-xl">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Patients</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {uniquePatients}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Unique Doctors</p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {uniqueDoctors}
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
              placeholder="Search by Patient, Doctor, Reg No, or Drug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0D5C63]"
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
                <option value="">All Branches</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            )}

            {/* Schedule Filter */}
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/85 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">All Restricted Schedules</option>
              <option value="H">Schedule H Only</option>
              <option value="H1">Schedule H1 Only</option>
              <option value="X">Schedule X Only</option>
            </select>
          </div>
        </div>

        {/* REGISTER TABLE */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Statutory Register Entry Records
            </h4>
            <span className="text-xs font-semibold text-[#0D5C63] bg-[#E6F4F1] px-2.5 py-0.5 rounded-full">
              {filteredEntries.length} Records Found
            </span>
          </div>

          {isLoading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 text-[#0D5C63] animate-spin mx-auto mb-2" />
              <p className="text-sm text-slate-500">Loading statutory compliance trails...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-16 text-center max-w-md mx-auto space-y-2">
              <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full w-fit mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No compliance entries matching filters
              </p>
              <p className="text-xs text-slate-500">
                Verify your search parameters or check if prescriptions have been uploaded and processed on checkout.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Invoice No</th>
                    <th className="p-4">Patient Parameters</th>
                    <th className="p-4">Prescribing Doctor</th>
                    <th className="p-4">Medications Sold</th>
                    <th className="p-4">Verifying Pharmacist</th>
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
                        <td className="p-4 font-bold text-[#0D5C63] font-mono">
                          {entry.invoiceNumber}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {entry.patientName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span>Age: {entry.patientAge}y</span>
                            <span>•</span>
                            <span className="capitalize">{entry.patientGender}</span>
                            {entry.patientPhone && (
                              <>
                                <span>•</span>
                                <span>{entry.patientPhone}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            {entry.doctorName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.2 rounded font-mono font-bold">
                              Reg: {entry.doctorRegNo}
                            </span>
                            {entry.hospitalClinic && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{entry.hospitalClinic}</span>
                              </>
                            )}
                          </div>
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
                                <span className="text-[9px] px-1 rounded font-extrabold bg-[#0D5C63] text-white">
                                  {item.schedule}
                                </span>
                                <span className="text-slate-400">|</span>
                                <span className="font-mono text-slate-500">Batch: {item.batchNumber}</span>
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
                            title="View digital prescription details"
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
            <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-[#0D5C63]/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0D5C63]" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Regulatory Compliance Details
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
              {/* Left Panel: prescription file details */}
              <div className="w-full md:w-1/2 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[300px]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 w-full flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#0D5C63]" />
                  Statutory Image Record
                </h4>
                {selectedEntry.prescriptionUrl ? (
                  <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow bg-white flex-1 flex items-center justify-center w-full max-h-[50vh]">
                    <img
                      src={selectedEntry.prescriptionUrl}
                      alt="Verified prescription"
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
                    <FileText className="w-12 h-12 text-slate-300" />
                    <p className="text-sm font-bold">Manual override compliance entry</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      This entry was validated manually without an accompanying uploaded file, per standard physical paper-prescription logging.
                    </p>
                  </div>
                )}
              </div>

              {/* Right Panel: digital metadata fields */}
              <div className="w-full md:w-1/2 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Patient Information
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Patient Name</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEntry.patientName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Age / Gender</p>
                      <p className="text-sm font-semibold capitalize">{selectedEntry.patientAge} years / {selectedEntry.patientGender}</p>
                    </div>
                    {selectedEntry.patientPhone && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Contact Phone</p>
                        <p className="text-sm font-semibold">{selectedEntry.patientPhone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Prescribing Doctor
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Doctor Name</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedEntry.doctorName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Reg. Number (MCI)</p>
                      <p className="text-sm font-mono font-bold text-[#0D5C63]">{selectedEntry.doctorRegNo}</p>
                    </div>
                    {selectedEntry.hospitalClinic && (
                      <div className="col-span-2">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Hospital / Clinic</p>
                        <p className="text-sm font-semibold">{selectedEntry.hospitalClinic}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Sale & Medicine Records
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5 text-xs">
                      <div>
                        <span className="text-slate-400 font-bold">INVOICE:</span>{' '}
                        <span className="font-bold text-[#0D5C63] font-mono">{selectedEntry.invoiceNumber}</span>
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
                              <span className="text-[8px] font-extrabold px-1 rounded bg-[#0D5C63] text-white">
                                {item.schedule}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Batch: {item.batchNumber} | Exp: {item.expiryDate}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-[#0D5C63]">Qty: {item.quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Pharmacist Digital Signature Verification
                  </h4>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-400">
                    <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Digitally Verified by {selectedEntry.createdByName}</p>
                      <p className="text-[10px] text-emerald-600/80 mt-0.5">
                        Verifying UID: {selectedEntry.createdByUid} | Statutory Schedule H1 Audit Trail Permanent Record
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
                Close Compliance record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
