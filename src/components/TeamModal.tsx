import React, { useState } from 'react';
import { X, UserPlus, Users, Mail, Phone, Shield } from 'lucide-react';
import { TeamMember, TeamRole } from '../types';
import { api } from '../services/api';

interface TeamModalProps {
  isOpen: boolean;
  teamMembers: TeamMember[];
  onClose: () => void;
  onRefreshTeam: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  teamMembers,
  onClose,
  onRefreshTeam,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<TeamRole>('Developer');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    await api.addTeamMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
    });
    setSubmitting(false);

    setName('');
    setEmail('');
    setPhone('');
    setShowAddForm(false);
    onRefreshTeam();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Team Directory &amp; Roles</h2>
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {teamMembers.length} Workspace Member{teamMembers.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : 'Invite Member'}</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddMember}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              <div className="text-xs font-bold text-white">New Member Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Phone (e.g., +234 803 123 4567)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeamRole)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Business Owner">Business Owner</option>
                  <option value="Project Coordinator">Project Coordinator</option>
                  <option value="Team Lead">Team Lead</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">Designer</option>
                  <option value="Operations Specialist">Operations Specialist</option>
                  <option value="QA Specialist">QA Specialist</option>
                </select>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
                >
                  {submitting ? 'Saving...' : 'Add to Workspace'}
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          <div className="divide-y divide-slate-800/60">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-lg transition"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                    style={{ backgroundColor: member.avatar_color || '#4F46E5' }}
                  >
                    {member.name.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-white">{member.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {member.role}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3 mt-0.5">
                      <span className="flex items-center space-x-1">
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>{member.email}</span>
                      </span>
                      {member.phone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{member.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Workload */}
                <div className="text-right">
                  <span className="text-xs font-semibold text-slate-200">
                    {member.active_tasks_count ?? 0}
                  </span>
                  <span className="text-[10px] text-slate-500 block">active tasks</span>
                </div>
              </div>
            ))}
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
