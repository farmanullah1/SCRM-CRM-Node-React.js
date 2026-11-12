export const SECTION_PERMISSIONS = Object.freeze({
  leads: "leads.view",
  contacts: "contacts.view",
  companies: "companies.view",
  pipeline: "deals.view",
  tasks: "tasks.view",
  activities: "activities.view",
  invoices: "invoices.view",
  catalog: "catalog.view",
  tickets: "tickets.view",
  outbox: "emails.view",
  whatsapp: "whatsapp.view"
});

export function hasPermission(user, permission) {
  if (!permission) return true;
  return Boolean(
    user?.permissions?.all ||
      user?.permissionList?.includes("*") ||
      user?.permissionList?.includes(permission)
  );
}

export function canManageAccess(user) {
  return (
    hasPermission(user, "users.view") ||
    hasPermission(user, "users.edit") ||
    user?.role === "admin"
  );
}

/**
 * A user may type any workspace URL. The API is authoritative, but the shell
 * should not render a module the user has not been granted.
 */
export function isSectionBlocked(section, tab, user) {
  const required = SECTION_PERMISSIONS[section];
  if (required && !hasPermission(user, required)) return true;
  if (section === "settings" && tab === "access" && !canManageAccess(user)) return true;
  return false;
}
