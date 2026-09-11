import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { TaskBoard } from './components/TaskBoard';
import { SupabaseModal } from './components/SupabaseModal';
import { BillingModal } from './components/BillingModal';
import { TeamModal } from './components/TeamModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskCommentsModal } from './components/TaskCommentsModal';
import { ApiExplorer } from './components/ApiExplorer';
import { AuthModal } from './components/AuthModal';
import { EmailAlertsModal } from './components/EmailAlertsModal';
import { api } from './services/api';
import {
  Task,
  DashboardStats,
  TeamMember,
  NotificationItem,
  SubscriptionInfo,
  SupabaseStatus,
  TaskStatus,
  TaskPriority,
  User,
} from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | 'profile'>('login');
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isEmailAlertsModalOpen, setIsEmailAlertsModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isApiExplorerOpen, setIsApiExplorerOpen] = useState(false);
  const [commentTask, setCommentTask] = useState<Task | null>(null);
  const [commentTaskTab, setCommentTaskTab] = useState<'comments' | 'attachments'>('comments');

  // Data loaders
  const loadCurrentUser = useCallback(async () => {
    try {
      const res = await api.getMe();
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    } catch {
      // Keep null or fallback
    }
  }, []);
  const loadSupabaseStatus = useCallback(async () => {
    const res = await api.getSupabaseStatus();
    if (res.data) setSupabaseStatus(res.data);
  }, []);

  const loadSubscription = useCallback(async () => {
    const res = await api.getSubscription();
    if (res.data) setSubscription(res.data);
  }, []);

  const loadStats = useCallback(async () => {
    const res = await api.getDashboardStats();
    if (res.data) setStats(res.data);
  }, []);

  const loadTeam = useCallback(async () => {
    const res = await api.getTeam();
    if (res.data) setTeamMembers(res.data);
  }, []);

  const loadNotifications = useCallback(async () => {
    const [listRes, countRes] = await Promise.all([
      api.getNotifications(),
      api.getUnreadNotificationCount(),
    ]);
    if (listRes.data) setNotifications(listRes.data);
    if (countRes.data) setUnreadCount(countRes.data.unreadCount);
  }, []);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    const res = await api.getTasks({
      search: searchQuery,
      status: statusFilter,
      priority: priorityFilter,
      is_overdue: overdueOnly ? true : undefined,
    });
    if (res.data?.tasks) {
      setTasks(res.data.tasks);
    }
    setLoadingTasks(false);
  }, [searchQuery, statusFilter, priorityFilter, overdueOnly]);

  const refreshAll = useCallback(() => {
    loadCurrentUser();
    loadSupabaseStatus();
    loadSubscription();
    loadStats();
    loadTeam();
    loadNotifications();
    loadTasks();
  }, [
    loadCurrentUser,
    loadSupabaseStatus,
    loadSubscription,
    loadStats,
    loadTeam,
    loadNotifications,
    loadTasks,
  ]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auth Handlers
  const handleOpenAuthModal = (mode: 'login' | 'register' | 'profile' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    refreshAll();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    refreshAll();
  };

  // Handlers
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const res = await api.updateTaskStatus(taskId, newStatus);
    if (res.success && res.data) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? res.data! : t)));
      loadStats();
      loadNotifications();
    }
  };

  const handleCreateTask = async (newTask: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    due_date: string;
    assigned_to: string;
    attachments?: Array<{
      file_name: string;
      file_type: string;
      file_size: number;
      file_base64: string;
    }>;
  }): Promise<boolean> => {
    const { attachments, ...taskData } = newTask;
    const res = await api.createTask(taskData);
    if (res.success && res.data) {
      const createdTask = res.data;
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          await api.uploadAttachment(createdTask.id, att);
        }
      }
      loadTasks();
      loadStats();
      loadTeam();
      loadNotifications();
      return true;
    }
    return false;
  };

  const handleDeleteTask = async (taskId: string) => {
    const res = await api.deleteTask(taskId);
    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      loadStats();
      loadTeam();
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        supabaseStatus={supabaseStatus}
        subscription={subscription}
        notifications={notifications}
        unreadCount={unreadCount}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenBillingModal={() => setIsBillingModalOpen(true)}
        onOpenTeamModal={() => setIsTeamModalOpen(true)}
        onOpenApiExplorer={() => setIsApiExplorerOpen(true)}
        onOpenEmailAlertsModal={() => setIsEmailAlertsModalOpen(true)}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllRead}
        onRefresh={refreshAll}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskBoard
          tasks={tasks}
          stats={stats}
          loading={loadingTasks}
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          overdueOnly={overdueOnly}
          onSearchChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
          onOverdueToggle={() => setOverdueOnly(!overdueOnly)}
          onOpenCreateTask={() => setIsCreateTaskModalOpen(true)}
          onOpenComments={(task) => {
            setCommentTaskTab('comments');
            setCommentTask(task);
          }}
          onOpenAttachments={(task) => {
            setCommentTaskTab('attachments');
            setCommentTask(task);
          }}
          onStatusChange={handleStatusChange}
          onDeleteTask={handleDeleteTask}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TaskFlow Operations &amp; Task Engine • Connected to Supabase &amp; Paystack</span>
          <span className="font-mono text-[11px] text-slate-600">REST API v1 active on port 3000</span>
        </div>
      </footer>

      {/* Modals */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        status={supabaseStatus}
        onRefreshStatus={loadSupabaseStatus}
      />

      <BillingModal
        isOpen={isBillingModalOpen}
        subscription={subscription}
        onClose={() => setIsBillingModalOpen(false)}
        onRefreshSubscription={loadSubscription}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        teamMembers={teamMembers}
        onClose={() => setIsTeamModalOpen(false)}
        onRefreshTeam={loadTeam}
      />

      <CreateTaskModal
        isOpen={isCreateTaskModalOpen}
        teamMembers={teamMembers}
        onClose={() => setIsCreateTaskModalOpen(false)}
        onCreateTask={handleCreateTask}
      />

      <TaskCommentsModal
        task={commentTask}
        isOpen={!!commentTask}
        initialTab={commentTaskTab}
        onClose={() => setCommentTask(null)}
        onAttachmentChange={loadTasks}
      />

      <ApiExplorer
        isOpen={isApiExplorerOpen}
        onClose={() => setIsApiExplorerOpen(false)}
      />

      <EmailAlertsModal
        isOpen={isEmailAlertsModalOpen}
        onClose={() => setIsEmailAlertsModalOpen(false)}
        currentUser={currentUser}
        onAlertSent={loadNotifications}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        initialMode={authModalMode}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}
