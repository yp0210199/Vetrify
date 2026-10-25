import {
  collection,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { ActivityEvent, Task, ExtendedAuditLog, TaskType, NavModuleId } from '../types';
import { taskService } from './taskService';
import { auditService } from './auditService';
import { notificationService } from './notificationService';

export const activityService = {
  /**
   * Aggregate Audit Logs, Tasks, and In-App Notifications into a single real-time chronological Activity Stream.
   */
  async getActivityStream(
    orgId: string,
    storeId: string | null,
    maxLimit = 100
  ): Promise<ActivityEvent[]> {
    if (!orgId) return [];

    const events: ActivityEvent[] = [];

    try {
      // 1. Fetch Audit Logs
      const auditLogs = await auditService.getAuditLogs(orgId, 50);
      auditLogs.forEach((log) => {
        if (storeId && log.storeId && log.storeId !== storeId) return;

        events.push({
          id: `audit_${log.id}`,
          organizationId: orgId,
          storeId: log.storeId,
          title: `Audit: ${log.action} on ${log.entityType}`,
          description: log.reason || `User ${log.actorName || 'Staff'} performed ${log.action} on ${log.entityType} (${log.entityLabel || log.entityId})`,
          type: 'audit',
          timestamp: log.timestamp,
          actorUid: log.actorUid,
          actorName: log.actorName,
          module: log.module,
          referenceId: log.id,
          route: log.module,
          severity: log.severity === 'CRITICAL' || log.severity === 'HIGH' ? 'error' : log.severity === 'MEDIUM' ? 'warning' : 'info',
        });
      });

      // 2. Fetch Tasks
      const tasks = await taskService.getTasks(orgId);
      tasks.forEach((task) => {
        if (storeId && task.storeId && task.storeId !== storeId) return;

        events.push({
          id: `task_${task.id}`,
          organizationId: orgId,
          storeId: task.storeId,
          title: `Task ${task.status}: ${task.title}`,
          description: task.description,
          type: 'task',
          timestamp: task.createdAt,
          actorUid: task.createdBy,
          actorName: task.createdByName || 'System',
          module: 'tasks',
          referenceId: task.id,
          route: 'tasks',
          severity: task.priority === 'URGENT' ? 'error' : task.priority === 'HIGH' ? 'warning' : 'info',
        });
      });

      // 3. Fetch Notifications (fallback if notificationService provides active ones)
      try {
        const db = getFirestoreDb();
        const notifRef = collection(db, 'organizations', orgId, 'notifications');
        const snap = await getDocs(query(notifRef, limit(30)));
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          events.push({
            id: `notif_${docSnap.id}`,
            organizationId: orgId,
            storeId: null,
            title: data.title || 'Notification',
            description: data.message || '',
            type: 'notification',
            timestamp: data.timestamp || data.createdAt,
            actorUid: null,
            actorName: 'System',
            module: 'notifications',
            referenceId: docSnap.id,
            route: 'notifications',
            severity: data.severity === 'error' ? 'error' : data.severity === 'warning' ? 'warning' : 'success',
          });
        });
      } catch (err) {
        console.warn('Failed to aggregate notifications stream:', err);
      }
    } catch (err) {
      console.warn('Error constructing activity stream:', err);
    }

    // Sort chronologically descending
    return events
      .sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, maxLimit);
  },

  /**
   * Workflow Orchestrator: Links critical Business Events into corresponding Audit, Task, and Notification outputs.
   */
  async triggerWorkflowEvent(
    orgId: string,
    storeId: string | null,
    eventType: 'EXPIRY_ALERT' | 'QUARANTINE_CREATED' | 'DESTRUCTION_REQUESTED' | 'H1_PRESCRIBED' | 'STOCK_LOW' | 'DELIVERY_DELAYED',
    data: {
      entityId: string;
      entityLabel: string;
      details: string;
      metadata?: Record<string, any>;
    },
    actor: { uid: string; displayName?: string | null; roleId?: string | null } = { uid: 'system', displayName: 'System Automation' }
  ): Promise<{ taskId?: string }> {
    console.log(`[Workflow Linker] Triggered: ${eventType} for entity ${data.entityId}`);

    let taskType: TaskType = 'CUSTOM';
    let module: NavModuleId = 'dashboard';
    let taskTitle = '';
    let taskDesc = '';
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
    let assignedRole: string | null = null;

    switch (eventType) {
      case 'EXPIRY_ALERT':
        taskType = 'EXPIRY_REVIEW';
        module = 'inventory';
        taskTitle = `Review Near-Expiry Batch: ${data.entityLabel}`;
        taskDesc = `Batch is near expiry. Details: ${data.details}. Review stock levels and move to quarantine if necessary.`;
        priority = 'HIGH';
        assignedRole = 'manager';
        break;
      case 'QUARANTINE_CREATED':
        taskType = 'QUARANTINE_REVIEW';
        module = 'compliance';
        taskTitle = `Verify Quarantined Batch: ${data.entityLabel}`;
        taskDesc = `Batch has been quarantined. Details: ${data.details}. Perform investigation and document findings.`;
        priority = 'HIGH';
        assignedRole = 'pharmacist';
        break;
      case 'DESTRUCTION_REQUESTED':
        taskType = 'DESTRUCTION_APPROVAL';
        module = 'compliance';
        taskTitle = `Approve Drug Destruction: ${data.entityLabel}`;
        taskDesc = `Request submitted for drug destruction. Details: ${data.details}. Review and authorize.`;
        priority = 'URGENT';
        assignedRole = 'owner';
        break;
      case 'H1_PRESCRIBED':
        taskType = 'H1_REVIEW';
        module = 'compliance';
        taskTitle = `Log Schedule H1 Register Entry: ${data.entityLabel}`;
        taskDesc = `A schedule H1 prescription has been filled. Details: ${data.details}. Verify patient identity and log entry.`;
        priority = 'MEDIUM';
        assignedRole = 'pharmacist';
        break;
      case 'STOCK_LOW':
        taskType = 'REORDER_REVIEW';
        module = 'replenishment';
        taskTitle = `Low Stock Replenishment: ${data.entityLabel}`;
        taskDesc = `Stock is below safety margins. Details: ${data.details}. Approve reorder recommendation.`;
        priority = 'MEDIUM';
        assignedRole = 'manager';
        break;
      case 'DELIVERY_DELAYED':
        taskType = 'DELIVERY_EXCEPTION';
        module = 'ecommerce';
        taskTitle = `Resolve Delivery Exception: ${data.entityLabel}`;
        taskDesc = `Delivery delayed or failed. Details: ${data.details}. Contact delivery partner and customer.`;
        priority = 'HIGH';
        assignedRole = 'staff';
        break;
    }

    // 1. Write the extended Audit Log
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId,
      action: 'trigger_workflow',
      entityType: taskType,
      entityId: data.entityId,
      entityLabel: data.entityLabel,
      module,
      severity: priority === 'URGENT' ? 'CRITICAL' : priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
      reason: data.details,
      metadata: data.metadata,
    });

    // 2. Create the Idempotent Task
    const createdTask = await taskService.createTask(orgId, {
      organizationId: orgId,
      title: taskTitle,
      description: taskDesc,
      taskType,
      module,
      priority,
      status: 'OPEN',
      assignedTo: null,
      assignedRole,
      createdBy: actor.uid,
      createdByName: actor.displayName || 'System Automation',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Default 3 days from now
      relatedEntityType: eventType,
      relatedEntityId: data.entityId,
      relatedEntityLabel: data.entityLabel,
      relatedRoute: module,
      parentTaskId: null,
      sourceEventId: null,
      correlationId: `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completionNotes: null,
      attachments: [],
      storeId,
    }, actor);

    return { taskId: createdTask.id };
  },
};
