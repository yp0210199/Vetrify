import React from 'react';
import { FileText, ExternalLink, Trash2, Image as ImageIcon } from 'lucide-react';
import { MediaAsset } from '../../types/foundation';
import { mediaService } from '../../services/mediaService';

interface MediaPreviewProps {
  asset: MediaAsset;
  preset?: 'thumbnail' | 'avatar' | 'logo' | 'productPreview' | 'documentPreview';
  onRemove?: () => void;
  showDetails?: boolean;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  asset,
  preset = 'thumbnail',
  onRemove,
  showDetails = true,
}) => {
  const [hasError, setHasError] = React.useState(false);
  const isPdf = asset.originalFilename?.toLowerCase().endsWith('.pdf') || asset.resourceType === 'raw';
  const displayUrl = isPdf ? asset.secureUrl : mediaService.getMediaUrl(asset, preset);

  return (
    <div className="relative group bg-white rounded-xl border border-[#E2E8F0] p-2 hover:border-[#0D5C63] transition-all shadow-2xs">
      <div className="flex items-center gap-3">
        {isPdf ? (
          <div className="w-12 h-12 bg-[#F1F5F9] rounded-lg flex items-center justify-center text-[#0D5C63] flex-shrink-0">
            <FileText className="w-6 h-6" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[#F8FAFC] overflow-hidden border border-[#E2E8F0] flex-shrink-0 flex items-center justify-center relative">
            {hasError ? (
              <ImageIcon className="w-5 h-5 text-slate-400" />
            ) : (
              <img
                src={displayUrl}
                alt={asset.originalFilename || 'Media asset'}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setHasError(true)}
              />
            )}
          </div>
        )}

        {showDetails && (
          <div className="flex-1 min-w-0">
            <h5 className="text-xs font-semibold text-[#0B1F33] truncate">
              {asset.originalFilename || 'Document Asset'}
            </h5>
            <div className="flex items-center gap-2 text-[10px] text-[#64748B] mt-0.5">
              <span className="uppercase font-mono bg-[#F1F5F9] px-1.5 py-0.5 rounded">
                {asset.format || (isPdf ? 'PDF' : 'IMG')}
              </span>
              <span>
                {typeof asset.bytes === 'number' && !isNaN(asset.bytes) && asset.bytes > 0
                  ? `${(asset.bytes / 1024).toFixed(0)} KB`
                  : 'CDN Cloud'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {asset.secureUrl && (
            <a
              href={asset.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open asset in new tab"
              className="p-1.5 text-[#64748B] hover:text-[#0D5C63] hover:bg-[#E6F4F1] rounded-lg transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Delete media asset"
              className="p-1.5 text-[#64748B] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
