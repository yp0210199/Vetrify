import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { gstService } from '../services/gstService';
import { EInvoiceConfiguration } from '../types/gst';

export const EInvoiceSettingsView: React.FC = () => {
  const { organization, firestoreUser } = useWorkspace();
  const [config, setConfig] = useState<EInvoiceConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organization) {
      gstService.getEInvoiceConfig(organization.id)
        .then(res => {
          if (res) setConfig(res);
          else setConfig({
            id: '',
            organizationId: organization.id,
            legalName: '',
            gstin: '',
            pan: '',
            taxpayerType: 'REGULAR',
            aggregateTurnover: 0,
            eInvoiceApplicable: false,
            defaultIRPProvider: 'NIC',
            apiEnvironment: 'SANDBOX',
            enableEInvoiceGeneration: false,
            enableEWayBill: false,
            financialYear: '2023-2024',
            updatedAt: null as any,
            updatedBy: ''
          });
        })
        .finally(() => setLoading(false));
    }
  }, [organization]);

  const handleSave = async () => {
    if (!organization || !firestoreUser || !config) return;
    setSaving(true);
    try {
      await gstService.saveEInvoiceConfig(organization.id, config, firestoreUser.uid);
      alert('E-Invoice Configuration Saved!');
    } catch (e: any) {
      alert('Failed to save config: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading configuration...</div>;
  if (!config) return <div>Failed to load configuration.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">E-Invoice & GST Configuration</h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">Legal Name</label>
            <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-50" 
              value={config.legalName}
              onChange={e => setConfig({...config, legalName: e.target.value})}
              placeholder="Legal Name as per GST"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">GSTIN</label>
            <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-50" 
              value={config.gstin}
              onChange={e => setConfig({...config, gstin: e.target.value})}
              placeholder="e.g. 29ABCDE1234F1Z5"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">PAN</label>
            <input className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-50" 
              value={config.pan}
              onChange={e => setConfig({...config, pan: e.target.value})}
              placeholder="e.g. ABCDE1234F"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">Taxpayer Type</label>
            <select 
              className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900"
              value={config.taxpayerType}
              onChange={e => setConfig({...config, taxpayerType: e.target.value as any})}
            >
              <option value="REGULAR">Regular</option>
              <option value="COMPOSITION">Composition</option>
              <option value="SEZ">SEZ</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Integration Settings</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox"
                className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300"
                checked={config.enableEInvoiceGeneration}
                onChange={e => setConfig({...config, enableEInvoiceGeneration: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Automated E-Invoice Generation
              </span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox"
                className="form-checkbox h-5 w-5 text-indigo-600 rounded border-gray-300"
                checked={config.enableEWayBill}
                onChange={e => setConfig({...config, enableEWayBill: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Auto-generate E-Way Bill with IRN
              </span>
            </label>
            
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">API Environment</label>
              <select 
                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900"
                value={config.apiEnvironment}
                onChange={e => setConfig({...config, apiEnvironment: e.target.value as any})}
              >
                <option value="SANDBOX">Sandbox (Testing)</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-700 dark:text-gray-300">IRP Provider</label>
              <select 
                className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-50 dark:focus:ring-gray-400 dark:focus:ring-offset-gray-900"
                value={config.defaultIRPProvider}
                onChange={e => setConfig({...config, defaultIRPProvider: e.target.value})}
              >
                <option value="NIC">NIC (National Informatics Centre)</option>
                <option value="CLEAR">ClearTax (GSP)</option>
                <option value="TALLY">Tally (GSP)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};
