import { NotificationType } from '../types/firestore';

export const APP_NAME = 'Vetrify';
export const APP_TAGLINE = 'Billing, Inventory & E-commerce';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const NOTIFICATION_CATEGORIES: ReadonlyArray<NotificationType> = Object.freeze([
  'security',
  'staff',
  'inventory',
  'purchases',
  'pos',
  'compliance',
  'system',
  'announcements',
]);

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  security: { inApp: true, email: true, sms: true, whatsapp: false },
  staff: { inApp: true, email: true, sms: false, whatsapp: false },
  inventory: { inApp: true, email: false, sms: false, whatsapp: false },
  purchases: { inApp: true, email: false, sms: false, whatsapp: false },
  pos: { inApp: true, email: false, sms: false, whatsapp: false },
  compliance: { inApp: true, email: true, sms: false, whatsapp: false },
  system: { inApp: true, email: true, sms: false, whatsapp: false },
  announcements: { inApp: true, email: false, sms: false, whatsapp: false },
});

export const SUPPORTED_CURRENCIES = Object.freeze([
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
]);

export const FILE_LIMITS = Object.freeze({
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_DOCUMENT_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
});

export const MEDIA_LIMITS = Object.freeze({
  avatar: {
    maxBytes: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  'organization-logo': {
    maxBytes: 3 * 1024 * 1024, // 3MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  },
  'store-logo': {
    maxBytes: 3 * 1024 * 1024, // 3MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  },
  'product-image': {
    maxBytes: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  product_image: {
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  prescription: {
    maxBytes: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  },
  invoice: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  invoice_attachment: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  'purchase-document': {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  'compliance-document': {
    maxBytes: 15 * 1024 * 1024, // 15MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  drug_license: {
    maxBytes: 15 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  certificate: {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
  banner: {
    maxBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  'general-document': {
    maxBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    allowedExtensions: ['jpg', 'jpeg', 'png', 'pdf'],
  },
});

export type TransformationPreset = 'thumbnail' | 'avatar' | 'logo' | 'productPreview' | 'documentPreview';

export const IMAGEKIT_TRANSFORMATIONS: Record<TransformationPreset, string> = Object.freeze({
  thumbnail: 'w-150,h-150,fo-auto,q-80',
  avatar: 'w-200,h-200,fo-face,r-max,q-80',
  logo: 'w-300,h-100,cm-pad_resize,bg-FFFFFF,q-80',
  productPreview: 'w-500,h-500,cm-pad_resize,bg-FFFFFF,q-85',
  documentPreview: 'w-800,h-1000,q-85',
});

// Backward compatibility alias
export const CLOUDINARY_TRANSFORMATIONS = IMAGEKIT_TRANSFORMATIONS;

