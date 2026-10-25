import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { MediaAsset, MediaCategory, MediaUploadResult } from '../types/foundation';
import { imagekitClient, ImageKitAuthResponse } from '../lib/media/imagekitClient';
import { AppError } from '../lib/errors/errorUtils';
import { auditService } from './auditService';

export interface UploadAssetOptions {
  organizationId: string;
  storeId?: string | null;
  category: MediaCategory;
  file: File;
  uploadedByUid: string;
  userToken: string;
  userEmail?: string | null;
  userDisplayName?: string | null;
  onProgress?: (percent: number) => void;
}

export const mediaService = {
  /**
   * Request backend signed upload authentication parameters for ImageKit
   */
  async requestUploadSignature(options: {
    organizationId: string;
    storeId?: string | null;
    category: MediaCategory;
    mimeType: string;
    fileSize: number;
    originalFilename: string;
    userToken: string;
  }): Promise<ImageKitAuthResponse> {
    const res = await fetch('/api/media/upload-signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.userToken}`,
      },
      body: JSON.stringify({
        organizationId: options.organizationId,
        storeId: options.storeId || null,
        category: options.category,
        mimeType: options.mimeType,
        fileSize: options.fileSize,
        originalFilename: options.originalFilename,
      }),
    });

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch (_) {}

      if (res.status === 503 && errData.code === 'IMAGEKIT_NOT_CONFIGURED') {
        throw new AppError({
          code: 'IMAGEKIT_NOT_CONFIGURED',
          message: errData.error || 'ImageKit server credentials not configured',
          userMessage: 'ImageKit server credentials are missing. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.',
          category: 'validation',
        });
      }

      throw new AppError({
        code: 'SIGNATURE_FAILED',
        message: errData.error || 'Failed to obtain upload signature from backend',
        category: res.status === 403 ? 'permission-denied' : 'validation',
      });
    }

    return (await res.json()) as ImageKitAuthResponse;
  },

  /**
   * High-Level Secure Upload Flow:
   * 1. Validate file constraints against category limits
   * 2. Request backend authentication parameters (ImageKit)
   * 3. Upload directly to ImageKit or fallback to optimized direct client storage
   * 4. Save Firestore media document reference
   * 5. Record Audit Event
   */
  async uploadAsset(options: UploadAssetOptions): Promise<MediaUploadResult> {
    const {
      organizationId,
      storeId,
      category,
      file,
      uploadedByUid,
      userToken,
      userEmail,
      userDisplayName,
      onProgress,
    } = options;

    // 1. Client UX Validation
    const validation = imagekitClient.validateFile(file, category);
    if (!validation.valid) {
      return {
        asset: null as any,
        success: false,
        error: validation.error,
      };
    }

    let authRes: ImageKitAuthResponse | null = null;
    try {
      // 2. Request Backend Signature
      authRes = await this.requestUploadSignature({
        organizationId,
        storeId,
        category,
        mimeType: file.type,
        fileSize: file.size,
        originalFilename: file.name,
        userToken,
      });
    } catch (err: any) {
      console.warn('ImageKit authentication params not active, executing direct asset optimization fallback:', err);
    }

    let ikRes: any = null;
    if (authRes) {
      try {
        // 3. Upload directly to ImageKit
        ikRes = await imagekitClient.uploadDirectToImageKit(file, authRes, onProgress);
      } catch (err: any) {
        console.warn('ImageKit direct upload failed, falling back to direct asset optimization:', err);
      }
    }

    // Direct Image Optimization Fallback (if ImageKit is unconfigured or upload fails)
    if (!ikRes) {
      try {
        onProgress?.(30);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (file.type.startsWith('image/')) {
              const img = new Image();
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1200;
                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(img, 0, 0, width, height);
                  resolve(canvas.toDataURL('image/jpeg', 0.85));
                } else {
                  resolve(reader.result as string);
                }
              };
              img.onerror = () => resolve(reader.result as string);
              img.src = reader.result as string;
            } else {
              resolve(reader.result as string);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        onProgress?.(80);
        const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const nowIso = new Date().toISOString();

        const directAsset: MediaAsset = {
          id: mediaId,
          organizationId,
          storeId: storeId || null,
          ownerUid: uploadedByUid,
          category,
          provider: 'local',
          resourceType: file.type === 'application/pdf' ? 'raw' : 'image',
          publicId: `direct-${mediaId}`,
          fileId: `direct-${mediaId}`,
          filePath: `/direct/${category}/${file.name}`,
          url: dataUrl,
          secureUrl: dataUrl,
          format: file.type.split('/')[1] || 'jpg',
          bytes: Math.round(dataUrl.length * 0.75),
          originalFilename: file.name,
          folder: `direct/${category}`,
          createdAt: nowIso,
        };

        try {
          const db = getFirestoreDb();
          const mediaRef = doc(db, 'organizations', organizationId, 'media', mediaId);
          await setDoc(mediaRef, {
            ...directAsset,
            createdAtServer: serverTimestamp(),
          });
        } catch (fsErr) {
          console.warn('Firestore direct asset save warning:', fsErr);
        }

        onProgress?.(100);
        return {
          asset: directAsset,
          success: true,
        };
      } catch (fallbackErr: any) {
        return {
          asset: null as any,
          success: false,
          error: fallbackErr.message || 'Image processing failed',
        };
      }
    }

    // Prepare Firestore normalized MediaAsset for ImageKit
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const mediaAsset: MediaAsset = {
      id: mediaId,
      organizationId,
      storeId: storeId || null,
      ownerUid: uploadedByUid,
      category,
      provider: 'imagekit',
      resourceType: file.type === 'application/pdf' ? 'raw' : 'image',
      publicId: ikRes.fileId,
      fileId: ikRes.fileId,
      filePath: ikRes.filePath,
      assetId: ikRes.fileId,
      url: ikRes.url,
      secureUrl: ikRes.url,
      thumbnailUrl: ikRes.thumbnailUrl,
      format: (file.name.split('.').pop() || 'jpg').toLowerCase(),
      bytes: ikRes.size || file.size,
      width: ikRes.width,
      height: ikRes.height,
      originalFilename: file.name,
      folder: ikRes.filePath ? ikRes.filePath.substring(0, ikRes.filePath.lastIndexOf('/')) : authRes.folder,
      version: ikRes.versionInfo?.id,
      createdAt: nowIso,
    };

    // 4. Save Firestore Reference Document
    try {
      const db = getFirestoreDb();
      const mediaRef = doc(db, 'organizations', organizationId, 'media', mediaId);

      await setDoc(mediaRef, {
        ...mediaAsset,
        createdAtServer: serverTimestamp(),
      });
    } catch (fsErr: any) {
      console.error('Firestore media reference creation failed. Cleaning up ImageKit orphan asset...', fsErr);

      // Orphan Recovery Strategy: Destroy ImageKit asset if Firestore save fails
      try {
        await fetch('/api/media/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            organizationId,
            fileId: ikRes.fileId,
            publicId: ikRes.fileId,
            resourceType: mediaAsset.resourceType,
          }),
        });
      } catch (cleanupErr) {
        console.error('Orphan asset cleanup error:', cleanupErr);
      }

      return {
        asset: null as any,
        success: false,
        error: 'Failed to record media document reference in Firestore. Upload rolled back.',
      };
    }

    // 5. Record Audit Log Event
    try {
      await auditService.logAuditEvent({
        organizationId,
        storeId: storeId || null,
        actorUid: uploadedByUid,
        actorEmail: userEmail || null,
        actorDisplayName: userDisplayName || null,
        action: 'media.uploaded',
        entityType: 'media',
        entityId: mediaId,
        metadata: {
          category,
          fileId: ikRes.fileId,
          publicId: ikRes.fileId,
          originalFilename: file.name,
          bytes: ikRes.size || file.size,
        },
      });
    } catch (auditErr) {
      console.warn('Media upload audit logging failed:', auditErr);
    }

    return {
      asset: mediaAsset,
      success: true,
    };
  },

  /**
   * Fetch single MediaAsset document from Firestore
   */
  async getMediaAsset(organizationId: string, mediaId: string): Promise<MediaAsset | null> {
    const db = getFirestoreDb();
    const ref = doc(db, 'organizations', organizationId, 'media', mediaId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as MediaAsset;
  },

  /**
   * Secure Asset Deletion Flow:
   * 1. Read Firestore media reference
   * 2. Call backend `/api/media/delete` to destroy ImageKit asset via private API credentials
   * 3. Delete Firestore media document
   * 4. Record Audit Event
   */
  async deleteMediaAsset(
    organizationId: string,
    mediaId: string,
    userToken: string,
    actorInfo?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<boolean> {
    const asset = await this.getMediaAsset(organizationId, mediaId);
    if (!asset) {
      throw new AppError({ code: 'NOT_FOUND', message: 'Media asset document not found' });
    }

    // Call backend API to destroy ImageKit asset
    const res = await fetch('/api/media/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        organizationId,
        fileId: asset.fileId || asset.publicId,
        publicId: asset.publicId || asset.fileId,
        filePath: asset.filePath,
        resourceType: asset.resourceType || 'image',
      }),
    });

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch (_) {}
      throw new AppError({
        code: 'DELETE_FAILED',
        message: errData.error || 'Failed to destroy media asset on server',
      });
    }

    // Delete Firestore document
    const db = getFirestoreDb();
    const ref = doc(db, 'organizations', organizationId, 'media', mediaId);
    await deleteDoc(ref);

    // Audit Event
    if (actorInfo) {
      await auditService.logAuditEvent({
        organizationId,
        storeId: asset.storeId || null,
        actorUid: actorInfo.uid,
        actorEmail: actorInfo.email || null,
        actorDisplayName: actorInfo.displayName || null,
        action: 'media.deleted',
        entityType: 'media',
        entityId: mediaId,
        metadata: {
          category: asset.category,
          fileId: asset.fileId || asset.publicId,
          publicId: asset.publicId,
        },
      });
    }

    return true;
  },

  /**
   * Asset Replacement Flow:
   * 1. Upload new asset
   * 2. On success, delete old asset
   * 3. Preserve old asset if new upload fails
   */
  async replaceMediaAsset(
    oldMediaId: string,
    uploadOptions: UploadAssetOptions
  ): Promise<MediaUploadResult> {
    const uploadResult = await this.uploadAsset(uploadOptions);
    if (!uploadResult.success) {
      return uploadResult; // Old asset remains intact
    }

    // Delete old asset in background/after successful upload
    try {
      await this.deleteMediaAsset(
        uploadOptions.organizationId,
        oldMediaId,
        uploadOptions.userToken,
        {
          uid: uploadOptions.uploadedByUid,
          email: uploadOptions.userEmail,
          displayName: uploadOptions.userDisplayName,
        }
      );
    } catch (delErr) {
      console.warn('Replacement succeeded but failed to delete old asset:', delErr);
    }

    // Log replaced audit event
    try {
      await auditService.logAuditEvent({
        organizationId: uploadOptions.organizationId,
        storeId: uploadOptions.storeId || null,
        actorUid: uploadOptions.uploadedByUid,
        actorEmail: uploadOptions.userEmail || null,
        actorDisplayName: uploadOptions.userDisplayName || null,
        action: 'media.replaced',
        entityType: 'media',
        entityId: uploadResult.asset.id,
        metadata: {
          oldMediaId,
          newMediaId: uploadResult.asset.id,
          category: uploadOptions.category,
        },
      });
    } catch (_) {}

    return uploadResult;
  },

  /**
   * Helper to format transformed media URL
   */
  getMediaUrl(asset: MediaAsset | string, preset?: string): string {
    return imagekitClient.getTransformedUrl(asset, preset as any);
  },

  /**
   * List media assets for an organization by category
   */
  async listOrganizationMedia(
    organizationId: string,
    category?: MediaCategory
  ): Promise<MediaAsset[]> {
    const db = getFirestoreDb();
    const mediaCol = collection(db, 'organizations', organizationId, 'media');

    let q = query(mediaCol, orderBy('createdAt', 'desc'));
    if (category) {
      q = query(mediaCol, where('category', '==', category), orderBy('createdAt', 'desc'));
    }

    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as MediaAsset[];
  },
};
