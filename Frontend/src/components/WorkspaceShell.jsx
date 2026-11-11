import React from "react";
import { useLocation } from "react-router-dom";
import WorkspaceSidebar from "./WorkspaceSidebar";
import WorkspaceTopBar from "./WorkspaceTopBar";
import AppFooter from "./AppFooter";

const COLLAPSE_KEY = "scrm_sidebar_collapsed";

export default function WorkspaceShell({ user, counts, onNewLead, children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!drawerOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen]);

  const toggleCollapse = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* preference is optional */
      }
      return next;
    });
  };

  return (
    <div className={`ws-shell${collapsed ? " is-collapsed" : ""}`}>
      <WorkspaceSidebar
        user={user}
        counts={counts}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {drawerOpen && (
        <button
          type="button"
          className="ws-scrim"
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div className="ws-main">
        <WorkspaceTopBar
          user={user}
          menuExpanded={drawerOpen}
          onMenu={() => setDrawerOpen(true)}
          onNewLead={onNewLead}
        />

        <main className="crm-layout ws-page" key={location.pathname}>
          {children}
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
