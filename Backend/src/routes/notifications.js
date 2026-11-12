import express from "express";
import { Notification } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

export async function createNotification({ userId, type = "system", title, body = null, link = null }) {
  if (!userId) return null;
  try {
    return await Notification.create({ userId, type, title, body, link });
  } catch (error) {
    console.error("[Notification] Could not create:", error.message);
    return null;
  }
}

router.get("/", async (req, res) => {
  try {
    const rows = await Notification.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
      limit: 50
    });
    const unread = await Notification.count({ where: { userId: req.user.id, is_read: false } });
    res.set("Cache-Control", "private, no-store");
    res.json({ notifications: rows, unread });
  } catch (error) {
    res.status(500).json({ error: "Notifications could not be loaded." });
  }
});

router.post("/:id/read", async (req, res) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!notification) return res.status(404).json({ error: "Notification not found." });
    notification.is_read = true;
    await notification.save();
    res.json({ message: "Notification marked as read." });
  } catch {
    res.status(500).json({ error: "Notification could not be updated." });
  }
});

router.post("/read-all", async (req, res) => {
  try {
    await Notification.update({ is_read: true }, { where: { userId: req.user.id, is_read: false } });
    res.json({ message: "All notifications marked as read." });
  } catch {
    res.status(500).json({ error: "Notifications could not be updated." });
  }
});

export default router;
