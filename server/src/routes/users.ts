import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { User, SafeUser } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest, validatePasswordStrength } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const usersRouter = Router();

usersRouter.use(authenticateToken);

function sanitizeUser(user: User): SafeUser {
  const { password_hash, reset_token, reset_token_expiry, ...safe } = user;
  return safe;
}

// GET /api/users - List users (Admin & Staff)
usersRouter.get('/', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const roleFilter = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;

  let users = db.users.find();

  if (roleFilter) {
    users = users.filter((u) => u.role === roleFilter);
  }

  if (search) {
    const s = search.toLowerCase();
    users = users.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }

  res.json({ users: users.map(sanitizeUser) });
});

// GET /api/users/:id
usersRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = db.users.findById(req.params.id);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Customer can only view themselves
  if (req.user?.role === 'customer' && req.user.id !== user.id) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

// POST /api/users/staff - ONLY ADMIN CAN ADD A NEW MEMBER OF STAFF
usersRouter.post('/staff', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, phone, company_name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Name, email and password are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const existing = db.users.findOne((u) => u.email.toLowerCase() === emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newStaff: User = {
      id: uuidv4(),
      email: emailTrimmed,
      password_hash,
      name: name.trim(),
      role: 'staff',
      phone: phone || null,
      company_name: company_name || 'Brightloop Internal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.insert(newStaff);

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ADMIN_CREATE_STAFF',
      entityType: 'user',
      entityId: newStaff.id,
      details: { staffEmail: newStaff.email, staffName: newStaff.name },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Staff member created successfully.', user: sanitizeUser(newStaff) });
  } catch (err) {
    console.error('[Create Staff Error]', err);
    res.status(500).json({ error: 'Failed to create staff member.' });
  }
});

// POST /api/users/customer - Admin or Staff creates customer
usersRouter.post('/customer', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, name, phone, company_name, address } = req.body;

    if (!email || !name) {
      res.status(400).json({ error: 'Name and email are required.' });
      return;
    }

    const emailTrimmed = email.trim().toLowerCase();
    const existing = db.users.findOne((u) => u.email.toLowerCase() === emailTrimmed);
    if (existing) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    const initialPassword = password || 'Customer!2026';
    const passCheck = validatePasswordStrength(initialPassword);
    if (!passCheck.valid) {
      res.status(400).json({ error: passCheck.message });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(initialPassword, salt);

    const newCustomer: User = {
      id: uuidv4(),
      email: emailTrimmed,
      password_hash,
      name: name.trim(),
      role: 'customer',
      phone: phone || null,
      company_name: company_name || null,
      address: address || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.users.insert(newCustomer);

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'CREATE_CUSTOMER',
      entityType: 'user',
      entityId: newCustomer.id,
      details: { customerEmail: newCustomer.email },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Customer created successfully.', user: sanitizeUser(newCustomer) });
  } catch (err) {
    console.error('[Create Customer Error]', err);
    res.status(500).json({ error: 'Failed to create customer.' });
  }
});
