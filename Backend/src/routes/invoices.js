import express from "express";
import { Invoice, Contact } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateToken);

// GET /api/invoices - list invoices/quotes
router.get("/", async (req, res) => {
  try {
    const { type, status } = req.query;
    const where = { userId: req.user.id };
    if (type && type !== "All") where.type = type;
    if (status && status !== "All") where.status = status;

    const invoices = await Invoice.findAll({
      where,
      include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }],
      order: [["id", "DESC"]]
    });

    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices", details: err.message });
  }
});

// POST /api/invoices - create invoice or quote
router.post("/", async (req, res) => {
  try {
    const { contactId, type, amount, status, dueDate, items } = req.body;
    const invNum = `${type === "Quote" ? "QT" : "INV"}-${Date.now().toString().slice(-6)}`;

    const created = await Invoice.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      invoiceNumber: invNum,
      type: type || "Invoice",
      amount: Number(amount) || 0.0,
      status: status || "Draft",
      dueDate: dueDate || null,
      items: items ? (typeof items === "string" ? items : JSON.stringify(items)) : null
    });

    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
});

// PUT /api/invoices/:id - update invoice
router.put("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const { status, amount, dueDate, items } = req.body;
    await invoice.update({
      status: status !== undefined ? status : invoice.status,
      amount: amount !== undefined ? Number(amount) : invoice.amount,
      dueDate: dueDate !== undefined ? dueDate : invoice.dueDate,
      items: items !== undefined ? (typeof items === "string" ? items : JSON.stringify(items)) : invoice.items
    });

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: "Failed to update invoice", details: err.message });
  }
});

// DELETE /api/invoices/:id - delete invoice
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    await invoice.destroy();
    res.json({ message: "Invoice removed successfully", id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete invoice", details: err.message });
  }
});

export default router;

