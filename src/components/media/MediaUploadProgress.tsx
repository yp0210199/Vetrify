import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type UploadStage =
  | 'idle'
  | 'selecting'
  | 'validating'
  | 'requesting-signature'
  | 'uploading'
  | 'processing'
  | 'saving-reference'
  | 'success'
  | 'error';

interface MediaUploadProgressProps {
  stage: UploadStage;
  progressPercent: number;
  errorMessage?: string;
  onRetry?: () => void;
}

export const MediaUploadProgress: React.FC<MediaUploadProgressProps> = ({
  stage,
  progressPercent,
  errorMessage,
  onRetry,
}) => {
  if (stage === 'idle') return null;

  const getStageLabel = () => {
    switch (stage) {
      case 'selecting':
        return 'Selecting file...';
      case 'validating':
        return 'Validating file size and constraints...';
      case 'requesting-signature':
        return 'Authenticating upload request with server...';
      case 'uploading':
        return `Uploading to ImageKit... ${progressPercent}%`;
      case 'processing':
        return 'Processing ImageKit asset...';
      case 'saving-reference':
        return 'Recording media reference in Firestore...';
      case 'success':
        return 'Upload complete!';
      case 'error':
        return errorMessage || 'Upload failed';
      default:
        return 'Processing...';
    }
  };

  const isError = stage === 'error';
  const isSuccess = stage === 'success';

  return (
    <div className="w-full space-y-2 mt-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
          ) : isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-[#2FA36A] flex-shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-[#0D5C63] animate-spin flex-shrink-0" />
          )}
          <span
            className={`font-medium ${
              isError ? 'text-[#EF4444]' : isSuccess ? 'text-[#2FA36A]' : 'text-[#0B1F33]'
            }`}
          >
            {getStageLabel()}
          </span>
        </div>
        {stage === 'uploading' && (
          <span className="font-semibold text-[#0D5C63]">{progressPercent}%</span>
        )}
      </div>

      {!isError && !isSuccess && (
        <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-[#0D5C63] h-full transition-all duration-200 rounded-full"
            style={{ width: `${stage === 'uploading' ? progressPercent : 15}%` }}
          />
        </div>
      )}

      {isError && onRetry && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onRetry}
            className="text-[11px] font-semibold text-[#0D5C63] hover:underline cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
