# Vetrify — ImageKit Setup & Developer Guide

This document outlines the setup, configuration, and security architecture for the **ImageKit-backed** media infrastructure in **Vetrify**.

---

## 1. ImageKit Account Credentials

Log in to the [ImageKit Dashboard](https://imagekit.io/dashboard) and obtain the following credentials from **Developer Options**:

1. **Public Key**: Public key used on the frontend or backend for upload initialization (e.g. `public_xxxxxxxx`).
2. **Private Key**: **STRICTLY CONFIDENTIAL** private key used by the backend to sign upload authentication parameters and destroy/manage assets via API.
3. **URL Endpoint**: The ImageKit delivery URL endpoint (e.g. `https://ik.imagekit.io/your_id`).

---

## 2. Server-Side Environment Variable Configuration

Add the following environment variables to your secure backend environment (e.g., Cloud Run / container environment variables, `.env` file for local development, or platform secret manager):

```env
IMAGEKIT_PUBLIC_KEY="public_your_key_here"
IMAGEKIT_PRIVATE_KEY="private_your_key_here"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"
```

> ⚠️ **CRITICAL SECURITY REQUIREMENT**:
> `IMAGEKIT_PRIVATE_KEY` must **NEVER** be prefixed with `VITE_` or exposed to React components, client bundles, browser JavaScript, local storage, public repositories, or Firestore documents.

---

## 3. Multi-Tenant Organization Folder Strategy

Vetrify enforces multi-tenant organization folder isolation in ImageKit:

```
/rx-omni/
  organizations/
    {organizationId}/
      branding/       (logos, banners)
      stores/
        {storeId}/   (store-specific media)
      users/
        {uid}/       (user avatars)
      products/      (product packaging & images)
      prescriptions/ (patient prescription uploads)
      documents/     (invoices, drug licenses, compliance certificates)
```

Organization membership and tenant boundaries are verified by the backend server before generating any signed upload authentication token.

---

## 4. Secure Direct Upload Architecture

1. **Client Request**: Frontend calls `/api/media/upload-signature` with the user's Firebase Auth ID token, `organizationId`, `category`, and file metadata.
2. **Identity & Permission Check**: Backend verifies the Firebase ID token, verifies active staff membership in `/organizations/{orgId}/staff/{uid}`, and checks store access bounds.
3. **Authentication Token Generation**: Backend generates HMAC token, expire timestamp, and signature using ImageKit's official Node SDK `imagekit.getAuthenticationParameters()`.
4. **Direct ImageKit Upload**: Client uploads directly from the browser to ImageKit (`https://upload.imagekit.io/api/v1/files/upload`) using `FormData` with progress tracking.
5. **Firestore Reference Document**: On upload completion, the client records the normalized `MediaAsset` document in `/organizations/{orgId}/media/{mediaId}` with `provider: "imagekit"`, `fileId`, `filePath`, and `secureUrl`.
6. **Orphan Recovery Strategy**: If recording the Firestore reference fails, the client immediately triggers `/api/media/delete` to destroy the ImageKit asset.

---

## 5. Deletion & Replacement Flow

- **Deletion**: Client calls `/api/media/delete` with the Firebase ID token and `fileId` (or `publicId`). The server verifies active organization membership and executes `imagekit.deleteFile(fileId)`.
- **Replacement**: Uploads the new asset first. On success, creates the new media reference and destroys the old asset. If the new upload fails, the original asset remains untouched.

---

## 6. URL Transformations

ImageKit transformations are generated safely using URL query parameters or path transformations (e.g. `?tr=w-150,h-150,fo-auto,q-80`):

- **thumbnail**: `w-150,h-150,fo-auto,q-80`
- **avatar**: `w-200,h-200,fo-face,r-max,q-80`
- **logo**: `w-300,h-100,cm-pad_resize,bg-FFFFFF,q-80`
- **productPreview**: `w-500,h-500,cm-pad_resize,bg-FFFFFF,q-85`
- **documentPreview**: `w-800,h-1000,q-85`

---

## 7. Local Testing

1. Ensure `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT` are populated in `.env`.
2. Run connectivity test:
   ```bash
   npx tsx src/test/imagekit-connectivity.test.ts
   ```
3. Run live end-to-end test:
   ```bash
   npx tsx src/test/imagekit-live-e2e.test.ts
   ```
