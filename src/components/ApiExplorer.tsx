import React, { useState } from 'react';
import { Terminal, X, Play, Copy, Check, Sparkles } from 'lucide-react';
import { getAuthToken } from '../services/api';

interface ApiExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EndpointPreset {
  name: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  body?: string;
}

const PRESETS: EndpointPreset[] = [
  {
    name: 'Dashboard Stats',
    method: 'GET',
    path: '/api/v1/dashboard/stats',
  },
  {
    name: 'List Tasks (with filters)',
    method: 'GET',
    path: '/api/v1/tasks?limit=10',
  },
  {
    name: 'Create Task',
    method: 'POST',
    path: '/api/v1/tasks',
    body: JSON.stringify(
      {
        title: 'Automate Database Backup and Replication',
        description: 'Implement daily automated WAL archiving to storage bucket',
        priority: 'High',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      },
      null,
      2
    ),
  },
  {
    name: 'Team Directory',
    method: 'GET',
    path: '/api/v1/team',
  },
  {
    name: 'Billing Subscription',
    method: 'GET',
    path: '/api/v1/billing/subscription',
  },
  {
    name: 'Paystack Initialize',
    method: 'POST',
    path: '/api/v1/billing/paystack/initialize',
    body: JSON.stringify({ amount: 12500, plan: 'monthly' }, null, 2),
  },
  {
    name: 'List Task Attachments',
    method: 'GET',
    path: '/api/v1/tasks/task-default-1/attachments',
  },
  {
    name: 'Upload Attachment (Supabase)',
    method: 'POST',
    path: '/api/v1/tasks/task-default-1/attachments',
    body: JSON.stringify(
      {
        file_name: 'cloud_architecture_spec.pdf',
        file_type: 'application/pdf',
        file_size: 245000,
        file_base64: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr...',
      },
      null,
      2
    ),
  },
  {
    name: 'Supabase Status Check',
    method: 'GET',
    path: '/api/v1/system/supabase-status',
  },
  {
    name: 'Email Config (Resend/SendGrid)',
    method: 'GET',
    path: '/api/v1/notifications/email-config',
  },
  {
    name: 'Email Audit Logs',
    method: 'GET',
    path: '/api/v1/notifications/email-logs',
  },
  {
    name: 'Send Test Assignment Email',
    method: 'POST',
    path: '/api/v1/notifications/test-email',
    body: JSON.stringify(
      {
        email: 'team@taskflow.dev',
        type: 'task_assigned',
      },
      null,
      2
    ),
  },
  {
    name: 'Send Test Deadline Email',
    method: 'POST',
    path: '/api/v1/notifications/test-email',
    body: JSON.stringify(
      {
        email: 'team@taskflow.dev',
        type: 'deadline_approaching',
      },
      null,
      2
    ),
  },
  {
    name: 'Trigger Deadline Email Alerts',
    method: 'POST',
    path: '/api/v1/notifications/trigger-deadline-alerts',
  },
  {
    name: 'Notification Preferences',
    method: 'GET',
    path: '/api/v1/notifications/preferences',
  },
  {
    name: 'Trigger Cron Scanners',
    method: 'POST',
    path: '/api/v1/system/cron/run-scanners',
  },
];

export const ApiExplorer: React.FC<ApiExplorerProps> = ({ isOpen, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'>('GET');
  const [path, setPath] = useState('/api/v1/dashboard/stats');
  const [requestBody, setRequestBody] = useState('');
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string>('');
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: EndpointPreset) => {
    setSelectedMethod(preset.method);
    setPath(preset.path);
    setRequestBody(preset.body || '');
    setResponseBody('');
    setResponseStatus(null);
    setLatency(null);
  };

  const handleExecute = async () => {
    setLoading(true);
    const start = performance.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        headers['x-demo-user'] = 'true';
      }

      const options: RequestInit = {
        method: selectedMethod,
        headers,
      };

      if (['POST', 'PUT', 'PATCH'].includes(selectedMethod) && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(path, options);
      const duration = Math.round(performance.now() - start);
      setLatency(duration);
      setResponseStatus(res.status);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponseBody(JSON.stringify(json, null, 2));
      } catch {
        setResponseBody(text);
      }
    } catch (err: any) {
      setResponseStatus(500);
      setResponseBody(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(responseBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white">Live Backend REST API Explorer</h2>
              <p className="text-xs text-slate-400">
                Execute live HTTP calls against the Express + Supabase backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Preset Buttons */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Endpoint Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => handleSelectPreset(p)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    path === p.path && selectedMethod === p.method
                      ? 'bg-indigo-600 text-white border-indigo-500 font-semibold'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-75 mr-1.5">{p.method}</span>
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Request Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PATCH">PATCH</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>

            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/api/v1/..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />

            <button
              onClick={handleExecute}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? 'Executing...' : 'Send Request'}</span>
            </button>
          </div>

          {/* Request Body (if POST/PUT/PATCH) */}
          {['POST', 'PUT', 'PATCH'].includes(selectedMethod) && (
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                JSON Request Body
              </span>
              <textarea
                rows={4}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                placeholder='{ "key": "value" }'
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Response Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  HTTP Response
                </span>
                {responseStatus !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    Status: {responseStatus}
                  </span>
                )}
                {latency !== null && (
                  <span className="text-[10px] font-mono text-slate-500">{latency}ms</span>
                )}
              </div>

              {responseBody && (
                <button
                  onClick={handleCopy}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-emerald-400 h-64 overflow-y-auto leading-relaxed">
              {responseBody || '// Output will appear here after clicking "Send Request"...'}
            </pre>
          </div>
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
