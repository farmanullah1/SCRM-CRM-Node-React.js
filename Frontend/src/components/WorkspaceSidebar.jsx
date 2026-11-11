import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  Users,
  Layers,
  Building2,
  CheckSquare,
  Clock3,
  FileText,
  Package,
  LifeBuoy,
  Mail,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import BrandLogo from "./BrandLogo";
import { assetUrl } from "../services/api";

const GROUPS = [
  {
    label: "Workspace",
    items: [{ to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard, countKey: null }]
  },
  {
    label: "CRM",
    items: [
      { to: "/app/leads", label: "Leads", icon: Target, countKey: "leads" },
      { to: "/app/contacts", label: "Contacts", icon: Users, countKey: "contacts" },
      { to: "/app/companies", label: "Companies", icon: Building2, countKey: "companies" }
    ]
  },
  {
    label: "Sales",
    items: [
      { to: "/app/pipeline", label: "Pipeline", icon: Layers },
      { to: "/app/catalog", label: "Catalog", icon: Package, countKey: "catalog" },
      { to: "/app/invoices", label: "Invoices", icon: FileText }
    ]
  },
  {
    label: "Productivity",
    items: [
      { to: "/app/tasks", label: "Tasks", icon: CheckSquare, countKey: "tasks" },
      { to: "/app/activities", label: "Activity Log", icon: Clock3 },
      { to: "/app/outbox", label: "Outbox", icon: Mail }
    ]
  },
  {
    label: "Support",
    items: [{ to: "/app/tickets", label: "Tickets", icon: LifeBuoy, countKey: "tickets" }]
  }
];

function UserAvatar({ user, size = 32 }) {
  const [failed, setFailed] = React.useState(false);
  const name = user?.name || "User";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (user?.avatar_url && !failed) {
    return (
      <img
        className="ws-avatar"
        src={assetUrl(user.avatar_url)}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span className="ws-avatar ws-avatar--initials" style={{ width: size, height: size }}>
      {initials || "U"}
    </span>
  );
}

export default function WorkspaceSidebar({
  user,
  counts = {},
  collapsed,
  onToggleCollapse,
  open,
  onClose
}) {
  const linkClass = ({ isActive }) => `ws-nav-link${isActive ? " is-active" : ""}`;

  return (
    <aside
      id="workspace-sidebar"
      className={`ws-sidebar${collapsed ? " is-collapsed" : ""}${open ? " is-open" : ""}`}
      aria-label="Workspace navigation"
    >
      <div className="ws-sidebar-top">
        <NavLink to="/app/dashboard" className="ws-brand" aria-label="SCRM dashboard">
          <BrandLogo variant={collapsed ? "mark" : "horizontal"} size={collapsed ? 30 : 28} showTagline={!collapsed} />
        </NavLink>
        <button
          type="button"
          className="ws-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="ws-nav" aria-label="Primary">
        {GROUPS.map((group) => (
          <div className="ws-nav-group" key={group.label}>
            <p className="ws-nav-group-label">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = item.countKey ? counts[item.countKey] : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon size={17} aria-hidden="true" />
                  <span className="ws-nav-label">{item.label}</span>
                  {typeof count === "number" && count > 0 && (
                    <span className="ws-nav-count">{count}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}

        {user?.role === "admin" && (
          <div className="ws-nav-group">
            <p className="ws-nav-group-label">System</p>
            <NavLink to="/app/security" className={linkClass} onClick={onClose} title={collapsed ? "Security & backup" : undefined}>
              <ShieldCheck size={17} aria-hidden="true" />
              <span className="ws-nav-label">Security & backup</span>
            </NavLink>
          </div>
        )}
      </nav>

      <div className="ws-sidebar-bottom">
        <NavLink to="/app/settings/profile" className={linkClass} onClick={onClose} title={collapsed ? "Settings" : undefined}>
          <Settings size={17} aria-hidden="true" />
          <span className="ws-nav-label">Settings</span>
        </NavLink>

        <NavLink
          to="/app/settings/profile"
          className="ws-account"
          onClick={onClose}
          title={collapsed ? user?.name || "Account" : undefined}
        >
          <UserAvatar user={user} />
          <span className="ws-account-text">
            <span className="ws-account-name">{user?.name || "Account"}</span>
            <span className="ws-account-meta">{user?.title || user?.role || "Member"}</span>
          </span>
        </NavLink>
      </div>
    </aside>
  );
}

export { UserAvatar };
