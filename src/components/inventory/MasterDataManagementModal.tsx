import React, { useState, useEffect } from 'react';
import { Plus, Tag, Building2, Percent, FileCode, Check, RefreshCw, Trash2, Box } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, TextInput, Select } from '../ui/Input';
import { Tabs } from '../ui/Tabs';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';
import { getCategories, createCategory, deleteCategory } from '../../services/categoryService';
import { getManufacturers, createManufacturer, deleteManufacturer } from '../../services/manufacturerService';
import { getUnits, createUnit, deleteUnit } from '../../services/unitService';
import { getTaxSlabs, getHsnRecords } from '../../services/taxService';
import { ProductCategory, Manufacturer, UnitDefinition, TaxSlab, HsnRecord } from '../../types/product';

interface MasterDataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshNeeded?: () => void;
}

export const MasterDataManagementModal: React.FC<MasterDataManagementModalProps> = ({
  isOpen,
  onClose,
  onRefreshNeeded,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'categories' | 'manufacturers' | 'units' | 'taxes'>('categories');
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [units, setUnits] = useState<UnitDefinition[]>([]);
  const [taxes, setTaxes] = useState<TaxSlab[]>([]);
  const [hsnCodes, setHsnCodes] = useState<HsnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');
  const [newMfrName, setNewMfrName] = useState('');
  const [newMfrShort, setNewMfrShort] = useState('');
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');

  const loadData = async () => {
    if (!organization) return;
    setIsLoading(true);
    try {
      const [catList, mfrList, unitList, taxList, hsnList] = await Promise.all([
        getCategories(organization.id, true),
        getManufacturers(organization.id, true),
        getUnits(organization.id, true),
        getTaxSlabs(organization.id),
        getHsnRecords(organization.id),
      ]);

      setCategories(catList);
      setManufacturers(mfrList);
      setUnits(unitList);
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
      success(`Added category "${created.name}"`, 'Category Created');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error creating category', 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!organization || !window.confirm(`Delete category "${catName}"?`)) return;
    try {
      await deleteCategory(organization.id, catId);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
      success(`Deleted category "${catName}"`, 'Category Deleted');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error deleting category', 'Delete Failed');
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
          shortName: newMfrShort.trim() || newMfrName.trim(),
          code: newMfrName.substring(0, 4).toUpperCase(),
          status: 'active',
        }
      );
      setManufacturers((prev) => [...prev, created]);
      setNewMfrName('');
      setNewMfrShort('');
      success(`Added Brand "${created.name}"`, 'Brand Created');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error creating brand', 'Failed to create brand');
    }
  };

  const handleDeleteManufacturer = async (mfrId: string, mfrName: string) => {
    if (!organization || !window.confirm(`Delete brand "${mfrName}"?`)) return;
    try {
      await deleteManufacturer(organization.id, mfrId);
      setManufacturers((prev) => prev.filter((m) => m.id !== mfrId));
      success(`Deleted brand "${mfrName}"`, 'Brand Deleted');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error deleting brand', 'Delete Failed');
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !organization || !user) return;
    try {
      const created = await createUnit(
        organization.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        {
          name: newUnitName.trim(),
          code: newUnitCode.trim() || newUnitName.substring(0, 4).toUpperCase(),
        }
      );
      setUnits((prev) => [...prev, created]);
      setNewUnitName('');
      setNewUnitCode('');
      success(`Added Unit "${created.name}"`, 'Unit Created');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error creating unit', 'Failed to create unit');
    }
  };

  const handleDeleteUnit = async (unitId: string, unitName: string) => {
    if (!organization || !window.confirm(`Delete unit "${unitName}"?`)) return;
    try {
      await deleteUnit(organization.id, unitId);
      setUnits((prev) => prev.filter((u) => u.id !== unitId));
      success(`Deleted unit "${unitName}"`, 'Unit Deleted');
      onRefreshNeeded?.();
    } catch (err: any) {
      error(err?.message || 'Error deleting unit', 'Delete Failed');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Showroom Master Data Slabs"
      subtitle="Manage Brands, Product Categories, Packaging Units & Statutory GST Slabs"
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
            { id: 'categories', label: 'Categories Master' },
            { id: 'manufacturers', label: 'Brands & Manufacturers' },
            { id: 'units', label: 'Units & Packaging Quantities' },
            { id: 'taxes', label: 'GST & HSN Tax Slabs' },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />

        {/* Tab 1: Categories Master */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <form onSubmit={handleAddCategory} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2">
              <TextInput
                placeholder="New Category Name (e.g. Vitrified Tiles, Wash Basins)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1"
              />
              <TextInput
                placeholder="Code (e.g. VT)"
                value={newCatCode}
                onChange={(e) => setNewCatCode(e.target.value)}
                className="w-28"
              />
              <Button variant="primary" size="sm" icon={Plus} type="submit">
                Add Category
              </Button>
            </form>

            <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y">
              {categories.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#0B1F33] text-xs block">{c.name}</span>
                    <span className="text-[10px] font-mono text-[#64748B]">Code: {c.code}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(c.id, c.name)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Brands & Manufacturers */}
        {activeTab === 'manufacturers' && (
          <div className="space-y-4">
            <form onSubmit={handleAddManufacturer} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2">
              <TextInput
                placeholder="New Brand / Manufacturer Name (e.g. Kajaria, Hindware, Jaquar)"
                value={newMfrName}
                onChange={(e) => setNewMfrName(e.target.value)}
                className="flex-1"
              />
              <TextInput
                placeholder="Short Name"
                value={newMfrShort}
                onChange={(e) => setNewMfrShort(e.target.value)}
                className="w-28"
              />
              <Button variant="primary" size="sm" icon={Plus} type="submit">
                Add Brand
              </Button>
            </form>

            <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y">
              {manufacturers.map((m) => (
                <div key={m.id} className="p-3 flex items-center justify-between hover:bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#0B1F33] text-xs block">{m.name}</span>
                    <span className="text-[10px] font-mono text-[#64748B]">{m.shortName || m.code}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteManufacturer(m.id, m.name)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete Brand"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Units & Packaging Quantities */}
        {activeTab === 'units' && (
          <div className="space-y-4">
            <form onSubmit={handleAddUnit} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-2">
              <TextInput
                placeholder="New Unit Name (e.g. Box, Sq. Ft, Piece, Bag, Set, Meter)"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="flex-1"
              />
              <TextInput
                placeholder="Code (e.g. BOX)"
                value={newUnitCode}
                onChange={(e) => setNewUnitCode(e.target.value)}
                className="w-28"
              />
              <Button variant="primary" size="sm" icon={Plus} type="submit">
                Add Unit
              </Button>
            </form>

            <div className="max-h-60 overflow-y-auto border border-[#E2E8F0] rounded-xl divide-y">
              {units.map((u) => (
                <div key={u.id} className="p-3 flex items-center justify-between hover:bg-[#F8FAFC]">
                  <div>
                    <span className="font-bold text-[#0B1F33] text-xs block">{u.name}</span>
                    <span className="text-[10px] font-mono text-[#64748B]">Code: {u.code}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteUnit(u.id, u.name)}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: GST & HSN Slabs */}
        {activeTab === 'taxes' && (
          <div className="space-y-4">
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b">
                  <tr className="font-bold text-[#64748B]">
                    <th className="p-2.5">HSN Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5 text-right">Default GST Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="p-2.5 font-mono font-bold text-[#0B1F33]">6907</td>
                    <td className="p-2.5 text-[#334155]">Vitrified, Ceramic & Wall/Floor Tiles</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0D5C63]">18% GST</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="p-2.5 font-mono font-bold text-[#0B1F33]">6910</td>
                    <td className="p-2.5 text-[#334155]">Ceramic Sanitaryware (Basins, WCs, Urinals)</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0D5C63]">18% GST</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="p-2.5 font-mono font-bold text-[#0B1F33]">8481</td>
                    <td className="p-2.5 text-[#334155]">Taps, Faucets, Diverters & Showers</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0D5C63]">18% GST</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="p-2.5 font-mono font-bold text-[#0B1F33]">3506</td>
                    <td className="p-2.5 text-[#334155]">Tile Adhesive & Epoxy Grout Chemicals</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0D5C63]">12% GST</td>
                  </tr>
                  <tr className="hover:bg-[#F8FAFC]">
                    <td className="p-2.5 font-mono font-bold text-[#0B1F33]">3917</td>
                    <td className="p-2.5 text-[#334155]">CPVC / UPVC Pipes & Plumbing Fittings</td>
                    <td className="p-2.5 text-right font-mono font-bold text-[#0D5C63]">18% GST</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
