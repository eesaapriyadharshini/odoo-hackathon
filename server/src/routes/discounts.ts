import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Discount } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { validateAndCalculateDiscount } from '../services/discountService';
import { logAudit } from '../services/auditService';

export const discountsRouter = Router();

discountsRouter.use(authenticateToken);

// GET /api/discounts - List all discounts (Admin & Staff)
discountsRouter.get('/', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const discounts = db.discounts.find();
  res.json({ discounts });
});

// POST /api/discounts/validate - Validate code for quote or cart
discountsRouter.post('/validate', (req: AuthenticatedRequest, res: Response) => {
  const { code, subtotal, totalQuantity, items } = req.body;
  if (!code) {
    res.status(400).json({ error: 'Discount code is required.' });
    return;
  }

  const result = validateAndCalculateDiscount(code, {
    subtotal: Number(subtotal || 0),
    totalQuantity: Number(totalQuantity || 0),
    items: items || [],
  });

  res.json(result);
});

// POST /api/discounts - ONLY ADMIN CAN CREATE DISCOUNT RULES
discountsRouter.post('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      code,
      name,
      type,
      value,
      min_purchase_amount,
      min_quantity,
      start_date,
      end_date,
      max_uses,
      scope,
      product_id,
    } = req.body;

    if (!code || !name || !type || value === undefined || !start_date || !scope) {
      res.status(400).json({ error: 'Code, name, type, value, start_date and scope are required.' });
      return;
    }

    if (!['percentage', 'fixed'].includes(type)) {
      res.status(400).json({ error: "Type must be either 'percentage' or 'fixed'." });
      return;
    }

    if (!['subscription', 'product'].includes(scope)) {
      res.status(400).json({ error: "Scope must be either 'subscription' or 'product'." });
      return;
    }

    const discountVal = Number(value);
    if (isNaN(discountVal) || discountVal <= 0) {
      res.status(400).json({ error: 'Discount value must be greater than zero.' });
      return;
    }

    if (type === 'percentage' && discountVal > 100) {
      res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
      return;
    }

    const minPurchase = Number(min_purchase_amount || 0);
    if (isNaN(minPurchase) || minPurchase < 0) {
      res.status(400).json({ error: 'min_purchase_amount cannot be negative.' });
      return;
    }

    const minQty = Number(min_quantity || 0);
    if (isNaN(minQty) || minQty < 0) {
      res.status(400).json({ error: 'min_quantity cannot be negative.' });
      return;
    }

    let parsedMaxUses: number | null = null;
    if (max_uses !== undefined && max_uses !== null && max_uses !== '') {
      parsedMaxUses = Number(max_uses);
      if (isNaN(parsedMaxUses) || parsedMaxUses <= 0) {
        res.status(400).json({ error: 'max_uses must be a positive integer.' });
        return;
      }
    }

    const codeUpper = code.trim().toUpperCase();
    const existing = db.discounts.findOne((d) => d.code.toUpperCase() === codeUpper);
    if (existing) {
      res.status(409).json({ error: 'A discount rule with this code already exists.' });
      return;
    }

    const newDiscount: Discount = {
      id: uuidv4(),
      code: codeUpper,
      name: name.trim(),
      type,
      value: discountVal,
      min_purchase_amount: minPurchase,
      min_quantity: minQty,
      start_date,
      end_date: end_date || null,
      max_uses: parsedMaxUses,
      used_count: 0,
      scope,
      product_id: scope === 'product' ? product_id || null : null,
      is_active: 1,
      created_at: new Date().toISOString(),
    };

    db.discounts.insert(newDiscount);

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ADMIN_CREATE_DISCOUNT',
      entityType: 'discount',
      entityId: newDiscount.id,
      details: { code: newDiscount.code, type: newDiscount.type, value: newDiscount.value },
      ipAddress: req.ip,
    });

    res.status(201).json({ message: 'Discount rule created successfully.', discount: newDiscount });
  } catch (err) {
    console.error('[Create Discount Error]', err);
    res.status(500).json({ error: 'Failed to create discount rule.' });
  }
});

// PUT /api/discounts/:id
discountsRouter.put('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const discount = db.discounts.findById(req.params.id);
  if (!discount) {
    res.status(404).json({ error: 'Discount not found.' });
    return;
  }

  const { name, value, min_purchase_amount, min_quantity, start_date, end_date, max_uses, is_active } = req.body;
  const updates: Partial<Discount> = {};

  if (name !== undefined) updates.name = name.trim();
  if (value !== undefined) {
    const v = Number(value);
    if (!isNaN(v) && v > 0) updates.value = v;
  }
  if (min_purchase_amount !== undefined) updates.min_purchase_amount = Number(min_purchase_amount);
  if (min_quantity !== undefined) updates.min_quantity = Number(min_quantity);
  if (start_date !== undefined) updates.start_date = start_date;
  if (end_date !== undefined) updates.end_date = end_date;
  if (max_uses !== undefined) updates.max_uses = max_uses ? Number(max_uses) : null;
  if (is_active !== undefined) updates.is_active = is_active ? 1 : 0;

  const updated = db.discounts.update(discount.id, updates);
  res.json({ message: 'Discount updated successfully.', discount: updated });
});
