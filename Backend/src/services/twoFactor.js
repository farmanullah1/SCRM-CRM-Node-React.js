import crypto from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";

const ISSUER = "SCRM";
const RECOVERY_CODE_COUNT = 8;

/**
 * TOTP secrets are encrypted at rest with AES-256-GCM. Set
 * TWO_FACTOR_ENCRYPTION_KEY to a 32-byte hex value in production; the JWT
 * secret is used only as a development fallback.
 */
function encryptionKey() {
  const configured = process.env.TWO_FACTOR_ENCRYPTION_KEY;
  if (configured && /^[0-9a-fA-F]{64}$/.test(configured)) {
    return Buffer.from(configured, "hex");
  }
  return crypto.createHash("sha256").update(process.env.JWT_SECRET || "default_jwt_secret_dev").digest();
}

export function encryptSecret(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${encrypted.toString("base64url")}.${tag.toString("base64url")}`;
}

export function decryptSecret(payload) {
  if (!payload) return null;
  const [version, ivValue, dataValue, tagValue] = payload.split(".");
  if (version !== "v1" || !ivValue || !dataValue || !tagValue) return null;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataValue, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function createTotpEnrollment(user) {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, ISSUER, secret);
  return { secret, otpauth };
}

export async function buildQrDataUrl(otpauth) {
  return QRCode.toDataURL(otpauth, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 260,
    color: { dark: "#111111", light: "#F0FF60" }
  });
}

export function verifyTotp(secret, code) {
  if (!secret || !/^\d{6}$/.test(String(code || "").trim())) return false;
  authenticator.options = { window: 1 };
  try {
    return authenticator.verify({ token: String(code).trim(), secret });
  } catch {
    return false;
  }
}

function hashRecoveryCode(code) {
  return crypto.createHash("sha256").update(String(code).trim().toUpperCase()).digest("hex");
}

export function generateRecoveryCodes() {
  const rawCodes = [];
  const hashedCodes = [];
  for (let index = 0; index < RECOVERY_CODE_COUNT; index += 1) {
    const code = `${crypto.randomBytes(3).toString("hex").toUpperCase()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;
    rawCodes.push(code);
    hashedCodes.push(hashRecoveryCode(code));
  }
  return { rawCodes, hashedCodes };
}

export function consumeRecoveryCode(hashedList, code) {
  const list = Array.isArray(hashedList) ? [...hashedList] : [];
  const index = list.indexOf(hashRecoveryCode(code));
  if (index === -1) return null;
  list.splice(index, 1);
  return list;
}

export { hashRecoveryCode };
