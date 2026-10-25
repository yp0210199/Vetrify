import React, { useState, useEffect } from 'react';
import {
  Plus,
  Filter,
  Download,
  Upload,
  Search,
  Clock,
  SlidersHorizontal,
  Settings,
  Eye,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { KpiCard } from '../components/ui/KpiCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProductImage } from '../components/ui/ProductImage';
import { Tabs } from '../components/ui/Tabs';
import { SearchInput, Select } from '../components/ui/Input';
import { ProductDetailDrawer } from './ProductDetailDrawer';
import { AddProductModal } from './AddProductModal';
import { ProductCsvImportDrawer } from '../components/inventory/ProductCsvImportDrawer';
import { MasterDataManagementModal } from '../components/inventory/MasterDataManagementModal';
import { BatchLedgerPanel } from '../components/inventory/BatchLedgerPanel';
import { BatchAdjustmentsPanel } from '../components/inventory/BatchAdjustmentsPanel';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Product } from '../types/product';
import { getProducts } from '../services/productService';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { safeToFixed } from '../lib/formatting/formatters';

export const InventoryView: React.FC = () => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportDrawerOpen, setIsImportDrawerOpen] = useState(false);
  const [isMasterDataModalOpen, setIsMasterDataModalOpen] = useState(false);

  // Pagination states
  const [lastDoc, setLastDoc] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchProductsList = async (reset = true) => {
    if (!organization) return;
    try {
      setIsLoading(true);
      const caller = { uid: user?.uid || 'usr_staff', email: user?.email, displayName: user?.displayName };
      const res = await getProducts(organization.id, {
        searchQuery,
        schedule: selectedSchedule !== 'all' ? (selectedSchedule as any) : undefined,
        status: selectedStatus !== 'all' ? (selectedStatus as any) : 'active',
        pageSize: 50,
        lastDoc: reset ? null : lastDoc,
      });

      setProducts(reset ? res.products : [...products, ...res.products]);

      setLastDoc(res.lastDoc);
      setHasMore(res.hasMore);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      error(err?.message || 'Failed to query product master collection.', 'Error Loading Products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organization) {
      fetchProductsList(true);
    }
  }, [organization?.id, selectedSchedule, selectedStatus]);

  useEffect(() => {
    if (selectedProduct && products.length > 0) {
      const updated = products.find((p) => p.id === selectedProduct.id);
      if (updated) {
        setSelectedProduct(updated);
      }
    }
  }, [products]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (organization) {
        fetchProductsList(true);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleExportCsv = () => {
    if (products.length === 0) return;

    const headers = [
      'SKU',
      'Product Name',
      'Brand',
      'Composition',
      'Dosage Form',
      'Strength',
      'Manufacturer',
      'Category',
      'Schedule',
      'HSN Code',
      'GST Rate',
      'MRP',
      'Purchase Cost',
      'Sale Price',
      'Rack Location',
    ];

    const rows = products.map((p) => [
      p.sku,
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.brand.replace(/"/g, '""')}"`,
      `"${p.composition.replace(/"/g, '""')}"`,
      p.dosageForm,
      p.strength,
      `"${p.manufacturerName.replace(/"/g, '""')}"`,
      `"${p.categoryName.replace(/"/g, '""')}"`,
      p.schedule,
      p.hsnCode,
      p.gstRate,
      p.defaultMrp,
      p.defaultPurchaseCost,
      p.defaultSalePrice,
      p.rackLocation || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_master_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    success(`Exported ${products.length} product records.`, 'CSV Export Generated');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Product & Master Data Catalog"
        subtitle="Canonical Pharmacy Product Masters, Statutory Taxes, and Classifications"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4F1] text-[#0D5C63] text-xs font-bold border border-[#0D5C63]/20">
            Multi-Tenant Isolated
          </span>
        }
        primaryAction={
          <Button
            variant="primary"
            size="md"
            icon={Plus}
            onClick={() => {
              setSelectedProduct(null);
              setIsAddModalOpen(true);
            }}
          >
            Add Medicine Master
          </Button>
        }
        secondaryActions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Settings}
              onClick={() => setIsMasterDataModalOpen(true)}
            >
              Master Data Slabs
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={() => setIsImportDrawerOpen(true)}
            >
              Import CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
            >
              Export
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <KpiCard
          title="Active Master SKUs"
          value={products.length}
          subValue="Canonical Products"
        />
        <KpiCard
          title="Schedule H/H1 Restricted"
          value={products.filter((p) => p.schedule === 'H' || p.schedule === 'H1').length}
          subValue="Rx Required"
        />
        <KpiCard
          title="Cold Chain Managed"
          value={products.filter((p) => p.isColdChain).length}
          subValue="2°C - 8°C Items"
        />
        <KpiCard
          title="Narcotic / Schedule X"
          value={products.filter((p) => p.isNarcotic || p.schedule === 'X').length}
          subValue="Strict Register"
        />
        <KpiCard
          title="Master Categories"
          value="7"
          subValue="Configured Slabs"
        />
      </div>

      {/* Sub-tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'products', label: 'Medicine Product Masters', count: products.length },
          { id: 'batches', label: 'Batch Ledger (FEFO)' },
          { id: 'adjustments', label: 'Stock Audits & Adjustments' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'products' && (
        <>
          {/* Filter and Search Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="w-full md:max-w-md">
              <SearchInput
                placeholder="Search by product name, brand, salt composition, or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto no-scrollbar">
              <Select
                value={selectedSchedule}
                onChange={(e) => setSelectedSchedule(e.target.value)}
                className="text-xs"
              >
                <option value="all">All Drug Schedules</option>
                <option value="OTC">OTC (Over the Counter)</option>
                <option value="H">Schedule H</option>
                <option value="H1">Schedule H1</option>
                <option value="X">Schedule X</option>
              </Select>

              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs"
              >
                <option value="active">Active Products</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
                <option value="all">All Statuses</option>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                icon={RefreshCw}
                onClick={() => fetchProductsList(true)}
                title="Refresh Catalog"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* Products Table */}
          {isLoading && products.length === 0 ? (
            <TableSkeleton rows={8} cols={8} />
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
              <EmptyState
                type="search"
                title="No Medicine Products Found"
                description="Create your first canonical pharmacy product master or upload a CSV catalog."
                primaryActionLabel="Add New Medicine"
                onPrimaryAction={() => {
                  setSelectedProduct(null);
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-bold select-none">
                      <th className="py-3.5 px-3">SKU & Image</th>
                      <th className="py-3.5 px-3 min-w-[220px]">Medicine Name & Salt Composition</th>
                      <th className="py-3.5 px-3">Category & Mfr</th>
                      <th className="py-3.5 px-3">Schedule</th>
                      <th className="py-3.5 px-3 text-right">Default MRP</th>
                      <th className="py-3.5 px-3 text-right">Purchase Cost</th>
                      <th className="py-3.5 px-3 text-right">Sale Price</th>
                      <th className="py-3.5 px-3">GST Slab</th>
                      <th className="py-3.5 px-3">Shelf Rack</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {products.map((prod) => (
                      <tr
                        key={prod.id}
                        onClick={() => handleRowClick(prod)}
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <ProductImage
                              size="sm"
                              src={prod.mediaUrl || prod.imageUrl}
                              dosageForm={prod.dosageForm}
                              schedule={prod.schedule}
                              isColdChain={prod.isColdChain}
                            />
                            <span className="font-mono text-[10px] font-bold text-[#64748B]">{prod.sku}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-extrabold text-[#0B1F33] text-xs group-hover:text-[#0D5C63] transition-colors block">
                              {prod.productName}
                            </span>
                            <p className="text-[11px] text-[#64748B] truncate mt-0.5">
                              <strong className="text-[#334155]">{prod.brand}</strong> • <em>{prod.composition}</em> ({prod.strength})
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-[#0B1F33] block">{prod.categoryName || 'General'}</span>
                          <span className="text-[10px] text-[#64748B] block truncate max-w-[140px]">{prod.manufacturerName}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            prod.schedule === 'OTC'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : prod.schedule === 'H1' || prod.schedule === 'X'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}>
                            {prod.schedule}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#0B1F33]">
                          ₹{safeToFixed(prod.defaultMrp)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#64748B]">
                          ₹{safeToFixed(prod.defaultPurchaseCost)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-[#0D5C63]">
                          ₹{safeToFixed(prod.defaultSalePrice)}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-bold text-[#334155]">{prod.gstRate}%</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#F1F5F9] rounded text-[#475569]">
                            {prod.rackLocation || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <Badge status={prod.status || 'active'} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRowClick(prod)}
                            className="p-1.5 text-[#64748B] hover:text-[#0D5C63] hover:bg-[#E6F4F1] rounded-lg transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {hasMore && (
                <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchProductsList(false)}
                    isLoading={isLoading}
                  >
                    Load More Products
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'batches' && <BatchLedgerPanel />}

      {activeTab === 'adjustments' && <BatchAdjustmentsPanel />}

      {/* Drawers and Modals */}
      <ProductDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        product={selectedProduct}
        onEdit={(prod) => {
          setSelectedProduct(prod);
          setIsDrawerOpen(false);
          setIsAddModalOpen(true);
        }}
        onStatusChanged={() => fetchProductsList(true)}
      />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialData={selectedProduct}
        onSuccess={() => fetchProductsList(true)}
      />

      <ProductCsvImportDrawer
        isOpen={isImportDrawerOpen}
        onClose={() => setIsImportDrawerOpen(false)}
        onSuccess={() => fetchProductsList(true)}
      />

      <MasterDataManagementModal
        isOpen={isMasterDataModalOpen}
        onClose={() => setIsMasterDataModalOpen(false)}
      />
    </div>
  );
};
