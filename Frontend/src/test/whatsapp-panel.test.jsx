import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WhatsAppPanel from "../components/WhatsAppPanel";

const authState = vi.hoisted(() => ({ user: null }));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: authState.user })
}));

vi.mock("../services/api", () => ({
  getWhatsAppStatus: vi.fn(),
  getWhatsAppQr: vi.fn(),
  getWhatsAppMessages: vi.fn(),
  getWhatsAppMediaBlob: vi.fn(),
  logoutWhatsApp: vi.fn(),
  restartWhatsApp: vi.fn(),
  sendWhatsAppMedia: vi.fn(),
  sendWhatsAppMessage: vi.fn()
}));

import * as api from "../services/api";

const admin = {
  name: "Workspace Admin",
  role: "admin",
  permissions: { all: true },
  permissionList: ["*"]
};

const viewer = {
  name: "Read-only Rep",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["whatsapp.view"]
};

const sender = {
  name: "Sales Rep",
  role: "standard_user",
  permissions: { all: false },
  permissionList: ["whatsapp.view", "whatsapp.send"]
};

const disconnectedStatus = {
  enabled: true,
  ready: false,
  state: "WAITING_FOR_QR_SCAN",
  queueSize: 0,
  name: null,
  number: null
};

const connectedStatus = {
  enabled: true,
  ready: true,
  state: "READY",
  queueSize: 0,
  name: "CRM Sales Line",
  number: "923001234567"
};

function renderPanel(user, contacts = []) {
  authState.user = user;
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={client}>
      <WhatsAppPanel contacts={contacts} showToast={() => {}} />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getWhatsAppMessages.mockResolvedValue({ messages: [], total: 0 });
  api.getWhatsAppQr.mockResolvedValue({ qr: "data:image/png;base64,iVBORw0KGgo=" });
  api.getWhatsAppStatus.mockResolvedValue({ status: disconnectedStatus });
  api.sendWhatsAppMessage.mockResolvedValue({ result: { to: "923001234567@c.us" } });
  api.sendWhatsAppMedia.mockResolvedValue({ result: { to: "923001234567@c.us" } });
});

afterEach(() => {
  cleanup();
});

describe("WhatsAppPanel", () => {
  it("shows the disconnected QR state for an administrator", async () => {
    renderPanel(admin);

    expect(
      await screen.findByRole("heading", { name: "Connect your WhatsApp number" })
    ).toBeInTheDocument();
    expect(await screen.findByAltText("WhatsApp device linking QR code")).toBeInTheDocument();
    expect(screen.getByText("Waiting for QR scan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restart/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unlink/i })).not.toBeInTheDocument();
    expect(api.getWhatsAppQr).toHaveBeenCalled();
  });

  it("enables the compose form when WhatsApp is connected", async () => {
    api.getWhatsAppStatus.mockResolvedValue({ status: connectedStatus });
    renderPanel(admin, [{ id: 1, name: "Ayesha Khan", phone: "+92 300 1234567" }]);

    expect(await screen.findByRole("heading", { name: "CRM Sales Line" })).toBeInTheDocument();
    expect(screen.getByText(/Linked as \+923001234567/)).toBeInTheDocument();
    expect(screen.getByLabelText("Send to")).toBeEnabled();
    expect(screen.getByLabelText("Phone number")).toBeEnabled();
    expect(screen.getByLabelText("Message")).toBeEnabled();
    expect(screen.getByRole("button", { name: /send on whatsapp/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /unlink/i })).toBeInTheDocument();
    expect(screen.queryByAltText("WhatsApp device linking QR code")).not.toBeInTheDocument();
  });

  it("hides management controls and disables sending for a view-only user", async () => {
    api.getWhatsAppStatus.mockResolvedValue({ status: connectedStatus });
    renderPanel(viewer);

    expect(await screen.findByRole("heading", { name: "CRM Sales Line" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unlink/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Send to")).toBeDisabled();
    expect(screen.getByLabelText("Phone number")).toBeDisabled();
    expect(screen.getByLabelText("Message")).toBeDisabled();
    expect(screen.getByRole("button", { name: /send on whatsapp/i })).toBeDisabled();
    expect(screen.getByText(/your role can view conversations but not send/i)).toBeInTheDocument();
  });

  it("shows the API error when a send fails", async () => {
    const user = userEvent.setup();
    api.getWhatsAppStatus.mockResolvedValue({ status: connectedStatus });
    api.sendWhatsAppMessage.mockRejectedValue({
      response: { data: { error: "WhatsApp rejected this message." } }
    });

    renderPanel(sender);
    await screen.findByRole("heading", { name: "CRM Sales Line" });

    await user.type(screen.getByLabelText("Phone number"), "+92 300 1234567");
    await user.type(screen.getByLabelText("Message"), "Hello from the CRM");
    await user.click(screen.getByRole("button", { name: /send on whatsapp/i }));

    expect(await screen.findByText("WhatsApp rejected this message.")).toBeInTheDocument();
    expect(api.sendWhatsAppMessage).toHaveBeenCalledWith({
      to: "+92 300 1234567",
      message: "Hello from the CRM"
    });
  });
});
