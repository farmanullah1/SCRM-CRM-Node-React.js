import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, isChatId } from "../src/whatsapp/phone.js";

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
