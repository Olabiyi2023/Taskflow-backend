import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Building,
  Users,
  Eye,
  EyeOff,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { User, TeamRole } from '../types';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: (user: User) => void;
  onLogout: () => void;
  initialMode?: 'login' | 'register' | 'profile';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'profile'>(
    currentUser ? 'profile' : initialMode
  );

  // Form states - Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Form states - Register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regWorkspaceName, setRegWorkspaceName] = useState('');
  const [regCompanySize, setRegCompanySize] = useState('1-10 employees');
  const [regRole, setRegRole] = useState<TeamRole>('Business Owner');

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setSuccessMessage('');
      if (currentUser) {
        setMode('profile');
      } else {
        setMode(initialMode);
      }
    }
  }, [isOpen, currentUser, initialMode]);

  if (!isOpen) return null;

  const handleFillDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setErrorMessage('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please provide both email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      if (res.success && res.data?.user) {
        setSuccessMessage(`Welcome back, ${res.data.user.name}!`);
        setTimeout(() => {
          onAuthSuccess(res.data!.user);
          onClose();
        }, 600);
      } else {
        setErrorMessage(res.error?.message || 'Invalid email or password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Name, email, and password are required');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password should be at least 6 characters long');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        workspace_name: regWorkspaceName.trim() || `${regName.trim()}'s Workspace`,
        company_size: regCompanySize,
        role: regRole,
      });

      if (res.success && res.data?.user) {
        setSuccessMessage(`Workspace "${res.data.user.workspace_name || 'My Workspace'}" created with 7-Day Pro Trial!`);
        setTimeout(() => {
          onAuthSuccess(res.data!.user);
          onClose();
        }, 800);
      } else {
        setErrorMessage(res.error?.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    api.logout();
    onLogout();
    setSuccessMessage('Logged out. Reverting to default workspace session.');
    setTimeout(() => {
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {mode === 'profile'
                  ? 'User Profile & Account'
                  : mode === 'register'
                  ? 'Create New Account & Workspace'
                  : 'Sign In to TaskFlow'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {mode === 'profile'
                  ? 'Manage your session and workspace credentials'
                  : 'PostgreSQL-backed authentication with JWT tokens'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switch Tabs (if not currently inspecting a signed-in profile) */}
        {mode !== 'profile' && (
          <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-medium">
            <button
              onClick={() => {
                setMode('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-4 border-b-2 flex items-center justify-center space-x-1.5 transition ${
                mode === 'login'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-3 px-4 border-b-2 flex items-center justify-center space-x-1.5 transition ${
                mode === 'register'
                  ? 'border-indigo-500 text-indigo-300 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Workspace</span>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Quick Demo Fill Helper */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Quick Demo Login</span>
                  <span className="text-[10px] text-indigo-400 font-mono">Default Seed</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400 truncate mr-2">
                    <span className="text-slate-200 font-medium">Sarah Adebayo</span> (sarah.adebayo@...)
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleFillDemo('sarah.adebayo@acmewestafrica.com', 'SecurePassword123!')
                    }
                    className="px-2.5 py-1 bg-indigo-950/70 hover:bg-indigo-900/80 border border-indigo-800/60 text-indigo-300 text-[11px] font-medium rounded-lg transition shrink-0"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="sarah.adebayo@acmewestafrica.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-300 font-medium">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-400">Don't have a workspace yet? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage('');
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:underline"
                >
                  Register here
                </button>
              </div>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              {/* Pro Trial Notice */}
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 flex items-center space-x-2.5">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] text-indigo-200">
                  Includes a free <strong>7-Day Pro Trial</strong> with full PostgreSQL sync &amp; multi-tenant workspace isolation.
                </span>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Abass Olabiyi"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Work Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="abass@mycompany.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Workspace Name & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Workspace Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={regWorkspaceName}
                      onChange={(e) => setRegWorkspaceName(e.target.value)}
                      placeholder="Lagos Logistics HQ"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300 font-medium">Your Role</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as TeamRole)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Business Owner">Business Owner</option>
                    <option value="Operations Manager">Operations Manager</option>
                    <option value="Project Lead">Project Lead</option>
                    <option value="Team Member">Team Member</option>
                  </select>
                </div>
              </div>

              {/* Company Size */}
              <div className="space-y-1">
                <label className="text-xs text-slate-300 font-medium">Company Size</label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <select
                    value={regCompanySize}
                    onChange={(e) => setRegCompanySize(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="1-10 employees">1 - 10 employees (Startup)</option>
                    <option value="11-50 employees">11 - 50 employees (Growing Business)</option>
                    <option value="51-200 employees">51 - 200 employees (Mid-Market)</option>
                    <option value="201+ employees">201+ employees (Enterprise)</option>
                  </select>
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/25 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Workspace...' : 'Create Account & Start Free Trial'}</span>
              </button>

              <div className="text-center pt-1">
                <span className="text-xs text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:underline"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* MODE: PROFILE (ACTIVE USER SESSION) */}
          {mode === 'profile' && currentUser && (
            <div className="space-y-5">
              {/* Profile Badge Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center space-x-3.5">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
                  style={{ backgroundColor: currentUser.avatar_color || '#4F46E5' }}
                >
                  {currentUser.name
                    ? currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white truncate">{currentUser.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Workspace: <strong className="text-slate-300">{currentUser.workspace_name || 'Acme West Africa'}</strong>
                  </p>
                </div>
              </div>

              {/* Session / Authentication Details */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="font-semibold text-slate-200">Current Session Details</div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500 block">Auth Mechanism:</span>
                    <span className="text-slate-300 font-mono">JWT Bearer (1h TTL)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Database Storage:</span>
                    <span className="text-emerald-400 font-medium">Supabase PostgreSQL</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account Created:</span>
                    <span className="text-slate-300">
                      {currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Workspace ID:</span>
                    <span className="text-slate-300 font-mono truncate block" title={currentUser.workspace_id}>
                      {currentUser.workspace_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => setMode('login')}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
