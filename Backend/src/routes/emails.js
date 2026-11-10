import express from "express";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { EmailLog, Contact, ActivityLog } from "../db.js";
import { authenticateToken, logAudit } from "../middleware/auth.js";
import { sanitizeString, isValidEmail } from "../middleware/security.js";

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

// Standard Email Templates
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
router.get("/templates", (req, res) => {
  res.json(TEMPLATES);
});

// GET /api/emails - sent history with tracking stats
router.get("/", async (req, res) => {
  try {
    const emails = await EmailLog.findAll({
      order: [["id", "DESC"]]
    });
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email logs", details: err.message });
  }
});

// POST /api/emails/send - send, track, and log an email
router.post("/send", async (req, res) => {
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

    // Check for SMTP configuration in env
    const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
    let deliveryStatus = "Sent";

    if (hasSmtp) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587", 10),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        const trackingHtml = `${body.replace(/\n/g, "<br>")}<br><br><img src="${process.env.APP_URL || "http://localhost:5000"}/api/emails/track/${trackingPixelId}" width="1" height="1" alt="" />`;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"SCRM Team" <noreply@scrm.enterprise>`,
          to: recipientEmail,
          subject,
          text: body,
          html: trackingHtml
        });
      } catch (smtpErr) {
        console.warn("[SMTP Notice] Direct dispatch failed, marked as simulated sent:", smtpErr.message);
        deliveryStatus = "Sent (Simulated)";
      }
    } else {
      deliveryStatus = "Sent (Simulated)";
    }

    const emailLog = await EmailLog.create({
      user_id: req.user.id,
      contact_id: contactId ? parseInt(contactId, 10) : null,
      template_name: templateName || "Custom",
      recipient_email: recipientEmail,
      subject,
      body,
      tracking_pixel_id: trackingPixelId,
      status: deliveryStatus
    });

    // Auto-record interaction in ActivityLog
    await logAudit(req.user.id, "SEND_EMAIL", "Email", emailLog.id, {
      recipient: recipientEmail,
      subject,
      contactId,
      trackingPixelId
    });

    res.status(201).json({
      message: `Email dispatched successfully to ${recipientEmail}`,
      emailLog
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

export default router;
