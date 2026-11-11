import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Menu, Plus, ChevronRight } from "lucide-react";
import { UserAvatar } from "./WorkspaceSidebar";

const LABELS = {
  dashboard: "Dashboard",
  leads: "Leads",
  contacts: "Contacts",
  pipeline: "Pipeline",
  companies: "Companies",
  tasks: "Tasks",
  activities: "Activity Log",
  invoices: "Invoices",
  catalog: "Catalog",
  tickets: "Tickets",
  outbox: "Outbox",
  settings: "Settings",
  security: "Security & Backup"
};

export default function WorkspaceTopBar({ user, onMenu, onNewLead, menuExpanded = false }) {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);
  const section = LABELS[segments[1]] || "Workspace";
  const sub = segments[2];

  return (
    <header className="ws-topbar">
      <div className="ws-topbar-left">
        <button
          type="button"
          className="ws-menu-btn"
          onClick={onMenu}
          aria-label="Open navigation"
          aria-controls="workspace-sidebar"
          aria-expanded={menuExpanded}
        >
          <Menu size={19} />
        </button>

        <nav className="ws-breadcrumbs" aria-label="Breadcrumb">
          <span className="ws-crumb-root">Workspace</span>
          <ChevronRight size={13} aria-hidden="true" />
          <span className="ws-crumb-current" aria-current="page">
            {section}
          </span>
          {sub && (
            <>
              <ChevronRight size={13} aria-hidden="true" />
              <span className="ws-crumb-current" aria-current="page">
                {sub.charAt(0).toUpperCase() + sub.slice(1)}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="ws-topbar-actions">
        <button
          type="button"
          className="btn-primary-yellow ws-quick-create"
          onClick={onNewLead}
          aria-label="Create new lead"
        >
          <Plus size={16} aria-hidden="true" />
          <span>New lead</span>
        </button>

        <Link to="/app/settings/profile" className="ws-topbar-profile" aria-label="Open your profile">
          <UserAvatar user={user} size={30} />
          <span className="ws-topbar-profile-name">{user?.name || "Account"}</span>
        </Link>
      </div>
    </header>
  );
}
