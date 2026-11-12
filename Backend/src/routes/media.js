import express from "express";
import crypto from "crypto";
import { User, ActivityLog } from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function imageKitConfig() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || process.env.imageKit_public || "";
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || process.env.imageKit_private || "";
  const rawEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || process.env.imagekit_name || "";
  const urlEndpoint = /^https:\/\//i.test(rawEndpoint) ? rawEndpoint.replace(/\/+$/, "") : "";
  return { publicKey, privateKey, urlEndpoint, configured: Boolean(publicKey && privateKey) };
}

router.get("/status", authenticateToken, (req, res) => {
  const { configured, urlEndpoint } = imageKitConfig();
  res.json({
    configured,
    provider: "imagekit",
    urlEndpoint: urlEndpoint || null
  });
});

/**
 * Short-lived signature for direct browser-to-ImageKit uploads.
 * The private key never leaves the server.
 */
router.post("/imagekit/auth", authenticateToken, (req, res) => {
  const { publicKey, privateKey, urlEndpoint, configured } = imageKitConfig();
  if (!configured) {
    return res.status(503).json({
      error: "ImageKit is not configured on this server. Add IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY."
    });
  }

  const kind = req.body?.kind === "cover" ? "cover" : "avatar";
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 10 * 60;
  const signature = crypto
    .createHmac("sha1", privateKey)
    .update(token + expire)
    .digest("hex");

  res.json({
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint: urlEndpoint || null,
    folder: kind === "cover" ? "/scrm/covers" : "/scrm/avatars"
  });
});

function isAllowedImageKitUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const { urlEndpoint } = imageKitConfig();
    if (urlEndpoint && value.startsWith(`${urlEndpoint}/`)) {
      return /\/(scrm\/avatars|scrm\/covers)\//.test(url.pathname);
    }
    return url.hostname === "ik.imagekit.io" && /\/(scrm\/avatars|scrm\/covers)\//.test(url.pathname);
  } catch {
    return false;
  }
}

async function saveExternalProfileImage(req, res, kind) {
  const { url, fileId } = req.body || {};
  if (!url || !isAllowedImageKitUrl(url)) {
    return res.status(400).json({ error: "A valid ImageKit upload URL is required." });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (kind === "avatar") user.avatar_url = url;
    else user.cover_url = url;
    await user.save();

    await ActivityLog.create({
      user_id: user.id,
      action: kind === "avatar" ? "PROFILE_AVATAR_UPDATED" : "PROFILE_COVER_UPDATED",
      target_type: "User",
      target_id: user.id,
      details_json: JSON.stringify({ provider: "imagekit", fileId: fileId || null })
    });

    res.json({
      message: kind === "avatar" ? "Profile photo updated." : "Cover photo updated.",
      [`${kind}_url`]: url
    });
  } catch (error) {
    console.error("[ImageKit profile update]", error.message);
    res.status(500).json({ error: "The image reference could not be saved." });
  }
}

router.post("/profile/avatar", authenticateToken, (req, res) => saveExternalProfileImage(req, res, "avatar"));
router.post("/profile/cover", authenticateToken, (req, res) => saveExternalProfileImage(req, res, "cover"));

export default router;
