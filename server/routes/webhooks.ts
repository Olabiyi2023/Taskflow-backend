import { Router, Request, Response } from 'express';
import { verifyWebhookSignature } from '../paystack.js';
import { db } from '../db.js';

export const webhooksRouter = Router();

// POST /api/v1/webhooks/paystack
webhooksRouter.post('/paystack', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Webhook] Invalid Paystack signature received');
      return res.status(400).send('Invalid webhook signature');
    }

    const event = req.body;
    console.log('[Paystack Webhook Received]', event?.event);

    if (event && event.event === 'charge.success' && event.data) {
      const data = event.data;
      const workspaceId = data.metadata?.workspace_id;
      if (workspaceId) {
        let sub = await db.getSubscriptionByWorkspace(workspaceId);
        const now = new Date();
        const subEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (sub) {
          await db.updateSubscription(sub.id, {
            status: 'active',
            subscription_start: now.toISOString(),
            subscription_end: subEnd.toISOString(),
            payment_method_last4: data.authorization?.last4 || '4081',
            payment_method_brand: data.authorization?.brand || 'Visa',
          });
        }

        await db.recordPaymentTransaction({
          workspace_id: workspaceId,
          subscription_id: sub?.id,
          reference: data.reference || `WH_${Date.now()}`,
          amount: data.amount ? data.amount / 100 : 12500,
          currency: data.currency || 'NGN',
          status: 'success',
          channel: data.channel || 'card',
          gateway_response: data.gateway_response || 'Webhook success',
          paystack_response_json: data,
          paid_at: data.paid_at || now.toISOString(),
        });
      }
    }

    return res.status(200).send('Webhook processed');
  } catch (err: any) {
    console.error('[Paystack Webhook Error]', err);
    return res.status(500).send('Error processing webhook');
  }
});
