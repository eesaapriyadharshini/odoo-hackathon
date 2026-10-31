import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../db';
import { SafeUser, UserRole } from '../types';

export const JWT_SECRET = process.env.JWT_SECRET || 'brightloop-super-secret-jwt-key-2026-secure-production';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

export function generateToken(user: SafeUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Password requirement:
// "more than eight characters, with an uppercase letter, a lowercase letter and a special character"
export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (!password || password.length <= 8) {
    return { valid: false, message: 'Password must be more than 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc).' };
  }
  return { valid: true };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const user = db.users.findById(decoded.id);

    if (!user) {
      res.status(401).json({ error: 'User associated with token no longer exists.' });
      return;
    }

    const { password_hash, reset_token, reset_token_expiry, ...safeUser } = user;
    req.user = safeUser;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired authentication token.' });
    return;
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of: ${allowedRoles.join(', ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

// Ensure customer can only view or manage their own data
export function checkCustomerAccess(req: AuthenticatedRequest, customerId: string): boolean {
  if (!req.user) return false;
  if (req.user.role === 'admin' || req.user.role === 'staff') return true;
  return req.user.id === customerId;
}
