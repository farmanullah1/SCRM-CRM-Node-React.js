import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const WHATSAPP_MEDIA_DIR = "whatsapp";
export const DEFAULT_INBOUND_MEDIA_MAX_BYTES = 15 * 1024 * 1024;

const MEDIA_TYPES = new Map([
  ["image/jpeg", { extension: ".jpg", kind: "image" }],
  ["image/png", { extension: ".png", kind: "image" }],
  ["image/webp", { extension: ".webp", kind: "image" }],
  ["image/gif", { extension: ".gif", kind: "image" }],
  ["audio/ogg", { extension: ".ogg", kind: "audio" }],
  ["audio/mpeg", { extension: ".mp3", kind: "audio" }],
  ["audio/mp4", { extension: ".m4a", kind: "audio" }],
  ["audio/aac", { extension: ".aac", kind: "audio" }],
  ["audio/amr", { extension: ".amr", kind: "audio" }],
  ["audio/wav", { extension: ".wav", kind: "audio" }],
  ["audio/x-wav", { extension: ".wav", kind: "audio" }],
  ["application/pdf", { extension: ".pdf", kind: "document" }],
  ["text/plain", { extension: ".txt", kind: "document" }],
  ["text/csv", { extension: ".csv", kind: "document" }],
  ["application/csv", { extension: ".csv", kind: "document" }],
  ["application/msword", { extension: ".doc", kind: "document" }],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    { extension: ".docx", kind: "document" }
  ],
  ["application/vnd.ms-excel", { extension: ".xls", kind: "document" }],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    { extension: ".xlsx", kind: "document" }
  ],
  [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    { extension: ".pptx", kind: "document" }
  ],
  ["application/zip", { extension: ".zip", kind: "document" }]
]);

const EXTENSION_MIME = new Map(
  [...MEDIA_TYPES.entries()].map(([mime, info]) => [info.extension.slice(1), mime])
);

export class MediaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MediaError";
    this.code = code;
  }
}

export function normalizeMediaMime(value) {
  return String(value || "").toLowerCase().split(";")[0].trim();
}

export function resolveMediaInfo(mimetype, filename = "") {
  let mime = normalizeMediaMime(mimetype);
  const extension = path.extname(safeDisplayFilename(filename)).toLowerCase().slice(1);

  if ((!mime || mime === "application/octet-stream") && extension && EXTENSION_MIME.has(extension)) {
    mime = EXTENSION_MIME.get(extension);
  }

  const info = MEDIA_TYPES.get(mime);
  return info ? { mime, ...info } : null;
}

export function safeDisplayFilename(input, fallbackExtension = ".bin") {
  const raw = String(input || "")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f<>:"/\\|?*]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return raw || `whatsapp-media${fallbackExtension}`;
}

export function decodeBase64Media(data, maxBytes = DEFAULT_INBOUND_MEDIA_MAX_BYTES) {
  const raw = String(data || "")
    .replace(/^data:[^;]+;base64,/i, "")
    .replace(/\s+/g, "");
  if (!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) {
    throw new MediaError("INVALID_MEDIA_DATA", "The media payload is empty or malformed.");
  }

  const padding = raw.endsWith("==") ? 2 : raw.endsWith("=") ? 1 : 0;
  const estimatedBytes = Math.floor((raw.length * 3) / 4) - padding;
  if (estimatedBytes > maxBytes) {
    throw new MediaError("MEDIA_TOO_LARGE", `The media file exceeds the ${maxBytes} byte limit.`);
  }

  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length) {
    throw new MediaError("INVALID_MEDIA_DATA", "The media payload is empty or malformed.");
  }
  if (buffer.length > maxBytes) {
    throw new MediaError("MEDIA_TOO_LARGE", `The media file exceeds the ${maxBytes} byte limit.`);
  }
  return buffer;
}

export function mediaPathFor(mediaPath) {
  const name = path.basename(String(mediaPath || ""));
  if (!name || name !== String(mediaPath || "").replace(/^whatsapp[\\/]/, "")) {
    throw new MediaError("INVALID_MEDIA_PATH", "The stored media path is invalid.");
  }
  return name;
}

export async function saveInboundMedia({
  data,
  mimetype,
  filename,
  messageId,
  uploadsRoot,
  maxBytes = DEFAULT_INBOUND_MEDIA_MAX_BYTES
}) {
  const info = resolveMediaInfo(mimetype, filename);
  if (!info) {
    throw new MediaError("UNSUPPORTED_MEDIA_TYPE", "That media type is not safe to store or preview.");
  }

  const buffer = decodeBase64Media(data, maxBytes);
  const directory = path.join(uploadsRoot, WHATSAPP_MEDIA_DIR);
  await fs.mkdir(directory, { recursive: true });

  const storedName = `${crypto.randomUUID()}${info.extension}`;
  const absolutePath = path.join(directory, storedName);
  await fs.writeFile(absolutePath, buffer, { flag: "wx", mode: 0o640 });

  const fallback = `whatsapp-${String(messageId || Date.now()).replace(/[^A-Za-z0-9_-]/g, "").slice(-24) || "media"}`;
  let displayName = safeDisplayFilename(filename || fallback, info.extension);
  if (path.extname(displayName).toLowerCase() !== info.extension) {
    displayName = `${displayName.replace(/\.[^.]+$/, "")}${info.extension}`;
  }

  return {
    media_path: `${WHATSAPP_MEDIA_DIR}/${storedName}`,
    media_mimetype: info.mime,
    media_filename: displayName,
    media_size: buffer.length,
    media_kind: info.kind
  };
}

export async function removeInboundMedia(mediaPath, uploadsRoot) {
  if (!mediaPath) return;
  try {
    const storedName = mediaPathFor(mediaPath);
    await fs.unlink(path.join(uploadsRoot, WHATSAPP_MEDIA_DIR, storedName));
  } catch (err) {
    if (err.code !== "ENOENT" && err.code !== "INVALID_MEDIA_PATH") {
      throw err;
    }
  }
}
