import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Tax } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const taxesRouter = Router();

taxesRouter.use(authenticateToken);

// GET /api/taxes
taxesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const taxes = db.taxes.find((t) => t.is_active === 1);
  res.json({ taxes });
});

// POST /api/taxes - Admin creates tax
taxesRouter.post('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { name, rate, is_default } = req.body;
  if (!name || rate === undefined) {
    res.status(400).json({ error: 'Name and rate are required.' });
    return;
  }

  const taxRate = Number(rate);
  if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    res.status(400).json({ error: 'Tax rate must be a percentage between 0 and 100.' });
    return;
  }

  if (is_default) {
    // Unset other defaults
    db.taxes.updateWhere(() => true, () => ({ is_default: 0 }));
  }

  const newTax: Tax = {
    id: uuidv4(),
    name: name.trim(),
    rate: taxRate,
    is_default: is_default ? 1 : 0,
    is_active: 1,
    created_at: new Date().toISOString(),
  };

  db.taxes.insert(newTax);
  res.status(201).json({ message: 'Tax rule created successfully.', tax: newTax });
});

// PUT /api/taxes/:id
taxesRouter.put('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const tax = db.taxes.findById(req.params.id);
  if (!tax) {
    res.status(404).json({ error: 'Tax not found.' });
    return;
  }

  const { name, rate, is_default, is_active } = req.body;
  if (is_default) {
    db.taxes.updateWhere(() => true, () => ({ is_default: 0 }));
  }

  const updates: Partial<Tax> = {};
  if (name !== undefined) updates.name = name.trim();
  if (rate !== undefined) {
    const r = Number(rate);
    if (!isNaN(r) && r >= 0 && r <= 100) updates.rate = r;
  }
  if (is_default !== undefined) updates.is_default = is_default ? 1 : 0;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

  const updated = db.taxes.update(tax.id, updates);
  res.json({ message: 'Tax updated successfully.', tax: updated });
});
