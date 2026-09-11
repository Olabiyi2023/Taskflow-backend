import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Trash2,
  Paperclip,
  UploadCloud,
  File,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Eye,
  AlertCircle,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { Task, TaskComment, TaskAttachment } from '../types';
import { api } from '../services/api';

interface TaskCommentsModalProps {
  task: Task | null;
  isOpen: boolean;
  initialTab?: 'comments' | 'attachments';
  onClose: () => void;
  onAttachmentChange?: () => void;
}

export const TaskCommentsModal: React.FC<TaskCommentsModalProps> = ({
  task,
  isOpen,
  initialTab = 'comments',
  onClose,
  onAttachmentChange,
}) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments'>(initialTab);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen && task) {
      setActiveTab(initialTab);
      loadComments();
      loadAttachments();
      setUploadError(null);
    }
  }, [isOpen, task, initialTab]);

  const loadComments = async () => {
    if (!task) return;
    setLoadingComments(true);
    const res = await api.getComments(task.id);
    if (res.data) {
      setComments(res.data);
    }
    setLoadingComments(false);
  };

  const loadAttachments = async () => {
    if (!task) return;
    setLoadingAttachments(true);
    const res = await api.getAttachments(task.id);
    if (res.data) {
      setAttachments(res.data);
    }
    setLoadingAttachments(false);
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;

    setSubmittingComment(true);
    const res = await api.postComment(task.id, newComment.trim());
    setSubmittingComment(false);

    if (res.data) {
      setComments((prev) => [...prev, res.data!]);
      setNewComment('');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task) return;
    await api.deleteComment(task.id, commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  // Convert File to Base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!task || files.length === 0) return;
    setUploadError(null);
    setUploadingFile(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 10MB limit validation
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`"${file.name}" exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB)`);
          continue;
        }

        const base64Data = await readFileAsBase64(file);

        const res = await api.uploadAttachment(task.id, {
          file_name: file.name,
          file_type: file.type || 'application/octet-stream',
          file_size: file.size,
          file_base64: base64Data,
        });

        if (res.success && res.data) {
          setAttachments((prev) => [res.data!, ...prev]);
          if (onAttachmentChange) onAttachmentChange();
        } else {
          setUploadError(res.error?.message || 'Failed to upload attachment to Supabase Storage');
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'File upload error occurred');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!task) return;
    const confirmed = window.confirm('Are you sure you want to delete this file attachment?');
    if (!confirmed) return;

    const res = await api.deleteAttachment(task.id, attachmentId);
    if (res.success) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      if (onAttachmentChange) onAttachmentChange();
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (type: string, name: string) => {
    return (
      type?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)
    );
  };

  const isPdfFile = (type: string, name: string) => {
    return type === 'application/pdf' || /\.pdf$/i.test(name);
  };

  if (!isOpen || !task) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
            <div className="flex flex-col max-w-[80%]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Task Collaboration & Assets
              </span>
              <h2 className="text-base font-bold text-white truncate mt-0.5" title={task.title}>
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              id="btn-close-task-modal"
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 px-6 bg-slate-950/20">
            <button
              id="tab-discussion"
              onClick={() => setActiveTab('comments')}
              className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'comments'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Discussion</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {comments.length}
              </span>
            </button>

            <button
              id="tab-attachments"
              onClick={() => setActiveTab('attachments')}
              className={`flex items-center space-x-2 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                activeTab === 'attachments'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Paperclip className="w-4 h-4" />
              <span>Files & Attachments</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                {attachments.length}
              </span>
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'comments' ? (
            /* COMMENTS TAB */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {loadingComments ? (
                  <div className="text-center py-12 text-xs text-slate-500 flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Loading discussion...</span>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">No comments yet</p>
                    <p className="text-[11px] text-slate-500">
                      Be the first to post a status update or team coordination note.
                    </p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 transition hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span
                            className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                            style={{
                              backgroundColor: comment.author_avatar_color || '#4F46E5',
                            }}
                          >
                            {comment.author_name.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="text-xs font-semibold text-white">
                            {comment.author_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {comment.author_role}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] text-slate-500">
                            {new Date(comment.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-slate-600 hover:text-rose-400 p-1 rounded transition"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 pl-7 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form
                onSubmit={handleSendComment}
                className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-2"
              >
                <input
                  type="text"
                  placeholder="Write a comment or status update..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          ) : (
            /* ATTACHMENTS TAB (Supabase Storage) */
            <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-5">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 ${
                  isDragOver
                    ? 'border-indigo-400 bg-indigo-950/30'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  multiple
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-800/40">
                  {uploadingFile ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-slate-200">
                    <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop files here
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Documents, PDFs, Images, Spreadsheets (Max 10MB per file)
                  </p>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
                  <HardDrive className="w-3 h-3" />
                  <span>Integrated with Supabase Storage Bucket: task-attachments</span>
                </div>
              </div>

              {/* Error Message */}
              {uploadError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Attachments List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">
                    Attached Files ({attachments.length})
                  </span>
                  {uploadingFile && (
                    <span className="flex items-center space-x-1.5 text-indigo-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Uploading to Supabase...</span>
                    </span>
                  )}
                </div>

                {loadingAttachments ? (
                  <div className="text-center py-10 text-xs text-slate-500 flex items-center justify-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Loading attachments...</span>
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="text-center py-10 border border-slate-800/50 rounded-xl bg-slate-950/20">
                    <Paperclip className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No attachments yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload project specs, screenshots, or receipts to this task.
                    </p>
                  </div>
                ) : (
                  attachments.map((att) => {
                    const isImg = isImageFile(att.file_type, att.file_name);
                    const isPdf = isPdfFile(att.file_type, att.file_name);

                    return (
                      <div
                        key={att.id}
                        className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                      >
                        {/* File Icon / Thumbnail */}
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            onClick={() =>
                              isImg && setPreviewImage({ url: att.public_url, name: att.file_name })
                            }
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                              isImg
                                ? 'bg-purple-950/40 border-purple-800/50 text-purple-400 cursor-pointer hover:opacity-80'
                                : isPdf
                                ? 'bg-rose-950/40 border-rose-800/50 text-rose-400'
                                : 'bg-blue-950/40 border-blue-800/50 text-blue-400'
                            }`}
                          >
                            {isImg ? (
                              <ImageIcon className="w-5 h-5" />
                            ) : isPdf ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <File className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p
                              className="text-xs font-semibold text-white truncate max-w-xs sm:max-w-sm"
                              title={att.file_name}
                            >
                              {att.file_name}
                            </p>
                            <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{formatFileSize(att.file_size)}</span>
                              <span>•</span>
                              <span>
                                {att.uploader_name || 'Team member'}
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(att.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-1 shrink-0">
                          {/* Image preview modal trigger */}
                          {isImg && (
                            <button
                              onClick={() =>
                                setPreviewImage({ url: att.public_url, name: att.file_name })
                              }
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                              title="Preview Image"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Direct View / Download in tab */}
                          <a
                            href={att.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={att.file_name}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition"
                            title="Download or View in browser"
                          >
                            <Download className="w-4 h-4" />
                          </a>

                          {/* Delete attachment */}
                          <button
                            onClick={() => handleDeleteAttachment(att.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 p-1.5 text-slate-400 hover:text-white bg-slate-900/80 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-300 mb-2 font-medium">
              {previewImage.name}
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className="max-h-[80vh] max-w-full rounded-xl border border-slate-800 shadow-2xl object-contain bg-slate-950"
            />
          </div>
        </div>
      )}
    </>
  );
};
