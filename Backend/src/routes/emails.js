import express from "express";
import crypto from "crypto";
import { EmailLog, Contact, ActivityLog } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString, isValidEmail } from "../middleware/security.js";
import emailService, { buildBrandedEmailHtml } from "../services/emailService.js";

const router = express.Router();

// 1x1 Transparent GIF buffer for email open tracking
const TRANSPARENT_PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

// PUBLIC Tracking Pixel Endpoint: GET /api/emails/track/:pixelId
router.get("/track/:pixelId", async (req, res) => {
  try {
    const { pixelId } = req.params;
    if (pixelId) {
      const email = await EmailLog.findOne({ where: { tracking_pixel_id: pixelId } });
      if (email && !email.is_opened) {
        email.is_opened = true;
        email.opened_at = new Date();
        await email.save();

        if (email.contact_id) {
          await ActivityLog.create({
            user_id: email.user_id,
            action: "EMAIL_OPENED",
            target_type: "Email",
            target_id: email.id,
            details_json: JSON.stringify({
              subject: email.subject,
              recipient: email.recipient_email,
              openedAt: email.opened_at
            })
          });
        }
      }
    }
  } catch (err) {
    console.error("[Email Tracking Error]", err.message);
  }

  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_PIXEL.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, private"
  });
  res.end(TRANSPARENT_PIXEL);
});

// Standard Email Templates with SCRM visual branding
const TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome & Introduction",
    subject: "Welcome to SCRM, {{name}}!",
    body: "Hi {{name}},\n\nThank you for connecting with us at {{company}}. We are excited to partner with you to streamline your operations and drive growth.\n\nBest regards,\nSCRM Team"
  },
  {
    id: "followup",
    name: "Deal Follow-Up",
    subject: "Following up on our recent discussion with {{company}}",
    body: "Hi {{name}},\n\nI wanted to follow up on our previous conversation regarding your software requirements. When would be a good time this week for a brief call to align on next steps?\n\nBest regards,\nSCRM Team"
  },
  {
    id: "proposal",
    name: "Formal Proposal Submission",
    subject: "SCRM Enterprise Proposal & Terms for {{company}}",
    body: "Hi {{name}},\n\nPlease review our formal commercial proposal and implementation roadmap. Let us know if you would like to schedule a walkthrough.\n\nSincerely,\nSCRM Enterprise Team"
  },
  {
    id: "support",
    name: "Support Resolution Notice",
    subject: "Your support inquiry with SCRM has been updated",
    body: "Hi {{name}},\n\nOur customer operations team has updated your ticket with a verified resolution. Please check your dashboard or reply to this message if you need further assistance.\n\nBest,\nSCRM Support"
  }
];

// All subsequent routes require authentication
router.use(authenticateToken);

// GET /api/emails/templates
router.get("/templates", requirePermission("emails.view"), (req, res) => {
  res.json(TEMPLATES);
});

// GET /api/emails - sent history with tracking stats
router.get("/", requirePermission("emails.view"), async (req, res) => {
  try {
    const emails = await EmailLog.findAll({
      order: [["id", "DESC"]]
    });
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email logs", details: err.message });
  }
});

// POST /api/emails/send - send, track, and log an email with branded HTML
router.post("/send", requirePermission("emails.send"), async (req, res) => {
  try {
    let { contactId, recipientEmail, subject, body, templateName } = req.body;

    recipientEmail = sanitizeString(recipientEmail)?.toLowerCase();
    subject = sanitizeString(subject);

    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: "Recipient email, subject, and body are required." });
    }

    if (!isValidEmail(recipientEmail)) {
      return res.status(400).json({ error: "Valid recipient email is required." });
    }

    const trackingPixelId = crypto.randomUUID();

    // Render into branded SCRM HTML layout
    const formattedBodyHtml = body
      .split("\n")
      .map(line => `<p style="margin: 0 0 12px 0;">${line}</p>`)
      .join("");

    const brandedHtml = buildBrandedEmailHtml({
      title: subject,
      bodyHtml: formattedBodyHtml,
      trackingPixelId
    });

    const dispatchResult = await emailService.sendEmail({
      to: recipientEmail,
      subject,
      html: brandedHtml,
      text: body,
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      templateName: templateName || "Custom",
      trackingPixelId
    });

    // Auto-record interaction in ActivityLog
    await logAudit(req.user.id, "SEND_EMAIL", "Email", dispatchResult.logId || null, {
      recipient: recipientEmail,
      subject,
      contactId,
      trackingPixelId
    });

    res.status(201).json({
      message: `Email dispatched successfully to ${recipientEmail}`,
      status: dispatchResult.status,
      trackingPixelId
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

export default router;
