import { Router, Response } from 'express';
import { db } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { TeamRole, TeamMemberStatus } from '../types.js';

export const teamRouter = Router();

// GET /api/v1/team
teamRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.user!.workspace_id;
    const members = await db.listTeamMembers(workspaceId);

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// POST /api/v1/team
teamRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, phone, role, status } = req.body;
    const workspaceId = req.user!.workspace_id;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name and email are required' },
      });
    }

    const member = await db.createTeamMember({
      workspace_id: workspaceId,
      name,
      email,
      phone: phone || null,
      role: (role as TeamRole) || 'Developer',
      status: (status as TeamMemberStatus) || 'Active',
    });

    return res.status(201).json({
      success: true,
      data: member,
      message: 'Team member added successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// PATCH /api/v1/team/:id
teamRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateTeamMember(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team member not found' },
      });
    }

    return res.status(200).json({
      success: true,
      data: updated,
      message: 'Team member updated successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});

// DELETE /api/v1/team/:id
teamRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await db.deleteTeamMember(req.params.id);
    if (!success) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Team member not found' },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Team member deleted successfully',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: err.message },
    });
  }
});
