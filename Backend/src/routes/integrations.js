import express from "express";
import { authenticateToken, logAudit } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// These are the automations that really run in the lead pipeline.
const AUTOMATION_RULES = [
  {
    id: "lead-capture",
    name: "Web-to-Lead Auto-Capture",
    event: "web_lead.submitted",
    action: "create_lead_and_score",
    active: true
  },
  {
    id: "lead-scoring",
    name: "Behavioural Lead Scoring",
    event: "lead.created_or_updated",
    action: "recalculate_score",
    active: true
  },
  {
    id: "round-robin",
    name: "Round-Robin Lead Assignment",
    event: "lead.unassigned_created",
    action: "assign_least_loaded_rep",
    active: true
  }
];

// GET /api/integrations/automations - List active workflow automations
router.get("/automations", (req, res) => {
  res.json({ automations: AUTOMATION_RULES });
});

// POST /api/integrations/automations/test - Test an automation trigger
router.post("/automations/test", async (req, res) => {
  try {
    const { ruleId, payload } = req.body;
    const rule = AUTOMATION_RULES.find((r) => r.id === ruleId);
    if (!rule) {
      return res.status(404).json({ error: "Automation rule not found" });
    }

    await logAudit(req.user.id, "AUTOMATION_DRY_RUN", "System", null, { ruleId, payload });

    res.json({
      success: true,
      dryRun: true,
      message: `'${rule.name}' is active on real records. This dry run checked the trigger only and changed no data.`,
      actionThatRuns: rule.action,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to execute automation test" });
  }
});

// GET /api/integrations/calendar/sync - Google/Outlook Calendar Sync status & hook
router.get("/calendar/sync", async (req, res) => {
  res.json({
    status: "not_configured",
    providers: [
      { name: "Google Calendar", connected: false, syncUrl: "/api/integrations/calendar/google" },
      { name: "Microsoft Outlook", connected: false, syncUrl: "/api/integrations/calendar/outlook" }
    ],
    lastSync: null,
    scheduledEventsCount: 0
  });
});

// POST /api/integrations/calendar/sync - Sync task/meeting to calendar
router.post("/calendar/sync", async (req, res) => {
  res.status(501).json({
    error: "Calendar sync is not configured. Connect a Google or Microsoft OAuth app before scheduling events."
  });
});

// POST /api/integrations/webhooks/slack - Slack notification dispatch
router.post("/webhooks/slack", async (req, res) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(503).json({ error: "Slack is not configured. Add SLACK_WEBHOOK_URL on the server." });
  }
  const { channel, message } = req.body;
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `#${channel || "sales-crm"}: ${message || "CRM notification"}` })
    });
    if (!response.ok) throw new Error(`Slack returned ${response.status}`);
    res.json({ success: true, message: "Slack accepted the notification.", dispatchedAt: new Date().toISOString() });
  } catch (error) {
    res.status(502).json({ error: `Slack delivery failed: ${error.message}` });
  }
});

// POST /api/integrations/webhooks/zapier - Zapier webhook receiver
router.post("/webhooks/zapier", async (req, res) => {
  const payload = req.body;
  await logAudit(req.user.id, "ZAPIER_WEBHOOK_RECEIVED", "Integration", null, { payload });

  res.json({
    success: true,
    processed: false,
    message: "Zapier event received and written to the audit log. No record was changed by this endpoint.",
    receivedKeys: Object.keys(payload || {})
  });
});

export default router;

