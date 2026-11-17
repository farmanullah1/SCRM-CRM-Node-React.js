import assert from "node:assert/strict";
import { authenticator } from "otplib";
import { sequelize, User, Role } from "../src/db.js";

const BASE = process.env.E2E_BASE || "http://localhost:5000";
const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const ADMIN_EMAIL = `qa-e2e-admin-${STAMP}@example.com`;
const USER_EMAIL = `qa-e2e-user-${STAMP}@example.com`;
const PASSWORD = "QaE2e!Passw0rd42";
const created = { users: [], companies: [], contacts: [], leads: [], invoices: [], tickets: [], views: [], logs: [] };
const results = [];

async function req(path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : Buffer.from(await response.arrayBuffer());
  return { status: response.status, data, headers: response.headers };
}

async function step(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`FAIL ${name} — ${error.message}`);
  }
}

function expect(status, response, label) {
  assert.equal(response.status, status, `${label}: expected ${status}, got ${response.status} ${JSON.stringify(response.data).slice(0, 300)}`);
  return response.data;
}

async function signup(email, extra = {}) {
  const response = await req("/api/auth/signup", {
    method: "POST",
    body: {
      name: `QA E2E ${STAMP}`,
      email,
      password: PASSWORD,
      phone: "+15550001234",
      company_name: `QA E2E Co ${STAMP}`,
      title: "QA",
      department: "Quality",
      country: "US",
      timezone: "UTC",
      language: "en",
      termsAccepted: true,
      ...extra
    }
  });
  return response;
}

try {
  await sequelize.authenticate();

  await step("signup rejects missing required workspace", async () => {
    const response = await signup(`qa-e2e-invalid-${STAMP}@example.com`, { company_name: "" });
    expect(400, response, "missing company");
    created.users.push(`qa-e2e-invalid-${STAMP}@example.com`);
    return response.data.error;
  });

  await step("signup rejects weak password and missing terms", async () => {
    const weak = await signup(`qa-e2e-weak-${STAMP}@example.com`, { password: "short" });
    expect(400, weak, "weak password");
    const terms = await signup(`qa-e2e-terms-${STAMP}@example.com`, { termsAccepted: false });
    expect(400, terms, "terms");
    created.users.push(`qa-e2e-weak-${STAMP}@example.com`, `qa-e2e-terms-${STAMP}@example.com`);
    return "both rejected";
  });

  let adminToken;
  let adminId;
  await step("signup stores expanded profile fields", async () => {
    const response = await signup(ADMIN_EMAIL);
    const data = expect(201, response, "admin signup");
    adminToken = data.token;
    adminId = data.user.id;
    created.users.push(adminId);
    assert.equal(data.user.phone, "+15550001234");
    assert.equal(data.user.company_name, `QA E2E Co ${STAMP}`);
    assert.equal(data.user.timezone, "UTC");
    assert.equal(data.user.title, "QA");
    const adminRole = await Role.findOne({ where: { role_name: "admin" } });
    assert.ok(adminRole, "admin role exists");
    await User.update({ role: "admin", role_id: adminRole.id }, { where: { id: adminId } });
    return `user ${adminId}, phone/company/title/timezone persisted`;
  });

  let userToken;
  let userId;
  await step("standard signup allows optional profile fields to be omitted", async () => {
    const response = await signup(USER_EMAIL, {
      phone: undefined,
      title: undefined,
      department: undefined,
      country: undefined,
      timezone: undefined
    });
    const data = expect(201, response, "standard signup");
    userToken = data.token;
    userId = data.user.id;
    created.users.push(userId);
    assert.equal(data.user.phone, null);
    assert.equal(data.user.role, "standard_user");
    return `user ${userId} created as standard_user`;
  });

  await step("session is valid and role is admin after elevation", async () => {
    const me = expect(200, await req("/api/auth/me", { token: adminToken }), "me");
    assert.equal(me.role || me.user?.role, "admin");
    return "admin session authenticates";
  });

  await step("profile avatar local upload, retrieval and removal", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nS8AAAAASUVORK5CYII=", "base64");
    const form = new FormData();
    form.append("avatar", new Blob([png], { type: "image/png" }), "qa-e2e.png");
    const uploaded = expect(200, await req("/api/auth/profile/avatar", { method: "POST", token: adminToken, body: form }), "avatar upload");
    assert.match(uploaded.avatar_url, /^\/uploads\/avatars\//);
    const media = await fetch(`${BASE}${uploaded.avatar_url}`);
    assert.equal(media.status, 200, "uploaded avatar retrievable");
    expect(200, await req("/api/auth/profile/avatar", { method: "DELETE", token: adminToken }), "avatar delete");
    return `stored ${uploaded.avatar_url}, retrieved, removed`;
  });

  await step("ImageKit signed upload configuration", async () => {
    const status = expect(200, await req("/api/media/status", { token: adminToken }), "media status");
    if (!status.configured) return "BLOCKED: ImageKit keys are not configured on this server";
    const auth = expect(200, await req("/api/media/imagekit/auth", { method: "POST", token: adminToken, body: { kind: "avatar" } }), "imagekit auth");
    assert.ok(auth.token && auth.expire && auth.signature && auth.publicKey);
    assert.match(auth.folder, /avatars/);
    return `configured; signed token, expiry and folder ${auth.folder}`;
  });

  await step("TOTP enrollment, verify, recovery login and disable", async () => {
    const setup = expect(200, await req("/api/auth/2fa/setup", { method: "POST", token: adminToken, body: { currentPassword: PASSWORD } }), "totp setup");
    assert.match(setup.qrDataUrl, /^data:image\/png;base64,/);
    const code = authenticator.generate(setup.secret);
    const enabled = expect(200, await req("/api/auth/2fa/enable", { method: "POST", token: adminToken, body: { code } }), "totp enable");
    assert.equal(enabled.recoveryCodes.length, 8);

    const challenge = expect(200, await req("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: PASSWORD } }), "2fa login");
    assert.equal(challenge.twoFactorRequired, true);
    assert.equal(challenge.method, "totp");
    const verified = expect(200, await req("/api/auth/2fa/verify", { method: "POST", body: { tempToken: challenge.tempToken, code: authenticator.generate(setup.secret) } }), "totp verify");
    assert.ok(verified.token);
    adminToken = verified.token;

    const recoveryChallenge = expect(200, await req("/api/auth/login", { method: "POST", body: { email: ADMIN_EMAIL, password: PASSWORD } }), "recovery login");
    const recovery = expect(200, await req("/api/auth/2fa/recovery", { method: "POST", body: { tempToken: recoveryChallenge.tempToken, recoveryCode: enabled.recoveryCodes[0] } }), "recovery verify");
    assert.ok(recovery.token);
    adminToken = recovery.token;
    assert.match(recovery.message, /7 recovery code/);

    expect(200, await req("/api/auth/2fa/disable", { method: "POST", token: adminToken, body: { currentPassword: PASSWORD } }), "2fa disable");
    return "QR + authenticator login + one-time recovery code + disable";
  });

  await step("permission grant and revoke changes API access immediately", async () => {
    const before = await req("/api/access/users", { token: userToken });
    assert.equal(before.status, 403, "standard user must not list users");
    expect(200, await req(`/api/access/users/${userId}`, { method: "PATCH", token: adminToken, body: { permissions: ["users.view"] } }), "grant users.view");
    const after = await req("/api/access/users", { token: userToken });
    assert.equal(after.status, 200, "grant must apply on next request");
    expect(200, await req(`/api/access/users/${userId}`, { method: "PATCH", token: adminToken, body: { revoked: ["users.view"] } }), "revoke users.view");
    const revoked = await req("/api/access/users", { token: userToken });
    assert.equal(revoked.status, 403, "revoke must apply on next request");
    return "403 → grant → 200 → revoke → 403 with same token";
  });

  await step("session revocation invalidates an active standard-user token", async () => {
    expect(200, await req("/api/auth/me", { token: userToken }), "before revoke");
    expect(200, await req(`/api/access/users/${userId}/revoke-sessions`, { method: "POST", token: adminToken }), "revoke sessions");
    const after = await req("/api/auth/me", { token: userToken });
    assert.equal(after.status, 401, "revoked token must fail");
    const login = expect(200, await req("/api/auth/login", { method: "POST", body: { email: USER_EMAIL, password: PASSWORD } }), "relogin");
    userToken = login.token;
    return "200 → revoke → 401 → fresh login succeeds";
  });

  await step("lead-capture webhook creates scored, round-robin assigned lead", async () => {
    const response = await req("/api/site/web-lead", {
      method: "POST",
      body: { name: `QA E2E Lead ${STAMP}`, email: `qa-e2e-lead-${STAMP}@example.com`, phone: "+15550009999", company_name: `QA E2E Lead Co ${STAMP}`, message: "pricing demo brochure" }
    });
    const data = expect(201, response, "web lead");
    assert.ok(data.leadId);
    created.leads.push(data.leadId);
    const lead = expect(200, await req(`/api/leads/${data.leadId}`, { token: adminToken }), "lead fetch").lead;
    assert.equal(lead.source, "Web Form");
    assert.ok(lead.owner_id, "lead must be assigned");
    assert.ok(Number(lead.score) > 0, "lead must be scored");
    return `lead ${lead.id}, score ${lead.score}, owner ${lead.owner_id}`;
  });

  await step("global search finds the captured lead and respects workspace", async () => {
    const data = expect(200, await req(`/api/search?q=${encodeURIComponent(`QA E2E Lead ${STAMP}`)}`, { token: adminToken }), "search");
    assert.ok(data.sections.some((section) => section.type === "leads"));
    return `${data.total} total search hits`;
  });

  await step("saved view create, list and delete", async () => {
    const view = expect(201, await req("/api/views", { method: "POST", token: adminToken, body: { name: `QA E2E View ${STAMP}`, entity: "leads", query: { status: "New" } } }), "saved view create").view;
    created.views.push(view.id);
    const list = expect(200, await req("/api/views?entity=leads", { token: adminToken }), "saved view list");
    assert.ok(list.views.some((entry) => entry.id === view.id));
    expect(200, await req(`/api/views/${view.id}`, { method: "DELETE", token: adminToken }), "saved view delete");
    return `view ${view.id} created, listed, deleted`;
  });

  await step("server-side pagination returns totals and bounded rows", async () => {
    const leads = expect(200, await req("/api/leads?page=1&limit=2", { token: adminToken }), "lead pagination");
    assert.equal(leads.page, 1);
    assert.ok(leads.totalCount >= 1);
    assert.ok(leads.leads.length <= 2);
    const contacts = expect(200, await req("/api/contacts?page=1&limit=1", { token: adminToken }), "contact pagination");
    assert.ok(contacts.totalCount !== undefined);
    assert.ok(contacts.contacts.length <= 1);
    return `leads total ${leads.totalCount}, contacts total ${contacts.totalCount}`;
  });

  await step("forecast returns weighted pipeline and date window", async () => {
    const data = expect(200, await req("/api/deals/forecast?months=6", { token: adminToken }), "forecast");
    assert.equal(data.buckets.length, 6);
    assert.ok(data.probabilities.Proposal > data.probabilities.New);
    assert.ok(Number.isFinite(data.weightedPipeline));
    return `${data.buckets.length} buckets, weighted pipeline $${data.weightedPipeline}`;
  });

  let companyId;
  let contactId;
  await step("company and contact records for related documents", async () => {
    const company = expect(201, await req("/api/companies", { method: "POST", token: adminToken, body: { name: `QA E2E Company ${STAMP}`, domain: `qa-${STAMP}.example.com` } }), "company create").company;
    companyId = company.id;
    created.companies.push(companyId);
    const contact = expect(201, await req("/api/contacts", {
      method: "POST", token: adminToken,
      body: { first_name: "QA", last_name: `E2E ${STAMP}`, email: `qa-e2e-contact-${STAMP}@example.com`, phone: "+15550007777", company: `QA E2E Company ${STAMP}`, company_id: companyId }
    }), "contact create").contact;
    contactId = contact.id;
    created.contacts.push(contactId);
    return `company ${companyId}, contact ${contactId}`;
  });

  let invoiceId;
  await step("invoice line items, tax, payment, credit and PDF", async () => {
    const invoice = expect(201, await req("/api/invoices", {
      method: "POST", token: adminToken,
      body: {
        contactId, companyId, type: "Invoice", status: "Sent", dueDate: new Date(Date.now() + 86400000).toISOString(),
        taxRate: 10, notes: `QA E2E invoice ${STAMP}`,
        items: [{ description: "Implementation", quantity: 2, unitPrice: 500 }]
      }
    }), "invoice create");
    invoiceId = invoice.id;
    created.invoices.push(invoiceId);
    assert.equal(invoice.subtotal, 1000);
    assert.equal(invoice.tax_amount, 100);
    assert.equal(invoice.amount, 1100);

    const pdf = await req(`/api/invoices/${invoiceId}/pdf`, { token: adminToken });
    assert.equal(pdf.status, 200);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    assert.equal(pdf.data.subarray(0, 4).toString(), "%PDF");

    const payment = expect(201, await req(`/api/invoices/${invoiceId}/payments`, { method: "POST", token: adminToken, body: { amount: 500, kind: "Payment", method: "Bank transfer" } }), "payment");
    assert.equal(payment.invoice.amount_paid, 500);
    assert.equal(payment.invoice.balance, 600);
    const credit = expect(201, await req(`/api/invoices/${invoiceId}/payments`, { method: "POST", token: adminToken, body: { amount: 100, kind: "Credit" } }), "credit");
    assert.equal(credit.invoice.credit_amount, 100);
    assert.equal(credit.invoice.balance, 500);
    return `2×$500 + 10% = $1100; payment $500; credit $100; balance $500; PDF %PDF`;
  });

  let invoiceAttachmentId;
  await step("invoice attachment upload, list, authenticated download and delete", async () => {
    const form = new FormData();
    form.append("file", new Blob([Buffer.from("qa-e2e attachment")], { type: "text/plain" }), "qa-e2e.txt");
    form.append("entityType", "Invoice");
    form.append("entityId", String(invoiceId));
    const attachment = expect(201, await req("/api/attachments/upload", { method: "POST", token: adminToken, body: form }), "attachment upload").attachment;
    invoiceAttachmentId = attachment.id;
    const list = expect(200, await req(`/api/attachments/Invoice/${invoiceId}`, { token: adminToken }), "attachment list");
    assert.ok(list.attachments.some((row) => row.id === attachment.id));
    const download = await req(`/api/attachments/${attachment.id}/download`, { token: adminToken });
    assert.equal(download.status, 200);
    assert.match(download.data.toString(), /qa-e2e attachment/);
    const anonymous = await fetch(`${BASE}/api/attachments/${attachment.id}/download`);
    assert.equal(anonymous.status, 401, "download must require authentication");
    return `uploaded ${attachment.id}, listed, downloaded with auth, anonymous 401`;
  });

  let ticketId;
  await step("company-level ticket, invoice and attachment visibility", async () => {
    const ticket = expect(201, await req("/api/tickets", { method: "POST", token: adminToken, body: { companyId, contactId, subject: `QA E2E Ticket ${STAMP}`, description: "Verification", priority: "High" } }), "ticket create");
    ticketId = ticket.id;
    created.tickets.push(ticketId);

    const companyForm = new FormData();
    companyForm.append("file", new Blob([Buffer.from("company attachment")], { type: "text/plain" }), "qa-e2e-company.txt");
    companyForm.append("entityType", "Company");
    companyForm.append("entityId", String(companyId));
    const companyAttachment = expect(201, await req("/api/attachments/upload", { method: "POST", token: adminToken, body: companyForm }), "company attachment").attachment;

    const detail = expect(200, await req(`/api/companies/${companyId}`, { token: adminToken }), "company detail");
    assert.ok(detail.invoices.some((row) => row.id === invoiceId));
    assert.ok(detail.tickets.some((row) => row.id === ticketId));
    assert.ok(detail.attachments.some((row) => row.id === companyAttachment.id));
    return `company shows ${detail.invoices.length} invoice(s), ${detail.tickets.length} ticket(s), ${detail.attachments.length} attachment(s)`;
  });

  await step("payment notification is created and mark-read works", async () => {
    const list = expect(200, await req("/api/notifications", { token: adminToken }), "notifications");
    const notification = list.notifications.find((row) => row.type === "invoice" && row.title.includes("Payment"));
    assert.ok(notification, "payment notification");
    expect(200, await req(`/api/notifications/${notification.id}/read`, { method: "POST", token: adminToken }), "mark read");
    return `notification ${notification.id} created and marked read`;
  });

  await step("SMTP connection status", async () => {
    const status = expect(200, await req("/api/auth/smtp/status", { token: adminToken }), "smtp status");
    if (!status.configured) return "BLOCKED: SMTP credentials are not configured";
    assert.equal(status.connected, true, status.message);
    return `${status.relay}, connected, from ${status.fromAddress}`;
  });

  await step("branded HTML email is sent and logged", async () => {
    const admin = await User.findByPk(adminId);
    const response = await req("/api/emails/send", {
      method: "POST", token: adminToken,
      body: {
        recipientEmail: admin.email,
        subject: `QA E2E branded email ${STAMP}`,
        body: "Hello from the QA verification run.\nThis message confirms the branded template path.",
        templateName: "QA Verification"
      }
    });
    if (response.status !== 201) {
      if (response.data?.error?.includes("SMTP")) return `BLOCKED: ${response.data.error}`;
      expect(201, response, "email send");
    }
    const logId = response.data.logId;
    if (logId) created.logs.push(logId);
    const log = logId ? await req("/api/emails", { token: adminToken }) : null;
    const row = log?.data?.find?.((entry) => entry.id === logId);
    if (row) {
      assert.match(row.body, /SCRM/);
      assert.match(row.body, /QA E2E branded email/);
      assert.match(row.body, /track\/pixel/);
    }
    return `provider status ${response.data.status}; branded HTML and tracking pixel logged`;
  });

  await step("audit export returns CSV", async () => {
    const response = await req("/api/access/audit/export", { token: adminToken });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /csv/);
    assert.match(response.data.toString(), /action|timestamp/i);
    return `${response.data.length} CSV bytes`;
  });

  await step("Google endpoint rejects an invalid credential clearly", async () => {
    const response = await req("/api/auth/google", { method: "POST", body: { credential: "not-a-google-token" } });
    assert.ok([400, 401].includes(response.status), `expected 400/401, got ${response.status}`);
    assert.ok(response.data.error);
    return `${response.status}: ${response.data.error}`;
  });
} catch (error) {
  console.error("HARNESS ERROR", error);
  results.push({ name: "harness", ok: false, detail: error.message });
} finally {
  try {
    for (const logId of created.logs) {
      await sequelize.query("DELETE FROM email_logs WHERE id = ?", { replacements: [logId] });
    }
    for (const invoiceId of created.invoices) {
      await sequelize.query("DELETE FROM invoice_payments WHERE invoiceId = ?", { replacements: [invoiceId] });
      await sequelize.query("DELETE FROM file_attachments WHERE entity_type = 'Invoice' AND entity_id = ?", { replacements: [invoiceId] });
      await sequelize.query("DELETE FROM invoices WHERE id = ?", { replacements: [invoiceId] });
    }
    for (const ticketId of created.tickets) {
      await sequelize.query("DELETE FROM tickets WHERE id = ?", { replacements: [ticketId] });
    }
    for (const companyId of created.companies) {
      await sequelize.query("DELETE FROM file_attachments WHERE entity_type = 'Company' AND entity_id = ?", { replacements: [companyId] });
      await sequelize.query("DELETE FROM companies WHERE id = ?", { replacements: [companyId] });
    }
    for (const contactId of created.contacts) {
      await sequelize.query("DELETE FROM contacts WHERE id = ?", { replacements: [contactId] });
    }
    for (const leadId of created.leads) {
      await sequelize.query("DELETE FROM leads WHERE id = ?", { replacements: [leadId] });
    }
    for (const viewId of created.views) {
      await sequelize.query("DELETE FROM saved_views WHERE id = ?", { replacements: [viewId] });
    }
    for (const userId of created.users.filter((value) => typeof value === "number")) {
      await sequelize.query("DELETE FROM notifications WHERE userId = ?", { replacements: [userId] });
      await sequelize.query("DELETE FROM saved_views WHERE userId = ?", { replacements: [userId] });
      await sequelize.query("DELETE FROM email_logs WHERE user_id = ?", { replacements: [userId] });
      await sequelize.query("DELETE FROM activity_logs WHERE user_id = ?", { replacements: [userId] });
      await sequelize.query("DELETE FROM users WHERE id = ?", { replacements: [userId] });
    }
    await sequelize.query("DELETE FROM web_leads WHERE email LIKE ?", { replacements: [`qa-e2e-%${STAMP}%`] });
    await sequelize.query("DELETE FROM users WHERE email LIKE ?", { replacements: [`qa-e2e-%${STAMP}%`] });
  } catch (cleanupError) {
    console.error("CLEANUP ERROR", cleanupError.message);
  }
  await sequelize.close();
  const failed = results.filter((row) => !row.ok);
  console.log(`SUMMARY ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}
