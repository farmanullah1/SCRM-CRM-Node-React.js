import express from "express";
import { Deal, Contact, User, PipelineStage, ActivityLog } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/deals/stages - Get all pipeline stages in order
router.get("/stages", async (req, res) => {
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
router.get("/", async (req, res) => {
  try {
    const { stage, ownerId } = req.query;
    const where = {};
    if (stage) where.stage_name = stage;
    if (ownerId) where.owner_id = ownerId;

    // RBAC: Standard users can only view deals they own unless they have view_all
    if (req.user.role === "standard_user" && !req.user.permissions?.view_all) {
      where.owner_id = req.user.id;
    }

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
router.get("/metrics", async (req, res) => {
  try {
    const deals = await Deal.findAll();
    
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

// POST /api/deals - Create new deal
router.post("/", async (req, res) => {
  try {
    let { title, value, stage_id, stage_name, expected_close_date, contact_id, owner_id, notes } = req.body;
    title = sanitizeString(title);
    notes = sanitizeString(notes);

    if (!title) {
      return res.status(400).json({ error: "Deal title is required." });
    }

    const assignedOwner = owner_id || req.user.id;
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
router.put("/:id", async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) {
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
    if (owner_id !== undefined) deal.owner_id = owner_id;
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
router.delete("/:id", requirePermission("delete_all"), async (req, res) => {
  try {
    const deal = await Deal.findByPk(req.params.id);
    if (!deal) {
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

