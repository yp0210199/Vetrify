import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { staffInvitationService } from '../../services/staffInvitationService';
import { StaffInvitation } from '../../types/firestore';
import { RxLogo } from '../../design/RxLogo';
import { Building2, CheckCircle2, AlertCircle, Sparkles, LogOut, Lock, User, Eye, EyeOff, KeyRound } from 'lucide-react';

interface AcceptInvitationViewProps {
  inviteId: string;
  orgId: string;
}

type SetupMode = 'create' | 'login' | 'ready';

export const AcceptInvitationView: React.FC<AcceptInvitationViewProps> = ({ inviteId, orgId }) => {
  const { user, signOut, signUp, signIn, error: authError, clearError } = useAuth();
  const [invitation, setInvitation] = useState<StaffInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [mode, setMode] = useState<SetupMode>('ready');
  
  // Form State
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [diagnosticCode, setDiagnosticCode] = useState<
    'INVALID_PARAMS' | 'INVITATION_NOT_FOUND' | 'FIRESTORE_PERMISSION_DENIED' | 'ORG_MISMATCH' | null
  >(null);

  useEffect(() => {
    const fetchInvitation = async () => {
      console.info(`[InvitationLifecycle] AcceptInvitationView fetching invitation: orgId="${orgId}", inviteId="${inviteId}"`);
      try {
        const result = await staffInvitationService.getStaffInvitationWithDiagnostics(orgId, inviteId);
        if (!result.invitation) {
          setDiagnosticCode(result.errorCode || 'INVITATION_NOT_FOUND');
          setErrorMsg(result.errorMessage || 'Invitation not found in the system. Please verify the invitation link.');
        } else {
          setInvitation(result.invitation);
          setDisplayName(result.invitation.displayName || '');
        }
      } catch (err: any) {
        console.error('[InvitationLifecycle] Critical error in fetchInvitation:', err);
        setDiagnosticCode('INVITATION_NOT_FOUND');
        setErrorMsg(err?.message || 'Failed to fetch invitation details.');
      } finally {
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [inviteId, orgId]);

  useEffect(() => {
    if (!loading && invitation) {
      if (user) {
        if (user.email === invitation.email) {
          setMode('ready');
        } else {
          // Logged in as wrong user
          setMode('ready');
        }
      } else {
        // Not logged in, defaults to create
        setMode('create');
      }
    }
  }, [loading, invitation, user]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    
    setErrorMsg(null);
    clearError();

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        email: invitation.email,
        password,
        displayName: displayName.trim()
      });
      // After sign up, user state will update, which triggers the useEffect and changes mode to 'ready'
    } catch (err: any) {
      if (err.message && err.message.includes('email-already-in-use')) {
        setErrorMsg('An account already exists for this email. Please sign in instead.');
        setMode('login');
      } else {
        setErrorMsg(err.message || 'Failed to create account.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;
    
    setErrorMsg(null);
    clearError();

    setIsSubmitting(true);
    try {
      await signIn({
        email: invitation.email,
        password,
        rememberMe: true
      });
      // Will transition to ready
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !invitation) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await staffInvitationService.acceptStaffInvitation({
        orgId,
        invitationId: inviteId,
        user: {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || undefined,
        }
      });
      // Clean up URL and reload to trigger workspace resolution
      window.history.replaceState({}, document.title, '/');
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to accept invitation.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <RxLogo variant="primary" size="md" />
          </div>
          <div className="w-8 h-8 border-2 border-[#0D5C63] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#64748B]">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !invitation) {
    const errorTitle =
      diagnosticCode === 'INVITATION_NOT_FOUND'
        ? 'Invitation Not Found'
        : diagnosticCode === 'FIRESTORE_PERMISSION_DENIED'
        ? 'Access Permission Error'
        : diagnosticCode === 'ORG_MISMATCH'
        ? 'Pharmacy Organization Mismatch'
        : diagnosticCode === 'INVALID_PARAMS'
        ? 'Invalid Link Parameters'
        : 'Invitation Error';

    const errorExplanation =
      diagnosticCode === 'INVITATION_NOT_FOUND'
        ? 'The staff invitation link does not exist in the system or may have been cancelled by pharmacy administration. Please ask your administrator to resend a fresh invite.'
        : diagnosticCode === 'FIRESTORE_PERMISSION_DENIED'
        ? 'Unable to verify invitation details due to database access rules. Please verify your internet connection or contact support.'
        : diagnosticCode === 'ORG_MISMATCH'
        ? 'This invitation belongs to a different pharmacy organization workspace.'
        : errorMsg;

    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <RxLogo variant="primary" size="md" />
          </div>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto text-[#B91C1C]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-[#0B1F33]">{errorTitle}</h2>
            <p className="text-sm text-[#475569] leading-relaxed">{errorExplanation}</p>
            <div className="pt-4 flex flex-col gap-3">
              <button
                onClick={() => {
                  window.history.replaceState({}, document.title, '/');
                  window.location.reload();
                }}
                className="w-full py-2.5 rounded-xl border border-[#CBD5E1] font-bold text-[#0B1F33] hover:bg-[#F8FAFC]"
              >
                Go to Dashboard
              </button>
              {user && (
                <button
                  onClick={() => signOut()}
                  className="w-full py-2.5 rounded-xl text-[#DC2626] font-bold hover:bg-[#FEF2F2]"
                >
                  Sign Out ({user.email})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  const handleGoToDashboard = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.reload();
  };

  // Status: Accepted
  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center mb-2">
            <RxLogo variant="primary" size="md" />
          </div>
          <div className="w-16 h-16 bg-[#DCFCE7] text-[#15803D] rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B1F33]">Invitation Already Accepted</h2>
            <p className="text-xs text-[#64748B] mt-1.5">
              This staff invitation for <span className="font-mono font-semibold text-[#0B1F33]">{invitation.email}</span> has already been activated.
            </p>
          </div>
          <div className="p-3.5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] text-xs space-y-1 text-left">
            <p className="text-[#64748B]">Assigned Role: <span className="font-bold text-[#0B1F33] capitalize">{invitation.roleId}</span></p>
            <p className="text-[#64748B]">Organization ID: <span className="font-mono text-[#0B1F33]">{invitation.organizationId}</span></p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 rounded-xl bg-[#0D5C63] text-white font-bold hover:bg-[#094348] transition-colors"
            >
              Go to Pharmacy Workspace
            </button>
            {user && (
              <button
                onClick={() => signOut()}
                className="w-full py-2.5 rounded-xl text-[#64748B] text-xs font-semibold hover:bg-[#F1F5F9]"
              >
                Sign Out ({user.email})
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Status: Revoked
  if (invitation.status === 'revoked') {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center mb-2">
            <RxLogo variant="primary" size="md" />
          </div>
          <div className="w-16 h-16 bg-[#FEF2F2] text-[#DC2626] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B1F33]">Invitation Revoked</h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              This invitation link is no longer active. A newer invitation link may have been generated by your pharmacy manager or the invite was cancelled.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 rounded-xl border border-[#CBD5E1] text-[#0B1F33] font-bold hover:bg-[#F8FAFC] transition-colors"
            >
              Go to Home Page
            </button>
            {user && (
              <button
                onClick={() => signOut()}
                className="w-full py-2 rounded-xl text-[#DC2626] text-xs font-semibold hover:bg-[#FEF2F2]"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Status: Expired
  if (invitation.status === 'expired') {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8 text-center space-y-5">
          <div className="flex justify-center mb-2">
            <RxLogo variant="primary" size="md" />
          </div>
          <div className="w-16 h-16 bg-[#FFFBEB] text-[#D97706] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0B1F33]">Invitation Expired</h2>
            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
              Invitations expire after 7 days. Please ask your pharmacy manager to resend an active invitation link to <span className="font-mono font-semibold text-[#0B1F33]">{invitation.email}</span>.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <button
              onClick={handleGoToDashboard}
              className="w-full py-3 rounded-xl border border-[#CBD5E1] text-[#0B1F33] font-bold hover:bg-[#F8FAFC] transition-colors"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8">
        <div className="flex justify-center mb-6">
          <RxLogo variant="primary" size="md" />
        </div>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#E6F4F1] rounded-full flex items-center justify-center mx-auto text-[#0D5C63] mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-[#0B1F33]">Join the Team</h2>
          <p className="text-sm text-[#475569] mt-2">
            You have been invited to join an organization.
          </p>
        </div>

        {(errorMsg || authError) && (
          <div className="mb-6 p-3 bg-[#FEF2F2] rounded-xl border border-[#FCA5A5] flex items-center gap-2 text-xs text-[#B91C1C]">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg || authError}</span>
          </div>
        )}

        <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748B]">Role:</span>
            <span className="font-bold text-[#0B1F33] capitalize">{invitation.roleId}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-[#64748B]">Email:</span>
            <span className="font-mono font-medium text-[#0B1F33]">{invitation.email}</span>
          </div>
        </div>

        {/* MODE: READY (User logged in and matches email) */}
        {mode === 'ready' && user && user.email === invitation.email && (
          <div className="space-y-4">
            <div className="p-3 bg-[#ECFDF5] rounded-xl border border-[#A7F3D0] text-center">
              <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#065F46]">Ready to Accept</p>
              <p className="text-xs text-[#047857] mt-1">
                You are securely signed in as {user.email}.
              </p>
            </div>
            
            <button
              onClick={handleAccept}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#0D5C63] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#094348] disabled:opacity-70 transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Accept Invitation
                </>
              )}
            </button>
            
            <button
              onClick={() => signOut()}
              disabled={isSubmitting}
              className="w-full py-3 flex items-center justify-center gap-2 rounded-xl text-[#64748B] font-bold hover:bg-[#F1F5F9] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* MODE: READY (User logged in but WRONG email) */}
        {mode === 'ready' && user && user.email !== invitation.email && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-[#FFFBEB] rounded-xl border border-[#FDE68A]">
              <AlertCircle className="w-6 h-6 text-[#D97706] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#92400E]">Account Mismatch</p>
              <p className="text-xs text-[#B45309] mt-2">
                This invitation is for <strong>{invitation.email}</strong>, but you are signed in as <strong>{user.email}</strong>.
              </p>
            </div>
            <button
              onClick={() => signOut()}
              className="w-full py-3 rounded-xl bg-[#0D5C63] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#094348] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out to Continue
            </button>
          </div>
        )}

        {/* MODE: CREATE ACCOUNT */}
        {mode === 'create' && !user && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                  placeholder="e.g. Dr. Jane Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0D5C63]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                  placeholder="Repeat password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#0D5C63] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#094348] disabled:opacity-70 mt-2 transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account & Accept'
              )}
            </button>
            
            <p className="text-center text-xs text-[#64748B] pt-2">
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('login'); setPassword(''); clearError(); setErrorMsg(null); }}
                className="font-bold text-[#0D5C63] hover:underline"
              >
                Sign In
              </button>
            </p>
          </form>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && !user && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="p-3 bg-[#E6F4F1] rounded-xl border border-[#A7F3D0] mb-4">
              <p className="text-sm font-bold text-[#065F46] text-center">
                Sign in as {invitation.email}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#0F172A] focus:border-[#0D5C63] focus:ring-1 focus:ring-[#0D5C63] outline-none"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0D5C63]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#0D5C63] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#094348] disabled:opacity-70 mt-2 transition-colors"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In & Accept'
              )}
            </button>
            
            <p className="text-center text-xs text-[#64748B] pt-2">
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setMode('create'); setPassword(''); clearError(); setErrorMsg(null); }}
                className="font-bold text-[#0D5C63] hover:underline"
              >
                Create one
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
