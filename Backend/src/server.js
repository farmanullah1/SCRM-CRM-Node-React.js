import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import companiesRouter from "./routes/companies.js";
import contactsRouter from "./routes/contacts.js";
import dealsRouter from "./routes/deals.js";
import tasksRouter from "./routes/tasks.js";
import activitiesRouter from "./routes/activities.js";
import emailsRouter from "./routes/emails.js";
import invoicesRouter from "./routes/invoices.js";
import ticketsRouter from "./routes/tickets.js";
import backupRouter, { startDailyBackupScheduler } from "./routes/backup.js";
import attachmentsRouter from "./routes/attachments.js";
import integrationsRouter from "./routes/integrations.js";
import { apiLimiter } from "./middleware/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware: Helmet & CORS
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & canvases for high-performance dashboard
    crossOriginEmbedderPolicy: false
  })
);

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// General rate limiter across all /api endpoints
app.use("/api", apiLimiter);

// Serve uploads statically
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// Parse JSON request bodies
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Route Mounts
app.use("/api/auth", authRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/emails", emailsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/backup", backupRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/integrations", integrationsRouter);

// System Health & Diagnostics Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    platform: "SCRM Enterprise",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    security: {
      helmet: "active",
      rateLimiter: "active",
      rbac: "active",
      sqlInjectionProtection: "parameterized_queries_active"
    },
    modules: [
      "auth",
      "companies",
      "contacts",
      "deals_pipeline",
      "tasks",
      "activities_audit",
      "emails_tracking",
      "invoices",
      "tickets",
      "backup",
      "attachments",
      "integrations"
    ]
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error("[Enterprise Error Handler]", err.stack || err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    refId: Date.now()
  });
});

// Database Init, Idempotent Schema Migration, and Server Start
connectDB()
  .then(() => {
    // Start automated daily backup scheduler
    startDailyBackupScheduler();

    app.listen(PORT, () => {
      console.log(`[SCRM Enterprise] Server running securely on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("[SCRM Enterprise] Startup failed due to DB connection error:", err);
    process.exit(1);
  });
