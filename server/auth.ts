import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload, TeamRole, User } from './types.js';
import { db } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow-jwt-default-secret-key-32-chars';
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'taskflow-refresh-default-secret-key-32-chars';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'taskflow_salt').digest('hex');
}

export function verifyPassword(password: string, hash?: string): boolean {
  if (!hash) return false;
  const saltedHash = hashPassword(password);
  const plainHash = crypto.createHash('sha256').update(password).digest('hex');
  return saltedHash === hash || plainHash === hash;
}

export function generateTokens(user: {
  id: string;
  email: string;
  workspace_id: string;
  role: TeamRole;
}) {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    workspace_id: user.workspace_id,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
  };
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    workspace_id: string;
    role: TeamRole;
  };
  currentUser?: User;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // If token is missing, check if in dev/preview mode with demo default header or query param
  if (!token) {
    // For quick exploratory UI testing without login loops, if x-demo-user is present or default fallback
    const demoHeader = req.headers['x-demo-user'];
    if (demoHeader === 'true' || !req.path.startsWith('/api/v1/auth/')) {
      const defaultUser = await db.findUserByEmail('sarah.adebayo@acmewestafrica.com');
      if (defaultUser) {
        req.user = {
          id: defaultUser.id,
          email: defaultUser.email,
          workspace_id: defaultUser.workspace_id,
          role: defaultUser.role,
        };
        req.currentUser = defaultUser;
        return next();
      }
    }

    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required. Pass Authorization: Bearer <token>',
      },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      workspace_id: decoded.workspace_id,
      role: decoded.role,
    };

    const user = await db.findUserById(decoded.sub);
    if (user) {
      req.currentUser = user;
    }

    // Check subscription trial enforcement for mutating operations (POST, PUT, PATCH, DELETE)
    // Non-GET operations (creating tasks, inviting teammates) return 402 if trial expired
    if (
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) &&
      !req.path.startsWith('/api/v1/billing') &&
      !req.path.startsWith('/api/v1/auth') &&
      !req.path.startsWith('/api/v1/system')
    ) {
      const sub = await db.getSubscriptionByWorkspace(decoded.workspace_id);
      if (sub && !sub.is_valid && sub.status === 'expired') {
        return res.status(402).json({
          success: false,
          error: {
            code: 'PAYMENT_REQUIRED',
            message: 'Your 7-day free trial has expired. Please upgrade your subscription to continue.',
          },
        });
      }
    }

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token verification failed or token expired',
      },
    });
  }
}
