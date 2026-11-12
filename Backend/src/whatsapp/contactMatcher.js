import { tryNormalizePhone } from "./phone.js";

/**
 * Inbound WhatsApp numbers must match the full normalized phone number.
 * Comparing a suffix (for example the last nine digits) can attach a message
 * to a different person who happens to share that suffix.
 */
export function matchContactByPhone(contacts, incomingPhone, defaultCountryCode = "") {
  const target = tryNormalizePhone(incomingPhone, defaultCountryCode);
  if (!target) return null;

  return (
    contacts.find(
      (contact) => tryNormalizePhone(contact?.phone, defaultCountryCode) === target
    ) || null
  );
}

export function phoneMatchCandidates(phone, defaultCountryCode = "") {
  const normalized = tryNormalizePhone(phone, defaultCountryCode);
  if (!normalized) return null;
  return {
    normalized,
    suffix: normalized.slice(-4)
  };
}
