import express from "express";
import { User, Role, ActivityLog, sequelize, Op } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import {
  PERMISSION_GROUPS,
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  ROLE_TEMPLATES,
  resolvePermissions,
  serializePermissions,
  sanitizePermissionList,
  isSubsetOfPermissions,
  normalizeRolePayload
} from "../permissions.js";
import { applyPermissionOverrides, permissionsPayload } from "../services/accessScope.js";

const router = express.Router();
router.use(authenticateToken);

function rolePayload(role) {
  const parsed = normalizeRolePayload(role.permissions_json);
  const effective = serializePermissions(resolvePermissions(role.permissions_json, role.role_name));
  return {
    id: role.id,
    role_name: role.role_name,
    display_name: role.display_name || role.role_name,
    description: role.description || "",
    is_system: Boolean(role.is_system),
    permissions: effective.permissions,
    all: effective.all
  };
}

function effectiveFor(user, rolesById) {
  const role = user.role_id ? rolesById.get(Number(user.role_id)) : null;
  return applyPermissionOverrides(
    resolvePermissions(role?.permissions_json, user.role),
    user.permission_overrides_json
  );
}

function effectivePayload(effective) {
  return serializePermissions(effective);
}

async function rolesById() {
  const roles = await Role.findAll();
  return new Map(roles.map((role) => [Number(role.id), role]));
}

async function countOtherAdministrators(userId) {
  return User.count({
    where: {
      id: { [Op.ne]: userId },
      is_active: true,
      role: ["owner", "admin"]
    }
  });
}

function denyUnlessCanGrant(actor, grantedKeys) {
  if (actor.permissions?.all) return null;
  if (isSubsetOfPermissions(grantedKeys, actor.effectivePermissions)) return null;
  return "You cannot grant or preserve permissions you do not hold.";
}

router.get("/catalog", requirePermission(["users.view", "roles.view"]), (req, res) => {
  res.json({
    groups: PERMISSION_GROUPS,
    permissions: PERMISSION_CATALOG,
    templates: ROLE_TEMPLATES,
    total: PERMISSION_KEYS.length,
    actor: {
      role: req.user.role,
      all: Boolean(req.user.permissions?.all),
      permissions: [...req.user.effectivePermissions.permissions]
    }
  });
});

router.get("/users", requirePermission("users.view"), async (req, res) => {
  try {
    const [users, roles] = await Promise.all([
      User.findAll({
        attributes: [
          "id",
          "name",
          "email",
          "role",
          "role_id",
          "title",
          "department",
          "phone",
          "avatar_url",
          "is_active",
          "two_factor_enabled",
          "two_factor_secret",
          "google_id",
          "last_login_at",
          "createdAt",
          "permission_overrides_json"
        ],
        order: [["createdAt", "ASC"]]
      }),
      rolesById()
    ]);

    const payload = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
      role_name: roles.get(Number(user.role_id))?.role_name || user.role,
      role_display_name: roles.get(Number(user.role_id))?.display_name || user.role,
      title: user.title,
      department: user.department,
      phone: user.phone,
      avatar_url: user.avatar_url,
      is_active: user.is_active !== false,
      two_factor_enabled: Boolean(user.two_factor_enabled),
      two_factor_method: user.two_factor_secret ? "totp" : user.two_factor_enabled ? "email_legacy" : null,
      google_linked: Boolean(user.google_id),
      last_login_at: user.last_login_at,
      createdAt: user.createdAt,
      overrides: normalizeRolePayload(user.permission_overrides_json),
      effective: effectivePayload(effectiveFor(user, roles))
    }));

    res.json({ users: payload });
  } catch (err) {
    console.error("[Access] list users", err.message);
    res.status(500).json({ error: "Could not load users and access." });
  }
});

router.get("/users/:id/effective", requirePermission("users.view"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ["id", "name", "email", "role", "role_id", "permission_overrides_json"]
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    const roles = await rolesById();
    res.json({
      userId: user.id,
      effective: effectivePayload(effectiveFor(user, roles))
    });
  } catch {
    res.status(500).json({ error: "Could not calculate effective permissions." });
  }
});

router.patch("/users/:id", requirePermission("users.edit"), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const target = await User.findByPk(req.params.id, { transaction });
    if (!target) {
      await transaction.rollback();
      return res.status(404).json({ error: "User not found." });
    }
    if (Number(target.id) === Number(req.user.id)) {
      await transaction.rollback();
      return res.status(403).json({ error: "You cannot change your own role, permissions or status." });
    }

    const roles = await rolesById();
    const targetEffective = effectiveFor(target, roles);
    if (!req.user.permissions?.all && targetEffective.all) {
      await transaction.rollback();
      return res.status(403).json({ error: "Only an administrator can change another administrator." });
    }
    if (!req.user.permissions?.all) {
      const denial = denyUnlessCanGrant(req.user, [...targetEffective.permissions]);
      if (denial) {
        await transaction.rollback();
        return res.status(403).json({ error: denial });
      }
    }

    const { role_id, permissions, revoked, is_active } = req.body;
    let nextRole = null;

    if (role_id !== undefined) {
      nextRole = roles.get(Number(role_id));
      if (!nextRole) {
        await transaction.rollback();
        return res.status(400).json({ error: "Choose a valid role." });
      }
      const rolePermissions = resolvePermissions(nextRole.permissions_json, nextRole.role_name);
      const denial = req.user.permissions?.all
        ? null
        : denyUnlessCanGrant(req.user, [...rolePermissions.permissions]);
      if (denial) {
        await transaction.rollback();
        return res.status(403).json({ error: denial });
      }
      target.role_id = nextRole.id;
      target.role = nextRole.role_name;
    }

    if (permissions !== undefined || revoked !== undefined) {
      const grants = sanitizePermissionList(permissions || []);
      const revocations = sanitizePermissionList(revoked || []);
      const denial = denyUnlessCanGrant(req.user, grants);
      if (denial) {
        await transaction.rollback();
        return res.status(403).json({ error: denial });
      }
      target.permission_overrides_json = JSON.stringify({
        permissions: grants,
        revoked: revocations
      });
    }

    if (is_active !== undefined) {
      if (typeof is_active !== "boolean") {
        await transaction.rollback();
        return res.status(400).json({ error: "is_active must be true or false." });
      }
      target.is_active = is_active;
      if (!is_active) {
        const remaining = await countOtherAdministrators(target.id);
        if (targetEffective.all && remaining === 0) {
          await transaction.rollback();
          return res.status(409).json({ error: "The last active administrator cannot be suspended." });
        }
      }
    }

    // Demoting/suspending the final administrator would leave the workspace
    // unmanageable. Check against the role before saving.
    if ((nextRole || targetEffective.all) && target.is_active !== false) {
      const resulting = nextRole
        ? resolvePermissions(nextRole.permissions_json, nextRole.role_name)
        : targetEffective;
      if (targetEffective.all && !resulting.all) {
        const remaining = await countOtherAdministrators(target.id);
        if (remaining === 0) {
          await transaction.rollback();
          return res.status(409).json({ error: "The last active administrator cannot be demoted." });
        }
      }
    }

    // Access changes revoke existing access tokens and refresh tokens.
    target.token_version = Number(target.token_version || 0) + 1;
    target.refresh_token = null;
    await target.save({ transaction });

    await transaction.commit();

    await logAudit(req.user.id, "USER_ACCESS_UPDATED", "User", target.id, {
      role: target.role,
      permissions: permissions || null,
      revoked: revoked || null,
      is_active: target.is_active
    });

    const refreshedRoles = await rolesById();
    res.json({
      message: "Access updated. The user's existing sessions were revoked.",
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        role_id: target.role_id,
        is_active: target.is_active !== false,
        effective: effectivePayload(effectiveFor(target, refreshedRoles))
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error("[Access] update user", err.message);
    res.status(500).json({ error: "Could not update this user's access." });
  }
});

router.post("/users/:id/revoke-sessions", requirePermission("users.edit"), async (req, res) => {
  try {
    const target = await User.findByPk(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });
    if (!req.user.permissions?.all && target.role === "admin") {
      return res.status(403).json({ error: "Only an administrator can revoke an administrator's sessions." });
    }
    target.token_version = Number(target.token_version || 0) + 1;
    target.refresh_token = null;
    await target.save();
    await logAudit(req.user.id, "USER_SESSIONS_REVOKED", "User", target.id, {});
    res.json({ message: "All sessions revoked. The user must sign in again." });
  } catch {
    res.status(500).json({ error: "Could not revoke sessions." });
  }
});

router.get("/roles", requirePermission("roles.view"), async (req, res) => {
  try {
    const roles = await Role.findAll({ order: [["id", "ASC"]] });
    res.json({ roles: roles.map(rolePayload) });
  } catch {
    res.status(500).json({ error: "Could not load roles." });
  }
});

router.post("/roles", requirePermission("roles.create"), async (req, res) => {
  try {
    const { role_name, display_name, description, permissions } = req.body;
    const slug = String(role_name || "").trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!slug || slug.length < 3) {
      return res.status(400).json({ error: "Use a role key of at least three letters." });
    }
    if (ROLE_TEMPLATES[slug]) {
      return res.status(409).json({ error: "That name is reserved by a system template. Choose another key." });
    }
    const granted = sanitizePermissionList(permissions);
    const denial = denyUnlessCanGrant(req.user, granted);
    if (denial) return res.status(403).json({ error: denial });

    const existing = await Role.findOne({ where: { role_name: slug } });
    if (existing) return res.status(409).json({ error: "A role with that key already exists." });

    const role = await Role.create({
      role_name: slug,
      display_name: String(display_name || slug).trim().slice(0, 100),
      description: String(description || "").trim().slice(0, 500),
      is_system: false,
      permissions_json: JSON.stringify({ permissions: granted })
    });
    await logAudit(req.user.id, "ROLE_CREATED", "Role", role.id, { role_name: slug, permissions: granted });
    res.status(201).json({ message: "Custom role created.", role: rolePayload(role) });
  } catch {
    res.status(500).json({ error: "Could not create the role." });
  }
});

router.put("/roles/:id", requirePermission("roles.edit"), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found." });
    if (role.is_system) {
      return res.status(409).json({ error: "System roles are read-only. Clone this role to customise it." });
    }
    const granted = sanitizePermissionList(req.body.permissions);
    const denial = denyUnlessCanGrant(req.user, granted);
    if (denial) return res.status(403).json({ error: denial });

    role.display_name = String(req.body.display_name || role.display_name || role.role_name).trim().slice(0, 100);
    role.description = String(req.body.description || "").trim().slice(0, 500);
    role.permissions_json = JSON.stringify({ permissions: granted });
    await role.save();
    await logAudit(req.user.id, "ROLE_UPDATED", "Role", role.id, { role_name: role.role_name, permissions: granted });
    res.json({ message: "Role updated. Reassign users to apply the change.", role: rolePayload(role) });
  } catch {
    res.status(500).json({ error: "Could not update the role." });
  }
});

router.post("/roles/:id/clone", requirePermission("roles.create"), async (req, res) => {
  try {
    const source = await Role.findByPk(req.params.id);
    if (!source) return res.status(404).json({ error: "Role not found." });
    const parsed = normalizeRolePayload(source.permissions_json);
    if (!req.user.permissions?.all && parsed.all === true) {
      return res.status(403).json({ error: "Only an administrator can clone a full-access role." });
    }
    const base = String(req.body.role_name || `${source.role_name}_copy`).trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!base || ROLE_TEMPLATES[base] || (await Role.findOne({ where: { role_name: base } }))) {
      return res.status(409).json({ error: "Choose a unique, non-reserved role key." });
    }
    const role = await Role.create({
      role_name: base,
      display_name: String(req.body.display_name || `${source.display_name || source.role_name} copy`).slice(0, 100),
      description: source.description || "",
      is_system: false,
      permissions_json: JSON.stringify({ permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [] })
    });
    await logAudit(req.user.id, "ROLE_CLONED", "Role", role.id, { source: source.role_name, role_name: base });
    res.status(201).json({ message: "Role cloned. Edit the copy to customise access.", role: rolePayload(role) });
  } catch {
    res.status(500).json({ error: "Could not clone the role." });
  }
});

router.delete("/roles/:id", requirePermission("roles.delete"), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);
    if (!role) return res.status(404).json({ error: "Role not found." });
    if (role.is_system) return res.status(409).json({ error: "System roles cannot be deleted." });
    const assigned = await User.count({ where: { role_id: role.id } });
    if (assigned > 0) {
      return res.status(409).json({ error: `This role is assigned to ${assigned} user(s). Reassign them first.` });
    }
    await role.destroy();
    await logAudit(req.user.id, "ROLE_DELETED", "Role", req.params.id, { role_name: role.role_name });
    res.json({ message: "Role deleted." });
  } catch {
    res.status(500).json({ error: "Could not delete the role." });
  }
});

router.get("/audit", requirePermission("audit.view"), async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const { count, rows } = await ActivityLog.findAndCountAll({
      order: [["timestamp", "DESC"]],
      limit,
      offset: (page - 1) * limit
    });
    res.json({ total: count, page, totalPages: Math.ceil(count / limit), events: rows });
  } catch {
    res.status(500).json({ error: "Could not load the audit log." });
  }
});

export default router;
