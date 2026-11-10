import express from "express";
import { ActivityLog, Contact, User } from "../db.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/activities - list recent activity logs & audit stream
router.get("/", async (req, res) => {
  try {
    const { contactId, action, targetType } = req.query;
    const where = {};
    if (contactId) where.target_id = contactId;
    if (action) where.action = action;
    if (targetType) where.target_type = targetType;

    const activities = await ActivityLog.findAll({
      where,
      order: [["id", "DESC"]],
      limit: 100
    });

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities", details: err.message });
  }
});

// POST /api/activities - log a call, meeting, note or event manually
router.post("/", async (req, res) => {
  try {
    let { contactId, type, title, description, outcome } = req.body;
    title = sanitizeString(title);
    description = sanitizeString(description);
    outcome = sanitizeString(outcome);

    if (!type || !title) {
      return res.status(400).json({ error: "Type and Title are required." });
    }

    const activity = await ActivityLog.create({
      user_id: req.user.id,
      action: type || "Note",
      target_type: "Contact",
      target_id: contactId ? parseInt(contactId, 10) : null,
      timestamp: new Date(),
      details_json: JSON.stringify({
        title,
        description,
        outcome,
        contactId
      })
    });

    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to log activity", details: err.message });
  }
});

export default router;
