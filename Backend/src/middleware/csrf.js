import crypto from "crypto";
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  CSRF_HEADER,
  REFRESH_COOKIE,
  readCookie
} from "../auth/sessionCookies.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function tokensMatch(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) return false;
  const expected = Buffer.from(String(cookieToken));
  const received = Buffer.from(String(headerToken));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/**
 * Double-submit CSRF protection. Bearer-authenticated API clients are exempt
 * because browsers do not attach an Authorization header automatically; any
 * request relying on session cookies must echo the readable CSRF cookie.
 */
export function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (String(req.headers.authorization || "").startsWith("Bearer ")) return next();

  const usesSessionCookie = Boolean(
    readCookie(req, ACCESS_COOKIE) || readCookie(req, REFRESH_COOKIE)
  );
  if (!usesSessionCookie) return next();

  const cookieToken = readCookie(req, CSRF_COOKIE);
  const headerToken = req.get(CSRF_HEADER);
  if (!tokensMatch(cookieToken, headerToken)) {
    return res.status(403).json({
      error: "The CSRF token is missing or invalid. Refresh the page and try again.",
      code: "CSRF_TOKEN_INVALID"
    });
  }
  return next();
}
