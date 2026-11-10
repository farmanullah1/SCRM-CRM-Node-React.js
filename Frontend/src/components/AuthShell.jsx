import React from "react";
import { Link } from "react-router-dom";

const HIGHLIGHTS = [
  {
    index: "01",
    title: "Relational core",
    body: "Every contact, company and valuation persisted to SQL Server through Sequelize."
  },
  {
    index: "02",
    title: "Scoped sessions",
    body: "JWT access tokens issued per operator, with bcrypt-hashed credentials at rest."
  },
  {
    index: "03",
    title: "Reactive telemetry",
    body: "Queries are cached and invalidated on write, so every view stays in sync."
  }
];

export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link to="/" className="brand" aria-label="SCRM home">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-inner" />
          </span>
          <span className="brand-text">
            <span className="brand-name">SCRM</span>
            <span className="brand-sub">Relationship Platform</span>
          </span>
        </Link>
        <Link to="/portfolio" className="btn btn--ghost btn--sm">
          View portfolio
        </Link>
      </div>

      <main className="auth-shell">
        <section className="auth-card">
          <header className="auth-head">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="auth-title">{title}</h1>
            <p className="auth-sub">{subtitle}</p>
          </header>

          {children}

          <footer className="auth-foot">{footer}</footer>
        </section>

        <aside className="auth-aside" aria-hidden="true">
          <div className="auth-aside-glow" />
          <p className="auth-aside-eyebrow">SYSTEM // OPERATOR ACCESS</p>
          <h2 className="auth-aside-title">
            Every account,
            <br />
            one live pipeline.
          </h2>
          <ul className="auth-aside-list">
            {HIGHLIGHTS.map((item) => (
              <li key={item.index} className="auth-aside-item">
                <span className="auth-aside-index">{item.index}</span>
                <div>
                  <h3 className="auth-aside-item-title">{item.title}</h3>
                  <p className="auth-aside-item-body">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="auth-aside-foot">
            <span className="status-dot" />
            All systems operational
          </div>
        </aside>
      </main>
    </div>
  );
}
