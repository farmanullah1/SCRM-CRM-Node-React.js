import express from "express";
import { Op } from "sequelize";
import { Contact, Activity, Task } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/contacts - list contacts
router.get("/", async (req, res) => {
  try {
    const { search, status, leadSource } = req.query;
    const whereClause = {
      [Op.or]: [{ userId: req.user.id }, { userId: null }]
    };

    const conditions = [];

    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { company: { [Op.like]: `%${search}%` } },
          { tags: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (status && status !== "All") {
      conditions.push({ status });
    }

    if (leadSource && leadSource !== "All") {
      conditions.push({ leadSource });
    }

    if (conditions.length > 0) {
      whereClause[Op.and] = conditions;
    }

    const contacts = await Contact.findAll({
      where: whereClause,
      order: [["id", "DESC"]]
    });

    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts", details: err.message });
  }
});

// GET /api/contacts/:id - fetch single contact with activities and tasks
router.get("/:id", async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ userId: req.user.id }, { userId: null }]
      },
      include: [
        { model: Activity, limit: 20, order: [["id", "DESC"]] },
        { model: Task, limit: 10, order: [["id", "DESC"]] }
      ]
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve contact", details: err.message });
  }
});

// POST /api/contacts - create new contact / deal
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, company, status, value, leadSource, tags, notes, expectedCloseDate, customFields } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required fields." });
    }

    // Check duplicate email
    const existing = await Contact.findOne({ where: { email: email.trim() } });
    if (existing) {
      return res.status(409).json({ error: `A contact with email '${email.trim()}' already exists.` });
    }

    const created = await Contact.create({
      userId: req.user.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      company: company ? company.trim() : null,
      status: status || "New",
      value: value ? Number(value) : 0,
      leadSource: leadSource || "Website",
      tags: tags || "",
      notes: notes || null,
      expectedCloseDate: expectedCloseDate || null,
      customFields: customFields ? (typeof customFields === "string" ? customFields : JSON.stringify(customFields)) : null
    });

    // Auto-log creation activity
    await Activity.create({
      userId: req.user.id,
      contactId: created.id,
      type: "Note",
      title: "Contact Created",
      description: `New contact created under stage '${created.status}' with deal value $${created.value}.`
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create contact", details: err.message });
  }
});

// POST /api/contacts/bulk - CSV import
router.post("/bulk", async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: "Array of contacts required." });
    }

    const results = { imported: 0, skipped: 0 };
    for (const item of contacts) {
      if (!item.name || !item.email) {
        results.skipped++;
        continue;
      }
      const exists = await Contact.findOne({ where: { email: item.email.trim() } });
      if (exists) {
        results.skipped++;
        continue;
      }

      await Contact.create({
        userId: req.user.id,
        name: item.name.trim(),
        email: item.email.trim(),
        phone: item.phone ? item.phone.trim() : null,
        company: item.company ? item.company.trim() : null,
        status: item.status || "New",
        value: Number(item.value) || 0,
        leadSource: item.leadSource || "Import",
        tags: item.tags || "Imported"
      });
      results.imported++;
    }

    res.json({ message: `Successfully imported ${results.imported} contacts. (${results.skipped} skipped)`, results });
  } catch (err) {
    res.status(500).json({ error: "Failed bulk import", details: err.message });
  }
});

// PUT /api/contacts/:id - update contact / deal
router.put("/:id", async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ userId: req.user.id }, { userId: null }]
      }
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const { name, email, phone, company, status, value, leadSource, tags, notes, expectedCloseDate, customFields } = req.body;

    const oldStatus = contact.status;

    await contact.update({
      name: name !== undefined ? name.trim() : contact.name,
      email: email !== undefined ? email.trim() : contact.email,
      phone: phone !== undefined ? phone.trim() : contact.phone,
      company: company !== undefined ? company.trim() : contact.company,
      status: status !== undefined ? status : contact.status,
      value: value !== undefined ? Number(value) : contact.value,
      leadSource: leadSource !== undefined ? leadSource : contact.leadSource,
      tags: tags !== undefined ? tags : contact.tags,
      notes: notes !== undefined ? notes : contact.notes,
      expectedCloseDate: expectedCloseDate !== undefined ? expectedCloseDate : contact.expectedCloseDate,
      customFields: customFields !== undefined ? (typeof customFields === "string" ? customFields : JSON.stringify(customFields)) : contact.customFields
    });

    // Auto-log stage changes
    if (status && status !== oldStatus) {
      await Activity.create({
        userId: req.user.id,
        contactId: contact.id,
        type: "StageChange",
        title: `Pipeline Stage Changed to ${status}`,
        description: `Deal stage shifted from '${oldStatus}' to '${status}'.`
      });
    }

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to update contact", details: err.message });
  }
});

// DELETE /api/contacts/:id - delete contact
router.delete("/:id", async (req, res) => {
  try {
    const contact = await Contact.findOne({
      where: {
        id: req.params.id,
        [Op.or]: [{ userId: req.user.id }, { userId: null }]
      }
    });

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    await contact.destroy();
    res.json({ message: "Contact deleted successfully", id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete contact", details: err.message });
  }
});

// POST /api/contacts/merge - Duplicate Merging
router.post("/merge", async (req, res) => {
  try {
    const { primaryId, duplicateId } = req.body;
    if (!primaryId || !duplicateId) {
      return res.status(400).json({ error: "primaryId and duplicateId are required." });
    }

    const primary = await Contact.findByPk(primaryId);
    const duplicate = await Contact.findByPk(duplicateId);

    if (!primary || !duplicate) {
      return res.status(404).json({ error: "One or both contacts not found." });
    }

    // Merge notes & tags
    const mergedNotes = [primary.notes, duplicate.notes].filter(Boolean).join("\n---\n");
    const mergedTags = Array.from(new Set([...(primary.tags || "").split(","), ...(duplicate.tags || "").split(",")])).filter(Boolean).join(",");

    await primary.update({
      notes: mergedNotes,
      tags: mergedTags,
      phone: primary.phone || duplicate.phone,
      company: primary.company || duplicate.company,
      value: Math.max(Number(primary.value) || 0, Number(duplicate.value) || 0)
    });

    // Move associated activities & tasks
    await Activity.update({ contactId: primary.id }, { where: { contactId: duplicate.id } });
    await Task.update({ contactId: primary.id }, { where: { contactId: duplicate.id } });

    await duplicate.destroy();

    res.json({ message: "Contacts merged successfully", primary });
  } catch (err) {
    res.status(500).json({ error: "Failed to merge contacts", details: err.message });
  }
});

export default router;
