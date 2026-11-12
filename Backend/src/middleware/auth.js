import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User, Role, ActivityLog } from "../db.js";
import { hasPermission, resolvePermissions } from "../permissions.js";
import { applyPermissionOverrides } from "../services/accessScope.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev";

function legacyPermissionFlags(effective) {
  const check = (key) => (effective.all ? true : effective.permissions.has(key));
  return {
    all: Boolean(effective.all),
    permissions: [...effective.permissions],
    view_all: check("records.view_all"),
    edit_all: check("records.edit_all"),
    delete_all: check("records.delete_all"),
    export_data: check("contacts.export") || check("reports.export"),
    backup_db: check("backup.manage"),
    manage_users: check("users.edit"),
    manage_roles: check("roles.edit")
  };
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. Authentication token required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "company_name",
        "title",
        "avatar_url",
        "cover_url",
        "bio",
        "role",
        "role_id",
        "permission_overrides_json",
        "token_version",
        "is_active",
        "two_factor_enabled",
        "google_id",
        "last_login_at",
        "createdAt"
      ]
    });

    if (!user) {
      return res.status(401).json({ error: "User session expired or user no longer exists." });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: "This account is suspended. Contact an administrator." });
    }

    // Server-enforced revocation: logout, suspension and password resets bump
    // token_version, invalidating every already-issued access token immediately.
    const tokenVersion = Number(decoded.ver ?? 0);
    if (tokenVersion !== Number(user.token_version ?? 0)) {
      return res.status(401).json({ error: "This session has been revoked. Please sign in again." });
    }

    const roleRecord = user.role_id
      ? await Role.findByPk(user.role_id)
      : await Role.findOne({ where: { role_name: user.role } });

    const basePermissions = resolvePermissions(roleRecord?.permissions_json, user.role);
    const effective = applyPermissionOverrides(basePermissions, user.permission_overrides_json);

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_name: roleRecord?.role_name || user.role,
      role_id: user.role_id,
      permissions: legacyPermissionFlags(effective),
      effectivePermissions: effective
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
    if (req.user.permissions?.all || allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({
      error: `Access forbidden. Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`
    });
  };
}

/**
 * Require one permission or any permission from an array. Permissions are
 * re-resolved from the database on every request, so role changes take effect
 * without waiting for the JWT to expire.
 */
export function requirePermission(permissionKey) {
  const required = Array.isArray(permissionKey) ? permissionKey : [permissionKey];
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }
    if (req.user.permissions?.all || required.some((key) => hasPermission(req.user.effectivePermissions, key))) {
      return next();
    }
    return res.status(403).json({
      error: `Access forbidden. You lack the required permission (${required.join(" or ")}).`
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
