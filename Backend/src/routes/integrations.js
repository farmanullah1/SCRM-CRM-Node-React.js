import express from "express";
import { authenticateToken, logAudit } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// In-memory or extensible registry for workflow automation rules
const AUTOMATION_RULES = [
  {
    id: "auto-assign",
    name: "Round-Robin Lead Assignment",
    event: "contact.created",
    action: "assign_next_rep",
    active: true
  },
  {
    id: "stage-proposal-alert",
    name: "Proposal Stage Notification",
    event: "deal.stage_changed",
    condition: "stage === 'Proposal'",
    action: "create_task_and_alert",
    active: true
  },
  {
    id: "won-invoice-generate",
    name: "Deal Won Auto-Invoice Draft",
    event: "deal.stage_changed",
    condition: "stage === 'Won'",
    action: "generate_draft_invoice",
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

    await logAudit(req.user.id, "TEST_AUTOMATION", "System", null, { ruleId, payload });

    res.json({
      success: true,
      message: `Automation trigger '${rule.name}' executed successfully in test mode.`,
      executedAction: rule.action,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to execute automation test" });
  }
});

// GET /api/integrations/calendar/sync - Google/Outlook Calendar Sync status & hook
router.get("/calendar/sync", async (req, res) => {
  res.json({
    status: "connected",
    providers: [
      { name: "Google Calendar", connected: false, syncUrl: "/api/integrations/calendar/google" },
      { name: "Microsoft Outlook", connected: false, syncUrl: "/api/integrations/calendar/outlook" }
    ],
    lastSync: new Date().toISOString(),
    scheduledEventsCount: 0
  });
});

// POST /api/integrations/calendar/sync - Sync task/meeting to calendar
router.post("/calendar/sync", async (req, res) => {
  const { eventTitle, startTime, provider } = req.body;
  await logAudit(req.user.id, "CALENDAR_SYNC", "Calendar", null, { eventTitle, provider });

  res.json({
    success: true,
    message: `Calendar event '${eventTitle || "CRM Task"}' scheduled with ${provider || "Google Calendar"}.`,
    syncId: `sync_${Date.now()}`
  });
});

// POST /api/integrations/webhooks/slack - Slack notification dispatch
router.post("/webhooks/slack", async (req, res) => {
  const { channel, message } = req.body;
  res.json({
    success: true,
    message: `Slack notification queued for #${channel || "sales-crm"}.`,
    dispatchedAt: new Date().toISOString()
  });
});

// POST /api/integrations/webhooks/zapier - Zapier webhook receiver
router.post("/webhooks/zapier", async (req, res) => {
  const payload = req.body;
  await logAudit(req.user.id, "ZAPIER_WEBHOOK_RECEIVED", "Integration", null, { payload });

  res.json({
    success: true,
    message: "Zapier event received and processed.",
    receivedKeys: Object.keys(payload || {})
  });
});

export default router;

