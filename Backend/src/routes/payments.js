import express from "express";
import { Invoice, Contact } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { canEditAll } from "../services/accessScope.js";
import {
  PaymentGatewayError,
  createHostedCheckout,
  getPaymentGatewayConfig,
  processStripeEvent,
  verifyWebhookSignature
} from "../services/paymentGateway.js";

const router = express.Router();

router.get(
  "/config",
  authenticateToken,
  requirePermission(["payments.view", "payments.create"]),
  (req, res) => {
    const config = getPaymentGatewayConfig();
    let message = "Online payments are ready.";
    if (!config.configured) {
      message = "Online payments are not configured. Add STRIPE_SECRET_KEY on the server.";
    } else if (!config.webhookConfigured) {
      message = "Add STRIPE_WEBHOOK_SECRET so completed payments can be verified.";
    } else if (config.provider !== "stripe") {
      message = `Unsupported payment gateway "${config.provider}".`;
    }

    res.set("Cache-Control", "private, no-store");
    res.json({
      provider: config.provider,
      configured: config.configured,
      webhookConfigured: config.webhookConfigured,
      checkoutReady: config.checkoutReady && config.provider === "stripe",
      currency: config.currency,
      mode: config.mode,
      message
    });
  }
);

router.post(
  "/invoices/:id/checkout",
  authenticateToken,
  requirePermission("payments.create"),
  async (req, res) => {
    try {
      const invoice = await Invoice.findOne({
        where: canEditAll(req.user)
          ? { id: req.params.id }
          : { id: req.params.id, userId: req.user.id },
        include: [{ model: Contact, attributes: ["id", "name", "email"] }]
      });
      if (!invoice) return res.status(404).json({ error: "Invoice not found." });
      if (invoice.type !== "Invoice") {
        return res.status(400).json({ error: "Only invoices can be paid online." });
      }
      if (invoice.status === "Void") {
        return res.status(409).json({ error: "Void invoices cannot receive payments." });
      }

      const balance = Number(invoice.amount || 0) -
        Number(invoice.amount_paid || 0) -
        Number(invoice.credit_amount || 0);
      if (!(balance > 0)) {
        return res.status(409).json({ error: "This invoice has no outstanding balance." });
      }

      const requested = req.body?.amount === undefined ? balance : Number(req.body.amount);
      if (!Number.isFinite(requested) || requested <= 0) {
        return res.status(400).json({ error: "Enter a payment amount greater than zero." });
      }
      if (requested > balance + 0.009) {
        return res.status(400).json({
          error: `The amount exceeds the outstanding balance of ${balance.toFixed(2)}.`
        });
      }

      const config = getPaymentGatewayConfig();
      const { checkout, session } = await createHostedCheckout({
        invoice,
        amount: requested,
        contactEmail: invoice.Contact?.email || null,
        userId: req.user.id,
        config
      });

      await logAudit(req.user.id, "INVOICE_CHECKOUT_CREATED", "Invoice", invoice.id, {
        provider: config.provider,
        amount: Number(requested.toFixed(2)),
        currency: config.currency,
        sessionId: session.id
      });

      res.status(201).json({
        message: "Hosted checkout created.",
        checkoutId: checkout.id,
        sessionId: session.id,
        checkoutUrl: session.url,
        amount: Number(requested.toFixed(2)),
        currency: config.currency,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null
      });
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      console.error("[Invoice checkout]", error.message);
      res.status(500).json({ error: "The hosted checkout could not be created." });
    }
  }
);

/**
 * Mounted in server.js before express.json() so Stripe receives the exact raw
 * bytes it signed. No authentication header is used; the signature is the
 * authentication mechanism.
 */
export async function stripeWebhookHandler(req, res) {
  const config = getPaymentGatewayConfig();
  if (config.provider !== "stripe") {
    return res.status(503).json({ error: "Stripe webhooks are not enabled." });
  }

  let event;
  try {
    event = verifyWebhookSignature(
      req.body,
      req.headers["stripe-signature"],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    const status = error instanceof PaymentGatewayError ? error.status : 400;
    return res.status(status).json({
      error: error instanceof PaymentGatewayError
        ? error.message
        : "The payment webhook signature is invalid."
    });
  }

  try {
    const result = await processStripeEvent(event);
    res.json(result);
  } catch (error) {
    console.error("[Stripe webhook]", error.message);
    res.status(500).json({ error: "The payment webhook could not be processed." });
  }
}

export default router;
