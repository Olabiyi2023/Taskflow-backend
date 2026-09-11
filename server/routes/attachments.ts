import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { getSupabaseClient, ATTACHMENTS_BUCKET, ensureStorageBucket } from '../supabase.js';

export const attachmentsRouter = Router({ mergeParams: true });

// GET /api/v1/tasks/:taskId/attachments - List all attachments for a task
attachmentsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await db.findTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const attachments = await db.listTaskAttachments(taskId);
    return res.status(200).json({
      success: true,
      data: attachments,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/tasks/:taskId/attachments - Upload new attachment
attachmentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { file_name, file_type, file_size, file_base64 } = req.body;

    if (!file_name || !file_base64) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'file_name and file_base64 data are required',
        },
      });
    }

    const numericSize = Number(file_size) || 0;
    if (numericSize > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the 10MB limit',
        },
      });
    }

    const task = await db.findTaskById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const attachmentId = crypto.randomUUID();
    const safeFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${task.workspace_id}/${taskId}/${attachmentId}_${safeFileName}`;

    let publicUrl = '';
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await ensureStorageBucket();
        const base64Data = file_base64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const { error: uploadError } = await supabase.storage
          .from(ATTACHMENTS_BUCKET)
          .upload(storagePath, buffer, {
            contentType: file_type || 'application/octet-stream',
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(ATTACHMENTS_BUCKET)
            .getPublicUrl(storagePath);
          publicUrl = urlData.publicUrl;
        } else {
          console.warn('[Supabase Storage] Upload error, falling back:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('[Supabase Storage] Upload exception:', storageErr);
      }
    }

    // Direct endpoint fallback if public URL not active
    if (!publicUrl) {
      publicUrl = `/api/v1/tasks/${taskId}/attachments/${attachmentId}/download`;
    }

    const uploader = (await db.findUserById(req.user!.id)) || {
      id: req.user!.id,
      name: req.user!.email.split('@')[0],
    };

    const attachment = await db.createTaskAttachment({
      id: attachmentId,
      task_id: taskId,
      workspace_id: task.workspace_id,
      file_name,
      file_size: numericSize,
      file_type: file_type || 'application/octet-stream',
      storage_path: storagePath,
      public_url: publicUrl,
      file_base64: file_base64,
      uploaded_by: req.user!.id,
      uploader_name: uploader.name,
    });

    return res.status(201).json({
      success: true,
      data: attachment,
      message: 'Attachment uploaded successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// DELETE /api/v1/tasks/:taskId/attachments/:attachmentId
attachmentsRouter.delete('/:attachmentId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { attachmentId } = req.params;
    const existing = await db.findAttachmentById(attachmentId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Attachment not found' },
      });
    }

    const supabase = getSupabaseClient();
    if (supabase && existing.storage_path) {
      try {
        await supabase.storage.from(ATTACHMENTS_BUCKET).remove([existing.storage_path]);
      } catch (err) {
        console.warn('[Supabase Storage] File delete warning:', err);
      }
    }

    await db.deleteTaskAttachment(attachmentId);

    return res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully',
      data: { deleted: true, id: attachmentId },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// GET /api/v1/tasks/:taskId/attachments/:attachmentId/download
attachmentsRouter.get('/:attachmentId/download', async (req, res: Response) => {
  try {
    const { attachmentId } = req.params;
    const attachment = await db.findAttachmentById(attachmentId);
    if (!attachment) {
      return res.status(404).send('Attachment not found');
    }

    // If we have base64 in memory/store
    if (attachment.file_base64) {
      const cleanBase64 = attachment.file_base64.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(attachment.file_name)}"`
      );
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // If public url is external http, redirect
    if (attachment.public_url && attachment.public_url.startsWith('http')) {
      return res.redirect(attachment.public_url);
    }

    return res.status(404).send('File content not available');
  } catch (err: any) {
    return res.status(500).send('Error downloading attachment');
  }
});
