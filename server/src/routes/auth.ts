import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { User, SafeUser } from '../types';
import { generateToken, validatePasswordStrength, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const authRouter = Router();

function sanitizeUser(user: User): SafeUser {
  const { password_hash, reset_token, reset_token_expiry, ...safe } = user;
  return safe;
}

// POST /api/auth/signup
authRouter.post('/signup', (req: Request, res: Response) => {
  try {
    const { email, password, name, phone, company_name, address } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email and password are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Check unique email
    const existing = db.users.findOne((u) => u.email.toLowerCase() === emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    // Validate strong password: > 8 chars, uppercase, lowercase, special character
    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: uuidv4(),
      email: emailTrimmed,
      password_hash,
      name: name.trim(),
      role: 'customer', // Self-signups are always customer
      phone: phone || null,
      company_name: company_name || null,
      address: address || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.insert(newUser);

    const safeUser = sanitizeUser(newUser);
    const token = generateToken(safeUser);

    logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'CUSTOMER_SIGNUP',
      entityType: 'user',
      entityId: newUser.id,
      details: { role: newUser.role, company: newUser.company_name },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Account successfully created.',
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error('[Auth Signup Error]', err);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const user = db.users.findOne((u) => u.email.toLowerCase() === emailTrimmed);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const safeUser = sanitizeUser(user);
    const token = generateToken(safeUser);

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entityType: 'auth',
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful.',
      user: safeUser,
      token,
    });
  } catch (err: any) {
    console.error('[Auth Login Error]', err);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const user = db.users.findOne((u) => u.email.toLowerCase() === emailTrimmed);

    if (!user) {
      // Don't leak user existence in generic message, but return consistent response
      res.json({
        message: 'If an account exists with that email, a password reset link has been dispatched.',
      });
      return;
    }

    // Generate token valid for 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    db.users.update(user.id, {
      reset_token: resetToken,
      reset_token_expiry: expiry,
      updated_at: new Date().toISOString(),
    });

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'REQUEST_PASSWORD_RESET',
      entityType: 'auth',
      ipAddress: req.ip,
    });

    // Provide the reset token and direct link in response for testing/demo simulation
    res.json({
      message: 'Password reset link has been generated and dispatched to your email.',
      resetToken, // Provided for instant demo testing
      resetLink: `/reset-password?token=${resetToken}`,
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]', err);
    res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required.' });
      return;
    }

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const now = new Date().toISOString();
    const user = db.users.findOne((u) => u.reset_token === token);

    if (!user || !user.reset_token_expiry || user.reset_token_expiry < now) {
      res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(newPassword, salt);

    db.users.update(user.id, {
      password_hash,
      reset_token: null,
      reset_token_expiry: null,
      updated_at: new Date().toISOString(),
    });

    logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'RESET_PASSWORD_SUCCESS',
      entityType: 'auth',
      ipAddress: req.ip,
    });

    res.json({ message: 'Password has been successfully updated. You may now log in.' });
  } catch (err: any) {
    console.error('[Reset Password Error]', err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});
