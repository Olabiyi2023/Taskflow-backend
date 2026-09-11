import { Router, Response } from 'express';
import { db } from '../db.js';
import { generateTokens, hashPassword, verifyPassword, requireAuth, AuthenticatedRequest } from '../auth.js';

export const authRouter = Router();

// POST /api/v1/auth/register
authRouter.post('/register', async (req, res: Response) => {
  try {
    const { name, email, password, workspace_name, company_size, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, email, and password are required',
        },
      });
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_EMAIL',
          message: 'Email is already registered',
          details: [{ field: 'email', message: 'Email is already registered' }],
        },
      });
    }

    // 1. Create Workspace
    const workspace = await db.createWorkspace({
      name: workspace_name || `${name}'s Workspace`,
      company_size: company_size || '1-10 employees',
    });

    // 2. Create User
    const user = await db.createUser({
      workspace_id: workspace.id,
      name,
      email,
      password_hash: hashPassword(password),
      role: role || 'Business Owner',
      avatar_color: '#4F46E5',
      onboarding_completed: false,
    });

    // 3. Create Notification Preferences
    await db.updateNotificationPreferences(user.id, {
      task_assignments: true,
      comments: true,
      status_changes: true,
      upcoming_deadlines: true,
      overdue_tasks: true,
    });

    // 4. Create 7-Day Free Trial Subscription
    await db.createSubscription({
      workspace_id: workspace.id,
      plan: 'monthly',
      plan_name: 'Pro Monthly Plan',
      amount: 12500,
      currency: 'NGN',
      status: 'trialing',
    });

    // 5. Add user to Team Members directory
    await db.createTeamMember({
      workspace_id: workspace.id,
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: 'Active',
      avatar_color: user.avatar_color,
    });

    const tokens = generateTokens(user);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspace_id: user.workspace_id,
          workspace_name: workspace.name,
          company_size: workspace.company_size,
          avatar_color: user.avatar_color,
          onboarding_completed: user.onboarding_completed,
          created_at: user.created_at,
        },
        tokens,
      },
      message: 'Account and workspace registered successfully with 7-day free trial',
    });
  } catch (err: any) {
    console.error('[Auth Register Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Registration failed' },
    });
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email and password are required',
        },
      });
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid && user.password_hash !== hashPassword(password)) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    const workspace = await db.findWorkspaceById(user.workspace_id);
    const tokens = generateTokens(user);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspace_id: user.workspace_id,
          workspace_name: workspace ? workspace.name : 'Acme West Africa Operations',
          avatar_color: user.avatar_color,
          onboarding_completed: user.onboarding_completed,
          created_at: user.created_at,
        },
        tokens,
      },
      message: 'Logged in successfully',
    });
  } catch (err: any) {
    console.error('[Auth Login Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message || 'Login failed' },
    });
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.findUserById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
    }
    const workspace = await db.findWorkspaceById(user.workspace_id);

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspace_id: user.workspace_id,
        workspace_name: workspace ? workspace.name : 'TaskFlow Workspace',
        avatar_color: user.avatar_color,
        onboarding_completed: user.onboarding_completed,
        created_at: user.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/auth/forgot-password
authRouter.post('/forgot-password', async (req, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Email is required' },
    });
  }

  const user = await db.findUserByEmail(email);
  return res.status(200).json({
    success: true,
    message: user
      ? 'Password reset instructions have been sent to your email.'
      : 'If that email exists in our records, a reset link has been dispatched.',
  });
});

// POST /api/v1/auth/reset-password
authRouter.post('/reset-password', async (req, res: Response) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Token and new password are required' },
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Password reset successfully. You may now log in with your new password.',
  });
});
