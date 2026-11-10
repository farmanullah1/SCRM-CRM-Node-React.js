import { Sequelize, DataTypes } from "sequelize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env in Backend root is loaded even if started from workspace root
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
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// User Model for Authentication
export const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(50),
      defaultValue: "agent"
    }
  },
  {
    tableName: "users",
    timestamps: true
  }
);

// Contact / Lead Model
export const Contact = sequelize.define(
  "Contact",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "users",
        key: "id"
      }
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    company: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM("Lead", "Contacted", "Qualified", "Customer", "Lost"),
      defaultValue: "Lead"
    },
    value: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.0
    }
  },
  {
    tableName: "contacts",
    timestamps: true
  }
);

// Task Model for Scheduling & Activity Management
export const Task = sequelize.define(
  "Task",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      }
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "contacts",
        key: "id"
      }
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High", "Urgent"),
      defaultValue: "Medium"
    },
    status: {
      type: DataTypes.ENUM("Pending", "In Progress", "Completed", "Cancelled"),
      defaultValue: "Pending"
    }
  },
  {
    tableName: "tasks",
    timestamps: true
  }
);

// Define Associations
User.hasMany(Contact, { foreignKey: "userId", onDelete: "CASCADE" });
Contact.belongsTo(User, { foreignKey: "userId" });

User.hasMany(Task, { foreignKey: "userId", onDelete: "CASCADE" });
Task.belongsTo(User, { foreignKey: "userId" });

Contact.hasMany(Task, { foreignKey: "contactId", onDelete: "SET NULL" });
Task.belongsTo(Contact, { foreignKey: "contactId" });

// Database connection & sync helper
export async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("Connected to Microsoft SQL Server via Sequelize successfully.");

    // Sync models without altering existing MSSQL constraints
    await sequelize.sync();
    console.log("Sequelize models synchronized.");
  } catch (error) {
    console.error("Unable to connect to MSSQL database:", error.message);
    throw error;
  }
}

export default sequelize;
