import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  MediaError,
  decodeBase64Media,
  mediaPathFor,
  removeInboundMedia,
  resolveMediaInfo,
  safeDisplayFilename,
  saveInboundMedia
} from "../src/whatsapp/media.js";

async function withTempRoot(fn) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "scrm-wa-media-"));
  try {
    return await fn(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test("stores a supported image with a safe filename and retrievable bytes", async () => {
  await withTempRoot(async (root) => {
    const bytes = Buffer.from("89504e470d0a1a0a", "hex");
    const saved = await saveInboundMedia({
      data: bytes.toString("base64"),
      mimetype: "image/png",
      filename: "../../customer photo.PNG",
      messageId: "false_923001234567@c.us_ABC",
      uploadsRoot: root
    });

    assert.equal(saved.media_mimetype, "image/png");
    assert.equal(saved.media_filename, "customer photo.PNG");
    assert.equal(saved.media_kind, "image");
    assert.equal(saved.media_size, bytes.length);
    assert.match(saved.media_path, /^whatsapp\/[a-f0-9-]+\.png$/i);
    assert.deepEqual(await fs.readFile(path.join(root, saved.media_path)), bytes);
  });
});

test("preserves audio MIME parameters and stores an audio clip", async () => {
  await withTempRoot(async (root) => {
    const saved = await saveInboundMedia({
      data: Buffer.from("OggS").toString("base64"),
      mimetype: "audio/ogg; codecs=opus",
      filename: "voice-note.ogg",
      messageId: "voice-1",
      uploadsRoot: root
    });

    assert.equal(saved.media_mimetype, "audio/ogg");
    assert.equal(saved.media_kind, "audio");
    assert.match(saved.media_path, /\.ogg$/);
  });
});

test("infers a document type from the extension when WhatsApp sends octet-stream", async () => {
  const info = resolveMediaInfo("application/octet-stream", "Invoice 42.pdf");
  assert.equal(info.mime, "application/pdf");
  assert.equal(info.kind, "document");
});

test("rejects executable and markup media types", async () => {
  assert.equal(resolveMediaInfo("text/html", "invoice.html"), null);
  assert.equal(resolveMediaInfo("image/svg+xml", "logo.svg"), null);

  await withTempRoot(async (root) => {
    await assert.rejects(
      saveInboundMedia({
        data: Buffer.from("<svg/>").toString("base64"),
        mimetype: "image/svg+xml",
        filename: "logo.svg",
        messageId: "unsafe",
        uploadsRoot: root,
        maxBytes: 100
      }),
      (err) => err instanceof MediaError && err.code === "UNSUPPORTED_MEDIA_TYPE"
    );
  });
});

test("rejects media that exceeds the configured byte limit", async () => {
  assert.throws(
    () => decodeBase64Media(Buffer.alloc(5).toString("base64"), 4),
    (err) => err instanceof MediaError && err.code === "MEDIA_TOO_LARGE"
  );

  await withTempRoot(async (root) => {
    await assert.rejects(
      saveInboundMedia({
        data: Buffer.alloc(5).toString("base64"),
        mimetype: "image/png",
        filename: "large.png",
        messageId: "large",
        uploadsRoot: root,
        maxBytes: 4
      }),
      (err) => err instanceof MediaError && err.code === "MEDIA_TOO_LARGE"
    );
  });
});

test("rejects traversal paths and removes stored media safely", async () => {
  assert.throws(
    () => mediaPathFor("../outside.png"),
    (err) => err instanceof MediaError && err.code === "INVALID_MEDIA_PATH"
  );

  await withTempRoot(async (root) => {
    const saved = await saveInboundMedia({
      data: Buffer.from("hello").toString("base64"),
      mimetype: "text/plain",
      filename: "notes.txt",
      messageId: "text-1",
      uploadsRoot: root
    });
    const absolute = path.join(root, saved.media_path);
    assert.equal(await fs.stat(absolute).then(() => true), true);

    await removeInboundMedia(saved.media_path, root);
    await assert.rejects(fs.stat(absolute), /ENOENT/);
  });
});

test("strips path separators from display names", () => {
  assert.equal(safeDisplayFilename("..\\..\\private\\report.pdf"), "report.pdf");
  assert.equal(safeDisplayFilename("", ".pdf"), "whatsapp-media.pdf");
});
