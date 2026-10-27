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
  Grid,
  Box,
  AlertTriangle,
  Droplet,
  Wrench,
  Pipette,
  Layers,
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
import { BreakageDamagePanel } from '../components/inventory/BreakageDamagePanel';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Product, CategoryType } from '../types/product';
import { getProducts } from '../services/productService';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { safeToFixed } from '../lib/formatting/formatters';

export const InventoryView: React.FC = () => {
  const { organization } = useWorkspace();
  const { error, success } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryType, setSelectedCategoryType] = useState<string>('all');
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
      const res = await getProducts(organization.id, {
        searchQuery,
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
  }, [organization?.id, selectedStatus]);

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
      'Line Type',
      'Category',
      'HSN Code',
      'GST Rate',
      'MRP',
      'Purchase Cost',
      'Sale Price',
      'Godown Bay',
    ];

    const rows = products.map((p) => [
      p.sku,
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.brand.replace(/"/g, '""')}"`,
      p.categoryType || 'tiles',
      `"${(p.categoryName || 'General').replace(/"/g, '""')}"`,
      p.hsnCode || '6907',
      p.gstRate || 18,
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
    a.download = `catalog_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    success(`Exported ${products.length} product records.`, 'CSV Export Generated');
  };

  // Filter client-side by category line
  const filteredProducts = products.filter((p) => {
    if (selectedCategoryType === 'all') return true;
    return p.categoryType === selectedCategoryType;
  });

  const getItemSpecsLabel = (p: Product) => {
    const type = p.categoryType || 'tiles';
    switch (type) {
      case 'tiles':
        return `${p.tileDimensions || '600x1200 mm'} • ${p.surfaceFinish || 'Glossy'}`;
      case 'sanitaryware':
        return `${p.sanitaryType || 'Basin'} • ${p.mountingType || 'Wall-Hung'}`;
      case 'faucets':
        return `${p.fittingType || 'Diverter'} • ${p.materialFinish || 'Chrome'}`;
      case 'adhesives':
        return `${p.chemicalType || 'Tile Adhesive'} • ${p.packSizeKg || 20} Kg`;
      case 'pipes':
        return `${p.pipeType || 'CPVC Pipe'} • ${p.outerDiameter || '3/4"'}`;
      default:
        return p.brand;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Showroom Universal Catalog"
        subtitle="Canonical Masters for Tiles, Sanitaryware, Faucets, Tile Adhesives & Plumbing Pipes"
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E6F4F1] text-[#0D5C63] text-xs font-bold border border-[#0D5C63]/20">
            Multi-Category Showroom
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
            Add Showroom SKU
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
              Master Slabs
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
          subValue="Total Catalog SKUs"
        />
        <KpiCard
          title="Tiles & Slabs"
          value={products.filter((p) => p.categoryType === 'tiles' || !p.categoryType).length}
          subValue="Vitrified / Ceramic"
        />
        <KpiCard
          title="Sanitaryware SKUs"
          value={products.filter((p) => p.categoryType === 'sanitaryware' || p.hsnCode === '6910').length}
          subValue="Basins & WCs"
        />
        <KpiCard
          title="Faucets & CP Fittings"
          value={products.filter((p) => p.categoryType === 'faucets' || p.hsnCode === '8481').length}
          subValue="Showers & Mixers"
        />
        <KpiCard
          title="Adhesives & Pipes"
          value={products.filter((p) => p.categoryType === 'adhesives' || p.categoryType === 'pipes').length}
          subValue="Chemicals & CPVC"
        />
      </div>

      {/* Sub-tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'products', label: 'All Showroom Masters', count: products.length },
          { id: 'batches', label: 'Yard Shade & Lot Ledger' },
          { id: 'adjustments', label: 'Stock Audits & Adjustments' },
          { id: 'breakage', label: 'Breakage & Transit Damage' },
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
                placeholder="Search by model name, brand, SKU, or HSN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto no-scrollbar">
              <Select
                value={selectedCategoryType}
                onChange={(e) => setSelectedCategoryType(e.target.value)}
                className="text-xs"
              >
                <option value="all">All Product Lines</option>
                <option value="tiles">Tiles & Slabs</option>
                <option value="sanitaryware">Sanitaryware</option>
                <option value="faucets">Faucets & CP Fittings</option>
                <option value="adhesives">Tile Adhesive & Grout</option>
                <option value="pipes">Pipes & Plumbing</option>
              </Select>

              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs"
              >
                <option value="active">Active Catalog</option>
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
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
              <EmptyState
                type="search"
                title="No Products Found"
                description="Create your first canonical product master or select another category filter."
                primaryActionLabel="Add New Product SKU"
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
                      <th className="py-3.5 px-3 min-w-[220px]">Product Model & Specifications</th>
                      <th className="py-3.5 px-3">Product Line</th>
                      <th className="py-3.5 px-3">Brand & Category</th>
                      <th className="py-3.5 px-3 text-right">Purchase Cost</th>
                      <th className="py-3.5 px-3 text-right">Sale Price</th>
                      <th className="py-3.5 px-3">GST Slab</th>
                      <th className="py-3.5 px-3">Godown Bay</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {filteredProducts.map((prod) => (
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
                              dosageForm={prod.categoryType || 'tiles'}
                            />
                            <span className="font-mono text-[10px] font-bold text-[#64748B]">{prod.sku}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div>
                            <span className="font-extrabold text-[#0B1F33] text-xs group-hover:text-[#0D5C63] transition-colors block">
                              {prod.productName}
                            </span>
                            <p className="text-[11px] text-[#0D5C63] font-semibold truncate mt-0.5">
                              {getItemSpecsLabel(prod)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6F4F1] text-[#0D5C63] uppercase border border-[#0D5C63]/20">
                            {prod.categoryType || 'tiles'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-[#0B1F33] block">{prod.brand}</span>
                          <span className="text-[10px] text-[#64748B] block truncate max-w-[140px]">{prod.categoryName || 'General'}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#64748B]">
                          ₹{safeToFixed(prod.defaultPurchaseCost)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-[#0D5C63]">
                          ₹{safeToFixed(prod.defaultSalePrice)} / {prod.packaging?.packUnit || 'Unit'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] font-bold text-[#334155]">{prod.gstRate || 18}%</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-[#F1F5F9] rounded text-[#475569]">
                            {prod.rackLocation || 'Yard Bay A-01'}
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
                    Load More Product Masters
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'batches' && <BatchLedgerPanel />}

      {activeTab === 'adjustments' && <BatchAdjustmentsPanel />}

      {activeTab === 'breakage' && <BreakageDamagePanel />}

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
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedProduct(null);
        }}
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
        onRefreshNeeded={() => fetchProductsList(true)}
      />
    </div>
  );
};
