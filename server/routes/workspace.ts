import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

export const workspaceRouter = Router();

// POST /api/v1/workspace/onboarding
workspaceRouter.post('/onboarding', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspace_name, company_size, team_members, first_task } = req.body;
    const workspaceId = req.user!.workspace_id;
    const userId = req.user!.id;

    // Update workspace
    if (workspace_name || company_size) {
      await db.updateWorkspace(workspaceId, {
        name: workspace_name,
        company_size: company_size,
      });
    }

    // Add team members
    if (Array.isArray(team_members)) {
      for (const tm of team_members) {
        if (tm.name && tm.email) {
          await db.createTeamMember({
            workspace_id: workspaceId,
            name: tm.name,
            email: tm.email,
            role: tm.role || 'Developer',
            status: 'Active',
          });
        }
      }
    }

    // Create first task
    if (first_task && first_task.title) {
      await db.createTask({
        workspace_id: workspaceId,
        title: first_task.title,
        description: first_task.description || '',
        priority: first_task.priority || 'High',
        due_date: first_task.due_date || new Date().toISOString().split('T')[0],
        status: 'Pending',
        created_by: userId,
      });
    }

    // Mark onboarding complete for user
    await db.updateUser(userId, { onboarding_completed: true });

    return res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (err: any) {
    console.error('[Onboarding Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/workspace/profile
workspaceRouter.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, workspace_name } = req.body;
    const workspaceId = req.user!.workspace_id;
    const userId = req.user!.id;

    if (name) {
      await db.updateUser(userId, { name });
    }

    if (workspace_name) {
      await db.updateWorkspace(workspaceId, { name: workspace_name });
    }

    const updatedUser = await db.findUserById(userId);
    const updatedWs = await db.findWorkspaceById(workspaceId);

    return res.status(200).json({
      success: true,
      data: {
        user: updatedUser,
        workspace: updatedWs,
      },
      message: 'Profile updated successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
