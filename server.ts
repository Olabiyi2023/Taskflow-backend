import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { authRouter } from './server/routes/auth.js';
import { workspaceRouter } from './server/routes/workspace.js';
import { dashboardRouter } from './server/routes/dashboard.js';
import { tasksRouter } from './server/routes/tasks.js';
import { commentsRouter } from './server/routes/comments.js';
import { attachmentsRouter } from './server/routes/attachments.js';
import { teamRouter } from './server/routes/team.js';
import { notificationsRouter } from './server/routes/notifications.js';
import { billingRouter } from './server/routes/billing.js';
import { webhooksRouter } from './server/routes/webhooks.js';
import { systemRouter } from './server/routes/system.js';
import { runAllScanners } from './server/cron.js';
import { syncDefaultDataToSupabase } from './server/db.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger for API calls
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // REST API Routes (/api/v1/* and /api/* aliases)
  const apiV1Router = express.Router();
  apiV1Router.use('/auth', authRouter);
  apiV1Router.use('/workspace', workspaceRouter);
  apiV1Router.use('/dashboard', dashboardRouter);
  apiV1Router.use('/tasks', tasksRouter);
  apiV1Router.use('/tasks/:taskId/comments', commentsRouter);
  apiV1Router.use('/tasks/:taskId/attachments', attachmentsRouter);
  apiV1Router.use('/team', teamRouter);
  apiV1Router.use('/notifications', notificationsRouter);
  apiV1Router.use('/billing', billingRouter);
  apiV1Router.use('/webhooks', webhooksRouter);
  apiV1Router.use('/system', systemRouter);

  // Mount on both /api/v1 and /api for maximum client compatibility
  app.use('/api/v1', apiV1Router);
  app.use('/api', apiV1Router);

  // Background cron scanner interval (every 30 minutes in memory)
  setInterval(() => {
    runAllScanners().catch((err) => console.error('[Cron Scanner Error]', err));
  }, 30 * 60 * 1000);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TaskFlow Backend] Server running on http://0.0.0.0:${PORT}`);
    syncDefaultDataToSupabase().catch((err) => {
      console.warn('[Supabase Sync Warning]', err);
    });
  });
}

startServer().catch((err) => {
  console.error('[Server Start Error]', err);
  process.exit(1);
});
