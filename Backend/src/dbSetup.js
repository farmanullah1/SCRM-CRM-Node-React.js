import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const dbName = process.env.DB_NAME || "SCRM";
const dbUser = process.env.DB_USER || "sa";
const dbPassword = process.env.DB_PASSWORD || "";
const dbServer = process.env.DB_SERVER || "localhost";
const dbPort = parseInt(process.env.DB_PORT || "1433", 10);

export async function ensureDatabaseAndSchema() {
  console.log(`[Database Init] Checking if database [${dbName}] exists...`);

  // Step 1: Connect to master to ensure DB exists
  const masterSequelize = new Sequelize("master", dbUser, dbPassword, {
    host: dbServer,
    port: dbPort,
    dialect: "mssql",
    logging: false,
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT !== "false",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false"
      }
    }
  });

  try {
    await masterSequelize.authenticate();
    await masterSequelize.query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}')
      BEGIN
        PRINT 'Creating database ${dbName}...';
        CREATE DATABASE [${dbName}];
      END
    `);
    console.log(`[Database Init] Database [${dbName}] confirmed.`);
  } catch (err) {
    console.warn(`[Database Init] Master check warning: ${err.message}. Proceeding to direct connect.`);
  } finally {
    await masterSequelize.close().catch(() => {});
  }

  // Step 2: Connect to target DB and run idempotent migrations
  const crmSequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbServer,
    port: dbPort,
    dialect: "mssql",
    logging: false,
    dialectOptions: {
      options: {
        encrypt: process.env.DB_ENCRYPT !== "false",
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false"
      }
    }
  });

  try {
    await crmSequelize.authenticate();
    console.log(`[Database Init] Connected to [${dbName}]. Running idempotent schema checks...`);

    // 1. Roles table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'roles')
      BEGIN
        CREATE TABLE [roles] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [role_name] NVARCHAR(50) NOT NULL UNIQUE,
          [permissions_json] NVARCHAR(MAX) NOT NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    // Pre-seed roles
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM [roles] WHERE [role_name] = 'admin')
      BEGIN
        INSERT INTO [roles] ([role_name], [permissions_json])
        VALUES ('admin', '{"all":true,"manage_users":true,"manage_roles":true,"export_data":true,"backup_db":true,"view_all":true,"edit_all":true,"delete_all":true}');
      END
      IF NOT EXISTS (SELECT * FROM [roles] WHERE [role_name] = 'manager')
      BEGIN
        INSERT INTO [roles] ([role_name], [permissions_json])
        VALUES ('manager', '{"manage_users":false,"export_data":true,"view_all":true,"edit_all":true,"delete_all":false}');
      END
      IF NOT EXISTS (SELECT * FROM [roles] WHERE [role_name] = 'standard_user')
      BEGIN
        INSERT INTO [roles] ([role_name], [permissions_json])
        VALUES ('standard_user', '{"view_assigned":true,"edit_assigned":true,"export_data":false}');
      END
    `);

    // 2. Users table check & columns migration
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'users')
      BEGIN
        CREATE TABLE [users] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [name] NVARCHAR(150) NOT NULL,
          [email] NVARCHAR(255) NOT NULL UNIQUE,
          [password] NVARCHAR(255) NOT NULL,
          [role] NVARCHAR(50) DEFAULT 'admin',
          [role_id] INT NULL,
          [refresh_token] NVARCHAR(500) NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id')
          ALTER TABLE [users] ADD [role_id] INT NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'refresh_token')
          ALTER TABLE [users] ADD [refresh_token] NVARCHAR(500) NULL;
      END
    `);

    // 3. Companies table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'companies')
      BEGIN
        CREATE TABLE [companies] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [name] NVARCHAR(150) NOT NULL,
          [domain] NVARCHAR(150) NULL,
          [phone] NVARCHAR(50) NULL,
          [address] NVARCHAR(300) NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    // 4. Contacts table & columns
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'contacts')
      BEGIN
        CREATE TABLE [contacts] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [first_name] NVARCHAR(100) NULL,
          [last_name] NVARCHAR(100) NULL,
          [name] NVARCHAR(150) NOT NULL,
          [email] NVARCHAR(255) NOT NULL,
          [phone] NVARCHAR(50) NULL,
          [company] NVARCHAR(150) NULL,
          [company_id] INT NULL,
          [userId] INT NULL,
          [owner_id] INT NULL,
          [status] NVARCHAR(50) DEFAULT 'New',
          [value] DECIMAL(12,2) DEFAULT 0.00,
          [leadSource] NVARCHAR(100) DEFAULT 'Website',
          [tags] NVARCHAR(500) DEFAULT '',
          [notes] NVARCHAR(MAX) NULL,
          [expectedCloseDate] DATETIMEOFFSET NULL,
          [customFields] NVARCHAR(MAX) NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contacts' AND COLUMN_NAME = 'first_name')
          ALTER TABLE [contacts] ADD [first_name] NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contacts' AND COLUMN_NAME = 'last_name')
          ALTER TABLE [contacts] ADD [last_name] NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contacts' AND COLUMN_NAME = 'company_id')
          ALTER TABLE [contacts] ADD [company_id] INT NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'contacts' AND COLUMN_NAME = 'owner_id')
          ALTER TABLE [contacts] ADD [owner_id] INT NULL;
      END
    `);

    // 5. Pipeline Stages table & pre-seeding
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'pipeline_stages')
      BEGIN
        CREATE TABLE [pipeline_stages] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [name] NVARCHAR(50) NOT NULL UNIQUE,
          [order_index] INT NOT NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'New')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('New', 1);
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'Contacted')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('Contacted', 2);
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'Qualified')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('Qualified', 3);
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'Proposal')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('Proposal', 4);
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'Won')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('Won', 5);
      IF NOT EXISTS (SELECT * FROM [pipeline_stages] WHERE [name] = 'Lost')
        INSERT INTO [pipeline_stages] ([name], [order_index]) VALUES ('Lost', 6);
    `);

    // 6. Leads_Deals table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'leads_deals')
      BEGIN
        CREATE TABLE [leads_deals] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [title] NVARCHAR(200) NOT NULL,
          [value] DECIMAL(12,2) DEFAULT 0.00,
          [stage_id] INT NULL,
          [stage_name] NVARCHAR(50) DEFAULT 'New',
          [expected_close_date] DATETIMEOFFSET NULL,
          [owner_id] INT NULL,
          [contact_id] INT NULL,
          [notes] NVARCHAR(MAX) NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    // 7. Tasks table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'tasks')
      BEGIN
        CREATE TABLE [tasks] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [userId] INT NOT NULL,
          [assigned_to_user_id] INT NULL,
          [contactId] INT NULL,
          [related_contact_id] INT NULL,
          [related_deal_id] INT NULL,
          [title] NVARCHAR(200) NOT NULL,
          [description] NVARCHAR(MAX) NULL,
          [dueDate] DATETIMEOFFSET NULL,
          [due_date] DATETIMEOFFSET NULL,
          [priority] NVARCHAR(20) DEFAULT 'Medium',
          [status] NVARCHAR(20) DEFAULT 'Pending',
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [updatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'assigned_to_user_id')
          ALTER TABLE [tasks] ADD [assigned_to_user_id] INT NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'related_contact_id')
          ALTER TABLE [tasks] ADD [related_contact_id] INT NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'related_deal_id')
          ALTER TABLE [tasks] ADD [related_deal_id] INT NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tasks' AND COLUMN_NAME = 'due_date')
          ALTER TABLE [tasks] ADD [due_date] DATETIMEOFFSET NULL;
      END
    `);

    // 8. Activity_Logs / Audit table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'activity_logs')
      BEGIN
        CREATE TABLE [activity_logs] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [user_id] INT NULL,
          [action] NVARCHAR(100) NOT NULL,
          [target_type] NVARCHAR(50) NOT NULL,
          [target_id] INT NULL,
          [timestamp] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
          [details_json] NVARCHAR(MAX) NULL,
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    // 9. Email_Logs table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'email_logs')
      BEGIN
        CREATE TABLE [email_logs] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [user_id] INT NULL,
          [contact_id] INT NULL,
          [template_name] NVARCHAR(100) NULL,
          [recipient_email] NVARCHAR(255) NOT NULL,
          [subject] NVARCHAR(255) NOT NULL,
          [body] NVARCHAR(MAX) NOT NULL,
          [tracking_pixel_id] NVARCHAR(100) NULL,
          [is_opened] BIT DEFAULT 0,
          [opened_at] DATETIMEOFFSET NULL,
          [status] NVARCHAR(50) DEFAULT 'Sent',
          [createdAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
      ELSE
      BEGIN
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'email_logs' AND COLUMN_NAME = 'tracking_pixel_id')
          ALTER TABLE [email_logs] ADD [tracking_pixel_id] NVARCHAR(100) NULL;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'email_logs' AND COLUMN_NAME = 'is_opened')
          ALTER TABLE [email_logs] ADD [is_opened] BIT DEFAULT 0;
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'email_logs' AND COLUMN_NAME = 'opened_at')
          ALTER TABLE [email_logs] ADD [opened_at] DATETIMEOFFSET NULL;
      END
    `);

    // 10. File_Attachments table
    await crmSequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'file_attachments')
      BEGIN
        CREATE TABLE [file_attachments] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [entity_type] NVARCHAR(50) NOT NULL,
          [entity_id] INT NOT NULL,
          [file_name] NVARCHAR(255) NOT NULL,
          [file_path] NVARCHAR(500) NOT NULL,
          [file_type] NVARCHAR(100) NULL,
          [file_size] BIGINT NULL,
          [uploaded_by] INT NULL,
          [uploaded_at] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET()
        );
      END
    `);

    console.log("[Database Init] Idempotent schema migration completed successfully!");
  } catch (err) {
    console.error("[Database Init] Migration error:", err);
    throw err;
  } finally {
    await crmSequelize.close().catch(() => {});
  }
}

