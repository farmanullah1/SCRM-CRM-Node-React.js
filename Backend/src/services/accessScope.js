import { hasPermission, resolvePermissions, normalizeRolePayload } from "../permissions.js";

/**
 * Data-scope helpers. They are deliberately centralised so routes use one
 * interpretation of "own", "team" and "all" records.
 */
export function canViewAll(user) {
  return Boolean(user?.permissions?.all || hasPermission(user?.permissions, "records.view_all"));
}

export function canEditAll(user) {
  return Boolean(user?.permissions?.all || hasPermission(user?.permissions, "records.edit_all"));
}

export function canDeleteAll(user) {
  return Boolean(user?.permissions?.all || hasPermission(user?.permissions, "records.delete_all"));
}

export function isOwnedBy(user, record, ownerField = "owner_id") {
  if (!user || !record) return false;
  return Number(record[ownerField]) === Number(user.id) || Number(record.userId) === Number(user.id);
}

export function canViewRecord(user, record, ownerField = "owner_id") {
  if (!record) return false;
  if (canViewAll(user)) return true;
  return isOwnedBy(user, record, ownerField);
}

export function canEditRecord(user, record, ownerField = "owner_id") {
  if (!record) return false;
  if (canEditAll(user)) return true;
  return isOwnedBy(user, record, ownerField);
}

export function canDeleteRecord(user, record, ownerField = "owner_id") {
  if (!record) return false;
  if (canDeleteAll(user)) return true;
  return isOwnedBy(user, record, ownerField);
}

export function ownerScope(user, ownerField = "owner_id") {
  if (canViewAll(user)) return {};
  return { [ownerField]: user.id };
}

/**
 * Effective permissions are role permissions plus per-user grants/revocations.
 * Revocations are stored as `{ "revoked": ["leads.delete"] }`; grants as a
 * `permissions` array. Only an administrator can write these overrides.
 */
export function applyPermissionOverrides(base, overrideValue) {
  if (!overrideValue) return base;
  const parsed = normalizeRolePayload(overrideValue);
  const permissions = new Set(base.all ? [] : base.permissions);
  if (Array.isArray(parsed.permissions)) parsed.permissions.forEach((key) => permissions.add(key));
  if (Array.isArray(parsed.revoked)) parsed.revoked.forEach((key) => permissions.delete(key));
  return { all: Boolean(base.all), permissions };
}

export function permissionsPayload(user) {
  const effective = resolvePermissions(user.role_permissions, user.role);
  const withOverrides = applyPermissionOverrides(effective, user.permission_overrides_json);
  return withOverrides;
}
