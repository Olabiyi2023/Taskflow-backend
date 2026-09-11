import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Zap,
  ExternalLink,
  History,
  Webhook,
  Copy,
  Check,
  Building2,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import { SubscriptionInfo, PaymentTransaction } from '../types';
import { api } from '../services/api';

interface BillingModalProps {
  isOpen: boolean;
  subscription: SubscriptionInfo | null;
  onClose: () => void;
  onRefreshSubscription: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  isOpen,
  subscription,
  onClose,
  onRefreshSubscription,
}) => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'transactions' | 'webhook'>('checkout');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paystackConfig, setPaystackConfig] = useState<{
    configured: boolean;
    publicKey: string | null;
    currency: string;
    amount: number;
    supportedChannels: string[];
  } | null>(null);

  const [checkoutData, setCheckoutData] = useState<{
    reference: string;
    authorization_url?: string;
    live?: boolean;
    simulated?: boolean;
  } | null>(null);

  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [manualRef, setManualRef] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getBillingConfig().then((res) => {
        if (res.success && res.data) {
          setPaystackConfig(res.data);
        }
      });
      loadTransactions();
    }
  }, [isOpen]);

  const loadTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await api.getPaymentTransactions();
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load transactions', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/v1/webhooks/paystack`;

  const copyWebhookToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handlePaystackInit = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const initRes = await api.initializePaystack(12500, 'monthly');
      if (!initRes.success || !initRes.data?.reference) {
        throw new Error(initRes.error?.message || 'Failed to initialize Paystack transaction');
      }

      setCheckoutData({
        reference: initRes.data.reference,
        authorization_url: initRes.data.authorization_url,
        live: !initRes.data.simulated,
        simulated: initRes.data.simulated,
      });

      // If live Paystack with authorization_url, open popup or hosted checkout
      if (!initRes.data.simulated && paystackConfig?.publicKey && typeof (window as any).PaystackPop !== 'undefined') {
        try {
          const handler = (window as any).PaystackPop.setup({
            key: paystackConfig.publicKey,
            email: 'abassolabiyi3@gmail.com',
            amount: 1250000,
            currency: 'NGN',
            ref: initRes.data.reference,
            channels: ['card', 'bank', 'ussd', 'bank_transfer'],
            callback: async (response: any) => {
              setLoading(true);
              setSuccessMessage('Payment completed via Paystack! Verifying with backend & Supabase...');
              try {
                const verifyRes = await api.verifyPaystack(response.reference || initRes.data.reference);
                if (verifyRes.success) {
                  setSuccessMessage('Payment verified! Pro Plan is now active.');
                  setCheckoutData(null);
                  await onRefreshSubscription();
                  loadTransactions();
                } else {
                  setErrorMessage(verifyRes.error?.message || 'Verification failed');
                }
              } catch (e: any) {
                setErrorMessage(e.message || 'Verification failed');
              } finally {
                setLoading(false);
              }
            },
            onClose: () => {
              // Dialog closed
            },
          });
          handler.openIframe();
          setSuccessMessage('Paystack checkout opened. Complete payment in the popup or using the hosted link below.');
        } catch (popupErr) {
          console.warn('Paystack popup setup issue, falling back to direct URL', popupErr);
          if (initRes.data.authorization_url) {
            window.open(initRes.data.authorization_url, '_blank');
          }
        }
      } else if (!initRes.data.simulated && initRes.data.authorization_url) {
        window.open(initRes.data.authorization_url, '_blank');
        setSuccessMessage('Paystack checkout opened in a new tab! Complete payment, then click Verify below.');
      } else {
        // In simulated/test mode, auto-verify for smooth testing
        const verifyRes = await api.verifyPaystack(initRes.data.reference);
        if (verifyRes.success) {
          setSuccessMessage('Payment verified! Pro Monthly Plan is now Active.');
          await onRefreshSubscription();
          loadTransactions();
        } else {
          throw new Error(verifyRes.error?.message || 'Verification failed');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    const refToVerify = manualRef.trim() || checkoutData?.reference;
    if (!refToVerify) {
      setErrorMessage('Please enter a transaction reference to verify');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const verifyRes = await api.verifyPaystack(refToVerify);
      if (verifyRes.success) {
        setSuccessMessage('Payment verified successfully! Pro Plan is now active.');
        setCheckoutData(null);
        setManualRef('');
        await onRefreshSubscription();
        loadTransactions();
      } else {
        throw new Error(verifyRes.error?.message || 'Payment verification failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Subscription &amp; Paystack Billing</h2>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-slate-400">Payment Engine:</span>
                <span className="font-semibold text-emerald-400 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{paystackConfig?.configured ? 'Paystack Live / Test API' : 'Paystack Sandbox Simulation'}</span>
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-950/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('checkout')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'checkout'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Plan &amp; Upgrade</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('transactions');
              loadTransactions();
            }}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'transactions'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Transactions ({transactions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`py-3 px-3 border-b-2 flex items-center space-x-1.5 transition ${
              activeTab === 'webhook'
                ? 'border-indigo-500 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhook &amp; Keys</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {successMessage && (
            <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'checkout' && (
            <div className="space-y-5">
              {/* Plan Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Account Tier</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      subscription?.status === 'active'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                    }`}
                  >
                    {subscription?.status === 'active' ? 'Active Pro' : '7-Day Free Trial'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-2xl font-black text-white">Pro Monthly Plan</div>
                    <div className="text-xs text-slate-400 mt-1">
                      ₦12,500 / month • Renews automatically • Cancel anytime
                    </div>
                  </div>
                </div>

                {subscription?.status === 'trialing' && (
                  <div className="flex items-center space-x-2 pt-3 text-xs text-amber-400/90 border-t border-slate-800/60">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      <strong>{subscription.trial_days_remaining ?? 7} days</strong> remaining in your free trial
                    </span>
                  </div>
                )}

                {subscription?.status === 'active' && (
                  <div className="space-y-1.5 pt-3 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        Paid via {subscription.payment_method_brand || 'Card'} ending in ••••{' '}
                        {subscription.payment_method_last4 || '4081'}
                      </span>
                    </div>
                    {subscription.subscription_end && (
                      <div className="text-slate-400 text-[11px] pl-6">
                        Next billing cycle: {new Date(subscription.subscription_end).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Supported Payment Channels */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Supported Paystack Channels
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <CreditCard className="w-4 h-4 text-indigo-400" />
                    <span className="text-slate-300">Debit / Credit</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">Bank Transfer</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    <span className="text-slate-300">USSD &amp; QR</span>
                  </div>
                </div>

                {/* Test Mode Card Helper */}
                <div className="mt-2 p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] space-y-1">
                  <div className="font-semibold text-indigo-300 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Paystack Test Card Available</span>
                  </div>
                  <div className="text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10px]">
                    <span>Card: <strong className="text-slate-200">4084 0840 8408 4081</strong></span>
                    <span>CVV: <strong className="text-slate-200">408</strong></span>
                    <span>PIN: <strong className="text-slate-200">1111</strong></span>
                    <span>OTP: <strong className="text-slate-200">123456</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {subscription?.status !== 'active' ? (
                <div className="space-y-3">
                  <button
                    onClick={handlePaystackInit}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <Zap className="w-4 h-4" />
                    <span>{loading ? 'Initializing Paystack Gateway...' : 'Upgrade Now — ₦12,500 / month'}</span>
                  </button>

                  {checkoutData?.authorization_url && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="text-xs text-slate-300 flex items-center justify-between">
                        <span>Checkout URL Ready:</span>
                        <a
                          href={checkoutData.authorization_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline flex items-center space-x-1"
                        >
                          <span>Open Paystack Checkout</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={manualRef || checkoutData.reference}
                          onChange={(e) => setManualRef(e.target.value)}
                          placeholder="Reference e.g. TFLOW_..."
                          className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                        />
                        <button
                          onClick={handleManualVerify}
                          disabled={loading}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                        >
                          Verify Payment
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl space-y-2 text-center">
                  <div className="text-xs font-semibold text-emerald-400">Pro Plan Active</div>
                  <p className="text-[11px] text-slate-400">
                    Your workspace has full access to PostgreSQL sync, multi-assignees, and automated cron triggers.
                  </p>
                  <button
                    onClick={handlePaystackInit}
                    disabled={loading}
                    className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Simulate Renewal / Test Charge</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Logged in Supabase `payment_transactions`</span>
                <button
                  onClick={loadTransactions}
                  className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingTransactions ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No payment transactions recorded yet. Initialize a payment to test!
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-white text-[11px]">{tx.reference}</div>
                        <div className="text-slate-400 text-[10px]">
                          {tx.channel?.toUpperCase() || 'CARD'} • {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">₦{Number(tx.amount).toLocaleString()}</div>
                        <span className="inline-block text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="font-semibold text-white">Paystack Webhook Configuration</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Paystack sends real-time notifications for automated subscription renewals and card charges to your webhook endpoint.
                </p>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 font-medium">Your Live Webhook URL:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-indigo-300 select-all"
                    />
                    <button
                      onClick={copyWebhookToClipboard}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition flex items-center space-x-1 text-xs shrink-0"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="font-semibold text-white text-xs">How to connect your Paystack API Keys</div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                  <li>Log in to your <strong className="text-white">Paystack Dashboard</strong> (dashboard.paystack.com).</li>
                  <li>Navigate to <strong className="text-white">Settings → API Keys &amp; Webhooks</strong>.</li>
                  <li>Copy your <strong className="text-white">Secret Key</strong> (`sk_test_...` or `sk_live_...`) and <strong className="text-white">Public Key</strong> (`pk_test_...` or `pk_live_...`).</li>
                  <li>Paste the Webhook URL above into the <strong className="text-white">Webhook URL</strong> field in Paystack.</li>
                  <li>Provide your keys in your environment variables:
                    <div className="mt-1 font-mono p-2 bg-slate-900 rounded border border-slate-800 text-indigo-300">
                      PAYSTACK_SECRET_KEY="sk_test_..."<br />
                      PAYSTACK_PUBLIC_KEY="pk_test_..."
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

