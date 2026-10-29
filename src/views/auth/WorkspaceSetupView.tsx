import React, { useState } from 'react';
import { RxLogo } from '../../design/RxLogo';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  isValidEmail,
  isValidGstin,
  isValidPostalCode,
  isValidPhone,
} from '../../lib/firebase/validators';
import {
  Building2,
  Store,
  MapPin,
  FileBadge2,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface FormValidationErrors {
  orgName?: string;
  mainStoreName?: string;
  mainStoreCode?: string;
  gstin?: string;
  email?: string;
  postalCode?: string;
  phone?: string;
}

export const WorkspaceSetupView: React.FC = () => {
  const { user, signOut } = useAuth();
  const { createWorkspace, isLoading, workspaceState, error, clearError } = useWorkspace();

  // Form State
  const [orgName, setOrgName] = useState('');
  const [mainStoreName, setMainStoreName] = useState('');
  const [mainStoreCode, setMainStoreCode] = useState('MAIN-01');
  const [legalName, setLegalName] = useState('');
  const [gstin, setGstin] = useState('');
  const [drugLicenseNumber, setDrugLicenseNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');

  // UI state
  const [showOptionalSections, setShowOptionalSections] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({});

  // Auto-sync primary store name when typing business name if untouched
  const [hasManuallyEditedStoreName, setHasManuallyEditedStoreName] = useState(false);

  const handleOrgNameChange = (val: string) => {
    setOrgName(val);
    if (!hasManuallyEditedStoreName) {
      setMainStoreName(val.trim() ? `${val.trim()} - Main Showroom` : '');
    }
    if (validationErrors.orgName) {
      setValidationErrors((prev) => ({ ...prev, orgName: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: FormValidationErrors = {};

    // 1. Required Fields
    if (!orgName.trim()) {
      errors.orgName = 'Business / Enterprise Name is required.';
    } else if (orgName.trim().length < 2) {
      errors.orgName = 'Business name must be at least 2 characters.';
    }

    if (!mainStoreName.trim()) {
      errors.mainStoreName = 'Primary Store Branch Name is required.';
    }

    if (!mainStoreCode.trim()) {
      errors.mainStoreCode = 'Store Code is required (e.g., MAIN-01).';
    }

    // 2. Optional Fields format validation if provided
    if (gstin.trim() && !isValidGstin(gstin.trim())) {
      errors.gstin = 'Invalid GSTIN format (must be 15 alphanumeric characters, e.g., 07AAAAA0000A1Z5).';
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (postalCode.trim() && !isValidPostalCode(postalCode.trim(), country)) {
      errors.postalCode =
        country.toLowerCase() === 'india'
          ? 'PIN code must be a 6-digit number (e.g., 110001).'
          : 'Please enter a valid postal code.';
    }

    if (phone.trim() && !isValidPhone(phone.trim())) {
      errors.phone = 'Please enter a valid phone number (10-15 digits).';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isLoading || workspaceState === 'provisioning') {
      return;
    }

    clearError();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createWorkspace({
        orgName: orgName.trim(),
        legalName: legalName.trim() || orgName.trim(),
        gstin: gstin.trim().toUpperCase(),
        drugLicenseNumber: drugLicenseNumber.trim(),
        mainStoreName: mainStoreName.trim(),
        mainStoreCode: mainStoreCode.trim().toUpperCase(),
        phone: phone.trim(),
        email: email.trim(),
        street: street.trim(),
        city: city.trim(),
        state: stateName.trim(),
        postalCode: postalCode.trim(),
        country: country.trim() || 'India',
      });
    } catch {
      // Error is caught and surfaced in WorkspaceContext state
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy = isSubmitting || isLoading || workspaceState === 'provisioning';

  return (
    <div
      id="rx-workspace-setup-screen"
      className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 lg:p-10 select-none overflow-y-auto"
    >
      {/* Top Header with Brand and Identity */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2 border-b border-[#E2E8F0] pb-4">
        <RxLogo variant="primary" size="md" />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-[#0B1F33]">
              {user?.displayName || user?.email?.split('@')[0]}
            </span>
            <span className="text-[10px] text-[#64748B] font-medium">{user?.email}</span>
          </div>

          <button
            type="button"
            id="rx-onboarding-signout-button"
            onClick={() => signOut()}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F1F5F9] text-xs font-bold text-[#DC2626] transition-colors cursor-pointer disabled:opacity-50"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Card */}
      <main className="max-w-3xl w-full mx-auto my-6">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-200/60 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#0B1F33] to-[#0D5C63] p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                <Building2 className="w-6 h-6 text-[#00E5FF]" />
              </div>
              <div>
                <span className="hidden">
                  Tenant Setup &bull; Owner Bootstrap
                </span>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Set up your business workspace
                </h1>
                <p className="text-xs sm:text-sm text-[#CBD5E1] mt-1 font-medium leading-relaxed">
                  Create your Vetrify workspace to start managing your tiles, sanitaryware, and building materials operations.
                </p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            {/* Error Banner */}
            {error && (
              <div
                id="rx-onboarding-error-banner"
                className="mb-6 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start justify-between gap-3 animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#991B1B]">Workspace Creation Error</h4>
                    <p className="text-xs text-[#B91C1C] mt-0.5 leading-relaxed">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-xs font-semibold text-[#991B1B] hover:text-[#7F1D1D] underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Zero Demo Data Trust Banner */}
            <div className="hidden">
              <ShieldCheck className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#166534] leading-relaxed font-medium">
                <span className="font-bold">Production Tenant Security:</span> This setup atomically
                provisions an isolated Firestore organization, sets your authenticated account as
                authorized Owner (<code className="bg-[#DCFCE7] px-1 py-0.5 rounded font-mono text-[11px]">roleId: &apos;owner&apos;</code>),
                and initializes your primary store branch with zero dummy data.
              </div>
            </div>

            <form onSubmit={handleSetupSubmit} className="space-y-6" noValidate>
              {/* Section 1: Core Business & Showroom (Required) */}
              <div className="space-y-4">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF] flex items-center gap-1.5">
                  <Store className="w-4 h-4" />
                  <span>Primary Business & Showroom Details</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Business / Showroom Name */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="rx-setup-org-name"
                      className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                    >
                      Business / Showroom Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        id="rx-setup-org-name"
                        type="text"
                        placeholder="e.g. Apollo Healthcare & Meds"
                        value={orgName}
                        onChange={(e) => handleOrgNameChange(e.target.value)}
                        disabled={isBusy}
                        aria-invalid={!!validationErrors.orgName}
                        aria-describedby={validationErrors.orgName ? 'rx-err-org-name' : undefined}
                        className={`w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white transition-all ${
                          validationErrors.orgName
                            ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                            : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                        }`}
                        required
                      />
                    </div>
                    {validationErrors.orgName && (
                      <p id="rx-err-org-name" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                        {validationErrors.orgName}
                      </p>
                    )}
                  </div>

                  {/* Primary Store Branch Name */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="rx-setup-store-name"
                      className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                    >
                      Primary Store / Counter Name <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <Store className="w-4 h-4" />
                      </div>
                      <input
                        id="rx-setup-store-name"
                        type="text"
                        placeholder="e.g. Apollo Healthcare - Main Branch"
                        value={mainStoreName}
                        onChange={(e) => {
                          setMainStoreName(e.target.value);
                          setHasManuallyEditedStoreName(true);
                          if (validationErrors.mainStoreName) {
                            setValidationErrors((prev) => ({ ...prev, mainStoreName: undefined }));
                          }
                        }}
                        disabled={isBusy}
                        aria-invalid={!!validationErrors.mainStoreName}
                        aria-describedby={
                          validationErrors.mainStoreName ? 'rx-err-store-name' : undefined
                        }
                        className={`w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white transition-all ${
                          validationErrors.mainStoreName
                            ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                            : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                        }`}
                        required
                      />
                    </div>
                    {validationErrors.mainStoreName && (
                      <p id="rx-err-store-name" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                        {validationErrors.mainStoreName}
                      </p>
                    )}
                  </div>

                  {/* Store Code */}
                  <div>
                    <label
                      htmlFor="rx-setup-store-code"
                      className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                    >
                      Store Code <span className="text-[#EF4444]">*</span>
                    </label>
                    <input
                      id="rx-setup-store-code"
                      type="text"
                      placeholder="MAIN-01"
                      value={mainStoreCode}
                      onChange={(e) => {
                        setMainStoreCode(e.target.value.toUpperCase());
                        if (validationErrors.mainStoreCode) {
                          setValidationErrors((prev) => ({ ...prev, mainStoreCode: undefined }));
                        }
                      }}
                      disabled={isBusy}
                      aria-invalid={!!validationErrors.mainStoreCode}
                      aria-describedby={
                        validationErrors.mainStoreCode ? 'rx-err-store-code' : undefined
                      }
                      className={`w-full min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white uppercase ${
                        validationErrors.mainStoreCode
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      required
                    />
                    {validationErrors.mainStoreCode && (
                      <p id="rx-err-store-code" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                        {validationErrors.mainStoreCode}
                      </p>
                    )}
                  </div>

                  {/* City */}
                  <div>
                    <label
                      htmlFor="rx-setup-city"
                      className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                    >
                      City / Location
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        id="rx-setup-city"
                        type="text"
                        placeholder="e.g. Gurugram"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        disabled={isBusy}
                        className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20 text-sm font-medium outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsible Optional Section Toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  id="rx-toggle-optional-fields"
                  onClick={() => setShowOptionalSections((prev) => !prev)}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] flex items-center justify-between text-xs font-bold text-[#0B1F33] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0D5C63]" />
                    <span>
                      {showOptionalSections ? 'Hide' : 'Add'} Legal, GST & Contact Information (Optional)
                    </span>
                  </span>
                  {showOptionalSections ? (
                    <ChevronUp className="w-4 h-4 text-[#64748B]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B]" />
                  )}
                </button>
              </div>

              {/* Section 2: Optional Business, License, & Address Details */}
              {showOptionalSections && (
                <div className="space-y-4 pt-2 border-t border-dashed border-[#CBD5E1] animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Legal Business Name */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="rx-setup-legal-name"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Legal Entity Name (if different)
                      </label>
                      <input
                        id="rx-setup-legal-name"
                        type="text"
                        placeholder="e.g. Apollo Healthcare Solutions Pvt. Ltd."
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        disabled={isBusy}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20 text-sm font-medium outline-none bg-white"
                      />
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label
                        htmlFor="rx-setup-gstin"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        GSTIN
                      </label>
                      <input
                        id="rx-setup-gstin"
                        type="text"
                        placeholder="07AAAAA0000A1Z5"
                        value={gstin}
                        onChange={(e) => {
                          setGstin(e.target.value.toUpperCase());
                          if (validationErrors.gstin) {
                            setValidationErrors((prev) => ({ ...prev, gstin: undefined }));
                          }
                        }}
                        disabled={isBusy}
                        aria-invalid={!!validationErrors.gstin}
                        aria-describedby={validationErrors.gstin ? 'rx-err-gstin' : undefined}
                        className={`w-full min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white uppercase ${
                          validationErrors.gstin
                            ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                            : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                        }`}
                      />
                      {validationErrors.gstin && (
                        <p id="rx-err-gstin" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                          {validationErrors.gstin}
                        </p>
                      )}
                    </div>

                    {/* Trade / MSME Reg Number */}
                    <div>
                      <label
                        htmlFor="setup-trade-license"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Trade / MSME Registration No.
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                          <FileBadge2 className="w-4 h-4" />
                        </div>
                        <input
                          id="setup-trade-license"
                          type="text"
                          placeholder="e.g. TR-2024-12345 / MSME-UDYAM"
                          value={drugLicenseNumber}
                          onChange={(e) => setDrugLicenseNumber(e.target.value)}
                          disabled={isBusy}
                          className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-[#CBD5E1] focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 text-sm font-medium outline-none bg-white"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label
                        htmlFor="rx-setup-phone"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Store Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          id="rx-setup-phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (validationErrors.phone) {
                              setValidationErrors((prev) => ({ ...prev, phone: undefined }));
                            }
                          }}
                          disabled={isBusy}
                          aria-invalid={!!validationErrors.phone}
                          aria-describedby={validationErrors.phone ? 'rx-err-phone' : undefined}
                          className={`w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white ${
                            validationErrors.phone
                              ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                              : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                          }`}
                        />
                      </div>
                      {validationErrors.phone && (
                        <p id="rx-err-phone" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                          {validationErrors.phone}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label
                        htmlFor="rx-setup-email"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Store Contact Email
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="rx-setup-email"
                          type="email"
                          placeholder="contact@vetrify.internal"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (validationErrors.email) {
                              setValidationErrors((prev) => ({ ...prev, email: undefined }));
                            }
                          }}
                          disabled={isBusy}
                          aria-invalid={!!validationErrors.email}
                          aria-describedby={validationErrors.email ? 'rx-err-email' : undefined}
                          className={`w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white ${
                            validationErrors.email
                              ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                              : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                          }`}
                        />
                      </div>
                      {validationErrors.email && (
                        <p id="rx-err-email" className="text-[11px] font-semibold text-[#EF4444] mt-1">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Street Address */}
                    <div className="sm:col-span-2">
                      <label
                        htmlFor="rx-setup-street"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Street Address
                      </label>
                      <input
                        id="rx-setup-street"
                        type="text"
                        placeholder="Shop 12, Ground Floor, Sector 14"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        disabled={isBusy}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20 text-sm font-medium outline-none bg-white"
                      />
                    </div>

                    {/* State */}
                    <div>
                      <label
                        htmlFor="rx-setup-state"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        State
                      </label>
                      <input
                        id="rx-setup-state"
                        type="text"
                        placeholder="e.g. Haryana"
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        disabled={isBusy}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20 text-sm font-medium outline-none bg-white"
                      />
                    </div>

                    {/* Postal Code */}
                    <div>
                      <label
                        htmlFor="rx-setup-postal-code"
                        className="block text-xs font-bold text-[#0B1F33] mb-1.5"
                      >
                        Postal / PIN Code
                      </label>
                      <input
                        id="rx-setup-postal-code"
                        type="text"
                        placeholder="122001"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          if (validationErrors.postalCode) {
                            setValidationErrors((prev) => ({ ...prev, postalCode: undefined }));
                          }
                        }}
                        disabled={isBusy}
                        aria-invalid={!!validationErrors.postalCode}
                        aria-describedby={
                          validationErrors.postalCode ? 'rx-err-postal-code' : undefined
                        }
                        className={`w-full min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium outline-none bg-white ${
                          validationErrors.postalCode
                            ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                            : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                        }`}
                      />
                      {validationErrors.postalCode && (
                        <p
                          id="rx-err-postal-code"
                          className="text-[11px] font-semibold text-[#EF4444] mt-1"
                        >
                          {validationErrors.postalCode}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit & Action Row */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#E2E8F0]">
                <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2FA36A] flex-shrink-0" />
                  <span>Configures isolated business tenant database</span>
                </div>

                <button
                  type="submit"
                  id="vetrify-create-workspace-submit-button"
                  disabled={isBusy}
                  className="w-full sm:w-auto min-h-[46px] px-8 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/25 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {isBusy ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Provisioning Business Workspace...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                      <span>Create Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-[#94A3B8] py-2">
        Vetrify &bull; Billing, Inventory &amp; E-commerce &bull; Powered by Cloud Firestore
      </footer>
    </div>
  );
};
