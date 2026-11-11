import express from "express";
import { Invoice, Contact } from "../db.js";
import { authenticateToken, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();
router.use(authenticateToken);

const INVOICE_STATUSES = ["Draft", "Sent", "Paid", "Overdue", "Void"];

const normalizeItems = (rawItems) => {
  let parsed = rawItems;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => ({
      productId: item.productId ? Number(item.productId) : null,
      description: sanitizeString(item.description) || "Line item",
      quantity: Math.max(0, Number(item.quantity) || 0),
      unitPrice: Math.max(0, Number(item.unitPrice ?? item.price) || 0)
    }))
    .filter((item) => item.quantity > 0);
};

const calculateTotals = (items, taxRate) => {
  const subtotal = Number(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2));
  const rate = Math.max(0, Math.min(100, Number(taxRate) || 0));
  const taxAmount = Number(((subtotal * rate) / 100).toFixed(2));
  return {
    subtotal,
    taxRate: rate,
    taxAmount,
    amount: Number((subtotal + taxAmount).toFixed(2))
  };
};

const serializeInvoice = (invoice) => {
  const plain = invoice.toJSON ? invoice.toJSON() : invoice;
  let items = [];
  try {
    items = plain.items ? JSON.parse(plain.items) : [];
  } catch {
    items = [];
  }
  const isOverdue = Boolean(
    plain.dueDate &&
    new Date(plain.dueDate) < new Date() &&
    ["Sent", "Overdue"].includes(plain.status)
  );
  return { ...plain, items, isOverdue };
};

const generateInvoiceNumber = (type) =>
  `${type === "Quote" ? "QT" : "INV"}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`;

// GET /api/invoices - list invoices/quotes with contact and payment state
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

    res.json(invoices.map(serializeInvoice));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoices", details: err.message });
  }
});

// GET /api/invoices/:id - full invoice record
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Contact, attributes: ["id", "name", "email", "company", "phone"] }]
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(serializeInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice", details: err.message });
  }
});

// POST /api/invoices - create invoice or quote with server-calculated totals
router.post("/", async (req, res) => {
  try {
    const { contactId, type, status, dueDate, notes, taxRate } = req.body;
    const items = normalizeItems(req.body.items);

    if (items.length === 0) {
      return res.status(400).json({ error: "Add at least one line item with a quantity greater than zero." });
    }

    const documentType = type === "Quote" ? "Quote" : "Invoice";
    const documentStatus = INVOICE_STATUSES.includes(status) ? status : "Draft";
    const totals = calculateTotals(items, taxRate);
    const isPaid = documentStatus === "Paid";

    const created = await Invoice.create({
      userId: req.user.id,
      contactId: contactId ? parseInt(contactId, 10) : null,
      invoiceNumber: generateInvoiceNumber(documentType),
      type: documentType,
      status: documentStatus,
      dueDate: dueDate || null,
      issued_date: new Date(),
      paid_at: isPaid ? new Date() : null,
      items: JSON.stringify(items),
      subtotal: totals.subtotal,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      amount: totals.amount,
      notes: sanitizeString(notes) || null
    });

    await logAudit(req.user.id, "CREATE_INVOICE", "Invoice", created.id, {
      invoiceNumber: created.invoiceNumber,
      amount: created.amount,
      status: created.status
    });

    const populated = await Invoice.findByPk(created.id, {
      include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }]
    });

    res.status(201).json(serializeInvoice(populated));
  } catch (err) {
    res.status(500).json({ error: "Failed to create invoice", details: err.message });
  }
});

// PUT /api/invoices/:id - edit document, line items or lifecycle status
router.put("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const { contactId, type, status, dueDate, notes, taxRate } = req.body;
    const itemPayloadProvided = req.body.items !== undefined;
    let items = null;

    if (itemPayloadProvided) {
      items = normalizeItems(req.body.items);
      if (items.length === 0) {
        return res.status(400).json({ error: "An invoice must keep at least one valid line item." });
      }
    }

    if (contactId !== undefined) invoice.contactId = contactId ? parseInt(contactId, 10) : null;
    if (type !== undefined) invoice.type = type === "Quote" ? "Quote" : "Invoice";
    if (dueDate !== undefined) invoice.dueDate = dueDate || null;
    if (notes !== undefined) invoice.notes = sanitizeString(notes) || null;

    if (status !== undefined) {
      if (!INVOICE_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid invoice status." });
      }
      invoice.status = status;
      invoice.paid_at = status === "Paid" ? (invoice.paid_at || new Date()) : null;
    }

    if (items) {
      const totals = calculateTotals(items, taxRate !== undefined ? taxRate : invoice.tax_rate);
      invoice.items = JSON.stringify(items);
      invoice.subtotal = totals.subtotal;
      invoice.tax_rate = totals.taxRate;
      invoice.tax_amount = totals.taxAmount;
      invoice.amount = totals.amount;
    } else if (taxRate !== undefined) {
      const currentItems = normalizeItems(invoice.items);
      const totals = calculateTotals(currentItems, taxRate);
      invoice.subtotal = totals.subtotal;
      invoice.tax_rate = totals.taxRate;
      invoice.tax_amount = totals.taxAmount;
      invoice.amount = totals.amount;
    }

    await invoice.save();
    await logAudit(req.user.id, "UPDATE_INVOICE", "Invoice", invoice.id, {
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      amount: invoice.amount
    });

    const populated = await Invoice.findByPk(invoice.id, {
      include: [{ model: Contact, attributes: ["id", "name", "email", "company"] }]
    });

    res.json(serializeInvoice(populated));
  } catch (err) {
    res.status(500).json({ error: "Failed to update invoice", details: err.message });
  }
});

// DELETE /api/invoices/:id - remove an invoice or quote
router.delete("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    await invoice.destroy();
    await logAudit(req.user.id, "DELETE_INVOICE", "Invoice", req.params.id, {
      invoiceNumber: invoice.invoiceNumber
    });

    res.json({ message: "Invoice removed successfully", id: Number(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete invoice", details: err.message });
  }
});

export default router;
