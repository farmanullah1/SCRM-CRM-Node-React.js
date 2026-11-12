import React, { useEffect, useRef, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Menu, Plus, ChevronRight, Search, Bell, X, CheckCheck } from "lucide-react";
import { UserAvatar } from "./WorkspaceSidebar";
import {
  getNotifications,
  globalSearch,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/api";

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
  const navigate = useNavigate();
  const canCreateLead =
    Boolean(user?.permissions?.all) ||
    Boolean(user?.permissionList?.includes("leads.create"));
  const segments = pathname.split("/").filter(Boolean);
  const section = LABELS[segments[1]] || "Workspace";
  const sub = segments[2];

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState({ sections: [], total: 0 });
  const searchBoxRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getNotifications();
        if (!active) return;
        setNotifications(data.notifications || []);
        setUnread(data.unread || 0);
      } catch {
        // The badge is non-critical; individual pages still report their own errors.
      }
    };
    load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults({ sections: [], total: 0 });
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(term);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults({ sections: [], total: 0 });
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationOpen(false);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchBoxRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openResult = (href) => {
    setSearchOpen(false);
    setQuery("");
    navigate(href);
  };

  const markAllRead = async () => {
    setUnread(0);
    setNotifications((rows) => rows.map((row) => ({ ...row, is_read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // The next poll restores the real state if the server rejects the change.
    }
  };

  const openNotification = async (notification) => {
    if (!notification.is_read) {
      setNotifications((rows) => rows.map((row) => (row.id === notification.id ? { ...row, is_read: true } : row)));
      setUnread((value) => Math.max(0, value - 1));
      try {
        await markNotificationRead(notification.id);
      } catch {
        // Keep the optimistic state; the next poll reconciles it.
      }
    }
    setNotificationOpen(false);
    if (notification.link) navigate(notification.link);
  };

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
        <div className="ws-search-shell">
          <button
            type="button"
            className="ws-icon-btn"
            aria-label="Search workspace"
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((value) => !value);
              setTimeout(() => searchBoxRef.current?.focus(), 0);
            }}
          >
            <Search size={18} />
          </button>
          {searchOpen && (
            <div className="ws-search-panel">
              <div className="ws-search-input-row">
                <Search size={16} aria-hidden="true" />
                <input
                  ref={searchBoxRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search leads, contacts, companies, invoices…"
                  aria-label="Search workspace records"
                  autoComplete="off"
                />
                <kbd>Esc</kbd>
              </div>
              <div className="ws-search-results" role="status" aria-live="polite">
                {query.trim().length < 2 && <p className="ws-panel-hint">Type at least two characters. Searches only records you can access.</p>}
                {query.trim().length >= 2 && searching && <p className="ws-panel-hint">Searching…</p>}
                {query.trim().length >= 2 && !searching && results.total === 0 && <p className="ws-panel-hint">No accessible records match “{query.trim()}”.</p>}
                {!searching && (results.sections || []).map((group) => (
                  <div key={group.type} className="ws-search-group">
                    <p className="ws-search-group-label">{group.label}</p>
                    {group.items.map((item) => (
                      <button key={`${group.type}-${item.id}`} type="button" className="ws-search-result" onClick={() => openResult(item.href)}>
                        <strong>{item.title}</strong>
                        <span>{item.subtitle || "Open record"}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="ws-search-shell">
          <button
            type="button"
            className="ws-icon-btn"
            aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
            aria-expanded={notificationOpen}
            onClick={() => setNotificationOpen((value) => !value)}
          >
            <Bell size={18} />
            {unread > 0 && <span className="ws-notification-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>
          {notificationOpen && (
            <div className="ws-notification-panel">
              <div className="ws-notification-head">
                <strong>Notifications</strong>
                <div>
                  {unread > 0 && (
                    <button type="button" className="ws-text-btn" onClick={markAllRead}>
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                  <button type="button" className="ws-icon-btn small" aria-label="Close notifications" onClick={() => setNotificationOpen(false)}>
                    <X size={15} />
                  </button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <p className="ws-panel-hint">No notifications yet. Lead assignments, payments and security changes appear here.</p>
              ) : (
                <div className="ws-notification-list">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`ws-notification-item${notification.is_read ? "" : " is-unread"}`}
                      onClick={() => openNotification(notification)}
                    >
                      <span className="ws-notification-dot" aria-hidden="true" />
                      <span>
                        <strong>{notification.title}</strong>
                        {notification.body && <span>{notification.body}</span>}
                        <time>{new Date(notification.createdAt).toLocaleString()}</time>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {canCreateLead && (
          <button
            type="button"
            className="btn-primary-yellow ws-quick-create"
            onClick={onNewLead}
            aria-label="Create new lead"
          >
            <Plus size={16} aria-hidden="true" />
            <span>New lead</span>
          </button>
        )}

        <Link to="/app/settings/profile" className="ws-topbar-profile" aria-label="Open your profile">
          <UserAvatar user={user} size={30} />
          <span className="ws-topbar-profile-name">{user?.name || "Account"}</span>
        </Link>
      </div>
    </header>
  );
}
