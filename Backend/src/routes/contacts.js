import express from "express";
import { Op } from "sequelize";
import { Contact, ActivityLog, Task, Deal, Company, User } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString, isValidEmail } from "../middleware/security.js";
import { canViewAll, canViewRecord, canEditRecord, canDeleteAll } from "../services/accessScope.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/contacts - list contacts with search, filtering and opt-in pagination
router.get("/", requirePermission("contacts.view"), async (req, res) => {
  try {
    const { search, status, leadSource, tag, companyId } = req.query;
    const wantsPagination = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const whereClause = {};

    if (!canViewAll(req.user)) {
      whereClause[Op.or] = [{ userId: req.user.id }, { owner_id: req.user.id }];
    }

    const conditions = [];

    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { first_name: { [Op.like]: `%${search}%` } },
          { last_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
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

    if (tag && tag !== "All") {
      conditions.push({ tags: { [Op.like]: `%${tag}%` } });
    }

    if (companyId) {
      conditions.push({ company_id: companyId });
    }

    if (conditions.length > 0) {
      whereClause[Op.and] = conditions;
    }

    const query = {
      where: whereClause,
      include: [
        { model: Company, attributes: ["id", "name", "domain"] },
        { model: User, attributes: ["id", "name", "email"] }
      ],
      order: [["id", "DESC"]]
    };

    if (!wantsPagination) {
      return res.json(await Contact.findAll(query));
    }

    const { count, rows } = await Contact.findAndCountAll({
      ...query,
      distinct: true,
      limit,
      offset: (page - 1) * limit
    });

    res.json({
      contacts: rows,
      totalCount: count,
      page,
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit))
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contacts", details: err.message });
  }
});

// GET /api/contacts/duplicates - Automated duplicate detection (email / phone match)
router.get("/duplicates", requirePermission("contacts.view"), async (req, res) => {
  try {
    const contacts = await Contact.findAll({
      where: canViewAll(req.user) ? {} : { [Op.or]: [{ userId: req.user.id }, { owner_id: req.user.id }] },
      attributes: ["id", "name", "email", "phone", "company", "status", "createdAt"]
    });

    const emailMap = new Map();
    const phoneMap = new Map();
    const duplicates = [];

    contacts.forEach((c) => {
      const email = c.email?.trim().toLowerCase();
      const phone = c.phone?.trim();

      let isDuplicate = false;
      let matchedReason = "";
      let matchedWith = null;

      if (email && emailMap.has(email)) {
        isDuplicate = true;
        matchedReason = `Duplicate Email: ${email}`;
        matchedWith = emailMap.get(email);
      } else if (email) {
        emailMap.set(email, c);
      }

      if (!isDuplicate && phone && phone.length >= 7 && phoneMap.has(phone)) {
        isDuplicate = true;
        matchedReason = `Duplicate Phone: ${phone}`;
        matchedWith = phoneMap.get(phone);
      } else if (phone && phone.length >= 7) {
        phoneMap.set(phone, c);
      }

      if (isDuplicate) {
        duplicates.push({
          duplicateRecord: c,
          existingRecord: matchedWith,
          reason: matchedReason
        });
      }
    });

    res.json({ count: duplicates.length, duplicates });
  } catch (err) {
    res.status(500).json({ error: "Failed to detect duplicates", details: err.message });
  }
});

// GET /api/contacts/export - Export contacts data in JSON or CSV
router.get("/export", requirePermission("contacts.export"), async (req, res) => {
  try {
    const format = req.query.format || "csv";
    const contacts = await Contact.findAll({
      where: canViewAll(req.user) ? {} : { [Op.or]: [{ userId: req.user.id }, { owner_id: req.user.id }] },
      order: [["id", "ASC"]]
    });

    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="scrm_contacts_export.json"');
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(contacts, null, 2));
    }

    // CSV format
    const headers = ["ID", "Name", "Email", "Phone", "Company", "Status", "Value", "LeadSource", "Tags", "CreatedAt"];
    const rows = contacts.map((c) => [
      c.id,
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${c.status || "New"}"`,
      c.value || 0,
      `"${c.leadSource || "Website"}"`,
      `"${(c.tags || "").replace(/"/g, '""')}"`,
      `"${c.createdAt || ""}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    res.setHeader("Content-Disposition", 'attachment; filename="scrm_contacts_export.csv"');
    res.setHeader("Content-Type", "text/csv");
    res.send(csvContent);
  } catch (err) {
    res.status(500).json({ error: "Failed to export contacts", details: err.message });
  }
});

// GET /api/contacts/:id - fetch single contact with full details
router.get("/:id", requirePermission("contacts.view"), async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id, {
      include: [
        { model: Company },
        { model: User, attributes: ["id", "name", "email"] },
        { model: Deal, limit: 10 },
        { model: Task, limit: 10 }
      ]
    });

    if (!contact || !canViewRecord(req.user, contact)) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve contact", details: err.message });
  }
});

// GET /api/contacts/:id/activities - Chronological activity history per contact
router.get("/:id/activities", async (req, res) => {
  try {
    const contactId = req.params.id;
    const activities = await ActivityLog.findAll({
      where: {
        [Op.or]: [
          { target_id: contactId, target_type: "Contact" },
          { details_json: { [Op.like]: `%"contactId":${contactId}%` } }
        ]
      },
      order: [["timestamp", "DESC"]],
      limit: 50
    });

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch contact activities" });
  }
});

// POST /api/contacts - create new contact
router.post("/", requirePermission("contacts.create"), async (req, res) => {
  try {
    let { name, first_name, last_name, email, phone, company, company_id, status, value, leadSource, tags, notes, expectedCloseDate, customFields } = req.body;

    name = sanitizeString(name);
    first_name = sanitizeString(first_name);
    last_name = sanitizeString(last_name);
    email = sanitizeString(email)?.toLowerCase();
    phone = sanitizeString(phone);
    company = sanitizeString(company);
    notes = sanitizeString(notes);
    tags = sanitizeString(tags);

    const fullName = name || [first_name, last_name].filter(Boolean).join(" ");
    if (!fullName || !email) {
      return res.status(400).json({ error: "Name and email are required fields." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Check duplicate email
    const existing = await Contact.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: `A contact with email '${email}' already exists.` });
    }

    // If company_id is provided or company name matches
    if (!company_id && company) {
      const comp = await Company.findOne({ where: { name: company } });
      if (comp) company_id = comp.id;
    }

    const created = await Contact.create({
      userId: req.user.id,
      owner_id: req.user.id,
      name: fullName,
      first_name: first_name || fullName.split(" ")[0] || "",
      last_name: last_name || fullName.split(" ").slice(1).join(" ") || "",
      email,
      phone: phone || null,
      company: company || null,
      company_id: company_id || null,
      status: status || "New",
      value: value ? Number(value) : 0,
      leadSource: leadSource || "Website",
      tags: tags || "",
      notes: notes || null,
      expectedCloseDate: expectedCloseDate || null,
      customFields: customFields ? (typeof customFields === "string" ? customFields : JSON.stringify(customFields)) : null
    });

    // Auto-log creation activity
    await logAudit(req.user.id, "CREATE_CONTACT", "Contact", created.id, {
      name: created.name,
      email: created.email,
      status: created.status
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create contact", details: err.message });
  }
});

// POST /api/contacts/:id/convert - 1-Click convert Lead into Contact + Deal
router.post("/:id/convert", requirePermission("contacts.edit"), async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact || !canEditRecord(req.user, contact)) {
      return res.status(404).json({ error: "Lead/Contact not found" });
    }

    let { dealTitle, dealValue, expectedCloseDate, stageName } = req.body;
    dealTitle = sanitizeString(dealTitle) || `${contact.name} - Enterprise Deal`;
    const finalValue = dealValue !== undefined ? parseFloat(dealValue) : (parseFloat(contact.value) || 5000.0);
    const finalStage = stageName || "Qualified";

    // 1. Update contact status to Qualified/Customer
    contact.status = "Qualified";
    await contact.save();

    // 2. Create corresponding Deal in pipeline
    const deal = await Deal.create({
      title: dealTitle,
      value: finalValue,
      stage_name: finalStage,
      stage_id: 3, // Qualified
      contact_id: contact.id,
      owner_id: req.user.id,
      expected_close_date: expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: `Converted from lead '${contact.name}' on ${new Date().toLocaleDateString()}`
    });

    // 3. Create initial follow-up task
    await Task.create({
      userId: req.user.id,
      assigned_to_user_id: req.user.id,
      contactId: contact.id,
      related_contact_id: contact.id,
      related_deal_id: deal.id,
      title: `Send discovery proposal to ${contact.name}`,
      description: `Follow up on qualified deal '${deal.title}'`,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      priority: "High",
      status: "Pending"
    });

    // 4. Log audit & activity
    await logAudit(req.user.id, "CONVERT_LEAD", "Contact", contact.id, {
      dealId: deal.id,
      dealTitle: deal.title,
      dealValue: deal.value
    });

    res.json({
      message: `Lead '${contact.name}' converted successfully into Contact and Pipeline Deal!`,
      contact,
      deal
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to convert lead", details: err.message });
  }
});

// POST /api/contacts/bulk - CSV bulk import with column mapping
router.post("/bulk", requirePermission("contacts.create"), async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: "Array of contacts required." });
    }

    const results = { imported: 0, skipped: 0, errors: [] };
    for (const item of contacts) {
      const email = sanitizeString(item.email)?.toLowerCase();
      const name = sanitizeString(item.name || [item.first_name, item.last_name].filter(Boolean).join(" "));

      if (!name || !email || !isValidEmail(email)) {
        results.skipped++;
        continue;
      }

      const exists = await Contact.findOne({ where: { email } });
      if (exists) {
        results.skipped++;
        continue;
      }

      await Contact.create({
        userId: req.user.id,
        owner_id: req.user.id,
        name,
        first_name: sanitizeString(item.first_name) || name.split(" ")[0],
        last_name: sanitizeString(item.last_name) || name.split(" ").slice(1).join(" "),
        email,
        phone: item.phone ? sanitizeString(item.phone) : null,
        company: item.company ? sanitizeString(item.company) : null,
        status: item.status || "New",
        value: Number(item.value) || 0,
        leadSource: item.leadSource || "CSV Import",
        tags: item.tags || "Imported"
      });
      results.imported++;
    }

    await logAudit(req.user.id, "BULK_IMPORT_CONTACTS", "Contact", null, {
      count: results.imported
    });

    res.json({
      message: `Successfully imported ${results.imported} contacts. (${results.skipped} skipped)`,
      results
    });
  } catch (err) {
    res.status(500).json({ error: "Failed bulk import", details: err.message });
  }
});

// PUT /api/contacts/:id - update contact
router.put("/:id", requirePermission("contacts.edit"), async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact || !canEditRecord(req.user, contact)) {
      return res.status(404).json({ error: "Contact not found" });
    }

    const { name, first_name, last_name, email, phone, company, company_id, status, value, leadSource, tags, notes, expectedCloseDate, customFields } = req.body;
    const oldStatus = contact.status;

    if (name) contact.name = sanitizeString(name);
    if (first_name) contact.first_name = sanitizeString(first_name);
    if (last_name) contact.last_name = sanitizeString(last_name);
    if (email) contact.email = sanitizeString(email).toLowerCase();
    if (phone !== undefined) contact.phone = sanitizeString(phone);
    if (company !== undefined) contact.company = sanitizeString(company);
    if (company_id !== undefined) contact.company_id = company_id;
    if (status !== undefined) contact.status = status;
    if (value !== undefined) contact.value = Number(value);
    if (leadSource !== undefined) contact.leadSource = sanitizeString(leadSource);
    if (tags !== undefined) contact.tags = sanitizeString(tags);
    if (notes !== undefined) contact.notes = sanitizeString(notes);
    if (expectedCloseDate !== undefined) contact.expectedCloseDate = expectedCloseDate;
    if (customFields !== undefined) {
      contact.customFields = typeof customFields === "string" ? customFields : JSON.stringify(customFields);
    }

    await contact.save();

    if (status && status !== oldStatus) {
      await logAudit(req.user.id, "STAGE_CHANGE", "Contact", contact.id, {
        from: oldStatus,
        to: status
      });
    } else {
      await logAudit(req.user.id, "UPDATE_CONTACT", "Contact", contact.id, { name: contact.name });
    }

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to update contact", details: err.message });
  }
});

// DELETE /api/contacts/:id - delete contact
router.delete("/:id", requirePermission("contacts.delete"), async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact || (!canDeleteAll(req.user) && !canEditRecord(req.user, contact))) {
      return res.status(404).json({ error: "Contact not found" });
    }

    await contact.destroy();
    await logAudit(req.user.id, "DELETE_CONTACT", "Contact", req.params.id, { name: contact.name });

    res.json({ message: "Contact deleted successfully", id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete contact", details: err.message });
  }
});

// POST /api/contacts/merge - Duplicate Merging
router.post("/merge", requirePermission("contacts.edit"), async (req, res) => {
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

    // Reassign associated deals and tasks
    await Deal.update({ contact_id: primary.id }, { where: { contact_id: duplicate.id } });
    await Task.update({ contactId: primary.id, related_contact_id: primary.id }, { where: { contactId: duplicate.id } });

    await duplicate.destroy();

    await logAudit(req.user.id, "MERGE_CONTACTS", "Contact", primary.id, {
      mergedWith: duplicateId
    });

    res.json({ message: "Contacts merged successfully", primary });
  } catch (err) {
    res.status(500).json({ error: "Failed to merge contacts", details: err.message });
  }
});

export default router;
