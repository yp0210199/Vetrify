import React, { useState, useRef } from 'react';
import { Upload, FileUp, AlertTriangle } from 'lucide-react';
import { MediaCategory, MediaAsset } from '../../types/foundation';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../auth/AuthProvider';
import { getFirebaseAuth } from '../../lib/firebase/config';
import { mediaService } from '../../services/mediaService';
import { MEDIA_LIMITS } from '../../lib/constants';
import { MediaUploadProgress, UploadStage } from './MediaUploadProgress';
import { MediaPreview } from './MediaPreview';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';

export interface MediaUploaderProps {
  category: MediaCategory;
  storeId?: string | null;
  value?: MediaAsset | null;
  onChange?: (asset: MediaAsset | null) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  category,
  storeId,
  value,
  onChange,
  label,
  description,
  disabled = false,
}) => {
  const { organization, currentStaff } = useWorkspace();
  const { user } = useAuth();
  const { success, error } = useToast();
  const { confirm } = useConfirmation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [currentAsset, setCurrentAsset] = useState<MediaAsset | null>(value || null);
  const [ikStatus, setIkStatus] = useState<{ connected: boolean; provider: string; urlEndpoint: string } | null>(null);

  React.useEffect(() => {
    mediaService
      .checkImageKitStatus()
      .then((st) => setIkStatus(st))
      .catch(() => setIkStatus({ connected: false, provider: 'ImageKit CDN', urlEndpoint: '' }));
  }, []);

  React.useEffect(() => {
    setCurrentAsset(value || null);
  }, [value]);

  const limits = MEDIA_LIMITS[category as keyof typeof MEDIA_LIMITS] || MEDIA_LIMITS['general-document'];

  const handleFileSelected = async (file: File) => {
    if (!organization?.id || !user?.uid) {
      error('Authentication and active organization context required to upload files');
      return;
    }

    setStage('validating');
    setErrorMessage(undefined);
    setProgressPercent(0);

    try {
      const currentUser = getFirebaseAuth().currentUser;
      const userToken = currentUser ? await currentUser.getIdToken() : '';

      setStage('requesting-signature');

      const result = await mediaService.uploadAsset({
        organizationId: organization.id,
        storeId: storeId || null,
        category,
        file,
        uploadedByUid: user.uid,
        userToken,
        userEmail: user.email,
        userDisplayName: user.displayName || currentStaff?.displayName,
        onProgress: (pct) => {
          setStage('uploading');
          setProgressPercent(pct);
        },
      });

      if (!result.success) {
        setStage('error');
        setErrorMessage(result.error || 'Upload failed');
        error(result.error || 'Failed to upload file');
        return;
      }

      setStage('success');
      setCurrentAsset(result.asset);
      onChange?.(result.asset);
      success('File uploaded successfully');
    } catch (err: any) {
      setStage('error');
      const msg = err.userMessage || err.message || 'An unexpected error occurred during upload';
      setErrorMessage(msg);
      error(msg);
    }
  };

  const handleRemove = async () => {
    if (!currentAsset || !organization?.id || !user) return;

    const confirmed = await confirm({
      title: 'Remove Media Asset',
      description: 'Are you sure you want to permanently delete this media asset? This action cannot be undone.',
      confirmLabel: 'Delete Media',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      const currentUser = getFirebaseAuth().currentUser;
      const userToken = currentUser ? await currentUser.getIdToken() : '';

      await mediaService.deleteMediaAsset(organization.id, currentAsset.id, userToken, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || currentStaff?.displayName,
      });

      setCurrentAsset(null);
      onChange?.(null);
      setStage('idle');
      success('Media asset removed');
    } catch (err: any) {
      error(err.message || 'Failed to remove media asset');
    }
  };

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between">
        {label && <label className="block text-xs font-bold text-[#0B1F33]">{label}</label>}
        {ikStatus && (
          <div className="flex items-center gap-1.5 text-[10px] font-semibold bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                ikStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className={ikStatus.connected ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'}>
              {ikStatus.connected ? 'ImageKit Connected' : 'ImageKit Disconnected'}
            </span>
          </div>
        )}
      </div>

      {currentAsset ? (
        <MediaPreview asset={currentAsset} onRemove={disabled ? undefined : handleRemove} />
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleFileSelected(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => {
            if (!disabled && stage !== 'uploading') fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-[#0D5C63] bg-[#E6F4F1]'
              : 'border-[#CBD5E1] bg-white hover:border-[#0D5C63] hover:bg-[#F8FAFC]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={limits.allowedMimeTypes.join(',')}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#E6F4F1] flex items-center justify-center text-[#0D5C63]">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#0B1F33]">
                Click or drag file to upload for <span className="text-[#0D5C63]">{category}</span>
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5">
                Allowed: {limits.allowedExtensions.join(', ').toUpperCase()} (Max:{' '}
                {(limits.maxBytes / (1024 * 1024)).toFixed(0)}MB)
              </p>
            </div>
          </div>
        </div>
      )}

      {description && <p className="text-[11px] text-[#64748B] mt-1">{description}</p>}

      <MediaUploadProgress
        stage={stage}
        progressPercent={progressPercent}
        errorMessage={errorMessage}
        onRetry={() => {
          setStage('idle');
          setErrorMessage(undefined);
          fileInputRef.current?.click();
        }}
      />
    </div>
  );
};
