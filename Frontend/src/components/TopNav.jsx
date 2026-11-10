import React from "react";
import { Link } from "react-router-dom";
import { Cpu, LogOut } from "lucide-react";
import { initials } from "../utils/format";

export default function TopNav({ user, onLogout, compact = false }) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <Link to="/" className="brand" aria-label="SCRM dashboard">
          <span className="brand-mark" aria-hidden="true">
            <Cpu size={17} />
          </span>
          <span className="brand-text">
            <span className="brand-name">SCRM</span>
            <span className="brand-sub">Relationship Platform</span>
          </span>
        </Link>

        {!compact && (
          <nav className="topnav-links" aria-label="Workspace sections">
            <a href="#pipeline">Pipeline</a>
            <a href="#contacts">Contacts</a>
            <a href="#stages">Stages</a>
            <Link to="/portfolio" className="topnav-link--accent">
              Portfolio
            </Link>
          </nav>
        )}

        {compact && (
          <nav className="topnav-links" aria-label="Site sections">
            <Link to="/portfolio" className="topnav-link--accent">
              Portfolio
            </Link>
          </nav>
        )}

        <div className="topnav-actions">
          {user && (
            <div className="user-chip" title={`Signed in as ${user.email || user.name}`}>
              <span className="user-avatar" aria-hidden="true">
                {initials(user.name)}
              </span>
              <span className="user-name">{user.name}</span>
            </div>
          )}

          {onLogout && (
            <button type="button" className="icon-btn" onClick={onLogout} aria-label="Sign out" title="Sign out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
