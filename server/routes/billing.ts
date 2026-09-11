import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  isPaystackConfigured,
  getPaystackPublicKey,
} from '../paystack.js';

export const billingRouter = Router();

// GET /api/v1/billing/config
billingRouter.get('/config', async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      configured: isPaystackConfigured(),
      publicKey: getPaystackPublicKey(),
      currency: 'NGN',
      amount: 12500,
      supportedChannels: ['card', 'bank', 'ussd', 'bank_transfer'],
    },
  });
});

// GET /api/v1/billing/subscription
billingRouter.get('/subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspace_id;
    let sub = await db.getSubscriptionByWorkspace(workspaceId);

    if (!sub) {
      sub = await db.createSubscription({ workspace_id: workspaceId });
    }

    return res.status(200).json({
      success: true,
      data: sub,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/billing/paystack/initialize
billingRouter.post('/paystack/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { amount = 12500, plan = 'monthly' } = req.body;
    const workspaceId = req.user!.workspace_id;
    const userEmail = req.user!.email;

    const amountInKobo = Math.round(Number(amount) * 100);

    const initResult = await initializePaystackTransaction({
      email: userEmail,
      amountInKobo,
      currency: 'NGN',
      callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/billing?verified=true`,
      metadata: {
        workspace_id: workspaceId,
        user_id: req.user!.id,
        plan,
      },
    });

    return res.status(200).json({
      success: true,
      data: initResult,
      message: 'Paystack payment transaction initialized',
    });
  } catch (err: any) {
    console.error('[Billing Init Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/billing/paystack/verify
billingRouter.post('/paystack/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Transaction reference is required' },
      });
    }

    const verification = await verifyPaystackTransaction(reference);
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_FAILED', message: 'Payment verification was unsuccessful' },
      });
    }

    const workspaceId = req.user!.workspace_id;
    let sub = await db.getSubscriptionByWorkspace(workspaceId);

    const now = new Date();
    const subEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (sub) {
      sub = await db.updateSubscription(sub.id, {
        status: 'active',
        subscription_start: now.toISOString(),
        subscription_end: subEnd.toISOString(),
        paystack_authorization_code: verification.authorization?.authorization_code || null,
        payment_method_last4: verification.authorization?.last4 || '4081',
        payment_method_brand: verification.authorization?.brand || 'Visa',
      });
    }

    // Record audit transaction
    await db.recordPaymentTransaction({
      workspace_id: workspaceId,
      subscription_id: sub?.id,
      reference,
      amount: verification.amount,
      currency: verification.currency || 'NGN',
      status: 'success',
      channel: verification.channel || 'card',
      gateway_response: verification.gatewayResponse || 'Successful',
      paystack_response_json: verification.raw || null,
      paid_at: verification.paidAt || now.toISOString(),
    });

    return res.status(200).json({
      success: true,
      data: {
        status: 'active',
        subscription_end: subEnd.toISOString(),
        payment_method_last4: verification.authorization?.last4 || '4081',
        payment_method_brand: verification.authorization?.brand || 'Visa',
      },
      message: 'Payment verified and Pro subscription activated successfully',
    });
  } catch (err: any) {
    console.error('[Billing Verify Error]', err);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/billing/cancel
billingRouter.post('/cancel', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspace_id;
    const sub = await db.getSubscriptionByWorkspace(workspaceId);

    if (sub) {
      await db.updateSubscription(sub.id, { auto_renew: false });
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription auto-renew cancelled. Access remains active until billing cycle concludes.',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/billing/transactions
billingRouter.get('/transactions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.listPaymentTransactions(req.user!.workspace_id);
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
