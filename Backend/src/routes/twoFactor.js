import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { User } from "../db.js";
import { authenticateToken, logAudit } from "../middleware/auth.js";
import { authLimiter } from "../middleware/security.js";
import {
  encryptSecret,
  decryptSecret,
  createTotpEnrollment,
  buildQrDataUrl,
  verifyTotp,
  generateRecoveryCodes,
  consumeRecoveryCode
} from "../services/twoFactor.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev";
const MAX_CHALLENGE_ATTEMPTS = 5;

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function issueTokens(user) {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      ver: Number(user.token_version || 0),
      jti: crypto.randomUUID()
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = crypto.randomBytes(40).toString("hex");
  return { accessToken, refreshToken };
}

function userPayload(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    company_name: user.company_name,
    title: user.title,
    avatar_url: user.avatar_url,
    cover_url: user.cover_url,
    bio: user.bio,
    role: user.role,
    role_id: user.role_id,
    isActive: user.is_active !== false,
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    twoFactorMethod: user.two_factor_secret ? "totp" : user.two_factor_enabled ? "email" : null
  };
}

async function completeLogin(user, req, res, action) {
  const tokens = issueTokens(user);
  user.refresh_token = hashToken(tokens.refreshToken);
  user.last_login_at = new Date();
  user.two_factor_attempts = 0;
  user.two_factor_code = null;
  user.two_factor_expires = null;
  await user.save();
  await logAudit(user.id, action, "Auth", user.id, {
    email: user.email,
    ip: req.ip,
    userAgent: String(req.headers["user-agent"] || "").slice(0, 200)
  });
  return res.json({
    message: "Two-step verification successful.",
    token: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: userPayload(user)
  });
}

// GET /api/auth/2fa/status - non-secret state for the security screen
router.get("/2fa/status", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    let remainingRecoveryCodes = 0;
    if (user.recovery_codes_json) {
      try {
        remainingRecoveryCodes = (JSON.parse(user.recovery_codes_json) || []).length;
      } catch {
        remainingRecoveryCodes = 0;
      }
    }
    res.json({
      enabled: Boolean(user.two_factor_enabled),
      method: user.two_factor_secret ? "totp" : user.two_factor_enabled ? "email_legacy" : null,
      recoveryCodesRemaining: remainingRecoveryCodes
    });
  } catch (err) {
    res.status(500).json({ error: "Could not read security settings." });
  }
});

// POST /api/auth/2fa/setup - generate a secret and one-time QR code
router.post("/2fa/setup", authenticateToken, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    if (!currentPassword) {
      return res.status(400).json({ error: "Enter your current password to start authenticator setup." });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Your current password is incorrect." });
    }

    const { secret, otpauth } = createTotpEnrollment(user);
    user.two_factor_pending_secret = encryptSecret(secret);
    await user.save();

    res.json({
      secret,
      otpauth,
      qrDataUrl: await buildQrDataUrl(otpauth),
      instructions: "Scan the QR code, then enter the current 6-digit code to finish setup."
    });
  } catch (err) {
    res.status(500).json({ error: "Authenticator setup could not be started." });
  }
});

// POST /api/auth/2fa/enable - confirm the first code and return recovery codes once
router.post("/2fa/enable", authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const pendingSecret = decryptSecret(user.two_factor_pending_secret);
    if (!pendingSecret) {
      return res.status(400).json({ error: "Start authenticator setup again." });
    }
    if (!verifyTotp(pendingSecret, code)) {
      return res.status(400).json({ error: "That code is not valid. Check your authenticator app and try again." });
    }

    const { rawCodes, hashedCodes } = generateRecoveryCodes();
    user.two_factor_secret = encryptSecret(pendingSecret);
    user.two_factor_pending_secret = null;
    user.two_factor_enabled = true;
    user.two_factor_code = null;
    user.two_factor_expires = null;
    user.recovery_codes_json = JSON.stringify(hashedCodes);
    await user.save();

    await logAudit(user.id, "TOTP_ENABLED", "User", user.id, { method: "totp" });

    res.json({
      message: "Authenticator-app verification is enabled.",
      recoveryCodes: rawCodes,
      twoFactorEnabled: true,
      method: "totp"
    });
  } catch (err) {
    res.status(500).json({ error: "Authenticator setup could not be completed." });
  }
});

// POST /api/auth/2fa/disable - requires the account password
router.post("/2fa/disable", authenticateToken, async (req, res) => {
  try {
    const { currentPassword } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Your current password is incorrect." });
    }

    user.two_factor_enabled = false;
    user.two_factor_secret = null;
    user.two_factor_pending_secret = null;
    user.two_factor_code = null;
    user.two_factor_expires = null;
    user.recovery_codes_json = null;
    user.two_factor_attempts = 0;
    await user.save();

    await logAudit(user.id, "TOTP_DISABLED", "User", user.id, {});
    res.json({ message: "Two-step verification is disabled.", twoFactorEnabled: false });
  } catch (err) {
    res.status(500).json({ error: "Two-step verification could not be disabled." });
  }
});

// POST /api/auth/2fa/recovery-codes - rotate codes after reauthentication
router.post("/2fa/recovery-codes", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, code } = req.body;
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Your current password is incorrect." });
    }

    const secret = decryptSecret(user.two_factor_secret);
    if (!secret || !verifyTotp(secret, code)) {
      return res.status(400).json({ error: "Enter a valid authenticator code to rotate recovery codes." });
    }

    const { rawCodes, hashedCodes } = generateRecoveryCodes();
    user.recovery_codes_json = JSON.stringify(hashedCodes);
    await user.save();
    await logAudit(user.id, "TOTP_RECOVERY_CODES_ROTATED", "User", user.id, {});
    res.json({ message: "New recovery codes generated. Previous codes no longer work.", recoveryCodes: rawCodes });
  } catch (err) {
    res.status(500).json({ error: "Recovery codes could not be regenerated." });
  }
});

function validateChallenge(tempToken) {
  const decoded = jwt.verify(tempToken, JWT_SECRET);
  if (decoded.purpose !== "mfa" || !decoded.userId) {
    throw new Error("Invalid challenge");
  }
  return decoded;
}

// POST /api/auth/2fa/verify - TOTP (or legacy email OTP) challenge completion
router.post("/2fa/verify", authLimiter, async (req, res) => {
  try {
    const { tempToken, otpCode, code } = req.body;
    const submitted = String(code || otpCode || "").trim();
    if (!tempToken || !submitted) {
      return res.status(400).json({ error: "Verification code is required." });
    }

    let decoded;
    try {
      decoded = validateChallenge(tempToken);
    } catch {
      return res.status(401).json({ error: "Verification session expired. Please sign in again." });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: "This account cannot sign in." });
    }
    if (Number(decoded.ver ?? 0) !== Number(user.token_version ?? 0)) {
      return res.status(401).json({ error: "Verification session expired. Please sign in again." });
    }
    if (Number(user.two_factor_attempts || 0) >= MAX_CHALLENGE_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect codes. Sign in again to restart verification." });
    }

    let valid = false;
    const totpSecret = decryptSecret(user.two_factor_secret);
    if (totpSecret) {
      valid = verifyTotp(totpSecret, submitted);
    } else if (user.two_factor_code && user.two_factor_expires) {
      valid = String(user.two_factor_code) === submitted && new Date(user.two_factor_expires) > new Date();
    }

    if (!valid) {
      user.two_factor_attempts = Number(user.two_factor_attempts || 0) + 1;
      await user.save();
      await logAudit(user.id, "MFA_CHALLENGE_FAILED", "Auth", user.id, {
        attempts: user.two_factor_attempts
      });
      return res.status(400).json({ error: "Invalid or expired verification code." });
    }

    await completeLogin(user, req, res, "LOGIN_SUCCESS");
  } catch (err) {
    res.status(500).json({ error: "Verification failed." });
  }
});

// POST /api/auth/2fa/recovery - single-use recovery code challenge completion
router.post("/2fa/recovery", authLimiter, async (req, res) => {
  try {
    const { tempToken, recoveryCode } = req.body;
    if (!tempToken || !recoveryCode) {
      return res.status(400).json({ error: "A recovery code is required." });
    }

    let decoded;
    try {
      decoded = validateChallenge(tempToken);
    } catch {
      return res.status(401).json({ error: "Verification session expired. Please sign in again." });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || user.is_active === false) {
      return res.status(401).json({ error: "This account cannot sign in." });
    }
    if (Number(decoded.ver ?? 0) !== Number(user.token_version ?? 0)) {
      return res.status(401).json({ error: "Verification session expired. Please sign in again." });
    }

    let hashedCodes = [];
    try {
      hashedCodes = JSON.parse(user.recovery_codes_json || "[]");
    } catch {
      hashedCodes = [];
    }
    const remaining = consumeRecoveryCode(hashedCodes, recoveryCode);
    if (!remaining) {
      return res.status(400).json({ error: "Invalid or already used recovery code." });
    }

    user.recovery_codes_json = JSON.stringify(remaining);
    await completeLogin(user, req, res, "MFA_RECOVERY_CODE_USED");
  } catch (err) {
    res.status(500).json({ error: "Recovery verification failed." });
  }
});

export default router;
