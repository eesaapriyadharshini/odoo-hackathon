import { Router, Response } from 'express';
import { uuidv4 } from '../utils/id';
import db from '../db';
import { Product, ProductVariant, ProductType } from '../types';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const productsRouter = Router();

productsRouter.use(authenticateToken);

// GET /api/products - List products with their variants
productsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const products = db.products.find((p) => p.is_active === 1);
  const productsWithVariants = products.map((prod) => {
    const variants = db.product_variants.find((v) => v.product_id === prod.id);
    return { ...prod, variants };
  });

  res.json({ products: productsWithVariants });
});

// GET /api/products/:id
productsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const product = db.products.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const variants = db.product_variants.find((v) => v.product_id === product.id);
  res.json({ product: { ...product, variants } });
});

// POST /api/products - Admin adds product with optional variants
productsRouter.post('/', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, type, sales_price, cost_price, notes, variants } = req.body;

    if (!name || !code || !type || sales_price === undefined) {
      res.status(400).json({ error: 'Name, code, type, and sales_price are required.' });
      return;
    }

    const validTypes: ProductType[] = ['software', 'service', 'addon', 'consumable'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Product type must be one of: ${validTypes.join(', ')}` });
      return;
    }

    const price = Number(sales_price);
    const cost = Number(cost_price || 0);

    if (isNaN(price) || price < 0) {
      res.status(400).json({ error: 'Sales price must be a non-negative number.' });
      return;
    }

    if (isNaN(cost) || cost < 0) {
      res.status(400).json({ error: 'Cost price must be a non-negative number.' });
      return;
    }

    const existing = db.products.findOne((p) => p.code.toLowerCase() === code.trim().toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'A product with this code already exists.' });
      return;
    }

    const productId = uuidv4();
    const newProduct: Product = {
      id: productId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      sales_price: price,
      cost_price: cost,
      notes: notes || null,
      is_active: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.products.insert(newProduct);

    // Insert variants if provided (e.g. brand: Odoo, price_extra: 560)
    const createdVariants: ProductVariant[] = [];
    if (Array.isArray(variants)) {
      for (const v of variants) {
        if (v.attribute_name && v.attribute_value) {
          const extra = Number(v.price_extra || 0);
          const newVariant: ProductVariant = {
            id: uuidv4(),
            product_id: productId,
            attribute_name: v.attribute_name.trim(),
            attribute_value: v.attribute_value.trim(),
            price_extra: isNaN(extra) ? 0 : extra,
            sku: v.sku || null,
            created_at: new Date().toISOString(),
          };
          db.product_variants.insert(newVariant);
          createdVariants.push(newVariant);
        }
      }
    }

    logAudit({
      userId: req.user?.id,
      userEmail: req.user?.email,
      action: 'ADMIN_CREATE_PRODUCT',
      entityType: 'product',
      entityId: productId,
      details: { name: newProduct.name, code: newProduct.code, variantCount: createdVariants.length },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Product created successfully.',
      product: { ...newProduct, variants: createdVariants },
    });
  } catch (err) {
    console.error('[Create Product Error]', err);
    res.status(500).json({ error: 'Failed to create product.' });
  }
});

// POST /api/products/:id/variants - Add variant to existing product
productsRouter.post('/:id/variants', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const product = db.products.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const { attribute_name, attribute_value, price_extra, sku } = req.body;
  if (!attribute_name || !attribute_value) {
    res.status(400).json({ error: 'attribute_name and attribute_value are required.' });
    return;
  }

  const extra = Number(price_extra || 0);

  const variant: ProductVariant = {
    id: uuidv4(),
    product_id: product.id,
    attribute_name: attribute_name.trim(),
    attribute_value: attribute_value.trim(),
    price_extra: isNaN(extra) ? 0 : extra,
    sku: sku || null,
    created_at: new Date().toISOString(),
  };

  db.product_variants.insert(variant);

  res.status(201).json({ message: 'Variant added successfully.', variant });
});

// PUT /api/products/:id - Update product
productsRouter.put('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const product = db.products.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  const { name, type, sales_price, cost_price, notes, is_active } = req.body;
  const updates: Partial<Product> = {
    updated_at: new Date().toISOString(),
  };

  if (name !== undefined) updates.name = name.trim();
  if (type !== undefined) updates.type = type;
  if (sales_price !== undefined) {
    const p = Number(sales_price);
    if (!isNaN(p) && p >= 0) updates.sales_price = p;
  }
  if (cost_price !== undefined) {
    const c = Number(cost_price);
    if (!isNaN(c) && c >= 0) updates.cost_price = c;
  }
  if (notes !== undefined) updates.notes = notes;
  if (is_active !== undefined) updates.is_active = Number(is_active);

  const updated = db.products.update(product.id, updates);
  const variants = db.product_variants.find((v) => v.product_id === product.id);

  res.json({ message: 'Product updated successfully.', product: { ...updated, variants } });
});

// DELETE /api/products/:id - Admin deactivates/deletes product
productsRouter.delete('/:id', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const product = db.products.findById(req.params.id);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }

  // Cascade delete variants
  db.product_variants.deleteWhere((v) => v.product_id === product.id);
  db.products.delete(product.id);

  logAudit({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'ADMIN_DELETE_PRODUCT',
    entityType: 'product',
    entityId: product.id,
    details: { name: product.name, code: product.code },
    ipAddress: req.ip,
  });

  res.json({ message: 'Product and associated variants deleted successfully.' });
});

// DELETE /api/products/:id/variants/:variantId
productsRouter.delete('/:id/variants/:variantId', requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const deleted = db.product_variants.delete(req.params.variantId);
  if (!deleted) {
    res.status(404).json({ error: 'Variant not found.' });
    return;
  }
  res.json({ message: 'Variant deleted successfully.' });
});
