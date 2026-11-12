import { execFile } from "node:child_process";
import { EventEmitter } from "node:events";
import pkg from "whatsapp-web.js";
import QRCode from "qrcode";
import { whatsappConfig } from "./config.js";
import SendQueue from "./queue.js";
import { WhatsAppError, withTimeout } from "./errors.js";
import { normalizePhone, isChatId } from "./phone.js";

const { Client, LocalAuth, MessageMedia } = pkg;

const log = (...args) => console.log("[WhatsApp]", ...args);
const warn = (...args) => console.warn("[WhatsApp]", ...args);
const error = (...args) => console.error("[WhatsApp]", ...args);

export const WHATSAPP_STATE = {
  DISABLED: "DISABLED",
  STOPPED: "STOPPED",
  INITIALIZING: "INITIALIZING",
  QR: "WAITING_FOR_QR_SCAN",
  AUTHENTICATED: "AUTHENTICATED",
  READY: "READY",
  DISCONNECTED: "DISCONNECTED",
  AUTH_FAILURE: "AUTH_FAILURE"
};

const NUMBER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NUMBER_CACHE_MAX = 10000;
const MAX_RECONNECT_DELAY_MS = 60000;

class WhatsAppService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.started = false;
    this.state = whatsappConfig.enabled ? WHATSAPP_STATE.STOPPED : WHATSAPP_STATE.DISABLED;
    this.qr = null;
    this.readySince = null;
    this.lastDisconnectReason = null;
    this.lastError = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.watchdogTimer = null;
    this.watchdogFailures = 0;
    this.restarting = null;
    this.stopping = false;
    this.numberCache = new Map();
    this.queue = new SendQueue({
      delayMs: whatsappConfig.sendDelayMs,
      jitterMs: whatsappConfig.sendJitterMs,
      maxSize: whatsappConfig.maxQueueSize
    });
  }

  async start() {
    if (!whatsappConfig.enabled) {
      this.state = WHATSAPP_STATE.DISABLED;
      return;
    }
    if (this.started) return;
    this.started = true;
    this.stopping = false;
    this.#createClient();
    await this.#initialize();
    this.#startWatchdog();
  }

  async stop() {
    this.stopping = true;
    this.started = false;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.watchdogTimer);
    this.queue.clear(new WhatsAppError(503, "SHUTTING_DOWN", "Server is shutting down."));
    await this.#destroyClient();
    this.state = whatsappConfig.enabled ? WHATSAPP_STATE.STOPPED : WHATSAPP_STATE.DISABLED;
  }

  restart() {
    if (!whatsappConfig.enabled) {
      return Promise.reject(new WhatsAppError(503, "WHATSAPP_DISABLED", "WhatsApp integration is disabled."));
    }
    if (!this.restarting) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.restarting = (async () => {
        log("Restarting client");
        await this.#destroyClient();
        if (this.stopping) return;
        this.#createClient();
        await this.#initialize();
      })().finally(() => {
        this.restarting = null;
      });
    }
    return this.restarting;
  }

  async logout() {
    if (this.client && this.state === WHATSAPP_STATE.READY) {
      await withTimeout(this.client.logout(), 30000, "Logout").catch((err) =>
        warn("Logout did not complete cleanly:", err.message)
      );
    }
    this.numberCache.clear();
    await this.restart();
  }

  #createClient() {
    const client = new Client({
      authStrategy: new LocalAuth({ clientId: whatsappConfig.clientId, dataPath: whatsappConfig.sessionDir }),
      takeoverOnConflict: true,
      takeoverTimeoutMs: 10000,
      puppeteer: {
        headless: whatsappConfig.headless,
        executablePath: whatsappConfig.chromePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-extensions",
          "--no-first-run",
          "--no-default-browser-check"
        ]
      }
    });

    client.on("qr", (qr) => {
      this.state = WHATSAPP_STATE.QR;
      this.qr = qr;
      this.lastError = null;
      log("QR code ready — open WhatsApp in the CRM to link the device.");
      this.emit("session.qr", { state: this.state });
    });

    client.on("authenticated", () => {
      this.state = WHATSAPP_STATE.AUTHENTICATED;
      this.qr = null;
      this.lastError = null;
      log("Authenticated");
      this.emit("session.authenticated", {});
    });

    client.on("auth_failure", (msg) => {
      this.state = WHATSAPP_STATE.AUTH_FAILURE;
      this.lastError = msg;
      error("Authentication failed:", msg);
      this.emit("session.auth_failure", { message: msg });
      this.#scheduleReconnect();
    });

    client.on("ready", () => {
      this.state = WHATSAPP_STATE.READY;
      this.qr = null;
      this.readySince = new Date();
      this.reconnectAttempts = 0;
      this.watchdogFailures = 0;
      this.lastError = null;
      log(`Ready as ${client.info?.pushname || "unknown"} (${client.info?.wid?.user || "unknown"})`);
      this.emit("session.ready", {
        number: client.info?.wid?.user ?? null,
        name: client.info?.pushname ?? null
      });
      // This compatibility patch is best-effort and must never hold the session
      // in AUTHENTICATED if the injected page evaluation stalls.
      patchMsgKey(client).catch((err) => warn("Compatibility patch failed:", err.message));
    });

    client.on("change_state", (state) => log("Connection state:", state));

    client.on("disconnected", (reason) => {
      if (this.client !== client) return;
      this.state = WHATSAPP_STATE.DISCONNECTED;
      this.readySince = null;
      this.lastDisconnectReason = reason;
      warn("Disconnected:", reason);
      this.emit("session.disconnected", { reason });
      this.#scheduleReconnect();
    });

    client.on("message", (msg) => {
      if (msg.from === "status@broadcast") return;
      if (!whatsappConfig.captureGroups && msg.from?.endsWith("@g.us")) return;
      if (!whatsappConfig.captureNewsletters && msg.from?.endsWith("@newsletter")) return;
      this.emit("message.received", serializeMessage(msg));
    });

    client.on("message_ack", (msg, ack) => {
      this.emit("message.ack", { id: messageId(msg), to: msg.to, ack, status: ackName(ack) });
    });

    this.client = client;
  }

  async #initialize() {
    this.state = WHATSAPP_STATE.INITIALIZING;
    try {
      await this.client.initialize();
    } catch (err) {
      error("Failed to initialize:", err.message);
      this.lastError = err.message;
      this.state = WHATSAPP_STATE.DISCONNECTED;
      this.emit("session.error", { message: err.message });
      this.#scheduleReconnect();
    }
  }

  async #destroyClient() {
    const client = this.client;
    this.client = null;
    this.readySince = null;
    if (!client) return;
    client.removeAllListeners();
    const browserProcess = client.pupBrowser?.process();
    await withTimeout(client.destroy(), 15000, "Browser shutdown").catch((err) =>
      warn("Client destroy failed:", err.message)
    );
    if (browserProcess && browserProcess.exitCode === null && browserProcess.signalCode === null) {
      warn(`Browser still running after destroy (pid ${browserProcess.pid}) — killing it`);
      await killProcessTree(browserProcess);
    }
  }

  #scheduleReconnect() {
    if (this.stopping || this.reconnectTimer) return;
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, 2000 * 2 ** this.reconnectAttempts++);
    log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.restart().catch((err) => error("Restart failed:", err.message));
    }, delay);
  }

  #startWatchdog() {
    if (!whatsappConfig.watchdogIntervalMs) return;
    clearInterval(this.watchdogTimer);
    this.watchdogTimer = setInterval(async () => {
      if (this.state !== WHATSAPP_STATE.READY || !this.client || this.restarting) return;
      try {
        const state = await withTimeout(this.client.getState(), 15000, "Health check");
        this.watchdogFailures = state === "CONNECTED" ? 0 : this.watchdogFailures + 1;
        if (state !== "CONNECTED") warn("Health check state:", state);
      } catch (err) {
        this.watchdogFailures += 1;
        warn("Health check failed:", err.message);
      }
      if (this.watchdogFailures >= 3) {
        this.watchdogFailures = 0;
        this.restart().catch((err) => error("Watchdog restart failed:", err.message));
      }
    }, whatsappConfig.watchdogIntervalMs);
    this.watchdogTimer.unref();
  }

  get isReady() {
    return this.state === WHATSAPP_STATE.READY && !!this.client;
  }

  ensureReady() {
    if (!whatsappConfig.enabled) {
      throw new WhatsAppError(503, "WHATSAPP_DISABLED", "WhatsApp integration is disabled.");
    }
    if (!this.isReady) {
      throw new WhatsAppError(503, "NOT_READY", `WhatsApp is not ready (state: ${this.state}).`, {
        state: this.state
      });
    }
  }

  status() {
    const info = this.isReady ? this.client.info : null;
    return {
      enabled: whatsappConfig.enabled,
      state: this.state,
      ready: this.isReady,
      number: info?.wid?.user ?? null,
      name: info?.pushname ?? null,
      readySince: this.readySince,
      lastDisconnectReason: this.lastDisconnectReason,
      lastError: this.lastError,
      queueSize: this.queue.size,
      hasQr: !!this.qr
    };
  }

  async qrDataUrl() {
    if (!this.qr) return null;
    return QRCode.toDataURL(this.qr, { width: 420, margin: 2 });
  }

  async qrPng() {
    if (!this.qr) return null;
    return QRCode.toBuffer(this.qr, { width: 420, margin: 2 });
  }

  async lookupNumber(input) {
    this.ensureReady();
    const number = normalizePhone(input, whatsappConfig.defaultCountryCode);
    const cached = this.numberCache.get(number);
    if (cached && cached.expires > Date.now()) return cached.chatId;

    const id = await withTimeout(this.client.getNumberId(number), 15000, "Number lookup");
    const chatId = id ? `${number}@c.us` : null;

    if (this.numberCache.size >= NUMBER_CACHE_MAX) {
      this.numberCache.delete(this.numberCache.keys().next().value);
    }
    this.numberCache.set(number, { chatId, expires: Date.now() + NUMBER_CACHE_TTL_MS });
    return chatId;
  }

  async resolveChatId(to) {
    if (isChatId(to)) return String(to).trim();
    const chatId = await this.lookupNumber(to);
    if (!chatId) {
      throw new WhatsAppError(404, "NOT_ON_WHATSAPP", `${to} is not registered on WhatsApp.`);
    }
    return chatId;
  }

  async sendText(to, text, { quotedMessageId } = {}) {
    this.ensureReady();
    const chatId = await this.resolveChatId(to);
    return this.#enqueueSend(chatId, text, { quotedMessageId });
  }

  async sendMedia(to, { url, base64, mimetype, filename, caption, asDocument, quotedMessageId }) {
    this.ensureReady();
    const chatId = await this.resolveChatId(to);

    let media;
    if (url) {
      media = await withTimeout(
        MessageMedia.fromUrl(url, { unsafeMime: true, filename }),
        whatsappConfig.sendTimeoutMs,
        "Media download"
      ).catch((err) => {
        if (err instanceof WhatsAppError) throw err;
        throw new WhatsAppError(422, "MEDIA_DOWNLOAD_FAILED", `Could not download media: ${err.message}`);
      });
    } else {
      media = new MessageMedia(mimetype, base64.replace(/^data:[^;]+;base64,/, ""), filename || null);
    }

    return this.#enqueueSend(chatId, media, {
      caption,
      sendMediaAsDocument: !!asDocument,
      quotedMessageId
    });
  }

  #enqueueSend(chatId, content, options) {
    return this.queue.push(async () => {
      this.ensureReady();
      const startedAt = Math.floor(Date.now() / 1000);
      let msg = await withTimeout(
        this.client.sendMessage(chatId, content, stripUndefined(options)),
        whatsappConfig.sendTimeoutMs,
        "Send"
      );

      if (!msg) {
        msg = await this.#findSentMessage(chatId, content, startedAt);
        if (!msg) {
          throw new WhatsAppError(
            502,
            "SEND_UNCONFIRMED",
            "WhatsApp did not confirm the message. Check the chat before retrying to avoid duplicates."
          );
        }
      }
      return { id: messageId(msg), to: chatId, timestamp: msg.timestamp };
    });
  }

  async #findSentMessage(chatId, content, startedAt) {
    try {
      const chat = await withTimeout(this.client.getChatById(chatId), 10000, "Chat lookup");
      const recent = await withTimeout(chat.fetchMessages({ limit: 10, fromMe: true }), 10000, "History lookup");
      const isText = typeof content === "string";
      return (
        recent
          .reverse()
          .find((m) => m.timestamp >= startedAt - 5 && (isText ? m.body === content : m.hasMedia)) ?? null
      );
    } catch (err) {
      warn("Could not verify sent message:", err.message);
      return null;
    }
  }
}

async function patchMsgKey(client) {
  try {
    const patched = await client.pupPage.evaluate(() => {
      const proto = window.require("WAWebMsgKey")?.prototype;
      if (!proto || "_serialized" in proto) return false;
      Object.defineProperty(proto, "_serialized", {
        configurable: true,
        get() {
          return this.toString();
        },
        set(value) {
          Object.defineProperty(this, "_serialized", {
            value,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      });
      return true;
    });
    if (patched) log("Applied MsgKey._serialized compatibility patch");
  } catch (err) {
    warn("Could not apply MsgKey compatibility patch:", err.message);
  }
}

function messageId(msg) {
  const id = msg?.id;
  if (!id) return null;
  if (typeof id === "string") return id;
  if (id._serialized) return id._serialized;
  if (typeof id.$1 === "string") return id.$1;
  const wid = (w) => (typeof w === "string" ? w : w?._serialized || (w?.user ? `${w.user}@${w.server}` : ""));
  const parts = [String(!!id.fromMe), wid(id.remote), id.id];
  if (id.participant) parts.push(wid(id.participant));
  return parts.join("_");
}

function serializeMessage(msg) {
  return {
    id: messageId(msg),
    from: msg.from,
    to: msg.to,
    author: msg.author ?? null,
    isGroup: msg.from?.endsWith("@g.us") ?? false,
    type: msg.type,
    body: msg.body,
    hasMedia: msg.hasMedia,
    timestamp: msg.timestamp,
    notifyName: msg._data?.notifyName ?? null
  };
}

function ackName(ack) {
  return { [-1]: "error", 0: "pending", 1: "sent", 2: "delivered", 3: "read", 4: "played" }[ack] ?? "unknown";
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}

function killProcessTree(proc) {
  return new Promise((resolve) => {
    const done = (err) => {
      if (err) warn(`Could not kill browser process ${proc.pid}:`, err.message);
      resolve();
    };
    if (process.platform === "win32") {
      execFile("taskkill", ["/PID", String(proc.pid), "/T", "/F"], { windowsHide: true }, done);
    } else {
      try {
        proc.kill("SIGKILL");
        done();
      } catch (err) {
        done(err);
      }
    }
  });
}

export const whatsapp = new WhatsAppService();
export default whatsapp;
