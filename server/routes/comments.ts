import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

export const commentsRouter = Router({ mergeParams: true });

// GET /api/v1/tasks/:taskId/comments
commentsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const comments = await db.listComments(taskId);

    return res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/tasks/:taskId/comments
commentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Comment content is required' },
      });
    }

    const task = await db.findTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const author = (await db.findUserById(req.user!.id)) || {
      id: req.user!.id,
      name: 'User',
      role: req.user!.role,
      avatar_color: '#4F46E5',
    };

    const newComment = await db.createComment({
      task_id: taskId,
      author_id: req.user!.id,
      author_name: author.name,
      author_role: author.role,
      author_avatar_color: author.avatar_color,
      content: content.trim(),
    });

    // Notify assignee if not the author
    if (task.assigned_to) {
      const assignee = await db.findTeamMemberById(task.assigned_to);
      if (assignee && assignee.user_id && assignee.user_id !== req.user!.id) {
        await db.createNotification({
          user_id: assignee.user_id,
          workspace_id: req.user!.workspace_id,
          type: 'task_comment',
          title: 'New Comment on Task',
          message: `${author.name} commented on "${task.title}": "${content.slice(0, 60)}..."`,
          task_id: taskId,
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: newComment,
      message: 'Comment posted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// DELETE /api/v1/tasks/:taskId/comments/:commentId
commentsRouter.delete('/:commentId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const success = await db.deleteComment(commentId);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Comment not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
