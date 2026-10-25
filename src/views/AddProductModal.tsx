import React, { useState, useEffect } from 'react';
import { Pill, Upload, Barcode, Shield, DollarSign, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { FormField, TextInput, CurrencyInput, Select, Toggle } from '../components/ui/Input';
import { MediaUploader } from '../components/media/MediaUploader';
import { Product, DosageForm, ScheduleCategory } from '../types/product';
import { MediaAsset } from '../types/foundation';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../context/ToastContext';
import { createProduct, updateProduct, checkDuplicateProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getManufacturers } from '../services/manufacturerService';

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
  const [manufacturers, setManufacturers] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    productName: '',
    brand: '',
    composition: '',
    dosageForm: 'Tablet',
    strength: '500mg',
    routeOfAdministration: 'Oral',
    categoryId: '',
    categoryName: '',
    manufacturerId: '',
    manufacturerName: '',
    schedule: 'OTC',
    hsnCode: '30049019',
    gstRate: 12,
    taxInclusive: false,
    defaultMrp: 0,
    defaultPurchaseCost: 0,
    defaultSalePrice: 0,
    minMarginPercent: 20,
    rackLocation: '',
    minStockLevel: 10,
    maxStockLevel: 500,
    reorderPoint: 20,
    packaging: {
      packUnit: 'Strip',
      baseUnit: 'Tablet',
      conversionFactor: 10,
    },
    isColdChain: false,
    isNarcotic: false,
    isBanned: false,
    requiresPrescription: false,
    status: 'active',
  });

  const [mediaAsset, setMediaAsset] = useState<MediaAsset | null>(null);

  useEffect(() => {
    if (organization && isOpen) {
      getCategories(organization.id).then((cats) => {
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      });
      getManufacturers(organization.id).then((mfrs) => {
        setManufacturers(mfrs.map((m) => ({ id: m.id, name: m.name })));
      });
    }

    if (initialData) {
      setFormData(initialData);
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
          fileSize: 0,
          format: 'jpg',
          resourceType: 'image',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      setFormData({
        productName: '',
        brand: '',
        composition: '',
        dosageForm: 'Tablet',
        strength: '500mg',
        routeOfAdministration: 'Oral',
        categoryId: '',
        categoryName: '',
        manufacturerId: '',
        manufacturerName: '',
        schedule: 'OTC',
        hsnCode: '30049019',
        gstRate: 12,
        taxInclusive: false,
        defaultMrp: 0,
        defaultPurchaseCost: 0,
        defaultSalePrice: 0,
        minMarginPercent: 20,
        rackLocation: '',
        minStockLevel: 10,
        maxStockLevel: 500,
        reorderPoint: 20,
        packaging: { packUnit: 'Strip', baseUnit: 'Tablet', conversionFactor: 10 },
        isColdChain: false,
        isNarcotic: false,
        isBanned: false,
        requiresPrescription: false,
        status: 'active',
      });
      setMediaAsset(null);
    }
  }, [isOpen, initialData, organization?.id]);

  // Real-time duplicate check when entering Brand & Salt
  useEffect(() => {
    if (!initialData && organization && formData.brand && formData.composition) {
      const timer = setTimeout(async () => {
        const dup = await checkDuplicateProduct(
          organization.id,
          formData.brand || '',
          formData.composition || '',
          formData.strength || '',
          formData.dosageForm || 'Tablet'
        );
        if (dup) {
          setDuplicateWarning(`Warning: Existing medicine "${dup.productName}" (${dup.sku}) shares the same brand, salt, strength, and dosage form.`);
        } else {
          setDuplicateWarning(null);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setDuplicateWarning(null);
    }
  }, [formData.brand, formData.composition, formData.strength, formData.dosageForm, organization?.id, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !user) {
      error('You must be logged in to create products.', 'Authentication Required');
      return;
    }

    if (!formData.productName?.trim() || !formData.brand?.trim() || !formData.composition?.trim()) {
      warning('Please provide Product Name, Brand Name, and Generic Composition.', 'Missing Required Fields');
      return;
    }

    try {
      setIsSaving(true);
      const selectedCategory = categories.find((c) => c.id === formData.categoryId);
      const selectedMfr = manufacturers.find((m) => m.id === formData.manufacturerId);

      const payload = {
        ...formData,
        categoryName: selectedCategory ? selectedCategory.name : formData.categoryName || 'General',
        manufacturerName: selectedMfr ? selectedMfr.name : formData.manufacturerName || 'Generic Manufacturer',
        mediaAssetId: mediaAsset ? mediaAsset.id : null,
        mediaPublicId: mediaAsset ? mediaAsset.publicId : null,
        mediaUrl: mediaAsset ? mediaAsset.secureUrl : null,
        imageUrl: mediaAsset ? mediaAsset.secureUrl : (formData.imageUrl || null),
      };

      const caller = { uid: user.uid, email: user.email, displayName: user.displayName };

      if (initialData) {
        await updateProduct(organization.id, initialData.id, caller, payload as any);
        success(`Updated master record for "${payload.productName}".`, 'Product Updated');
      } else {
        await createProduct(organization.id, caller, payload as any);
        success(`Registered "${payload.productName}" in pharmacy master.`, 'Product Created');
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
      title={initialData ? 'Edit Product Master' : 'Add New Medicine Master Record'}
      subtitle="Register canonical identity, compliance salts, statutory tax rates, and pricing"
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

        {/* Section 1: Product Identity */}
        <div>
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5" /> 1. Commercial Identity & Salt
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Commercial Medicine Name" required>
              <TextInput
                placeholder="e.g. Paracetamol 500mg Tablet"
                value={formData.productName || ''}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              />
            </FormField>

            <FormField label="Brand / Trade Name" required>
              <TextInput
                placeholder="e.g. Crocin, Pan-40, Augmentin"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </FormField>

            <FormField label="Generic Salt / Active Composition" required>
              <TextInput
                placeholder="e.g. Paracetamol IP 500mg"
                value={formData.composition || ''}
                onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField label="Dosage Form">
                <Select
                  value={formData.dosageForm || 'Tablet'}
                  onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value as DosageForm })}
                >
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment">Ointment / Cream</option>
                  <option value="Drops">Drops</option>
                  <option value="Inhaler">Inhaler / Respule</option>
                  <option value="Sachet">Sachet / Powder</option>
                  <option value="Gel">Gel</option>
                  <option value="Lotion">Lotion</option>
                </Select>
              </FormField>

              <FormField label="Strength / Concentration">
                <TextInput
                  placeholder="e.g. 500mg, 40mg/5ml"
                  value={formData.strength || ''}
                  onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Section 2: Master Classifications */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3">
            2. Master Classifications & Manufacturer
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Category">
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

            <FormField label="Manufacturer">
              <Select
                value={formData.manufacturerId || ''}
                onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
              >
                <option value="">Select Manufacturer...</option>
                {manufacturers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </div>

        {/* Section 3: Statutory & Schedule */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> 3. Drug Schedule & GST Taxes
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Drug Schedule">
              <Select
                value={formData.schedule || 'OTC'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    schedule: e.target.value as ScheduleCategory,
                    requiresPrescription: e.target.value !== 'OTC',
                  })
                }
              >
                <option value="OTC">OTC (Over the Counter)</option>
                <option value="H">Schedule H (Prescription Required)</option>
                <option value="H1">Schedule H1 (High Antibiotic / Logged)</option>
                <option value="X">Schedule X (Narcotic Strict)</option>
                <option value="G">Schedule G</option>
              </Select>
            </FormField>

            <FormField label="HSN Code">
              <TextInput
                placeholder="30049019"
                value={formData.hsnCode || ''}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
              />
            </FormField>

            <FormField label="GST Rate Slab">
              <Select
                value={formData.gstRate?.toString() || '12'}
                onChange={(e) => setFormData({ ...formData, gstRate: Number(e.target.value) })}
              >
                <option value="0">0% (Exempt)</option>
                <option value="5">5% (GST 5%)</option>
                <option value="12">12% (GST 12% - Medicines)</option>
                <option value="18">18% (GST 18% - FMCG)</option>
                <option value="28">28% (GST 28%)</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
            <Toggle
              checked={formData.isColdChain || false}
              onChange={(e) => setFormData({ ...formData, isColdChain: e.target.checked })}
              label="Cold Chain Storage (2°C - 8°C)"
            />
            <Toggle
              checked={formData.requiresPrescription || false}
              onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
              label="Prescription Required"
            />
          </div>
        </div>

        {/* Section 4: Pricing & Unit Conversion */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> 4. Pricing & Strip Packaging
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <FormField label="Counter Sale Price">
              <CurrencyInput
                placeholder="0.00"
                value={formData.defaultSalePrice || ''}
                onChange={(e) => setFormData({ ...formData, defaultSalePrice: parseFloat(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
            <FormField label="Pack Outer Unit">
              <TextInput
                placeholder="Strip / Bottle / Box"
                value={formData.packaging?.packUnit || 'Strip'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packaging: { ...formData.packaging!, packUnit: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Base Dispensing Unit">
              <TextInput
                placeholder="Tablet / Capsule / ml"
                value={formData.packaging?.baseUnit || 'Tablet'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packaging: { ...formData.packaging!, baseUnit: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="Conversion Factor (Units/Pack)">
              <TextInput
                placeholder="e.g. 10 or 15"
                value={formData.packaging?.conversionFactor || 10}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packaging: { ...formData.packaging!, conversionFactor: parseInt(e.target.value) || 1 },
                  })
                }
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
            <FormField label="Pharmacy Shelf / Rack Location">
              <TextInput
                placeholder="e.g. Rack A-01-02"
                value={formData.rackLocation || ''}
                onChange={(e) => setFormData({ ...formData, rackLocation: e.target.value })}
              />
            </FormField>
          </div>
        </div>

        {/* Section 5: Media Upload */}
        <div className="pt-3 border-t border-[#F1F5F9]">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider mb-2">
            5. Packaging Photograph (ImageKit Upload)
          </h4>
          <MediaUploader
            category="products"
            value={mediaAsset}
            onChange={setMediaAsset}
            label="Upload Medicine Box / Strip Image"
            description="Signed upload to ImageKit. Image URL saved in product document."
          />
        </div>
      </form>
    </Modal>
  );
};
