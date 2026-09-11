export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TeamRole =
  | 'Business Owner'
  | 'Project Coordinator'
  | 'Team Lead'
  | 'Developer'
  | 'Designer'
  | 'Operations Specialist'
  | 'QA Specialist';
export type TeamMemberStatus = 'Active' | 'Inactive';
export type NotificationType =
  | 'task_assigned'
  | 'task_status_changed'
  | 'task_comment'
  | 'task_deadline_approaching'
  | 'task_overdue'
  | 'subscription_trial_warning';
export type SubscriptionStatus = 'trialing' | 'active' | 'expired' | 'cancelled';
export type SubscriptionPlan = 'monthly' | 'annual';

export interface User {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  workspace_id: string;
  workspace_name?: string;
  avatar_color: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to?: string | null;
  created_by?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  is_overdue?: boolean;
  attachments_count?: number;
  assignee?: {
    id: string;
    name: string;
    role: TeamRole;
    avatar_color: string;
  } | null;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  workspace_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  public_url: string;
  uploaded_by?: string | null;
  uploader_name?: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar_color: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  workspace_id: string;
  user_id?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  role: TeamRole;
  status: TeamMemberStatus;
  avatar_color: string;
  created_at: string;
  updated_at: string;
  active_tasks_count?: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  workspace_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  task_id?: string | null;
  link?: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  teamMembersCount: number;
  completionRate: number;
}

export interface SubscriptionInfo {
  id: string;
  plan: SubscriptionPlan;
  plan_name: string;
  amount: number;
  currency: string;
  status: SubscriptionStatus;
  trial_start: string;
  trial_end: string;
  subscription_start?: string | null;
  subscription_end?: string | null;
  auto_renew: boolean;
  trial_days_remaining?: number;
  is_valid?: boolean;
  payment_method_last4?: string | null;
  payment_method_brand?: string | null;
}

export interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  url?: string;
  tablesStatus?: Record<string, boolean>;
  message: string;
}

export interface PaymentTransaction {
  id: string;
  workspace_id: string;
  subscription_id?: string | null;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  channel?: string | null;
  gateway_response?: string | null;
  paystack_response_json?: any;
  paid_at?: string | null;
  created_at: string;
}

export interface EmailConfig {
  configured: boolean;
  activeProvider: 'resend' | 'sendgrid' | 'simulated';
  hasResendKey: boolean;
  hasSendGridKey: boolean;
  fromEmail: string;
  appUrl: string;
}

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  type: 'task_assigned' | 'deadline_approaching' | 'task_overdue' | 'test';
  to: string;
  subject: string;
  provider: 'resend' | 'sendgrid' | 'simulated';
  status: 'delivered' | 'simulated' | 'failed';
  taskId?: string;
  error?: string;
  previewText?: string;
}

export interface NotificationPreferences {
  user_id: string;
  task_assignments: boolean;
  comments: boolean;
  status_changes: boolean;
  upcoming_deadlines: boolean;
  overdue_tasks: boolean;
  updated_at: string;
}
