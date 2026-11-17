import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { sequelize, User, Role, ActivityLog, Notification } from "../src/db.js";

const BASE = process.env.API_BASE || "http://localhost:5000";
const STAMP = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const EMAIL = `qa-cookie-session-${STAMP}@example.com`;
const PASSWORD = "CookieSession!Pass2026";
let user;

function updateJar(response, jar) {
  const setCookies = response.headers.getSetCookie();
  for (const line of setCookies) {
    const [pair] = line.split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (!value || /max-age=0/i.test(line)) jar.delete(name);
    else jar.set(name, value);
  }
  return setCookies;
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function request(path, { method = "GET", body, jar = new Map(), csrf = true, csrfToken } = {}) {
  const headers = {};
  const cookie = cookieHeader(jar);
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (csrf && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    const token = csrfToken || jar.get("scrm_csrf");
    if (token) headers["X-CSRF-Token"] = token;
  }

  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  const setCookies = updateJar(response, jar);
  return { status: response.status, data, setCookies, jar };
}

before(async () => {
  await sequelize.authenticate();
  const role = await Role.findOne({ where: { role_name: "standard_user" } });
  assert.ok(role, "standard_user role must exist");
  user = await User.create({
    name: `QA Cookie Session ${STAMP}`,
    email: EMAIL,
    password: await bcrypt.hash(PASSWORD, 4),
    role: "standard_user",
    role_id: role.id,
    is_active: true
  });
});

after(async () => {
  if (user) {
    await ActivityLog.destroy({ where: { user_id: user.id } });
    await Notification.destroy({ where: { userId: user.id } });
    await user.destroy();
  }
  await sequelize.close();
});

test("cookie login, CSRF rejection, refresh rotation, and logout revocation", async () => {
  const jar = new Map();

  const csrf = await request("/api/auth/csrf", { jar });
  assert.equal(csrf.status, 200, JSON.stringify(csrf.data));
  assert.ok(jar.get("scrm_csrf"), "CSRF cookie must be issued");
  assert.equal(csrf.data.csrfToken, jar.get("scrm_csrf"));

  const login = await request("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
    jar
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));

  const accessCookie = login.setCookies.find((line) => line.startsWith("scrm_access="));
  const refreshCookie = login.setCookies.find((line) => line.startsWith("scrm_refresh="));
  const csrfCookie = login.setCookies.find((line) => line.startsWith("scrm_csrf="));
  assert.match(accessCookie || "", /HttpOnly/i);
  assert.match(accessCookie || "", /Path=\/api(?:;|$)/i);
  assert.match(refreshCookie || "", /HttpOnly/i);
  assert.match(refreshCookie || "", /Path=\/api\/auth(?:;|$)/i);
  assert.match(accessCookie || "", /SameSite=Lax/i);
  assert.doesNotMatch(csrfCookie || "", /HttpOnly/i);

  const me = await request("/api/auth/me", { jar });
  assert.equal(me.status, 200, JSON.stringify(me.data));
  assert.equal(me.data.user.email, EMAIL);

  const missingCsrf = await request("/api/auth/logout", {
    method: "POST",
    jar,
    csrf: false
  });
  assert.equal(missingCsrf.status, 403);
  assert.equal(missingCsrf.data.code, "CSRF_TOKEN_INVALID");

  const wrongCsrf = await request("/api/auth/logout", {
    method: "POST",
    jar,
    csrfToken: "not-the-issued-token"
  });
  assert.equal(wrongCsrf.status, 403);
  assert.equal(wrongCsrf.data.code, "CSRF_TOKEN_INVALID");

  const stillSignedIn = await request("/api/auth/me", { jar });
  assert.equal(stillSignedIn.status, 200, "failed CSRF attempts must not end the session");

  const oldRefresh = jar.get("scrm_refresh");
  const oldAccess = jar.get("scrm_access");
  const refreshed = await request("/api/auth/refresh", {
    method: "POST",
    body: {},
    jar
  });
  assert.equal(refreshed.status, 200, JSON.stringify(refreshed.data));
  assert.notEqual(jar.get("scrm_refresh"), oldRefresh, "refresh token must rotate");
  assert.notEqual(jar.get("scrm_access"), oldAccess, "access token must rotate");

  const replayJar = new Map([
    ["scrm_csrf", jar.get("scrm_csrf")],
    ["scrm_refresh", oldRefresh]
  ]);
  const replay = await request("/api/auth/refresh", {
    method: "POST",
    body: {},
    jar: replayJar
  });
  assert.equal(replay.status, 401, "a rotated refresh token must not be reusable");

  const currentRefresh = jar.get("scrm_refresh");
  const currentCsrf = jar.get("scrm_csrf");
  const logout = await request("/api/auth/logout", {
    method: "POST",
    jar
  });
  assert.equal(logout.status, 200, JSON.stringify(logout.data));
  assert.equal(logout.data.revoked, true);
  assert.equal(jar.has("scrm_access"), false);
  assert.equal(jar.has("scrm_refresh"), false);
  assert.equal(jar.has("scrm_csrf"), false);

  const staleAccessJar = new Map([["scrm_access", oldAccess]]);
  const afterLogout = await request("/api/auth/me", { jar: staleAccessJar });
  assert.equal(afterLogout.status, 401, "logout must revoke already-issued access tokens");

  const staleRefreshJar = new Map([
    ["scrm_csrf", currentCsrf],
    ["scrm_refresh", currentRefresh]
  ]);
  const revokedRefresh = await request("/api/auth/refresh", {
    method: "POST",
    body: {},
    jar: staleRefreshJar
  });
  assert.equal(revokedRefresh.status, 401, "logout must revoke the refresh token");
});
