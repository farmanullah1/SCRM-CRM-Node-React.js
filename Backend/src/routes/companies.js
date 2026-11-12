import express from "express";
import { Op } from "sequelize";
import { Company, Contact, Deal, Invoice, Ticket, FileAttachment } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";
import { hasPermission } from "../permissions.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/companies - List all companies with associated contact count and total deal value
router.get("/", requirePermission("companies.view"), async (req, res) => {
  try {
    const companies = await Company.findAll({
      include: [
        {
          model: Contact,
          attributes: ["id", "value"]
        }
      ],
      order: [["name", "ASC"]]
    });

    const enriched = companies.map(c => {
      const plain = c.toJSON();
      const contactList = plain.Contacts || [];
      const contactCount = contactList.length;
      const totalDealValue = contactList.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
      return {
        ...plain,
        contactCount,
        totalDealValue
      };
    });

    res.json({ companies: enriched });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies", details: err.message });
  }
});

// GET /api/companies/:id - Company record with linked contacts, deals and totals
router.get("/:id", requirePermission("companies.view"), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    // Contacts may be linked by company_id or by the legacy company name field.
    const contacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { company_id: company.id },
          { company: company.name }
        ]
      },
      order: [["name", "ASC"]]
    });

    const contactIds = contacts.map((contact) => contact.id);
    const deals = contactIds.length
      ? await Deal.findAll({
          where: { contact_id: { [Op.in]: contactIds } },
          include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }],
          order: [["createdAt", "DESC"]]
        })
      : [];

    const totals = {
      contactCount: contacts.length,
      dealCount: deals.length,
      openPipelineValue: deals
        .filter((deal) => !["Won", "Lost"].includes(deal.stage_name || "New"))
        .reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
      wonRevenue: deals
        .filter((deal) => deal.stage_name === "Won")
        .reduce((sum, deal) => sum + (Number(deal.value) || 0), 0)
    };

    const effective = req.user.effectivePermissions || req.user.permissions;
    const relatedWhere = {
      [Op.or]: [
        { companyId: company.id },
        ...(contactIds.length ? [{ contactId: { [Op.in]: contactIds } }] : [])
      ]
    };
    const invoices = hasPermission(effective, "invoices.view")
      ? await Invoice.findAll({ where: relatedWhere, order: [["createdAt", "DESC"]], limit: 100 })
      : [];
    const tickets = hasPermission(effective, "tickets.view")
      ? await Ticket.findAll({ where: relatedWhere, order: [["createdAt", "DESC"]], limit: 100 })
      : [];
    const attachments = hasPermission(effective, "attachments.view")
      ? await FileAttachment.findAll({ where: { entity_type: "Company", entity_id: company.id }, order: [["id", "DESC"]] })
      : [];

    res.json({ company, contacts, deals, invoices, tickets, attachments, totals });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company details", details: err.message });
  }
});

// POST /api/companies - Create new company
router.post("/", requirePermission("companies.create"), async (req, res) => {
  try {
    let { name, domain, phone, address } = req.body;
    name = sanitizeString(name);
    domain = sanitizeString(domain);
    phone = sanitizeString(phone);
    address = sanitizeString(address);

    if (!name) {
      return res.status(400).json({ error: "Company name is required." });
    }

    const company = await Company.create({ name, domain, phone, address });
    await logAudit(req.user.id, "CREATE_COMPANY", "Company", company.id, { name });

    res.status(201).json({ message: "Company created successfully", company });
  } catch (err) {
    res.status(500).json({ error: "Failed to create company", details: err.message });
  }
});

// PUT /api/companies/:id - Update company
router.put("/:id", requirePermission("companies.edit"), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    let { name, domain, phone, address } = req.body;
    if (name) company.name = sanitizeString(name);
    if (domain !== undefined) company.domain = sanitizeString(domain);
    if (phone !== undefined) company.phone = sanitizeString(phone);
    if (address !== undefined) company.address = sanitizeString(address);

    await company.save();
    await logAudit(req.user.id, "UPDATE_COMPANY", "Company", company.id, { name: company.name });

    res.json({ message: "Company updated successfully", company });
  } catch (err) {
    res.status(500).json({ error: "Failed to update company" });
  }
});

// DELETE /api/companies/:id - Delete company
router.delete("/:id", requirePermission("companies.delete"), async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id);
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    await company.destroy();
    await logAudit(req.user.id, "DELETE_COMPANY", "Company", req.params.id);

    res.json({ message: "Company deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete company" });
  }
});

export default router;

