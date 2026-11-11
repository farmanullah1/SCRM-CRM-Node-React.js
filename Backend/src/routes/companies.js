import express from "express";
import { Company, Contact, Deal } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/companies - List all companies with associated contact count and total deal value
router.get("/", async (req, res) => {
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

// GET /api/companies/:id - Get single company with contacts
router.get("/:id", async (req, res) => {
  try {
    const company = await Company.findByPk(req.params.id, {
      include: [{ model: Contact }]
    });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json({ company });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch company details" });
  }
});

// POST /api/companies - Create new company
router.post("/", async (req, res) => {
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
router.put("/:id", async (req, res) => {
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
router.delete("/:id", requirePermission("delete_all"), async (req, res) => {
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

