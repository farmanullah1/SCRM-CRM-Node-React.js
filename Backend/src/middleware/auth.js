import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User, Role, ActivityLog } from "../db.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev";

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Fetch user with role permissions
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "name", "email", "role", "role_id"]
    });

    if (!user) {
      return res.status(401).json({ error: "User session expired or user no longer exists." });
    }

    // Load role permissions if available
    let permissions = { all: user.role === "admin" };
    if (user.role_id) {
      const roleRecord = await Role.findByPk(user.role_id);
      if (roleRecord && roleRecord.permissions_json) {
        try {
          permissions = { ...permissions, ...JSON.parse(roleRecord.permissions_json) };
        } catch (e) {}
      }
    } else if (user.role === "admin") {
      permissions = { all: true, manage_users: true, export_data: true, backup_db: true, view_all: true, edit_all: true, delete_all: true };
    } else if (user.role === "manager") {
      permissions = { manage_users: false, export_data: true, view_all: true, edit_all: true, delete_all: false };
    } else {
      permissions = { view_assigned: true, edit_assigned: true, export_data: false };
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
      permissions
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token. Please log in again." });
  }
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (req.user.role === "admin" || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ 
      error: `Access forbidden. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}` 
    });
  };
}

export function requirePermission(permissionKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (req.user.role === "admin" || req.user.permissions?.[permissionKey] || req.user.permissions?.all) {
      return next();
    }
    return res.status(403).json({ 
      error: `Access forbidden. You lack the '${permissionKey}' permission.` 
    });
  };
}

export async function logAudit(userId, action, targetType, targetId = null, details = {}) {
  try {
    await ActivityLog.create({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      details_json: typeof details === "string" ? details : JSON.stringify(details),
      timestamp: new Date()
    });
  } catch (err) {
    console.error("[Audit Log Error]", err.message);
  }
}
