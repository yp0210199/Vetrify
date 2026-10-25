import { MediaCategory, MediaAsset } from '../../types/foundation';
import { MEDIA_LIMITS, IMAGEKIT_TRANSFORMATIONS, TransformationPreset } from '../constants';
import { AppError } from '../errors/errorUtils';

export interface ImageKitAuthResponse {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  folder: string;
  fileName: string;
  uploadUrl: string;
}

export interface ImageKitUploadResult {
  fileId: string;
  name: string;
  size: number;
  versionInfo?: { id: string; name: string };
  filePath: string;
  url: string;
  fileType: string;
  height?: number;
  width?: number;
  thumbnailUrl?: string;
  AITags?: any;
}

export const imagekitClient = {
  /**
   * Pre-upload client-side file validation against MEDIA_LIMITS
   */
  validateFile(file: File, category: MediaCategory): { valid: boolean; error?: string } {
    const limits = MEDIA_LIMITS[category as keyof typeof MEDIA_LIMITS] || MEDIA_LIMITS['general-document'];

    if (file.size > limits.maxBytes) {
      const maxMb = (limits.maxBytes / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum allowed size of ${maxMb}MB for ${category}.`,
      };
    }

    if (limits.allowedMimeTypes.length > 0 && !limits.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type "${file.type}" is not supported for ${category}. Allowed types: ${limits.allowedExtensions.join(', ')}.`,
      };
    }

    return { valid: true };
  },

  /**
   * Directly uploads a file to ImageKit using backend-generated authentication parameters
   */
  async uploadDirectToImageKit(
    file: File,
    auth: ImageKitAuthResponse,
    onProgress?: (percent: number) => void
  ): Promise<ImageKitUploadResult> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append('file', file);
      formData.append('fileName', auth.fileName || file.name);
      formData.append('publicKey', auth.publicKey);
      formData.append('signature', auth.signature);
      formData.append('expire', String(auth.expire));
      formData.append('token', auth.token);
      formData.append('folder', auth.folder);
      formData.append('useUniqueFileName', 'true');
      formData.append('responseFields', 'tags,isPrivateFile,metadata,thumbnailUrl');

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (e) {
            reject(new AppError({ code: 'IMAGEKIT_PARSE_ERROR', message: 'Failed to parse ImageKit response' }));
          }
        } else {
          let errorMsg = 'ImageKit upload failed';
          try {
            const errRes = JSON.parse(xhr.responseText);
            if (errRes.message) errorMsg = errRes.message;
            else if (errRes.error?.message) errorMsg = errRes.error.message;
          } catch (_) {}
          reject(new AppError({ code: 'IMAGEKIT_UPLOAD_FAILED', message: errorMsg }));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new AppError({ code: 'NETWORK_ERROR', message: 'Network error during file upload to ImageKit' }));
      });

      xhr.open('POST', auth.uploadUrl || 'https://upload.imagekit.io/api/v1/files/upload');
      xhr.send(formData);
    });
  },

  /**
   * Generates a transformed image URL safely using ImageKit transformations
   */
  getTransformedUrl(
    asset: any,
    preset?: TransformationPreset | string
  ): string {
    const rawUrl: string = typeof asset === 'string' ? asset : asset?.secureUrl || asset?.url || '';
    if (!rawUrl) return '';

    if (!rawUrl.includes('ik.imagekit.io')) {
      return rawUrl; // Return unmodified if not an ImageKit URL
    }

    if (!preset) return rawUrl;

    const transformationString =
      IMAGEKIT_TRANSFORMATIONS[preset as TransformationPreset] || preset;

    // Use ImageKit URL transformation query parameter `tr=<transformation>`
    try {
      const urlObj = new URL(rawUrl);
      urlObj.searchParams.set('tr', transformationString);
      return urlObj.toString();
    } catch (_) {
      const separator = rawUrl.includes('?') ? '&' : '?';
      return `${rawUrl}${separator}tr=${encodeURIComponent(transformationString)}`;
    }
  },
};

// Backward-compatible alias
export const cloudinaryClient = imagekitClient;
export type SignatureResponse = ImageKitAuthResponse;
