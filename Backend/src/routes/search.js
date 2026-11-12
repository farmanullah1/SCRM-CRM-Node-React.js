import express from "express";
import { Lead, Contact, Company, Deal, Invoice, Ticket, Product, Op } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import { hasPermission } from "../permissions.js";
import { canViewAll } from "../services/accessScope.js";

const router = express.Router();
router.use(authenticateToken);

/**
 * One ranked-enough search across the records a user is allowed to see.
 * Every section is permission-gated and owner-scoped individually.
 */
router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json({ query: q, results: [], total: 0 });

  const like = `%${q}%`;
  const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 5));
  const effective = req.user.effectivePermissions || req.user.permissions;
  const allowed = (key) => hasPermission(effective, key);
  const ownScope = (field) => (canViewAll(req.user) ? {} : { [field]: req.user.id });
  const scopeFor = (type) => {
    if (canViewAll(req.user) || type === "companies") return {};
    if (type === "invoices" || type === "tickets") return { userId: req.user.id };
    return { owner_id: req.user.id };
  };
  const sections = [];

  async function section(type, label, permission, model, where, mapper) {
    if (!allowed(permission)) return;
    const rows = await model.findAll({ where: { ...where, ...scopeFor(type) }, limit, order: [["createdAt", "DESC"]] });
    sections.push({ type, label, items: rows.map(mapper) });
  }

  try {
    await section("leads", "Leads", "leads.view", Lead,
      { [Op.or]: [{ name: { [Op.like]: like } }, { email: { [Op.like]: like } }, { company_name: { [Op.like]: like } }] },
      (row) => ({ id: row.id, title: row.name, subtitle: row.company_name || row.email, href: `/app/leads?search=${encodeURIComponent(row.email || row.name)}` }));

    await section("contacts", "Contacts", "contacts.view", Contact,
      { [Op.or]: [{ first_name: { [Op.like]: like } }, { last_name: { [Op.like]: like } }, { email: { [Op.like]: like } }] },
      (row) => ({ id: row.id, title: `${row.first_name || ""} ${row.last_name || ""}`.trim(), subtitle: row.email, href: `/app/contacts?search=${encodeURIComponent(row.email || "")}` }));

    await section("companies", "Companies", "companies.view", Company,
      { [Op.or]: [{ name: { [Op.like]: like } }, { domain: { [Op.like]: like } }] },
      (row) => ({ id: row.id, title: row.name, subtitle: row.domain || row.industry, href: `/app/companies?search=${encodeURIComponent(row.name || "")}` }));

    await section("deals", "Deals", "deals.view", Deal,
      { title: { [Op.like]: like } },
      (row) => ({ id: row.id, title: row.title, subtitle: `${row.stage || "Deal"} · $${Number(row.value || 0).toLocaleString()}`, href: "/app/pipeline" }));

    await section("invoices", "Invoices", "invoices.view", Invoice,
      { [Op.or]: [{ invoiceNumber: { [Op.like]: like } }, { notes: { [Op.like]: like } }] },
      (row) => ({ id: row.id, title: row.invoiceNumber, subtitle: `${row.type} · ${row.status} · $${Number(row.amount || 0).toFixed(2)}`, href: "/app/invoices" }));

    await section("tickets", "Tickets", "tickets.view", Ticket,
      { [Op.or]: [{ ticketNumber: { [Op.like]: like } }, { subject: { [Op.like]: like } }] },
      (row) => ({ id: row.id, title: row.subject, subtitle: `${row.ticketNumber} · ${row.status}`, href: "/app/tickets" }));

    if (allowed("catalog.view")) {
      const rows = await Product.findAll({ where: { [Op.or]: [{ name: { [Op.like]: like } }, { sku: { [Op.like]: like } }] }, limit });
      sections.push({ type: "catalog", label: "Catalog", items: rows.map((row) => ({ id: row.id, title: row.name, subtitle: row.sku, href: "/app/catalog" })) });
    }

    const total = sections.reduce((sum, entry) => sum + entry.items.length, 0);
    res.json({ query: q, sections, total });
  } catch (error) {
    console.error("[Global search]", error.message);
    res.status(500).json({ error: "Search could not be completed." });
  }
});

export default router;
