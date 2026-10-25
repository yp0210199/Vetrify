import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, Download, Check, RefreshCw } from 'lucide-react';
import { Drawer } from '../ui/Modal';
import { Button } from '../ui/Button';
import { parseProductsCsvContent, batchImportProducts } from '../../services/productService';
import { ProductImportSummary } from '../../types/product';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { useToast } from '../../context/ToastContext';

interface ProductCsvImportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProductCsvImportDrawer: React.FC<ProductCsvImportDrawerProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { organization } = useWorkspace();
  const { user } = useAuth();
  const { success, error, warning } = useToast();

  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [summary, setSummary] = useState<ProductImportSummary | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      const parsed = parseProductsCsvContent(text);
      setSummary(parsed);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!organization || !user || !summary) return;

    const validItems = summary.parsedProducts.filter((p) => p.isValid);
    if (validItems.length === 0) {
      warning('There are no valid product rows to import. Please check your CSV format.', 'No Valid Products');
      return;
    }

    try {
      setIsImporting(true);
      const count = await batchImportProducts(
        organization.id,
        { uid: user.uid, email: user.email, displayName: user.displayName },
        validItems
      );

      success(`Successfully created ${count} medicine product master records in Firestore.`, 'Import Successful');

      onSuccess();
      handleReset();
      onClose();
    } catch (err: any) {
      error(err?.message || 'An error occurred during bulk product creation.', 'Import Failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFileContent('');
    setFileName('');
    setSummary(null);
  };

  const downloadSampleTemplate = () => {
    const sampleCsv = `Product Name,Brand,Composition,Dosage Form,Strength,Manufacturer,Category,HSN Code,GST Rate,MRP,Purchase Cost,Sale Rate,Pack Unit,Base Unit,Conversion Factor,Schedule,Rack Location
Paracetamol 500mg,Crocin 500,Paracetamol IP,Tablet,500mg,GSK Pharma,Medicines & Pharmaceuticals,30049019,12,18.00,11.20,16.50,Strip,Tablet,15,OTC,A-01-01
Pantoprazole 40mg,Pan-40,Pantoprazole Sodium,Tablet,40mg,Alkem Labs,Medicines & Pharmaceuticals,30049019,12,32.00,19.50,28.80,Strip,Tablet,15,H,A-01-04
Amoxicillin 625mg,Augmentin 625,Amoxicillin + Clavulanic Acid,Tablet,625mg,GSK India,Antibiotics & Anti-infectives,30041010,12,201.50,142.00,185.00,Strip,Tablet,10,H1,B-02-01`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rx_omni_product_import_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Product CSV Import"
      subtitle="Parse, validate, and bulk register pharmaceutical products into Firestore"
      width="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={downloadSampleTemplate}
          >
            Download CSV Template
          </Button>
          <div className="flex items-center gap-2">
            {summary && (
              <Button variant="secondary" size="sm" onClick={handleReset}>
                Reset
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={isImporting ? RefreshCw : Check}
              disabled={!summary || summary.validRows === 0 || isImporting}
              isLoading={isImporting}
              onClick={handleExecuteImport}
            >
              Import {summary ? summary.validRows : 0} Products
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-xs">
        {/* File Dropzone */}
        {!summary ? (
          <div className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0D5C63] rounded-2xl p-8 bg-[#F8FAFC] text-center transition-colors">
            <Upload className="w-8 h-8 text-[#0D5C63] mx-auto mb-3" />
            <h4 className="text-sm font-bold text-[#0B1F33]">Upload Product Catalog CSV File</h4>
            <p className="text-[#64748B] mt-1">
              File must contain header: Product Name, Brand, Composition, MRP, Purchase Cost, HSN, etc.
            </p>
            <label className="mt-4 inline-block">
              <span className="px-4 py-2 bg-[#0D5C63] text-white font-bold rounded-xl cursor-pointer hover:bg-[#094146] transition-colors inline-flex items-center gap-2">
                <FileText className="w-4 h-4" /> Select CSV File
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white rounded-xl border border-[#E2E8F0] shadow-2xs">
                <span className="text-[#64748B] block text-[10px]">TOTAL ROWS READ</span>
                <span className="text-base font-extrabold text-[#0B1F33] font-mono-num">{summary.totalRows}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 block text-[10px] font-bold">VALID READY TO IMPORT</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono-num">{summary.validRows}</span>
              </div>
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="text-red-800 block text-[10px] font-bold">INVALID ROWS SKIPPED</span>
                <span className="text-base font-extrabold text-red-700 font-mono-num">{summary.invalidRows}</span>
              </div>
            </div>

            {/* Row Validation Preview Table */}
            <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">Row</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Brand & Salt</th>
                    <th className="py-2.5 px-3 text-right">MRP</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {summary.parsedProducts.map((p) => (
                    <tr key={p.rowNumber} className={p.isValid ? 'bg-white' : 'bg-red-50/50'}>
                      <td className="py-2 px-3 text-center font-mono text-[#64748B]">{p.rowNumber}</td>
                      <td className="py-2 px-3 font-bold text-[#0B1F33]">{p.productName || '—'}</td>
                      <td className="py-2 px-3 text-[#475569]">
                        {p.brand} ({p.composition})
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num font-semibold">₹{p.mrp.toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        {p.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full text-[10px]">
                            <CheckCircle className="w-3 h-3" /> Valid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded-full text-[10px]"
                            title={p.errors.join(', ')}
                          >
                            <AlertCircle className="w-3 h-3" /> {p.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
