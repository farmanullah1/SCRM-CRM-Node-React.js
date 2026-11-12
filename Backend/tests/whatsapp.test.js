import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, isChatId } from "../src/whatsapp/phone.js";
import { matchContactByPhone } from "../src/whatsapp/contactMatcher.js";

test("normalizes international WhatsApp numbers", () => {
  assert.equal(normalizePhone("+92 300 1234567"), "923001234567");
  assert.equal(normalizePhone("0092 300 1234567"), "923001234567");
  assert.equal(normalizePhone("0300 1234567", "92"), "923001234567");
});

test("rejects numbers that are too short or too long", () => {
  assert.throws(() => normalizePhone("123"), /not a valid phone number/);
  assert.throws(() => normalizePhone("1234567890123456"), /not a valid phone number/);
});

test("recognizes WhatsApp chat ids and rejects plain numbers", () => {
  assert.equal(isChatId("923001234567@c.us"), true);
  assert.equal(isChatId("120363000000000000@g.us"), true);
  assert.equal(isChatId("923001234567"), false);
});

test("matches inbound WhatsApp numbers by the full normalized number", () => {
  const contacts = [
    { id: 1, phone: "+92 551 234 567" },
    { id: 2, phone: "+1 (555) 123-4567" }
  ];

  // Both numbers share the final nine digits (551234567), but only id 2 is
  // the complete +1 555 123 4567 number.
  const match = matchContactByPhone(contacts, "15551234567", "92");
  assert.equal(match?.id, 2);
});

test("does not link an inbound number to a contact that only shares its suffix", () => {
  const contacts = [{ id: 1, phone: "+92 551 234 567" }];
  assert.equal(matchContactByPhone(contacts, "15551234567", "92"), null);
});

test("does not match malformed stored contact numbers", () => {
  const contacts = [{ id: 1, phone: "not-a-number" }];
  assert.equal(matchContactByPhone(contacts, "15551234567", "92"), null);
});
