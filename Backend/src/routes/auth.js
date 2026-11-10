import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, Role } from "../db.js";
import { authenticateToken, requireRole, logAudit } from "../middleware/auth.js";
import { authLimiter, sanitizeString, isValidEmail, validatePasswordStrength } from "../middleware/security.js";
import { 
  sendWelcomeEmail, 
  sendSecurityAlertEmail, 
  sendPasswordResetEmail, 
  send2FAVerificationEmail 
} from "../services/emailService.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_dev";
const ACCESS_TOKEN_EXPIRY = "2h";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const refreshToken = crypto.randomBytes(40).toString("hex");
  return { accessToken, refreshToken };
}

// POST /api/auth/signup - Register new account with high-salt hashing and automated Welcome Email
router.post("/signup", authLimiter, async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    name = sanitizeString(name);
    email = sanitizeString(email)?.toLowerCase();

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required." });
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

    // Default first user to admin, others to standard_user unless specified
    const totalUsers = await User.count();
    const assignedRole = totalUsers === 0 ? "admin" : (role && ["admin", "manager", "standard_user"].includes(role) ? role : "standard_user");
    
    // Find matching role_id from roles table
    const roleRecord = await Role.findOne({ where: { role_name: assignedRole } });
    const roleId = roleRecord ? roleRecord.id : null;

    // Enforce high salt rounds (12)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
      role_id: roleId,
      two_factor_enabled: false
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    await logAudit(user.id, "USER_SIGNUP", "User", user.id, { email: user.email, role: user.role });

    // System Trigger: Automated Welcome Email
    sendWelcomeEmail(user).catch(e => console.error("[Email Trigger Error]", e.message));

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        twoFactorEnabled: false
      }
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
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit(user.id, "LOGIN_FAILED", "Auth", user.id, { email });
      return res.status(401).json({ error: "Invalid email or password." });
    }

    // Check if user has Two-Factor Authentication (2FA) enabled
    if (user.two_factor_enabled) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.two_factor_code = otpCode;
      user.two_factor_expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
      await user.save();

      // Trigger 2FA Verification Email
      await send2FAVerificationEmail(user, otpCode);

      // Temporary token for 2FA validation step
      const tempToken = jwt.sign(
        { userId: user.id, twoFactorPending: true },
        JWT_SECRET,
        { expiresIn: "10m" }
      );

      return res.json({
        twoFactorRequired: true,
        tempToken,
        email: user.email,
        message: "Two-Factor Authentication code sent to your email."
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    await logAudit(user.id, "LOGIN_SUCCESS", "Auth", user.id, { email });

    res.json({
      message: "Login successful",
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        twoFactorEnabled: Boolean(user.two_factor_enabled)
      }
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        twoFactorEnabled: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: "2FA verification failed", details: err.message });
  }
});

// POST /api/auth/2fa/toggle - Enable or disable 2FA for logged in user
router.post("/2fa/toggle", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.two_factor_enabled = !user.two_factor_enabled;
    user.two_factor_code = null;
    await user.save();

    const statusStr = user.two_factor_enabled ? "ENABLED" : "DISABLED";
    await logAudit(user.id, "2FA_TOGGLED", "User", user.id, { status: statusStr });

    // System Trigger: Security Alert Email
    sendSecurityAlertEmail(user, {
      action: "Two-Factor Authentication Setting Changed",
      details: `2-Step verification is now ${statusStr} for your account.`
    }).catch(e => {});

    res.json({
      message: `Two-Factor Authentication is now ${statusStr}.`,
      twoFactorEnabled: Boolean(user.two_factor_enabled)
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to toggle 2FA" });
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

    const { name, currentPassword, newPassword } = req.body;
    let modifiedDetails = [];

    if (name) {
      user.name = sanitizeString(name);
      modifiedDetails.push("Name updated");
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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: Boolean(user.two_factor_enabled)
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
});

// POST /api/auth/refresh - Refresh access token with token rotation
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token is required." });
    }

    const user = await User.findOne({ where: { refresh_token: refreshToken } });
    if (!user) {
      return res.status(403).json({ error: "Invalid or expired refresh token." });
    }

    const tokens = generateTokens(user);
    user.refresh_token = tokens.refreshToken;
    await user.save();

    res.json({
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (err) {
    res.status(500).json({ error: "Token refresh failed." });
  }
});

// GET /api/auth/me - Current logged-in user profile with permissions & 2FA status
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "role_id", "two_factor_enabled", "createdAt"]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ 
      user: {
        ...user.toJSON(),
        twoFactorEnabled: Boolean(user.two_factor_enabled),
        permissions: req.user.permissions
      } 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

// GET /api/auth/users - List system users for assigning tasks, deals, owners
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ["id", "name", "email", "role", "createdAt"],
      order: [["name", "ASC"]]
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user list." });
  }
});

// GET /api/auth/roles - List system roles & permissions
router.get("/roles", authenticateToken, async (req, res) => {
  try {
    const roles = await Role.findAll();
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch roles." });
  }
});

export default router;
