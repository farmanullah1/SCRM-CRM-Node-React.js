import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WorkspaceSidebar from "../components/WorkspaceSidebar";
import ConfirmDialog from "../components/ConfirmDialog";

function sidebarFor(user) {
  return render(
    <MemoryRouter>
      <WorkspaceSidebar user={user} counts={{}} collapsed={false} open onClose={() => {}} />
    </MemoryRouter>
  );
}

describe("WorkspaceSidebar permissions", () => {
  it("shows only modules the user has been granted", () => {
    sidebarFor({
      name: "Restricted Rep",
      role: "standard_user",
      permissions: { all: false },
      permissionList: ["leads.view"]
    });

    expect(screen.getByRole("link", { name: /leads/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pipeline/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /invoices/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /users & access/i })).not.toBeInTheDocument();
  });

  it("shows access administration only to users who can manage access", () => {
    sidebarFor({
      name: "Workspace Admin",
      role: "admin",
      permissions: { all: true },
      permissionList: ["users.view"]
    });

    expect(screen.getByRole("link", { name: /users & access/i })).toBeInTheDocument();
  });
});

describe("ConfirmDialog", () => {
  it("replaces native confirmation and calls the action only after confirmation", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete this lead?"
        message="This cannot be undone."
        confirmLabel="Delete lead"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Delete lead" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("closes with Escape without confirming", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Delete this deal?" message="This cannot be undone." onConfirm={onConfirm} onCancel={onCancel} />
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
