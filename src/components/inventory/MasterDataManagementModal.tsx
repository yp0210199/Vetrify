import React, { useState, useEffect } from 'react';
import { Plus, Tag, Building2, Percent, FileCode, Check, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, TextInput, Select } from '../ui/Input';
import { Tabs } from '../ui/Tabs';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { getCategories, createCategory } from '../../services/categoryService';
import { getManufacturers, createManufacturer } from '../../services/manufacturerService';
import { getTaxSlabs, getHsnRecords } from '../../services/taxService';
import { ProductCategory, Manufacturer, TaxSlab, HsnRecord } from '../../types/product';

interface MasterDataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterDataManagementModal: React.FC<MasterDataManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'categories' | 'manufacturers' | 'taxes' | 'hsn'>('categories');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [taxes, setTaxes] = useState<TaxSlab[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states for creating new records
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newMfrName, setNewMfrName] = useState('');
  const [newMfrShort, setNewMfrShort] = useState('');

  const loadData = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const [catList, mfrList, taxList, hsnList] = await Promise.all([
        getCategories(organization.id, true),
        getManufacturers(organization.id, true),
        getTaxSlabs(organization.id),
        getHsnRecords(organization.id),
      ]);

      setCategories(catList);
      setManufacturers(mfrList);
      setTaxes(taxList);
      setHsnCodes(hsnList);
    } catch (err: any) {
      console.error('Failed loading master data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && organization) {
      loadData();
    }
  }, [isOpen, organization?.id]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !organization || !user) return;
    try {
      const created = await createCategory(
        organization.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        {
          name: newCatName.trim(),
          code: newCatCode.trim() || newCatName.substring(0, 4).toUpperCase(),
          description: '',
          parentId: null,
          status: 'active',
        }
      );
      setCategories((prev) => [...prev, created]);
      setNewCatName('');
      setNewCatCode('');
      success(`Added "${created.name}"`, 'Category Created');
    } catch (err: any) {
      error(err?.message || 'Error creating category', 'Failed to create category');
    }
  };

  const handleAddManufacturer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMfrName.trim() || !organization || !user) return;
    try {
      const created = await createManufacturer(
        organization.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        {
          name: newMfrName.trim(),
          shortName: newMfrShort.trim() || newMfrName.split(' ')[0],
          status: 'active',
        }
      );
      setManufacturers((prev) => [...prev, created]);
      setNewMfrName('');
      setNewMfrShort('');
      success(`Added "${created.name}"`, 'Manufacturer Created');
    } catch (err: any) {
      error(err?.message || 'Error creating manufacturer', 'Failed to create manufacturer');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Master Data Configuration"
      subtitle="Manage canonical categories, manufacturers, tax slabs, and HSN codes"
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        <Tabs
          tabs={[
            { id: 'categories', label: 'Categories', count: categories.length },
            { id: 'manufacturers', label: 'Manufacturers', count: manufacturers.length },
            { id: 'taxes', label: 'GST Tax Slabs', count: taxes.length },
            { id: 'hsn', label: 'HSN Codes', count: hsnCodes.length },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />

        {activeTab === 'categories' && (
          <div className="space-y-4">
            <form onSubmit={handleAddCategory} className="flex gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex-1">
                <TextInput
                  placeholder="New Category Name (e.g. Injections)"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
              </div>
              <div className="w-28">
                <TextInput
                  placeholder="Code"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value)}
                />
              </div>
              <Button variant="primary" size="sm" icon={Plus} type="submit" disabled={!newCatName.trim()}>
                Add
              </Button>
            </form>

            <div className="divide-y divide-[#F1F5F9] max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl bg-white">
              {categories.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0B1F33]">{c.name}</span>
                    <span className="ml-2 text-[10px] font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded text-[#64748B]">{c.code}</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'manufacturers' && (
          <div className="space-y-4">
            <form onSubmit={handleAddManufacturer} className="flex gap-2 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
              <div className="flex-1">
                <TextInput
                  placeholder="New Manufacturer Name (e.g. Cipla Ltd)"
                  value={newMfrName}
                  onChange={(e) => setNewMfrName(e.target.value)}
                />
              </div>
              <div className="w-28">
                <TextInput
                  placeholder="Short Name"
                  value={newMfrShort}
                  onChange={(e) => setNewMfrShort(e.target.value)}
                />
              </div>
              <Button variant="primary" size="sm" icon={Plus} type="submit" disabled={!newMfrName.trim()}>
                Add
              </Button>
            </form>

            <div className="divide-y divide-[#F1F5F9] max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl bg-white">
              {manufacturers.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#0B1F33]">{m.name}</span>
                    {m.shortName && <span className="ml-2 text-[11px] text-[#64748B]">({m.shortName})</span>}
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded">Active</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'taxes' && (
          <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl bg-white">
            {taxes.map((t) => (
              <div key={t.id} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#0B1F33]">{t.name}</span>
                  <p className="text-[11px] text-[#64748B]">CGST: {t.cgstRate}% + SGST: {t.sgstRate}%</p>
                </div>
                <span className="font-mono-num font-extrabold text-[#0D5C63]">{t.gstRate}%</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'hsn' && (
          <div className="divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-xl bg-white max-h-60 overflow-y-auto">
            {hsnCodes.map((h) => (
              <div key={h.id} className="p-3 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-[#0B1F33]">HSN {h.code}</span>
                  <p className="text-[11px] text-[#64748B] line-clamp-1">{h.description}</p>
                </div>
                <span className="font-mono-num font-bold text-[#0B1F33]">{h.defaultGstRate}% GST</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
