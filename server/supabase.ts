import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function isValidSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('your_') || trimmed.startsWith('MY_') || trimmed === '""' || trimmed === "''") {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function extractProjectRefFromKey(key?: string): string | null {
  if (!key) return null;
  try {
    const parts = key.split('.');
    if (parts.length >= 2) {
      const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      if (payload && typeof payload.ref === 'string' && /^[a-z0-9_-]+$/i.test(payload.ref)) {
        return payload.ref;
      }
    }
  } catch {
    // Ignore decoding failure
  }
  return null;
}

export function resolveSupabaseUrl(): string | null {
  const explicitUrl = process.env.SUPABASE_URL?.trim();
  if (isValidSupabaseUrl(explicitUrl)) {
    return explicitUrl!;
  }

  // Gracefully resolve from JWT token ref if SUPABASE_URL is missing or corrupted/encrypted
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();
  const ref = extractProjectRefFromKey(key);
  if (ref) {
    return `https://${ref}.supabase.co`;
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();

  if (!supabaseUrl || !supabaseKey || supabaseKey.startsWith('your_') || supabaseKey.startsWith('MY_')) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.warn('[Supabase] Could not initialize Supabase client (falling back to local memory store):', err);
      return null;
    }
  }

  return supabaseClient;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  )?.trim();
  return !!supabaseUrl && !!supabaseKey && !supabaseKey.startsWith('your_') && !supabaseKey.startsWith('MY_');
}

export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  connected: boolean;
  url?: string;
  tablesStatus?: Record<string, boolean>;
  message: string;
}> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return {
      configured: false,
      connected: false,
      message: 'Supabase URL or Key not set in environment variables. Falling back to local backend state repository.',
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: true,
      connected: false,
      url: resolveSupabaseUrl() || process.env.SUPABASE_URL,
      message: 'Client initialization failed.',
    };
  }

  const tables = [
    'workspaces',
    'users',
    'team_members',
    'tasks',
    'task_comments',
    'task_attachments',
    'notifications',
    'subscriptions',
    'payment_transactions',
  ];

  const tablesStatus: Record<string, boolean> = {};
  let anySuccess = false;

  for (const table of tables) {
    try {
      const { error } = await client.from(table).select('id').limit(1);
      tablesStatus[table] = !error;
      if (!error) anySuccess = true;
    } catch {
      tablesStatus[table] = false;
    }
  }

  return {
    configured: true,
    connected: anySuccess,
    url: resolveSupabaseUrl() || process.env.SUPABASE_URL,
    tablesStatus,
    message: anySuccess
      ? 'Successfully connected to Supabase.'
      : 'Connected to Supabase endpoint, but one or more tables are not yet created. Run the SQL schema in Supabase SQL Editor.',
  };
}

export const SUPABASE_SCHEMA_SQL = `-- TaskFlow Database Schema for Supabase (PostgreSQL)
-- Run this in your Supabase Project -> SQL Editor to initialize all tables and types

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
    CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role') THEN
    CREATE TYPE team_role AS ENUM (
      'Business Owner',
      'Project Coordinator',
      'Team Lead',
      'Developer',
      'Designer',
      'Operations Specialist',
      'QA Specialist'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_status') THEN
    CREATE TYPE team_member_status AS ENUM ('Active', 'Inactive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'task_assigned',
      'task_status_changed',
      'task_comment',
      'task_deadline_approaching',
      'task_overdue',
      'subscription_trial_warning'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'expired', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan') THEN
    CREATE TYPE subscription_plan AS ENUM ('monthly', 'annual');
  END IF;
END $$;

-- 2. Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  company_size VARCHAR(50) DEFAULT '1-10 employees',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role team_role NOT NULL DEFAULT 'Business Owner',
  avatar_color VARCHAR(20) DEFAULT '#4F46E5',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  task_assignments BOOLEAN DEFAULT TRUE,
  comments BOOLEAN DEFAULT TRUE,
  status_changes BOOLEAN DEFAULT TRUE,
  upcoming_deadlines BOOLEAN DEFAULT TRUE,
  overdue_tasks BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role team_role NOT NULL DEFAULT 'Developer',
  status team_member_status NOT NULL DEFAULT 'Active',
  avatar_color VARCHAR(20) DEFAULT '#4F46E5',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_workspace_member_email UNIQUE (workspace_id, email)
);

-- 6. Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'Pending',
  priority task_priority NOT NULL DEFAULT 'Medium',
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- 7. Task Comments
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  link VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 9. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'monthly',
  plan_name VARCHAR(100) NOT NULL DEFAULT 'Pro Monthly Plan',
  amount NUMERIC(12, 2) NOT NULL DEFAULT 12500.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'NGN',
  status subscription_status NOT NULL DEFAULT 'trialing',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  subscription_start TIMESTAMPTZ,
  subscription_end TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT TRUE,
  paystack_customer_code VARCHAR(100),
  paystack_subscription_code VARCHAR(100),
  paystack_authorization_code VARCHAR(100),
  payment_method_last4 VARCHAR(10),
  payment_method_brand VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace ON subscriptions(workspace_id);

-- 10. Payment Transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  reference VARCHAR(255) UNIQUE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) NOT NULL,
  channel VARCHAR(50),
  gateway_response TEXT,
  paystack_response_json JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Task Attachments (Supabase Storage Metadata)
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  public_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploader_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_workspace ON task_attachments(workspace_id);
`;

export const ATTACHMENTS_BUCKET = 'task-attachments';

export async function ensureStorageBucket(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.warn('[Supabase Storage] List buckets warning:', error.message);
      return false;
    }
    const found = buckets?.some((b) => b.name === ATTACHMENTS_BUCKET);
    if (!found) {
      const { error: createError } = await supabase.storage.createBucket(ATTACHMENTS_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
      });
      if (createError && !createError.message.includes('already exists')) {
        console.warn('[Supabase Storage] createBucket warning:', createError.message);
      }
    }
    return true;
  } catch (err) {
    console.warn('[Supabase Storage] ensureStorageBucket failed:', err);
    return false;
  }
}
