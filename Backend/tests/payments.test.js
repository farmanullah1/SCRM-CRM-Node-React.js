import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import jwt from "jsonwebtoken";
import {
  sequelize,
  User,
  Invoice,
  InvoicePayment,
  PaymentCheckout,
  ActivityLog,
  Notification
} from "../src/db.js";
import {
  buildCheckoutSessionParams,
  createHostedCheckout,
  getPaymentGatewayConfig,
  processCheckoutSession,
  verifyWebhookSignature
} from "../src/services/paymentGateway.js";

const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const SESSION_ID = `cs_test_payment_${STAMP}`;
const WEBHOOK_SECRET = "whsec_test_payment_suite";
const API_BASE = process.env.API_BASE || "http://localhost:5000";
let user;
let standardUser;
let standardToken;
let invoice;

function sessionPayload(id, amountCents, overrides = {}) {
  return {
    id,
    object: "checkout.session",
    payment_status: "paid",
    amount_total: amountCents,
    currency: "usd",
    created: Math.floor(Date.now() / 1000),
    metadata: { invoiceId: String(invoice.id), invoiceNumber: invoice.invoiceNumber },
    client_reference_id: String(invoice.id),
    ...overrides
  };
}

before(async () => {
  await sequelize.authenticate();
  user = await User.create({
    name: `QA Payments ${STAMP}`,
    email: `qa-payments-${STAMP}@example.com`,
    password: "not-used-by-this-suite",
    role: "admin",
    is_active: true
  });
  standardUser = await User.create({
    name: `QA Payments Standard ${STAMP}`,
    email: `qa-payments-standard-${STAMP}@example.com`,
    password: "not-used-by-this-suite",
    role: "standard_user",
    is_active: true
  });
  standardToken = jwt.sign(
    { id: standardUser.id, ver: 0 },
    process.env.JWT_SECRET || "default_jwt_secret_dev"
  );

  invoice = await Invoice.create({
    userId: user.id,
    invoiceNumber: `QA-PAY-${STAMP}`,
    type: "Invoice",
    amount: 100,
    status: "Sent",
    issued_date: new Date()
  });
});

after(async () => {
  if (invoice) {
    await ActivityLog.destroy({ where: { target_type: "Invoice", target_id: invoice.id } });
    await Notification.destroy({ where: { userId: user.id } });
    await InvoicePayment.destroy({ where: { invoiceId: invoice.id } });
    await PaymentCheckout.destroy({ where: { invoiceId: invoice.id } });
    await invoice.destroy();
  }
  if (user) await user.destroy();
  if (standardUser) await standardUser.destroy();
  await sequelize.close();
});

test("gateway config reports readiness without exposing keys", () => {
  const empty = getPaymentGatewayConfig({});
  assert.equal(empty.configured, false);
  assert.equal(empty.webhookConfigured, false);
  assert.equal(empty.checkoutReady, false);
  assert.equal(empty.currency, "usd");
  assert.equal(Object.prototype.hasOwnProperty.call(empty, "secretKey"), false);

  const ready = getPaymentGatewayConfig({
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
    PAYMENT_CURRENCY: "EUR",
    PAYMENT_APP_URL: "https://crm.example.com/"
  });
  assert.equal(ready.configured, true);
  assert.equal(ready.webhookConfigured, true);
  assert.equal(ready.checkoutReady, true);
  assert.equal(ready.mode, "test");
  assert.equal(ready.currency, "eur");
  assert.equal(ready.successUrl, "https://crm.example.com/app/invoices?payment=success&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(ready.cancelUrl, "https://crm.example.com/app/invoices?payment=cancelled");
});

test("hosted checkout sends a partial amount in minor units", async () => {
  const params = buildCheckoutSessionParams({
    invoice,
    amount: 25.5,
    currency: "usd",
    successUrl: "https://crm.example.com/success",
    cancelUrl: "https://crm.example.com/cancel",
    contactEmail: "billing@example.com",
    userId: user.id
  });

  assert.equal(params.mode, "payment");
  assert.equal(params.line_items[0].price_data.unit_amount, 2550);
  assert.equal(params.line_items[0].price_data.currency, "usd");
  assert.equal(params.client_reference_id, String(invoice.id));
  assert.equal(params.customer_email, "billing@example.com");
  assert.equal(params.metadata.invoiceId, String(invoice.id));
  assert.throws(
    () => buildCheckoutSessionParams({ invoice, amount: 0, currency: "usd" }),
    /valid payment amount/i
  );
});

test("creating a hosted checkout persists a pending session", async () => {
  let captured;
  const fakeStripe = {
    checkout: {
      sessions: {
        create: async (params) => {
          captured = params;
          return {
            id: `cs_test_created_${STAMP}`,
            url: "https://checkout.stripe.com/c/pay/test-session",
            expires_at: Math.floor(Date.now() / 1000) + 1800
          };
        }
      }
    }
  };
  const config = {
    provider: "stripe",
    configured: true,
    webhookConfigured: true,
    checkoutReady: true,
    currency: "usd",
    successUrl: "https://crm.example.com/success",
    cancelUrl: "https://crm.example.com/cancel"
  };

  const { checkout, session } = await createHostedCheckout({
    invoice,
    amount: 40,
    contactEmail: "billing@example.com",
    userId: user.id,
    config,
    stripeClient: fakeStripe
  });

  assert.equal(session.url, "https://checkout.stripe.com/c/pay/test-session");
  assert.equal(captured.line_items[0].price_data.unit_amount, 4000);
  assert.equal(checkout.status, "Pending");
  assert.equal(Number(checkout.amount), 40);
  assert.equal(checkout.providerSessionId, session.id);

  const stored = await PaymentCheckout.findByPk(checkout.id);
  assert.equal(stored.currency, "usd");
});

test("webhook signature accepts a valid Stripe header and rejects tampering", () => {
  const payload = JSON.stringify({
    id: `evt_${STAMP}`,
    object: "event",
    type: "checkout.session.completed",
    data: { object: sessionPayload(SESSION_ID, 4000) }
  });
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: WEBHOOK_SECRET
  });

  const event = verifyWebhookSignature(payload, header, WEBHOOK_SECRET);
  assert.equal(event.id, `evt_${STAMP}`);
  assert.equal(event.type, "checkout.session.completed");

  assert.throws(
    () => verifyWebhookSignature(payload, header, "whsec_wrong_secret"),
    /signature is invalid/i
  );
  assert.throws(
    () => verifyWebhookSignature(payload, "", WEBHOOK_SECRET),
    /Missing Stripe-Signature/i
  );
});

test("signed completed checkout records partial payment and duplicate delivery is idempotent", async () => {
  const pending = await PaymentCheckout.create({
    invoiceId: invoice.id,
    userId: user.id,
    provider: "stripe",
    providerSessionId: SESSION_ID,
    amount: 40,
    currency: "usd",
    status: "Pending"
  });

  const first = await processCheckoutSession(
    sessionPayload(SESSION_ID, 4000),
    "checkout.session.completed"
  );
  assert.equal(first.received, true);
  assert.equal(first.amount, 40);
  assert.equal(first.balance, 60);

  await invoice.reload();
  assert.equal(Number(invoice.amount_paid), 40);
  assert.equal(invoice.status, "Partially Paid");
  assert.equal(await InvoicePayment.count({ where: { invoiceId: invoice.id } }), 1);

  const payment = await InvoicePayment.findOne({ where: { invoiceId: invoice.id } });
  assert.equal(payment.method, "Stripe Checkout");
  assert.equal(payment.reference, SESSION_ID);
  assert.equal(Number(payment.amount), 40);

  await pending.reload();
  assert.equal(pending.status, "Completed");

  const duplicate = await processCheckoutSession(
    sessionPayload(SESSION_ID, 4000),
    "checkout.session.completed"
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal(await InvoicePayment.count({ where: { invoiceId: invoice.id } }), 1);

  await invoice.reload();
  assert.equal(Number(invoice.amount_paid), 40);
  assert.equal(invoice.status, "Partially Paid");

  const finalSessionId = `cs_test_final_${STAMP}`;
  await PaymentCheckout.create({
    invoiceId: invoice.id,
    userId: user.id,
    provider: "stripe",
    providerSessionId: finalSessionId,
    amount: 60,
    currency: "usd",
    status: "Pending"
  });
  const final = await processCheckoutSession(
    sessionPayload(finalSessionId, 6000),
    "checkout.session.completed"
  );

  assert.equal(final.amount, 60);
  assert.equal(final.balance, 0);
  await invoice.reload();
  assert.equal(Number(invoice.amount_paid), 100);
  assert.equal(invoice.status, "Paid");
  assert.equal(await InvoicePayment.count({ where: { invoiceId: invoice.id } }), 2);
});

test("checkout and payment configuration require authentication and payments.create", async () => {
  const unauthenticated = await fetch(`${API_BASE}/api/payments/invoices/${invoice.id}/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 10 })
  });
  assert.equal(unauthenticated.status, 401);

  const denied = await fetch(`${API_BASE}/api/payments/invoices/${invoice.id}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${standardToken}`
    },
    body: JSON.stringify({ amount: 10 })
  });
  assert.equal(denied.status, 403);

  const configDenied = await fetch(`${API_BASE}/api/payments/config`, {
    headers: { Authorization: `Bearer ${standardToken}` }
  });
  assert.equal(configDenied.status, 403);
});
