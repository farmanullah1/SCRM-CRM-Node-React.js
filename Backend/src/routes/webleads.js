import express from "express";
import crypto from "crypto";
import { WebLead, Lead, ApiKey, ActivityLog } from "../db.js";
import { authenticateToken, requireRole } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// SITE PILLAR: Public Web-to-Lead Ingestion Endpoint
// -----------------------------------------------------------------------------

// POST /api/site/web-lead - Public web form submission
router.post("/web-lead", async (req, res) => {
  try {
    const { name, email, phone, message, form_id, company_name } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required to submit an inquiry." });
    }

    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";

    // 1. Record in web_leads
    const webLead = await WebLead.create({
      form_id: form_id ? sanitizeString(form_id) : "public-landing-form",
      name: sanitizeString(name),
      email: sanitizeString(email),
      phone: phone ? sanitizeString(phone) : null,
      message: message ? sanitizeString(message) : null,
      ip_address: typeof clientIp === "string" ? clientIp.slice(0, 50) : "127.0.0.1",
      is_processed: true
    });

    // 2. Automatically spawn an inbound Lead
    const newLead = await Lead.create({
      name: sanitizeString(name),
      email: sanitizeString(email),
      phone: phone ? sanitizeString(phone) : null,
      company_name: company_name ? sanitizeString(company_name) : "Web Inbound Lead",
      source: "Web Form",
      status: "New",
      estimated_value: 5000.00,
      notes: message ? `Inquiry Message: ${sanitizeString(message)}` : "Submitted via SCRM Web Form"
    });

    res.status(201).json({
      success: true,
      message: "Thank you! Your inquiry has been received by our sales team.",
      leadId: newLead.id
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to process web lead: " + error.message });
  }
});

// GET /api/site/web-leads - List submissions (Authenticated)
router.get("/web-leads", authenticateToken, async (req, res) => {
  try {
    const submissions = await WebLead.findAll({
      order: [["createdAt", "DESC"]],
      limit: 100
    });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch web leads: " + error.message });
  }
});

// -----------------------------------------------------------------------------
// SOFTWARE PILLAR: Developer API Keys
// -----------------------------------------------------------------------------

// GET /api/site/api-keys - List API Keys
router.get("/api-keys", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const keys = await ApiKey.findAll({
      where: { user_id: req.user.id },
      attributes: ["id", "name", "key_prefix", "last_used_at", "expires_at", "createdAt"]
    });
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: "Failed to list API keys: " + error.message });
  }
});

// POST /api/site/api-keys - Generate new API Key
router.post("/api-keys", authenticateToken, requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Key name is required." });

    const rawKey = `scrm_live_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 14);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const newKey = await ApiKey.create({
      user_id: req.user.id,
      name: sanitizeString(name),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions_json: JSON.stringify(["read:contacts", "write:leads", "read:deals"])
    });

    res.status(201).json({
      message: "API Key created successfully. Store this secret key now — it cannot be viewed again.",
      apiKey: rawKey,
      keyMeta: {
        id: newKey.id,
        name: newKey.name,
        key_prefix: newKey.key_prefix,
        createdAt: newKey.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate API key: " + error.message });
  }
});

export default router;

