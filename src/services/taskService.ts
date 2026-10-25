import {
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDb } from '../lib/firebase/config';
import { Task, TaskStatus, TaskPriority, TaskType, NavModuleId } from '../types';
import { auditService } from './auditService';
import { notificationService } from './notificationService';
import { sanitizeFirestorePayload } from '../lib/firebase/queryUtils';

export const taskService = {
  /**
   * Get collection reference for organization tasks
   */
  getTasksRef(orgId: string) {
    const db = getFirestoreDb();
    return collection(db, 'organizations', orgId, 'tasks');
  },

  /**
   * Check for duplicate active tasks before creation to enforce idempotence
   */
  async findActiveDuplicateTask(
    orgId: string,
    taskType: TaskType | string,
    relatedEntityType: string | null,
    relatedEntityId: string | null
  ): Promise<Task | null> {
    if (!relatedEntityType || !relatedEntityId) return null;
    try {
      const collRef = this.getTasksRef(orgId);
      const q = query(
        collRef,
        where('taskType', '==', taskType),
        where('relatedEntityType', '==', relatedEntityType),
        where('relatedEntityId', '==', relatedEntityId)
      );
      const snapshot = await getDocs(q);
      const activeTaskDoc = snapshot.docs.find(docSnap => {
        const data = docSnap.data() as any;
        return data.status !== 'COMPLETED' && data.status !== 'CANCELLED';
      });

      if (activeTaskDoc) {
        return { id: activeTaskDoc.id, ...(activeTaskDoc.data() as any) } as Task;
      }
      return null;
    } catch (err) {
      console.warn('Deduplication check failed:', err);
      return null;
    }
  },

  /**
   * Create a single tenant-scoped task. Idempotent by default.
   */
  async createTask(
    orgId: string,
    payload: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'startedAt' | 'completedAt' | 'cancelledAt'> & { id?: string },
    actor: { uid: string; displayName?: string | null; roleId?: string | null } = { uid: 'system', displayName: 'System Automation' }
  ): Promise<Task> {
    // 1. Check for active duplicates
    if (payload.relatedEntityType && payload.relatedEntityId) {
      const existing = await this.findActiveDuplicateTask(
        orgId,
        payload.taskType,
        payload.relatedEntityType,
        payload.relatedEntityId
      );
      if (existing) {
        console.log(`Task creation skipped (Deduplicated): ${existing.id}`);
        return existing;
      }
    }

    const db = getFirestoreDb();
    const taskCollRef = this.getTasksRef(orgId);
    const taskDocRef = payload.id ? doc(taskCollRef, payload.id) : doc(taskCollRef);
    const taskId = taskDocRef.id;

    const taskData: Task = {
      ...payload,
      id: taskId,
      organizationId: orgId,
      status: payload.status || 'OPEN',
      createdBy: payload.createdBy || actor.uid,
      createdByName: payload.createdByName || actor.displayName || 'System',
      attachments: payload.attachments || [],
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const sanitized = sanitizeFirestorePayload(taskData);
    await setDoc(taskDocRef, sanitized);

    // 2. Audit task creation
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId: payload.storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId || 'staff',
      action: 'create',
      entityType: 'task',
      entityId: taskId,
      entityLabel: payload.title,
      module: 'tasks',
      severity: 'LOW',
      after: sanitized,
    });

    // 3. Automated Notification
    const recipient = payload.assignedTo || 'all';
    await notificationService.createNotification(orgId, {
      recipientUid: recipient,
      title: `New Task Assigned: ${payload.title}`,
      message: payload.description || `A new task of type ${payload.taskType} has been assigned.`,
      severity: payload.priority === 'URGENT' || payload.priority === 'HIGH' ? 'warning' : 'info',
      type: 'system',
      targetModule: 'tasks',
    });

    return { ...taskData, id: taskId };
  },

  /**
   * Update task fields
   */
  async updateTask(
    orgId: string,
    taskId: string,
    updates: Partial<Omit<Task, 'id' | 'organizationId' | 'createdAt'>>,
    actor: { uid: string; displayName?: string | null; roleId?: string | null }
  ): Promise<void> {
    const db = getFirestoreDb();
    const taskDocRef = doc(db, 'organizations', orgId, 'tasks', taskId);
    const docSnap = await getDoc(taskDocRef);
    if (!docSnap.exists()) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const beforeState = docSnap.data() as Task;
    const patch = {
      ...updates,
      updatedAt: serverTimestamp(),
    };

    await updateDoc(taskDocRef, sanitizeFirestorePayload(patch));

    // Log update audit event
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId: beforeState.storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId || 'staff',
      action: 'update',
      entityType: 'task',
      entityId: taskId,
      entityLabel: updates.title || beforeState.title,
      module: 'tasks',
      severity: 'LOW',
      before: beforeState,
      after: { ...beforeState, ...patch },
    });
  },

  /**
   * Controlled transition of task statuses with role-based restriction checks
   */
  async transitionTaskStatus(
    orgId: string,
    taskId: string,
    newStatus: TaskStatus,
    actor: { uid: string; displayName?: string | null; roleId?: string | null },
    notes?: string
  ): Promise<void> {
    const db = getFirestoreDb();
    const taskDocRef = doc(db, 'organizations', orgId, 'tasks', taskId);
    const docSnap = await getDoc(taskDocRef);
    if (!docSnap.exists()) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const task = docSnap.data() as Task;
    const oldStatus = task.status;

    // Validate controlled transitions
    // OPEN -> ASSIGNED
    // ASSIGNED -> IN_PROGRESS
    // IN_PROGRESS -> BLOCKED
    // IN_PROGRESS -> COMPLETED
    // BLOCKED -> IN_PROGRESS
    // OPEN/ASSIGNED/IN_PROGRESS -> CANCELLED
    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      OPEN: ['ASSIGNED', 'IN_PROGRESS', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED'],
      IN_PROGRESS: ['BLOCKED', 'COMPLETED', 'CANCELLED'],
      BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      OVERDUE: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    };

    if (oldStatus !== newStatus && !validTransitions[oldStatus]?.includes(newStatus)) {
      throw new Error(`Invalid task status transition from ${oldStatus} to ${newStatus}`);
    }

    const updates: Partial<Task> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    if (newStatus === 'IN_PROGRESS' && !task.startedAt) {
      updates.startedAt = serverTimestamp();
    } else if (newStatus === 'COMPLETED') {
      updates.completedAt = serverTimestamp();
      updates.completionNotes = notes || null;
    } else if (newStatus === 'CANCELLED') {
      updates.cancelledAt = serverTimestamp();
      updates.completionNotes = notes || null;
    }

    await updateDoc(taskDocRef, sanitizeFirestorePayload(updates));

    // Audit transition
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId: task.storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId || 'staff',
      action: 'transition',
      entityType: 'task',
      entityId: taskId,
      entityLabel: task.title,
      module: 'tasks',
      severity: 'LOW',
      reason: notes || `Status changed from ${oldStatus} to ${newStatus}`,
      before: task,
      after: { ...task, ...updates },
    });

    // Notify task creator or manager on completion
    if (newStatus === 'COMPLETED') {
      await notificationService.createNotification(orgId, {
        recipientUid: task.createdBy === 'system' ? 'all' : task.createdBy,
        title: `Task Completed: ${task.title}`,
        message: `Task "${task.title}" has been marked as completed by ${actor.displayName || 'Staff'}.${notes ? ` Notes: ${notes}` : ''}`,
        severity: 'success',
        type: 'system',
        targetModule: 'tasks',
      });
    }
  },

  /**
   * Reassign task to a user or role
   */
  async reassignTask(
    orgId: string,
    taskId: string,
    assigneeUid: string | null,
    assigneeName: string | null,
    assigneeRole: string | null,
    actor: { uid: string; displayName?: string | null; roleId?: string | null }
  ): Promise<void> {
    const db = getFirestoreDb();
    const taskDocRef = doc(db, 'organizations', orgId, 'tasks', taskId);
    const docSnap = await getDoc(taskDocRef);
    if (!docSnap.exists()) {
      throw new Error(`Task with ID ${taskId} not found`);
    }

    const task = docSnap.data() as Task;
    const oldAssignee = task.assignedTo;

    const updates: Partial<Task> = {
      assignedTo: assigneeUid,
      assignedToName: assigneeName,
      assignedRole: assigneeRole,
      status: assigneeUid ? 'ASSIGNED' : 'OPEN',
      updatedAt: serverTimestamp(),
    };

    await updateDoc(taskDocRef, sanitizeFirestorePayload(updates));

    // Audit reassignment
    await auditService.logAuditEvent({
      organizationId: orgId,
      storeId: task.storeId,
      actorUid: actor.uid,
      actorDisplayName: actor.displayName,
      actorRole: actor.roleId || 'staff',
      action: 'reassign',
      entityType: 'task',
      entityId: taskId,
      entityLabel: task.title,
      module: 'tasks',
      severity: 'LOW',
      reason: `Task reassigned from ${task.assignedToName || 'Unassigned'} to ${assigneeName || 'Unassigned'}`,
      before: task,
      after: { ...task, ...updates },
    });

    // Notifications for previous and new assignee
    if (oldAssignee && oldAssignee !== assigneeUid) {
      await notificationService.createNotification(orgId, {
        recipientUid: oldAssignee,
        title: `Task Unassigned: ${task.title}`,
        message: `Task "${task.title}" has been reassigned to ${assigneeName || 'someone else'} by ${actor.displayName || 'Manager'}.`,
        severity: 'info',
        type: 'system',
        targetModule: 'tasks',
      });
    }

    if (assigneeUid) {
      await notificationService.createNotification(orgId, {
        recipientUid: assigneeUid,
        title: `Task Assigned: ${task.title}`,
        message: `You have been assigned to task: "${task.title}" by ${actor.displayName || 'Manager'}.`,
        severity: 'info',
        type: 'system',
        targetModule: 'tasks',
      });
    }
  },

  /**
   * Fetch all tasks for an organization
   */
  async getTasks(orgId: string): Promise<Task[]> {
    if (!orgId) return [];
    try {
      const db = getFirestoreDb();
      const collRef = this.getTasksRef(orgId);
      const q = query(collRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          // Handle server timestamps gracefully
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          dueDate: data.dueDate,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          cancelledAt: data.cancelledAt,
        } as Task;
      });
    } catch (err) {
      console.warn('Failed to load tasks:', err);
      return [];
    }
  },

  /**
   * Advanced query for tasks
   */
  async getFilteredTasks(
    orgId: string,
    filters: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedTo?: string | null;
      assignedRole?: string | null;
      storeId?: string | null;
      taskType?: string;
      dueDate?: Date;
    }
  ): Promise<Task[]> {
    const list = await this.getTasks(orgId);
    return list.filter(task => {
      if (filters.status && task.status !== filters.status) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.assignedTo !== undefined && task.assignedTo !== filters.assignedTo) return false;
      if (filters.assignedRole !== undefined && task.assignedRole !== filters.assignedRole) return false;
      if (filters.storeId !== undefined && task.storeId !== filters.storeId) return false;
      if (filters.taskType && task.taskType !== filters.taskType) return false;
      
      if (filters.dueDate && task.dueDate) {
        const due = task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate);
        // Simple day matching
        if (due.toDateString() !== filters.dueDate.toDateString()) return false;
      }
      return true;
    });
  }
};
