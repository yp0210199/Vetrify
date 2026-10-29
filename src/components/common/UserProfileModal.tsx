import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Key,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Fingerprint,
  Building2,
  Store,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormField, TextInput } from '../ui/Input';
import { useAuth } from '../../auth/AuthProvider';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { authService } from '../../auth/authService';
import { userService } from '../../services/userService';
import { mediaService } from '../../services/mediaService';
import { getFirebaseAuth, getFirestoreDb } from '../../lib/firebase/config';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, signOut } = useAuth();
  const { organization, currentStore, currentStaff, firestoreUser, refreshWorkspace } = useWorkspace();
  const { success, error, warning } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);

  // Password State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Loading States
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Initialize fields on open
  useEffect(() => {
    if (isOpen && user) {
      setDisplayName(user.displayName || currentStaff?.displayName || '');
      setPhoneNumber(currentStaff?.phoneNumber || currentStaff?.phone || firestoreUser?.phoneNumber || '');
      setPhotoURL(user.photoURL || currentStaff?.photoURL || firestoreUser?.photoURL || null);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  }, [isOpen, user, currentStaff, firestoreUser]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      onClose();
    } catch {
      // Error handled in auth context
    } finally {
      setIsSigningOut(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    try {
      const currentUser = getFirebaseAuth().currentUser;
      const userToken = currentUser ? await currentUser.getIdToken() : '';

      const orgId = organization?.id || firestoreUser?.primaryOrganizationId || 'global';

      const result = await mediaService.uploadAsset({
        organizationId: orgId,
        storeId: currentStore?.id || null,
        category: 'avatar',
        file,
        uploadedByUid: user.uid,
        userToken,
        userEmail: user.email,
        userDisplayName: displayName,
      });

      if (result.success && result.asset?.secureUrl) {
        setPhotoURL(result.asset.secureUrl);
        success('Profile photo uploaded successfully via ImageKit CDN.');
      } else {
        error(result.error || 'Failed to upload profile photo.');
      }
    } catch (err: any) {
      error(err.message || 'Profile photo upload failed.');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!displayName.trim()) {
      warning('Full Name cannot be empty.', 'Validation Error');
      return;
    }

    if (showPasswordSection) {
      if (newPassword.length < 6) {
        warning('Password must be at least 6 characters long.', 'Validation Error');
        return;
      }
      if (newPassword !== confirmPassword) {
        error('New password and confirm password do not match.', 'Password Mismatch');
        return;
      }
    }

    setIsSaving(true);
    try {
      // 1. Update Firebase Auth Profile (displayName and photoURL)
      await authService.updateUserProfile({
        displayName: displayName.trim(),
        photoURL: photoURL || '',
      });

      // 2. Update Password in Firebase Auth if provided
      if (showPasswordSection && newPassword) {
        await authService.updateUserPassword(newPassword);
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordSection(false);
      }

      // 3. Update Firestore Global User Profile (/users/{uid})
      await userService.updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        photoURL: photoURL || null,
        phoneNumber: phoneNumber.trim() || null,
      });

      // 4. Update Staff Member Document in Tenant Org (/organizations/{orgId}/staff/{uid})
      if (organization?.id) {
        try {
          const db = getFirestoreDb();
          const staffRef = doc(db, 'organizations', organization.id, 'staff', user.uid);
          await updateDoc(staffRef, {
            displayName: displayName.trim(),
            phoneNumber: phoneNumber.trim() || null,
            photoURL: photoURL || null,
            updatedAt: serverTimestamp(),
          });
        } catch (staffErr) {
          console.warn('Staff document update note:', staffErr);
        }
      }

      // 5. Refresh app context & notify
      await refreshWorkspace();
      success('Your user profile details have been updated successfully.', 'Profile Updated');
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to update profile details.', 'Update Failed');
    } finally {
      setIsSaving(false);
    }
  };

  const email = user?.email || 'No email provided';
  const initials = user?.initials || 'U';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Profile & Security Details"
      subtitle="Manage your personal information, contact number, avatar, and password"
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="danger"
            size="sm"
            icon={LogOut}
            onClick={handleSignOut}
            disabled={isSigningOut || isSaving}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={isSaving ? Loader2 : Save}
              onClick={handleSaveProfile}
              disabled={isSaving || isUploadingPhoto}
            >
              {isSaving ? 'Saving Changes...' : 'Save Profile Details'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Section 1: Profile Image Avatar & Quick Info */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-[#F8FAFC] dark:bg-slate-900 rounded-2xl border border-[#E2E8F0] dark:border-slate-800">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-[#0B1F33] text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden border-2 border-white dark:border-slate-800">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt={displayName || 'User Avatar'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Photo Upload Trigger */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 p-2 bg-[#0D5C63] text-white rounded-full shadow-md hover:bg-[#094146] transition-all focus:outline-none focus:ring-2 focus:ring-[#0D5C63]/50 disabled:opacity-50"
              title="Upload Profile Image"
            >
              {isUploadingPhoto ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h4 className="text-base font-bold text-[#0B1F33] dark:text-white">{displayName || 'Staff User'}</h4>
              <span className="text-[10px] font-bold px-2.5 py-0.5 bg-[#0D5C63]/10 text-[#0D5C63] border border-[#0D5C63]/20 rounded-full capitalize">
                {currentStaff?.roleId || 'Staff'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400">{email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="text-xs font-semibold text-[#0D5C63] hover:underline flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" /> {photoURL ? 'Change Photo' : 'Upload Profile Photo'}
              </button>
              {photoURL && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1 ml-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: User Personal & Contact Details */}
        <div className="space-y-3.5 pt-1">
          <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Personal Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Full Name" required>
              <TextInput
                type="text"
                placeholder="e.g. Dr. Rajesh Kumar"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                icon={User}
              />
            </FormField>

            <FormField label="Contact Number">
              <TextInput
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                icon={Phone}
              />
            </FormField>
          </div>

          <FormField label="Authenticated Email Address">
            <div className="relative">
              <TextInput
                type="email"
                value={email}
                disabled
                icon={Mail}
                className="bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified Auth
              </span>
            </div>
          </FormField>
        </div>

        {/* Section 3: Organization & Role Identity Context */}
        {organization && (
          <div className="p-3 bg-[#E6F4F1]/30 dark:bg-slate-800/50 rounded-xl border border-[#0D5C63]/15 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#0066FF]" /> Registered Business Entity:
              </span>
              <span className="font-bold text-[#0B1F33] dark:text-white">{organization.name}</span>
            </div>
            {currentStore && (
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-[#0D5C63]" /> Active Store Branch:
                </span>
                <span className="font-medium text-[#0B1F33] dark:text-slate-200">{currentStore.name}</span>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Security & Password Update Option */}
        <div className="pt-2 border-t border-[#F1F5F9] dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0D5C63] uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Security & Password
            </h4>
            <button
              type="button"
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-xs font-bold text-[#0D5C63] hover:underline"
            >
              {showPasswordSection ? 'Cancel Password Change' : 'Change Password'}
            </button>
          </div>

          {showPasswordSection && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <FormField label="New Password">
                  <div className="relative">
                    <TextInput
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      icon={Key}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm New Password">
                  <div className="relative">
                    <TextInput
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      icon={Key}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </FormField>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match.
                </p>
              )}

              <p className="text-[11px] text-slate-500">
                Updating your password will immediately secure your Firebase authentication login credentials.
              </p>
            </div>
          )}
        </div>

        {/* Identity Metadata Footer */}
        <div className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-lg text-xs">
          <span className="text-[#64748B] dark:text-slate-400 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-[#0D5C63]" /> Auth UID:
          </span>
          <span className="font-mono text-[11px] text-[#0B1F33] dark:text-slate-200 truncate max-w-[180px]">
            {user?.uid || 'N/A'}
          </span>
        </div>
      </form>
    </Modal>
  );
};

