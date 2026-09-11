import React, { useState, useRef } from 'react';
import { X, Plus, Calendar, AlertCircle, Paperclip, UploadCloud, File, Trash2, HardDrive } from 'lucide-react';
import { TeamMember, TaskPriority, TaskStatus } from '../types';

interface CreateTaskModalProps {
  isOpen: boolean;
  teamMembers: TeamMember[];
  onClose: () => void;
  onCreateTask: (task: {
    title: string;
    description: string;
    priority: TaskPriority;
    status: TaskStatus;
    due_date: string;
    assigned_to: string;
    attachments?: Array<{
      file_name: string;
      file_type: string;
      file_size: number;
      file_base64: string;
    }>;
  }) => Promise<boolean>;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  teamMembers,
  onClose,
  onCreateTask,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [assignedTo, setAssignedTo] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFilesAdded = (files: FileList | File[]) => {
    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.size > 10 * 1024 * 1024) {
        setError(`File "${f.name}" exceeds the 10MB limit.`);
        continue;
      }
      newFiles.push(f);
    }
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const attachmentsPayload = [];
      for (const file of selectedFiles) {
        const base64 = await readFileAsBase64(file);
        attachmentsPayload.push({
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          file_base64: base64,
        });
      }

      const success = await onCreateTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        due_date: dueDate,
        assigned_to: assignedTo,
        attachments: attachmentsPayload,
      });

      setSubmitting(false);
      if (success) {
        setTitle('');
        setDescription('');
        setSelectedFiles([]);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div>
            <h2 className="text-base font-bold text-white">Create New Task</h2>
            <p className="text-[11px] text-slate-400">Add deliverables, set due dates, and attach assets</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Audit PostgreSQL security rules & indices"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key deliverables, acceptance criteria, or links..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Due Date & Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Due Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assignee</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* File Attachments (Supabase Storage) */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                <span>Attach Files (Supabase Storage)</span>
              </label>
              <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                <HardDrive className="w-3 h-3" />
                <span>task-attachments</span>
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files) handleFilesAdded(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-3 text-center cursor-pointer transition flex items-center justify-center space-x-2.5 ${
                isDragOver
                  ? 'border-indigo-400 bg-indigo-950/30'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/30'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files && handleFilesAdded(e.target.files)}
                multiple
                className="hidden"
              />
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400">
                <span className="text-indigo-400 font-medium">Click to attach</span> or drop files here (PDF, Images, Docs)
              </span>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto">
                {selectedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-300"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <File className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({(f.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(idx)}
                      className="text-slate-500 hover:text-rose-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center space-x-1.5"
            >
              {submitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Uploading & Creating...</span>
                </>
              ) : (
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
