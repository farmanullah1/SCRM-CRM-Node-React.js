import crypto from "crypto";

export const ACCESS_COOKIE = "scrm_access";
export const REFRESH_COOKIE = "scrm_refresh";
export const CSRF_COOKIE = "scrm_csrf";
export const CSRF_HEADER = "x-csrf-token";

const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const ACCESS_PATH = "/api";
const REFRESH_PATH = "/api/auth";
const DEFAULT_PATH = "/";

function sameSiteMode() {
  const configured = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  return ["lax", "strict", "none"].includes(configured) ? configured : "lax";
}

function useSecureCookies() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function baseOptions(path) {
  const sameSite = sameSiteMode();
  return {
    httpOnly: true,
    secure: sameSite === "none" ? true : useSecureCookies(),
    sameSite,
    path,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {})
  };
}

export function readCookie(req, name) {
  const header = req?.headers?.cookie;
  if (!header) return null;
  for (const part of String(header).split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function setCsrfCookie(res, token = crypto.randomBytes(32).toString("hex")) {
  res.cookie(CSRF_COOKIE, token, {
    ...baseOptions(DEFAULT_PATH),
    httpOnly: false,
    maxAge: REFRESH_MAX_AGE_MS
  });
  return token;
}

export function ensureCsrfCookie(req, res) {
  return readCookie(req, CSRF_COOKIE) || setCsrfCookie(res);
}

export function setSessionCookies(res, { accessToken, refreshToken }, csrfToken) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseOptions(ACCESS_PATH),
    maxAge: ACCESS_MAX_AGE_MS
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseOptions(REFRESH_PATH),
    maxAge: REFRESH_MAX_AGE_MS
  });
  setCsrfCookie(res, csrfToken || undefined);
}

export function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, baseOptions(ACCESS_PATH));
  res.clearCookie(REFRESH_COOKIE, baseOptions(REFRESH_PATH));
  res.clearCookie(CSRF_COOKIE, { ...baseOptions(DEFAULT_PATH), httpOnly: false });
}
