import React, { useState, useEffect } from 'react';
import {
  Grid,
  Upload,
  Barcode,
  Shield,
  DollarSign,
  Check,
  AlertTriangle,
  RefreshCw,
  Box,
  Droplet,
  Layers,
  Wrench,
  Tag,
  Plus,
  Package,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { FormField, TextInput, CurrencyInput, Select } from '../components/ui/Input';
import { MediaUploader } from '../components/media/MediaUploader';
import { Product, CategoryType, TileFinish, TileBodyType, TileGrade, Manufacturer, UnitDefinition } from '../types/product';
import { MediaAsset } from '../types/foundation';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { createProduct, updateProduct, checkDuplicateProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getManufacturers, createManufacturer } from '../services/manufacturerService';
import { getUnits } from '../services/unitService';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: Product | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [units, setUnits] = useState<UnitDefinition[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Quick brand creation inline modal state
  const [isQuickBrandModalOpen, setIsQuickBrandModalOpen] = useState(false);
  const [quickBrandName, setQuickBrandName] = useState('');

  const [categoryType, setCategoryType] = useState<CategoryType>('tiles');

  const [formData, setFormData] = useState<Partial<Product>>({
    productName: '',
    brand: '',
    categoryType: 'tiles',
    productType: 'Vitrified Tiles',
    
    // Tiles defaults
    tileDimensions: '600x1200 mm (2x4 ft)',
    surfaceFinish: 'Glossy',
    tileBodyType: 'Glazed Vitrified (GVT)',
    tileGrade: 'Premium',
    coveragePerBoxSqFt: 15.5,
    piecesPerBox: 4,
    weightPerBoxKg: 28,

    // Sanitaryware defaults
    sanitaryType: 'Wash Basin',
    mountingType: 'Wall-Hung',
    trapType: 'S-Trap 220mm',
    colorFinish: 'Glossy White',
    flushingType: 'Dual Flush 3/6L',

    // Faucets & Fittings defaults
    fittingType: 'Single Lever Diverter',
    materialFinish: 'Chrome Plated Brass',
    cartridgeType: 'Ceramic Disc Cartridge',
    warrantyYears: 10,

    // Chemicals & Adhesives defaults
    chemicalType: 'Type 2 Heavy Duty GVT Tile Adhesive',
    packSizeKg: 20,
    coverageSqFtPerBag: 55,

    // Other / Manual specs
    composition: '',

    categoryId: '',
    categoryName: 'Vitrified Tiles',
    manufacturerId: '',
    manufacturerName: '',
    hsnCode: '6907',
    gstRate: 18,
    taxInclusive: false,
    defaultMrp: 0,
    defaultPurchaseCost: 0,
    defaultSalePrice: 0,
    minMarginPercent: 20,
    rackLocation: 'Yard Bay A-01',
    minStockLevel: 10,
    maxStockLevel: 1000,
    reorderPoint: 20,
    packaging: {
      packUnit: 'Box',
      baseUnit: 'Sq. Ft',
      conversionFactor: 15.5,
    },
    status: 'active',
  });

  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null);

  const loadMasterSlabs = async () => {
    if (!organization) return;
    try {
      const [cats, mfrs, unitList] = await Promise.all([
        getCategories(organization.id),
        getManufacturers(organization.id),
        getUnits(organization.id),
      ]);
      setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      setManufacturers(mfrs);
      setUnits(unitList);
    } catch (err) {
      console.error('Error loading master slabs for modal:', err);
    }
  };

  useEffect(() => {
    if (organization && isOpen) {
      loadMasterSlabs();
    }

    if (initialData) {
      let type: CategoryType = initialData.categoryType || 'tiles';
      if (!initialData.categoryType) {
        const cat = ((initialData.categoryName || '') + ' ' + (initialData.productName || '')).toLowerCase();
        if (
          cat.includes('sanitary') ||
          cat.includes('basin') ||
          cat.includes('closet') ||
          cat.includes('toilet') ||
          (initialData as any).sanitaryType
        ) {
          type = 'sanitaryware';
        } else if (
          cat.includes('faucet') ||
          cat.includes('tap') ||
          cat.includes('diverter') ||
          (initialData as any).fittingType
        ) {
          type = 'faucets';
        } else if (
          cat.includes('adhesive') ||
          cat.includes('grout') ||
          (initialData as any).chemicalType
        ) {
          type = 'adhesives';
        } else if (cat.includes('pipe') || (initialData as any).pipeType) {
          type = 'other';
        }
      }
      setCategoryType(type);
      setFormData({
        ...initialData,
        categoryType: type,
        brand: initialData.brand || '',
        tileDimensions: initialData.tileDimensions || '600x1200 mm (2x4 ft)',
        surfaceFinish: initialData.surfaceFinish || 'Glossy',
        tileBodyType: initialData.tileBodyType || 'Glazed Vitrified (GVT)',
        tileGrade: initialData.tileGrade || 'Premium',
        coveragePerBoxSqFt: initialData.coveragePerBoxSqFt || 15.5,
        piecesPerBox: initialData.piecesPerBox || 4,
        weightPerBoxKg: initialData.weightPerBoxKg || 28,
      });
      if (initialData.mediaUrl) {
        setMediaAsset({
          id: initialData.mediaAssetId || 'asset_existing',
          organizationId: organization?.id || '',
          storeId: null,
          ownerUid: initialData.createdByUid || '',
          category: 'products',
          publicId: initialData.mediaPublicId || '',
          url: initialData.mediaUrl,
          secureUrl: initialData.mediaUrl,
          fileName: 'product_image.jpg',
          originalName: 'product_image.jpg',
          fileSize: 1024,
          bytes: 1024,
          format: 'jpg',
          resourceType: 'image',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setMediaAsset(null);
      }
    } else {
      setMediaAsset(null);
      setCategoryType('tiles');
      setFormData({
        productName: '',
        brand: '',
        categoryType: 'tiles',
        productType: 'Vitrified Tiles',
        tileDimensions: '600x1200 mm (2x4 ft)',
        surfaceFinish: 'Glossy',
        tileBodyType: 'Glazed Vitrified (GVT)',
        tileGrade: 'Premium',
        coveragePerBoxSqFt: 15.5,
        piecesPerBox: 4,
        weightPerBoxKg: 28,
        categoryId: '',
        categoryName: 'Vitrified Tiles',
        manufacturerId: '',
        manufacturerName: '',
        hsnCode: '6907',
        gstRate: 18,
        taxInclusive: false,
        defaultMrp: 0,
        defaultPurchaseCost: 0,
        defaultSalePrice: 0,
        minMarginPercent: 20,
        rackLocation: 'Yard Bay A-01',
        minStockLevel: 10,
        maxStockLevel: 1000,
        reorderPoint: 20,
        packaging: { packUnit: 'Box', baseUnit: 'Sq. Ft', conversionFactor: 15.5 },
        status: 'active',
      });
      setMediaAsset(null);
    }
  }, [isOpen, initialData, organization?.id]);

  // Handle Category Type Switch & set Smart Defaults
  const handleCategoryTypeChange = (newType: CategoryType) => {
    setCategoryType(newType);
    let hsn = '6907';
    let packUnit = 'Box';
    let baseUnit = 'Sq. Ft';
    let factor = 15.5;

    switch (newType) {
      case 'tiles':
        hsn = '6907';
        packUnit = 'Box';
        baseUnit = 'Sq. Ft';
        factor = 15.5;
        break;
      case 'sanitaryware':
        hsn = '6910';
        packUnit = 'Piece';
        baseUnit = 'Piece';
        factor = 1;
        break;
      case 'faucets':
        hsn = '8481';
        packUnit = 'Piece';
        baseUnit = 'Piece';
        factor = 1;
        break;
      case 'adhesives':
        hsn = '3506';
        packUnit = 'Bag';
        baseUnit = 'Kg';
        factor = 20;
        break;
      case 'other':
        hsn = '6907';
        packUnit = 'Piece';
        baseUnit = 'Piece';
        factor = 1;
        break;
      default:
        hsn = '6907';
        packUnit = 'Piece';
        baseUnit = 'Piece';
        factor = 1;
    }

    setFormData((prev) => ({
      ...prev,
      categoryType: newType,
      hsnCode: hsn,
      packaging: {
        packUnit,
        baseUnit,
        conversionFactor: factor,
      },
    }));
  };

  const handleQuickAddBrand = async () => {
    if (!quickBrandName.trim() || !organization || !user) return;
    try {
      const created = await createManufacturer(
        organization.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        {
          name: quickBrandName.trim(),
          shortName: quickBrandName.trim(),
          status: 'active',
        }
      );
      setManufacturers((prev) => [...prev, created]);
      setFormData((prev) => ({
        ...prev,
        brand: created.name,
        manufacturerId: created.id,
        manufacturerName: created.name,
      }));
      setQuickBrandName('');
      setIsQuickBrandModalOpen(false);
      success(`Added Brand "${created.name}"`, 'Brand Created');
    } catch (err: any) {
      error(err?.message || 'Failed to create brand', 'Error');
    }
  };

  // Real-time duplicate check
  useEffect(() => {
    if (!initialData && organization && formData.brand && formData.productName) {
      const timer = setTimeout(async () => {
        const dup = await checkDuplicateProduct(
          organization.id,
          formData.brand || '',
          formData.productName || ''
        );
        if (dup) {
          setDuplicateWarning(`Warning: Existing item "${dup.productName}" (${dup.sku}) shares the same brand and model specifications.`);
        } else {
          setDuplicateWarning(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.brand, formData.productName, organization?.id, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) {
      error('You must be logged in to create products.', 'Authentication Required');
      return;
    }

    if (!formData.productName?.trim() || !formData.brand?.trim()) {
      warning('Please select Brand / Manufacturer and enter Product Name.', 'Missing Required Fields');
      return;
    }

    try {
      setIsSaving(true);
      const selectedCategory = categories.find((c) => c.id === formData.categoryId);
      const selectedMfr = manufacturers.find((m) => m.name === formData.brand || m.id === formData.manufacturerId);

      const payload = {
        ...formData,
        categoryType,
        brand: formData.brand.trim(),
        categoryName: selectedCategory ? selectedCategory.name : formData.categoryName || 'General',
        manufacturerId: selectedMfr ? selectedMfr.id : formData.manufacturerId || '',
        manufacturerName: selectedMfr ? selectedMfr.name : formData.brand.trim(),
        mediaAssetId: mediaAsset ? mediaAsset.id : null,
        mediaPublicId: mediaAsset ? mediaAsset.publicId : null,
        mediaUrl: mediaAsset ? mediaAsset.secureUrl : null,
        imageUrl: mediaAsset ? mediaAsset.secureUrl : (formData.imageUrl || null),
      };

      const caller = { uid: user.uid, email: user.email, displayName: user.displayName };

      if (initialData) {
        await updateProduct(organization.id, initialData.id, caller, payload as any);
        success(`Updated product master record for "${payload.productName}".`, 'Product Updated');
      } else {
        await createProduct(organization.id, caller, payload as any);
        success(`Registered "${payload.productName}" in master catalog.`, 'Product Created');
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      error(err?.message || 'Error saving product record.', 'Save Failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Product Master' : 'Add New Showroom Product Master'}
      subtitle="Universal Product Entry for Tiles, Sanitaryware, Faucets, Chemicals & General Materials"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={isSaving ? RefreshCw : Check}
            isLoading={isSaving}
            disabled={isSaving}
            onClick={handleSubmit}
          >
            {initialData ? 'Save Changes' : 'Create Product Master'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Duplicate Alert Banner */}
        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="font-medium text-xs">{duplicateWarning}</span>
          </div>
        )}

        {/* Section 1: Category Selector (Dynamic Switcher) */}
        <div>
          <label className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-2 block">
            Select Product Line / Category Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handleCategoryTypeChange('tiles')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                categoryType === 'tiles'
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63] shadow-sm'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Tiles & Slabs</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryTypeChange('sanitaryware')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                categoryType === 'sanitaryware'
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63] shadow-sm'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Droplet className="w-4 h-4" />
              <span>Sanitaryware</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryTypeChange('faucets')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                categoryType === 'faucets'
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63] shadow-sm'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Faucets & CP</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryTypeChange('adhesives')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                categoryType === 'adhesives'
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63] shadow-sm'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Tile Adhesive</span>
            </button>

            <button
              type="button"
              onClick={() => handleCategoryTypeChange('other')}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer ${
                categoryType === 'other'
                  ? 'bg-[#0D5C63] text-white border-[#0D5C63] shadow-sm'
                  : 'bg-white text-[#334155] border-[#CBD5E1] hover:bg-[#F8FAFC]'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Other / General</span>
            </button>
          </div>
        </div>

        {/* Section 2: General Identity */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3">
            1. Brand & Product Identity
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Product Name / Model" required>
              <TextInput
                placeholder={
                  categoryType === 'tiles'
                    ? 'e.g. Statuario High Gloss Vitrified Tile'
                    : categoryType === 'sanitaryware'
                    ? 'e.g. Table Top Counter Basin Oval'
                    : categoryType === 'faucets'
                    ? 'e.g. Single Lever Diverter Chrome'
                    : categoryType === 'adhesives'
                    ? 'e.g. Type 2 Heavy Duty Tile Adhesive 20kg'
                    : 'e.g. CPVC Pipe 3/4 Inch SDR 11 / Custom Fitting'
                }
                value={formData.productName || ''}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </FormField>

            {/* Connected Brand / Manufacturer Dropdown from Master Slabs */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#0B1F33]">
                  Brand / Manufacturer <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsQuickBrandModalOpen(true)}
                  className="text-[11px] font-bold text-[#0D5C63] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Brand
                </button>
              </div>
              <Select
                value={formData.brand || ''}
                onChange={(e) => {
                  const mfrName = e.target.value;
                  const selectedMfr = manufacturers.find((m) => m.name === mfrName);
                  setFormData({
                    ...formData,
                    brand: mfrName,
                    manufacturerId: selectedMfr ? selectedMfr.id : '',
                    manufacturerName: mfrName,
                  });
                }}
              >
                <option value="">Select Brand / Manufacturer...</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            <FormField label="Category Master">
              <Select
                value={formData.categoryId || ''}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Godown / Yard Rack Location">
              <TextInput
                placeholder="e.g. Yard Bay A-04, Rack S-2"
                value={formData.rackLocation || ''}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        {/* Section 3: Category Specific Dynamic Technical Specifications */}

        {/* A. TILES & SLABS FIELDS */}
        {categoryType === 'tiles' && (
          <div className="pt-3 border-t border-[#F1F5F9]">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5" /> 2. Tile Specifications & Box Coverage
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Tile Dimensions">
                <Select
                  value={formData.tileDimensions || '600x1200 mm (2x4 ft)'}
                  onChange={(e) => setFormData({ ...formData, tileDimensions: e.target.value })}
                >
                  <option value="600x1200 mm (2x4 ft)">600x1200 mm (2x4 ft)</option>
                  <option value="800x1600 mm (2.6x5.2 ft)">800x1600 mm (2.6x5.2 ft)</option>
                  <option value="600x600 mm (2x2 ft)">600x600 mm (2x2 ft)</option>
                  <option value="300x600 mm (1x2 ft)">300x600 mm (1x2 ft)</option>
                  <option value="300x450 mm (12x18 in)">300x450 mm (12x18 in)</option>
                  <option value="1200x2400 mm Slabs">1200x2400 mm Slabs</option>
                </Select>
              </FormField>

              <FormField label="Surface Finish">
                <Select
                  value={formData.surfaceFinish || 'Glossy'}
                  onChange={(e) => setFormData({ ...formData, surfaceFinish: e.target.value as TileFinish })}
                >
                  <option value="Glossy">Glossy / High Polish</option>
                  <option value="High Gloss">High Gloss / Mirror</option>
                  <option value="Matt">Matt / Anti-Skid</option>
                  <option value="Carving">Carving Wood Grain</option>
                  <option value="Sugar">Sugar / Punch Finish</option>
                  <option value="Bookmatch">Bookmatch Italian Marble</option>
                  <option value="Rustic">Rustic Concrete</option>
                </Select>
              </FormField>

              <FormField label="Body Type">
                <Select
                  value={formData.tileBodyType || 'Glazed Vitrified (GVT)'}
                  onChange={(e) => setFormData({ ...formData, tileBodyType: e.target.value as TileBodyType })}
                >
                  <option value="Glazed Vitrified (GVT)">Glazed Vitrified Tile (GVT/PGVT)</option>
                  <option value="Full Body">Full Body Vitrified</option>
                  <option value="Double Charge">Double Charge Vitrified</option>
                  <option value="Soluble Salt">Soluble Salt Vitrified</option>
                  <option value="Ceramic Body">Ceramic Wall/Floor</option>
                  <option value="Porcelain">Porcelain Body</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <FormField label="Coverage Per Box (Sq. Ft)">
                <TextInput
                  type="number"
                  step="0.01"
                  value={formData.coveragePerBoxSqFt || 15.5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      coveragePerBoxSqFt: parseFloat(e.target.value) || 0,
                      packaging: { ...formData.packaging!, conversionFactor: parseFloat(e.target.value) || 15.5 },
                    })
                  }
                />
              </FormField>

              <FormField label="Pieces Per Box">
                <TextInput
                  type="number"
                  value={formData.piecesPerBox || 4}
                  onChange={(e) => setFormData({ ...formData, piecesPerBox: parseInt(e.target.value) || 1 })}
                />
              </FormField>

              <FormField label="Weight Per Box (Kg)">
                <TextInput
                  type="number"
                  value={formData.weightPerBoxKg || 28}
                  onChange={(e) => setFormData({ ...formData, weightPerBoxKg: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* B. SANITARYWARE FIELDS */}
        {categoryType === 'sanitaryware' && (
          <div className="pt-3 border-t border-[#F1F5F9]">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Droplet className="w-3.5 h-3.5" /> 2. Sanitaryware & Ceramic Toilet Specifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Sanitary Item Type">
                <Select
                  value={formData.sanitaryType || 'Wash Basin'}
                  onChange={(e) => setFormData({ ...formData, sanitaryType: e.target.value })}
                >
                  <option value="Wash Basin">Wash Basin / Countertop</option>
                  <option value="Wall-Hung WC">Wall-Hung WC / Commode</option>
                  <option value="One-Piece WC">One-Piece WC Commode</option>
                  <option value="Pedestal Basin">Pedestal Wash Basin</option>
                  <option value="Urinal">Urinal Pot</option>
                  <option value="Cistern Tank">Concealed Cistern Tank</option>
                </Select>
              </FormField>

              <FormField label="Mounting Type">
                <Select
                  value={formData.mountingType || 'Wall-Hung'}
                  onChange={(e) => setFormData({ ...formData, mountingType: e.target.value })}
                >
                  <option value="Wall-Hung">Wall-Hung (Concealed Frame)</option>
                  <option value="Floor Mounted">Floor Mounted (S-Trap/P-Trap)</option>
                  <option value="Countertop">Countertop / Table Top</option>
                  <option value="Under-Counter">Under-Counter Basin</option>
                </Select>
              </FormField>

              <FormField label="Trap / Waste Outlet Size">
                <Select
                  value={formData.trapType || 'S-Trap 220mm'}
                  onChange={(e) => setFormData({ ...formData, trapType: e.target.value })}
                >
                  <option value="S-Trap 220mm">S-Trap 220mm (8 inch)</option>
                  <option value="S-Trap 300mm">S-Trap 300mm (12 inch)</option>
                  <option value="P-Trap 180mm">P-Trap 180mm (Wall Outlet)</option>
                  <option value="N/A">Not Applicable</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <FormField label="Color & Surface Finish">
                <Select
                  value={formData.colorFinish || 'Glossy White'}
                  onChange={(e) => setFormData({ ...formData, colorFinish: e.target.value })}
                >
                  <option value="Glossy White">Glossy White</option>
                  <option value="Matt Black">Matt Black</option>
                  <option value="Ivory / Cream">Ivory / Cream</option>
                  <option value="Dual Tone">Dual Tone Gold / White</option>
                </Select>
              </FormField>

              <FormField label="Flushing System">
                <Select
                  value={formData.flushingType || 'Dual Flush 3/6L'}
                  onChange={(e) => setFormData({ ...formData, flushingType: e.target.value })}
                >
                  <option value="Dual Flush 3/6L">Dual Flush 3L / 6L Water Saver</option>
                  <option value="Tornado Flush">Tornado Whirlpool Flush</option>
                  <option value="Rimless">Rimless Hygienic Flush</option>
                  <option value="N/A">N/A (Basin / Accessory)</option>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {/* C. FAUCETS & SHOWERS FIELDS */}
        {categoryType === 'faucets' && (
          <div className="pt-3 border-t border-[#F1F5F9]">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5" /> 2. Faucet, Shower & Brass Fittings Specs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="CP Fitting Type">
                <Select
                  value={formData.fittingType || 'Single Lever Diverter'}
                  onChange={(e) => setFormData({ ...formData, fittingType: e.target.value })}
                >
                  <option value="Single Lever Diverter">Concealed Diverter / Mixer</option>
                  <option value="Pillar Cock">Pillar Cock (Basin Tap)</option>
                  <option value="Bib Cock">Bib Cock (Wall Tap)</option>
                  <option value="Overhead Shower">Overhead Rain Shower</option>
                  <option value="Hand Shower">Hand Shower Set</option>
                  <option value="Angle Valve">Angle Valve</option>
                </Select>
              </FormField>

              <FormField label="Material & Finish">
                <Select
                  value={formData.materialFinish || 'Chrome Plated Brass'}
                  onChange={(e) => setFormData({ ...formData, materialFinish: e.target.value })}
                >
                  <option value="Chrome Plated Brass">Chrome Plated Solid Brass</option>
                  <option value="Matt Black PVD">Matt Black PVD</option>
                  <option value="Rose Gold">Rose Gold PVD</option>
                  <option value="Stainless Steel 304">Stainless Steel 304</option>
                </Select>
              </FormField>

              <FormField label="Warranty Period">
                <Select
                  value={formData.warrantyYears?.toString() || '10'}
                  onChange={(e) => setFormData({ ...formData, warrantyYears: parseInt(e.target.value) || 10 })}
                >
                  <option value="10">10 Years Manufacturer Warranty</option>
                  <option value="12">12 Years Warranty</option>
                  <option value="5">5 Years Warranty</option>
                  <option value="1">1 Year Warranty</option>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {/* D. ADHESIVES & CHEMICALS FIELDS */}
        {categoryType === 'adhesives' && (
          <div className="pt-3 border-t border-[#F1F5F9]">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> 2. Tile Adhesive, Epoxy Grout & Chemical Parameters
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Chemical Grade">
                <Select
                  value={formData.chemicalType || 'Type 2 Heavy Duty GVT Tile Adhesive'}
                  onChange={(e) => setFormData({ ...formData, chemicalType: e.target.value })}
                >
                  <option value="Type 1 Ceramic Tile Adhesive">Type 1 Ceramic Tile Adhesive</option>
                  <option value="Type 2 Heavy Duty GVT Tile Adhesive">Type 2 Heavy Duty GVT Tile Adhesive</option>
                  <option value="Type 3 Glass Mosaic & Marble Adhesive">Type 3 Outdoor / Glass Mosaic Adhesive</option>
                  <option value="Epoxy Grout 3-Part">Epoxy Tile Grout 3-Part Set</option>
                  <option value="Tile Cleaner & Acid Remover">Tile Cleaner & Acid Wash</option>
                </Select>
              </FormField>

              <FormField label="Bag / Bucket Pack Size (Kg)">
                <TextInput
                  type="number"
                  placeholder="20"
                  value={formData.packSizeKg || 20}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      packSizeKg: parseFloat(e.target.value) || 20,
                      packaging: { ...formData.packaging!, conversionFactor: parseFloat(e.target.value) || 20 },
                    })
                  }
                />
              </FormField>

              <FormField label="Coverage (Sq. Ft per Bag)">
                <TextInput
                  type="number"
                  placeholder="55"
                  value={formData.coverageSqFtPerBag || 55}
                  onChange={(e) => setFormData({ ...formData, coverageSqFtPerBag: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            </div>
          </div>
        )}

        {/* E. OTHER / GENERAL MANUAL SPECIFICATIONS */}
        {categoryType === 'other' && (
          <div className="pt-3 border-t border-[#F1F5F9]">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> 2. Manual Custom Details & Product Specifications
            </h4>
            <FormField label="Item Specifications & Custom Details (e.g. Pipe Diameter, Length, Material, Rating)">
              <TextInput
                placeholder="Type custom specs e.g. 3/4 inch CPVC SDR 11 Pipe 10-Ft, Brass Fitting, Water Tank..."
                value={formData.composition || ''}
                onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
              />
            </FormField>
          </div>
        )}

        {/* Section 4: Units, HSN & Pricing */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> 3. HSN Taxes & Commercial Rates
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="HSN Tax Code">
              <TextInput
                placeholder="6907 / 6910 / 8481 / 3506 / 3917"
                value={formData.hsnCode || '6907'}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              />
            </FormField>

            <FormField label="GST Rate Slab">
              <Select
                value={formData.gstRate?.toString() || '18'}
                onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
              >
                <option value="18">18% (Standard GST - Tiles, Sanitary & Faucets)</option>
                <option value="12">12% (Adhesives & Grout)</option>
                <option value="28">28% (Luxury Fittings)</option>
                <option value="5">5% (Building Materials)</option>
              </Select>
            </FormField>

            {/* Connected Primary Packaging Unit Dropdown from Master Slabs */}
            <FormField label="Primary Stock Unit">
              <Select
                value={formData.packaging?.packUnit || 'Box'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packaging: { ...formData.packaging!, packUnit: e.target.value },
                  })
                }
              >
                {units.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <FormField label="MRP (Max Retail Price)">
              <CurrencyInput
                placeholder="0.00"
                value={formData.defaultMrp || ''}
                onChange={(e) => setFormData({ ...formData, defaultMrp: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Landed Purchase Cost">
              <CurrencyInput
                placeholder="0.00"
                value={formData.defaultPurchaseCost || ''}
                onChange={(e) => setFormData({ ...formData, defaultPurchaseCost: parseFloat(e.target.value) || 0 })}
              />
            </FormField>

            <FormField label="Showroom Sale Price">
              <CurrencyInput
                placeholder="0.00"
                value={formData.defaultSalePrice || ''}
                onChange={(e) => setFormData({ ...formData, defaultSalePrice: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        </div>

        {/* Section 5: Media Image Upload */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-2">
            4. Product Catalog Photo
          </h4>
          <MediaUploader
            category="products"
            value={mediaAsset}
            onChange={setMediaAsset}
            label="Upload Product Sample Image"
            description="High-res image for customer quotation printouts and online showroom catalog."
          />
        </div>
      </form>

      {/* Quick Brand Creation Inline Modal */}
      <Modal
        isOpen={isQuickBrandModalOpen}
        onClose={() => setIsQuickBrandModalOpen(false)}
        title="Add New Brand / Manufacturer Master"
        subtitle="Quickly register a new brand into Master Data Slabs"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsQuickBrandModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleQuickAddBrand}>
              Save Brand
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <FormField label="Brand / Manufacturer Name" required>
            <TextInput
              placeholder="e.g. Astral Pipes, Cera, Jaquar, Somany"
              value={quickBrandName}
              onChange={(e) => setQuickBrandName(e.target.value)}
            />
          </FormField>
        </div>
      </Modal>
    </Modal>
  );
};
