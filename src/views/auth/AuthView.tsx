import React, { useState } from 'react';
import { RxLogo } from '../../design/RxLogo';
import { useAuth } from '../../auth/AuthProvider';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Store,
  Boxes,
  ReceiptText,
  User,
  Sparkles,
  Building2,
} from 'lucide-react';

export const AuthView: React.FC = () => {
  const { signIn, signUp, sendPasswordReset, error, clearError } = useAuth();

  // Form Mode: 'login' | 'signup' | 'forgot-password'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');

  // Input states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Local UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const [localValidationErrors, setLocalValidationErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSuccessMessage(null);

    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Please enter your registered email address.';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email format (e.g., name@domain.com).';
    }

    if (!password) {
      errors.password = 'Please enter your account password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalValidationErrors(errors);
      return;
    }

    setLocalValidationErrors({});
    setIsSubmitting(true);

    try {
      await signIn({ email: email.trim(), password, rememberMe });
    } catch {
      // Error is caught and surfaced in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSuccessMessage(null);

    const errors: { displayName?: string; email?: string; password?: string; confirmPassword?: string } = {};

    if (!displayName.trim()) {
      errors.displayName = 'Please enter your full name.';
    }

    if (!email.trim()) {
      errors.email = 'Please enter your email address.';
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email format (e.g., name@domain.com).';
    }

    if (!password) {
      errors.password = 'Please enter a password.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setLocalValidationErrors(errors);
      return;
    }

    setLocalValidationErrors({});
    setIsSubmitting(true);

    try {
      await signUp({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
    } catch {
      // Error surfaced in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setResetSuccessMessage(null);

    if (!email.trim()) {
      setLocalValidationErrors({ email: 'Please enter your registered email address.' });
      return;
    }

    if (!validateEmail(email)) {
      setLocalValidationErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setLocalValidationErrors({});
    setIsSubmitting(true);

    try {
      await sendPasswordReset(email.trim());
      setResetSuccessMessage(
        'If an account is associated with this email address, a password reset link has been dispatched. Please check your inbox and spam folder.'
      );
    } catch {
      // Handled via context or mapped error
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'forgot-password') => {
    clearError();
    setResetSuccessMessage(null);
    setLocalValidationErrors({});
    setMode(newMode);
  };

  return (
    <div
      id="rx-auth-container"
      className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none overflow-y-auto"
    >
      <div className="w-full max-w-5xl bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl shadow-slate-300/40 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* Left Side: Vetrify Brand Showcase (Visible on lg+) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0B1F33] via-[#0F2942] to-[#0D5C63] p-10 flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Ambient Background Highlights */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#00E5FF]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#2FA36A]/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <RxLogo variant="light" size="lg" />
            <p className="text-xs text-[#94A3B8] mt-3 font-medium leading-relaxed">
              Billing, Inventory &amp; E-commerce Platform. Everything Connected.
            </p>
          </div>

          {/* Core Feature Badges */}
          <div className="relative z-10 space-y-3.5 my-8">
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#132C46]/70 border border-[#1E3A5F]">
              <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Multi-Store Tenant Isolation</h4>
                <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                  Granular role-based boundaries with atomic inventory transactions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#132C46]/70 border border-[#1E3A5F]">
              <div className="w-9 h-9 rounded-xl bg-[#15803D]/60 flex items-center justify-center flex-shrink-0">
                <Boxes className="w-5 h-5 text-[#4ADE80]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Live Batch & Rack Management</h4>
                <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                  FEFO-guided dispensing, cold-chain monitoring, and auto reorder triggers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-[#132C46]/70 border border-[#1E3A5F]">
              <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/40 flex items-center justify-center flex-shrink-0">
                <ReceiptText className="w-5 h-5 text-[#93C5FD]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Strict Compliance & Auditing</h4>
                <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                  Automated Schedule H register and real-time multi-location sync.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Security Assurance */}
          <div className="relative z-10 flex items-center gap-2 text-[11px] text-[#94A3B8] pt-4 border-t border-[#183654]">
            <ShieldCheck className="w-4 h-4 text-[#2FA36A] flex-shrink-0" />
            <span>End-to-end encrypted session with Firebase Authentication</span>
          </div>
        </div>

        {/* Right Side: Authentication Forms (Responsive) */}
        <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-white">
          {/* Mobile/Tablet Brand Header */}
          <div className="flex lg:hidden items-center justify-between pb-6 border-b border-[#E2E8F0] mb-6">
            <RxLogo variant="primary" size="md" />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6F4F1] text-[#0D5C63] text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D5C63]" />
              <span>Secure Portal</span>
            </div>
          </div>

          {/* Top Form Header */}
          <div className="max-w-md w-full mx-auto">
            {/* Mode Switcher Tabs (Sign In / Create Pharmacy) */}
            {mode !== 'forgot-password' && (
              <div className="mb-6 p-1 bg-[#F1F5F9] rounded-2xl border border-[#E2E8F0] grid grid-cols-2 gap-1">
                <button
                  type="button"
                  id="rx-tab-signin"
                  onClick={() => switchMode('login')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#0B1F33] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0B1F33]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  id="rx-tab-create-pharmacy"
                  onClick={() => switchMode('signup')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-[#0D5C63] text-white shadow-sm'
                      : 'text-[#0D5C63] hover:text-[#094348]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>Create Pharmacy</span>
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F33] tracking-tight">
                  Sign In to Vetrify
                </h1>
                <p className="text-sm text-[#64748B] mt-1.5 font-medium">
                  Enter your registered credentials to access your terminal.
                </p>
              </div>
            )}

            {mode === 'signup' && (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F33] tracking-tight">
                  Create Pharmacy Account
                </h1>
                <p className="text-sm text-[#64748B] mt-1.5 font-medium">
                  Register your owner credentials to provision your new pharmacy workspace.
                </p>
              </div>
            )}

            {mode === 'forgot-password' && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C63] hover:underline mb-3 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F33] tracking-tight">
                  Reset Password
                </h1>
                <p className="text-sm text-[#64748B] mt-1.5 font-medium">
                  Enter your account email to receive secure recovery instructions.
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3 animate-fade-in text-left">
                <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#991B1B]">Authentication Alert</h4>
                  <p className="text-xs text-[#B91C1C] mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Password Reset Confirmation Banner */}
            {resetSuccessMessage && (
              <div className="mb-6 p-4 rounded-xl bg-[#F0FDF4] border border-[#86EFAC] flex items-start gap-3 animate-fade-in text-left">
                <CheckCircle2 className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-[#166534]">Reset Link Dispatched</h4>
                  <p className="text-xs text-[#15803D] mt-0.5 leading-relaxed">{resetSuccessMessage}</p>
                </div>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
                {/* Email Field */}
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Staff Email Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. staff@vetrify.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localValidationErrors.email) {
                          setLocalValidationErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.email
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {localValidationErrors.email && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="block text-xs font-bold text-[#0B1F33]">
                      Password <span className="text-[#EF4444]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot-password')}
                      className="text-xs font-bold text-[#0D5C63] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (localValidationErrors.password) {
                          setLocalValidationErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.password
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#0B1F33] cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {localValidationErrors.password && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.password}
                    </p>
                  )}
                </div>

                {/* Remember Session Checkbox */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#0D5C63] focus:ring-[#0D5C63]"
                    />
                    <span className="text-xs font-semibold text-[#475569]">
                      Keep me signed in on this device
                    </span>
                  </label>
                </div>

                {/* Submit Sign In Button */}
                <button
                  id="auth-submit-signin"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0D5C63] hover:bg-[#094348] active:bg-[#073236] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D5C63]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Terminal</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Prominent Create Pharmacy Callout for New Users */}
                <div className="mt-6 pt-5 border-t border-[#E2E8F0] text-center">
                  <p className="text-xs text-[#64748B] mb-2.5 font-medium">
                    New pharmacy owner or store manager?
                  </p>
                  <button
                    type="button"
                    id="rx-signin-create-pharmacy-btn"
                    onClick={() => switchMode('signup')}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border-2 border-[#0D5C63] text-[#0D5C63] hover:bg-[#E6F4F1] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-[#0D5C63]" />
                    <span>Create Pharmacy Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}

            {/* CREATE PHARMACY / SIGN UP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Owner Full Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={displayName}
                      onChange={(e) => {
                        setDisplayName(e.target.value);
                        if (localValidationErrors.displayName) {
                          setLocalValidationErrors((prev) => ({ ...prev, displayName: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.displayName
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {localValidationErrors.displayName && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.displayName}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Owner Email Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. owner@pharmacy.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localValidationErrors.email) {
                          setLocalValidationErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.email
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {localValidationErrors.email && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.email}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Password (min. 6 characters) <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (localValidationErrors.password) {
                          setLocalValidationErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-11 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.password
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#64748B] hover:text-[#0B1F33] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {localValidationErrors.password && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Confirm Password <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (localValidationErrors.confirmPassword) {
                          setLocalValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.confirmPassword
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {localValidationErrors.confirmPassword && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit Register Button */}
                <button
                  id="auth-submit-signup"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0D5C63] hover:bg-[#094348] active:bg-[#073236] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D5C63]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-[#00E5FF]" />
                      <span>Create Account & Setup Pharmacy</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-[#64748B] hover:text-[#0B1F33] cursor-pointer"
                  >
                    Already have an account? <span className="text-[#0D5C63] underline">Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD FORM */}
            {mode === 'forgot-password' && (
              <form onSubmit={handlePasswordResetSubmit} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-bold text-[#0B1F33] mb-1.5">
                    Registered Email Address <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748B]">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      placeholder="e.g. staff@vetrify.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localValidationErrors.email) {
                          setLocalValidationErrors({});
                        }
                      }}
                      className={`w-full min-h-[46px] pl-10 pr-4 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none bg-white ${
                        localValidationErrors.email
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-2 focus:ring-[#0D5C63]/20'
                      }`}
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                  {localValidationErrors.email && (
                    <p className="text-[11px] font-semibold text-[#EF4444] mt-1">
                      {localValidationErrors.email}
                    </p>
                  )}
                </div>

                <button
                  id="auth-submit-reset"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#0D5C63] hover:bg-[#094348] active:bg-[#073236] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#0D5C63]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Reset Link...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Recovery Instructions</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-bold text-[#64748B] hover:text-[#0B1F33] cursor-pointer"
                  >
                    Remember your password? <span className="text-[#0D5C63] underline">Sign In</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Terminal Notice */}
          <div className="pt-8 mt-6 border-t border-[#F1F5F9] text-center max-w-md w-full mx-auto">
            <p className="text-[11px] text-[#94A3B8]">
              Vetrify &bull; Billing, Inventory &amp; E-commerce &bull; v1.0 Production
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
