import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./db.js";
import authRouter from "./routes/auth.js";
import contactsRouter from "./routes/contacts.js";
import tasksRouter from "./routes/tasks.js";
import activitiesRouter from "./routes/activities.js";
import invoicesRouter from "./routes/invoices.js";
import ticketsRouter from "./routes/tickets.js";
import emailsRouter from "./routes/emails.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api/emails", emailsRouter);

app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    platform: "SCRM Enterprise",
    modules: ["contacts", "tasks", "activities", "invoices", "tickets", "emails", "analytics"]
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Connect to MSSQL DB then start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SCRM Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to start server due to DB connection error:", err);
    process.exit(1);
  });
