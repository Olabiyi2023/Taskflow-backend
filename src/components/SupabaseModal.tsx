import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Code2,
} from 'lucide-react';
import { SupabaseStatus } from '../types';
import { api } from '../services/api';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseStatus | null;
  onRefreshStatus: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
}) => {
  const [schemaSql, setSchemaSql] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (isOpen && !schemaSql) {
      api.getSupabaseSchema().then((res) => {
        if (res.data?.sql) {
          setSchemaSql(res.data.sql);
        }
      });
    }
  }, [isOpen, schemaSql]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    await onRefreshStatus();
    setTesting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Supabase Database Integration</h2>
              <p className="text-xs text-slate-400">
                Connect your Supabase project to the TaskFlow Express backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Connection Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start space-x-3 ${
              status?.connected
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                : 'bg-indigo-950/30 border-indigo-800/40 text-indigo-200'
            }`}
          >
            {status?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <div className="font-semibold text-sm text-white flex items-center justify-between">
                <span>
                  {status?.connected ? 'Connected to Supabase' : 'Supabase Ready to Connect'}
                </span>
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                  <span>Test Connection</span>
                </button>
              </div>
              <p className="mt-1 text-slate-300">
                {status?.message ||
                  'The backend is ready to route all queries through Supabase PostgreSQL tables.'}
              </p>
              {status?.url && (
                <div className="mt-2 font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800 text-slate-300">
                  Target Endpoint: {status.url}
                </div>
              )}
            </div>
          </div>

          {/* Quick Setup Guide */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              3-Step Connection Guide
            </h3>
            <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Open your project at{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center"
                >
                  supabase.com/dashboard <ExternalLink className="w-3 h-3 ml-0.5" />
                </a>{' '}
                and go to the <strong>SQL Editor</strong>.
              </li>
              <li>
                Click <strong>"Copy Schema SQL"</strong> below, paste it into the editor, and click{' '}
                <strong>Run</strong> to create all tables (workspaces, users, tasks, team, etc.).
              </li>
              <li>
                In your Supabase <strong>Project Settings → API</strong>, copy your{' '}
                <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">Project URL</code> and{' '}
                <code className="bg-slate-800 px-1 py-0.5 rounded text-indigo-300">service_role / anon key</code>,
                then add them to your environment variables (<code className="bg-slate-800 px-1 py-0.5 rounded">SUPABASE_URL</code> & <code className="bg-slate-800 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code>).
              </li>
            </ol>
          </div>

          {/* Schema SQL Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span>PostgreSQL / Supabase DDL Script (10 Tables, Types &amp; Indexes)</span>
              </span>
              <button
                id="copy-sql-btn"
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Schema SQL'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-emerald-400/90 h-64 overflow-y-auto leading-relaxed">
                {schemaSql || '-- Loading SQL schema from backend...'}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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
