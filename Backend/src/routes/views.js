import express from "express";
import { SavedView, Op } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

const ENTITIES = new Set(["leads", "contacts", "companies", "deals", "tasks", "tickets", "invoices", "activities"]);

function normalizeQuery(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const clean = {};
  for (const [key, entry] of Object.entries(value).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue;
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      clean[key] = String(entry).slice(0, 200);
    }
  }
  return clean;
}

router.get("/", async (req, res) => {
  const entity = req.query.entity ? String(req.query.entity) : null;
  if (entity && !ENTITIES.has(entity)) return res.status(400).json({ error: "Unknown saved-view entity." });
  try {
    const rows = await SavedView.findAll({
      where: {
        ...(entity ? { entity } : {}),
        [Op.or]: [{ userId: req.user.id }, { is_shared: true }]
      },
      order: [["createdAt", "DESC"]],
      limit: 100
    });
    res.json({ views: rows.map((row) => ({ ...row.toJSON(), owned: Number(row.userId) === Number(req.user.id) })) });
  } catch {
    res.status(500).json({ error: "Saved views could not be loaded." });
  }
});

router.post("/", async (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 120);
  const entity = String(req.body?.entity || "");
  if (!name || !ENTITIES.has(entity)) return res.status(400).json({ error: "Provide a view name and a valid entity." });
  try {
    const view = await SavedView.create({
      userId: req.user.id,
      name,
      entity,
      query_json: JSON.stringify(normalizeQuery(req.body?.query)),
      is_shared: Boolean(req.body?.is_shared)
    });
    res.status(201).json({ message: "View saved.", view: { ...view.toJSON(), owned: true } });
  } catch {
    res.status(500).json({ error: "The view could not be saved." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const view = await SavedView.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!view) return res.status(404).json({ error: "Saved view not found." });
    await view.destroy();
    res.json({ message: "Saved view removed." });
  } catch {
    res.status(500).json({ error: "The view could not be removed." });
  }
});

export default router;
