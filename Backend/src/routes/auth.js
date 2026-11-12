import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { OAuth2Client } from "google-auth-library";
import { User, Role } from "../db.js";
import { authenticateToken, requireRole, requirePermission, logAudit } from "../middleware/auth.js";
import { authLimiter, sanitizeString, isValidEmail, validatePasswordStrength } from "../middleware/security.js";
import {
  sendWelcomeEmail,
  sendSecurityAlertEmail,
  sendPasswordResetEmail,
  send2FAVerificationEmail,
  verifySmtpConnection,
  sendTestEmail
} from "../services/emailService.js";
import {
  encryptSecret,
  decryptSecret,
  createTotpEnrollment,
  buildQrDataUrl,
  verifyTotp,
  generateRecoveryCodes,
  consumeRecoveryCode
} from "../services/twoFactor.js";
import { resolvePermissions, PERMISSION_CATALOG } from "../permissions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev";
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const DUMMY_PASSWORD_HASH = "$2b$12$8vT7vXl0VQ0nU8rD9J5zQeK4oM2qBw7rY1sW3cN6fH9kL0pR5tU2q";
const TERMS_VERSION = "2026-11";

// Multer Storage Configuration for Avatar and Cover Photos
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, "../../uploads/avatars");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `avatar-${req.user?.id || "user"}-${Date.now()}${ext}`);
  }
});

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(__dirname, "../../uploads/covers");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `cover-${req.user?.id || "user"}-${Date.now()}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, WEBP, or GIF image files are permitted."));
  }
};

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter
});

const uploadCover = multer({
  storage: coverStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB limit
  fileFilter: imageFilter
});

function formatUserResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    company_name: user.company_name,
    title: user.title,
    department: user.department,
    country: user.country,
    timezone: user.timezone,
    language: user.language,
    avatar_url: user.avatar_url,
    cover_url: user.cover_url,
    bio: user.bio,
    role: user.role,
    role_id: user.role_id,
    isActive: user.is_active !== false,
    twoFactorEnabled: Boolean(user.two_factor_enabled),
    twoFactorMethod: user.two_factor_secret ? "totp" : user.two_factor_enabled ? "email" : null,
    googleLinked: Boolean(user.google_id),
    termsVersion: user.terms_version || null
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function generateTokens(user) {
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
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  return { accessToken, refreshToken };
}

async function issueTokens(user) {
  const tokens = generateTokens(user);
  user.refresh_token = hashToken(tokens.refreshToken);
  user.last_login_at = new Date();
  await user.save();
  return tokens;
}

async function permissionsForUser(user) {
  const roleRecord = user.role_id
    ? await Role.findByPk(user.role_id)
    : await Role.findOne({ where: { role_name: user.role } });
  const effective = resolvePermissions(roleRecord?.permissions_json, user.role);
  return { ...effective, permissions: [...effective.permissions] };
}

async function verifyGoogleCredential(credential) {
  if (!googleClient) {
    const error = new Error("Google sign-in is not configured on this server.");
    error.status = 503;
    throw error;
  }
  if (!credential || typeof credential !== "string") {
    const error = new Error("A Google credential is required.");
    error.status = 400;
    throw error;
  }
  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    const error = new Error("Google did not return a verified email address.");
    error.status = 401;
    throw error;
  }
  return payload;
}

// POST /api/auth/signup - Register new account with high-salt hashing and automated Welcome Email
// Strictly assigns lowest privilege ('standard_user') by default. Client cannot self-elevate to admin.
router.post("/signup", authLimiter, async (req, res) => {
  try {
        let { name, email, password, phone, company_name, title, department, country, timezone, language, termsAccepted } = req.body;

    name = sanitizeString(name);
    email = sanitizeString(email)?.toLowerCase();
    phone = phone ? sanitizeString(phone) : null;
    company_name = company_name ? sanitizeString(company_name) : null;
    title = title ? sanitizeString(title) : null;
    department = department ? sanitizeString(department) : null;
    country = country ? sanitizeString(country) : null;
    timezone = timezone ? sanitizeString(timezone) : null;
    language = language ? sanitizeString(language) : "en";

    if (!name || !email || !password || !company_name) {
      return res.status(400).json({ error: "Full name, work email, workspace name and password are required." });
    }

    if (termsAccepted !== true) {
      return res.status(400).json({ error: "You must accept the Terms of Service and Privacy Policy." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    // Default first user to admin if empty DB, otherwise standard_user ONLY (client cannot pass role)
    const totalUsers = await User.count();
    const assignedRole = totalUsers === 0 ? "admin" : "standard_user";

    // Find matching role_id from roles table
    const roleRecord = await Role.findOne({ where: { role_name: assignedRole } });
    const roleId = roleRecord ? roleRecord.id : null;

    // Enforce high salt rounds (12)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone,
      company_name,
      title,
      department,
      country,
      timezone,
      language,
      password: hashedPassword,
      role: assignedRole,
      role_id: roleId,
      two_factor_enabled: false,
      is_active: true,
      terms_version: TERMS_VERSION,
      terms_accepted_at: new Date()
    });

    const { accessToken, refreshToken } = await issueTokens(user);

    await logAudit(user.id, "USER_SIGNUP", "User", user.id, {
      email: user.email,
      role: user.role,
      termsVersion: TERMS_VERSION
    });

    // System Trigger: Automated Welcome Email (delivery failures are logged, not faked)
    sendWelcomeEmail(user).catch(e => console.error("[Email Trigger Error]", e.message));

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Registration failed", details: err.message });
  }
});

// POST /api/auth/login - Authenticate existing user with 2FA check
router.post("/login", authLimiter, async (req, res) => {
  try {
    let { email, password } = req.body;

    email = sanitizeString(email)?.toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

        const user = await User.findOne({ where: { email } });

    // Compare against a dummy hash for unknown accounts to reduce timing-based
    // account enumeration. The response stays generic in both cases.
    const isMatch = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH);
    if (!user || !isMatch) {
      if (user) await logAudit(user.id, "LOGIN_FAILED", "Auth", user.id, { email });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: "This account is suspended. Contact an administrator." });
    }

    // Real authenticator-app TOTP challenge.
    if (user.two_factor_enabled && user.two_factor_secret) {
      user.two_factor_attempts = 0;
      await user.save();
      const tempToken = jwt.sign(
        { userId: user.id, purpose: "mfa", ver: Number(user.token_version || 0) },
        JWT_SECRET,
        { expiresIn: "10m" }
      );
      return res.json({
        twoFactorRequired: true,
        method: "totp",
        tempToken,
        email: user.email,
        message: "Enter the 6-digit code from your authenticator app."
      });
    }

    // Legacy email OTP remains available only for accounts that enabled the
    // old flow and have not yet enrolled an authenticator app.
    if (user.two_factor_enabled) {
      const otpCode = crypto.randomInt(100000, 1000000).toString();
      user.two_factor_code = otpCode;
      user.two_factor_expires = new Date(Date.now() + 10 * 60 * 1000);
      user.two_factor_attempts = 0;
      await user.save();

      await send2FAVerificationEmail(user, otpCode);

      const tempToken = jwt.sign(
        { userId: user.id, purpose: "mfa", ver: Number(user.token_version || 0) },
        JWT_SECRET,
        { expiresIn: "10m" }
      );

      return res.json({
        twoFactorRequired: true,
        method: "email",
        tempToken,
        email: user.email,
        message: "A verification code was sent to your email."
      });
    }

    const { accessToken, refreshToken } = await issueTokens(user);

    await logAudit(user.id, "LOGIN_SUCCESS", "Auth", user.id, { email });

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// POST /api/auth/2fa/verify - Verify 2FA OTP code and issue final access tokens
router.post("/2fa/verify", authLimiter, async (req, res) => {
  try {
    const { tempToken, otpCode } = req.body;
    if (!tempToken || !otpCode) {
      return res.status(400).json({ error: "Temporary token and 6-digit OTP code are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "2FA session expired. Please log in again." });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (!user.two_factor_code || user.two_factor_code !== otpCode.trim()) {
      return res.status(400).json({ error: "Invalid verification code. Please check your email." });
    }

    if (!user.two_factor_expires || new Date() > new Date(user.two_factor_expires)) {
      return res.status(400).json({ error: "Verification code has expired. Please log in again." });
    }

    // Clear OTP code
    user.two_factor_code = null;
    user.two_factor_expires = null;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    await logAudit(user.id, "2FA_VERIFICATION_SUCCESS", "Auth", user.id, { email: user.email });

    res.json({
      message: "2FA Verification successful",
      token: accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    res.status(500).json({ error: "2FA verification failed", details: err.message });
  }
});

// POST /api/auth/2fa/recovery - Emergency login using single-use backup recovery code
router.post("/2fa/recovery", authLimiter, async (req, res) => {
  try {
    const { tempToken, recoveryCode } = req.body;
    if (!tempToken || !recoveryCode) {
      return res.status(400).json({ error: "Temporary token and recovery code are required." });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: "2FA session expired. Please log in again." });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (!user.recovery_codes_json) {
      return res.status(400).json({ error: "No recovery codes found for this account." });
    }

    const hashedInput = crypto.createHash("sha256").update(recoveryCode.trim().toUpperCase()).digest("hex");
    let hashedList = [];
    try {
      hashedList = JSON.parse(user.recovery_codes_json) || [];
    } catch (e) {
      hashedList = [];
    }

    const codeIndex = hashedList.indexOf(hashedInput);
    if (codeIndex === -1) {
      return res.status(400).json({ error: "Invalid or already used recovery code." });
    }

    // Invalidate the single-use recovery code
    hashedList.splice(codeIndex, 1);
    user.recovery_codes_json = JSON.stringify(hashedList);
    user.two_factor_code = null;
    user.two_factor_expires = null;

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    await logAudit(user.id, "2FA_RECOVERY_CODE_USED", "Auth", user.id, {
      remainingCodesCount: hashedList.length
    });

    res.json({
      message: `Emergency recovery login successful. ${hashedList.length} recovery code(s) remaining.`,
      token: accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    res.status(500).json({ error: "Recovery login failed.", details: err.message });
  }
});

// Legacy toggle endpoint. It is intentionally disabled: 2FA is now enrolled
// through /2fa/setup and /2fa/enable so a verified TOTP secret always exists.
router.post("/2fa/toggle", authenticateToken, (req, res) => {
  res.status(410).json({
    error: "Use the authenticator-app setup flow in Settings → Security to change two-step verification."
  });
});

// POST /api/auth/google - Verify a Google ID token server-side and sign in.
// Existing accounts are never linked solely because an email string matches.
router.post("/google", authLimiter, async (req, res) => {
  try {
    const { credential, termsAccepted } = req.body;
    let payload;
    try {
      payload = await verifyGoogleCredential(credential);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message || "Google sign-in failed." });
    }

    const email = String(payload.email).toLowerCase();
    let user = await User.findOne({ where: { google_id: payload.sub } });
    if (!user) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(409).json({
          code: "ACCOUNT_LINK_REQUIRED",
          error: "An account with this email already exists. Sign in with your password, then link Google from Settings → Security."
        });
      }

      if (termsAccepted !== true) {
        return res.status(400).json({
          code: "TERMS_REQUIRED",
          error: "Accept the Terms of Service and Privacy Policy before creating a Google account."
        });
      }

      const totalUsers = await User.count();
      const assignedRole = totalUsers === 0 ? "admin" : "standard_user";
      const roleRecord = await Role.findOne({ where: { role_name: assignedRole } });
      const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);
      user = await User.create({
        name: sanitizeString(payload.name || email.split("@")[0]),
        email,
        password: randomPassword,
        company_name: sanitizeString(payload.hd || "Google Workspace"),
        role: assignedRole,
        role_id: roleRecord?.id || null,
        google_id: payload.sub,
        is_active: true,
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date()
      });
      await logAudit(user.id, "USER_SIGNUP_GOOGLE", "User", user.id, { email: user.email });
    }

    if (user.is_active === false) {
      return res.status(403).json({ error: "This account is suspended. Contact an administrator." });
    }

    if (user.two_factor_enabled) {
      const tempToken = jwt.sign(
        { userId: user.id, purpose: "mfa", ver: Number(user.token_version || 0) },
        JWT_SECRET,
        { expiresIn: "10m" }
      );
      return res.json({
        twoFactorRequired: true,
        method: user.two_factor_secret ? "totp" : "email",
        tempToken,
        email: user.email,
        message: user.two_factor_secret
          ? "Enter the 6-digit code from your authenticator app."
          : "A verification code was sent to your email."
      });
    }

    const { accessToken, refreshToken } = await issueTokens(user);
    await logAudit(user.id, "LOGIN_SUCCESS_GOOGLE", "Auth", user.id, { email: user.email });
    res.json({
      message: "Google sign-in successful.",
      token: accessToken,
      refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    console.error("Google Sign-In Error:", err.message);
    res.status(500).json({ error: "Google sign-in could not be completed." });
  }
});

// POST /api/auth/google/link - link Google only to the authenticated account
router.post("/google/link", authenticateToken, async (req, res) => {
  try {
    const payload = await verifyGoogleCredential(req.body.credential);
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (String(payload.email).toLowerCase() !== String(user.email).toLowerCase()) {
      return res.status(400).json({ error: "The Google account email does not match this SCRM account." });
    }
    const claimed = await User.findOne({ where: { google_id: payload.sub } });
    if (claimed && claimed.id !== user.id) {
      return res.status(409).json({ error: "This Google account is already linked to another user." });
    }
    user.google_id = payload.sub;
    await user.save();
    await logAudit(user.id, "GOOGLE_ACCOUNT_LINKED", "User", user.id, { email: user.email });
    res.json({ message: "Google account linked.", googleLinked: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Google account could not be linked." });
  }
});

// POST /api/auth/google/unlink - never remove the only usable login method
router.post("/google/unlink", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    if (!req.body.currentPassword || !(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(401).json({ error: "Enter your current password to unlink Google." });
    }
    user.google_id = null;
    await user.save();
    await logAudit(user.id, "GOOGLE_ACCOUNT_UNLINKED", "User", user.id, {});
    res.json({ message: "Google account unlinked.", googleLinked: false });
  } catch (err) {
    res.status(500).json({ error: "Google account could not be unlinked." });
  }
});

// POST /api/auth/forgot-password - Request password reset link/token
router.post("/forgot-password", authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });

    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      // Return 200 to prevent user enumeration
      return res.json({ message: "If an account exists with this email, a reset link has been dispatched." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.reset_password_token = resetToken;
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    await logAudit(user.id, "PASSWORD_RESET_REQUESTED", "Auth", user.id, { email });

    // System Trigger: Password Reset Email
    sendPasswordResetEmail(user, resetToken).catch(e => console.error(e));

    res.json({ message: "If an account exists with this email, a reset link has been dispatched." });
  } catch (err) {
    res.status(500).json({ error: "Password reset request failed." });
  }
});

// POST /api/auth/reset-password - Execute password reset with verification token
router.post("/reset-password", authLimiter, async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: "Email, reset token, and new password are required." });
    }

    const passCheck = validatePasswordStrength(newPassword);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const user = await User.findOne({
      where: {
        email: email.trim().toLowerCase(),
        reset_password_token: resetToken
      }
    });

    if (!user || !user.reset_password_expires || new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({ error: "Invalid or expired password reset token." });
    }

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    await logAudit(user.id, "PASSWORD_RESET_COMPLETED", "Auth", user.id, { email });

    // System Trigger: Security Notification Email
    sendSecurityAlertEmail(user, {
      action: "Password Successfully Reset",
      details: "Your SCRM password was updated using a verified reset token."
    }).catch(e => {});

    res.json({ message: "Password reset successfully. You can now log in with your new credentials." });
  } catch (err) {
    res.status(500).json({ error: "Password reset failed" });
  }
});

// PUT /api/auth/profile - Update user profile & security details
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const { name, phone, company_name, title, bio, currentPassword, newPassword } = req.body;
    let modifiedDetails = [];

    if (name) {
      user.name = sanitizeString(name);
      modifiedDetails.push("Name updated");
    }

    if (phone !== undefined) {
      user.phone = phone ? sanitizeString(phone) : null;
      modifiedDetails.push("Phone updated");
    }

    if (company_name !== undefined) {
      user.company_name = company_name ? sanitizeString(company_name) : null;
      modifiedDetails.push("Company updated");
    }

    if (title !== undefined) {
      user.title = title ? sanitizeString(title) : null;
      modifiedDetails.push("Title updated");
    }

    if (bio !== undefined) {
      user.bio = bio ? sanitizeString(bio).slice(0, 500) : null;
      modifiedDetails.push("Bio updated");
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to set a new password." });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Current password does not match." });
      }
      const passCheck = validatePasswordStrength(newPassword);
      if (!passCheck.valid) {
        return res.status(400).json({ error: passCheck.message });
      }
      const salt = await bcrypt.genSalt(12);
      user.password = await bcrypt.hash(newPassword, salt);
      modifiedDetails.push("Password modified");
    }

    await user.save();

    await logAudit(user.id, "PROFILE_UPDATED", "User", user.id, { modified: modifiedDetails });

    // System Trigger: Security Alert Email on profile/password changes
    sendSecurityAlertEmail(user, {
      action: "Account Profile Modified",
      details: modifiedDetails.join(", ")
    }).catch(e => {});

    res.json({
      message: "Profile updated successfully.",
      user: formatUserResponse(user),
      permissions: req.user.permissions
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// ---------------------------------------------------------------------------
// Profile media: avatar and cover images
// Files are stored under /uploads and referenced by relative URL in the DB.
// ---------------------------------------------------------------------------
function uploadSingle(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: err.message || "The image could not be processed." });
      }
      next();
    });
  };
}

function removeStoredImage(relativeUrl, folder) {
  try {
    if (!relativeUrl) return;
    const filename = path.basename(relativeUrl);
    const target = path.resolve(__dirname, "../../uploads", folder, filename);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  } catch (err) {
    console.error("[Profile Media Cleanup]", err.message);
  }
}

router.post("/profile/avatar", authenticateToken, uploadSingle(uploadAvatar.single("avatar")), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Select an image file to upload." });
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    removeStoredImage(user.avatar_url, "avatars");
    user.avatar_url = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    await logAudit(user.id, "PROFILE_AVATAR_UPDATED", "User", user.id, {});

    res.json({ message: "Profile photo updated.", avatar_url: user.avatar_url, user: formatUserResponse(user) });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "The profile photo could not be saved." });
  }
});

router.delete("/profile/avatar", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    removeStoredImage(user.avatar_url, "avatars");
    user.avatar_url = null;
    await user.save();
    res.json({ message: "Profile photo removed.", user: formatUserResponse(user) });
  } catch (err) {
    res.status(500).json({ error: "The profile photo could not be removed." });
  }
});

router.post("/profile/cover", authenticateToken, uploadSingle(uploadCover.single("cover")), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Select an image file to upload." });
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    removeStoredImage(user.cover_url, "covers");
    user.cover_url = `/uploads/covers/${req.file.filename}`;
    await user.save();
    await logAudit(user.id, "PROFILE_COVER_UPDATED", "User", user.id, {});

    res.json({ message: "Cover photo updated.", cover_url: user.cover_url, user: formatUserResponse(user) });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "The cover photo could not be saved." });
  }
});

router.delete("/profile/cover", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    removeStoredImage(user.cover_url, "covers");
    user.cover_url = null;
    await user.save();
    res.json({ message: "Cover photo removed.", user: formatUserResponse(user) });
  } catch (err) {
    res.status(500).json({ error: "The cover photo could not be removed." });
  }
});

// ---------------------------------------------------------------------------
// SMTP diagnostics (administrators only, secrets never leave the server)
// ---------------------------------------------------------------------------
function describeSmtpFailure(message = "") {
  const text = String(message).toLowerCase();
  if (text.includes("auth") || text.includes("credential") || text.includes("535")) {
    return "Authentication failed. Verify the sender account and app password.";
  }
  if (text.includes("enotfound") || text.includes("getaddrinfo") || text.includes("eai_again")) {
    return "The SMTP host could not be resolved. Check the configured hostname and DNS.";
  }
  if (text.includes("econnrefused") || text.includes("etimedout") || text.includes("timeout")) {
    return "The SMTP server refused or timed out on the configured port.";
  }
  if (text.includes("certificate") || text.includes("tls") || text.includes("ssl")) {
    return "The TLS handshake failed. Check the encryption mode for this port.";
  }
  if (text.includes("quota") || text.includes("limit")) {
    return "The provider rejected the message because a sending limit was reached.";
  }
  return "SMTP verification failed. Check the server logs for the underlying error.";
}

router.get("/smtp/status", authenticateToken, requireRole(["admin"]), async (req, res) => {
  try {
    const verification = await verifySmtpConnection();
    const usingGmail = Boolean(process.env.GMAIL_USER);
    const configured = Boolean(verification.configured);
    res.json({
      configured,
      connected: Boolean(verification.connected),
      host: process.env.SMTP_HOST || (usingGmail ? "smtp.gmail.com" : null),
      port: Number(process.env.SMTP_PORT || (usingGmail ? 465 : 587)) || null,
      secure: String(process.env.SMTP_SECURE || (usingGmail ? "true" : "false")) === "true",
      relay: verification.relay || (usingGmail ? "Gmail service relay" : "Standard SMTP"),
      fromAddress: verification.fromAddress || null,
      message: configured
        ? verification.connected
          ? "Connection verified. Test messages will be sent through this relay."
          : describeSmtpFailure(verification.error || verification.message)
        : "SMTP is not configured on the server. Add provider credentials to the backend environment.",
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "The SMTP configuration could not be checked." });
  }
});

router.post("/smtp/test", authenticateToken, requireRole(["admin"]), async (req, res) => {
  const { recipient } = req.body;
  if (!recipient || !isValidEmail(recipient)) {
    return res.status(400).json({ error: "Enter a valid test recipient address." });
  }

  try {
    await sendTestEmail(recipient.trim().toLowerCase());
    await logAudit(req.user.id, "SMTP_TEST_EMAIL_SENT", "User", req.user.id, {
      recipient: recipient.trim().toLowerCase()
    });
    res.json({
      message: "The SMTP server accepted the test message. Inbox delivery depends on the provider and recipient."
    });
  } catch (err) {
    res.status(502).json({ error: describeSmtpFailure(err.message) });
  }
});

// POST /api/auth/refresh - Refresh access token with token rotation
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    const hashed = hashToken(refreshToken);
    const user = await User.findOne({ where: { refresh_token: hashed } });
    if (!user || user.is_active === false) {
      return res.status(403).json({ error: "Invalid or expired refresh token." });
    }

    // Rotate both tokens. The previous refresh token is immediately invalid.
    const tokens = await issueTokens(user);
    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: formatUserResponse(user)
    });
  } catch (err) {
    res.status(500).json({ error: "Token refresh failed." });
  }
});

// GET /api/auth/me - Current logged-in user profile with permissions & 2FA status
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "name",
        "email",
        "phone",
        "company_name",
        "title",
        "bio",
        "avatar_url",
        "cover_url",
        "role",
        "role_id",
        "is_active",
        "two_factor_enabled",
        "two_factor_secret",
        "google_id",
        "department",
        "country",
        "timezone",
        "language",
        "last_login_at",
        "createdAt"
      ]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      user: {
        ...formatUserResponse(user),
        department: user.department,
        country: user.country,
        timezone: user.timezone,
        language: user.language,
        lastLoginAt: user.last_login_at,
        createdAt: user.createdAt,
        permissions: req.user.permissions,
        permissionList: [...req.user.effectivePermissions.permissions]
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

// GET /api/auth/users - List system users for assigning tasks, deals, owners
router.get("/users", authenticateToken, async (req, res) => {
  try {
    // Minimal directory for assignment controls. Full access details live in
    // /api/access/users and require users.view.
    const users = await User.findAll({
      where: { is_active: true },
      attributes: ["id", "name", "title", "avatar_url", "role"],
      order: [["name", "ASC"]]
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user list." });
  }
});

// GET /api/auth/roles - List role summaries for authorised administrators
router.get("/roles", authenticateToken, requirePermission(["roles.view", "users.view"]), async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "role_name", "display_name", "description", "is_system", "permissions_json"]
    });
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

// POST /api/auth/setup-admin - Explicit first-run administrator provisioning flow
// Automatically locked down permanently once an administrator exists.
router.post("/setup-admin", authLimiter, async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ where: { role: "admin" } });
    if (existingAdmin) {
      return res.status(403).json({
        error: "Forbidden: First-run administrator provisioning is locked. An administrator account already exists."
      });
    }

    let { name, email, password } = req.body;
    name = sanitizeString(name);
    email = sanitizeString(email)?.toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required for initial administrator setup." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const passCheck = validatePasswordStrength(password);
    if (!passCheck.valid) {
      return res.status(400).json({ error: passCheck.message });
    }

    const adminRole = await Role.findOne({ where: { role_name: "admin" } });
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      role_id: adminRole ? adminRole.id : 1,
      two_factor_enabled: false
    });

    const tokens = generateTokens(newAdmin);
    newAdmin.refresh_token = tokens.refreshToken;
    await newAdmin.save();

    await logAudit(newAdmin.id, "INITIAL_ADMIN_PROVISIONED", "User", newAdmin.id, { email: newAdmin.email });

    res.status(201).json({
      message: "First-run administrator account created successfully. Endpoint is now permanently locked.",
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: "admin",
        twoFactorEnabled: false
      }
    });
  } catch (err) {
    console.error("Admin Setup Error:", err);
    res.status(500).json({ error: "Initial admin provisioning failed", details: err.message });
  }
});

// POST /api/auth/logout - Session revocation and token invalidation
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      user.refresh_token = null;
      // Bumping the version invalidates the current access token and every
      // other still-unexpired access token for this account immediately.
      user.token_version = Number(user.token_version || 0) + 1;
      await user.save();
      await logAudit(user.id, "USER_LOGOUT", "Auth", user.id, {
        email: user.email,
        allAccessTokensRevoked: true
      });
    }
    res.json({ message: "Session successfully terminated and revoked." });
  } catch (err) {
    res.status(500).json({ error: "Logout failed", details: err.message });
  }
});

// GET /api/auth/sessions - Inspect active session details for security center
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "two_factor_enabled", "updatedAt"]
    });

    res.json({
      sessions: [
        {
          id: `jwt-${user.id}`,
          ip: req.ip || "unknown",
          userAgent: req.headers["user-agent"] || "Web Browser",
          lastActive: user.last_login_at || user.updatedAt,
          current: true,
          twoFactorActive: Boolean(user.two_factor_enabled),
          revocation: "Server-enforced token version"
        }
      ],
      note: "Access tokens are revalidated against the account on every request. Revoking sessions is immediate."
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve active sessions." });
  }
});

// GET /api/auth/users - List team members (for task assignment, mentions, etc.)
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "avatar_url", "title"],
      order: [["name", "ASC"]]
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to list users", details: err.message });
  }
});

export default router;
