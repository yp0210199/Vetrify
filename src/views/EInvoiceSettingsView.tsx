import React, { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  ShieldCheck,
  QrCode,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Copy,
  Printer,
  X,
  FileCheck,
  Send,
  Download,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { gstService } from '../services/gstService';
import { analyticsService } from '../services/analyticsService';
import { EInvoiceConfiguration, EInvoiceRecord, EWayBillRecord } from '../types/gst';
import { SaleInvoice } from '../types/firestore';
import { HsnTaxAuditRow } from '../types/analytics';
import { useToast } from '../context/ToastContext';

export const EInvoiceSettingsView: React.FC = () => {
  const { organization, firestoreUser, currentStore } = useWorkspace();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<'config' | 'irn_console' | 'eway_bills' | 'hsn_audit'>('config');
  const [config, setConfig] = useState<EInvoiceConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);

  // IRN & Invoices State
  const [invoices, setInvoices] = useState<SaleInvoice[]>([]);
  const [einvoices, setEinvoices] = useState<EInvoiceRecord[]>([]);
  const [ewaybills, setEwaybills] = useState<EWayBillRecord[]>([]);
  const [hsnRows, setHsnRows] = useState<HsnTaxAuditRow[]>([]);

  // Selected IRN for QR Code Modal
  const [selectedEinvForQr, setSelectedEinvForQr] = useState<EInvoiceRecord | null>(null);
  const [cancelEinvModal, setCancelEinvModal] = useState<EInvoiceRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<'1' | '2' | '3' | '4'>('2');
  const [cancelRemarks, setCancelRemarks] = useState('');

  // E-Way Bill Creation Modal
  const [isEwayModalOpen, setIsEwayModalOpen] = useState(false);
  const [selectedInvoiceForEwb, setSelectedInvoiceForEwb] = useState<SaleInvoice | null>(null);
  const [ewbVehicleNumber, setEwbVehicleNumber] = useState('');
  const [ewbDistanceKm, setEwbDistanceKm] = useState(65);
  const [ewbTransporterName, setEwbTransporterName] = useState('Local Ceramic Transport / Tempo');
  const [ewbTransporterId, setEwbTransporterId] = useState('');
  const [ewbFromPincode, setEwbFromPincode] = useState('110001');
  const [ewbToPincode, setEwbToPincode] = useState('110034');
  const [isGeneratingEwb, setIsGeneratingEwb] = useState(false);

  // Load Initial Configuration and Datasets
  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    try {
      const [conf, invList, einvList, ewbList, hsnList] = await Promise.all([
        gstService.getEInvoiceConfig(organization.id).catch((err) => {
          console.warn('Failed to fetch eInvoice config:', err);
          return null;
        }),
        analyticsService.getInvoices(organization.id, currentStore?.id).catch((err) => {
          console.warn('Failed to fetch invoices:', err);
          return [] as SaleInvoice[];
        }),
        gstService.getEInvoices(organization.id).catch((err) => {
          console.warn('Failed to fetch einvoices:', err);
          return [] as EInvoiceRecord[];
        }),
        gstService.getEWayBills(organization.id).catch((err) => {
          console.warn('Failed to fetch ewaybills:', err);
          return [] as EWayBillRecord[];
        }),
        analyticsService.getHsnTaxAudit(organization.id, currentStore?.id).catch((err) => {
          console.warn('Failed to fetch HSN audit data:', err);
          return [] as HsnTaxAuditRow[];
        }),
      ]);

      if (conf) {
        setConfig(conf);
      } else {
        setConfig({
          id: '',
          organizationId: organization.id,
          legalName: organization.name || 'Royal Ceramics & Sanitaryware LLP',
          gstin: organization.gstin || '07AABCR1234F1Z5',
          pan: (organization.gstin || 'AABCR1234F').slice(2, 12),
          taxpayerType: 'REGULAR',
          aggregateTurnover: 50000000,
          eInvoiceApplicable: true,
          defaultIRPProvider: 'NIC',
          apiEnvironment: 'SANDBOX',
          enableEInvoiceGeneration: true,
          enableEWayBill: true,
          financialYear: '2024-2025',
          updatedAt: null as any,
          updatedBy: '',
        });
      }

      setInvoices(invList);
      setEinvoices(einvList);
      setEwaybills(ewbList);
      setHsnRows(hsnList);
    } catch (err: any) {
      console.error('Failed to load GST data:', err);
      toastError('Failed to load e-invoice configurations');
    } finally {
      setLoading(false);
    }
  }, [organization?.id, organization?.name, organization?.gstin, currentStore?.id, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Configuration
  const handleSaveConfig = async () => {
    if (!organization?.id || !firestoreUser?.uid || !config) return;
    setSaving(true);
    try {
      await gstService.saveEInvoiceConfig(organization.id, config, firestoreUser.uid);
      success('E-Invoice & GST Configuration updated successfully!');
    } catch (err: any) {
      toastError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Test Connection to IRP Gateway
  const handleTestConnection = async () => {
    if (!config) return;
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      const res = await gstService.testIRPConnection(config);
      setConnectionTestResult(res);
      if (res.success) {
        success(res.message);
      } else {
        toastError(res.message);
      }
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        latencyMs: 0,
        message: err.message || 'Failed to connect to IRP gateway',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // Generate IRN for Invoice
  const handleGenerateIrn = async (inv: SaleInvoice) => {
    if (!organization?.id || !firestoreUser?.uid || !config) return;
    try {
      const newEinv = await gstService.generateIRN(
        organization.id,
        {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName || 'Accountant',
        },
        {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: new Date().toISOString().slice(0, 10),
          supplierGstin: config.gstin || '07AABCR1234F1Z5',
          customerGstin: (inv as any).customerGstin || '07AABCC5678G1Z2',
          customerName: inv.customerName,
          taxableAmount: inv.taxableAmount,
          totalTax: inv.totalTax,
          grandTotal: inv.grandTotal,
          storeId: inv.storeId,
        }
      );
      success(`IRN Generated for Invoice #${inv.invoiceNumber}!`);
      setSelectedEinvForQr(newEinv);
      loadData();
    } catch (err: any) {
      toastError(err.message || 'IRN Generation failed');
    }
  };

  // Cancel IRN
  const handleCancelIrnSubmit = async () => {
    if (!organization?.id || !firestoreUser?.uid || !cancelEinvModal) return;
    try {
      await gstService.cancelIRN(
        organization.id,
        {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName || 'Accountant',
        },
        cancelEinvModal.id,
        cancelReason,
        cancelRemarks
      );
      success(`IRN for ${cancelEinvModal.documentNumber} successfully cancelled.`);
      setCancelEinvModal(null);
      setCancelRemarks('');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Failed to cancel IRN');
    }
  };

  // Generate E-Way Bill
  const handleGenerateEWayBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization?.id || !firestoreUser?.uid || !selectedInvoiceForEwb) return;
    setIsGeneratingEwb(true);
    try {
      const matchingEinv = einvoices.find((ei) => ei.sourceId === selectedInvoiceForEwb.id);
      const ewb = await gstService.generateEWayBill(
        organization.id,
        {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName || 'Yard Dispatcher',
        },
        {
          irn: matchingEinv?.irn,
          invoiceNumber: selectedInvoiceForEwb.invoiceNumber,
          invoiceDate: new Date().toISOString().slice(0, 10),
          vehicleNumber: ewbVehicleNumber,
          vehicleType: 'REGULAR',
          transporterName: ewbTransporterName,
          transporterId: ewbTransporterId,
          distanceKm: ewbDistanceKm,
          supplyType: 'B2B',
          fromPincode: ewbFromPincode,
          toPincode: ewbToPincode,
          storeId: selectedInvoiceForEwb.storeId,
        }
      );
      success(`E-Way Bill #${ewb.ewayBillNumber} created for ${selectedInvoiceForEwb.invoiceNumber}!`);
      setIsEwayModalOpen(false);
      setEwbVehicleNumber('');
      loadData();
    } catch (err: any) {
      toastError(err.message || 'Failed to generate E-Way bill');
    } finally {
      setIsGeneratingEwb(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0D5C63] mb-2" />
        <span>Loading E-Invoice Gateway and GST Compliance Center...</span>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ReceiptText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">
              E-Invoice & GST Compliance Center
            </h1>
          </div>
          <p className="text-xs text-slate-400 pl-9">
            Govt IRP gateway integration, 64-char IRN hash generation, signed QR codes, E-Way bills, and HSN 6907 tax audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-600/40 text-emerald-400 text-xs font-mono font-bold rounded-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            IRP Environment: {config.apiEnvironment}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'config'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>IRP Configuration & Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('irn_console')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'irn_console'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-4 h-4 text-[#0D5C63]" />
          <span>B2B IRN Console ({einvoices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('eway_bills')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'eway_bills'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4 text-blue-600" />
          <span>E-Way Bill Vehicle Dispatch ({ewaybills.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hsn_audit')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'hsn_audit'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ReceiptText className="w-4 h-4 text-amber-600" />
          <span>HSN 6907 Tax Reconciliation</span>
        </button>
      </div>

      {/* TAB 1: IRP CONFIGURATION */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
          <div>
            <h3 className="text-sm font-bold text-slate-900">GSTIN Legal Profile & IRP Provider</h3>
            <p className="text-xs text-slate-500">
              Configure credentials for National Informatics Centre (NIC) or ClearTax GSP gateway.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Legal Trade Name (as per GST)</label>
              <input
                type="text"
                value={config.legalName}
                onChange={(e) => setConfig({ ...config, legalName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
              <input
                type="text"
                value={config.gstin}
                onChange={(e) => setConfig({ ...config, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">PAN</label>
              <input
                type="text"
                value={config.pan}
                onChange={(e) => setConfig({ ...config, pan: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Taxpayer Type</label>
              <select
                value={config.taxpayerType}
                onChange={(e) => setConfig({ ...config, taxpayerType: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="REGULAR">Regular GST Dealer</option>
                <option value="COMPOSITION">Composition Scheme</option>
                <option value="SEZ">Special Economic Zone (SEZ)</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Selected IRP Gateway Provider</label>
              <select
                value={config.defaultIRPProvider}
                onChange={(e) => setConfig({ ...config, defaultIRPProvider: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="NIC">NIC (National Informatics Centre - Govt Portal)</option>
                <option value="ClearTax">ClearTax Enterprise GSP API</option>
                <option value="Cygnet">Cygnet Infotech GSP</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">API Environment</label>
              <select
                value={config.apiEnvironment}
                onChange={(e) => setConfig({ ...config, apiEnvironment: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
              >
                <option value="SANDBOX">Sandbox / UAT Testing</option>
                <option value="PRODUCTION">Production (Live Govt IRP Server)</option>
              </select>
            </div>
          </div>

          {/* Test Connection Banner */}
          {connectionTestResult && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                connectionTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {connectionTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                )}
                <span>{connectionTestResult.message}</span>
              </div>
              <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200">
                {connectionTestResult.latencyMs}ms
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Testing Gateway...' : 'Ping IRP Gateway'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: B2B IRN GENERATION CONSOLE */}
      {activeTab === 'irn_console' && (
        <div className="space-y-6">
          {/* Generated IRN Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Signed E-Invoices (IRN Archive)</h3>
                <p className="text-[11px] text-slate-500">Government validated tax invoices with 64-character hash</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Ack # & Date</th>
                    <th className="py-3 px-4">IRN Hash (64-Char)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {einvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-sans">
                        No E-Invoices generated yet. Select an eligible invoice below to generate an IRN.
                      </td>
                    </tr>
                  ) : (
                    einvoices.map((ei) => (
                      <tr key={ei.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{ei.documentNumber}</td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{ei.acknowledgementNumber}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{ei.acknowledgementDate}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="bg-slate-100 px-2 py-1 rounded text-[10px] truncate max-w-xs block">
                            {ei.irn}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ei.status === 'GENERATED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ei.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              type="button"
                              onClick={() => setSelectedEinvForQr(ei)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR View</span>
                            </button>
                            {ei.status === 'GENERATED' && (
                              <button
                                type="button"
                                onClick={() => setCancelEinvModal(ei)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Unregistered Invoices Eligible for IRN */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Sales Invoices Eligible for E-Invoicing</h3>
                <p className="text-[11px] text-slate-500">Click Generate IRN to submit invoice payload to IRP</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4 text-right">Taxable Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                    <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                    <th className="py-3 px-4 text-right">IRN Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sales invoices found. Create an invoice in Retail POS or Wholesale view first.
                      </td>
                    </tr>
                  ) : (
                    invoices.slice(0, 15).map((inv) => {
                      const hasEinv = einvoices.some((ei) => ei.sourceId === inv.id);

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{inv.customerName}</td>
                          <td className="py-3 px-4 text-right font-mono">₹{inv.taxableAmount.toLocaleString('en-IN')}</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            ₹{inv.totalTax.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            ₹{inv.grandTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {hasEinv ? (
                              <span className="text-emerald-700 font-bold flex items-center justify-end gap-1 text-[11px]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                IRN Active
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleGenerateIrn(inv)}
                                className="px-3 py-1.5 bg-[#0D5C63] hover:bg-[#094146] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                              >
                                Generate IRN
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: E-WAY BILL VEHICLE DISPATCH */}
      {activeTab === 'eway_bills' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Delivery E-Way Bills (Part-A / Part-B)</h3>
                <p className="text-[11px] text-slate-500">Official transit pass for ceramic slab movement exceeding ₹50,000</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (invoices.length === 0) {
                    toastError('Create a sales invoice first to generate an E-Way bill.');
                    return;
                  }
                  setSelectedInvoiceForEwb(invoices[0]);
                  setIsEwayModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>New E-Way Bill</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">EWB Number</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Vehicle #</th>
                    <th className="py-3 px-4">Route Distance</th>
                    <th className="py-3 px-4">Valid Upto</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ewaybills.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                        No E-Way bills generated yet. Click 'New E-Way Bill' to generate dispatch slips.
                      </td>
                    </tr>
                  ) : (
                    ewaybills.map((ewb) => (
                      <tr key={ewb.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 font-bold text-slate-900">{ewb.ewayBillNumber}</td>
                        <td className="py-3 px-4 text-slate-800">{ewb.invoiceNumber}</td>
                        <td className="py-3 px-4 font-bold text-slate-700 bg-slate-50 rounded">
                          {ewb.vehicleNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-sans">{ewb.distanceKm} KM</td>
                        <td className="py-3 px-4 text-slate-600">{ewb.validUpto}</td>
                        <td className="py-3 px-4 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {ewb.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HSN 6907 TAX RECONCILIATION */}
      {activeTab === 'hsn_audit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">HSN 6907 Ceramic Tax Audit</h3>
                <p className="text-[11px] text-slate-500">Summary table for GSTR-1 Table 12 HSN outward supplies</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <th className="py-3 px-4">HSN Code</th>
                    <th className="py-3 px-4">Material Category</th>
                    <th className="py-3 px-4 text-center">GST Rate</th>
                    <th className="py-3 px-4 text-right">Taxable Value (₹)</th>
                    <th className="py-3 px-4 text-right">CGST (₹)</th>
                    <th className="py-3 px-4 text-right">SGST (₹)</th>
                    <th className="py-3 px-4 text-right">Total Tax (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {hsnRows.map((r) => (
                    <tr key={`${r.hsnCode}_${r.gstRate}`} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{r.hsnCode}</td>
                      <td className="py-3 px-4 font-sans text-slate-700">{r.description}</td>
                      <td className="py-3 px-4 text-center">{r.gstRate}%</td>
                      <td className="py-3 px-4 text-right font-bold">₹{r.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{r.cgstAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right text-slate-600">₹{r.sgstAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹{r.totalTax.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Preview Modal */}
      {selectedEinvForQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Signed IRP QR Code
              </h3>
              <button
                type="button"
                onClick={() => setSelectedEinvForQr(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
              {/* Visual Simulated QR Grid */}
              <div className="w-44 h-44 bg-white p-3 rounded-xl border border-slate-300 shadow-xs flex items-center justify-center">
                <div className="w-full h-full border-4 border-slate-900 rounded p-1 flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-slate-900 rounded-sm" />
                    <div className="w-8 h-8 bg-slate-900 rounded-sm" />
                  </div>
                  <div className="text-[9px] font-mono font-bold text-center text-slate-800 break-all p-1">
                    GST-EINV-QR
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-slate-900 rounded-sm" />
                    <div className="w-4 h-4 bg-slate-900 rounded-sm self-end" />
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono mt-3 text-center">
                Ack #{selectedEinvForQr.acknowledgementNumber} • {selectedEinvForQr.acknowledgementDate}
              </p>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 block text-[10px] uppercase">
                Statutory 64-character IRN:
              </label>
              <div className="p-2.5 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-800 break-all border border-slate-200">
                {selectedEinvForQr.irn}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEinvForQr(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel IRN Modal */}
      {cancelEinvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Cancel IRN</h3>
              <button
                type="button"
                onClick={() => setCancelEinvModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium"
                >
                  <option value="1">1 - Duplicate Invoice Generation</option>
                  <option value="2">2 - Data Entry Mistake in Price/Quantity</option>
                  <option value="3">3 - Order Cancelled by Contractor</option>
                  <option value="4">4 - Other Statutory Grounds</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cancellation Remarks</label>
                <input
                  type="text"
                  placeholder="Enter remarks..."
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelEinvModal(null)}
                className="px-4 py-2 text-slate-600 font-bold rounded-xl text-xs"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleCancelIrnSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New E-Way Bill Modal */}
      {isEwayModalOpen && selectedInvoiceForEwb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Dispatch Ceramic Materials (E-Way Bill)
              </h3>
              <button
                type="button"
                onClick={() => setIsEwayModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateEWayBill} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Sales Invoice</label>
                <select
                  value={selectedInvoiceForEwb.id}
                  onChange={(e) => {
                    const found = invoices.find((inv) => inv.id === e.target.value);
                    if (found) setSelectedInvoiceForEwb(found);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono"
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} • {inv.customerName} (₹{inv.grandTotal.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Number (e.g. DL1LAA1234)</label>
                  <input
                    type="text"
                    placeholder="DL01AB1234"
                    value={ewbVehicleNumber}
                    onChange={(e) => setEwbVehicleNumber(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transit Distance (KM)</label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={ewbDistanceKm}
                    onChange={(e) => setEwbDistanceKm(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Pincode (Yard)</label>
                  <input
                    type="text"
                    value={ewbFromPincode}
                    onChange={(e) => setEwbFromPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Pincode (Site)</label>
                  <input
                    type="text"
                    value={ewbToPincode}
                    onChange={(e) => setEwbToPincode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transporter / Tempo Service Name</label>
                <input
                  type="text"
                  value={ewbTransporterName}
                  onChange={(e) => setEwbTransporterName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEwayModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingEwb}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs"
                >
                  {isGeneratingEwb ? 'Generating Pass...' : 'Generate 12-digit E-Way Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
