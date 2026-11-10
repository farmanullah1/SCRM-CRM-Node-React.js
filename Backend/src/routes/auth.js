import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { User, Role } from "../db.js";
import { authenticateToken, requireRole, logAudit } from "../middleware/auth.js";
import { authLimiter, sanitizeString, isValidEmail, validatePasswordStrength } from "../middleware/security.js";

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

// POST /api/auth/signup - Register new account with high-salt hashing
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
      role_id: roleId
    });

    const { accessToken, refreshToken } = generateTokens(user);
    user.refresh_token = refreshToken;
    await user.save();

    await logAudit(user.id, "USER_SIGNUP", "User", user.id, { email: user.email, role: user.role });

    res.status(201).json({
      message: "User registered successfully",
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role_id: user.role_id
      }
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Registration failed", details: err.message });
  }
});

// POST /api/auth/login - Authenticate existing user with rate limiting
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
        role_id: user.role_id
      }
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// POST /api/auth/refresh - Refresh access token with refresh token rotation
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

// GET /api/auth/me - Current logged-in user profile with permissions
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "role_id", "createdAt"]
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ 
      user: {
        ...user.toJSON(),
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
