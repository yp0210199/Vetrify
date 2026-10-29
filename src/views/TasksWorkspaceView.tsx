import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter,
  Search,
  User,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
  MessageSquare,
  ShieldAlert,
  ListTodo,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { taskService } from '../services/taskService';
import { Task, TaskStatus, TaskPriority, TaskType, NavModuleId } from '../types';

interface TasksWorkspaceViewProps {
  onNavigateToModule: (moduleId: NavModuleId) => void;
}

export const TasksWorkspaceView: React.FC<TasksWorkspaceViewProps> = ({ onNavigateToModule }) => {
  const { currentStore, organization, currentStaff } = useWorkspace();
  const orgId = organization?.id || '';

  // State Management
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Drawer & Form States
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isTransitionNotesOpen, setIsTransitionNotesOpen] = useState(false);
  const [transitionStatusTarget, setTransitionStatusTarget] = useState<TaskStatus | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');

  // Task Creation Form States
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newType, setNewType] = useState<TaskType>('CUSTOM');
  const [newModule, setNewModule] = useState<NavModuleId>('dashboard');
  const [newAssignedRole, setNewAssignedRole] = useState<string>('staff');
  const [newDueDate, setNewDueDate] = useState('');

  // Load Tasks
  const loadTasks = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const allTasks = await taskService.getTasks(orgId);
      // Filter out tasks by current store if applicable
      const filtered = currentStore ? allTasks.filter(t => !t.storeId || t.storeId === currentStore.id) : allTasks;
      setTasks(filtered);
    } catch (err) {
      console.warn('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [orgId, currentStore?.id]);

  // Create Task Action
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await taskService.createTask(orgId, {
        organizationId: orgId,
        title: newTitle,
        description: newDesc,
        taskType: newType,
        module: newModule,
        priority: newPriority,
        status: 'OPEN',
        assignedTo: null,
        assignedRole: newAssignedRole,
        createdBy: currentStaff?.uid || 'user',
        createdByName: currentStaff?.displayName || 'Staff User',
        dueDate: newDueDate ? new Date(newDueDate) : null,
        relatedEntityType: null,
        relatedEntityId: null,
        relatedEntityLabel: null,
        relatedRoute: null,
        parentTaskId: null,
        sourceEventId: null,
        correlationId: null,
        completionNotes: null,
        attachments: [],
        storeId: currentStore?.id || null,
      }, {
        uid: currentStaff?.uid || 'user',
        displayName: currentStaff?.displayName || 'Staff User',
        roleId: currentStaff?.roleId || 'staff',
      });

      // Clear Form
      setNewTitle('');
      setNewDesc('');
      setNewPriority('MEDIUM');
      setNewType('CUSTOM');
      setNewModule('dashboard');
      setNewAssignedRole('staff');
      setNewDueDate('');
      setIsCreateOpen(false);
      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Status Change trigger
  const triggerStatusTransition = (status: TaskStatus) => {
    if (!selectedTask) return;
    if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'BLOCKED') {
      setTransitionStatusTarget(status);
      setTransitionNotes('');
      setIsTransitionNotesOpen(true);
    } else {
      executeStatusTransition(status, '');
    }
  };

  // Perform status transition
  const executeStatusTransition = async (status: TaskStatus, notes: string) => {
    if (!selectedTask) return;
    try {
      await taskService.transitionTaskStatus(
        orgId,
        selectedTask.id,
        status,
        {
          uid: currentStaff?.uid || 'user',
          displayName: currentStaff?.displayName || 'Staff User',
          roleId: currentStaff?.roleId || 'staff',
        },
        notes
      );
      setIsTransitionNotesOpen(false);
      
      // Refresh task drawer state
      const updatedList = await taskService.getTasks(orgId);
      const matched = updatedList.find(t => t.id === selectedTask.id);
      if (matched) setSelectedTask(matched);

      loadTasks();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Transition failed');
    }
  };

  // Perform task reassignment to current user
  const handleClaimTask = async () => {
    if (!selectedTask) return;
    try {
      await taskService.reassignTask(
        orgId,
        selectedTask.id,
        currentStaff?.uid || null,
        currentStaff?.displayName || 'Staff User',
        currentStaff?.roleId || 'staff',
        {
          uid: currentStaff?.uid || 'user',
          displayName: currentStaff?.displayName || 'Staff User',
          roleId: currentStaff?.roleId || 'staff',
        }
      );
      // Refresh
      const updatedList = await taskService.getTasks(orgId);
      const matched = updatedList.find(t => t.id === selectedTask.id);
      if (matched) setSelectedTask(matched);

      loadTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering Logic
  const filteredTasks = tasks.filter(task => {
    // Status Filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE' && (task.status === 'COMPLETED' || task.status === 'CANCELLED')) return false;
      if (statusFilter !== 'ACTIVE' && task.status !== statusFilter) return false;
    }

    // Priority Filter
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;

    // Assignee Filter
    if (assigneeFilter !== 'ALL') {
      if (assigneeFilter === 'ME' && task.assignedTo !== currentStaff?.uid) return false;
      if (assigneeFilter === 'UNASSIGNED' && task.assignedTo !== null) return false;
      if (assigneeFilter === 'OTHERS' && (task.assignedTo === null || task.assignedTo === currentStaff?.uid)) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      const match =
        task.title.toLowerCase().includes(term) ||
        (task.description || '').toLowerCase().includes(term) ||
        task.taskType.toLowerCase().includes(term);
      if (!match) return false;
    }

    return true;
  });

  // Count aggregates for KPI
  const countOpen = tasks.filter(t => t.status === 'OPEN' || t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length;
  const countUrgent = tasks.filter(t => t.priority === 'URGENT' && t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length;
  const countCompleted = tasks.filter(t => t.status === 'COMPLETED').length;
  const countMyTasks = tasks.filter(t => t.assignedTo === currentStaff?.uid && t.status !== 'COMPLETED').length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-screen bg-slate-50 overflow-y-auto pb-10" id="tasks-workspace-root">
      {/* Top Banner / Hero */}
      <header className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare className="w-5.5 h-5.5 text-[#0D5C63]" />
              Rx Task Engine & Workflow Center
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Operational tasks, regulatory reviews, and exceptions requiring team intervention.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-[#0D5C63] hover:bg-[#094146] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer self-start"
          >
            <Plus className="w-4 h-4" />
            Create Custom Task
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 w-full space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Operations</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{countOpen}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Urgent Action</p>
              <h3 className="text-xl font-black text-red-600 leading-none mt-1">{countUrgent}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Completed Logs</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{countCompleted}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">My Active Tasks</p>
              <h3 className="text-xl font-black text-slate-800 leading-none mt-1">{countMyTasks}</h3>
            </div>
          </div>
        </div>

        {/* Filter Controls Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] md:flex-initial">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-medium focus:outline-none focus:border-[#0D5C63] focus:bg-white"
              />
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">All Active</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="bg-transparent border-none focus:outline-none pr-1"
              >
                <option value="ALL">All Assignees</option>
                <option value="ME">Assigned to Me</option>
                <option value="UNASSIGNED">Unassigned</option>
                <option value="OTHERS">Assigned to Others</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </div>
        </div>

        {/* Task List Workspace */}
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Clock className="w-8 h-8 animate-spin text-[#0D5C63]" />
            <p className="text-xs font-semibold">Resolving organization tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
            <CheckSquare className="w-12 h-12 mx-auto text-slate-300 stroke-1" />
            <p className="text-sm font-bold mt-3">All clear! No pending tasks matched</p>
            <p className="text-xs mt-1">Spawning tasks is automated as you perform lot audits, stock inwards, or file transactions.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {filteredTasks.map((task) => {
              const priorityColors = {
                LOW: 'bg-slate-50 text-slate-600 border-slate-200',
                MEDIUM: 'bg-blue-50 text-blue-700 border-blue-100',
                HIGH: 'bg-amber-50 text-amber-700 border-amber-100',
                URGENT: 'bg-red-50 text-red-700 border-red-100 animate-pulse',
              };

              const statusColors = {
                OPEN: 'bg-slate-100 text-slate-800',
                ASSIGNED: 'bg-indigo-50 text-indigo-700',
                IN_PROGRESS: 'bg-sky-50 text-sky-700',
                BLOCKED: 'bg-red-50 text-red-700',
                COMPLETED: 'bg-emerald-50 text-emerald-700',
                CANCELLED: 'bg-slate-100 text-slate-500 line-through',
                OVERDUE: 'bg-rose-50 text-rose-700 border border-rose-100',
              };

              const dDate = task.dueDate ? (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate)) : null;

              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4.5 hover:bg-slate-50 transition-all cursor-pointer select-none gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-1 flex-shrink-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-800 hover:text-[#0D5C63] transition-colors flex items-center gap-2">
                        {task.title}
                        {task.relatedEntityType && (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                            {task.taskType}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-2xl">
                        {task.description}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due: {dDate ? dDate.toLocaleDateString() : 'N/A'}
                        </span>
                        {task.assignedToName ? (
                          <span className="flex items-center gap-1 text-[#0D5C63]">
                            <User className="w-3 h-3" />
                            {task.assignedToName}
                          </span>
                        ) : (
                          <span className="text-amber-500">Unassigned ({task.assignedRole || 'Staff'})</span>
                        )}
                        <span>Created: {task.createdByName || 'System'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${statusColors[task.status]}`}>
                      {task.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Task Creation Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">Create Custom Task</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0D5C63] focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Provide precise details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0D5C63] focus:bg-white h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#0D5C63]"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#0D5C63]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Assignee Role</label>
                  <select
                    value={newAssignedRole}
                    onChange={(e) => setNewAssignedRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#0D5C63]"
                  >
                    <option value="staff">Staff</option>
                    <option value="sales_staff">Sales Staff</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Redirect Target</label>
                  <select
                    value={newModule}
                    onChange={(e) => setNewModule(e.target.value as NavModuleId)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#0D5C63]"
                  >
                    <option value="dashboard">Dashboard</option>
                    <option value="inventory">Inventory</option>
                    <option value="pos">Retail POS</option>
                    <option value="compliance">Compliance</option>
                    <option value="purchases">Purchases</option>
                    <option value="replenishment">Replenishment</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0D5C63] hover:bg-[#094146] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Slide-out Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D5C63]/10 text-[#0D5C63]">
                  Task ID: {selectedTask.id.substring(0, 8)}...
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedTask.taskType}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Task Meta Body */}
            <div className="flex-1 py-6 space-y-6">
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 leading-snug">
                  {selectedTask.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedTask.description}
                </p>
              </div>

              {/* Related Entity Link & Navigation Linker */}
              {(selectedTask.relatedEntityId || selectedTask.module) && (
                <div className="bg-sky-50/50 rounded-2xl border border-sky-100 p-4 space-y-2">
                  <h4 className="text-[10px] font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Workflow Navigation Linker
                  </h4>
                  <div className="flex flex-col gap-1.5 text-xs">
                    {selectedTask.relatedEntityType && (
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-400">Context Source:</span>
                        <span className="font-bold text-slate-700">{selectedTask.relatedEntityType}</span>
                      </div>
                    )}
                    {selectedTask.relatedEntityLabel && (
                      <div className="flex justify-between font-medium">
                        <span className="text-slate-400">Target Record:</span>
                        <span className="font-bold text-slate-700">{selectedTask.relatedEntityLabel}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTask(null);
                      onNavigateToModule(selectedTask.module || 'dashboard');
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-2 bg-[#0D5C63] hover:bg-[#094146] text-white text-xs font-bold py-2 px-3 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    Open Context View
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Assignment Controls */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ownership</h4>
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {selectedTask.assignedToName || 'Unassigned'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold capitalize">
                        Target Role: {selectedTask.assignedRole || 'staff'}
                      </p>
                    </div>
                  </div>
                  {!selectedTask.assignedTo && (
                    <button
                      onClick={handleClaimTask}
                      className="bg-[#0D5C63]/10 hover:bg-[#0D5C63]/20 text-[#0D5C63] text-[11px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Claim Task
                    </button>
                  )}
                </div>
              </div>

              {/* Transitions */}
              {selectedTask.status !== 'COMPLETED' && selectedTask.status !== 'CANCELLED' && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Update Progress State</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTask.status !== 'IN_PROGRESS' && (
                      <button
                        onClick={() => triggerStatusTransition('IN_PROGRESS')}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold p-2.5 rounded-xl border border-indigo-100 transition-all cursor-pointer"
                      >
                        Start Task
                      </button>
                    )}
                    {selectedTask.status !== 'BLOCKED' && (
                      <button
                        onClick={() => triggerStatusTransition('BLOCKED')}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold p-2.5 rounded-xl border border-rose-100 transition-all cursor-pointer"
                      >
                        Block Task
                      </button>
                    )}
                    <button
                      onClick={() => triggerStatusTransition('COMPLETED')}
                      className="col-span-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-black p-2.5 rounded-xl border border-emerald-100 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Mark Completed
                    </button>
                    <button
                      onClick={() => triggerStatusTransition('CANCELLED')}
                      className="col-span-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold p-2 px-3 rounded-xl border border-slate-200 transition-all cursor-pointer text-center"
                    >
                      Cancel / Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Task Closing Comments Tracing */}
              {selectedTask.completionNotes && (
                <div className="space-y-1">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion / Closure Notes</h4>
                  <p className="text-xs font-bold text-slate-700 bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-start gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                    {selectedTask.completionNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transition Action Note Modal */}
      {isTransitionNotesOpen && transitionStatusTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100">
              <h3 className="text-xs font-extrabold text-slate-900">
                Confirm Transition: {transitionStatusTarget}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 font-medium">
                Please document notes, verification comments, or reason for blocking/completing this task.
              </p>
              <textarea
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder="Reason / action summary..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0D5C63] focus:bg-white h-24"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsTransitionNotesOpen(false)}
                  className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeStatusTransition(transitionStatusTarget, transitionNotes)}
                  className="bg-[#0D5C63] text-white text-xs font-bold px-5 py-2 rounded-xl cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
