import { WhatsAppError } from "./errors.js";

const CHAT_ID_RE = /^[\w.-]+@(c\.us|g\.us|lid|newsletter)$/;

export const isChatId = (value) => CHAT_ID_RE.test(String(value).trim());

/**
 * Turns user input like "+92 300 1234567", "0092300...", or "0300 1234567"
 * (with a default country code) into "923001234567".
 */
export function normalizePhone(input, defaultCountryCode = "") {
  const raw = String(input ?? "").trim();
  let digits = raw.replace(/\D/g, "");

  if (!raw.startsWith("+")) {
    if (digits.startsWith("00")) {
      digits = digits.slice(2);
    } else if (defaultCountryCode && digits.startsWith("0")) {
      digits = defaultCountryCode + digits.slice(1);
    }
  }

  if (digits.length < 8 || digits.length > 15) {
    throw new WhatsAppError(
      400,
      "INVALID_NUMBER",
      `"${raw}" is not a valid phone number. Use international format, e.g. 923001234567.`
    );
  }
  return digits;
}
