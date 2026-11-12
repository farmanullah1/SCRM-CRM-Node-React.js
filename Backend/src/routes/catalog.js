import express from "express";
import { Product, Supplier, ActivityLog } from "../db.js";
import { authenticateToken, requirePermission } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";

const router = express.Router();

// -----------------------------------------------------------------------------
// SUPPLY PILLAR: Products & Services Catalog
// -----------------------------------------------------------------------------

// GET /api/catalog/products - List products
router.get("/products", authenticateToken, requirePermission("catalog.view"), async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [["name", "ASC"]]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products catalog: " + error.message });
  }
});

// POST /api/catalog/products - Create product
router.post("/products", authenticateToken, requirePermission("catalog.create"), async (req, res) => {
  try {
    const { name, sku, description, price, cost, unit, category, is_active } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Product name is required." });
    }

    const newProduct = await Product.create({
      name: sanitizeString(name),
      sku: sku ? sanitizeString(sku) : `SKU-${Date.now().toString().slice(-6)}`,
      description: description ? sanitizeString(description) : null,
      price: Number(price) || 0.00,
      cost: Number(cost) || 0.00,
      unit: unit ? sanitizeString(unit) : "unit",
      category: category ? sanitizeString(category) : "Services",
      is_active: is_active !== false
    });

    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_PRODUCT",
      target_type: "Product",
      target_id: newProduct.id,
      details_json: JSON.stringify({ name: newProduct.name, price: newProduct.price })
    });

    res.status(201).json({ message: "Product created successfully.", product: newProduct });
  } catch (error) {
    res.status(500).json({ error: "Failed to create product: " + error.message });
  }
});

// PUT /api/catalog/products/:id - Update product
router.put("/products/:id", authenticateToken, requirePermission("catalog.edit"), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });

    const { name, sku, description, price, cost, unit, category, is_active } = req.body;
    if (name) product.name = sanitizeString(name);
    if (sku) product.sku = sanitizeString(sku);
    if (description !== undefined) product.description = description ? sanitizeString(description) : null;
    if (price !== undefined) product.price = Number(price);
    if (cost !== undefined) product.cost = Number(cost);
    if (unit) product.unit = sanitizeString(unit);
    if (category) product.category = sanitizeString(category);
    if (is_active !== undefined) product.is_active = Boolean(is_active);

    await product.save();
    res.json({ message: "Product updated successfully.", product });
  } catch (error) {
    res.status(500).json({ error: "Failed to update product: " + error.message });
  }
});

// DELETE /api/catalog/products/:id - Remove product (Admin/Manager)
router.delete("/products/:id", authenticateToken, requirePermission("catalog.delete"), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found." });

    await product.destroy();
    res.json({ message: "Product removed from catalog." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete product: " + error.message });
  }
});

// -----------------------------------------------------------------------------
// SUPPLY PILLAR: Suppliers / Vendors
// -----------------------------------------------------------------------------

// GET /api/catalog/suppliers - List suppliers
router.get("/suppliers", authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      order: [["name", "ASC"]]
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch suppliers: " + error.message });
  }
});

// POST /api/catalog/suppliers - Create supplier
router.post("/suppliers", authenticateToken, async (req, res) => {
  try {
    const { name, contact_name, email, phone, category, notes } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Supplier name is required." });
    }

    const supplier = await Supplier.create({
      name: sanitizeString(name),
      contact_name: contact_name ? sanitizeString(contact_name) : null,
      email: email ? sanitizeString(email) : null,
      phone: phone ? sanitizeString(phone) : null,
      category: category ? sanitizeString(category) : "Vendor",
      notes: notes ? sanitizeString(notes) : null
    });

    res.status(201).json({ message: "Supplier registered successfully.", supplier });
  } catch (error) {
    res.status(500).json({ error: "Failed to register supplier: " + error.message });
  }
});

export default router;

