import React, { useState } from 'react';
import {
  Grid,
  ShieldCheck,
  Package,
  Calendar,
  Building,
  Tag,
  Barcode,
  Layers,
  History,
  TrendingUp,
  AlertTriangle,
  Edit,
  FileSpreadsheet,
  Archive,
  Trash2,
  Box,
  Warehouse,
  Droplet,
  Wrench,
  Pipette,
} from 'lucide-react';
import { Drawer } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProductImage } from '../components/ui/ProductImage';
import { Tabs } from '../components/ui/Tabs';
import { Product } from '../types/product';
import { InventoryItem } from '../types';
import { setProductStatus, deleteProduct } from '../services/productService';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { safeToFixed, formatDate } from '../lib/formatting/formatters';

interface ProductDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: (Product | InventoryItem) | null;
  onEdit?: (product: any) => void;
  onStatusChanged?: () => void;
}

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
  isOpen,
  onClose,
  product,
  onEdit,
  onStatusChanged,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'batches' | 'pricing' | 'history'>('overview');
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!product) return null;

  // Normalize fields between Product and InventoryItem
  const p = product as any;
  const productName = p.productName || p.name;
  const brand = p.brand || 'Generic Brand';
  const sku = p.sku || 'SKU-001';
  const categoryType = p.categoryType || 'tiles';
  const manufacturer = p.manufacturerName || p.manufacturer || brand;
  const category = p.categoryName || p.category || 'General';
  const hsnCode = p.hsnCode || '6907';
  const gstRate = p.gstRate || 18;
  const mrp = p.defaultMrp ?? p.mrp ?? 0;
  const purchaseCost = p.defaultPurchaseCost ?? p.purchaseCost ?? 0;
  const salePrice = p.defaultSalePrice ?? p.salePrice ?? 0;
  const rackLocation = p.rackLocation || 'Yard Bay A-01';
  const mediaUrl = p.mediaUrl || p.imageUrl;
  const packUnit = p.packaging?.packUnit || 'Box';
  const marginPercent = salePrice > 0 ? (((salePrice - purchaseCost) / salePrice) * 100).toFixed(1) : '20.0';

  const handleArchive = async () => {
    if (!organization || !user || !p.id) return;
    try {
      setIsArchiving(true);
      await setProductStatus(
        organization.id,
        p.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        p.status === 'archived' ? 'active' : 'archived'
      );
      success(`Product ${productName} status updated to ${p.status === 'archived' ? 'Active' : 'Archived'}.`, 'Status Updated');
      onStatusChanged?.();
      onClose();
    } catch (err: any) {
      error(err?.message || 'Failed to update status.', 'Archive Failed');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!organization || !user || !p.id) {
      error('Missing organization, user, or product ID.', 'Deletion Failed');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete "${productName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      setIsDeleting(true);
      await deleteProduct(organization.id, p.id, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      });
      success(`Product ${productName} permanently deleted.`, 'Product Deleted');
      onStatusChanged?.();
      onClose();
    } catch (err: any) {
      console.error('Delete product error:', err);
      error(err?.message || 'Failed to delete product.', 'Deletion Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={productName}
      subtitle={`SKU: ${sku} • Brand: ${brand} • Line: ${categoryType.toUpperCase()}`}
      width="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Archive}
              isLoading={isArchiving}
              onClick={handleArchive}
            >
              {p.status === 'archived' ? 'Restore' : 'Archive'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Trash2}
              isLoading={isDeleting}
              className="text-red-600 border-red-200 hover:bg-red-50 z-50 pointer-events-auto"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Edit}
              onClick={() => onEdit?.(product)}
            >
              Edit Product
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Hero Section */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <ProductImage
            src={mediaUrl}
            size="lg"
            dosageForm={p.surfaceFinish || p.colorFinish || categoryType}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-[#0B1F33]">{productName}</h3>
              <Badge status={p.status || 'active'} size="sm" />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                {sku}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#E6F4F1] text-[#0D5C63] uppercase border border-[#0D5C63]/20">
                {categoryType}
              </span>
            </div>
            <p className="text-xs text-[#475569] mt-1">
              Brand: <strong className="font-semibold text-[#0B1F33]">{brand}</strong> • Category: <strong className="font-semibold text-[#0D5C63]">{category}</strong>
            </p>
            <div className="flex items-center gap-4 mt-2.5 text-xs text-[#64748B]">
              <span>Yard Rack: <strong className="text-[#0B1F33]">{rackLocation}</strong></span>
              <span>Primary Unit: <strong className="text-[#0D5C63] font-bold">{packUnit}</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview & Technical Specs' },
            { id: 'batches', label: 'Yard Storage & Batches' },
            { id: 'pricing', label: 'Commercial & GST Slabs' },
            { id: 'history', label: 'Audit Trail & Movements' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <div className="space-y-4 text-xs">
            {/* Category Specific Technical Grid */}
            {categoryType === 'tiles' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Tile Size & Dimensions</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.tileDimensions || '600x1200 mm'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Surface Finish</span>
                  <span className="font-bold text-[#0D5C63] text-sm mt-0.5 block">{p.surfaceFinish || 'Glossy'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Body Type</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.tileBodyType || 'GVT'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Box Coverage Ratio</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.coveragePerBoxSqFt || 15.5} Sq. Ft / Box</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Pieces & Weight</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.piecesPerBox || 4} Pcs ({p.weightPerBoxKg || 28} Kg)</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Quality Grade</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{p.tileGrade || 'Premium'}</span>
                </div>
              </div>
            )}

            {categoryType === 'sanitaryware' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Sanitary Item Type</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.sanitaryType || 'Wash Basin'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Mounting Style</span>
                  <span className="font-bold text-[#0D5C63] text-sm mt-0.5 block">{p.mountingType || 'Wall-Hung'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Trap / Outlet Size</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.trapType || 'S-Trap 220mm'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Color & Finish</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.colorFinish || 'Glossy White'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Flushing Mechanism</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.flushingType || 'Dual Flush 3/6L'}</span>
                </div>
              </div>
            )}

            {categoryType === 'faucets' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Fitting Type</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.fittingType || 'Single Lever Diverter'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Material & Finish</span>
                  <span className="font-bold text-[#0D5C63] text-sm mt-0.5 block">{p.materialFinish || 'Chrome Plated Brass'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Warranty Period</span>
                  <span className="font-bold text-emerald-700 text-sm mt-0.5 block">{p.warrantyYears || 10} Years Warranty</span>
                </div>
              </div>
            )}

            {categoryType === 'adhesives' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Chemical Grade</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.chemicalType || 'Type 2 Tile Adhesive'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Pack Bag Size</span>
                  <span className="font-bold text-[#0D5C63] text-sm mt-0.5 block">{p.packSizeKg || 20} Kg Bag</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Coverage Per Bag</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">~{p.coverageSqFtPerBag || 55} Sq. Ft</span>
                </div>
              </div>
            )}

            {categoryType === 'pipes' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Pipe / Fitting Type</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.pipeType || 'CPVC Pipe'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Outer Diameter / Size</span>
                  <span className="font-bold text-[#0D5C63] text-sm mt-0.5 block">{p.outerDiameter || '3/4 inch (20mm)'}</span>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                  <span className="text-[#64748B] block text-[11px]">Pressure Rating / Class</span>
                  <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{p.pressureRating || 'SDR 11'}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">HSN Tax Code</span>
                <span className="font-bold text-[#0B1F33] font-mono text-sm mt-0.5 block">{hsnCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">GST Rate Slab</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{gstRate}% ({gstRate / 2}% CGST + {gstRate / 2}% SGST)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#E6F4F1] border border-[#0D5C63]/20">
              <h5 className="font-bold text-[#0D5C63] mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0D5C63]" /> Statutory Tax & Yard Dispatch Guidelines
              </h5>
              <p className="text-[#0B1F33] leading-relaxed">
                Registered under statutory HSN {hsnCode}. Price per {packUnit}. Godown Gate Pass required before truck loading.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'batches' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white border-2 border-[#0D5C63] shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#0D5C63] bg-[#E6F4F1] px-2 py-0.5 rounded">
                    ACTIVE GODOWN STOCK
                  </span>
                  <span className="text-xs font-mono font-bold text-[#0B1F33]">Shade/Lot: S-101 / L-04</span>
                </div>
                <Badge status="in_stock" size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div>
                  <span className="text-[#64748B] block text-[10px]">CALIBER / SET</span>
                  <span className="font-bold text-[#0B1F33]">Grade Premium</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">AVAILABLE STOCK</span>
                  <span className="font-bold text-[#0D5C63] font-mono-num">120 {packUnit}s</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">GODOWN BAY</span>
                  <span className="font-bold text-[#0B1F33] font-mono-num">{rackLocation}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Maximum Retail Price (MRP)</span>
                <span className="text-xl font-extrabold text-[#0B1F33] font-mono-num mt-1 block">
                  ₹ {safeToFixed(mrp)} / {packUnit}
                </span>
                <span className="text-[10px] text-[#64748B]">Inclusive of GST</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Landed Purchase Cost</span>
                <span className="text-xl font-extrabold text-[#0B1F33] font-mono-num mt-1 block">
                  ₹ {safeToFixed(purchaseCost)} / {packUnit}
                </span>
                <span className="text-[10px] text-[#64748B]">Supplier net cost</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Showroom Sale Price</span>
                <span className="text-xl font-extrabold text-[#0D5C63] font-mono-num mt-1 block">
                  ₹ {safeToFixed(salePrice)} / {packUnit}
                </span>
                <span className="text-[10px] text-[#15803D] font-bold">Standard Counter Price</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-emerald-800 block text-[11px] font-bold">Calculated Gross Margin %</span>
                <span className="text-xl font-extrabold text-emerald-700 font-mono-num mt-1 block">
                  {marginPercent}%
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Net profit per {packUnit}: ₹{safeToFixed((salePrice || 0) - (purchaseCost || 0))}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 text-xs">
            <span className="font-bold text-[#0B1F33]">Firestore Product Lifecycle History</span>
            <div className="p-3 bg-[#F8FAFC] border rounded-xl text-[#64748B]">
              <p>Product record created by {p.createdByUid || 'Staff User'} on {formatDate(p.createdAt)}</p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
