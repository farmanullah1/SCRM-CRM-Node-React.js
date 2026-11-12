/**
 * Canonical SCRM permission catalogue.
 *
 * Permissions are `<resource>.<action>` strings. Role records store an object
 * shaped like `{ "all": true }` or `{ "permissions": ["leads.view", ...] }`.
 * Legacy boolean flags are mapped below so existing role rows keep working.
 */

export const PERMISSION_GROUPS = [
  {
    key: "crm",
    label: "CRM records",
    resources: [
      ["leads", "Leads"],
      ["contacts", "Contacts"],
      ["companies", "Companies"],
      ["deals", "Deals"],
      ["tasks", "Tasks"],
      ["activities", "Activities"]
    ],
    actions: ["view", "create", "edit", "delete", "export", "assign"]
  },
  {
    key: "commerce",
    label: "Sales and billing",
    resources: [
      ["invoices", "Invoices and quotes"],
      ["catalog", "Catalog"],
      ["payments", "Payments and credits"]
    ],
    actions: ["view", "create", "edit", "delete", "send", "export"]
  },
  {
    key: "communication",
    label: "Communication",
    resources: [
      ["emails", "Email"],
      ["whatsapp", "WhatsApp"],
      ["tickets", "Tickets"],
      ["attachments", "Attachments"],
      ["media", "Media library"]
    ],
    actions: ["view", "create", "edit", "delete", "send", "manage"]
  },
  {
    key: "insights",
    label: "Insights",
    resources: [
      ["reports", "Reports"],
      ["forecasts", "Forecasts"],
      ["saved_views", "Saved views"]
    ],
    actions: ["view", "create", "edit", "delete", "export"]
  },
  {
    key: "platform",
    label: "Platform administration",
    resources: [
      ["automations", "Automations"],
      ["integrations", "Integrations"],
      ["api_keys", "API keys"],
      ["users", "Users and access"],
      ["roles", "Roles"],
      ["settings", "Settings"],
      ["security", "Security"],
      ["audit", "Audit log"],
      ["backup", "Backup"]
    ],
    actions: ["view", "create", "edit", "delete", "manage", "export"]
  },
  {
    key: "scope",
    label: "Data scope",
    resources: [["records", "Record scope"]],
    actions: ["view_all", "edit_all", "delete_all", "view_team"]
  }
];

export const PERMISSION_CATALOG = PERMISSION_GROUPS.flatMap((group) =>
  group.resources.flatMap(([resource, label]) =>
    group.actions.map((action) => ({
      key: `${resource}.${action}`,
      resource,
      action,
      label: `${label}: ${action.replace(/_/g, " ")}`,
      group: group.key,
      groupLabel: group.label,
      resourceLabel: label
    }))
  )
);

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((item) => item.key);

const ALL_ACTIONS = ["view", "create", "edit", "delete", "export", "send", "assign", "manage"];

function forResources(resources, actions) {
  return resources.flatMap((resource) => actions.map((action) => `${resource}.${action}`));
}

const CRM = ["leads", "contacts", "companies", "deals", "tasks", "activities"];
const COMMERCE = ["invoices", "catalog", "payments"];
const COMMUNICATION = ["emails", "whatsapp", "tickets", "attachments", "media"];

/**
 * Seed templates. `all` means the role is organisation-owner equivalent.
 * System roles can be cloned but not deleted.
 */
export const ROLE_TEMPLATES = {
  owner: {
    display_name: "Organization Owner",
    description: "Full organisation control, including users, billing and security.",
    permissions: { all: true }
  },
  admin: {
    display_name: "Administrator",
    description: "Organisation administration and operational access, without ownership transfer.",
    permissions: { all: true }
  },
  manager: {
    display_name: "Sales Manager",
    description: "Organization-wide pipeline visibility plus team task and record management.",
    permissions: {
      permissions: [
        ...forResources(CRM, ["view", "create", "edit", "assign", "export"]),
        ...forResources(COMMERCE, ["view", "create", "edit", "send", "export"]),
        ...forResources(COMMUNICATION, ["view", "create", "edit", "send"]),
        "reports.view", "reports.export", "forecasts.view",
        "saved_views.view", "saved_views.create", "saved_views.edit",
        "records.view_all", "records.edit_all", "records.view_team",
        "audit.view", "automations.view"
      ]
    }
  },
  moderator: {
    display_name: "Moderator",
    description: "Limited operational review and access administration assigned by an administrator.",
    permissions: {
      permissions: [
        "users.view", "users.edit", "roles.view",
        "audit.view", "reports.view", "saved_views.view", "saved_views.create",
        ...forResources(CRM, ["view", "edit"]),
        ...forResources(COMMUNICATION, ["view", "edit"])
      ]
    }
  },
  standard_user: {
    display_name: "Sales Representative",
    description: "Own assigned leads, contacts, companies, deals, tasks and activities.",
    permissions: {
      permissions: [
        "leads.view", "leads.create", "leads.edit", "leads.assign",
        "contacts.view", "contacts.create", "contacts.edit",
        "companies.view", "companies.create", "companies.edit",
        "deals.view", "deals.create", "deals.edit",
        "tasks.view", "tasks.create", "tasks.edit",
        "activities.view", "activities.create", "activities.edit",
        "invoices.view", "invoices.create", "invoices.edit", "invoices.send",
        "catalog.view", "catalog.create", "catalog.edit",
        "tickets.view", "tickets.create", "tickets.edit",
        "attachments.view", "attachments.create", "attachments.delete",
        "emails.view", "emails.create", "emails.send",
        "whatsapp.view", "whatsapp.send",
        "reports.view", "forecasts.view", "saved_views.view", "saved_views.create"
      ]
    }
  },
  finance: {
    display_name: "Finance / Billing",
    description: "Quotes, invoices, payments and financial reporting without pipeline administration.",
    permissions: {
      permissions: [
        ...forResources(["invoices", "catalog", "payments"], ["view", "create", "edit", "send", "export"]),
        "contacts.view", "companies.view", "deals.view", "tickets.view",
        "reports.view", "reports.export", "forecasts.view",
        "records.view_all", "attachments.view", "attachments.create"
      ]
    }
  },
  support: {
    display_name: "Support Agent",
    description: "Assigned tickets and customer context, without sales or billing changes.",
    permissions: {
      permissions: [
        "tickets.view", "tickets.create", "tickets.edit",
        "contacts.view", "companies.view", "deals.view", "invoices.view",
        "activities.view", "activities.create", "tasks.view", "tasks.create", "tasks.edit",
        "emails.view", "emails.send", "attachments.view", "attachments.create",
        "whatsapp.view", "whatsapp.send",
        "saved_views.view"
      ]
    }
  },
  read_only: {
    display_name: "Read-only",
    description: "View-only access to operational records with no exports or changes.",
    permissions: {
      permissions: [
        ...forResources(CRM, ["view"]),
        ...forResources(COMMERCE, ["view"]),
        ...forResources(COMMUNICATION, ["view"]),
        "reports.view", "forecasts.view", "saved_views.view"
      ]
    }
  }
};

const LEGACY_FLAG_MAP = {
  manage_users: ["users.view", "users.create", "users.edit", "users.delete", "roles.view"],
  manage_roles: ["roles.view", "roles.create", "roles.edit", "roles.delete"],
  export_data: PERMISSION_KEYS.filter((key) => key.endsWith(".export")),
  backup_db: ["backup.view", "backup.manage"],
  view_all: ["records.view_all"],
  edit_all: ["records.edit_all"],
  delete_all: ["records.delete_all"],
  view_assigned: ["leads.view", "contacts.view", "companies.view", "deals.view", "tasks.view", "activities.view"],
  edit_assigned: ["leads.edit", "contacts.edit", "companies.edit", "deals.edit", "tasks.edit", "activities.edit"]
};

export function normalizeRolePayload(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

/**
 * Convert stored role JSON (new or legacy) to an effective permission set.
 * `all` is returned as a boolean, not expanded, so API checks stay cheap.
 */
export function resolvePermissions(roleValue, legacyRoleName) {
  const parsed = normalizeRolePayload(roleValue);
  if (parsed.all === true) return { all: true, permissions: new Set(PERMISSION_KEYS) };

  const permissions = new Set();
  const hasExplicitPermissionList = Array.isArray(parsed.permissions);

  if (hasExplicitPermissionList) {
    parsed.permissions.forEach((key) => {
      if (PERMISSION_KEYS.includes(key)) permissions.add(key);
    });
  }

  // Existing system roles predate the rich catalogue. Give them their intended
  // default capabilities while preserving any legacy flags already stored.
  if (!hasExplicitPermissionList && ROLE_TEMPLATES[legacyRoleName]?.permissions?.permissions) {
    ROLE_TEMPLATES[legacyRoleName].permissions.permissions.forEach((key) => {
      if (PERMISSION_KEYS.includes(key)) permissions.add(key);
    });
  }

  Object.entries(parsed).forEach(([flag, enabled]) => {
    if (enabled === true && LEGACY_FLAG_MAP[flag]) {
      LEGACY_FLAG_MAP[flag].forEach((key) => permissions.add(key));
    }
  });

  // A role named "admin" without a role record must never silently become powerless.
  if (legacyRoleName === "admin" && parsed.all !== false) {
    return { all: true, permissions: new Set(PERMISSION_KEYS) };
  }

  return { all: false, permissions };
}

export function serializePermissions(effective) {
  return effective.all
    ? { all: true, permissions: [...PERMISSION_KEYS] }
    : { all: false, permissions: [...effective.permissions] };
}

export function hasPermission(effective, key) {
  if (!effective?.permissions) return false;
  return effective.all === true || effective.permissions.has(key);
}

export function isSubsetOfPermissions(granted, actor) {
  if (actor?.all) return true;
  if (!Array.isArray(granted)) return false;
  return granted.every((key) => PERMISSION_KEYS.includes(key) && actor?.permissions?.has(key));
}

export function sanitizePermissionList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((key) => typeof key === "string" && PERMISSION_KEYS.includes(key)))];
}

export function templatePermissions(templateKey) {
  const template = ROLE_TEMPLATES[templateKey];
  return template ? resolvePermissions(template.permissions, templateKey) : null;
}
