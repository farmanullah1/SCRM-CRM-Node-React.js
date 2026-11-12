import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { FileAttachment, Lead, Contact, Company, Deal, Invoice, Ticket, Task } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { hasPermission } from "../permissions.js";
import { canViewAll } from "../services/accessScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const ALLOWED_MIME = new Set([
  "application/pdf", "text/plain", "text/csv", "application/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip", "image/png", "image/jpeg", "image/webp", "image/gif"
]);
const BLOCKED_EXT = /\.(html?|svg|js|mjs|exe|bat|cmd|ps1|sh)$/i;

const ENTITY_MODELS = { Lead, Contact, Company, Deal, Invoice, Ticket, Task };
const ENTITY_PERMISSIONS = {
  Lead: "leads.view", Contact: "contacts.view", Company: "companies.view",
  Deal: "deals.view", Invoice: "invoices.view", Ticket: "tickets.view", Task: "tasks.view"
};

function normalizedEntityType(value) {
  return Object.keys(ENTITY_MODELS).find((key) => key.toLowerCase() === String(value || "").toLowerCase()) || null;
}

async function authorizeEntity(user, entityType, entityId) {
  const model = ENTITY_MODELS[entityType];
  if (!model) return { error: "Unsupported attachment entity.", status: 400 };
  const effective = user.effectivePermissions || user.permissions;
  if (!hasPermission(effective, ENTITY_PERMISSIONS[entityType])) {
    return { error: "You do not have access to this record.", status: 403 };
  }
  const record = await model.findByPk(entityId);
  if (!record) return { error: "The parent record was not found.", status: 404 };
  if (!canViewAll(user) && entityType !== "Company") {
    const owner = Number(record.owner_id || record.userId || record.assigned_to_user_id || 0);
    if (owner && owner !== Number(user.id)) return { error: "You do not have access to this record.", status: 403 };
  }
  return { record };
}

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (BLOCKED_EXT.test(path.extname(file.originalname)) || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("That file type is not allowed. Upload images, PDF, Office, CSV, text or ZIP files."));
    }
    cb(null, true);
  }
});

const router = express.Router();
router.use(authenticateToken);

// GET /api/attachments/:entityType/:entityId - List files for contact, deal, ticket, etc.
router.get("/:entityType/:entityId", requirePermission("attachments.view"), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const normalized = normalizedEntityType(entityType);
    const access = await authorizeEntity(req.user, normalized, entityId);
    if (access.error) return res.status(access.status).json({ error: access.error });
    const attachments = await FileAttachment.findAll({
      where: { entity_type: normalized, entity_id: entityId },
      order: [["id", "DESC"]]
    });
    res.json({ attachments });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

// POST /api/attachments/upload - Upload attachment for entity
router.post("/upload", requirePermission("attachments.create"), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided for upload." });
    }

    const { entityType, entityId } = req.body;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: "entityType and entityId are required." });
    }

    const normalized = normalizedEntityType(entityType);
    const access = await authorizeEntity(req.user, normalized, entityId);
    if (access.error) {
      if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(access.status).json({ error: access.error });
    }

    const attachment = await FileAttachment.create({
      entity_type: normalized,
      entity_id: parseInt(entityId, 10),
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by: req.user.id
    });

    await logAudit(req.user.id, "UPLOAD_FILE", normalized, entityId, {
      fileName: req.file.originalname,
      sizeBytes: req.file.size
    });

    res.status(201).json({
      message: "File uploaded and attached successfully",
      attachment
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload file", details: err.message });
  }
});

// DELETE /api/attachments/:id - Delete attachment
router.delete("/:id", requirePermission("attachments.delete"), async (req, res) => {
  try {
    const attachment = await FileAttachment.findByPk(req.params.id);
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const effective = req.user.effectivePermissions || req.user.permissions;
    if (!hasPermission(effective, "attachments.delete_all") && Number(attachment.uploaded_by) !== Number(req.user.id)) {
      return res.status(403).json({ error: "You can only delete files you uploaded." });
    }

    const diskPath = path.join(UPLOAD_DIR, path.basename(attachment.file_path));
    if (fs.existsSync(diskPath)) {
      fs.unlinkSync(diskPath);
    }

    await attachment.destroy();
    res.json({ message: "Attachment deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

export default router;

