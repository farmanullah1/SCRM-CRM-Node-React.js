import { describe, expect, it } from "vitest";
import { canManageAccess, hasPermission, isSectionBlocked } from "../utils/access";

const rep = {
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["leads.view", "contacts.view"]
};

describe("workspace access guard", () => {
  it("blocks a module URL the user has not been granted", () => {
    expect(isSectionBlocked("invoices", null, rep)).toBe(true);
    expect(isSectionBlocked("whatsapp", null, rep)).toBe(true);
  });

  it("allows only the granted module sections", () => {
    expect(isSectionBlocked("leads", null, rep)).toBe(false);
    expect(isSectionBlocked("contacts", null, rep)).toBe(false);
  });

  it("treats admins and wildcard permissions as full access", () => {
    expect(hasPermission({ permissions: { all: true } }, "users.edit")).toBe(true);
    expect(hasPermission({ permissionList: ["*"] }, "backup.manage")).toBe(true);
  });

  it("protects the access administration tab without users.view or users.edit", () => {
    expect(isSectionBlocked("settings", "access", rep)).toBe(true);
    expect(canManageAccess({ permissionList: ["users.view"] })).toBe(true);
    expect(canManageAccess({ permissionList: ["users.edit"] })).toBe(true);
    expect(isSectionBlocked("settings", "access", { permissionList: ["users.view"] })).toBe(false);
  });
});
