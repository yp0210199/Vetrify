import { NavModuleId } from './index';

export type TaskStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskType =
  | 'EXPIRY_REVIEW'
  | 'QUARANTINE_REVIEW'
  | 'DESTRUCTION_APPROVAL'
  | 'SUPPLIER_PAYMENT'
  | 'CUSTOMER_PAYMENT'
  | 'PURCHASE_APPROVAL'
  | 'GRN_REVIEW'
  | 'STOCK_TRANSFER_APPROVAL'
  | 'STOCK_TRANSFER_RECEIPT'
  | 'REORDER_REVIEW'
  | 'PRESCRIPTION_VERIFICATION'
  | 'H1_REVIEW'
  | 'CREDIT_OVERRIDE_REVIEW'
  | 'DELIVERY_FULFILLMENT'
  | 'DELIVERY_EXCEPTION'
  | 'GST_REVIEW'
  | 'ACCOUNTING_REVIEW'
  | 'SYSTEM_ALERT'
  | 'CUSTOM';

export interface Task {
  id: string;
  organizationId: string;
  storeId: string | null;
  title: string;
  description: string;
  taskType: TaskType | string;
  module: NavModuleId;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string | null; // User UID
  assignedToName?: string | null;
  assignedRole: string | null; // e.g., 'owner', 'manager', 'pharmacist', etc.
  createdBy: string; // User UID or 'system'
  createdByName?: string | null;
  dueDate: any | null; // Timestamp or Date
  startedAt: any | null;
  completedAt: any | null;
  cancelledAt: any | null;
  createdAt: any;
  updatedAt: any;
  relatedEntityType: string | null; // e.g. 'product', 'invoice', etc.
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  relatedRoute: string | null; // Route deep link module name
  parentTaskId: string | null;
  sourceEventId: string | null;
  correlationId: string | null;
  completionNotes: string | null;
  attachments: any[];
}

export type AuditSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AuditCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'PRODUCT'
  | 'INVENTORY'
  | 'BATCH'
  | 'POS'
  | 'CUSTOMER'
  | 'KHATA'
  | 'SUPPLIER'
  | 'PURCHASE'
  | 'GRN'
  | 'RETURN'
  | 'CREDIT_NOTE'
  | 'QUARANTINE'
  | 'DESTRUCTION'
  | 'WHOLESALE'
  | 'STOCK_TRANSFER'
  | 'PRESCRIPTION'
  | 'REGULATORY'
  | 'REPLENISHMENT'
  | 'GST'
  | 'ACCOUNTING'
  | 'E_COMMERCE'
  | 'DELIVERY'
  | 'TASK'
  | 'NOTIFICATION'
  | 'SETTINGS'
  | 'USER'
  | 'ORGANIZATION'
  | 'STORE'
  | 'SYSTEM';

// Extended AuditLog definition matching requirement
export interface ExtendedAuditLog {
  id: string;
  organizationId: string;
  storeId: string | null;
  actorUid: string;
  actorName: string | null;
  actorRole: string | null;
  actorType: 'staff' | 'customer' | 'system' | 'api';
  eventType: string; // e.g. 'product.deleted'
  module: string; // e.g. 'inventory'
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  timestamp: any;
  reason: string | null;
  severity: AuditSeverity;
  source: 'web_app' | 'mobile_app' | 'api' | 'automation';
  correlationId: string | null;
  transactionId: string | null;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  changedFields: string[] | null;
  metadata: Record<string, any>;
  createdAt: any;
}

export interface ActivityEvent {
  id: string;
  organizationId: string;
  storeId: string | null;
  title: string;
  description: string;
  type: 'audit' | 'task' | 'notification' | 'system';
  timestamp: any;
  actorUid: string | null;
  actorName: string | null;
  module: NavModuleId | string | null;
  referenceId: string;
  route: string | null;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface SearchResult {
  entityType: string;
  entityId: string;
  organizationId: string;
  storeId: string | null;
  title: string;
  subtitle: string;
  status: string;
  createdAt: any;
  updatedAt: any;
  route: NavModuleId;
  metadata: Record<string, any>;
}

// Media and Asset Systems
export type MediaCategory = 'PRODUCT' | 'BATCH' | 'PRESCRIPTION' | 'COMPLIANCE' | 'INVOICE' | 'OTHER' | 'product-image' | 'prescription' | 'avatar' | 'compliance' | 'other' | string;

export interface MediaAsset {
  id: string;
  organizationId?: string;
  storeId?: string | null;
  category?: MediaCategory;
  url?: string;
  publicId?: string | null;
  fileId?: string;
  filePath?: string;
  thumbnailUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedByUid?: string;
  uploadedByName?: string | null;
  createdAt?: any;
  updatedAt?: any;
  resourceType?: string;
  secureUrl?: string;
  ownerUid?: string;
  provider?: string;
  bytes?: number;
  assetId?: string;
  originalFilename?: string;
  format?: string;
  folder?: string;
  width?: number;
  height?: number;
  version?: string | number;
}

export interface MediaUploadResult {
  url?: string;
  publicId?: string | null;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  success?: boolean;
  error?: string | null;
  asset?: MediaAsset;
}

// Toast Notification Systems
export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  message?: string;
  type: ToastType;
  duration?: number;
  action?: ToastAction | null;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

// Global Error Management
export type ErrorCategory =
  | 'DATABASE' | 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'NETWORK' | 'AI_ENGINE' | 'POS' | 'SYSTEM' | 'UNKNOWN'
  | 'permission-denied' | 'not-found' | 'already-exists' | 'network' | 'validation' | 'unknown';

export interface AppErrorOptions {
  category?: ErrorCategory;
  code: string;
  message: string;
  userMessage?: string;
  retryable?: boolean;
  severity?: AuditSeverity;
  originalError?: any;
}
