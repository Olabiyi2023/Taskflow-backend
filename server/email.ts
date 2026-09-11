import { Resend } from 'resend';

export interface EmailLogEntry {
  id: string;
  timestamp: string;
  type: 'task_assigned' | 'deadline_approaching' | 'task_overdue' | 'test';
  to: string;
  subject: string;
  provider: 'resend' | 'sendgrid' | 'simulated';
  status: 'delivered' | 'simulated' | 'failed';
  taskId?: string;
  error?: string;
  previewText?: string;
}

// In-memory audit log for email alerts (stores last 100 alerts)
const emailAuditLogs: EmailLogEntry[] = [];

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey.startsWith('your_') || apiKey.startsWith('MY_')) {
    return null;
  }
  if (!resendInstance) {
    try {
      resendInstance = new Resend(apiKey);
    } catch (err) {
      console.warn('[Email] Error initializing Resend client:', err);
      return null;
    }
  }
  return resendInstance;
}

export function getEmailConfig(): {
  configured: boolean;
  activeProvider: 'resend' | 'sendgrid' | 'simulated';
  hasResendKey: boolean;
  hasSendGridKey: boolean;
  fromEmail: string;
  appUrl: string;
} {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();

  const hasResendKey = !!(resendKey && !resendKey.startsWith('your_') && !resendKey.startsWith('MY_'));
  const hasSendGridKey = !!(sendgridKey && !sendgridKey.startsWith('your_') && !sendgridKey.startsWith('MY_'));

  let activeProvider: 'resend' | 'sendgrid' | 'simulated' = 'simulated';
  if (hasResendKey) {
    activeProvider = 'resend';
  } else if (hasSendGridKey) {
    activeProvider = 'sendgrid';
  }

  const defaultFrom = activeProvider === 'resend'
    ? (process.env.RESEND_FROM_EMAIL?.trim() || 'TaskFlow <onboarding@resend.dev>')
    : (process.env.SENDGRID_FROM_EMAIL?.trim() || 'TaskFlow Alerts <alerts@taskflow.dev>');

  return {
    configured: hasResendKey || hasSendGridKey,
    activeProvider,
    hasResendKey,
    hasSendGridKey,
    fromEmail: defaultFrom,
    appUrl: process.env.APP_URL || 'http://localhost:3000',
  };
}

export function getEmailLogs(): EmailLogEntry[] {
  return [...emailAuditLogs].reverse();
}

/**
 * Low-level email sender supporting Resend, SendGrid, and Simulated modes.
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type: 'task_assigned' | 'deadline_approaching' | 'task_overdue' | 'test';
  taskId?: string;
}): Promise<{
  success: boolean;
  provider: 'resend' | 'sendgrid' | 'simulated';
  id?: string;
  message: string;
}> {
  const config = getEmailConfig();
  const logId = `eml_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  // 1. Resend Provider
  if (config.activeProvider === 'resend') {
    const resend = getResendClient();
    if (resend) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'TaskFlow <onboarding@resend.dev>';
        const res = await resend.emails.send({
          from: fromEmail,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        });

        if (res.error) {
          throw new Error(res.error.message || 'Resend delivery error');
        }

        const entry: EmailLogEntry = {
          id: logId,
          timestamp: now,
          type: options.type,
          to: options.to,
          subject: options.subject,
          provider: 'resend',
          status: 'delivered',
          taskId: options.taskId,
          previewText: options.subject,
        };
        addLogEntry(entry);

        console.log(`[Email / Resend] Successfully sent alert to ${options.to} (ID: ${res.data?.id})`);
        return {
          success: true,
          provider: 'resend',
          id: res.data?.id,
          message: `Email successfully delivered via Resend to ${options.to}`,
        };
      } catch (err: any) {
        console.error(`[Email / Resend Error] Failed to send email to ${options.to}:`, err.message);
        addLogEntry({
          id: logId,
          timestamp: now,
          type: options.type,
          to: options.to,
          subject: options.subject,
          provider: 'resend',
          status: 'failed',
          taskId: options.taskId,
          error: err.message,
        });
        return {
          success: false,
          provider: 'resend',
          message: `Resend error: ${err.message}`,
        };
      }
    }
  }

  // 2. SendGrid Provider
  if (config.activeProvider === 'sendgrid') {
    const sendgridApiKey = process.env.SENDGRID_API_KEY?.trim()!;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL?.trim() || 'alerts@taskflow.dev';
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: fromEmail, name: 'TaskFlow Operations' },
          subject: options.subject,
          content: [
            { type: 'text/plain', value: options.text || options.subject },
            { type: 'text/html', value: options.html },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`SendGrid API error (${response.status}): ${errText}`);
      }

      addLogEntry({
        id: logId,
        timestamp: now,
        type: options.type,
        to: options.to,
        subject: options.subject,
        provider: 'sendgrid',
        status: 'delivered',
        taskId: options.taskId,
        previewText: options.subject,
      });

      console.log(`[Email / SendGrid] Successfully sent alert to ${options.to}`);
      return {
        success: true,
        provider: 'sendgrid',
        message: `Email successfully delivered via SendGrid to ${options.to}`,
      };
    } catch (err: any) {
      console.error(`[Email / SendGrid Error] Failed to send email:`, err.message);
      addLogEntry({
        id: logId,
        timestamp: now,
        type: options.type,
        to: options.to,
        subject: options.subject,
        provider: 'sendgrid',
        status: 'failed',
        taskId: options.taskId,
        error: err.message,
      });
      return {
        success: false,
        provider: 'sendgrid',
        message: `SendGrid error: ${err.message}`,
      };
    }
  }

  // 3. Simulated Mode (when API keys not configured)
  addLogEntry({
    id: logId,
    timestamp: now,
    type: options.type,
    to: options.to,
    subject: options.subject,
    provider: 'simulated',
    status: 'simulated',
    taskId: options.taskId,
    previewText: options.subject,
  });

  console.log(`[Email / Simulated] Alert dispatched: To: ${options.to} | Subject: "${options.subject}" (configure RESEND_API_KEY or SENDGRID_API_KEY for live delivery)`);

  return {
    success: true,
    provider: 'simulated',
    id: logId,
    message: `Alert recorded in simulation mode for ${options.to}. Set RESEND_API_KEY or SENDGRID_API_KEY in .env for live transmission.`,
  };
}

function addLogEntry(entry: EmailLogEntry) {
  emailAuditLogs.push(entry);
  if (emailAuditLogs.length > 100) {
    emailAuditLogs.shift();
  }
}

// -------------------------------------------------------------
// HTML Template Helpers & Specific Alert Dispatchers
// -------------------------------------------------------------

function generateEmailTemplate(opts: {
  headline: string;
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  description?: string | null;
  items: { label: string; value: string }[];
  actionUrl: string;
  actionText: string;
  footerNote: string;
}) {
  const itemsHtml = opts.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; color: #94a3b8; font-size: 13px; font-weight: 500; width: 120px;">${item.label}</td>
        <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${item.value}</td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; border-bottom: 3px solid #4f46e5;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      <span style="color: #6366f1;">TaskFlow</span> Operations
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: ${opts.badgeBg}; color: ${opts.badgeColor}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 9999px;">
                      ${opts.badgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                ${opts.headline}
              </h1>

              ${
                opts.description
                  ? `<div style="background-color: #f1f5f9; border-left: 4px solid #6366f1; padding: 14px 16px; border-radius: 0 6px 6px 0; margin-bottom: 24px; font-size: 14px; color: #334155; line-height: 1.5;">${opts.description}</div>`
                  : ''
              }

              <!-- Details Table -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0 28px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${itemsHtml}
                </table>
              </div>

              <!-- Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${opts.actionUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25);">
                      ${opts.actionText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b;">
                ${opts.footerNote}
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                TaskFlow Automated Alerting &bull; Powered by Resend / SendGrid Integration
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. Task Assignment Email Alert
 */
export async function sendTaskAssignmentEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  dueDate: string;
  taskId: string;
  assignerName?: string;
  workspaceName?: string;
}) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const taskUrl = `${appUrl}/#task-${params.taskId}`;

  const priorityColors: Record<string, { bg: string; text: string }> = {
    Urgent: { bg: '#fee2e2', text: '#991b1b' },
    High: { bg: '#ffedd5', text: '#9a3412' },
    Medium: { bg: '#fef3c7', text: '#92400e' },
    Low: { bg: '#e0e7ff', text: '#3730a3' },
  };

  const priorityStyle = priorityColors[params.priority] || priorityColors.Medium;

  const html = generateEmailTemplate({
    headline: `Hello ${params.recipientName}, you have been assigned a new task`,
    badgeText: `Assigned &bull; ${params.priority}`,
    badgeBg: priorityStyle.bg,
    badgeColor: priorityStyle.text,
    title: `New Task Assignment: ${params.taskTitle}`,
    description: params.taskDescription || undefined,
    items: [
      { label: 'Task Title', value: params.taskTitle },
      { label: 'Priority', value: params.priority },
      { label: 'Due Date', value: params.dueDate },
      { label: 'Assigned By', value: params.assignerName || 'Team Lead' },
      { label: 'Workspace', value: params.workspaceName || 'TaskFlow Operations' },
    ],
    actionUrl: taskUrl,
    actionText: 'Open Task in TaskFlow',
    footerNote: 'You received this notification because task assignment alerts are enabled in your preferences.',
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: `[TaskFlow] Assigned to Task: ${params.taskTitle} (${params.priority} Priority)`,
    html,
    text: `You have been assigned to task "${params.taskTitle}". Priority: ${params.priority}. Due Date: ${params.dueDate}. View task at: ${taskUrl}`,
    type: 'task_assigned',
    taskId: params.taskId,
  });
}

/**
 * 2. Approaching Deadline Alert (24 hours / Tomorrow)
 */
export async function sendDeadlineApproachingEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  priority: string;
  dueDate: string;
  taskId: string;
  workspaceName?: string;
}) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const taskUrl = `${appUrl}/#task-${params.taskId}`;

  const html = generateEmailTemplate({
    headline: `Reminder: Task deadline is approaching tomorrow`,
    badgeText: 'Due Tomorrow',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    title: `Approaching Deadline: ${params.taskTitle}`,
    items: [
      { label: 'Task Title', value: params.taskTitle },
      { label: 'Due Date', value: `${params.dueDate} (Tomorrow)` },
      { label: 'Priority', value: params.priority },
      { label: 'Recipient', value: params.recipientName },
      { label: 'Workspace', value: params.workspaceName || 'TaskFlow Operations' },
    ],
    actionUrl: taskUrl,
    actionText: 'Review and Complete Task',
    footerNote: 'Upcoming deadline reminder alerts are configured in your TaskFlow workspace notification settings.',
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: `[TaskFlow Reminder] Deadline Tomorrow: ${params.taskTitle}`,
    html,
    text: `Reminder: Task "${params.taskTitle}" is due tomorrow (${params.dueDate}). Priority: ${params.priority}. Complete it here: ${taskUrl}`,
    type: 'deadline_approaching',
    taskId: params.taskId,
  });
}

/**
 * 3. Overdue Task Alert
 */
export async function sendTaskOverdueEmail(params: {
  recipientEmail: string;
  recipientName: string;
  taskTitle: string;
  priority: string;
  dueDate: string;
  taskId: string;
  workspaceName?: string;
}) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const taskUrl = `${appUrl}/#task-${params.taskId}`;

  const html = generateEmailTemplate({
    headline: `Attention: Task is now overdue`,
    badgeText: 'Overdue Alert',
    badgeBg: '#fee2e2',
    badgeColor: '#b91c1c',
    title: `Overdue Task Alert: ${params.taskTitle}`,
    items: [
      { label: 'Task Title', value: params.taskTitle },
      { label: 'Past Due Date', value: `${params.dueDate} (Overdue)` },
      { label: 'Priority', value: params.priority },
      { label: 'Assignee', value: params.recipientName },
      { label: 'Workspace', value: params.workspaceName || 'TaskFlow Operations' },
    ],
    actionUrl: taskUrl,
    actionText: 'Update Task Status Now',
    footerNote: 'Overdue task alerts are dispatched automatically by background scanners.',
  });

  return sendEmail({
    to: params.recipientEmail,
    subject: `[TaskFlow Alert] Overdue Task: ${params.taskTitle}`,
    html,
    text: `Urgent: Task "${params.taskTitle}" is overdue (was due on ${params.dueDate}). Update task status at: ${taskUrl}`,
    type: 'task_overdue',
    taskId: params.taskId,
  });
}

/**
 * 4. Test Email Alert Trigger
 */
export async function sendTestEmail(
  toEmail: string,
  alertType: 'task_assigned' | 'deadline_approaching' | 'task_overdue' = 'task_assigned'
) {
  if (alertType === 'task_assigned') {
    return sendTaskAssignmentEmail({
      recipientEmail: toEmail,
      recipientName: 'Team Member',
      taskTitle: 'Verify Resend / SendGrid Email Notifications Pipeline',
      taskDescription: 'This is a test notification confirming that email alerts for task assignments and deadlines are working.',
      priority: 'High',
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      taskId: 'test-assignment-task-1',
      assignerName: 'TaskFlow Operations Admin',
      workspaceName: 'Acme West Africa Operations',
    });
  } else if (alertType === 'deadline_approaching') {
    return sendDeadlineApproachingEmail({
      recipientEmail: toEmail,
      recipientName: 'Team Member',
      taskTitle: 'Monthly Operations Security Review',
      priority: 'Urgent',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      taskId: 'test-deadline-task-2',
      workspaceName: 'Acme West Africa Operations',
    });
  } else {
    return sendTaskOverdueEmail({
      recipientEmail: toEmail,
      recipientName: 'Team Member',
      taskTitle: 'Database WAL Backup Verification',
      priority: 'High',
      dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
      taskId: 'test-overdue-task-3',
      workspaceName: 'Acme West Africa Operations',
    });
  }
}
