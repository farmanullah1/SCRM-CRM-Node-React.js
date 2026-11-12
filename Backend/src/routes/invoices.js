import express from "express";
import PDFDocument from "pdfkit";
import { Invoice, InvoicePayment, Contact, Company, Op } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { canViewAll, canEditAll, canDeleteAll } from "../services/accessScope.js";
import { sanitizeString } from "../middleware/security.js";
import { createNotification } from "./notifications.js";

const router = express.Router();
router.use(authenticateToken);

const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue", "Void"];

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
  const amount = Number(plain.amount || 0);
  const amountPaid = Number(plain.amount_paid || 0);
  const credit = Number(plain.credit_amount || 0);
  return {
    ...plain,
    items,
    isOverdue,
    amount: Number(amount.toFixed(2)),
    amount_paid: Number(amountPaid.toFixed(2)),
    credit_amount: Number(credit.toFixed(2)),
    balance: Number(Math.max(0, amount - amountPaid - credit).toFixed(2))
  };
};

const generateInvoiceNumber = (type) =>
  `${type === "Quote" ? "QT" : "INV"}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-6)}`;

// GET /api/invoices - list invoices/quotes with contact and payment state
router.get("/", requirePermission("invoices.view"), async (req, res) => {
  try {
    const { type, status, companyId, from, to } = req.query;
    const where = canViewAll(req.user) ? {} : { userId: req.user.id };
    if (type && type !== "All") where.type = type;
    if (status && status !== "All") where.status = status;
    if (companyId) where.companyId = Number(companyId);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

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
router.get("/:id", requirePermission("invoices.view"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: canViewAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id },
      include: [{ model: Contact, attributes: ["id", "name", "email", "company", "phone"] }]
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json(serializeInvoice(invoice));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch invoice", details: err.message });
  }
});

// POST /api/invoices - create invoice or quote with server-calculated totals
router.post("/", requirePermission("invoices.create"), async (req, res) => {
  try {
    const { contactId, companyId, type, status, dueDate, notes, taxRate } = req.body;
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
      companyId: companyId ? parseInt(companyId, 10) : null,
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
router.put("/:id", requirePermission("invoices.edit"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: canEditAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });

    const { contactId, companyId, type, status, dueDate, notes, taxRate } = req.body;
    const itemPayloadProvided = req.body.items !== undefined;
    let items = null;

    if (itemPayloadProvided) {
      items = normalizeItems(req.body.items);
      if (items.length === 0) {
        return res.status(400).json({ error: "An invoice must keep at least one valid line item." });
      }
    }

    if (contactId !== undefined) invoice.contactId = contactId ? parseInt(contactId, 10) : null;
    if (companyId !== undefined) invoice.companyId = companyId ? parseInt(companyId, 10) : null;
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

// ---------------------------------------------------------------------------
// Payment lifecycle: partial payments, credits and server-side balances
// ---------------------------------------------------------------------------
async function recalculatePayments(invoice) {
  const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id } });
  const paid = payments.filter((entry) => entry.kind !== "Credit").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const credits = payments.filter((entry) => entry.kind === "Credit").reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const balance = Number(Math.max(0, Number(invoice.amount || 0) - paid - credits).toFixed(2));

  invoice.amount_paid = Number(paid.toFixed(2));
  invoice.credit_amount = Number(credits.toFixed(2));
  if (balance <= 0.009) {
    invoice.status = "Paid";
    invoice.paid_at = invoice.paid_at || new Date();
  } else if (paid + credits > 0 && ["Sent", "Partially Paid", "Overdue"].includes(invoice.status)) {
    invoice.status = "Partially Paid";
    invoice.paid_at = null;
  }
  await invoice.save();
  return { paid, credits, balance };
}

router.get("/:id/payments", requirePermission("payments.view"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: canViewAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    const payments = await InvoicePayment.findAll({ where: { invoiceId: invoice.id }, order: [["paid_at", "DESC"]] });
    res.json({ payments, invoice: serializeInvoice(invoice) });
  } catch (error) {
    res.status(500).json({ error: "Payments could not be loaded." });
  }
});

router.post("/:id/payments", requirePermission("payments.create"), async (req, res) => {
  const amount = Number(req.body?.amount);
  const kind = req.body?.kind === "Credit" ? "Credit" : "Payment";
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "Enter a payment amount greater than zero." });

  try {
    const invoice = await Invoice.findOne({
      where: canEditAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found." });
    if (invoice.status === "Void") return res.status(409).json({ error: "Void invoices cannot receive payments." });

    const balance = Number(invoice.amount || 0) - Number(invoice.amount_paid || 0) - Number(invoice.credit_amount || 0);
    if (amount > balance + 0.009) return res.status(400).json({ error: `The amount exceeds the outstanding balance of ${Math.max(0, balance).toFixed(2)}.` });

    const payment = await InvoicePayment.create({
      invoiceId: invoice.id,
      userId: req.user.id,
      kind,
      amount: Number(amount.toFixed(2)),
      method: sanitizeString(req.body?.method) || null,
      reference: sanitizeString(req.body?.reference) || null,
      note: sanitizeString(req.body?.note) || null,
      paid_at: req.body?.paid_at ? new Date(req.body.paid_at) : new Date()
    });
    const totals = await recalculatePayments(invoice);
    await logAudit(req.user.id, kind === "Credit" ? "INVOICE_CREDIT" : "INVOICE_PAYMENT", "Invoice", invoice.id, {
      amount: payment.amount,
      method: payment.method,
      balance: totals.balance
    });
    await createNotification({
      userId: invoice.userId,
      type: "invoice",
      title: kind === "Credit" ? `Credit applied to ${invoice.invoiceNumber}` : `Payment received for ${invoice.invoiceNumber}`,
      body: `$${Number(amount).toFixed(2)} · balance $${totals.balance.toFixed(2)}`,
      link: "/app/invoices"
    });
    res.status(201).json({ message: "Payment recorded.", payment, invoice: serializeInvoice(invoice) });
  } catch (error) {
    console.error("[Invoice payment]", error.message);
    res.status(500).json({ error: "The payment could not be recorded." });
  }
});

// GET /api/invoices/:id/pdf - professional, printable quote or invoice
router.get("/:id/pdf", requirePermission("invoices.view"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: canViewAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id },
      include: [
        { model: Contact, attributes: ["id", "name", "email", "company", "phone"] },
        { model: Company, attributes: ["id", "name", "domain", "address"] }
      ]
    });
    if (!invoice) return res.status(404).json({ error: "Invoice not found." });

    const data = serializeInvoice(invoice);
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const filename = `${data.invoiceNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    const brand = "#151515";
    const accent = "#D8E84A";
    doc.rect(0, 0, 595, 96).fill(brand);
    doc.fillColor(accent).fontSize(22).font("Helvetica-Bold").text("SCRM", 50, 30);
    doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica").text("SOVEREIGN CUSTOMER RELATIONSHIP MANAGEMENT", 50, 58);
    doc.fillColor("#FFFFFF").fontSize(20).font("Helvetica-Bold").text(data.type.toUpperCase(), 380, 34, { width: 165, align: "right" });
    doc.fillColor("#CFCFCF").fontSize(9).font("Helvetica").text(data.invoiceNumber, 380, 62, { width: 165, align: "right" });

    let y = 125;
    doc.fillColor("#777777").fontSize(8).font("Helvetica-Bold").text("BILL TO", 50, y);
    doc.fillColor("#111111").fontSize(11).font("Helvetica-Bold").text(data.Contact?.name || data.company?.name || "Customer", 50, y + 14);
    doc.fillColor("#555555").fontSize(9).font("Helvetica");
    const customerLines = [data.Contact?.email, data.Contact?.phone, data.company?.name, data.company?.address].filter(Boolean);
    doc.text(customerLines.join("\n"), 50, y + 31, { width: 240 });

    doc.fillColor("#777777").fontSize(8).font("Helvetica-Bold").text("ISSUED", 380, y);
    doc.fillColor("#111111").fontSize(9).font("Helvetica").text(new Date(data.issued_date || data.createdAt).toLocaleDateString(), 380, y + 14);
    doc.fillColor("#777777").fontSize(8).font("Helvetica-Bold").text("DUE", 470, y);
    doc.fillColor("#111111").fontSize(9).font("Helvetica").text(data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "On receipt", 470, y + 14);

    y = 220;
    doc.rect(50, y, 495, 24).fill("#F2F2F2");
    doc.fillColor("#333333").fontSize(8).font("Helvetica-Bold");
    doc.text("DESCRIPTION", 58, y + 8);
    doc.text("QTY", 350, y + 8, { width: 40, align: "right" });
    doc.text("UNIT PRICE", 400, y + 8, { width: 65, align: "right" });
    doc.text("AMOUNT", 470, y + 8, { width: 65, align: "right" });
    y += 32;

    data.items.forEach((item) => {
      const lineTotal = Number(item.quantity) * Number(item.unitPrice);
      doc.fillColor("#222222").fontSize(9).font("Helvetica").text(item.description || "Line item", 58, y, { width: 280 });
      doc.text(String(item.quantity), 350, y, { width: 40, align: "right" });
      doc.text(`$${Number(item.unitPrice).toFixed(2)}`, 400, y, { width: 65, align: "right" });
      doc.text(`$${lineTotal.toFixed(2)}`, 470, y, { width: 65, align: "right" });
      y += 20;
      doc.moveTo(50, y - 4).lineTo(545, y - 4).strokeColor("#EEEEEE").stroke();
    });

    y += 8;
    const summaryX = 370;
    doc.fillColor("#555555").fontSize(9).font("Helvetica").text("Subtotal", summaryX, y, { width: 100 });
    doc.fillColor("#111111").text(`$${Number(data.subtotal).toFixed(2)}`, summaryX + 95, y, { width: 75, align: "right" });
    doc.fillColor("#555555").text(`Tax (${Number(data.tax_rate).toFixed(2)}%)`, summaryX, y + 18, { width: 100 });
    doc.fillColor("#111111").text(`$${Number(data.tax_amount).toFixed(2)}`, summaryX + 95, y + 18, { width: 75, align: "right" });
    doc.moveTo(summaryX, y + 38).lineTo(545, y + 38).strokeColor("#CCCCCC").stroke();
    doc.fillColor("#111111").fontSize(12).font("Helvetica-Bold").text("TOTAL", summaryX, y + 46, { width: 100 });
    doc.text(`$${Number(data.amount).toFixed(2)}`, summaryX + 85, y + 46, { width: 85, align: "right" });
    if (Number(data.amount_paid) > 0 || Number(data.credit_amount) > 0) {
      doc.fillColor("#555555").fontSize(9).font("Helvetica").text("Paid / credited", summaryX, y + 70, { width: 130 });
      doc.fillColor("#111111").text(`$${(Number(data.amount_paid) + Number(data.credit_amount)).toFixed(2)}`, summaryX + 95, y + 70, { width: 75, align: "right" });
      doc.fillColor("#111111").font("Helvetica-Bold").text(`Balance due  $${Number(data.balance).toFixed(2)}`, summaryX, y + 88, { width: 170, align: "right" });
    }

    if (data.notes) {
      doc.fillColor("#777777").fontSize(8).font("Helvetica-Bold").text("NOTES", 50, y + 74);
      doc.fillColor("#444444").fontSize(9).font("Helvetica").text(String(data.notes), 50, y + 88, { width: 280 });
    }
    doc.fillColor("#999999").fontSize(8).font("Helvetica").text(
      `${data.status} · Generated ${new Date().toLocaleString()} · ${data.invoiceNumber}`,
      50, 770, { width: 495, align: "center" }
    );
    doc.end();
  } catch (error) {
    console.error("[Invoice PDF]", error.message);
    if (!res.headersSent) res.status(500).json({ error: "The PDF could not be generated." });
  }
});

// DELETE /api/invoices/:id - remove an invoice or quote
router.delete("/:id", requirePermission("invoices.delete"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      where: canDeleteAll(req.user) ? { id: req.params.id } : { id: req.params.id, userId: req.user.id }
    });
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
