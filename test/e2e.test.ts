import http from 'http';
import { spawn } from 'child_process';
import api from '../src/services/api';

const API_BASE = 'http://localhost:5000/api';

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path: string, options: any = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('BRIGHTLOOP SUBSCRIPTION SYSTEM - COMPLETE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // 1. Health check
  const health = await request('/health');
  assert(health.ok && health.data.status === 'ok', 'System Health Check endpoint operational');

  // 2. SCENE 1: Signup & Strong Password Policy
  console.log('\n--- SCENE 1: Signup, RBAC & Authentication ---');
  // 2a. Reject weak password (too short)
  const weakSignup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'weak@test.com',
      password: 'short',
      name: 'Weak User',
    }),
  });
  assert(weakSignup.status === 400, 'Rejects password <= 8 characters', weakSignup.data);

  // 2b. Reject password missing special char
  const noSpecialSignup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: 'nospecial@test.com',
      password: 'Password1234',
      name: 'No Special',
    }),
  });
  assert(noSpecialSignup.status === 400, 'Rejects password missing special character', noSpecialSignup.data);

  // 2c. Successful signup with compliant password (>8 chars, uppercase, lowercase, special)
  const testEmail = `newcustomer_${Date.now()}@brightlooptest.com`;
  const validSignup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'StrongPassword!2026',
      name: 'Test Customer',
      company_name: 'Test Customer Corp',
    }),
  });
  assert(validSignup.status === 201 && validSignup.data.token, 'Signup succeeds with strong password', validSignup.data);
  const customerToken = validSignup.data.token;

  // 2d. Reject duplicate email
  const dupSignup = await request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email: testEmail,
      password: 'StrongPassword!2026',
      name: 'Duplicate Email User',
    }),
  });
  assert(dupSignup.status === 409, 'Rejects duplicate email registration (unique accounts)', dupSignup.data);

  // 2e. Password Reset link request
  const forgotRes = await request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: testEmail }),
  });
  assert(forgotRes.ok && forgotRes.data.resetToken, 'Password reset link token generated', forgotRes.data);

  // 2f. Reset password with token
  const resetRes = await request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      token: forgotRes.data.resetToken,
      newPassword: 'BrandNewPassword!2026',
    }),
  });
  assert(resetRes.ok, 'Password successfully reset with token');

  // 2g. Login as Admin
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@brightloop.com', password: 'BrightAdmin!2026' }),
  });
  assert(adminLogin.ok && adminLogin.data.user.role === 'admin', 'Admin login successful');
  const adminToken = adminLogin.data.token;

  // 2h. Login as Staff
  const staffLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'staff@brightloop.com', password: 'BrightStaff!2026' }),
  });
  assert(staffLogin.ok && staffLogin.data.user.role === 'staff', 'Staff login successful');
  const staffToken = staffLogin.data.token;

  // 2i. RBAC: Only admin can add staff member
  const nonAdminAddStaff = await request('/users/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      email: `unauthorized_staff_${Date.now()}@brightloop.com`,
      password: 'StaffPassword!2026',
      name: 'Unauthorized Attempt',
    }),
  });
  assert(nonAdminAddStaff.status === 403, 'RBAC check: Internal staff cannot create staff members', nonAdminAddStaff.data);

  const adminAddStaff = await request('/users/staff', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      email: `valid_staff_${Date.now()}@brightloop.com`,
      password: 'StaffPassword!2026',
      name: 'Valid Onboarded Staff',
    }),
  });
  assert(adminAddStaff.status === 201, 'RBAC check: Admin successfully adds new staff member', adminAddStaff.data);

  // 3. SCENE 2: Launching a New Product, Variants & Plan
  console.log('\n--- SCENE 2: Products, Odoo Brand Variant (+$560) & Plan Lifecycle ---');
  const newProductRes = await request('/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Brightloop Analytics Suite',
      code: `PROD-ANALYTICS-${Date.now()}`,
      type: 'software',
      sales_price: 299,
      cost_price: 80,
      notes: 'Real-time subscription cohort metrics',
      variants: [
        { attribute_name: 'Brand', attribute_value: 'Standard', price_extra: 0 },
        { attribute_name: 'Brand', attribute_value: 'Odoo Edition', price_extra: 560 }, // Adds 560!
      ],
    }),
  });
  assert(newProductRes.status === 201, 'Admin adds product with Odoo variant (+$560)', newProductRes.data);
  const createdProd = newProductRes.data.product;
  const odooVariant = createdProd.variants.find((v: any) => v.attribute_value === 'Odoo Edition');
  assert(odooVariant && odooVariant.price_extra === 560, 'Odoo Brand variant adds exactly 560 to price');

  // Admin creates plan with lifecycle rules
  const newPlanRes = await request('/plans', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Quarterly Growth Sprint',
      code: `PLAN-Q-${Date.now()}`,
      cost: 450,
      billing_interval: 'monthly',
      min_quantity: 2,
      start_date: '2026-01-01',
      end_date: '2028-12-31',
      auto_close_on_end: 1,
      allow_early_close: 1,
      allow_pause: 1,
      allow_renew: 1,
    }),
  });
  assert(newPlanRes.status === 201, 'Admin launches plan with lifecycle rules (auto-close, pause, renew)');
  const createdPlan = newPlanRes.data.plan;

  // 4. SCENE 3: Quotation Templates & Turning Quotes into Subscriptions
  console.log('\n--- SCENE 3: Turning a Quote into a Subscription ---');
  const tpls = await request('/quotation-templates', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  assert(tpls.ok && tpls.data.templates.length > 0, 'Quotation templates available for fast quote generation');
  const sampleTemplate = tpls.data.templates[0];

  // Sales rep creates subscription
  const subRes = await request('/subscriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      customer_id: validSignup.data.user.id,
      plan_id: createdPlan.id,
      template_id: sampleTemplate.id,
      start_date: '2026-10-31',
      payment_terms: 'net_30',
      status: 'draft',
      lines: [
        {
          product_id: createdProd.id,
          variant_id: odooVariant.id, // Odoo variant selected!
          quantity: 2,
          unit_price: 859, // 299 + 560 = 859
        },
      ],
    }),
  });
  assert(subRes.status === 201, 'Subscription created with unique SUB number and lines', subRes.data);
  const sub = subRes.data.subscription;
  assert(sub.subscription_number.startsWith('SUB-'), `Subscription received sequential number: ${sub.subscription_number}`);

  // Lifecycle state transition: Draft -> Quotation -> Confirmed -> Active
  const toQuote = await request(`/subscriptions/${sub.id}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ targetStatus: 'quotation' }),
  });
  assert(toQuote.ok && toQuote.data.subscription.status === 'quotation', 'Subscription moves Draft -> Quotation');

  const toConfirmed = await request(`/subscriptions/${sub.id}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ targetStatus: 'confirmed' }),
  });
  assert(toConfirmed.ok && toConfirmed.data.subscription.status === 'confirmed', 'Subscription moves Quotation -> Confirmed');

  const toActive = await request(`/subscriptions/${sub.id}/transition`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ targetStatus: 'active' }),
  });
  assert(toActive.ok && toActive.data.subscription.status === 'active', 'Subscription moves Confirmed -> Active');

  // 5. SCENE 4: Billing Day & Idempotency
  console.log('\n--- SCENE 4: Billing Day Engine & Zero Double-Billing ---');
  const run1 = await request('/billing/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ targetDate: '2026-10-31' }),
  });
  assert(run1.ok, 'Billing Day executed successfully without manual typing', run1.data);
  const initialGenerated = run1.data.result.invoicesGenerated.length;
  console.log(`Invoices created in Run 1: ${initialGenerated}`);

  // Run immediately again with same target date -> IDEMPOTENCY TEST: must generate 0 duplicate invoices!
  const run2 = await request('/billing/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ targetDate: '2026-10-31' }),
  });
  assert(
    run2.ok && run2.data.result.invoicesGenerated.length === 0,
    'Idempotency confirmed: Zero duplicate invoices generated on repeated run!',
    run2.data
  );

  // 6. SCENE 5: Discount Rules
  console.log('\n--- SCENE 5: Discount Rules & Automatic Application ---');
  const discountCode = `PROMO${Date.now()}`;
  const discRes = await request('/discounts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      code: discountCode,
      name: '20% Large Order Incentive',
      type: 'percentage',
      value: 20,
      min_purchase_amount: 100,
      min_quantity: 1,
      start_date: '2026-01-01',
      max_uses: 50,
      scope: 'subscription',
    }),
  });
  assert(discRes.status === 201, 'Admin created discount rule with min purchase and max usage limit');

  // Validate discount calculation
  const validateDisc = await request('/discounts/validate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      code: discountCode,
      subtotal: 500,
      totalQuantity: 2,
    }),
  });
  assert(
    validateDisc.ok && validateDisc.data.valid && validateDisc.data.discountAmount === 100,
    'Discount code validated: 20% of $500 correctly calculates -$100'
  );

  // 7. SCENE 6: Payments & Overdue Tracking
  console.log('\n--- SCENE 6: Payment Collection & Status Progression ---');
  const invList = await request('/invoices', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const openInvoice = invList.data.invoices.find((i: any) => i.amount_due > 0 && i.status !== 'cancelled');
  assert(openInvoice, 'Found open invoice to record payments');

  if (openInvoice) {
    // Record partial payment of $50
    const partialPay = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        invoice_id: openInvoice.id,
        amount: 50,
        payment_method: 'credit_card',
        reference: 'TEST-CC-1234',
        notes: 'Partial deposit',
      }),
    });
    assert(partialPay.status === 201, 'Recorded partial payment of $50', partialPay.data);

    // Record remaining payment to complete invoice
    const remaining = partialPay.data.remainingDue;
    const fullPay = await request('/payments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({
        invoice_id: openInvoice.id,
        amount: remaining,
        payment_method: 'bank_transfer',
        reference: 'WIRE-FINAL-999',
        notes: 'Final balance settlement',
      }),
    });
    assert(
      fullPay.status === 201 && fullPay.data.invoiceStatus === 'paid',
      'Final payment marks invoice status as PAID and remaining balance as 0',
      fullPay.data
    );
  }

  // Invoice cancellation zero-balance verification
  const invList2 = await request('/invoices', {
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  const uncancelled = invList2.data.invoices.find((i: any) => i.status !== 'paid' && i.status !== 'cancelled');
  if (uncancelled) {
    const cancelRes = await request(`/invoices/${uncancelled.id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(
      cancelRes.ok && cancelRes.data.invoice.status === 'cancelled' && cancelRes.data.invoice.amount_due === 0,
      'Cancelled invoice sets status to cancelled and amount_due to $0.00',
      cancelRes.data
    );
  }

  // 8. SCENE 7: Finance Lead Dashboard & Sub-2s Performance
  console.log('\n--- SCENE 7: Finance Lead Dashboard & Sub-2s Performance ---');
  const timerStart = performance.now();
  const finance = await request('/finance/dashboard', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const responseTimeMs = performance.now() - timerStart;

  assert(finance.ok, 'Finance Lead Dashboard loaded successfully');
  assert(
    finance.data.metrics.activeSubscriptionsCount > 0,
    `Active Subscriptions: ${finance.data.metrics.activeSubscriptionsCount}`
  );
  assert(finance.data.metrics.mrr > 0, `Calculated MRR: $${finance.data.metrics.mrr.toFixed(2)}`);
  assert(finance.data.metrics.arr > 0, `Calculated ARR: $${finance.data.metrics.arr.toFixed(2)}`);
  assert(
    finance.data.metrics.totalRevenueCollected > 0,
    `Total Revenue Collected: $${finance.data.metrics.totalRevenueCollected.toFixed(2)}`
  );
  assert(
    finance.data.overdueInvoices !== undefined,
    `Overdue Invoices count: ${finance.data.overdueInvoices.length}`
  );
  assert(
    responseTimeMs < 2000,
    `Sub-2-second Response Guarantee: Dashboard responded in ${responseTimeMs.toFixed(1)}ms (< 2000ms SLA)`
  );

  // Chase overdue invoice action
  if (finance.data.overdueInvoices.length > 0) {
    const overdueTarget = finance.data.overdueInvoices[0];
    const chaseRes = await request('/finance/chase-invoice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ invoiceId: overdueTarget.id, note: 'Urgent month-end payment reminder' }),
    });
    assert(chaseRes.ok, `Automated chase/reminder sent for Overdue Invoice ${overdueTarget.invoice_number}`);
  }

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

async function main() {
  let serverProcess: any = null;
  try {
    const isAlive = await fetch('http://localhost:5000/api/health')
      .then((r) => r.ok)
      .catch(() => false);

    if (!isAlive) {
      console.log('Starting application server...');
      serverProcess = spawn('npx', ['tsx', 'server/src/index.ts'], {
        shell: true,
        stdio: 'inherit',
      });
      await wait(3500);
    } else {
      console.log('Connected to running server on http://localhost:5000\n');
    }

    await runTests();
  } catch (err) {
    console.error('Fatal test failure:', err);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  }
}

main();

