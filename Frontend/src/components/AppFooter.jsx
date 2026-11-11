import React from "react";
import BrandLogo from "./BrandLogo";

const YEAR = new Date().getFullYear();

export default function AppFooter() {
  return (
    <footer className="ws-footer">
      <div className="ws-footer-brand">
        <BrandLogo variant="horizontal" size={22} showTagline={false} />
        <span className="ws-footer-sep" aria-hidden="true">/</span>
        <span className="ws-footer-pillars">Secure · Supply · Social · Software · Small · Site</span>
      </div>
      <p className="ws-footer-copy">
        © {YEAR} SCRM. All rights reserved.
      </p>
    </footer>
  );
}
