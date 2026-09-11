import {
  User,
  Task,
  TaskComment,
  TaskAttachment,
  TeamMember,
  NotificationItem,
  DashboardStats,
  SubscriptionInfo,
  SupabaseStatus,
  PaymentTransaction,
  EmailConfig,
  EmailLogEntry,
  NotificationPreferences,
} from '../types';

const API_BASE = '/api/v1';

let authToken = localStorage.getItem('taskflow_token') || '';

export function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('taskflow_token', token);
  } else {
    localStorage.removeItem('taskflow_token');
  }
}

export function getAuthToken(): string {
  return authToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string; error?: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  } else {
    // Enable seamless demo preview mode
    headers['x-demo-user'] = 'true';
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.error(`API Error [${endpoint}]:`, err);
    return {
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message || 'Network request failed' },
    };
  }
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await request<{ user: User; tokens: { access_token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data?.tokens?.access_token) {
      setAuthToken(res.data.tokens.access_token);
    }
    return res;
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    workspace_name: string;
    company_size: string;
    role?: string;
  }) {
    const res = await request<{ user: User; tokens: { access_token: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.success && res.data?.tokens?.access_token) {
      setAuthToken(res.data.tokens.access_token);
    }
    return res;
  },

  async getMe() {
    return request<User>('/auth/me');
  },

  logout() {
    setAuthToken('');
  },

  hasAuthToken() {
    return !!getAuthToken();
  },

  // Dashboard Stats
  async getDashboardStats() {
    return request<DashboardStats>('/dashboard/stats');
  },

  // Tasks
  async getTasks(params?: {
    search?: string;
    status?: string;
    priority?: string;
    assigned_to?: string;
    is_overdue?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status && params.status !== 'All') searchParams.set('status', params.status);
    if (params?.priority && params.priority !== 'All') searchParams.set('priority', params.priority);
    if (params?.assigned_to && params.assigned_to !== 'All')
      searchParams.set('assigned_to', params.assigned_to);
    if (params?.is_overdue !== undefined)
      searchParams.set('is_overdue', String(params.is_overdue));

    const qs = searchParams.toString();
    return request<{ tasks: Task[]; pagination: any }>(`/tasks${qs ? `?${qs}` : ''}`);
  },

  async createTask(task: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    due_date: string;
    assigned_to?: string;
  }) {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTaskStatus(taskId: string, status: 'Pending' | 'In Progress' | 'Completed') {
    return request<Task>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async deleteTask(taskId: string) {
    return request<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // Comments
  async getComments(taskId: string) {
    return request<TaskComment[]>(`/tasks/${taskId}/comments`);
  },

  async postComment(taskId: string, content: string) {
    return request<TaskComment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },

  async deleteComment(taskId: string, commentId: string) {
    return request<void>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  },

  // Attachments (Supabase Storage)
  async getAttachments(taskId: string) {
    return request<TaskAttachment[]>(`/tasks/${taskId}/attachments`);
  },

  async uploadAttachment(
    taskId: string,
    payload: {
      file_name: string;
      file_type: string;
      file_size: number;
      file_base64: string;
    }
  ) {
    return request<TaskAttachment>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteAttachment(taskId: string, attachmentId: string) {
    return request<{ deleted: boolean; id: string }>(
      `/tasks/${taskId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
      }
    );
  },

  // Team
  async getTeam() {
    return request<TeamMember[]>('/team');
  },

  async addTeamMember(member: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
    status?: string;
  }) {
    return request<TeamMember>('/team', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  // Notifications
  async getNotifications() {
    return request<NotificationItem[]>('/notifications');
  },

  async getUnreadNotificationCount() {
    return request<{ unreadCount: number }>('/notifications/unread-count');
  },

  async markNotificationRead(id: string) {
    return request<void>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead() {
    return request<void>('/notifications/mark-all-read', {
      method: 'PATCH',
    });
  },

  async getEmailConfig() {
    return request<EmailConfig>('/notifications/email-config');
  },

  async getEmailLogs() {
    return request<EmailLogEntry[]>('/notifications/email-logs');
  },

  async sendTestEmail(email: string, type: 'task_assigned' | 'deadline_approaching' | 'task_overdue') {
    return request<{ success: boolean; provider: string; message: string }>('/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ email, type }),
    });
  },

  async triggerDeadlineAlerts() {
    return request<{
      overdue: { task: string; scannedAt: string; triggeredCount: number };
      approaching: { task: string; scannedAt: string; triggeredCount: number };
    }>('/notifications/trigger-deadline-alerts', {
      method: 'POST',
    });
  },

  async getNotificationPreferences() {
    return request<NotificationPreferences>('/notifications/preferences');
  },

  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>) {
    return request<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
  },

  // Billing & Paystack
  async getBillingConfig() {
    return request<{
      configured: boolean;
      publicKey: string | null;
      currency: string;
      amount: number;
      supportedChannels: string[];
    }>('/billing/config');
  },

  async getSubscription() {
    return request<SubscriptionInfo>('/billing/subscription');
  },

  async getPaymentTransactions() {
    return request<PaymentTransaction[]>('/billing/transactions');
  },

  async initializePaystack(amount = 12500, plan = 'monthly') {
    return request<{
      reference: string;
      access_code: string;
      authorization_url: string;
      simulated?: boolean;
    }>('/billing/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify({ amount, plan }),
    });
  },

  async verifyPaystack(reference: string) {
    return request<{
      status: string;
      subscription_end: string;
      payment_method_last4: string;
      payment_method_brand: string;
    }>('/billing/paystack/verify', {
      method: 'POST',
      body: JSON.stringify({ reference }),
    });
  },

  // System & Supabase
  async getSupabaseStatus() {
    return request<SupabaseStatus>('/system/supabase-status');
  },

  async getSupabaseSchema() {
    return request<{ sql: string; instructions: string[] }>('/system/supabase-schema');
  },

  async triggerCronScanners() {
    return request<any>('/system/cron/run-scanners', {
      method: 'POST',
    });
  },
};
