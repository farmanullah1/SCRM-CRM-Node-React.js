import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { FileAttachment } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";

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

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

const router = express.Router();
router.use(authenticateToken);

// GET /api/attachments/:entityType/:entityId - List files for contact, deal, ticket, etc.
router.get("/:entityType/:entityId", requirePermission("attachments.view"), async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const attachments = await FileAttachment.findAll({
      where: { entity_type: entityType, entity_id: entityId },
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

    const attachment = await FileAttachment.create({
      entity_type: entityType,
      entity_id: parseInt(entityId, 10),
      file_name: req.file.originalname,
      file_path: `/uploads/${req.file.filename}`,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by: req.user.id
    });

    await logAudit(req.user.id, "UPLOAD_FILE", entityType, entityId, {
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

