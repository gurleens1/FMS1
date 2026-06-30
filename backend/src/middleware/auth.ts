/**
 * auth.ts — Local JWT authentication middleware
 * CHANGED: Replaced Azure AD / MSAL with local JWT (jsonwebtoken)
 * SuperAdmin, Admin, Manager, Assignee roles supported
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// Token payload shape
// ─────────────────────────────────────────────
export interface TokenPayload {
  userId: number;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
    name: string;
    role: string;
  };
}

// ─────────────────────────────────────────────
// Sign / verify helpers
// ─────────────────────────────────────────────
export function signToken(payload: TokenPayload): string {
  const secret = process.env.JWT_SECRET || 'fms-secret-change-in-production';
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  const secret = process.env.JWT_SECRET || 'fms-secret-change-in-production';
  return jwt.verify(token, secret) as TokenPayload;
}

// ─────────────────────────────────────────────
// Middleware: authenticateToken
// CHANGED: Uses local JWT instead of Azure AD
// ─────────────────────────────────────────────
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token = '';
  // Skip API key shortcut for login endpoint
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    // Proceed to JWT authentication
  } else {
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (apiKey && apiKey === process.env.VOICEBOX_API_KEY) {
      req.user = { userId: 0, email: 'voicebox@system', name: 'Voicebox System', role: 'Voicebox' };
      next();
      return;
    }
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token) {
    token = String(req.query.token);
  } else {
    res.status(401).json({ error: 'Missing or invalid Authorization header or token query parameter' });
    return;
  }

  try {
    const payload = verifyToken(token);

    // Verify user still exists and is active in DB
    const userRole = await prisma.userRoleModel.findUnique({
      where: { id: payload.userId },
      include: { employee: true },
    });

    if (!userRole || !userRole.isActive) {
      res.status(403).json({ error: 'Account inactive or not found. Contact administrator.' });
      return;
    }

    req.user = {
      userId: userRole.id,
      email:  userRole.email,
      name:   userRole.employee.fullName,
      role:   userRole.role,
    };

    next();
  } catch (err) {
    logger.error('Auth error:', err);
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired. Please login again.' });
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }
    res.status(500).json({ error: 'Authentication error' });
  }
}

// ─────────────────────────────────────────────
// Middleware: requireRole — RBAC guard
// Usage: requireRole('SuperAdmin', 'Admin')
// ─────────────────────────────────────────────
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access restricted. Required role(s): ${roles.join(', ')}`,
      });
      return;
    }
    next();
  };
}
