import { Sequelize, DataTypes } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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
  logging: process.env.NODE_ENV === "development" ? console.log : false,
  dialectOptions: {
    options: {
      encrypt: process.env.DB_ENCRYPT !== "false",
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false"
    }
  },
  pool: {
    max: 15,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// User Model
export const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(50), defaultValue: "admin" }
  },
  { tableName: "users", timestamps: true }
);

// Contact / Deal Model
export const Contact = sequelize.define(
  "Contact",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "users", key: "id" } },
    name: { type: DataTypes.STRING(150), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    phone: { type: DataTypes.STRING(50), allowNull: true },
    company: { type: DataTypes.STRING(150), allowNull: true },
    status: {
      type: DataTypes.ENUM("New", "Contacted", "Qualified", "Proposal", "Won", "Lost"),
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

// Task Model
export const Task = sequelize.define(
  "Task",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "contacts", key: "id" } },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    dueDate: { type: DataTypes.DATE, allowNull: true },
    priority: { type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"), defaultValue: "Medium" },
    status: { type: DataTypes.ENUM("Pending", "In Progress", "Completed", "Cancelled"), defaultValue: "Pending" }
  },
  { tableName: "tasks", timestamps: true }
);

// Activity Log Model
export const Activity = sequelize.define(
  "Activity",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "contacts", key: "id" } },
    type: { type: DataTypes.STRING(50), allowNull: false }, // Call, Email, Meeting, Note, StageChange
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    outcome: { type: DataTypes.STRING(100), allowNull: true }
  },
  { tableName: "activities", timestamps: true, updatedAt: false }
);

// Invoice / Quote Model
export const Invoice = sequelize.define(
  "Invoice",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "contacts", key: "id" } },
    invoiceNumber: { type: DataTypes.STRING(50), allowNull: false },
    type: { type: DataTypes.ENUM("Invoice", "Quote"), defaultValue: "Invoice" },
    amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0.0 },
    status: { type: DataTypes.ENUM("Draft", "Sent", "Paid", "Overdue", "Cancelled"), defaultValue: "Draft" },
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
    contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "contacts", key: "id" } },
    ticketNumber: { type: DataTypes.STRING(50), allowNull: false },
    subject: { type: DataTypes.STRING(250), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    priority: { type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"), defaultValue: "Medium" },
    status: { type: DataTypes.ENUM("Open", "In Progress", "Resolved", "Closed"), defaultValue: "Open" }
  },
  { tableName: "tickets", timestamps: true }
);

// Email Log Model
export const Email = sequelize.define(
  "Email",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: "users", key: "id" } },
    contactId: { type: DataTypes.INTEGER, allowNull: true, references: { model: "contacts", key: "id" } },
    recipientEmail: { type: DataTypes.STRING(255), allowNull: false },
    subject: { type: DataTypes.STRING(250), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING(30), defaultValue: "Sent" }
  },
  { tableName: "emails", timestamps: true, updatedAt: false }
);

// Associations
User.hasMany(Contact, { foreignKey: "userId", onDelete: "CASCADE" });
Contact.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Task, { foreignKey: "userId", onDelete: "CASCADE" });
Task.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Task, { foreignKey: "contactId" });
Task.belongsTo(Contact, { foreignKey: "contactId" });

User.hasMany(Activity, { foreignKey: "userId", onDelete: "CASCADE" });
Activity.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Activity, { foreignKey: "contactId" });
Activity.belongsTo(Contact, { foreignKey: "contactId" });

User.hasMany(Invoice, { foreignKey: "userId", onDelete: "CASCADE" });
Invoice.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Invoice, { foreignKey: "contactId" });
Invoice.belongsTo(Contact, { foreignKey: "contactId" });

User.hasMany(Ticket, { foreignKey: "userId", onDelete: "CASCADE" });
Ticket.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Ticket, { foreignKey: "contactId" });
Ticket.belongsTo(Contact, { foreignKey: "contactId" });

User.hasMany(Email, { foreignKey: "userId", onDelete: "CASCADE" });
Email.belongsTo(User, { foreignKey: "userId" });
Contact.hasMany(Email, { foreignKey: "contactId" });
Email.belongsTo(Contact, { foreignKey: "contactId" });

export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Connected to Microsoft SQL Server via Sequelize successfully.");
    await sequelize.sync();
    console.log("All Sequelize CRM models synchronized.");
  } catch (error) {
    console.error("Unable to connect to MSSQL database:", error.message);
    throw error;
  }
}

export default sequelize;
