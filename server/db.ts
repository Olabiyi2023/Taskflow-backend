import crypto from 'crypto';
import { getSupabaseClient, ensureStorageBucket } from './supabase.js';
import {
  Workspace,
  User,
  NotificationPreferences,
  TeamMember,
  Task,
  TaskComment,
  TaskAttachment,
  Notification,
  Subscription,
  PaymentTransaction,
  TaskStatus,
  TaskPriority,
  TeamRole,
  NotificationType,
} from './types.js';

// Default pre-seeded in-memory store matching the specification
const DEFAULT_WORKSPACE_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
const DEFAULT_USER_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

const memoryStore = {
  workspaces: new Map<string, Workspace>(),
  users: new Map<string, User>(),
  preferences: new Map<string, NotificationPreferences>(),
  teamMembers: new Map<string, TeamMember>(),
  tasks: new Map<string, Task>(),
  taskComments: new Map<string, TaskComment>(),
  taskAttachments: new Map<string, TaskAttachment>(),
  notifications: new Map<string, Notification>(),
  subscriptions: new Map<string, Subscription>(),
  paymentTransactions: new Map<string, PaymentTransaction>(),
};

// Seed default data if memory store is empty
function seedDefaultData() {
  if (memoryStore.workspaces.size > 0) return;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const defaultWorkspace: Workspace = {
    id: DEFAULT_WORKSPACE_ID,
    name: 'Acme West Africa Operations',
    slug: 'acme-west-africa',
    company_size: '11-50 employees',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  memoryStore.workspaces.set(defaultWorkspace.id, defaultWorkspace);

  const defaultUser: User = {
    id: DEFAULT_USER_ID,
    workspace_id: DEFAULT_WORKSPACE_ID,
    email: 'sarah.adebayo@acmewestafrica.com',
    password_hash: crypto.createHash('sha256').update('SecurePassword123!').digest('hex'),
    name: 'Sarah Adebayo',
    role: 'Business Owner',
    avatar_color: '#4F46E5',
    onboarding_completed: true,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  memoryStore.users.set(defaultUser.id, defaultUser);

  const defaultPrefs: NotificationPreferences = {
    user_id: DEFAULT_USER_ID,
    task_assignments: true,
    comments: true,
    status_changes: true,
    upcoming_deadlines: true,
    overdue_tasks: true,
    updated_at: now.toISOString(),
  };
  memoryStore.preferences.set(DEFAULT_USER_ID, defaultPrefs);

  const MEMBER_1_ID = 'c1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c51';
  const MEMBER_2_ID = 'c1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c52';
  const MEMBER_3_ID = 'c1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c53';
  const MEMBER_4_ID = 'c1a2b3c4-d5e6-4a7b-8c9d-0e1f2a3b4c54';

  const TASK_1_ID = 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c61';
  const TASK_2_ID = 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c62';
  const TASK_3_ID = 'd1a2b3c4-e5f6-4a7b-8c9d-0e1f2a3b4c63';

  const COMMENT_1_ID = 'e1a2b3c4-f5a6-4b7c-8d9e-0f1a2b3c4d71';
  const SUB_1_ID = 'f1a2b3c4-05a6-4b7c-8d9e-0f1a2b3c4d81';
  const NOTIF_1_ID = 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c91';
  const NOTIF_2_ID = 'a2b3c4d5-e6f7-4a8b-9c0d-1e2f3a4b5c92';

  const initialMembers: TeamMember[] = [
    {
      id: MEMBER_1_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      user_id: DEFAULT_USER_ID,
      name: 'Sarah Adebayo',
      email: 'sarah.adebayo@acmewestafrica.com',
      phone: '+234 802 123 4567',
      role: 'Business Owner',
      status: 'Active',
      avatar_color: '#4F46E5',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: MEMBER_2_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: 'Tunde Bakare',
      email: 'tunde.bakare@acmewestafrica.com',
      phone: '+234 803 234 5678',
      role: 'Developer',
      status: 'Active',
      avatar_color: '#10B981',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: MEMBER_3_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: 'Fatima Bello',
      email: 'fatima.bello@acmewestafrica.com',
      phone: '+234 805 345 6789',
      role: 'Operations Specialist',
      status: 'Active',
      avatar_color: '#EC4899',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: MEMBER_4_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      name: 'Chinedu Eze',
      email: 'chinedu.eze@acmewestafrica.com',
      phone: '+234 809 456 7890',
      role: 'QA Specialist',
      status: 'Active',
      avatar_color: '#F59E0B',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  initialMembers.forEach((m) => memoryStore.teamMembers.set(m.id, m));

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeek = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const initialTasks: Task[] = [
    {
      id: TASK_1_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      title: 'Deploy v2.4 Release to Cloud Run',
      description: 'Coordinate zero-downtime deployment for the enterprise tier.',
      status: 'In Progress',
      priority: 'Urgent',
      due_date: yesterday,
      assigned_to: MEMBER_2_ID,
      created_by: DEFAULT_USER_ID,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: TASK_2_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      title: 'Audit Supabase Row Level Security Rules',
      description: 'Review access policies across workspaces and ensure multi-tenant barrier.',
      status: 'Pending',
      priority: 'High',
      due_date: nextWeek,
      assigned_to: MEMBER_2_ID,
      created_by: DEFAULT_USER_ID,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: TASK_3_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      title: 'Setup Paystack Webhook Signing Verification',
      description: 'Implement HMAC-SHA512 header validation for recurring billing events.',
      status: 'Completed',
      priority: 'Medium',
      due_date: twoWeeks,
      assigned_to: MEMBER_3_ID,
      completed_at: now.toISOString(),
      created_by: DEFAULT_USER_ID,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];

  initialTasks.forEach((t) => memoryStore.tasks.set(t.id, t));

  const initialComments: TaskComment[] = [
    {
      id: COMMENT_1_ID,
      task_id: TASK_1_ID,
      author_id: DEFAULT_USER_ID,
      author_name: 'Tunde Bakare',
      author_role: 'Developer',
      author_avatar_color: '#10B981',
      content: 'Staging smoke tests are green. Ready for production rollout.',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
  ];
  initialComments.forEach((c) => memoryStore.taskComments.set(c.id, c));

  const initialAttachments: TaskAttachment[] = [
    {
      id: 'att-11111111-2222-3333-4444-555555555551',
      task_id: TASK_1_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      file_name: 'Cloud_Run_Rollout_Architecture.pdf',
      file_size: 245760,
      file_type: 'application/pdf',
      storage_path: `${DEFAULT_WORKSPACE_ID}/${TASK_1_ID}/Cloud_Run_Rollout_Architecture.pdf`,
      public_url: `/api/v1/tasks/${TASK_1_ID}/attachments/att-11111111-2222-3333-4444-555555555551/download`,
      file_base64: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjE5OQolJUVPRg==',
      uploaded_by: DEFAULT_USER_ID,
      uploader_name: 'Sarah Adebayo',
      created_at: now.toISOString(),
    },
    {
      id: 'att-11111111-2222-3333-4444-555555555552',
      task_id: TASK_1_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      file_name: 'Pre_Deployment_Verification.png',
      file_size: 112640,
      file_type: 'image/png',
      storage_path: `${DEFAULT_WORKSPACE_ID}/${TASK_1_ID}/Pre_Deployment_Verification.png`,
      public_url: `/api/v1/tasks/${TASK_1_ID}/attachments/att-11111111-2222-3333-4444-555555555552/download`,
      file_base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9Qz0AEYBxVSF+FAAhKDveksOjuAAAAAElFTkSuQmCC',
      uploaded_by: DEFAULT_USER_ID,
      uploader_name: 'Tunde Bakare',
      created_at: now.toISOString(),
    },
  ];
  initialAttachments.forEach((a) => memoryStore.taskAttachments.set(a.id, a));

  const initialSubscription: Subscription = {
    id: SUB_1_ID,
    workspace_id: DEFAULT_WORKSPACE_ID,
    plan: 'monthly',
    plan_name: 'Pro Monthly Plan',
    amount: 12500,
    currency: 'NGN',
    status: 'trialing',
    trial_start: now.toISOString(),
    trial_end: trialEnd.toISOString(),
    subscription_start: null,
    subscription_end: null,
    auto_renew: true,
    payment_method_last4: '4081',
    payment_method_brand: 'Visa',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  memoryStore.subscriptions.set(initialSubscription.id, initialSubscription);

  const initialNotifications: Notification[] = [
    {
      id: NOTIF_1_ID,
      user_id: DEFAULT_USER_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      type: 'task_assigned',
      title: 'New Task Assignment',
      message: 'You have been assigned to "Deploy v2.4 Release to Cloud Run"',
      is_read: false,
      task_id: TASK_1_ID,
      created_at: now.toISOString(),
    },
    {
      id: NOTIF_2_ID,
      user_id: DEFAULT_USER_ID,
      workspace_id: DEFAULT_WORKSPACE_ID,
      type: 'task_overdue',
      title: 'Task Overdue Warning',
      message: 'Task "Deploy v2.4 Release to Cloud Run" has passed its deadline.',
      is_read: false,
      task_id: TASK_1_ID,
      created_at: now.toISOString(),
    },
  ];
  initialNotifications.forEach((n) => memoryStore.notifications.set(n.id, n));
}

seedDefaultData();

export async function syncDefaultDataToSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await ensureStorageBucket();

    // Check if workspace exists
    const { data: existingWorkspaces } = await supabase.from('workspaces').select('id').limit(1);
    if (existingWorkspaces && existingWorkspaces.length > 0) {
      console.log('[Supabase] Database already contains records, skipping seed.');
      return;
    }

    console.log('[Supabase] Initializing default seed data in Supabase...');

    // 1. Insert Workspace
    const defaultWorkspace = memoryStore.workspaces.get(DEFAULT_WORKSPACE_ID);
    if (defaultWorkspace) {
      await supabase.from('workspaces').upsert(defaultWorkspace);
    }

    // 2. Insert User
    const defaultUser = memoryStore.users.get(DEFAULT_USER_ID);
    if (defaultUser) {
      await supabase.from('users').upsert(defaultUser);
    }

    // 3. Insert Notification Preferences
    const defaultPrefs = memoryStore.preferences.get(DEFAULT_USER_ID);
    if (defaultPrefs) {
      await supabase.from('notification_preferences').upsert(defaultPrefs);
    }

    // 4. Insert Team Members
    const teamMembers = Array.from(memoryStore.teamMembers.values());
    if (teamMembers.length > 0) {
      const sanitizedMembers = teamMembers.map(({ active_tasks_count, ...rest }) => rest);
      await supabase.from('team_members').upsert(sanitizedMembers);
    }

    // 5. Insert Tasks
    const tasks = Array.from(memoryStore.tasks.values());
    if (tasks.length > 0) {
      const sanitizedTasks = tasks.map(({ is_overdue, assignee, ...rest }) => rest);
      await supabase.from('tasks').upsert(sanitizedTasks);
    }

    // 6. Insert Task Comments
    const comments = Array.from(memoryStore.taskComments.values());
    if (comments.length > 0) {
      const sanitizedComments = comments.map(({ author_name, author_role, author_avatar_color, ...rest }) => rest);
      await supabase.from('task_comments').upsert(sanitizedComments);
    }

    // 7. Insert Subscriptions
    const subscriptions = Array.from(memoryStore.subscriptions.values());
    if (subscriptions.length > 0) {
      await supabase.from('subscriptions').upsert(subscriptions);
    }

    // 8. Insert Notifications
    const notifications = Array.from(memoryStore.notifications.values());
    if (notifications.length > 0) {
      await supabase.from('notifications').upsert(notifications);
    }

    console.log('[Supabase] Default seed successfully synchronized with Supabase!');
  } catch (err) {
    console.error('[Supabase] Error during default seed synchronization:', err);
  }
}

export const db = {
  // Users
  async findUserByEmail(email: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();
        if (!error && data) return data as User;
      } catch (err) {
        console.warn('[DB] Supabase query fallback to memory for findUserByEmail:', err);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return null;
  },

  async findUserById(id: string): Promise<User | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
        if (!error && data) return data as User;
      } catch (err) {
        console.warn('[DB] Supabase query fallback to memory for findUserById:', err);
      }
    }
    return memoryStore.users.get(id) || null;
  },

  async createUser(user: Partial<User> & { email: string; workspace_id: string }): Promise<User> {
    const id = user.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newUser: User = {
      id,
      workspace_id: user.workspace_id,
      email: user.email.toLowerCase(),
      password_hash: user.password_hash || '',
      name: user.name || 'User',
      role: user.role || 'Business Owner',
      avatar_color: user.avatar_color || '#4F46E5',
      onboarding_completed: user.onboarding_completed || false,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').insert(newUser).select().single();
        if (!error && data) return data as User;
      } catch (err) {
        console.warn('[DB] Supabase insert fallback for createUser:', err);
      }
    }

    memoryStore.users.set(id, newUser);
    return newUser;
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const existing = await this.findUserById(id);
    if (!existing) return null;
    const updated: User = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as User;
      } catch (err) {
        console.warn('[DB] Supabase update fallback for updateUser:', err);
      }
    }

    memoryStore.users.set(id, updated);
    return updated;
  },

  // Workspaces
  async findWorkspaceById(id: string): Promise<Workspace | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('workspaces').select('*').eq('id', id).single();
        if (!error && data) return data as Workspace;
      } catch (err) {
        console.warn('[DB] Supabase query fallback for findWorkspaceById:', err);
      }
    }
    return memoryStore.workspaces.get(id) || null;
  },

  async createWorkspace(workspace: Partial<Workspace>): Promise<Workspace> {
    const id = workspace.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newWs: Workspace = {
      id,
      name: workspace.name || 'My Workspace',
      slug: (workspace.name || 'workspace')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .concat('-', Math.floor(Math.random() * 1000).toString()),
      company_size: workspace.company_size || '1-10 employees',
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('workspaces').insert(newWs).select().single();
        if (!error && data) return data as Workspace;
      } catch (err) {
        console.warn('[DB] Supabase insert fallback for createWorkspace:', err);
      }
    }

    memoryStore.workspaces.set(id, newWs);
    return newWs;
  },

  async updateWorkspace(id: string, updates: Partial<Workspace>): Promise<Workspace | null> {
    const existing = await this.findWorkspaceById(id);
    if (!existing) return null;
    const updated: Workspace = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as Workspace;
      } catch (err) {
        console.warn('[DB] Supabase update fallback for updateWorkspace:', err);
      }
    }

    memoryStore.workspaces.set(id, updated);
    return updated;
  },

  // Team Members
  async getRawTeamMembers(workspaceId: string): Promise<TeamMember[]> {
    const supabase = getSupabaseClient();
    let members: TeamMember[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });
        if (!error && data) members = data as TeamMember[];
      } catch (err) {
        console.warn('[DB] Supabase query fallback for getRawTeamMembers:', err);
      }
    }

    if (members.length === 0) {
      members = Array.from(memoryStore.teamMembers.values()).filter(
        (m) => m.workspace_id === workspaceId
      );
    }
    return members;
  },

  async listTeamMembers(workspaceId: string): Promise<TeamMember[]> {
    const members = await this.getRawTeamMembers(workspaceId);
    const tasks = await this.getRawTasks(workspaceId);

    return members.map((m) => {
      const activeCount = tasks.filter(
        (t) => t.assigned_to === m.id && t.status !== 'Completed'
      ).length;
      return {
        ...m,
        active_tasks_count: activeCount,
      };
    });
  },

  async findTeamMemberById(id: string): Promise<TeamMember | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data as TeamMember;
      } catch (err) {
        console.warn('[DB] Supabase fallback for findTeamMemberById:', err);
      }
    }
    return memoryStore.teamMembers.get(id) || null;
  },

  async createTeamMember(member: Partial<TeamMember> & { workspace_id: string; name: string; email: string }): Promise<TeamMember> {
    const id = member.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const colors = ['#4F46E5', '#10B981', '#EC4899', '#F59E0B', '#06B6D4', '#8B5CF6'];
    const newMember: TeamMember = {
      id,
      workspace_id: member.workspace_id,
      user_id: member.user_id || null,
      name: member.name,
      email: member.email.toLowerCase(),
      phone: member.phone || null,
      role: member.role || 'Developer',
      status: member.status || 'Active',
      avatar_color: member.avatar_color || colors[Math.floor(Math.random() * colors.length)],
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .insert(newMember)
          .select()
          .single();
        if (!error && data) return data as TeamMember;
      } catch (err) {
        console.warn('[DB] Supabase insert fallback for createTeamMember:', err);
      }
    }

    memoryStore.teamMembers.set(id, newMember);
    return newMember;
  },

  async updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<TeamMember | null> {
    const existing = await this.findTeamMemberById(id);
    if (!existing) return null;
    const updated: TeamMember = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return data as TeamMember;
      } catch (err) {
        console.warn('[DB] Supabase update fallback for updateTeamMember:', err);
      }
    }

    memoryStore.teamMembers.set(id, updated);
    return updated;
  },

  async deleteTeamMember(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('team_members').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('[DB] Supabase delete fallback for deleteTeamMember:', err);
      }
    }
    return memoryStore.teamMembers.delete(id);
  },

  // Tasks
  async getRawTasks(workspaceId: string): Promise<Task[]> {
    const supabase = getSupabaseClient();
    let tasks: Task[] = [];
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
        if (!error && data) tasks = data as Task[];
      } catch (err) {
        console.warn('[DB] Supabase query fallback for getRawTasks:', err);
      }
    }

    if (tasks.length === 0) {
      tasks = Array.from(memoryStore.tasks.values()).filter(
        (t) => t.workspace_id === workspaceId
      );
    }
    return tasks;
  },

  async listAllTasks(workspaceId: string): Promise<Task[]> {
    const tasks = await this.getRawTasks(workspaceId);
    const teamMembers = await this.getRawTeamMembers(workspaceId);
    const attachments = await this.listAttachmentsByWorkspace(workspaceId);
    const memberMap = new Map<string, TeamMember>(teamMembers.map((m) => [m.id, m]));
    const attachmentCounts = new Map<string, number>();
    attachments.forEach((a) => {
      attachmentCounts.set(a.task_id, (attachmentCounts.get(a.task_id) || 0) + 1);
    });
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.map((t) => {
      const isOverdue = t.status !== 'Completed' && t.due_date < todayStr;
      const assignee: TeamMember | undefined = t.assigned_to ? memberMap.get(t.assigned_to) : undefined;
      return {
        ...t,
        is_overdue: isOverdue,
        attachments_count: attachmentCounts.get(t.id) || 0,
        assignee: assignee
          ? {
              id: assignee.id,
              name: assignee.name,
              role: assignee.role,
              avatar_color: assignee.avatar_color,
            }
          : null,
      };
    });
  },

  async findTaskById(id: string): Promise<Task | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
        if (!error && data) {
          const task = data as Task;
          const todayStr = new Date().toISOString().split('T')[0];
          task.is_overdue = task.status !== 'Completed' && task.due_date < todayStr;
          const attachments = await this.listTaskAttachments(id);
          task.attachments_count = attachments.length;
          if (task.assigned_to) {
            const assignee = await this.findTeamMemberById(task.assigned_to);
            if (assignee) {
              task.assignee = {
                id: assignee.id,
                name: assignee.name,
                role: assignee.role,
                avatar_color: assignee.avatar_color,
              };
            }
          }
          return task;
        }
      } catch (err) {
        console.warn('[DB] Supabase fallback for findTaskById:', err);
      }
    }

    const task = memoryStore.tasks.get(id);
    if (!task) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const isOverdue = task.status !== 'Completed' && task.due_date < todayStr;
    const assignee = task.assigned_to ? memoryStore.teamMembers.get(task.assigned_to) : null;
    const attachments = await this.listTaskAttachments(id);
    return {
      ...task,
      is_overdue: isOverdue,
      attachments_count: attachments.length,
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            role: assignee.role,
            avatar_color: assignee.avatar_color,
          }
        : null,
    };
  },

  async createTask(task: Partial<Task> & { workspace_id: string; title: string; due_date: string }): Promise<Task> {
    const id = task.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newTask: Task = {
      id,
      workspace_id: task.workspace_id,
      title: task.title,
      description: task.description || null,
      status: task.status || 'Pending',
      priority: task.priority || 'Medium',
      due_date: task.due_date,
      assigned_to: task.assigned_to || null,
      created_by: task.created_by || null,
      completed_at: task.status === 'Completed' ? now : null,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('tasks').insert(newTask).select().single();
        if (!error && data) return await this.findTaskById(id) || (data as Task);
      } catch (err) {
        console.warn('[DB] Supabase insert fallback for createTask:', err);
      }
    }

    memoryStore.tasks.set(id, newTask);
    return (await this.findTaskById(id))!;
  },

  async updateTaskStatus(id: string, status: TaskStatus): Promise<Task | null> {
    const existing = await this.findTaskById(id);
    if (!existing) return null;
    const completedAt = status === 'Completed' ? new Date().toISOString() : null;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({
            status,
            completed_at: completedAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        if (!error) return await this.findTaskById(id);
      } catch (err) {
        console.warn('[DB] Supabase update status fallback:', err);
      }
    }

    const updated: Task = {
      ...existing,
      status,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    };
    memoryStore.tasks.set(id, updated);
    return updated;
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = await this.findTaskById(id);
    if (!existing) return null;

    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.status === 'Completed' && !existing.completed_at
        ? { completed_at: new Date().toISOString() }
        : {}),
      ...(updates.status && updates.status !== 'Completed' ? { completed_at: null } : {}),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('tasks').update(updatedData).eq('id', id);
        if (!error) return await this.findTaskById(id);
      } catch (err) {
        console.warn('[DB] Supabase updateTask fallback:', err);
      }
    }

    const merged = { ...existing, ...updatedData };
    memoryStore.tasks.set(id, merged);
    return await this.findTaskById(id);
  },

  async deleteTask(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('[DB] Supabase delete fallback for deleteTask:', err);
      }
    }
    return memoryStore.tasks.delete(id);
  },

  // Task Comments
  async listComments(taskId: string): Promise<TaskComment[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true });
        if (!error && data) return data as TaskComment[];
      } catch (err) {
        console.warn('[DB] Supabase comments query fallback:', err);
      }
    }
    return Array.from(memoryStore.taskComments.values())
      .filter((c) => c.task_id === taskId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async createComment(comment: {
    task_id: string;
    author_id: string;
    author_name: string;
    author_role: string;
    author_avatar_color: string;
    content: string;
  }): Promise<TaskComment> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id,
      task_id: comment.task_id,
      author_id: comment.author_id,
      author_name: comment.author_name,
      author_role: comment.author_role,
      author_avatar_color: comment.author_avatar_color,
      content: comment.content,
      created_at: now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_comments')
          .insert(newComment)
          .select()
          .single();
        if (!error && data) return data as TaskComment;
      } catch (err) {
        console.warn('[DB] Supabase comment insert fallback:', err);
      }
    }

    memoryStore.taskComments.set(id, newComment);
    return newComment;
  },

  async deleteComment(commentId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
        if (!error) return true;
      } catch (err) {
        console.warn('[DB] Supabase comment delete fallback:', err);
      }
    }
    return memoryStore.taskComments.delete(commentId);
  },

  // Task Attachments
  async listTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false });
        if (!error && data) return data as TaskAttachment[];
      } catch (err) {
        console.warn('[DB] Supabase attachments query fallback:', err);
      }
    }
    return Array.from(memoryStore.taskAttachments.values())
      .filter((a) => a.task_id === taskId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async listAttachmentsByWorkspace(workspaceId: string): Promise<TaskAttachment[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('workspace_id', workspaceId);
        if (!error && data) return data as TaskAttachment[];
      } catch (err) {
        console.warn('[DB] Supabase workspace attachments fallback:', err);
      }
    }
    return Array.from(memoryStore.taskAttachments.values()).filter(
      (a) => a.workspace_id === workspaceId
    );
  },

  async findAttachmentById(id: string): Promise<TaskAttachment | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('task_attachments')
          .select('*')
          .eq('id', id)
          .single();
        if (!error && data) return data as TaskAttachment;
      } catch (err) {
        console.warn('[DB] Supabase findAttachmentById fallback:', err);
      }
    }
    return memoryStore.taskAttachments.get(id) || null;
  },

  async createTaskAttachment(att: {
    id?: string;
    task_id: string;
    workspace_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    storage_path: string;
    public_url: string;
    file_base64?: string;
    uploaded_by?: string | null;
    uploader_name?: string | null;
  }): Promise<TaskAttachment> {
    const id = att.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const newAttachment: TaskAttachment = {
      id,
      task_id: att.task_id,
      workspace_id: att.workspace_id,
      file_name: att.file_name,
      file_size: att.file_size,
      file_type: att.file_type,
      storage_path: att.storage_path,
      public_url: att.public_url,
      file_base64: att.file_base64,
      uploaded_by: att.uploaded_by || null,
      uploader_name: att.uploader_name || null,
      created_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        // Exclude file_base64 from database columns
        const { file_base64, ...dbRecord } = newAttachment;
        const { data, error } = await supabase
          .from('task_attachments')
          .insert(dbRecord)
          .select()
          .single();
        if (!error && data) {
          memoryStore.taskAttachments.set(id, newAttachment);
          return data as TaskAttachment;
        }
      } catch (err) {
        console.warn('[DB] Supabase attachment insert fallback:', err);
      }
    }

    memoryStore.taskAttachments.set(id, newAttachment);
    return newAttachment;
  },

  async deleteTaskAttachment(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('task_attachments').delete().eq('id', id);
        if (!error) {
          memoryStore.taskAttachments.delete(id);
          return true;
        }
      } catch (err) {
        console.warn('[DB] Supabase attachment delete fallback:', err);
      }
    }
    return memoryStore.taskAttachments.delete(id);
  },

  // Notifications
  async listNotifications(userId: string): Promise<Notification[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data) return data as Notification[];
      } catch (err) {
        console.warn('[DB] Supabase notifications fallback:', err);
      }
    }
    return Array.from(memoryStore.notifications.values())
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const list = await this.listNotifications(userId);
    return list.filter((n) => !n.is_read).length;
  },

  async markNotificationRead(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.warn('[DB] Supabase mark read fallback:', err);
      }
    }
    const item = memoryStore.notifications.get(id);
    if (item) {
      item.is_read = true;
      return true;
    }
    return false;
  },

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', userId);
        if (!error) return true;
      } catch (err) {
        console.warn('[DB] Supabase mark all read fallback:', err);
      }
    }
    for (const item of memoryStore.notifications.values()) {
      if (item.user_id === userId) {
        item.is_read = true;
      }
    }
    return true;
  },

  async createNotification(notif: {
    user_id: string;
    workspace_id: string;
    type: NotificationType;
    title: string;
    message: string;
    task_id?: string | null;
    link?: string | null;
  }): Promise<Notification> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const item: Notification = {
      id,
      user_id: notif.user_id,
      workspace_id: notif.workspace_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      is_read: false,
      task_id: notif.task_id || null,
      link: notif.link || null,
      created_at: now,
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('notifications').insert(item).select().single();
        if (!error && data) return data as Notification;
      } catch (err) {
        console.warn('[DB] Supabase createNotification fallback:', err);
      }
    }

    memoryStore.notifications.set(id, item);
    return item;
  },

  // Notification Preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();
        if (!error && data) return data as NotificationPreferences;
      } catch (err) {
        console.warn('[DB] Supabase notification preferences fallback:', err);
      }
    }
    const existing = memoryStore.preferences.get(userId);
    if (existing) return existing;

    const defaultPrefs: NotificationPreferences = {
      user_id: userId,
      task_assignments: true,
      comments: true,
      status_changes: true,
      upcoming_deadlines: true,
      overdue_tasks: true,
      updated_at: new Date().toISOString(),
    };
    memoryStore.preferences.set(userId, defaultPrefs);
    return defaultPrefs;
  },

  async updateNotificationPreferences(
    userId: string,
    updates: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    const updated: NotificationPreferences = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .upsert(updated)
          .select()
          .single();
        if (!error && data) return data as NotificationPreferences;
      } catch (err) {
        console.warn('[DB] Supabase preferences upsert fallback:', err);
      }
    }

    memoryStore.preferences.set(userId, updated);
    return updated;
  },

  // Subscriptions & Paystack
  async getSubscriptionByWorkspace(workspaceId: string): Promise<Subscription | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) {
          return this.decorateSubscription(data as Subscription);
        }
      } catch (err) {
        console.warn('[DB] Supabase subscription query fallback:', err);
      }
    }

    for (const sub of memoryStore.subscriptions.values()) {
      if (sub.workspace_id === workspaceId) {
        return this.decorateSubscription(sub);
      }
    }
    return null;
  },

  decorateSubscription(sub: Subscription): Subscription {
    const now = new Date();
    const trialEnd = new Date(sub.trial_end);
    const diffMs = trialEnd.getTime() - now.getTime();
    const trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const isValid =
      sub.status === 'active' ||
      (sub.status === 'trialing' && diffMs > 0);

    return {
      ...sub,
      trial_days_remaining: trialDaysRemaining,
      is_valid: isValid,
    };
  },

  async createSubscription(sub: Partial<Subscription> & { workspace_id: string }): Promise<Subscription> {
    const id = sub.id || crypto.randomUUID();
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const newSub: Subscription = {
      id,
      workspace_id: sub.workspace_id,
      plan: sub.plan || 'monthly',
      plan_name: sub.plan_name || 'Pro Monthly Plan',
      amount: sub.amount || 12500,
      currency: sub.currency || 'NGN',
      status: sub.status || 'trialing',
      trial_start: sub.trial_start || now.toISOString(),
      trial_end: sub.trial_end || trialEnd.toISOString(),
      subscription_start: sub.subscription_start || null,
      subscription_end: sub.subscription_end || null,
      auto_renew: sub.auto_renew ?? true,
      paystack_customer_code: sub.paystack_customer_code || null,
      paystack_subscription_code: sub.paystack_subscription_code || null,
      paystack_authorization_code: sub.paystack_authorization_code || null,
      payment_method_last4: sub.payment_method_last4 || null,
      payment_method_brand: sub.payment_method_brand || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('subscriptions').insert(newSub).select().single();
        if (!error && data) return this.decorateSubscription(data as Subscription);
      } catch (err) {
        console.warn('[DB] Supabase subscription insert fallback:', err);
      }
    }

    memoryStore.subscriptions.set(id, newSub);
    return this.decorateSubscription(newSub);
  },

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    let existing: Subscription | null = null;
    for (const s of memoryStore.subscriptions.values()) {
      if (s.id === id) existing = s;
    }

    const updatedData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .update(updatedData)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) return this.decorateSubscription(data as Subscription);
      } catch (err) {
        console.warn('[DB] Supabase updateSubscription fallback:', err);
      }
    }

    if (existing) {
      const merged: Subscription = { ...existing, ...updatedData };
      memoryStore.subscriptions.set(id, merged);
      return this.decorateSubscription(merged);
    }
    return null;
  },

  // Payment Transactions
  async recordPaymentTransaction(tx: {
    workspace_id: string;
    subscription_id?: string | null;
    reference: string;
    amount: number;
    currency?: string;
    status: 'success' | 'failed' | 'pending';
    channel?: string | null;
    gateway_response?: string | null;
    paystack_response_json?: any;
    paid_at?: string | null;
  }): Promise<PaymentTransaction> {
    const id = crypto.randomUUID();
    const item: PaymentTransaction = {
      id,
      workspace_id: tx.workspace_id,
      subscription_id: tx.subscription_id || null,
      reference: tx.reference,
      amount: tx.amount,
      currency: tx.currency || 'NGN',
      status: tx.status,
      channel: tx.channel || 'card',
      gateway_response: tx.gateway_response || 'Successful',
      paystack_response_json: tx.paystack_response_json || null,
      paid_at: tx.paid_at || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .insert(item)
          .select()
          .single();
        if (!error && data) return data as PaymentTransaction;
      } catch (err) {
        console.warn('[DB] Supabase payment transaction fallback:', err);
      }
    }

    memoryStore.paymentTransactions.set(id, item);
    return item;
  },

  async listPaymentTransactions(workspaceId: string): Promise<PaymentTransaction[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('payment_transactions')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
        if (!error && data) return data as PaymentTransaction[];
      } catch (err) {
        console.warn('[DB] Supabase payment transactions list fallback:', err);
      }
    }
    return Array.from(memoryStore.paymentTransactions.values())
      .filter((t) => t.workspace_id === workspaceId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
};
