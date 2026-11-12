import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const int = (value, fallback) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const root = path.resolve(__dirname, "../..");

export const whatsappConfig = {
  enabled: process.env.WHATSAPP_ENABLED !== "false",
  clientId: process.env.WA_CLIENT_ID || "default",
  sessionDir: process.env.WA_SESSION_DIR
    ? path.resolve(process.env.WA_SESSION_DIR)
    : path.join(root, ".wwebjs_auth"),
  chromePath: process.env.WA_CHROME_PATH || process.env.CHROME_PATH || undefined,
  headless: process.env.WA_HEADLESS !== "false",
  defaultCountryCode: (process.env.WA_DEFAULT_COUNTRY_CODE || process.env.DEFAULT_COUNTRY_CODE || "").replace(/\D/g, ""),
  sendDelayMs: int(process.env.WA_SEND_DELAY_MS || process.env.SEND_DELAY_MS, 1000),
  sendJitterMs: int(process.env.WA_SEND_JITTER_MS || process.env.SEND_JITTER_MS, 500),
  sendTimeoutMs: int(process.env.WA_SEND_TIMEOUT_MS || process.env.SEND_TIMEOUT_MS, 30000),
  maxQueueSize: int(process.env.WA_MAX_QUEUE_SIZE || process.env.MAX_QUEUE_SIZE, 1000),
  watchdogIntervalMs: int(process.env.WA_WATCHDOG_INTERVAL_MS || process.env.WATCHDOG_INTERVAL_MS, 60000),
  captureGroups: process.env.WA_CAPTURE_GROUPS === "true",
  captureNewsletters: process.env.WA_CAPTURE_NEWSLETTERS === "true"
};
