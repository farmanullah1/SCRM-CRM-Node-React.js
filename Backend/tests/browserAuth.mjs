import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

const { sequelize, User, Role, Company, ActivityLog, Notification } = await import("../src/db.js");
const bcrypt = (await import("bcryptjs")).default;
const { authenticator } = await import("otplib");
const { encryptSecret } = await import("../src/services/twoFactor.js");
const { chromium } = await import("playwright");

const FRONTEND = (process.env.E2E_FRONTEND || "http://localhost:5173").replace(/\/$/, "");
const API = (process.env.E2E_API || "http://localhost:5000").replace(/\/$/, "");
const PASSWORD = "BrowserCookie!Pass2026";
const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

async function step(name, fn) {
  try {
    const detail = await fn();
    pass(name, detail);
  } catch (error) {
    results.push({ name, ok: false, detail: error.message });
    console.log(`FAIL ${name} — ${error.message}`);
    throw error;
  }
}

async function assertServices() {
  const [apiHealth, frontend] = await Promise.all([
    fetch(`${API}/health`).catch(() => null),
    fetch(`${FRONTEND}/`).catch(() => null)
  ]);
  assert.ok(apiHealth?.ok, `Backend is not reachable at ${API}`);
  assert.ok(frontend?.ok, `Frontend is not reachable at ${FRONTEND}`);
}

async function sessionCookies(context) {
  // Read the whole jar: the access/refresh cookies are scoped to /api paths,
  // so querying only the document URL would hide them.
  const cookies = await context.cookies();
  const selected = {};
  for (const cookie of cookies) {
    if (["scrm_access", "scrm_refresh", "scrm_csrf"].includes(cookie.name)) {
      selected[cookie.name] = cookie;
    }
  }
  return selected;
}

async function assertNoTokenStorage(page, label) {
  const audit = await page.evaluate(() => {
    const local = Object.fromEntries(Object.entries(localStorage));
    const session = Object.fromEntries(Object.entries(sessionStorage));
    const keys = [...Object.keys(local), ...Object.keys(session)];
    const values = [...Object.values(local), ...Object.values(session)].join("\n");
    return {
      localKeys: Object.keys(local),
      sessionKeys: Object.keys(session),
      badKeys: keys.filter((key) => /^crm_(token|refresh_token)$/i.test(key)),
      jwtLikeValues: /eyJ[A-Za-z0-9_-]{10,}\./.test(values)
    };
  });
  assert.deepEqual(audit.badKeys, [], `${label}: token keys present in web storage`);
  assert.equal(audit.jwtLikeValues, false, `${label}: JWT-like value present in web storage`);
  return `local=[${audit.localKeys.join(",")}] session=[${audit.sessionKeys.join(",")}]`;
}

async function assertCookieSession(context, label) {
  const cookies = await sessionCookies(context);
  assert.ok(cookies.scrm_access, `${label}: missing scrm_access cookie`);
  assert.equal(cookies.scrm_access.httpOnly, true, `${label}: access cookie is not HttpOnly`);
  assert.equal(cookies.scrm_access.path, "/api", `${label}: access cookie path mismatch`);
  assert.ok(cookies.scrm_refresh, `${label}: missing scrm_refresh cookie`);
  assert.equal(cookies.scrm_refresh.httpOnly, true, `${label}: refresh cookie is not HttpOnly`);
  assert.equal(cookies.scrm_refresh.path, "/api/auth", `${label}: refresh cookie path mismatch`);
  assert.ok(cookies.scrm_csrf, `${label}: missing scrm_csrf cookie`);
  assert.equal(cookies.scrm_csrf.httpOnly, false, `${label}: CSRF cookie must be readable`);
  return `access ${cookies.scrm_access.path}, refresh ${cookies.scrm_refresh.path}, csrf readable`;
}

async function signIn(page, email, password) {
  await page.goto(`${FRONTEND}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /Sign In to SCRM/i }).click();
}

async function waitForDashboard(page) {
  await page.waitForURL(/\/app\/(dashboard|leads|companies)/, { timeout: 30000 });
  await page.locator(".workspace-page-title").first().waitFor({ state: "visible", timeout: 30000 });
}

const created = { users: [], companyId: null };
let browser;

try {
  await assertServices();
  await sequelize.authenticate();
  const adminRole = await Role.findOne({ where: { role_name: "admin" } });
  assert.ok(adminRole, "admin role must exist");

  const primaryEmail = `qa-browser-${STAMP}@example.com`;
  const primary = await User.create({
    name: `QA Browser ${STAMP}`,
    email: primaryEmail,
    password: await bcrypt.hash(PASSWORD, 4),
    company_name: `QA Browser Co ${STAMP}`,
    role: "admin",
    role_id: adminRole.id,
    is_active: true
  });
  created.users.push(primary.id);

  const totpSecret = authenticator.generateSecret();
  const secondFactorEmail = `qa-browser-2fa-${STAMP}@example.com`;
  const secondFactor = await User.create({
    name: `QA Browser 2FA ${STAMP}`,
    email: secondFactorEmail,
    password: await bcrypt.hash(PASSWORD, 4),
    company_name: `QA Browser 2FA Co ${STAMP}`,
    role: "admin",
    role_id: adminRole.id,
    is_active: true,
    two_factor_enabled: true,
    two_factor_method: "totp",
    two_factor_secret: encryptSecret(totpSecret)
  });
  created.users.push(secondFactor.id);

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await step("real browser sign-in creates an HttpOnly cookie session", async () => {
    await signIn(page, primaryEmail, PASSWORD);
    await waitForDashboard(page);
    const detail = await assertCookieSession(context, "after sign-in");
    const storage = await assertNoTokenStorage(page, "after sign-in");
    assert.equal(await page.evaluate(() => localStorage.getItem("crm_user")?.includes("qa-browser-")), true);
    return `${detail}; ${storage}`;
  });

  await step("reload remains authenticated without web-storage tokens", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForDashboard(page);
    const storage = await assertNoTokenStorage(page, "after reload");
    await assertCookieSession(context, "after reload");
    assert.equal((await page.locator(".workspace-page-title").count()) > 0, true);
    return `authenticated after reload; ${storage}`;
  });

  await step("CSRF-protected company mutation succeeds through the app client", async () => {
    await page.goto(`${FRONTEND}/app/companies`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Add Company/i }).waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: /Add Company/i }).click();
    const modal = page.locator(".modal-box-circuit").filter({ hasText: "Create Company Record" });
    await modal.waitFor({ state: "visible" });
    const companyName = `QA Browser Company ${STAMP}`;
    await modal.locator("input").nth(0).fill(companyName);

    const responsePromise = page.waitForResponse(
      (response) => response.url().endsWith("/api/companies") && response.request().method() === "POST",
      { timeout: 20000 }
    );
    await modal.getByRole("button", { name: /Save Company/i }).click();
    const response = await responsePromise;
    const body = await response.json().catch(() => ({}));
    assert.equal(response.status(), 201, `company POST returned ${response.status()}: ${JSON.stringify(body)}`);
    assert.ok(response.request().headers()["x-csrf-token"], "browser client did not attach X-CSRF-Token");
    created.companyId = body.company?.id;
    assert.ok(created.companyId, "company id missing from response");
    await page.getByText("Company created successfully.", { exact: false }).waitFor({ state: "visible", timeout: 10000 });
    const storage = await assertNoTokenStorage(page, "after CSRF mutation");
    return `POST /api/companies 201 with X-CSRF-Token; id ${created.companyId}; ${storage}`;
  });

  await step("a state-changing browser request without CSRF is rejected", async () => {
    const result = await page.evaluate(async (name) => {
      const response = await fetch("/api/companies", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const body = await response.json().catch(() => ({}));
      return { status: response.status, code: body.code, error: body.error };
    }, `QA Browser No CSRF ${STAMP}`);
    assert.equal(result.status, 403, `expected CSRF rejection, got ${result.status} ${JSON.stringify(result)}`);
    assert.equal(result.code, "CSRF_TOKEN_INVALID");
    return `same cookies without header -> 403 ${result.code}`;
  });

  await step("cleared access cookie is silently restored by refresh on reload", async () => {
    const before = await sessionCookies(context);
    assert.ok(before.scrm_access && before.scrm_refresh);
    await context.clearCookies({ name: "scrm_access" });
    const cleared = await sessionCookies(context);
    assert.equal(cleared.scrm_access, undefined, "access cookie was not cleared");
    assert.ok(cleared.scrm_refresh, "refresh cookie was unexpectedly cleared");

    let refreshRequests = 0;
    const countRefresh = (request) => {
      if (request.url().includes("/api/auth/refresh")) refreshRequests += 1;
    };
    page.on("request", countRefresh);
    await page.goto(`${FRONTEND}/app/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForDashboard(page);
    await page.waitForTimeout(1200);
    page.off("request", countRefresh);

    const after = await sessionCookies(context);
    assert.ok(after.scrm_access, "refresh did not restore the access cookie");
    assert.notEqual(after.scrm_access.value, before.scrm_access.value, "access token did not rotate");
    assert.ok(refreshRequests >= 1, "no refresh request was observed");
    assert.ok(refreshRequests <= 3, `refresh loop suspected (${refreshRequests} requests)`);
    const storage = await assertNoTokenStorage(page, "after silent refresh");
    return `${refreshRequests} refresh request(s), access rotated, dashboard restored; ${storage}`;
  });

  await step("logout clears cookies, reload stays signed out, protected route redirects", async () => {
    await page.goto(`${FRONTEND}/app/settings/account`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Sign out…/i }).waitFor({ state: "visible", timeout: 20000 });
    await page.getByRole("button", { name: /Sign out…/i }).click();
    const modal = page.locator(".modal-box-circuit").filter({ hasText: "Sign out of SCRM?" });
    await modal.waitFor({ state: "visible" });
    await modal.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.waitForURL(/\/login/, { timeout: 20000 });
    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20000 });

    const cookies = await sessionCookies(context);
    assert.equal(cookies.scrm_access, undefined, "access cookie survived logout");
    assert.equal(cookies.scrm_refresh, undefined, "refresh cookie survived logout");
    const storage = await assertNoTokenStorage(page, "after logout");
    assert.equal(await page.evaluate(() => localStorage.getItem("crm_user")), null);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('input[type="email"]').waitFor({ state: "visible", timeout: 20000 });
    assert.equal(new URL(page.url()).pathname, "/login", "reload after logout left the login page");

    await page.goto(`${FRONTEND}/app/dashboard`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/, { timeout: 20000 });
    await page.locator(".workspace-page-title").first().waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
    assert.equal(await page.locator(".workspace-page-title").count(), 0, "protected content rendered after logout");
    const directStorage = await assertNoTokenStorage(page, "after post-logout protected navigation");
    return `cookies cleared; reload login; direct /app/dashboard -> login; ${storage}; ${directStorage}`;
  });

  await step("2FA completion creates a working cookie session", async () => {
    await signIn(page, secondFactorEmail, PASSWORD);
    const otp = page.locator('input[placeholder="123456"]');
    await otp.waitFor({ state: "visible", timeout: 20000 });
    await otp.fill(authenticator.generate(totpSecret));
    await page.getByRole("button", { name: /Confirm & Enter Dashboard/i }).click();
    await waitForDashboard(page);
    const detail = await assertCookieSession(context, "after 2FA");
    const storage = await assertNoTokenStorage(page, "after 2FA");
    const cookies = await sessionCookies(context);
    assert.ok(cookies.scrm_access && cookies.scrm_refresh && cookies.scrm_csrf);
    return `${detail}; ${storage}`;
  });

  assert.deepEqual(pageErrors, [], `browser page errors: ${pageErrors.join(" | ")}`);
  pass("no uncaught browser page errors");
} catch (error) {
  console.error("BROWSER CHECK ERROR", error.stack || error.message);
  process.exitCode = 1;
} finally {
  try {
    if (created.companyId) {
      await Company.destroy({ where: { id: created.companyId } });
    }
    for (const userId of created.users) {
      await ActivityLog.destroy({ where: { user_id: userId } });
      await Notification.destroy({ where: { userId } });
      await User.destroy({ where: { id: userId } });
    }
  } catch (cleanupError) {
    console.error("CLEANUP ERROR", cleanupError.message);
    process.exitCode = 1;
  }
  if (browser) await browser.close();
  await sequelize.close();
  const failed = results.filter((row) => !row.ok);
  console.log(`SUMMARY ${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
}
