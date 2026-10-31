import db from '../db';
import { Discount } from '../types';

export interface DiscountValidationResult {
  valid: boolean;
  reason?: string;
  discount?: Discount;
  discountAmount: number;
}

export function validateAndCalculateDiscount(
  discountCodeOrId: string,
  context: {
    subtotal: number;
    totalQuantity: number;
    items?: Array<{ productId: string; quantity: number; unitPrice: number; lineTotal: number }>;
  }
): DiscountValidationResult {
  const now = new Date().toISOString().split('T')[0];

  // Find discount by code or id
  const discount = db.discounts.findOne(
    (d) =>
      (d.id === discountCodeOrId || d.code.toUpperCase() === discountCodeOrId.toUpperCase()) &&
      d.is_active === 1
  );

  if (!discount) {
    return { valid: false, reason: 'Discount code not found or inactive.', discountAmount: 0 };
  }

  // Check start date
  if (discount.start_date && discount.start_date > now) {
    return { valid: false, reason: `Discount is not yet active (valid from ${discount.start_date}).`, discountAmount: 0 };
  }

  // Check end date
  if (discount.end_date && discount.end_date < now) {
    return { valid: false, reason: `Discount has expired on ${discount.end_date}.`, discountAmount: 0 };
  }

  // Check usage limit
  if (discount.max_uses !== null && discount.max_uses !== undefined && discount.used_count >= discount.max_uses) {
    return { valid: false, reason: `Discount usage limit (${discount.max_uses}) has been reached.`, discountAmount: 0 };
  }

  // Check minimum purchase amount
  if (discount.min_purchase_amount > 0 && context.subtotal < discount.min_purchase_amount) {
    return {
      valid: false,
      reason: `Requires minimum purchase amount of $${discount.min_purchase_amount.toFixed(2)} (current: $${context.subtotal.toFixed(2)}).`,
      discountAmount: 0,
    };
  }

  // Check minimum quantity
  if (discount.min_quantity > 0 && context.totalQuantity < discount.min_quantity) {
    return {
      valid: false,
      reason: `Requires minimum quantity of ${discount.min_quantity} items (current: ${context.totalQuantity}).`,
      discountAmount: 0,
    };
  }

  let calculatedDiscount = 0;

  if (discount.scope === 'product' && discount.product_id && context.items) {
    // Only applies to specified product lines
    const matchingItems = context.items.filter((item) => item.productId === discount.product_id);
    if (matchingItems.length === 0) {
      return {
        valid: false,
        reason: 'Discount only applies to specific products that are not present in this order.',
        discountAmount: 0,
      };
    }

    const applicableTotal = matchingItems.reduce((acc, it) => acc + it.lineTotal, 0);
    if (discount.type === 'percentage') {
      calculatedDiscount = (applicableTotal * discount.value) / 100;
    } else {
      calculatedDiscount = Math.min(discount.value, applicableTotal);
    }
  } else {
    // Whole subscription scope
    if (discount.type === 'percentage') {
      calculatedDiscount = (context.subtotal * discount.value) / 100;
    } else {
      calculatedDiscount = Math.min(discount.value, context.subtotal);
    }
  }

  calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

  return {
    valid: true,
    discount,
    discountAmount: calculatedDiscount,
  };
}

export function incrementDiscountUsage(discountId: string): void {
  const discount = db.discounts.findById(discountId);
  if (discount) {
    db.discounts.update(discountId, { used_count: discount.used_count + 1 });
  }
}
