import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("../services/api", () => ({
  loginUser: vi.fn(),
  signupUser: vi.fn(),
  getCurrentUser: vi.fn(),
  verify2FALogin: vi.fn(),
  verify2FARecovery: vi.fn(),
  loginWithGoogle: vi.fn(),
  logoutUser: vi.fn()
}));

import { AuthProvider, useAuth } from "../context/AuthContext";
import { getCurrentUser, loginUser, logoutUser } from "../services/api";

const user = {
  id: 7,
  name: "Cookie Session User",
  email: "cookie-session@example.com",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["leads.view"]
};

function SessionProbe() {
  const { user: currentUser, login, logout, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return (
    <div>
      <span>{currentUser ? currentUser.email : "signed out"}</span>
      <button type="button" onClick={() => login("cookie-session@example.com", "Password!2026")}>
        Sign in
      </button>
      <button type="button" onClick={() => logout()}>
        Sign out
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  getCurrentUser
    .mockRejectedValueOnce(new Error("no session"))
    .mockResolvedValue({ user });
  loginUser.mockResolvedValue({
    user,
    token: "access-token-must-not-be-stored",
    refreshToken: "refresh-token-must-not-be-stored"
  });
  logoutUser.mockResolvedValue({ revoked: true });
});

describe("cookie-backed AuthContext", () => {
  it("does not persist login tokens and clears legacy localStorage tokens", async () => {
    localStorage.setItem("crm_token", "legacy-access-token");
    localStorage.setItem("crm_refresh_token", "legacy-refresh-token");

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>
    );

    await screen.findByText("signed out");
    expect(localStorage.getItem("crm_token")).toBeNull();
    expect(localStorage.getItem("crm_refresh_token")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(user.email);

    expect(localStorage.getItem("crm_user")).toContain(user.email);
    expect(localStorage.getItem("crm_token")).toBeNull();
    expect(localStorage.getItem("crm_refresh_token")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(screen.getByText("signed out")).toBeInTheDocument());
    expect(logoutUser).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("crm_user")).toBeNull();
    expect(localStorage.getItem("crm_token")).toBeNull();
    expect(localStorage.getItem("crm_refresh_token")).toBeNull();
  });
});
