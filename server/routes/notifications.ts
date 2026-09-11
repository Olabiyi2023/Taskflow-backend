import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { getEmailConfig, getEmailLogs, sendTestEmail } from '../email.js';
import { runApproachingDeadlinesScanner, runOverdueTaskScanner } from '../cron.js';

export const notificationsRouter = Router();

// GET /api/v1/notifications/email-config
notificationsRouter.get('/email-config', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const config = getEmailConfig();
    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/notifications/email-logs
notificationsRouter.get('/email-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = getEmailLogs();
    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/notifications/test-email
notificationsRouter.post('/test-email', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, type = 'task_assigned' } = req.body;
    const targetEmail = email?.trim() || req.user?.email || 'team@taskflow.dev';

    if (!['task_assigned', 'deadline_approaching', 'task_overdue'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid email alert type specified' },
      });
    }

    const result = await sendTestEmail(targetEmail, type as any);
    return res.status(200).json({
      success: result.success,
      data: result,
      message: result.message,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/notifications/trigger-deadline-alerts
notificationsRouter.post('/trigger-deadline-alerts', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [overdueResult, approachingResult] = await Promise.all([
      runOverdueTaskScanner(),
      runApproachingDeadlinesScanner(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overdue: overdueResult,
        approaching: approachingResult,
      },
      message: `Scanned tasks: ${approachingResult.triggeredCount} upcoming deadline alerts, ${overdueResult.triggeredCount} overdue alerts generated.`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/notifications
notificationsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.listNotifications(req.user!.id);
    return res.status(200).json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/notifications/unread-count
notificationsRouter.get('/unread-count', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await db.getUnreadNotificationCount(req.user!.id);
    return res.status(200).json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.markNotificationRead(req.params.id);
    return res.status(200).json({
      success,
      message: success ? 'Notification marked as read' : 'Notification not found',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/notifications/mark-all-read
notificationsRouter.patch('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.markAllNotificationsRead(req.user!.id);
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/notifications/preferences
notificationsRouter.get('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prefs = await db.getNotificationPreferences(req.user!.id);
    return res.status(200).json({
      success: true,
      data: prefs,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/notifications/preferences
notificationsRouter.patch('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateNotificationPreferences(req.user!.id, req.body);
    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Notification preferences updated successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
