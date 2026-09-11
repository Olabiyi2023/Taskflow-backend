import React, { useState } from 'react';
import {
  Database,
  Bell,
  Clock,
  CheckCircle2,
  Users,
  Terminal,
  RefreshCw,
  ExternalLink,
  User as UserIcon,
  LogIn,
  Mail,
} from 'lucide-react';
import { SupabaseStatus, SubscriptionInfo, NotificationItem, User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  supabaseStatus: SupabaseStatus | null;
  subscription: SubscriptionInfo | null;
  notifications: NotificationItem[];
  unreadCount: number;
  onOpenAuthModal: (mode?: 'login' | 'register' | 'profile') => void;
  onOpenSupabaseModal: () => void;
  onOpenBillingModal: () => void;
  onOpenTeamModal: () => void;
  onOpenApiExplorer: () => void;
  onOpenEmailAlertsModal: () => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  supabaseStatus,
  subscription,
  notifications,
  unreadCount,
  onOpenAuthModal,
  onOpenSupabaseModal,
  onOpenBillingModal,
  onOpenTeamModal,
  onOpenApiExplorer,
  onOpenEmailAlertsModal,
  onMarkNotificationRead,
  onMarkAllRead,
  onRefresh,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const isSupabaseConnected = supabaseStatus?.configured && supabaseStatus?.connected;

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
            TF
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-lg tracking-tight">TaskFlow</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 font-medium border border-indigo-700/50">
                Backend Hub
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {currentUser?.workspace_name || 'Acme West Africa Operations'}
            </p>
          </div>
        </div>

        {/* Quick Actions & Status Badges */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Supabase Status Pill */}
          <button
            id="supabase-status-badge"
            onClick={onOpenSupabaseModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isSupabaseConnected
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/50'
                : 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50 hover:bg-emerald-900/40'
            }`}
            title="Click to view Supabase connection details and SQL schema"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Supabase:</span>
            <span>{isSupabaseConnected ? 'Connected' : 'Ready to Connect'}</span>
          </button>

          {/* Trial / Billing Badge */}
          <button
            id="billing-badge-btn"
            onClick={onOpenBillingModal}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              subscription?.status === 'active'
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/60'
                : 'bg-amber-950/50 text-amber-300 border-amber-700/60 hover:bg-amber-900/50'
            }`}
            title="View Paystack Billing & Free Trial Details"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plan:</span>
            <span>
              {subscription?.status === 'active'
                ? 'Pro Active'
                : `${subscription?.trial_days_remaining ?? 7}d Trial`}
            </span>
          </button>

          {/* Team Directory Button */}
          <button
            id="team-btn"
            onClick={onOpenTeamModal}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Team</span>
          </button>

          {/* API Console Button */}
          <button
            id="api-explorer-btn"
            onClick={onOpenApiExplorer}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">API Console</span>
          </button>

          {/* Email Alerts Button */}
          <button
            id="email-alerts-btn"
            onClick={onOpenEmailAlertsModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Resend & SendGrid Email Alerts Pipeline"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Email Alerts</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              id="notifications-bell-btn"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">Notifications</span>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenEmailAlertsModal();
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 ml-2 transition"
                      title="Manage email notification alerts"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Email Hub</span>
                    </button>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        onMarkAllRead();
                        setShowNotifications(false);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onMarkNotificationRead(n.id)}
                        className={`p-3 text-xs transition cursor-pointer hover:bg-slate-800/70 ${
                          !n.is_read ? 'bg-slate-800/40' : 'opacity-70'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-semibold text-slate-200">{n.title}</span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          )}
                        </div>
                        <p className="text-slate-400 mt-1">{n.message}</p>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sync / Refresh Button */}
          <button
            id="refresh-all-btn"
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Refresh All Backend Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Account / Profile Button */}
          {currentUser ? (
            <button
              id="user-profile-btn"
              onClick={() => onOpenAuthModal('profile')}
              className="flex items-center space-x-2 p-1.5 pl-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs transition"
              title={`Logged in as ${currentUser.name} (${currentUser.role})`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
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
              <span className="hidden md:inline font-medium text-slate-200 max-w-[100px] truncate">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              id="signin-btn"
              onClick={() => onOpenAuthModal('login')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
