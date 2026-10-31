import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { QuotationTemplate, QuotationTemplateLine } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';

export const quotationTemplatesRouter = Router();

quotationTemplatesRouter.use(authenticateToken);

// GET /api/quotation-templates
quotationTemplatesRouter.get('/', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const templates = db.quotation_templates.find();
  const populated = templates.map((tpl) => {
    const lines = db.quotation_template_lines.find((l) => l.template_id === tpl.id);
    const populatedLines = lines.map((l) => {
      const product = db.products.findById(l.product_id);
      const variant = l.variant_id ? db.product_variants.findById(l.variant_id) : undefined;
      return {
        ...l,
        product_name: product?.name,
        variant_name: variant ? `${variant.attribute_name}: ${variant.attribute_value}` : undefined,
      };
    });
    const plan = tpl.plan_id ? db.plans.findById(tpl.plan_id) : undefined;
    return {
      ...tpl,
      plan_name: plan?.name,
      lines: populatedLines,
    };
  });

  res.json({ templates: populated });
});

// GET /api/quotation-templates/:id
quotationTemplatesRouter.get('/:id', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const template = db.quotation_templates.findById(req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Quotation template not found.' });
    return;
  }

  const lines = db.quotation_template_lines.find((l) => l.template_id === template.id);
  const populatedLines = lines.map((l) => {
    const product = db.products.findById(l.product_id);
    const variant = l.variant_id ? db.product_variants.findById(l.variant_id) : undefined;
    return {
      ...l,
      product_name: product?.name,
      variant_name: variant ? `${variant.attribute_name}: ${variant.attribute_value}` : undefined,
    };
  });
  const plan = template.plan_id ? db.plans.findById(template.plan_id) : undefined;

  res.json({
    template: {
      ...template,
      plan_name: plan?.name,
      lines: populatedLines,
    },
  });
});

// POST /api/quotation-templates
quotationTemplatesRouter.post('/', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const { name, description, plan_id, validity_days, payment_terms, lines } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Template name is required.' });
    return;
  }

  const templateId = uuidv4();
  const template: QuotationTemplate = {
    id: templateId,
    name: name.trim(),
    description: description || null,
    plan_id: plan_id || null,
    validity_days: Number(validity_days || 30),
    payment_terms: payment_terms || 'net_30',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.quotation_templates.insert(template);

  const createdLines: QuotationTemplateLine[] = [];
  if (Array.isArray(lines)) {
    for (const l of lines) {
      if (l.product_id) {
        const lineItem: QuotationTemplateLine = {
          id: uuidv4(),
          template_id: templateId,
          product_id: l.product_id,
          variant_id: l.variant_id || null,
          quantity: Number(l.quantity || 1),
          unit_price: Number(l.unit_price || 0),
          discount_pct: Number(l.discount_pct || 0),
        };
        db.quotation_template_lines.insert(lineItem);
        createdLines.push(lineItem);
      }
    }
  }

  res.status(201).json({
    message: 'Quotation template created successfully.',
    template: { ...template, lines: createdLines },
  });
});

// PUT /api/quotation-templates/:id
quotationTemplatesRouter.put('/:id', requireRole(['admin', 'staff']), (req: AuthenticatedRequest, res: Response) => {
  const template = db.quotation_templates.findById(req.params.id);
  if (!template) {
    res.status(404).json({ error: 'Quotation template not found.' });
    return;
  }

  const { name, description, plan_id, validity_days, payment_terms, lines } = req.body;
  const updates: Partial<QuotationTemplate> = { updated_at: new Date().toISOString() };

  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description;
  if (plan_id !== undefined) updates.plan_id = plan_id;
  if (validity_days !== undefined) updates.validity_days = Number(validity_days);
  if (payment_terms !== undefined) updates.payment_terms = payment_terms;

  const updated = db.quotation_templates.update(template.id, updates);

  if (Array.isArray(lines)) {
    // Replace lines
    db.quotation_template_lines.deleteWhere((l) => l.template_id === template.id);
    for (const l of lines) {
      if (l.product_id) {
        db.quotation_template_lines.insert({
          id: uuidv4(),
          template_id: template.id,
          product_id: l.product_id,
          variant_id: l.variant_id || null,
          quantity: Number(l.quantity || 1),
          unit_price: Number(l.unit_price || 0),
          discount_pct: Number(l.discount_pct || 0),
        });
      }
    }
  }

  const currentLines = db.quotation_template_lines.find((l) => l.template_id === template.id);
  res.json({ message: 'Template updated successfully.', template: { ...updated, lines: currentLines } });
});

// DELETE /api/quotation-templates/:id
quotationTemplatesRouter.delete('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  db.quotation_template_lines.deleteWhere((l) => l.template_id === req.params.id);
  const deleted = db.quotation_templates.delete(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Template not found.' });
    return;
  }
  res.json({ message: 'Template deleted.' });
});
