import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  User,
  Role,
  Company,
  Contact,
  Deal,
  PipelineStage,
  Task,
  ActivityLog,
  EmailLog,
  Invoice,
  Ticket,
  FileAttachment
} from "../db.js";
import { authenticateToken, requireRole, logAudit } from "../middleware/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUP_DIR = path.resolve(__dirname, "../../backups");

if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const router = express.Router();
router.use(authenticateToken);
router.use(requireRole(["admin"])); // Strictly restricted to Admins

export async function generateFullDatabaseDump() {
  const [
    users,
    roles,
    companies,
    contacts,
    deals,
    stages,
    tasks,
    activities,
    emails,
    invoices,
    tickets,
    attachments
  ] = await Promise.all([
    User.findAll({
      attributes: {
        exclude: [
          "password",
          "refresh_token",
          "two_factor_code",
          "two_factor_secret",
          "two_factor_pending_secret",
          "recovery_codes_json",
          "reset_password_token"
        ]
      }
    }),
    Role.findAll(),
    Company.findAll(),
    Contact.findAll(),
    Deal.findAll(),
    PipelineStage.findAll(),
    Task.findAll(),
    ActivityLog.findAll({ limit: 500 }),
    EmailLog.findAll({ limit: 500 }),
    Invoice.findAll(),
    Ticket.findAll(),
    FileAttachment.findAll()
  ]);

  return {
    metadata: {
      platform: "SCRM Enterprise",
      version: "2.5.0",
      generatedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        companies: companies.length,
        contacts: contacts.length,
        deals: deals.length,
        tasks: tasks.length,
        invoices: invoices.length,
        tickets: tickets.length
      }
    },
    tables: {
      users,
      roles,
      companies,
      contacts,
      deals,
      stages,
      tasks,
      activities,
      emails,
      invoices,
      tickets,
      attachments
    }
  };
}

// GET /api/backup - Download immediate full database JSON dump
router.get("/download", async (req, res) => {
  try {
    const dump = await generateFullDatabaseDump();
    const filename = `scrm_enterprise_backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;

    await logAudit(req.user.id, "BACKUP_DOWNLOAD", "System", null, { filename });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(dump, null, 2));
  } catch (err) {
    res.status(500).json({ error: "Failed to generate backup", details: err.message });
  }
});

// POST /api/backup/snapshot - Trigger local snapshot file creation
router.post("/snapshot", async (req, res) => {
  try {
    const dump = await generateFullDatabaseDump();
    const filename = `snapshot_${Date.now()}.json`;
    const filepath = path.join(BACKUP_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(dump, null, 2), "utf-8");

    await logAudit(req.user.id, "SNAPSHOT_CREATED", "System", null, { filename, path: filepath });

    res.json({
      message: "Snapshot created successfully on server storage.",
      filename,
      sizeBytes: fs.statSync(filepath).size,
      metadata: dump.metadata
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create snapshot", details: err.message });
  }
});

// GET /api/backup/history - List snapshots in backup directory
router.get("/history", (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json"));
    const history = files.map((f) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        sizeBytes: stats.size,
        createdAt: stats.birthtime
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ snapshots: history });
  } catch (err) {
    res.status(500).json({ error: "Failed to list snapshot history" });
  }
});

// Automatic daily backup trigger (runs every 24 hours)
export function startDailyBackupScheduler() {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log("[Backup Scheduler] Triggering automatic daily snapshot...");
      const dump = await generateFullDatabaseDump();
      const filename = `auto_daily_snapshot_${new Date().toISOString().slice(0, 10)}.json`;
      const filepath = path.join(BACKUP_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(dump, null, 2), "utf-8");
      console.log(`[Backup Scheduler] Saved daily snapshot to ${filename}`);
    } catch (e) {
      console.error("[Backup Scheduler] Automatic backup failed:", e.message);
    }
  }, TWENTY_FOUR_HOURS);
}

export default router;

