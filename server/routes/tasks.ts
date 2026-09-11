import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { TaskStatus, TaskPriority } from '../types.js';
import { sendTaskAssignmentEmail } from '../email.js';

export const tasksRouter = Router();

// GET /api/v1/tasks
tasksRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspace_id;
    const {
      search,
      status,
      priority,
      assigned_to,
      is_overdue,
      page = '1',
      limit = '50',
    } = req.query;

    let allTasks = await db.listAllTasks(workspaceId);

    // Filter by search
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      allTasks = allTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    // Filter by status
    if (status && typeof status === 'string') {
      allTasks = allTasks.filter((t) => t.status === status);
    }

    // Filter by priority
    if (priority && typeof priority === 'string') {
      allTasks = allTasks.filter((t) => t.priority === priority);
    }

    // Filter by assigned_to
    if (assigned_to && typeof assigned_to === 'string') {
      allTasks = allTasks.filter((t) => t.assigned_to === assigned_to);
    }

    // Filter by is_overdue
    if (is_overdue !== undefined) {
      const wantOverdue = is_overdue === 'true';
      allTasks = allTasks.filter((t) => !!t.is_overdue === wantOverdue);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 50);
    const total = allTasks.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = allTasks.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      data: {
        tasks: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/tasks/:id
tasksRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const task = await db.findTaskById(req.params.id);
    if (!task || task.workspace_id !== req.user!.workspace_id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/tasks
tasksRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, status, priority, due_date, assigned_to } = req.body;
    const workspaceId = req.user!.workspace_id;
    const userId = req.user!.id;

    if (!title || !due_date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title and due_date are required',
        },
      });
    }

    const newTask = await db.createTask({
      workspace_id: workspaceId,
      title,
      description: description || null,
      status: (status as TaskStatus) || 'Pending',
      priority: (priority as TaskPriority) || 'Medium',
      due_date,
      assigned_to: assigned_to || null,
      created_by: userId,
    });

    // Notify assigned team member if applicable
    if (assigned_to) {
      const member = await db.findTeamMemberById(assigned_to);
      if (member) {
        if (member.user_id && member.user_id !== userId) {
          await db.createNotification({
            user_id: member.user_id,
            workspace_id: workspaceId,
            type: 'task_assigned',
            title: 'New Task Assignment',
            message: `You have been assigned to "${newTask.title}"`,
            task_id: newTask.id,
          });
        }

        // Email alert via Resend or SendGrid
        let sendEmailAlert = true;
        if (member.user_id) {
          const prefs = await db.getNotificationPreferences(member.user_id);
          if (prefs && prefs.task_assignments === false) {
            sendEmailAlert = false;
          }
        }

        if (sendEmailAlert && member.email) {
          sendTaskAssignmentEmail({
            recipientEmail: member.email,
            recipientName: member.name,
            taskTitle: newTask.title,
            taskDescription: newTask.description,
            priority: newTask.priority,
            dueDate: newTask.due_date,
            taskId: newTask.id,
            assignerName: req.currentUser?.name,
            workspaceName: 'Acme West Africa Operations',
          }).catch((err) => console.warn('[Email Alert Dispatch Warning]', err));
        }
      }
    }

    return res.status(201).json({
      success: true,
      data: newTask,
      message: 'Task created successfully',
    });
  } catch (err: any) {
    console.error('[Create Task Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/tasks/:id/status
tasksRouter.patch('/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid status is required' },
      });
    }

    const updated = await db.updateTaskStatus(req.params.id, status as TaskStatus);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Trigger notification if status changed to Completed
    if (status === 'Completed' && updated.created_by && updated.created_by !== req.user!.id) {
      await db.createNotification({
        user_id: updated.created_by,
        workspace_id: req.user!.workspace_id,
        type: 'task_status_changed',
        title: 'Task Completed',
        message: `Task "${updated.title}" has been marked as Completed.`,
        task_id: updated.id,
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
      message: `Task status transitioned to ${status}`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PUT /api/v1/tasks/:id
tasksRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = await db.findTaskById(req.params.id);
    const updated = await db.updateTask(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    // Check if task was newly assigned or reassigned
    if (req.body.assigned_to && req.body.assigned_to !== existing?.assigned_to) {
      const member = await db.findTeamMemberById(req.body.assigned_to);
      if (member) {
        if (member.user_id && member.user_id !== req.user!.id) {
          await db.createNotification({
            user_id: member.user_id,
            workspace_id: req.user!.workspace_id,
            type: 'task_assigned',
            title: 'Task Reassigned',
            message: `You have been assigned to "${updated.title}"`,
            task_id: updated.id,
          });
        }

        let sendEmailAlert = true;
        if (member.user_id) {
          const prefs = await db.getNotificationPreferences(member.user_id);
          if (prefs && prefs.task_assignments === false) {
            sendEmailAlert = false;
          }
        }

        if (sendEmailAlert && member.email) {
          sendTaskAssignmentEmail({
            recipientEmail: member.email,
            recipientName: member.name,
            taskTitle: updated.title,
            taskDescription: updated.description,
            priority: updated.priority,
            dueDate: updated.due_date,
            taskId: updated.id,
            assignerName: req.currentUser?.name,
            workspaceName: 'Acme West Africa Operations',
          }).catch((err) => console.warn('[Email Alert Dispatch Warning]', err));
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Task updated successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// DELETE /api/v1/tasks/:id
tasksRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteTask(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
