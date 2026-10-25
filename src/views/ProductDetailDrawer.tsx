import React, { useState } from 'react';
import {
  Pill,
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
  const brand = p.brand || 'Generic';
  const composition = p.composition || p.genericName || 'Paracetamol IP';
  const sku = p.sku || 'SKU-MED-1001';
  const barcode = p.barcode || '890123456789';
  const dosageForm = p.dosageForm || 'Tablet';
  const strength = p.strength || '500mg';
  const schedule = p.schedule || 'OTC';
  const manufacturer = p.manufacturerName || p.manufacturer || 'Generic Pharma';
  const category = p.categoryName || p.category || 'Medicines';
  const hsnCode = p.hsnCode || '30049019';
  const gstRate = p.gstRate || 12;
  const mrp = p.defaultMrp ?? p.mrp ?? 0;
  const purchaseCost = p.defaultPurchaseCost ?? p.purchaseCost ?? 0;
  const salePrice = p.defaultSalePrice ?? p.salePrice ?? 0;
  const rackLocation = p.rackLocation || 'Unassigned';
  const isColdChain = p.isColdChain ?? false;
  const mediaUrl = p.mediaUrl || p.imageUrl;
  const packUnit = p.packaging?.packUnit || p.stockUnit || 'Strip';
  const baseUnit = p.packaging?.baseUnit || 'Tablet';
  const conversionFactor = p.packaging?.conversionFactor || 10;
  const marginPercent = mrp > 0 ? (((salePrice - purchaseCost) / salePrice) * 100).toFixed(1) : '20.0';

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
    console.log('Delete button clicked for:', p.id, p);
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
      subtitle={`SKU: ${sku} • Brand: ${brand} • Salt: ${composition}`}
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
            dosageForm={dosageForm}
            schedule={schedule}
            isColdChain={isColdChain}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-[#0B1F33]">{productName}</h3>
              <Badge status={p.status || 'active'} size="sm" />
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                {sku}
              </span>
              {schedule !== 'OTC' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                  Schedule {schedule}
                </span>
              )}
              {isColdChain && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                  Cold Chain 2°C-8°C
                </span>
              )}
            </div>
            <p className="text-xs text-[#475569] mt-1">
              Generic Salt: <strong className="font-semibold text-[#0B1F33]">{composition}</strong>
            </p>
            <div className="flex items-center gap-4 mt-2.5 text-xs text-[#64748B]">
              <span>Rack Shelf: <strong className="text-[#0B1F33]">{rackLocation}</strong></span>
              <span>Pack Ratio: <strong className="text-[#0D5C63] font-bold">1 {packUnit} = {conversionFactor} {baseUnit}s</strong></span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview & Identity' },
            { id: 'batches', label: 'Active Batches (FEFO)' },
            { id: 'pricing', label: 'Commercial & GST Slabs' },
            { id: 'history', label: 'Audit Trail & Movements' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />

        {/* Tab Contents */}
        {activeTab === 'overview' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Brand / Trade Name</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{brand}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Dosage Form & Strength</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{dosageForm} ({strength})</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Manufacturer</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{manufacturer}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Category</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{category}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">HSN Code</span>
                <span className="font-bold text-[#0B1F33] font-mono text-sm mt-0.5 block">{hsnCode}</span>
              </div>
              <div className="p-3 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">GST Rate</span>
                <span className="font-bold text-[#0B1F33] text-sm mt-0.5 block">{gstRate}% ({gstRate / 2}% CGST + {gstRate / 2}% SGST)</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200">
              <h5 className="font-bold text-sky-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-700" /> Statutory Compliance Note
              </h5>
              <p className="text-sky-800 leading-relaxed">
                This item is registered in the master database with HSN {hsnCode}. Drug schedule guidelines apply during retail POS checkout and purchase invoice recording.
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
                    FEFO PRIORITY #1
                  </span>
                  <span className="text-xs font-mono font-bold text-[#0B1F33]">Batch: PCT2025A</span>
                </div>
                <Badge status="in_stock" size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div>
                  <span className="text-[#64748B] block text-[10px]">EXPIRY DATE</span>
                  <span className="font-bold text-[#0B1F33]">12/2026 (Valid)</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">AVAILABLE STOCK</span>
                  <span className="font-bold text-[#0D5C63] font-mono-num">120 {packUnit}s</span>
                </div>
                <div>
                  <span className="text-[#64748B] block text-[10px]">PURCHASE COST</span>
                  <span className="font-bold text-[#0B1F33] font-mono-num">₹{safeToFixed(purchaseCost)}</span>
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
                  ₹ {safeToFixed(mrp)}
                </span>
                <span className="text-[10px] text-[#64748B]">Inclusive of GST</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Landed Purchase Cost</span>
                <span className="text-xl font-extrabold text-[#0B1F33] font-mono-num mt-1 block">
                  ₹ {safeToFixed(purchaseCost)}
                </span>
                <span className="text-[10px] text-[#64748B]">Supplier net cost</span>
              </div>
              <div className="p-4 rounded-xl bg-white border border-[#E2E8F0]">
                <span className="text-[#64748B] block text-[11px]">Counter Sale Price</span>
                <span className="text-xl font-extrabold text-[#0D5C63] font-mono-num mt-1 block">
                  ₹ {safeToFixed(salePrice)}
                </span>
                <span className="text-[10px] text-[#15803D] font-bold">Standard Retail POS Rate</span>
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
              <p>Product created by {p.createdByUid || 'Staff User'} on {formatDate(p.createdAt)}</p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
