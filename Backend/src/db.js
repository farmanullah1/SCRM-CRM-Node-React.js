import { Sequelize, DataTypes, Op } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { ensureDatabaseAndSchema } from "./dbSetup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbName = process.env.DB_NAME || "SCRM";
const dbUser = process.env.DB_USER || "sa";
const dbPassword = process.env.DB_PASSWORD || "";
const dbServer = process.env.DB_SERVER || "localhost";
const dbPort = parseInt(process.env.DB_PORT || "1433", 10);

export const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbServer,
  port: dbPort,
  dialect: "mssql",
  logging: process.env.NODE_ENV === "development" ? false : false,
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false"
    }
  },
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// 1. Roles & Permissions Model
export const Role = sequelize.define(
  "Role",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    role_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    permissions_json: { type: DataTypes.TEXT, allowNull: false }
  },
  { tableName: "roles", timestamps: true }
);

// 2. Users Model
export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(50), defaultValue: "admin" },
    role_id: { type: DataTypes.INTEGER, allowNull: true },
    refresh_token: { type: DataTypes.STRING(500), allowNull: true },
    two_factor_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
    two_factor_code: { type: DataTypes.STRING(10), allowNull: true },
    two_factor_expires: { type: DataTypes.DATE, allowNull: true },
    reset_password_token: { type: DataTypes.STRING(100), allowNull: true },
    reset_password_expires: { type: DataTypes.DATE, allowNull: true }
  },
  { tableName: "users", timestamps: true }
);

// 3. Companies Model
export const Company = sequelize.define(
  "Company",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    domain: { type: DataTypes.STRING(150), allowNull: true },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    address: { type: DataTypes.STRING(300), allowNull: true }
  },
  { tableName: "companies", timestamps: true }
);

// 4. Contacts Model
export const Contact = sequelize.define(
  "Contact",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" } },
    owner_id: { type: DataTypes.INTEGER, allowNull: true },
    first_name: { type: DataTypes.STRING(100), allowNull: true },
    last_name: { type: DataTypes.STRING(100), allowNull: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    company: { type: DataTypes.STRING(150), allowNull: true },
    company_id: { type: DataTypes.INTEGER, allowNull: true },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: "New"
    },
    value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    leadSource: { type: DataTypes.STRING(100), defaultValue: "Website" },
    tags: { type: DataTypes.STRING(500), defaultValue: "" },
    notes: { type: DataTypes.TEXT, allowNull: true },
    expectedCloseDate: { type: DataTypes.DATE, allowNull: true },
    customFields: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "contacts", timestamps: true }
);

// 5. Pipeline Stages Model
export const PipelineStage = sequelize.define(
  "PipelineStage",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    order_index: { type: DataTypes.INTEGER, allowNull: false }
  },
  { tableName: "pipeline_stages", timestamps: true }
);

// 6. Leads & Deals Model
export const Deal = sequelize.define(
  "Deal",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    value: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    stage_id: { type: DataTypes.INTEGER, allowNull: true },
    stage_name: { type: DataTypes.STRING(50), defaultValue: "New" },
    expected_close_date: { type: DataTypes.DATE, allowNull: true },
    owner_id: { type: DataTypes.INTEGER, allowNull: true },
    contact_id: { type: DataTypes.INTEGER, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "leads_deals", timestamps: true }
);

// 7. Tasks & Reminders Model
export const Task = sequelize.define(
  "Task",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    assigned_to_user_id: { type: DataTypes.INTEGER, allowNull: true },
    contactId: { type: DataTypes.INTEGER, allowNull: true },
    related_contact_id: { type: DataTypes.INTEGER, allowNull: true },
    related_deal_id: { type: DataTypes.INTEGER, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    dueDate: { type: DataTypes.DATE, allowNull: true },
    due_date: { type: DataTypes.DATE, allowNull: true },
    priority: { type: DataTypes.STRING(20), defaultValue: "Medium" },
    status: { type: DataTypes.STRING(20), defaultValue: "Pending" }
  },
  { tableName: "tasks", timestamps: true }
);

// 8. Activity Logs / Audit Model
export const ActivityLog = sequelize.define(
  "ActivityLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    target_type: { type: DataTypes.STRING(50), allowNull: false }, // Contact, Deal, Task, Auth, System
    target_id: { type: DataTypes.INTEGER, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    details_json: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "activity_logs", timestamps: true, updatedAt: false }
);

// Aliased as Activity for backward compatibility
export const Activity = ActivityLog;

// 9. Email Logs & Templates Model
export const EmailLog = sequelize.define(
  "EmailLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: true },
    contact_id: { type: DataTypes.INTEGER, allowNull: true },
    template_name: { type: DataTypes.STRING(100), allowNull: true },
    recipient_email: { type: DataTypes.STRING(255), allowNull: false },
    subject: { type: DataTypes.STRING(255), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    tracking_pixel_id: { type: DataTypes.STRING(100), allowNull: true },
    is_opened: { type: DataTypes.BOOLEAN, defaultValue: false },
    opened_at: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(50), defaultValue: "Sent" }
  },
  { tableName: "email_logs", timestamps: true, updatedAt: false }
);

// Aliased as Email for backward compatibility
export const Email = EmailLog;

// 10. File Attachments Model
export const FileAttachment = sequelize.define(
  "FileAttachment",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    entity_type: { type: DataTypes.STRING(50), allowNull: false }, // Contact, Deal, Task, Ticket, Invoice
    entity_id: { type: DataTypes.INTEGER, allowNull: false },
    file_name: { type: DataTypes.STRING(255), allowNull: false },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    file_type: { type: DataTypes.STRING(100), allowNull: true },
    file_size: { type: DataTypes.BIGINT, allowNull: true },
    uploaded_by: { type: DataTypes.INTEGER, allowNull: true },
    uploaded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  },
  { tableName: "file_attachments", timestamps: false }
);

// Quotes / Invoices Model
export const Invoice = sequelize.define(
  "Invoice",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true },
    invoiceNumber: { type: DataTypes.STRING(50), allowNull: false },
    type: { type: DataTypes.STRING(20), defaultValue: "Invoice" },
    amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    status: { type: DataTypes.STRING(20), defaultValue: "Draft" },
    dueDate: { type: DataTypes.DATE, allowNull: true },
    items: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "invoices", timestamps: true }
);

// Support Ticket Model
export const Ticket = sequelize.define(
  "Ticket",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true },
    ticketNumber: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.STRING(250), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priority: { type: DataTypes.STRING(20), defaultValue: "Medium" },
    status: { type: DataTypes.STRING(20), defaultValue: "Open" }
  },
  { tableName: "tickets", timestamps: true }
);

// Associations
User.hasMany(Contact, { foreignKey: "userId", onDelete: "CASCADE" });
Contact.belongsTo(User, { foreignKey: "userId" });

Company.hasMany(Contact, { foreignKey: "company_id" });
Contact.belongsTo(Company, { foreignKey: "company_id" });

Contact.hasMany(Deal, { foreignKey: "contact_id" });
Deal.belongsTo(Contact, { foreignKey: "contact_id" });

User.hasMany(Deal, { foreignKey: "owner_id" });
Deal.belongsTo(User, { foreignKey: "owner_id" });

User.hasMany(Task, { foreignKey: "userId", onDelete: "CASCADE" });
Task.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Task, { foreignKey: "contactId" });
Task.belongsTo(Contact, { foreignKey: "contactId" });

User.hasMany(Invoice, { foreignKey: "userId", onDelete: "CASCADE" });
Invoice.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Ticket, { foreignKey: "userId", onDelete: "CASCADE" });
Ticket.belongsTo(User, { foreignKey: "userId" });

export async function connectDB() {
  try {
    // Run auto-database setup and idempotent schema migration first
    await ensureDatabaseAndSchema();

    await sequelize.authenticate();
    console.log("Connected to Microsoft SQL Server via Sequelize successfully.");
  } catch (error) {
    console.error("Unable to connect to MSSQL database:", error.message);
    throw error;
  }
}

export { Op };
export default sequelize;
