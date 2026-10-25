import { MediaAsset, MediaCategory, MediaUploadResult } from '../../types/foundation';
import { mediaService } from '../../services/mediaService';

export interface MediaUploadOptions {
  organizationId: string;
  storeId?: string | null;
  category: MediaCategory;
  file: File;
  uploadedByUid: string;
  userToken?: string;
}

export interface MediaService {
  uploadMedia(options: MediaUploadOptions): Promise<MediaUploadResult>;
  deleteMedia(assetId: string, organizationId: string, userToken?: string): Promise<boolean>;
  getMediaUrl(asset: MediaAsset | string, preset?: string): string;
}

/**
 * Phase 1 — Step 6 Production Media Provider wrapping mediaService
 */
export const defaultMediaService: MediaService = {
  async uploadMedia(options: MediaUploadOptions): Promise<MediaUploadResult> {
    if (!options.userToken) {
      // Local preview fallback if token not supplied yet
      const localUrl = URL.createObjectURL(options.file);
      return {
        success: true,
        asset: {
          id: `media-${Date.now()}`,
          organizationId: options.organizationId,
          storeId: options.storeId || null,
          ownerUid: options.uploadedByUid,
          category: options.category,
          provider: 'mock',
          resourceType: options.file.type === 'application/pdf' ? 'raw' : 'image',
          publicId: `preview-${Date.now()}`,
          secureUrl: localUrl,
          bytes: options.file.size,
          originalFilename: options.file.name,
          folder: `rx-omni/organizations/${options.organizationId}/preview`,
          createdAt: new Date().toISOString(),
        },
      };
    }

    return mediaService.uploadAsset({
      organizationId: options.organizationId,
      storeId: options.storeId || null,
      category: options.category,
      file: options.file,
      uploadedByUid: options.uploadedByUid,
      userToken: options.userToken,
    });
  },

  async deleteMedia(assetId: string, organizationId: string, userToken?: string): Promise<boolean> {
    if (!userToken) return true;
    return mediaService.deleteMediaAsset(organizationId, assetId, userToken);
  },

  getMediaUrl(asset: MediaAsset | string, preset?: string): string {
    return mediaService.getMediaUrl(asset, preset);
  },
};

export const abstractMediaService = defaultMediaService;
