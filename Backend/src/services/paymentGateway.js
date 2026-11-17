import Stripe from "stripe";
import { Invoice, InvoicePayment, PaymentCheckout, sequelize } from "../db.js";
import { logAudit } from "../middleware/auth.js";
import { recalculateInvoicePayments } from "./invoicePayments.js";
import { createNotification } from "../routes/notifications.js";

const SUPPORTED_PROVIDERS = new Set(["stripe"]);

export class PaymentGatewayError extends Error {
  constructor(message, status = 502, code = "PAYMENT_GATEWAY_ERROR") {
    super(message);
    this.name = "PaymentGatewayError";
    this.status = status;
    this.code = code;
  }
}

function normaliseBaseUrl(value) {
  return String(value || "http://localhost:5173").replace(/\/+$/, "");
}

export function getPaymentGatewayConfig(env = process.env) {
  const provider = String(env.PAYMENT_GATEWAY || "stripe").toLowerCase();
  const secretKey = String(env.STRIPE_SECRET_KEY || "").trim();
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  const currency = String(env.PAYMENT_CURRENCY || "usd").trim().toLowerCase();
  const appUrl = normaliseBaseUrl(env.PAYMENT_APP_URL || env.APP_URL);
  const configured = SUPPORTED_PROVIDERS.has(provider) && Boolean(secretKey);
  const webhookConfigured = SUPPORTED_PROVIDERS.has(provider) && Boolean(webhookSecret);
  const mode = secretKey.startsWith("sk_live_") ? "live" : secretKey ? "test" : null;

  return {
    provider,
    configured,
    webhookConfigured,
    checkoutReady: configured && webhookConfigured,
    currency,
    mode,
    appUrl,
    successUrl: env.PAYMENT_CHECKOUT_SUCCESS_URL ||
      `${appUrl}/app/invoices?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: env.PAYMENT_CHECKOUT_CANCEL_URL ||
      `${appUrl}/app/invoices?payment=cancelled`
  };
}

function assertCheckoutReady(config) {
  if (!SUPPORTED_PROVIDERS.has(config.provider)) {
    throw new PaymentGatewayError(
      `Unsupported payment gateway "${config.provider}". Set PAYMENT_GATEWAY=stripe.`,
      503,
      "PAYMENT_GATEWAY_UNSUPPORTED"
    );
  }
  if (!config.configured) {
    throw new PaymentGatewayError(
      "Online payments are not configured. Add STRIPE_SECRET_KEY on the server.",
      503,
      "PAYMENT_GATEWAY_NOT_CONFIGURED"
    );
  }
  if (!config.webhookConfigured) {
    throw new PaymentGatewayError(
      "Online payments are not ready. Add STRIPE_WEBHOOK_SECRET so completed payments can be verified.",
      503,
      "PAYMENT_WEBHOOK_NOT_CONFIGURED"
    );
  }
}

export function getStripeClient(config = getPaymentGatewayConfig()) {
  if (!config.configured) {
    throw new PaymentGatewayError(
      "Online payments are not configured. Add STRIPE_SECRET_KEY on the server.",
      503,
      "PAYMENT_GATEWAY_NOT_CONFIGURED"
    );
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export function buildCheckoutSessionParams({
  invoice,
  amount,
  currency,
  successUrl,
  cancelUrl,
  contactEmail = null,
  userId = null
}) {
  const unitAmount = Math.round(Number(amount) * 100);
  if (!Number.isInteger(unitAmount) || unitAmount <= 0) {
    throw new PaymentGatewayError("Enter a valid payment amount.", 400, "INVALID_PAYMENT_AMOUNT");
  }

  return {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(invoice.id),
    customer_email: contactEmail || undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: unitAmount,
          product_data: {
            name: `Invoice ${invoice.invoiceNumber}`,
            description: `Online payment for ${invoice.invoiceNumber}`
          }
        }
      }
    ],
    metadata: {
      invoiceId: String(invoice.id),
      invoiceNumber: String(invoice.invoiceNumber),
      userId: userId ? String(userId) : ""
    },
    payment_intent_data: {
      metadata: {
        invoiceId: String(invoice.id),
        invoiceNumber: String(invoice.invoiceNumber)
      }
    },
    allow_promotion_codes: false
  };
}

export async function createHostedCheckout({
  invoice,
  amount,
  contactEmail,
  userId,
  config = getPaymentGatewayConfig(),
  stripeClient = null
}) {
  assertCheckoutReady(config);
  const client = stripeClient || getStripeClient(config);
  const params = buildCheckoutSessionParams({
    invoice,
    amount,
    currency: config.currency,
    successUrl: config.successUrl,
    cancelUrl: config.cancelUrl,
    contactEmail,
    userId
  });

  let session;
  try {
    session = await client.checkout.sessions.create(params);
  } catch (error) {
    console.error("[Payment gateway] Checkout creation failed:", error.message);
    throw new PaymentGatewayError(
      "The payment provider could not open a checkout session. Check the server's Stripe configuration.",
      502,
      "CHECKOUT_CREATION_FAILED"
    );
  }

  const checkout = await PaymentCheckout.create({
    invoiceId: invoice.id,
    userId: userId || null,
    provider: config.provider,
    providerSessionId: session.id,
    amount: Number(Number(amount).toFixed(2)),
    currency: config.currency,
    status: "Pending",
    checkoutUrl: session.url,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : null
  });

  return { checkout, session };
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret) {
    throw new PaymentGatewayError(
      "The payment webhook secret is not configured.",
      503,
      "PAYMENT_WEBHOOK_NOT_CONFIGURED"
    );
  }
  if (!signature) {
    throw new PaymentGatewayError("Missing Stripe-Signature header.", 400, "MISSING_SIGNATURE");
  }

  try {
    return new Stripe("sk_test_signature_verification").webhooks.constructEvent(
      rawBody,
      signature,
      secret
    );
  } catch (error) {
    throw new PaymentGatewayError(
      "The payment webhook signature is invalid.",
      400,
      "INVALID_SIGNATURE"
    );
  }
}

async function markCheckoutCompleted(checkout, completedAt) {
  if (!checkout) return;
  checkout.status = "Completed";
  checkout.completedAt = completedAt;
  await checkout.save();
}

/**
 * Apply a completed Checkout Session exactly once. Stripe retries webhooks, so
 * the invoice payment reference and checkout status both act as idempotency
 * guards.
 */
export async function processCheckoutSession(session, eventType = "checkout.session.completed") {
  if (!session?.id) return { received: true, ignored: true, reason: "missing_session" };

  const existingCheckout = await PaymentCheckout.findOne({
    where: { providerSessionId: session.id }
  });

  if (existingCheckout?.status === "Completed") {
    return { received: true, duplicate: true, invoiceId: existingCheckout.invoiceId };
  }

  if (eventType === "checkout.session.expired") {
    if (existingCheckout && existingCheckout.status === "Pending") {
      existingCheckout.status = "Expired";
      await existingCheckout.save();
    }
    return { received: true, expired: true, invoiceId: existingCheckout?.invoiceId || null };
  }

  if (!["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(eventType)) {
    return { received: true, ignored: true, reason: "unsupported_event" };
  }

  if (session.payment_status && session.payment_status !== "paid") {
    return { received: true, ignored: true, reason: "payment_not_paid" };
  }

  const invoiceId = Number(session.metadata?.invoiceId || session.client_reference_id);
  const paidAmount = Number(session.amount_total || 0) / 100;
  if (!Number.isInteger(invoiceId) || invoiceId <= 0 || !(paidAmount > 0)) {
    console.error("[Payment webhook] Session is missing an invoice or paid amount:", session.id);
    return { received: true, ignored: true, reason: "invalid_metadata" };
  }

  const existingPayment = await InvoicePayment.findOne({
    where: { invoiceId, reference: session.id }
  });
  if (existingPayment) {
    await markCheckoutCompleted(existingCheckout, new Date());
    return { received: true, duplicate: true, invoiceId, paymentId: existingPayment.id };
  }

  const transaction = await sequelize.transaction();
  let result;
  try {
    const invoice = await Invoice.findByPk(invoiceId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!invoice) {
      await transaction.rollback();
      console.error("[Payment webhook] Invoice not found for session:", session.id);
      return { received: true, ignored: true, reason: "invoice_not_found" };
    }

    const duplicate = await InvoicePayment.findOne({
      where: { invoiceId, reference: session.id },
      transaction
    });
    if (duplicate) {
      await transaction.commit();
      await markCheckoutCompleted(existingCheckout, new Date());
      return { received: true, duplicate: true, invoiceId, paymentId: duplicate.id };
    }

    const paidAt = session.created ? new Date(session.created * 1000) : new Date();
    const payment = await InvoicePayment.create({
      invoiceId,
      userId: existingCheckout?.userId || invoice.userId,
      kind: "Payment",
      amount: Number(paidAmount.toFixed(2)),
      method: "Stripe Checkout",
      reference: session.id,
      note: "Online card payment verified by signed gateway webhook",
      paid_at: paidAt
    }, { transaction });

    const totals = await recalculateInvoicePayments(invoice, transaction);
    if (existingCheckout) {
      existingCheckout.status = "Completed";
      existingCheckout.completedAt = new Date();
      await existingCheckout.save({ transaction });
    } else {
      await PaymentCheckout.create({
        invoiceId,
        userId: invoice.userId,
        provider: "stripe",
        providerSessionId: session.id,
        amount: Number(paidAmount.toFixed(2)),
        currency: session.currency || "usd",
        status: "Completed",
        completedAt: new Date()
      }, { transaction });
    }

    await transaction.commit();
    result = { payment, invoice, totals };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  await logAudit(result.payment.userId, "INVOICE_ONLINE_PAYMENT", "Invoice", result.invoice.id, {
    provider: "stripe",
    amount: Number(paidAmount.toFixed(2)),
    reference: session.id,
    balance: result.totals.balance
  });
  await createNotification({
    userId: result.invoice.userId,
    type: "invoice",
    title: `Online payment received for ${result.invoice.invoiceNumber}`,
    body: `$${Number(paidAmount).toFixed(2)} · balance $${result.totals.balance.toFixed(2)}`,
    link: "/app/invoices"
  });

  return {
    received: true,
    invoiceId,
    paymentId: result.payment.id,
    amount: Number(paidAmount.toFixed(2)),
    balance: result.totals.balance
  };
}

export async function processStripeEvent(event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      return processCheckoutSession(event.data.object, event.type);
    default:
      return { received: true, ignored: true, reason: "unsupported_event" };
  }
}
