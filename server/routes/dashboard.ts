import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

export const dashboardRouter = Router();

// GET /api/v1/dashboard/stats
dashboardRouter.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspace_id;
    const tasks = await db.listAllTasks(workspaceId);
    const teamMembers = await db.listTeamMembers(workspaceId);

    const todayStr = new Date().toISOString().split('T')[0];

    let pendingTasks = 0;
    let inProgressTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    tasks.forEach((t) => {
      if (t.status === 'Completed') {
        completedTasks++;
      } else if (t.status === 'In Progress') {
        inProgressTasks++;
      } else {
        pendingTasks++;
      }

      if (t.status !== 'Completed' && t.due_date < todayStr) {
        overdueTasks++;
      }
    });

    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Number(((completedTasks / totalTasks) * 100).toFixed(1)) : 0;

    return res.status(200).json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
        teamMembersCount: teamMembers.length,
        completionRate,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
