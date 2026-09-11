import { Router, Request, Response } from 'express';
import { checkSupabaseHealth, SUPABASE_SCHEMA_SQL, isSupabaseConfigured } from '../supabase.js';
import { runAllScanners } from '../cron.js';

export const systemRouter = Router();

// GET /api/v1/system/health
systemRouter.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    service: 'TaskFlow Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured(),
  });
});

// GET /api/v1/system/supabase-status
systemRouter.get('/supabase-status', async (req: Request, res: Response) => {
  try {
    const status = await checkSupabaseHealth();
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/system/supabase-schema
systemRouter.get('/supabase-schema', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: {
      sql: SUPABASE_SCHEMA_SQL,
      instructions: [
        '1. Go to your Supabase Dashboard (https://supabase.com/dashboard).',
        '2. Select your Project, then click "SQL Editor" in the left navigation.',
        '3. Create a "New Query", paste this SQL schema script, and click "Run".',
        '4. Copy your Project URL and anon/service_role API Key from Settings -> API.',
        '5. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.',
      ],
    },
  });
});

// POST /api/v1/system/cron/run-scanners
systemRouter.post('/cron/run-scanners', async (req: Request, res: Response) => {
  try {
    const results = await runAllScanners();
    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
