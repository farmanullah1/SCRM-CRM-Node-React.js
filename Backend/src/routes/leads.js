import express from "express";
import { Lead, Contact, Company, Deal, ActivityLog, sequelize, Op } from "../db.js";
import { authenticateToken, logAudit } from "../middleware/auth.js";
import { sanitizeString, isValidEmail } from "../middleware/security.js";

const router = express.Router();

// GET /api/leads - List leads with search, status filtering, and sorting
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== "All") {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { name: { [Op.like]: q } },
        { email: { [Op.like]: q } },
        { company_name: { [Op.like]: q } },
        { phone: { [Op.like]: q } }
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { count, rows } = await Lead.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit, 10),
      offset
    });

    res.json({
      leads: rows,
      totalCount: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / parseInt(limit, 10))
    });
  } catch (err) {
    console.error("Fetch Leads Error:", err);
    res.status(500).json({ error: "Failed to fetch leads", details: err.message });
  }
});

// POST /api/leads - Ingest / Create a new lead
router.post("/", authenticateToken, async (req, res) => {
  try {
    let { name, email, phone, company_name, title, source, estimated_value, notes } = req.body;

    name = sanitizeString(name);
    email = sanitizeString(email)?.toLowerCase();
    company_name = sanitizeString(company_name);
    phone = sanitizeString(phone);
    title = sanitizeString(title);
    source = sanitizeString(source) || "Website";

    if (!name || !email) {
      return res.status(400).json({ error: "Lead name and email are required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }

    const lead = await Lead.create({
      name,
      first_name: name.split(" ")[0] || "",
      last_name: name.split(" ").slice(1).join(" ") || "",
      email,
      phone,
      company_name,
      title,
      source,
      status: "New",
      estimated_value: parseFloat(estimated_value) || 0.0,
      notes,
      owner_id: req.user.id
    });

    await logAudit(req.user.id, "LEAD_CREATED", "Lead", lead.id, {
      name: lead.name,
      company: lead.company_name,
      source: lead.source
    });

    res.status(201).json({
      message: "Lead created successfully",
      lead
    });
  } catch (err) {
    console.error("Create Lead Error:", err);
    res.status(500).json({ error: "Failed to create lead", details: err.message });
  }
});

// GET /api/leads/:id - Fetch single lead
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found." });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch lead", details: err.message });
  }
});

// PUT /api/leads/:id - Update lead details or status
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found." });

    const { name, email, phone, company_name, title, source, status, estimated_value, disqualification_reason, notes } = req.body;

    if (name) lead.name = sanitizeString(name);
    if (email) {
      if (!isValidEmail(email)) return res.status(400).json({ error: "Invalid email." });
      lead.email = sanitizeString(email).toLowerCase();
    }
    if (phone !== undefined) lead.phone = sanitizeString(phone);
    if (company_name !== undefined) lead.company_name = sanitizeString(company_name);
    if (title !== undefined) lead.title = sanitizeString(title);
    if (source !== undefined) lead.source = sanitizeString(source);
    if (status !== undefined) lead.status = sanitizeString(status);
    if (estimated_value !== undefined) lead.estimated_value = parseFloat(estimated_value) || 0;
    if (disqualification_reason !== undefined) lead.disqualification_reason = sanitizeString(disqualification_reason);
    if (notes !== undefined) lead.notes = notes;

    await lead.save();

    await logAudit(req.user.id, "LEAD_UPDATED", "Lead", lead.id, {
      status: lead.status,
      name: lead.name
    });

    res.json({ message: "Lead updated successfully", lead });
  } catch (err) {
    res.status(500).json({ error: "Failed to update lead", details: err.message });
  }
});

// DELETE /api/leads/:id - Remove lead
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: "Lead not found." });

    const leadInfo = { id: lead.id, name: lead.name, email: lead.email };
    await lead.destroy();

    await logAudit(req.user.id, "LEAD_DELETED", "Lead", leadInfo.id, leadInfo);

    res.json({ message: "Lead removed successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete lead", details: err.message });
  }
});

// POST /api/leads/:id/convert - Safe, transactional 1-click lead qualification into Contact + Company + Deal
router.post("/:id/convert", authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const lead = await Lead.findByPk(req.params.id, { transaction });
    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({ error: "Lead not found." });
    }

    if (lead.status === "Converted") {
      await transaction.rollback();
      return res.status(400).json({ error: "This lead has already been converted." });
    }

    const { dealTitle, dealValue, pipelineStage = "Qualified" } = req.body;

    // 1. Resolve or Create Company
    let companyId = null;
    let companyRecord = null;
    if (lead.company_name && lead.company_name.trim()) {
      companyRecord = await Company.findOne({
        where: { name: lead.company_name.trim() },
        transaction
      });

      if (!companyRecord) {
        companyRecord = await Company.create({
          name: lead.company_name.trim(),
          domain: lead.email.split("@")[1] || null,
          phone: lead.phone || null
        }, { transaction });
      }
      companyId = companyRecord.id;
    }

    // 2. Create Qualified Contact
    const contact = await Contact.create({
      userId: req.user.id,
      owner_id: req.user.id,
      first_name: lead.first_name || lead.name.split(" ")[0] || "",
      last_name: lead.last_name || lead.name.split(" ").slice(1).join(" ") || "",
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      company: lead.company_name || null,
      company_id: companyId,
      status: "Qualified",
      value: parseFloat(dealValue) || lead.estimated_value || 0.0,
      leadSource: lead.source || "Website",
      tags: "Converted Lead",
      notes: lead.notes || `Converted from Lead #${lead.id} on ${new Date().toISOString()}`
    }, { transaction });

    // 3. Create Associated Deal in Pipeline
    const deal = await Deal.create({
      title: dealTitle || `${lead.company_name || lead.name} - Solution Engagement`,
      value: parseFloat(dealValue) || lead.estimated_value || 10000.0,
      stage_name: pipelineStage,
      stage_id: 3, // Qualified
      owner_id: req.user.id,
      contact_id: contact.id,
      notes: `Generated via 1-click lead qualification for ${lead.name}.`
    }, { transaction });

    // 4. Update Lead to Converted
    lead.status = "Converted";
    lead.converted_contact_id = contact.id;
    lead.converted_deal_id = deal.id;
    lead.converted_at = new Date();
    await lead.save({ transaction });

    // 5. Commit Transaction
    await transaction.commit();

    await logAudit(req.user.id, "LEAD_CONVERTED_TRANSACTIONAL", "Lead", lead.id, {
      lead_id: lead.id,
      contact_id: contact.id,
      deal_id: deal.id,
      company_id: companyId
    });

    res.json({
      message: "Lead converted into Contact, Company, and Deal successfully!",
      contact,
      deal,
      company: companyRecord
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Lead Conversion Error:", err);
    res.status(500).json({ error: "Transactional lead conversion failed", details: err.message });
  }
});

export default router;

