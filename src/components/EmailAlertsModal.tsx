import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Radio,
  ExternalLink,
  ShieldCheck,
  Check,
  Flame,
} from 'lucide-react';
import { api } from '../services/api';
import { EmailConfig, EmailLogEntry, NotificationPreferences, User } from '../types';

interface EmailAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAlertSent?: () => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAlertSent,
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'logs' | 'preferences'>('tester');
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Test sender state
  const [testEmail, setTestEmail] = useState(currentUser?.email || 'abassolabiyi3@gmail.com');
  const [testType, setTestType] = useState<'task_assigned' | 'deadline_approaching' | 'task_overdue'>('task_assigned');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; provider?: string } | null>(null);

  // Scanner trigger state
  const [runningScanners, setRunningScanners] = useState(false);
  const [scannerResult, setScannerResult] = useState<string | null>(null);

  // Prefs update state
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSavedMessage, setPrefsSavedMessage] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (currentUser?.email) {
        setTestEmail(currentUser.email);
      }
    }
  }, [isOpen, currentUser]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, logsRes, prefsRes] = await Promise.all([
        api.getEmailConfig(),
        api.getEmailLogs(),
        api.getNotificationPreferences(),
      ]);

      if (cfgRes.data) setConfig(cfgRes.data);
      if (logsRes.data) setLogs(logsRes.data);
      if (prefsRes.data) setPreferences(prefsRes.data);
    } catch (err) {
      console.error('Error loading email data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogsOnly = async () => {
    setRefreshingLogs(true);
    try {
      const res = await api.getEmailLogs();
      if (res.data) setLogs(res.data);
    } finally {
      setRefreshingLogs(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;

    setSendingTest(true);
    setSendResult(null);

    try {
      const res = await api.sendTestEmail(testEmail, testType);
      setSendResult({
        success: res.success,
        message: res.message || (res.success ? 'Email dispatched successfully' : 'Failed to send alert'),
        provider: res.data?.provider,
      });

      // Refresh log entries
      await refreshLogsOnly();
      if (onAlertSent) onAlertSent();
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Error executing email test',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRunDeadlineScanners = async () => {
    setRunningScanners(true);
    setScannerResult(null);
    try {
      const res = await api.triggerDeadlineAlerts();
      if (res.success) {
        setScannerResult(res.message || 'Scanners executed successfully');
        await refreshLogsOnly();
        if (onAlertSent) onAlertSent();
      } else {
        setScannerResult('Failed to trigger background scanners');
      }
    } catch (err: any) {
      setScannerResult(`Scanner execution error: ${err.message}`);
    } finally {
      setRunningScanners(false);
    }
  };

  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    if (!preferences) return;
    const nextVal = !preferences[key];
    const updated = { ...preferences, [key]: nextVal };
    setPreferences(updated);

    setSavingPrefs(true);
    try {
      await api.updateNotificationPreferences({ [key]: nextVal });
      setPrefsSavedMessage(true);
      setTimeout(() => setPrefsSavedMessage(false), 2500);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Email Notification Pipeline
                {config?.configured ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-semibold border border-emerald-700/60 uppercase">
                    Live ({config.activeProvider})
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold border border-amber-800/40 uppercase">
                    Simulation Ready
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Resend & SendGrid assignment and deadline alert dispatch engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Status Ribbon */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Active Provider:</span>
              <span className="font-semibold text-slate-200 capitalize">
                {config?.activeProvider === 'resend'
                  ? 'Resend API'
                  : config?.activeProvider === 'sendgrid'
                  ? 'SendGrid API'
                  : 'Simulated Engine (Dev/Test)'}
              </span>
            </div>
            <div className="hidden sm:flex items-center space-x-1.5">
              <span className="text-slate-400">Sender:</span>
              <code className="text-[11px] text-indigo-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {config?.fromEmail || 'TaskFlow <onboarding@resend.dev>'}
              </code>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                config?.hasResendKey
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config?.hasResendKey ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              Resend {config?.hasResendKey ? 'Active' : 'Unset'}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                config?.hasSendGridKey
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                  : 'bg-slate-800/80 text-slate-400 border border-slate-700/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${config?.hasSendGridKey ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
              SendGrid {config?.hasSendGridKey ? 'Active' : 'Unset'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-5 shrink-0">
          <button
            onClick={() => setActiveTab('tester')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'tester'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            Send Test Alert
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Delivery Audit Logs
            {logs.length > 0 && (
              <span className="ml-1 text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full">
                {logs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Notification Settings
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: TESTER */}
          {activeTab === 'tester' && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    How TaskFlow Dispatches Email Alerts:
                  </span>
                  <span className="text-[11px] text-slate-400">Assignment & Deadline Automation</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  When a task is created or assigned to a team member, TaskFlow dispatches an immediate 
                  <strong className="text-white"> Task Assignment Email</strong>. In the background, automated scanners detect approaching deadlines (24-hour advance warning) and overdue tasks, dispatching branded alerts directly to assignees.
                </p>
                {!config?.configured && (
                  <p className="text-amber-400/90 text-[11px] pt-1">
                    Tip: When <code className="text-indigo-300">RESEND_API_KEY</code> or <code className="text-indigo-300">SENDGRID_API_KEY</code> is not provided in Settings, alerts run in simulation mode and are recorded in the audit logs below.
                  </p>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSendTestEmail} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Recipient Email Address
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    required
                    placeholder="e.g. your-email@example.com"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Defaults to your workspace email account.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Alert Template Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label
                      onClick={() => setTestType('task_assigned')}
                      className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition ${
                        testType === 'task_assigned'
                          ? 'bg-indigo-950/40 border-indigo-500/80 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-slate-200">Task Assigned</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            testType === 'task_assigned' ? 'border-indigo-400 bg-indigo-500' : 'border-slate-600'
                          }`}
                        >
                          {testType === 'task_assigned' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Immediate alert dispatched when a member is assigned to a task.
                      </p>
                    </label>

                    <label
                      onClick={() => setTestType('deadline_approaching')}
                      className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition ${
                        testType === 'deadline_approaching'
                          ? 'bg-amber-950/40 border-amber-500/80 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-slate-200">Due Tomorrow</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            testType === 'deadline_approaching' ? 'border-amber-400 bg-amber-500' : 'border-slate-600'
                          }`}
                        >
                          {testType === 'deadline_approaching' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        24-hour advance deadline warning for approaching milestones.
                      </p>
                    </label>

                    <label
                      onClick={() => setTestType('task_overdue')}
                      className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition ${
                        testType === 'task_overdue'
                          ? 'bg-rose-950/40 border-rose-500/80 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-xs text-slate-200">Task Overdue</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            testType === 'task_overdue' ? 'border-rose-400 bg-rose-500' : 'border-slate-600'
                          }`}
                        >
                          {testType === 'task_overdue' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Urgent escalation alert dispatched when due date has passed.
                      </p>
                    </label>
                  </div>
                </div>

                {sendResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      sendResult.success
                        ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                        : 'bg-rose-950/50 border-rose-800 text-rose-300'
                    }`}
                  >
                    {sendResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold block">{sendResult.message}</span>
                      {sendResult.provider && (
                        <span className="text-[11px] opacity-80 mt-0.5 block">
                          Provider: {sendResult.provider.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={sendingTest}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {sendingTest ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching Email Alert...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Email Alert</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleRunDeadlineScanners}
                    disabled={runningScanners}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                    title="Run background deadline scanner now across all tasks"
                  >
                    {runningScanners ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        <span>Run Scanners Now</span>
                      </>
                    )}
                  </button>
                </div>

                {scannerResult && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{scannerResult}</span>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">Dispatched Email Audit Trail</h3>
                  <p className="text-[11px] text-slate-500">Record of outgoing alerts and their delivery status</p>
                </div>
                <button
                  onClick={refreshLogsOnly}
                  disabled={refreshingLogs}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-950 border border-slate-800 text-slate-500 text-xs">
                  No email alerts dispatched yet. Send a test email or assign a task to view the audit trail.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {logs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition text-xs space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-200 block">{item.subject}</span>
                          <span className="text-slate-400 text-[11px]">To: {item.to}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              item.status === 'delivered'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : item.status === 'simulated'
                                ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                            {item.provider}
                          </span>
                        </div>
                      </div>

                      {item.error && (
                        <p className="text-[11px] text-rose-400 bg-rose-950/30 p-2 rounded border border-rose-900/40">
                          Error: {item.error}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                        <span>Type: {item.type.replace('_', ' ')}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREFERENCES */}
          {activeTab === 'preferences' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Notification Preferences</h3>
                <p className="text-[11px] text-slate-500">
                  Control which operational events trigger email alerts for your account
                </p>
              </div>

              {prefsSavedMessage && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              <div className="divide-y divide-slate-800/80 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Task Assignment Alerts</span>
                    <span className="text-[11px] text-slate-400">
                      Send an email alert immediately when a new task is assigned or reassigned to you
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePref('task_assignments')}
                    disabled={savingPrefs}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      preferences?.task_assignments ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        preferences?.task_assignments ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Approaching Deadline Alerts</span>
                    <span className="text-[11px] text-slate-400">
                      Send advance email reminder 24 hours before your assigned tasks are due
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePref('upcoming_deadlines')}
                    disabled={savingPrefs}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      preferences?.upcoming_deadlines ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        preferences?.upcoming_deadlines ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Overdue Task Alerts</span>
                    <span className="text-[11px] text-slate-400">
                      Send urgent email escalation alerts when an active task crosses its due date
                    </span>
                  </div>
                  <button
                    onClick={() => handleTogglePref('overdue_tasks')}
                    disabled={savingPrefs}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      preferences?.overdue_tasks ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                        preferences?.overdue_tasks ? 'right-1' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>TaskFlow Alerts &bull; Resend / SendGrid Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
