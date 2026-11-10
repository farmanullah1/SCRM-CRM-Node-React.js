import express from "express";
import { Activity, Contact } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/activities - list recent activities
router.get("/", async (req, res) => {
  try {
    const { contactId, type } = req.query;
    const where = { userId: req.user.id };
    if (contactId) where.contactId = contactId;
    if (type) where.type = type;

    const activities = await Activity.findAll({
      where,
      include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }],
      order: [["id", "DESC"]],
      limit: 50
    });

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch activities", details: err.message });
  }
});

// POST /api/activities - log a call, meeting, note or event
router.post("/", async (req, res) => {
  try {
    const { contactId, type, title, description, outcome } = req.body;
    if (!type || !title) {
      return res.status(400).json({ error: "Type and Title are required." });
    }

    const activity = await Activity.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      type: type || "Note",
      title: title.trim(),
      description: description ? description.trim() : null,
      outcome: outcome ? outcome.trim() : null
    });

    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: "Failed to log activity", details: err.message });
  }
});

export default router;
