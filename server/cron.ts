import { db } from './db.js';
import { sendDeadlineApproachingEmail, sendTaskOverdueEmail } from './email.js';

export async function runOverdueTaskScanner() {
  const todayStr = new Date().toISOString().split('T')[0];
  const workspaces = ['a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d']; // Workspaces to scan

  let triggeredCount = 0;
  for (const wsId of workspaces) {
    const tasks = await db.listAllTasks(wsId);
    const overdueTasks = tasks.filter((t) => t.status !== 'Completed' && t.due_date < todayStr);

    for (const task of overdueTasks) {
      // 1. In-app notification to creator
      if (task.created_by) {
        await db.createNotification({
          user_id: task.created_by,
          workspace_id: wsId,
          type: 'task_overdue',
          title: 'Task Overdue Warning',
          message: `Task "${task.title}" is overdue (due date was ${task.due_date}).`,
          task_id: task.id,
        });
      }

      // 2. Email alert to assignee (or creator if not assigned)
      let targetEmail: string | null = null;
      let targetName: string = 'Team Member';
      let targetUserId: string | null = null;

      if (task.assigned_to) {
        const member = await db.findTeamMemberById(task.assigned_to);
        if (member) {
          targetEmail = member.email;
          targetName = member.name;
          targetUserId = member.user_id || null;
        }
      } else if (task.created_by) {
        const user = await db.findUserById(task.created_by);
        if (user) {
          targetEmail = user.email;
          targetName = user.name;
          targetUserId = user.id;
        }
      }

      let allowEmail = true;
      if (targetUserId) {
        const prefs = await db.getNotificationPreferences(targetUserId);
        if (prefs && prefs.overdue_tasks === false) {
          allowEmail = false;
        }
      }

      if (allowEmail && targetEmail) {
        sendTaskOverdueEmail({
          recipientEmail: targetEmail,
          recipientName: targetName,
          taskTitle: task.title,
          priority: task.priority,
          dueDate: task.due_date,
          taskId: task.id,
          workspaceName: 'Acme West Africa Operations',
        }).catch((err) => console.warn('[Overdue Email Alert Warning]', err));
      }

      triggeredCount++;
    }
  }

  return { task: 'overdue_scanner', scannedAt: new Date().toISOString(), triggeredCount };
}

export async function runApproachingDeadlinesScanner() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const workspaces = ['a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'];

  let triggeredCount = 0;
  for (const wsId of workspaces) {
    const tasks = await db.listAllTasks(wsId);
    const approachingTasks = tasks.filter((t) => t.status !== 'Completed' && t.due_date === tomorrow);

    for (const task of approachingTasks) {
      // 1. In-app notification to creator
      if (task.created_by) {
        await db.createNotification({
          user_id: task.created_by,
          workspace_id: wsId,
          type: 'task_deadline_approaching',
          title: 'Task Deadline Approaching',
          message: `Task "${task.title}" is due tomorrow (${task.due_date}).`,
          task_id: task.id,
        });
      }

      // 2. Email alert to assignee (or creator if not assigned)
      let targetEmail: string | null = null;
      let targetName: string = 'Team Member';
      let targetUserId: string | null = null;

      if (task.assigned_to) {
        const member = await db.findTeamMemberById(task.assigned_to);
        if (member) {
          targetEmail = member.email;
          targetName = member.name;
          targetUserId = member.user_id || null;
        }
      } else if (task.created_by) {
        const user = await db.findUserById(task.created_by);
        if (user) {
          targetEmail = user.email;
          targetName = user.name;
          targetUserId = user.id;
        }
      }

      let allowEmail = true;
      if (targetUserId) {
        const prefs = await db.getNotificationPreferences(targetUserId);
        if (prefs && prefs.upcoming_deadlines === false) {
          allowEmail = false;
        }
      }

      if (allowEmail && targetEmail) {
        sendDeadlineApproachingEmail({
          recipientEmail: targetEmail,
          recipientName: targetName,
          taskTitle: task.title,
          priority: task.priority,
          dueDate: task.due_date,
          taskId: task.id,
          workspaceName: 'Acme West Africa Operations',
        }).catch((err) => console.warn('[Deadline Approaching Email Alert Warning]', err));
      }

      triggeredCount++;
    }
  }

  return { task: 'approaching_deadlines', scannedAt: new Date().toISOString(), triggeredCount };
}

export async function runTrialExpirationEngine() {
  const now = new Date();
  const workspaces = ['a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'];

  let expiredCount = 0;
  for (const wsId of workspaces) {
    const sub = await db.getSubscriptionByWorkspace(wsId);
    if (sub && sub.status === 'trialing' && new Date(sub.trial_end) <= now) {
      await db.updateSubscription(sub.id, { status: 'expired' });
      const user = await db.findUserByEmail('sarah.adebayo@acmewestafrica.com');
      if (user) {
        await db.createNotification({
          user_id: user.id,
          workspace_id: wsId,
          type: 'subscription_trial_warning',
          title: '7-Day Free Trial Expired',
          message: 'Your 7-day free trial has expired. Upgrade to the Pro Plan to unlock all task operations.',
          link: '/billing',
        });
      }
      expiredCount++;
    }
  }

  return { task: 'trial_expiration_engine', scannedAt: new Date().toISOString(), expiredCount };
}

export async function runAllScanners() {
  const [overdue, approaching, trial] = await Promise.all([
    runOverdueTaskScanner(),
    runApproachingDeadlinesScanner(),
    runTrialExpirationEngine(),
  ]);

  return {
    success: true,
    message: 'All background scanners executed successfully.',
    results: { overdue, approaching, trial },
  };
}
