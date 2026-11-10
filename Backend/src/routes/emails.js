import express from "express";
import { Email, Contact, Activity } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// Standard Email Templates
const TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome & Introduction",
    subject: "Welcome to our partner network, {{name}}!",
    body: "Hi {{name}},\n\nThank you for connecting with us at {{company}}. We look forward to supporting your business goals.\n\nBest regards,\nSCRM Team"
  },
  {
    id: "followup",
    name: "Deal Follow-Up",
    subject: "Following up on our recent discussion",
    body: "Hi {{name}},\n\nI wanted to follow up on our previous conversation regarding your project requirements. When would be a good time this week for a brief call?\n\nBest,\nSCRM Team"
  },
  {
    id: "proposal",
    name: "Proposal Submission",
    subject: "SCRM Proposal & Terms for {{company}}",
    body: "Hi {{name}},\n\nPlease find our formal commercial proposal and scope outline. Let us know if you have any questions.\n\nSincerely,\nSCRM Team"
  }
];

// GET /api/emails/templates
router.get("/templates", (req, res) => {
  res.json(TEMPLATES);
});

// GET /api/emails - sent history
router.get("/", async (req, res) => {
  try {
    const emails = await Email.findAll({
      where: { userId: req.user.id },
      include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }],
      order: [["id", "DESC"]]
    });
    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email logs", details: err.message });
  }
});

// POST /api/emails/send - send/log an email
router.post("/send", async (req, res) => {
  try {
    const { contactId, recipientEmail, subject, body } = req.body;
    if (!recipientEmail || !subject || !body) {
      return res.status(400).json({ error: "Recipient email, subject, and body are required." });
    }

    const emailLog = await Email.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      recipientEmail: recipientEmail.trim(),
      subject: subject.trim(),
      body: body.trim(),
      status: "Sent"
    });

    // Auto-record interaction in Activity log
    await Activity.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      type: "Email",
      title: `Sent Email: ${subject.trim()}`,
      description: body.trim().slice(0, 200) + (body.length > 200 ? "..." : "")
    });

    res.status(201).json({ message: "Email sent and logged successfully", emailLog });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email", details: err.message });
  }
});

export default router;
