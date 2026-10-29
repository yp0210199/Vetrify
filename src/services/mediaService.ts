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
   * Backup Server-Side Proxy Upload via POST /api/media/upload-proxy
   * Route file uploads through backend when direct client-to-ImageKit XHR is blocked by CORS/network policy.
   */
  async uploadViaServerProxy(options: {
    organizationId: string;
    storeId?: string | null;
    category: MediaCategory;
    file: File;
    userToken: string;
    onProgress?: (percent: number) => void;
  }): Promise<any> {
    options.onProgress?.(20);

    const fileBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(options.file);
    });

    options.onProgress?.(50);

    const res = await fetch('/api/media/upload-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${options.userToken}`,
      },
      body: JSON.stringify({
        organizationId: options.organizationId,
        storeId: options.storeId || null,
        category: options.category,
        fileBase64,
        originalFilename: options.file.name,
      }),
    });

    if (!res.ok) {
      let errData: any = {};
      try {
        errData = await res.json();
      } catch (_) {}
      throw new AppError({
        code: 'PROXY_UPLOAD_FAILED',
        message: errData.error || 'Server proxy upload to ImageKit failed',
      });
    }

    options.onProgress?.(90);
    return await res.json();
  },

  /**
   * High-Level Secure Upload Flow:
   * 1. Validate file constraints against category limits
   * 2. Request backend authentication parameters (ImageKit)
   * 3. Upload directly to ImageKit or fallback to server proxy upload
   * 4. Enforce authentic ImageKit CDN URLs (Base64 storage strictly disabled)
   * 5. Save Firestore media document reference
   * 6. Record Audit Event
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
      // 2. Request Backend Signature for Direct Client Upload
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
      console.warn('Direct ImageKit auth signature request failed:', err);
    }

    let ikRes: any = null;
    if (authRes) {
      try {
        // 3a. Primary Strategy: Upload directly to ImageKit from client
        ikRes = await imagekitClient.uploadDirectToImageKit(file, authRes, onProgress);
      } catch (err: any) {
        console.warn('Direct client-to-ImageKit upload failed, attempting server proxy upload backup:', err);
      }
    }

    // 3b. Secondary Strategy: Server Proxy Upload Backup (if direct client upload fails or signature fails)
    if (!ikRes) {
      try {
        ikRes = await this.uploadViaServerProxy({
          organizationId,
          storeId,
          category,
          file,
          userToken,
          onProgress,
        });
      } catch (proxyErr: any) {
        console.error('ImageKit server proxy upload failed:', proxyErr);
        throw new AppError({
            code: 'UPLOAD_FAILED',
            message: 'Failed to upload to ImageKit via both direct and proxy methods.',
        });
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
      folder: ikRes.filePath ? ikRes.filePath.substring(0, ikRes.filePath.lastIndexOf('/')) : (authRes?.folder || 'products'),
      ...(ikRes.versionInfo?.id ? { version: ikRes.versionInfo.id } : {}),
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
   * Check ImageKit backend connectivity & status
   */
  async checkImageKitStatus(): Promise<{ connected: boolean; provider: string; urlEndpoint: string }> {
    try {
      const res = await fetch('/api/media/status');
      if (res.ok) {
        const data = await res.json();
        return {
          connected: Boolean(data.connected),
          provider: data.provider || 'ImageKit CDN',
          urlEndpoint: data.urlEndpoint || '',
        };
      }
    } catch (_) {}
    return {
      connected: false,
      provider: 'ImageKit CDN',
      urlEndpoint: '',
    };
  },

  /**
   * Secure Asset Deletion Flow:
   * 1. Check if mediaId is synthetic/placeholder
   * 2. Read Firestore media reference
   * 3. Call backend `/api/media/delete` to destroy ImageKit asset via private API credentials
   * 4. Delete Firestore media document
   * 5. Record Audit Event
   */
  async deleteMediaAsset(
    organizationId: string,
    mediaId: string,
    userToken: string,
    actorInfo?: { uid: string; email?: string | null; displayName?: string | null }
  ): Promise<boolean> {
    if (!mediaId || mediaId === 'asset_existing' || mediaId.startsWith('asset_existing')) {
      return true;
    }

    const asset = await this.getMediaAsset(organizationId, mediaId);
    if (!asset) {
      // Asset document already removed or nonexistent
      return true;
    }

    const targetFileId = asset.fileId || asset.publicId;
    if (targetFileId && !targetFileId.startsWith('local_') && !targetFileId.startsWith('asset_')) {
      // Call backend API to destroy ImageKit asset
      try {
        await fetch('/api/media/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            organizationId,
            fileId: targetFileId,
            publicId: targetFileId,
            filePath: asset.filePath,
            resourceType: asset.resourceType || 'image',
          }),
        });
      } catch (delErr) {
        console.warn('Backend ImageKit delete request warning:', delErr);
      }
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
