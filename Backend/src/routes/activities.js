import express from "express";
import { ActivityLog, Contact, User } from "../db.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/activities - chronological activity stream with opt-in pagination
router.get("/", requirePermission(["activities.view", "audit.view"]), async (req, res) => {
  try {
    const { contactId, action, targetType } = req.query;
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 100));
    const where = {};
    if (contactId) where.target_id = contactId;
    if (action) where.action = action;
    if (targetType) where.target_type = targetType;

    const query = { where, order: [["id", "DESC"]] };
    if (!wantsPagination) {
      return res.json(await ActivityLog.findAll({ ...query, limit }));
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      ...query,
      limit,
      offset: (page - 1) * limit
    });

    res.json({
      activities: rows,
      totalCount: count,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit))
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities", details: err.message });
  }
});

// POST /api/activities - log a call, meeting, note or event manually
router.post("/", requirePermission("activities.create"), async (req, res) => {
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
