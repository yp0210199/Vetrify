import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  X,
  Check,
  UploadCloud,
  Sparkles,
  Loader2,
  Image as ImageIcon,
  RotateCw,
} from 'lucide-react';
import { PrescriptionDetails } from '../../types';
import { mediaService } from '../../services/mediaService';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { getFirebaseAuth } from '../../lib/firebase/config';

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: PrescriptionDetails) => void;
  initialData?: PrescriptionDetails | null;
  restrictedItemsCount: number;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  restrictedItemsCount,
}) => {
  const { organization, currentStore } = useWorkspace();
  const { user } = useAuth();

  const [patientName, setPatientName] = useState(initialData?.patientName || '');
  const [patientAge, setPatientAge] = useState<string>(
    initialData?.patientAge ? String(initialData.patientAge) : ''
  );
  const [patientGender, setPatientGender] = useState<'male' | 'female' | 'other'>(
    initialData?.patientGender || 'male'
  );
  const [patientPhone, setPatientPhone] = useState(initialData?.patientPhone || '');
  const [doctorName, setDoctorName] = useState(initialData?.doctorName || '');
  const [doctorRegNo, setDoctorRegNo] = useState(initialData?.doctorRegNo || '');
  const [hospitalClinic, setHospitalClinic] = useState(initialData?.hospitalClinic || '');
  const [prescriptionDate, setPrescriptionDate] = useState(
    initialData?.prescriptionDate || new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(initialData?.notes || '');
  
  // OCR & File Upload States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(initialData?.secureUrl || initialData?.prescriptionUrl || null);
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(initialData?.prescriptionId || null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [aiHighlightedFields, setAiHighlightedFields] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setPatientName(initialData.patientName || '');
      setPatientAge(initialData.patientAge ? String(initialData.patientAge) : '');
      setPatientGender(initialData.patientGender || 'male');
      setPatientPhone(initialData.patientPhone || '');
      setDoctorName(initialData.doctorName || '');
      setDoctorRegNo(initialData.doctorRegNo || '');
      setHospitalClinic(initialData.hospitalClinic || '');
      setPrescriptionDate(
        initialData.prescriptionDate || new Date().toISOString().slice(0, 10)
      );
      setNotes(initialData.notes || '');
      setUploadedFileUrl(initialData.secureUrl || initialData.prescriptionUrl || null);
      setUploadedFileId(initialData.prescriptionId || null);
    } else {
      // Clear for new
      setPatientName('');
      setPatientAge('');
      setPatientGender('male');
      setPatientPhone('');
      setDoctorName('');
      setDoctorRegNo('');
      setHospitalClinic('');
      setPrescriptionDate(new Date().toISOString().slice(0, 10));
      setNotes('');
      setUploadedFileUrl(null);
      setUploadedFileId(null);
      setAiHighlightedFields([]);
    }
    setErrors({});
    setOcrError(null);
    setImageLoadError(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    if (!organization?.id) {
      setOcrError('No organization context loaded. Please switch to an active branch.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setOcrError(null);
    try {
      const auth = getFirebaseAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const result = await mediaService.uploadAsset({
        organizationId: organization.id,
        storeId: currentStore?.id || null,
        category: 'prescription',
        file,
        uploadedByUid: user?.uid || '',
        userToken: token,
        userEmail: user?.email,
        userDisplayName: user?.displayName,
        onProgress: (percent) => {
          setUploadProgress(percent);
        },
      });

      setUploadedFileUrl(result.asset.secureUrl);
      setUploadedFileId(result.asset.id);
      
      // Auto-trigger OCR processing
      await handleOcrProcess(result.asset.secureUrl);
    } catch (err: any) {
      console.error('Prescription upload failed:', err);
      setOcrError(err.userMessage || err.message || 'File upload failed. Ensure correct ImageKit settings.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleOcrProcess = async (imageUrl: string) => {
    setIsOcrProcessing(true);
    setOcrError(null);
    try {
      const auth = getFirebaseAuth();
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      
      const res = await fetch('/api/prescriptions/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizationId: organization?.id,
          imageUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to process prescription image');
      }

      const data = await res.json();
      if (data.success && data.result) {
        const ocr = data.result;
        if (ocr.patientName) setPatientName(ocr.patientName);
        if (ocr.patientAge) setPatientAge(String(ocr.patientAge));
        if (ocr.patientGender) {
          const g = ocr.patientGender.toLowerCase();
          if (g === 'male' || g === 'female' || g === 'other') {
            setPatientGender(g as any);
          }
        }
        if (ocr.patientPhone) setPatientPhone(ocr.patientPhone);
        if (ocr.doctorName) setDoctorName(ocr.doctorName);
        if (ocr.doctorRegNo) setDoctorRegNo(ocr.doctorRegNo);
        if (ocr.hospitalClinic) setHospitalClinic(ocr.hospitalClinic);
        if (ocr.prescriptionDate) setPrescriptionDate(ocr.prescriptionDate);
        
        // Track populated fields for visual highlight effect
        const highlighted: string[] = [];
        if (ocr.patientName) highlighted.push('patientName');
        if (ocr.patientAge) highlighted.push('patientAge');
        if (ocr.patientGender) highlighted.push('patientGender');
        if (ocr.patientPhone) highlighted.push('patientPhone');
        if (ocr.doctorName) highlighted.push('doctorName');
        if (ocr.doctorRegNo) highlighted.push('doctorRegNo');
        if (ocr.hospitalClinic) highlighted.push('hospitalClinic');
        if (ocr.prescriptionDate) highlighted.push('prescriptionDate');
        setAiHighlightedFields(highlighted);
      }
    } catch (err: any) {
      console.error('OCR analysis failed:', err);
      setOcrError(err.message || 'Prescription OCR processing error. Manual fallback active.');
    } finally {
      setIsOcrProcessing(false);
    }
  };

  const handleClearUpload = () => {
    setUploadedFileUrl(null);
    setUploadedFileId(null);
    setAiHighlightedFields([]);
    setOcrError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!patientName.trim()) {
      newErrors.patientName = 'Patient full name is mandatory';
    }
    if (!patientAge || isNaN(Number(patientAge)) || Number(patientAge) <= 0 || Number(patientAge) > 130) {
      newErrors.patientAge = 'Valid patient age (1-130) is mandatory';
    }
    if (!doctorName.trim()) {
      newErrors.doctorName = 'Registered Medical Practitioner (Doctor) name is mandatory';
    }
    if (!doctorRegNo.trim()) {
      newErrors.doctorRegNo = 'Doctor Medical Registration Number is mandatory';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave({
      patientName: patientName.trim(),
      patientAge: Number(patientAge),
      patientGender,
      patientPhone: patientPhone.trim() || '',
      doctorName: doctorName.trim(),
      doctorRegNo: doctorRegNo.trim(),
      hospitalClinic: hospitalClinic.trim() || '',
      prescriptionDate: prescriptionDate || new Date().toISOString().slice(0, 10),
      notes: notes.trim() || '',
      prescriptionId: uploadedFileId || undefined,
      secureUrl: uploadedFileUrl || undefined,
      prescriptionUrl: uploadedFileUrl || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        id="prescription-modal-container"
        className={`w-full ${
          uploadedFileUrl ? 'max-w-5xl' : 'max-w-2xl'
        } bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300`}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0D5C63]/10 border-b border-[#0D5C63]/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0D5C63]/20 text-[#0D5C63]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Prescription Verification
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  OCR Active
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Statutory regulatory register mapping & validation (Schedule H/H1/X)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div>
            <strong>Notice:</strong> Your cart contains <span className="font-bold underline">{restrictedItemsCount} restricted drug(s)</span>. You must digitize, verify, and match prescription parameters to log these items in the statutory registry.
          </div>
        </div>

        {/* Split Screen Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LEFT PANEL: Upload & Prescription Display */}
          {uploadedFileUrl ? (
            <div className="w-full md:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center overflow-y-auto min-h-[300px]">
              <div className="flex items-center justify-between w-full mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#0D5C63]" />
                  Uploaded Document
                </span>
                <button
                  type="button"
                  onClick={handleClearUpload}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Replace File
                </button>
              </div>
              <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow bg-white flex-1 flex items-center justify-center w-full max-h-[50vh] min-h-[200px]">
                {imageLoadError ? (
                  <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                    <span className="text-xs font-semibold text-slate-500">Document Image Unavailable</span>
                  </div>
                ) : (
                  <img
                    src={uploadedFileUrl}
                    alt="Clinical Prescription"
                    className="max-h-full max-w-full object-contain p-2"
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadError(true)}
                  />
                )}
              </div>
              {isOcrProcessing && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm flex flex-col items-center justify-center text-white z-10 p-6 text-center">
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    Analyzing clinical parameters...
                  </p>
                  <p className="text-xs text-slate-300 mt-1 max-w-xs">
                    Gemini AI is parsing patient identities, doctor registration codes, and medication instructions.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full md:w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col items-center justify-center overflow-y-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 w-full text-left">
                Scan or Attach Prescription
              </span>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/20'
                    : 'border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900'
                } rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-[#0D5C63] min-h-[250px] shadow-inner`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="space-y-3">
                    <Loader2 className="w-10 h-10 text-[#0D5C63] animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Uploading file... {uploadProgress}%
                    </p>
                    <div className="w-48 bg-slate-200 rounded-full h-1.5 mx-auto">
                      <div
                        className="bg-[#0D5C63] h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-[#0D5C63]/10 text-[#0D5C63] rounded-full w-fit mx-auto">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Drag and drop prescription image here
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        or click to browse from local computer
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      JPG, PNG, WebP or PDF up to 10MB
                    </span>
                  </div>
                )}
              </div>
              
              {ocrError && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 w-full">
                  <p className="font-bold">Error:</p>
                  <p>{ocrError}</p>
                </div>
              )}
            </div>
          )}

          {/* RIGHT PANEL: Verification / Edit Form */}
          <form
            onSubmit={handleSubmit}
            className={`w-full ${
              uploadedFileUrl ? 'md:w-1/2' : 'w-full'
            } p-6 overflow-y-auto space-y-4 flex flex-col max-h-[80vh]`}
          >
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                Patient Identity Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Patient Name <span className="text-rose-500">*</span>
                    {aiHighlightedFields.includes('patientName') && (
                      <span className="ml-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1 rounded">
                        AI Extracted
                      </span>
                    )}
                  </label>
                  <input
                    id="prescription-patient-name"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Ramesh Kumar"
                    className={`w-full px-3 py-2 border ${
                      errors.patientName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } ${
                      aiHighlightedFields.includes('patientName') ? 'bg-emerald-50/30' : 'bg-slate-50 dark:bg-slate-800'
                    } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                  {errors.patientName && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.patientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Age <span className="text-rose-500">*</span>
                    {aiHighlightedFields.includes('patientAge') && (
                      <span className="ml-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1 rounded">
                        AI
                      </span>
                    )}
                  </label>
                  <input
                    id="prescription-patient-age"
                    type="number"
                    min="1"
                    max="130"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="42"
                    className={`w-full px-3 py-2 border ${
                      errors.patientAge ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } ${
                      aiHighlightedFields.includes('patientAge') ? 'bg-emerald-50/30' : 'bg-slate-50 dark:bg-slate-800'
                    } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                  {errors.patientAge && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.patientAge}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Gender
                  </label>
                  <select
                    id="prescription-patient-gender"
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="prescription-patient-phone"
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                Prescribing Doctor Parameters
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Doctor Name <span className="text-rose-500">*</span>
                    {aiHighlightedFields.includes('doctorName') && (
                      <span className="ml-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1 rounded">
                        AI Extracted
                      </span>
                    )}
                  </label>
                  <input
                    id="prescription-doctor-name"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. A. K. Sharma"
                    className={`w-full px-3 py-2 border ${
                      errors.doctorName ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } ${
                      aiHighlightedFields.includes('doctorName') ? 'bg-emerald-50/30' : 'bg-slate-50 dark:bg-slate-800'
                    } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                  {errors.doctorName && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.doctorName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Medical Council Reg No. <span className="text-rose-500">*</span>
                    {aiHighlightedFields.includes('doctorRegNo') && (
                      <span className="ml-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-100 px-1 rounded">
                        AI Extracted
                      </span>
                    )}
                  </label>
                  <input
                    id="prescription-doctor-reg"
                    type="text"
                    value={doctorRegNo}
                    onChange={(e) => setDoctorRegNo(e.target.value)}
                    placeholder="MCI-2018-84729"
                    className={`w-full px-3 py-2 border ${
                      errors.doctorRegNo ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                    } ${
                      aiHighlightedFields.includes('doctorRegNo') ? 'bg-emerald-50/30' : 'bg-slate-50 dark:bg-slate-800'
                    } rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                  {errors.doctorRegNo && (
                    <p className="text-[11px] text-rose-500 mt-1">{errors.doctorRegNo}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Hospital / Clinic Name
                  </label>
                  <input
                    id="prescription-hospital-name"
                    type="text"
                    value={hospitalClinic}
                    onChange={(e) => setHospitalClinic(e.target.value)}
                    placeholder="e.g. City Apollo Clinic"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Prescription Date
                  </label>
                  <input
                    id="prescription-date"
                    type="date"
                    value={prescriptionDate}
                    onChange={(e) => setPrescriptionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Dosage / Regimen Notes
                  </label>
                  <input
                    id="prescription-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. 1 tablet BD for 5 days"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" /> Validated under Form 20B/21B
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-prescription"
                  type="submit"
                  className="px-5 py-2 bg-[#0D5C63] hover:bg-[#0D5C63]/90 text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#0D5C63]/20 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {uploadedFileUrl ? 'Verify & Link' : 'Attach Details'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
