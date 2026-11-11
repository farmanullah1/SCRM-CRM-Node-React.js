# Architecture Decision Records (ADRs) — SCRM

## ADR 001: The Six Pillars of SCRM
- **Status:** Accepted
- **Context:** SCRM historically stood solely for "Small CRM". To represent the comprehensive capabilities of the platform without losing its lean identity, the "S" is defined across six foundational operational pillars:
  1. **Secure** (Security-first CRM architecture)
  2. **Supply** (Products catalog, suppliers directory, commercial quotes and invoices)
  3. **Social** (Customer graph, social links, activity timelines, notes and team collaboration)
  4. **Software** (Extensible developer platform, public REST API, API keys, webhooks)
  5. **Small** (Lean, fast, practical: fast boot, low resource consumption, zero bloatware budget)
  6. **Site** (Website & customer entry points: web-to-lead forms, public quotes/invoices, landing page)
- **Consequences:** All marketing copy, documentation (`README.md`, `Up_Until_Now.md`), page headers, and UI navigation use these exact six pillars consistently.

## ADR 002: In-App Toast Notifications Over Native Alert Dialogs
- **Status:** Accepted
- **Context:** Browser-native `alert()` dialogs block the JavaScript thread, cannot be styled with the Electric Obsidian design system, and degrade user experience.
- **Decision:** Implemented a unified in-app toast notification system (`.scrm-toast-container`, `.scrm-toast-bubble`) with smooth slide-up animations, electric yellow feedback icons, and automated auto-dismiss timers.
- **Consequences:** All asynchronous mutations, exports, imports, and error responses communicate via non-blocking toasts.

## ADR 003: Halftone Canvas Engine Density & Visual Hierarchy
- **Status:** Accepted
- **Context:** Users require high-density visual feedback with a noticeable, tactile halftone matrix that feels alive without distracting from data comprehension.
- **Decision:** Configured dot spacing at $5.2\text{px}$ rendering ~80,000+ dots across HD displays, with a base radius of $1.85\text{px}$, expanding to $5.4\text{px}$ on hover, combined with radial click/tap ripple wave physics. Containers use translucent glassmorphism (`rgba(30, 30, 30, 0.78)` with `backdrop-filter: blur(12px)`) so dots are visible across all pages.
- **Consequences:** High-DPI screens experience fluid, hardware-accelerated 60fps interaction that reinforces the technical, modern aesthetic of SCRM.

## ADR 004: Sanitized Database Snapshot Dumps
- **Status:** Accepted
- **Context:** Full database JSON backups should allow complete disaster recovery without leaking password hashes or active refresh tokens.
- **Decision:** User password hashes (`password`), refresh token strings, and temporary 2FA verification codes are scrubbed from exported JSON dumps.
