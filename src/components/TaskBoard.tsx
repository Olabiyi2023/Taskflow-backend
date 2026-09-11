import React from 'react';
import {
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Trash2,
  ArrowRight,
  Calendar,
  User as UserIcon,
  TrendingUp,
} from 'lucide-react';
import { Task, DashboardStats, TaskStatus, TaskPriority } from '../types';

interface TaskBoardProps {
  tasks: Task[];
  stats: DashboardStats | null;
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  overdueOnly: boolean;
  onSearchChange: (q: string) => void;
  onStatusFilterChange: (s: string) => void;
  onPriorityFilterChange: (p: string) => void;
  onOverdueToggle: () => void;
  onOpenCreateTask: () => void;
  onOpenComments: (task: Task) => void;
  onOpenAttachments?: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  stats,
  loading,
  searchQuery,
  statusFilter,
  priorityFilter,
  overdueOnly,
  onSearchChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onOverdueToggle,
  onOpenCreateTask,
  onOpenComments,
  onOpenAttachments,
  onStatusChange,
  onDeleteTask,
}) => {
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-950/60 text-rose-300 border-rose-800/50';
      case 'High':
        return 'bg-amber-950/60 text-amber-300 border-amber-800/50';
      case 'Medium':
        return 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50';
      case 'Low':
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50';
      case 'In Progress':
        return 'bg-blue-950/60 text-blue-300 border-blue-800/50';
      case 'Pending':
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">Total Tasks</div>
          <div className="text-2xl font-bold text-white mt-1">{stats?.totalTasks ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">Pending</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats?.pendingTasks ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">In Progress</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">{stats?.inProgressTasks ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">Completed</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats?.completedTasks ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">Overdue</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats?.overdueTasks ?? 0}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs text-slate-400">Completion Rate</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {stats?.completionRate ?? 0}%
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="task-search-input"
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['All', 'Pending', 'In Progress', 'Completed'].map((s) => (
              <button
                key={s}
                onClick={() => onStatusFilterChange(s)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>

          {/* Overdue Checkbox */}
          <button
            onClick={onOverdueToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition ${
              overdueOnly
                ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Overdue</span>
          </button>

          {/* New Task Button */}
          <button
            id="create-task-btn"
            onClick={onOpenCreateTask}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition ml-auto md:ml-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs animate-pulse">
            Loading tasks from backend...
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
            No tasks found matching your filters. Click "+ New Task" to create one!
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* Task Title & Details */}
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadge(
                      task.priority
                    )}`}
                  >
                    {task.priority}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      task.status
                    )}`}
                  >
                    {task.status}
                  </span>
                  {task.is_overdue && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-950/70 text-rose-300 border border-rose-800/60 flex items-center space-x-1">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>Overdue</span>
                    </span>
                  )}
                  <h3 className="text-sm font-semibold text-white ml-1">{task.title}</h3>
                </div>

                {task.description && (
                  <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                )}

                {/* Metadata row: Due date & Assignee */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Due: {task.due_date}</span>
                  </span>

                  {task.assignee ? (
                    <span className="flex items-center space-x-1.5">
                      <span
                        className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                        style={{ backgroundColor: task.assignee.avatar_color || '#4F46E5' }}
                      >
                        {task.assignee.name.slice(0, 1)}
                      </span>
                      <span>
                        {task.assignee.name} ({task.assignee.role})
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-500">Unassigned</span>
                  )}
                </div>
              </div>

              {/* Status Transition & Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                {/* Status progression quick button */}
                {task.status === 'Pending' && (
                  <button
                    onClick={() => onStatusChange(task.id, 'In Progress')}
                    className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 text-blue-300 border border-blue-800/60 transition"
                  >
                    <span>Start Task</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                {task.status === 'In Progress' && (
                  <button
                    onClick={() => onStatusChange(task.id, 'Completed')}
                    className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/60 transition"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Complete</span>
                  </button>
                )}

                {task.status === 'Completed' && (
                  <button
                    onClick={() => onStatusChange(task.id, 'Pending')}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Reopen
                  </button>
                )}

                {/* Attachments button */}
                <button
                  onClick={() =>
                    onOpenAttachments ? onOpenAttachments(task) : onOpenComments(task)
                  }
                  className="flex items-center space-x-1.5 text-xs font-medium px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Files & Attachments (Supabase Storage)"
                >
                  <Paperclip className="w-3 h-3 text-indigo-400" />
                  <span className="font-mono text-[11px] text-indigo-300">
                    {task.attachments_count ?? 0}
                  </span>
                </button>

                {/* Comments button */}
                <button
                  onClick={() => onOpenComments(task)}
                  className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Discussion & Comments"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span className="hidden sm:inline">Discuss</span>
                </button>

                {/* Delete button */}
                <button
                  onClick={() => onDeleteTask(task.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  title="Delete Task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
