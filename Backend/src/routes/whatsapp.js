import express from "express";
import dns from "node:dns/promises";
import { Op } from "sequelize";
import { Contact, WhatsAppMessage, ActivityLog } from "../db.js";
import { authenticateToken, requirePermission, logAudit } from "../middleware/auth.js";
import { sanitizeString } from "../middleware/security.js";
import { createNotification } from "./notifications.js";
import whatsapp from "../whatsapp/service.js";
import { whatsappConfig } from "../whatsapp/config.js";
import { normalizePhone, isChatId } from "../whatsapp/phone.js";
import { WhatsAppError } from "../whatsapp/errors.js";

const router = express.Router();
router.use(authenticateToken);

function phoneFromChatId(chatId) {
  return String(chatId || "").split("@")[0].replace(/\D/g, "");
}

async function findContactByChatId(chatId) {
  if (!chatId || !String(chatId).endsWith("@c.us")) return null;
  const digits = phoneFromChatId(chatId);
  if (digits.length < 8) return null;
  return Contact.findOne({
    where: { phone: { [Op.like]: `%${digits.slice(-9)}%` } },
    order: [["id", "ASC"]]
  }).catch(() => null);
}

async function handleIncomingMessage(payload) {
  if (!payload?.id) return;
  const existing = await WhatsAppMessage.findOne({ where: { external_id: payload.id } });
  if (existing) return;

  const contact = payload.isGroup ? null : await findContactByChatId(payload.from);
  const ownerId = contact?.owner_id || contact?.userId || null;
  const phone = payload.isGroup ? null : phoneFromChatId(payload.from);

  const message = await WhatsAppMessage.create({
    user_id: ownerId,
    contact_id: contact?.id ?? null,
    direction: "Inbound",
    phone,
    chat_id: payload.from,
    body: payload.body || (payload.hasMedia ? "[media message]" : ""),
    message_type: payload.type || "chat",
    media_mimetype: null,
    media_filename: null,
    status: "Received",
    external_id: payload.id
  });

  await ActivityLog.create({
    user_id: ownerId,
    action: "WHATSAPP_RECEIVED",
    target_type: "Contact",
    target_id: contact?.id ?? null,
    details_json: JSON.stringify({
      phone,
      from: payload.from,
      preview: String(payload.body || "").slice(0, 180)
    })
  }).catch(() => null);

  if (ownerId && payload.body) {
    await createNotification({
      userId: ownerId,
      type: "whatsapp",
      title: `WhatsApp from ${contact?.name || payload.notifyName || phone || "unknown"}`,
      body: String(payload.body).slice(0, 500),
      link: "/app/whatsapp"
    });
  }

  return message;
}

whatsapp.on("message.received", (payload) => {
  handleIncomingMessage(payload).catch((err) => console.error("[WhatsApp] Incoming message log failed:", err.message));
});

whatsapp.on("message.ack", async (payload) => {
  if (!payload?.id) return;
  try {
    await WhatsAppMessage.update(
      { status: payload.status || "Unknown", error_message: null },
      { where: { external_id: payload.id, direction: "Outbound" } }
    );
  } catch (err) {
    console.error("[WhatsApp] Delivery receipt update failed:", err.message);
  }
});

function sendError(res, err) {
  const known = err instanceof WhatsAppError;
  const status = known ? err.status : 500;
  if (!known) console.error("[WhatsApp] Send failed:", err);
  res.status(status).json({
    error: known ? err.message : "WhatsApp could not send the message.",
    code: known ? err.code : "WHATSAPP_SEND_FAILED",
    ...(known && err.details ? { details: err.details } : {})
  });
}

function isPrivateIp(address) {
  const ip = String(address || "").replace(/^::ffff:/, "");
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80:")) return true;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    parts[0] === 0 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
}

async function assertPublicMediaUrl(urlString) {
  const url = new URL(urlString);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new WhatsAppError(400, "VALIDATION_ERROR", "Media URL must use http or https.");
  }
  if (["localhost", "metadata.google.internal"].includes(url.hostname.toLowerCase())) {
    throw new WhatsAppError(400, "INVALID_MEDIA_URL", "Media URL must be publicly reachable.");
  }
  const addresses = await dns.lookup(url.hostname, { all: true }).catch(() => {
    throw new WhatsAppError(400, "INVALID_MEDIA_URL", "Media host could not be resolved.");
  });
  if (!addresses.length || addresses.some((entry) => isPrivateIp(entry.address))) {
    throw new WhatsAppError(400, "INVALID_MEDIA_URL", "Media URL must be publicly reachable.");
  }
  return url.toString();
}

async function resolveContact(contactId, user) {
  if (!contactId) return null;
  const contact = await Contact.findByPk(contactId);
  if (!contact) throw new WhatsAppError(404, "CONTACT_NOT_FOUND", "Contact not found.");
  return contact;
}

async function logOutbound({ user, contact, phone, chatId, body, type, result, media = {} }) {
  return WhatsAppMessage.create({
    user_id: user.id,
    contact_id: contact?.id ?? null,
    direction: "Outbound",
    phone,
    chat_id: chatId || result?.to || null,
    body: body || media.filename || "[media message]",
    message_type: type,
    media_mimetype: media.mimetype || null,
    media_filename: media.filename || null,
    status: "Sent",
    external_id: result?.id ?? null
  });
}

// GET /api/whatsapp/status
router.get("/status", requirePermission("whatsapp.view"), (req, res) => {
  res.set("Cache-Control", "private, no-store");
  res.json({ status: whatsapp.status() });
});

// GET /api/whatsapp/qr — returns a short-lived QR data URL for linking the device
router.get("/qr", requirePermission("whatsapp.manage"), async (req, res) => {
  try {
    if (whatsapp.isReady) {
      return res.status(409).json({ error: "WhatsApp is already connected." });
    }
    const qr = await whatsapp.qrDataUrl();
    if (!qr) {
      return res.status(404).json({
        error: `No QR code yet (state: ${whatsapp.status().state}). Retry in a few seconds.`
      });
    }
    res.set("Cache-Control", "no-store");
    res.json({ qr });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/session/restart
router.post("/session/restart", requirePermission("whatsapp.manage"), async (req, res) => {
  try {
    whatsapp.restart().catch((err) => console.error("[WhatsApp] Restart failed:", err.message));
    await logAudit(req.user.id, "WHATSAPP_RESTART", "Integration", null, {});
    res.status(202).json({ message: "WhatsApp restart initiated." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/whatsapp/session/logout
router.post("/session/logout", requirePermission("whatsapp.manage"), async (req, res) => {
  try {
    await whatsapp.logout();
    await logAudit(req.user.id, "WHATSAPP_LOGOUT", "Integration", null, {});
    res.json({ message: "WhatsApp unlinked. Scan the new QR code to connect again." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/whatsapp/check/:number
router.get("/check/:number", requirePermission("whatsapp.view"), async (req, res) => {
  try {
    const chatId = await whatsapp.lookupNumber(req.params.number);
    res.json({ exists: Boolean(chatId), chatId });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /api/whatsapp/messages
router.get("/messages", requirePermission("whatsapp.view"), async (req, res) => {
  try {
    const where = {};
    if (req.query.contactId) where.contact_id = req.query.contactId;
    if (req.query.direction && ["Inbound", "Outbound"].includes(req.query.direction)) {
      where.direction = req.query.direction;
    }
    if (req.query.search) {
      where.body = { [Op.like]: `%${sanitizeString(req.query.search).slice(0, 100)}%` };
    }

    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
    const messages = await WhatsAppMessage.findAll({
      where,
      order: [["id", "DESC"]],
      limit
    });

    const contactIds = [...new Set(messages.map((m) => m.contact_id).filter(Boolean))];
    const contacts = contactIds.length
      ? await Contact.findAll({ where: { id: { [Op.in]: contactIds } }, attributes: ["id", "name", "phone", "email"] })
      : [];
    const contactMap = new Map(contacts.map((c) => [c.id, c]));

    res.set("Cache-Control", "private, no-store");
    res.json({
      messages: messages.map((message) => ({
        ...message.toJSON(),
        contact: contactMap.get(message.contact_id) || null
      })),
      total: await WhatsAppMessage.count({ where })
    });
  } catch (err) {
    res.status(500).json({ error: "WhatsApp messages could not be loaded." });
  }
});

// POST /api/whatsapp/send
router.post("/send", requirePermission("whatsapp.send"), async (req, res) => {
  let contact = null;
  let phone = null;
  try {
    const contactId = req.body.contactId ? Number(req.body.contactId) : null;
    contact = await resolveContact(contactId, req.user);
    const rawTo = req.body.to || contact?.phone;
    const text = sanitizeString(req.body.message);

    if (!rawTo) {
      throw new WhatsAppError(400, "VALIDATION_ERROR", "A phone number or contact is required.");
    }
    if (!text) {
      throw new WhatsAppError(400, "VALIDATION_ERROR", "Message text is required.");
    }
    if (text.length > 65536) {
      throw new WhatsAppError(400, "VALIDATION_ERROR", "Message is too long.");
    }

    phone = isChatId(rawTo) ? phoneFromChatId(rawTo) : normalizePhone(rawTo, whatsappConfig.defaultCountryCode);
    const result = await whatsapp.sendText(isChatId(rawTo) ? rawTo : phone, text, {
      quotedMessageId: req.body.quotedMessageId ? String(req.body.quotedMessageId).slice(0, 200) : undefined
    });

    const log = await logOutbound({
      user: req.user,
      contact,
      phone,
      chatId: result.to,
      body: text,
      type: "chat",
      result
    });

    await logAudit(req.user.id, "WHATSAPP_SEND", "Contact", contact?.id ?? null, {
      phone,
      messageId: result.id,
      logId: log.id
    });

    res.status(201).json({ message: "WhatsApp message sent.", result, log });
  } catch (err) {
    if (phone && !(err instanceof WhatsAppError)) {
      await WhatsAppMessage.create({
        user_id: req.user.id,
        contact_id: contact?.id ?? null,
        direction: "Outbound",
        phone,
        body: sanitizeString(req.body.message)?.slice(0, 4000) || "",
        message_type: "chat",
        status: "Failed",
        error_message: err.message.slice(0, 1000)
      }).catch(() => null);
    }
    sendError(res, err);
  }
});

// POST /api/whatsapp/send-media
router.post("/send-media", requirePermission("whatsapp.send"), async (req, res) => {
  try {
    const contactId = req.body.contactId ? Number(req.body.contactId) : null;
    const contact = await resolveContact(contactId, req.user);
    const rawTo = req.body.to || contact?.phone;
    if (!rawTo) throw new WhatsAppError(400, "VALIDATION_ERROR", "A phone number or contact is required.");

    const url = req.body.url ? sanitizeString(req.body.url) : null;
    const base64 = req.body.base64 ? String(req.body.base64) : null;
    const mimetype = req.body.mimetype ? String(req.body.mimetype).slice(0, 120) : null;
    const filename = req.body.filename ? sanitizeString(req.body.filename).slice(0, 255) : null;
    if (!url && (!base64 || !mimetype)) {
      throw new WhatsAppError(400, "VALIDATION_ERROR", 'Provide either "url" or "base64" + "mimetype".');
    }
    const safeUrl = url ? await assertPublicMediaUrl(url) : null;

    const phone = isChatId(rawTo) ? phoneFromChatId(rawTo) : normalizePhone(rawTo, whatsappConfig.defaultCountryCode);
    const result = await whatsapp.sendMedia(isChatId(rawTo) ? rawTo : phone, {
      url: safeUrl || undefined,
      base64: base64 || undefined,
      mimetype: mimetype || undefined,
      filename: filename || undefined,
      caption: sanitizeString(req.body.caption) || undefined,
      asDocument: req.body.asDocument === true
    });

    const log = await logOutbound({
      user: req.user,
      contact,
      phone,
      chatId: result.to,
      body: sanitizeString(req.body.caption) || filename || "Media",
      type: "media",
      result,
      media: { mimetype, filename }
    });
    await logAudit(req.user.id, "WHATSAPP_SEND_MEDIA", "Contact", contact?.id ?? null, {
      phone,
      messageId: result.id,
      filename
    });
    res.status(201).json({ message: "WhatsApp media sent.", result, log });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
