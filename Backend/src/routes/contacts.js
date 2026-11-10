import express from "express";
import { Op } from "sequelize";
import { Contact } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply JWT authentication to all contact endpoints
router.use(authenticateToken);

// GET /api/contacts - list contacts for logged-in user
router.get("/", async (req, res) => {
  try {
    const { search, status } = req.query;
    const whereClause = {
      // Optional isolation per user or shared
      [Op.or]: [
        { userId: req.user.id },
        { userId: null }
      ]
    };

    const conditions = [];

    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { company: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (status && status !== "All") {
      conditions.push({ status });
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

// GET /api/contacts/:id - fetch single contact
router.get("/:id", async (req, res) => {
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

    res.json(contact);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve contact", details: err.message });
  }
});

// POST /api/contacts - create new contact tied to user
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, company, status, value } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required fields." });
    }

    const created = await Contact.create({
      userId: req.user.id,
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      company: company ? company.trim() : null,
      status: status || "Lead",
      value: value ? Number(value) : 0
    });

    res.status(201).json(created);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "A contact with this email already exists." });
    }
    res.status(500).json({ error: "Failed to create contact", details: err.message });
  }
});

// PUT /api/contacts/:id - update existing contact
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

    const { name, email, phone, company, status, value } = req.body;

    await contact.update({
      name: name !== undefined ? name.trim() : contact.name,
      email: email !== undefined ? email.trim() : contact.email,
      phone: phone !== undefined ? phone.trim() : contact.phone,
      company: company !== undefined ? company.trim() : contact.company,
      status: status !== undefined ? status : contact.status,
      value: value !== undefined ? Number(value) : contact.value
    });

    res.json(contact);
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "A contact with this email already exists." });
    }
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

export default router;
