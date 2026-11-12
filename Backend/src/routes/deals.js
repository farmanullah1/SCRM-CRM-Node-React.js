import express from "express";
import { Deal, Contact, User, PipelineStage, ActivityLog } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { canViewAll, canEditRecord, canDeleteAll } from "../services/accessScope.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/deals/stages - Get all pipeline stages in order
router.get("/stages", requirePermission("deals.view"), async (req, res) => {
  try {
    const stages = await PipelineStage.findAll({
      order: [["order_index", "ASC"]]
    });
    res.json({ stages });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stages", details: err.message });
  }
});

// GET /api/deals - List deals with owner & contact details
router.get("/", requirePermission("deals.view"), async (req, res) => {
  try {
    const { stage, ownerId } = req.query;
    const where = {};
    if (stage) where.stage_name = stage;
    if (ownerId) where.owner_id = ownerId;

    if (!canViewAll(req.user)) where.owner_id = req.user.id;

    const deals = await Deal.findAll({
      where,
      include: [
        { model: Contact, attributes: ["id", "name", "email", "company", "phone"] },
        { model: User, attributes: ["id", "name", "email"] }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Calculate stage sums
    const totalsByStage = {};
    let totalPipelineValue = 0;
    deals.forEach((d) => {
      const stageName = d.stage_name || "New";
      const val = parseFloat(d.value) || 0;
      totalsByStage[stageName] = (totalsByStage[stageName] || 0) + val;
      if (stageName !== "Lost") {
        totalPipelineValue += val;
      }
    });

    res.json({ deals, totalsByStage, totalPipelineValue });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch deals", details: err.message });
  }
});

// GET /api/deals/metrics - Sales performance & pipeline metrics
router.get("/metrics", requirePermission(["deals.view", "reports.view"]), async (req, res) => {
  try {
    // Metrics must honour the same ownership scope as the pipeline listing.
    const where = canViewAll(req.user) ? {} : { owner_id: req.user.id };

    const deals = await Deal.findAll({ where });
    
    let totalValue = 0;
    let wonCount = 0;
    let wonValue = 0;
    let lostCount = 0;
    let lostValue = 0;
    const stageCounts = {};

    deals.forEach((d) => {
      const val = parseFloat(d.value) || 0;
      const stage = d.stage_name || "New";
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      
      if (stage === "Won") {
        wonCount++;
        wonValue += val;
      } else if (stage === "Lost") {
        lostCount++;
        lostValue += val;
      } else {
        totalValue += val;
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? ((wonCount / totalClosed) * 100).toFixed(1) : "0.0";

    res.json({
      totalDeals: deals.length,
      totalActivePipelineValue: totalValue,
      wonCount,
      wonValue,
      lostCount,
      lostValue,
      winRate: `${winRate}%`,
      stageCounts
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute deal metrics" });
  }
});

// GET /api/deals/forecast - Weighted pipeline forecast and date-windowed won revenue
router.get("/forecast", requirePermission("deals.view"), async (req, res) => {
  try {
    const where = canViewAll(req.user) ? {} : { owner_id: req.user.id };
    const deals = await Deal.findAll({ where });
    const probabilities = { New: 0.1, Contacted: 0.2, Qualified: 0.4, Proposal: 0.6, Negotiation: 0.8, Won: 1, Lost: 0 };
    const months = Math.min(24, Math.max(1, Number(req.query.months) || 6));
    const now = new Date();
    const buckets = [];
    for (let index = 0; index < months; index += 1) {
      const date = new Date(now.getFullYear(), now.getMonth() + index, 1);
      buckets.push({ key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`, label: date.toLocaleDateString(undefined, { month: "short", year: "numeric" }), weighted: 0, gross: 0, won: 0, count: 0 });
    }

    let weightedPipeline = 0;
    let openPipeline = 0;
    let wonInWindow = 0;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    deals.forEach((deal) => {
      const value = Number(deal.value) || 0;
      const stage = deal.stage_name || "New";
      const probability = probabilities[stage] ?? 0.25;
      if (stage !== "Lost" && stage !== "Won") {
        openPipeline += value;
        weightedPipeline += value * probability;
      }
      if (stage === "Won") {
        const closed = new Date(deal.updatedAt || deal.createdAt);
        if ((!from || closed >= from) && (!to || closed <= to)) wonInWindow += value;
      }
      const closeDate = deal.expected_close_date ? new Date(deal.expected_close_date) : null;
      if (!closeDate) return;
      const key = `${closeDate.getFullYear()}-${String(closeDate.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.find((entry) => entry.key === key);
      if (!bucket) return;
      if (stage === "Won") bucket.won += value;
      else if (stage !== "Lost") {
        bucket.gross += value;
        bucket.weighted += value * probability;
        bucket.count += 1;
      }
    });

    res.json({
      months,
      probabilities,
      openPipeline: Number(openPipeline.toFixed(2)),
      weightedPipeline: Number(weightedPipeline.toFixed(2)),
      wonInWindow: Number(wonInWindow.toFixed(2)),
      buckets: buckets.map((bucket) => ({ ...bucket, weighted: Number(bucket.weighted.toFixed(2)), gross: Number(bucket.gross.toFixed(2)), won: Number(bucket.won.toFixed(2)) }))
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to compute forecast", details: err.message });
  }
});

// POST /api/deals - Create new deal
router.post("/", requirePermission("deals.create"), async (req, res) => {
  try {
    let { title, value, stage_id, stage_name, expected_close_date, contact_id, owner_id, notes } = req.body;
    title = sanitizeString(title);
    notes = sanitizeString(notes);

    if (!title) {
      return res.status(400).json({ error: "Deal title is required." });
    }

    const assignedOwner = (canViewAll(req.user) && owner_id) || req.user.id;
    const currentStage = stage_name || "New";

    const deal = await Deal.create({
      title,
      value: parseFloat(value) || 0.0,
      stage_id: stage_id || 1,
      stage_name: currentStage,
      expected_close_date: expected_close_date || null,
      contact_id: contact_id || null,
      owner_id: assignedOwner,
      notes
    });

    await logAudit(req.user.id, "CREATE_DEAL", "Deal", deal.id, { title, value: deal.value, stage: currentStage });

    res.status(201).json({ message: "Deal created successfully", deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to create deal", details: err.message });
  }
});

// PUT /api/deals/:id - Update deal or transition stage
router.put("/:id", requirePermission("deals.edit"), async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }
    if (!canEditRecord(req.user, deal)) {
      return res.status(404).json({ error: "Deal not found" });
    }

    let { title, value, stage_id, stage_name, expected_close_date, contact_id, owner_id, notes } = req.body;
    const oldStage = deal.stage_name;

    if (title) deal.title = sanitizeString(title);
    if (value !== undefined) deal.value = parseFloat(value) || 0.0;
    if (stage_id !== undefined) deal.stage_id = stage_id;
    if (stage_name !== undefined) deal.stage_name = stage_name;
    if (expected_close_date !== undefined) deal.expected_close_date = expected_close_date;
    if (contact_id !== undefined) deal.contact_id = contact_id;
    if (owner_id !== undefined) {
      if (!canViewAll(req.user) && Number(owner_id) !== Number(req.user.id)) {
        return res.status(403).json({ error: "You can only assign deals to yourself." });
      }
      deal.owner_id = owner_id;
    }
    if (notes !== undefined) deal.notes = sanitizeString(notes);

    await deal.save();

    // Trigger stage transition audit if stage changed
    if (stage_name && stage_name !== oldStage) {
      await logAudit(req.user.id, "STAGE_TRANSITION", "Deal", deal.id, {
        from: oldStage,
        to: stage_name,
        dealTitle: deal.title
      });
    } else {
      await logAudit(req.user.id, "UPDATE_DEAL", "Deal", deal.id, { title: deal.title });
    }

    res.json({ message: "Deal updated successfully", deal });
  } catch (err) {
    res.status(500).json({ error: "Failed to update deal" });
  }
});

// DELETE /api/deals/:id - Delete deal
router.delete("/:id", requirePermission("deals.delete"), async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) {
      return res.status(404).json({ error: "Deal not found" });
    }
    if (!canDeleteAll(req.user) && Number(deal.owner_id) !== Number(req.user.id)) {
      return res.status(404).json({ error: "Deal not found" });
    }

    await deal.destroy();
    await logAudit(req.user.id, "DELETE_DEAL", "Deal", req.params.id, { title: deal.title });

    res.json({ message: "Deal deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete deal" });
  }
});

export default router;

