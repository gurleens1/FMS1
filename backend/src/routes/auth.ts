/**
 * auth.ts — Authentication routes
 * NEW: Login, Forgot Password (OTP via email), Reset Password
 * Uses bcryptjs + nodemailer (MailCatcher for dev)
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { signToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// ─────────────────────────────────────────────
// Email transporter
// ─────────────────────────────────────────────
function createTransporter() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST || 'smtp.gmail.com',
      port:   parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return nodemailer.createTransport({
    host: process.env.MAILCATCHER_HOST || 'localhost',
    port: parseInt(process.env.MAILCATCHER_PORT || '1025'),
    secure: false,
    ignoreTLS: true,
  });
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email format.' });
      return;
    }

    const { email, password } = parsed.data;
    const cleanEmail = email.toLowerCase().trim();

    // Find user by case-insensitive email match
    const userRole = await prisma.userRoleModel.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: 'insensitive',
        },
      },
      include: { employee: true },
    });

    if (!userRole) {
      logger.warn(`Login failed: Email not found - ${cleanEmail}`);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (!userRole.isActive) {
      res.status(403).json({ error: 'Your account has been deactivated.' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, userRole.password);
    if (!isMatch) {
      logger.warn(`Login failed: Incorrect password for - ${cleanEmail}`);
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    // Sign JWT
    const token = signToken({
      userId: userRole.id,
      email:  userRole.email,
      role:   userRole.role,
    });

    logger.info(`Login successful: ${userRole.email} (${userRole.role})`);

    res.json({
      token,
      user: {
        id:           userRole.id,
        email:        userRole.email,
        name:         userRole.employee?.fullName || 'User',
        role:         userRole.role,
        department:   userRole.employee?.department || 'N/A',
        employeeCode: userRole.employee?.employeeCode || 'N/A',
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ... Keep your existing forgot-password, verify-otp, reset-password, change-password routes ...
// (No changes needed below the login route)

router.get('/microsoft', (_req, res) => {
  res.status(501).json({ error: 'Microsoft login is not configured on this server.' });
});

export default router;