import express from "express";
import { Ticket, Contact, Company } from "../db.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { canViewAll, canEditAll, canDeleteAll } from "../services/accessScope.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/tickets - list support tickets
router.get("/", requirePermission("tickets.view"), async (req, res) => {
  try {
    const { status, priority } = req.query;
    const where = canViewAll(req.user) ? {} : { userId: req.user.id };
    if (status && status !== "All") where.status = status;
    if (priority && priority !== "All") where.priority = priority;

    const tickets = await Ticket.findAll({
      where,
      include: [
        { model: Contact, attributes: ["id", "name", "email", "company"] },
        { model: Company, attributes: ["id", "name", "domain"] }
      ],
      order: [["id", "DESC"]]
    });

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tickets", details: err.message });
  }
});

// POST /api/tickets - create ticket
router.post("/", requirePermission("tickets.create"), async (req, res) => {
  try {
    const { contactId, companyId, subject, description, priority, status } = req.body;
    if (!subject) return res.status(400).json({ error: "Subject is required." });

    const ticketNumber = `TCK-${Date.now().toString().slice(-6)}`;
    const ticket = await Ticket.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      companyId: companyId ? parseInt(companyId, 10) : null,
      ticketNumber,
      subject: subject.trim(),
      description: description ? description.trim() : null,
      priority: priority || "Medium",
      status: status || "Open"
    });

    res.status(201).json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Failed to create ticket", details: err.message });
  }
});

// PUT /api/tickets/:id - update ticket
router.put("/:id", requirePermission("tickets.edit"), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: canEditAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const { status, priority, description, contactId, companyId } = req.body;
    await ticket.update({
      status: status !== undefined ? status : ticket.status,
      priority: priority !== undefined ? priority : ticket.priority,
      description: description !== undefined ? description : ticket.description,
      contactId: contactId !== undefined ? (contactId ? parseInt(contactId, 10) : null) : ticket.contactId,
      companyId: companyId !== undefined ? (companyId ? parseInt(companyId, 10) : null) : ticket.companyId
    });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: "Failed to update ticket", details: err.message });
  }
});

// DELETE /api/tickets/:id - delete ticket
router.delete("/:id", requirePermission("tickets.delete"), async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      where: canDeleteAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    await ticket.destroy();
    res.json({ message: "Ticket deleted successfully", id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete ticket", details: err.message });
  }
});

export default router;

