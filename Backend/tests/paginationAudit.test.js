import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { sequelize, User, Role, ActivityLog } from "../src/db.js";

const BASE = process.env.API_BASE || "http://localhost:5000";
const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const PREFIX = `QA Paging ${STAMP}`;
const ACTION = `QA_PAGINATION_${STAMP.replace(/[^a-zA-Z0-9_]/g, "_")}`;
const PASSWORD = "Pagination!Pass2026";

const created = { users: [], contacts: [], companies: [] };
let adminId;
let adminEmail;
let adminToken;
let standardToken;

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  return { status: response.status, data, headers: response.headers };
}

async function login(email) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { email, password: PASSWORD }
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return response.data.token;
}

before(async () => {
  await sequelize.authenticate();
  const [adminRole, standardRole] = await Promise.all([
    Role.findOne({ where: { role_name: "admin" } }),
    Role.findOne({ where: { role_name: "standard_user" } })
  ]);
  assert.ok(adminRole, "admin role must exist");
  assert.ok(standardRole, "standard_user role must exist");

  const password = await bcrypt.hash(PASSWORD, 4);
  const admin = await User.create({
    name: `QA Paging Admin ${STAMP}`,
    email: `qa-pagination-admin-${STAMP}@example.com`,
    password,
    role: "admin",
    role_id: adminRole.id,
    is_active: true
  });
  const standard = await User.create({
    name: `QA Paging Standard ${STAMP}`,
    email: `qa-pagination-standard-${STAMP}@example.com`,
    password,
    role: "standard_user",
    role_id: standardRole.id,
    is_active: true
  });
  created.users.push(admin.id, standard.id);
  adminId = admin.id;
  adminEmail = admin.email;
  adminToken = await login(admin.email);
  standardToken = await login(standard.email);

  for (let index = 1; index <= 3; index += 1) {
    const contact = await request("/api/contacts", {
      method: "POST",
      token: adminToken,
      body: {
        name: `${PREFIX} Contact ${index}`,
        email: `qa-pagination-contact-${index}-${STAMP}@example.com`,
        phone: `+1555000${index}`
      }
    });
    assert.equal(contact.status, 201, JSON.stringify(contact.data));
    created.contacts.push(contact.data.id);

    const company = await request("/api/companies", {
      method: "POST",
      token: adminToken,
      body: { name: `${PREFIX} Company ${index}`, domain: `qa-pagination-${index}-${STAMP}.example.com` }
    });
    assert.equal(company.status, 201, JSON.stringify(company.data));
    created.companies.push(company.data.company.id);

    const activity = await request("/api/activities", {
      method: "POST",
      token: adminToken,
      body: { type: ACTION, title: `${PREFIX} Activity ${index}`, description: "Pagination fixture" }
    });
    assert.equal(activity.status, 201, JSON.stringify(activity.data));
  }
});

async function waitForAuditExport() {
  if (!adminId) return;
  // The export route records its audit event after sending the CSV. Wait for
  // that write so cleanup cannot race it, instead of sleeping a fixed delay.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const event = await ActivityLog.findOne({
      where: { user_id: adminId, action: "AUDIT_EXPORTED" }
    });
    if (event) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

after(async () => {
  await waitForAuditExport();
  try {
    if (created.contacts.length) {
      await sequelize.query("DELETE FROM contacts WHERE id IN (?)", {
        replacements: [created.contacts]
      });
    }
    if (created.companies.length) {
      await sequelize.query("DELETE FROM companies WHERE id IN (?)", {
        replacements: [created.companies]
      });
    }
    if (created.users.length) {
      await sequelize.query("DELETE FROM activity_logs WHERE user_id IN (?) OR action = ?", {
        replacements: [created.users, ACTION]
      });
      await sequelize.query("DELETE FROM notifications WHERE userId IN (?)", {
        replacements: [created.users]
      });
      await sequelize.query("DELETE FROM users WHERE id IN (?)", {
        replacements: [created.users]
      });
    }
    await sequelize.query("DELETE FROM activity_logs WHERE target_type = 'Contact' AND target_id IN (?)", {
      replacements: [created.contacts.length ? created.contacts : [-1]]
    });
    await sequelize.query("DELETE FROM activity_logs WHERE target_type = 'Company' AND target_id IN (?)", {
      replacements: [created.companies.length ? created.companies : [-1]]
    });
  } finally {
    await sequelize.close();
  }
});

test("contacts pagination returns page metadata and bounded rows", async () => {
  const first = await request(`/api/contacts?search=${encodeURIComponent(PREFIX)}&page=1&limit=2`, {
    token: adminToken
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.totalCount, 3);
  assert.equal(first.data.page, 1);
  assert.equal(first.data.pageSize, 2);
  assert.equal(first.data.totalPages, 2);
  assert.equal(first.data.contacts.length, 2);

  const second = await request(`/api/contacts?search=${encodeURIComponent(PREFIX)}&page=2&limit=2`, {
    token: adminToken
  });
  assert.equal(second.status, 200);
  assert.equal(second.data.page, 2);
  assert.equal(second.data.contacts.length, 1);
  const firstIds = new Set(first.data.contacts.map((row) => row.id));
  assert.ok(second.data.contacts.every((row) => !firstIds.has(row.id)), "pages must not overlap");
});

test("companies pagination returns page metadata and bounded rows", async () => {
  const first = await request(`/api/companies?search=${encodeURIComponent(PREFIX)}&page=1&limit=2`, {
    token: adminToken
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.totalCount, 3);
  assert.equal(first.data.page, 1);
  assert.equal(first.data.pageSize, 2);
  assert.equal(first.data.totalPages, 2);
  assert.equal(first.data.companies.length, 2);

  const second = await request(`/api/companies?search=${encodeURIComponent(PREFIX)}&page=2&limit=2`, {
    token: adminToken
  });
  assert.equal(second.status, 200);
  assert.equal(second.data.page, 2);
  assert.equal(second.data.companies.length, 1);
});

test("activities pagination returns page metadata and bounded rows", async () => {
  const first = await request(`/api/activities?action=${encodeURIComponent(ACTION)}&page=1&limit=2`, {
    token: adminToken
  });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  assert.equal(first.data.totalCount, 3);
  assert.equal(first.data.page, 1);
  assert.equal(first.data.pageSize, 2);
  assert.equal(first.data.totalPages, 2);
  assert.equal(first.data.activities.length, 2);

  const second = await request(`/api/activities?action=${encodeURIComponent(ACTION)}&page=2&limit=2`, {
    token: adminToken
  });
  assert.equal(second.status, 200);
  assert.equal(second.data.page, 2);
  assert.equal(second.data.activities.length, 1);
});

test("admin can export audit CSV", async () => {
  const response = await request("/api/access/audit/export", { token: adminToken });
  assert.equal(response.status, 200, JSON.stringify(response.data).slice(0, 300));
  assert.match(response.headers.get("content-type") || "", /text\/csv/);
  assert.match(response.headers.get("content-disposition") || "", /attachment; filename="scrm-audit-/);
  const csv = String(response.data);
  assert.match(csv, /"Timestamp","Event ID","Actor","Actor email","Action"/);
  assert.ok(csv.includes(adminEmail), "CSV must contain real audit actors");
  assert.ok(csv.split("\r\n").length >= 2, "CSV must include header and audit rows");
});

test("standard user is denied audit CSV export", async () => {
  const response = await request("/api/access/audit/export", { token: standardToken });
  assert.equal(response.status, 403);
  assert.match(JSON.stringify(response.data), /permission|access/i);
  assert.equal(response.headers.get("content-type")?.includes("text/csv"), false);
});
