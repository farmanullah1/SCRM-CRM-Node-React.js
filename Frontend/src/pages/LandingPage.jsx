import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";
import { 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Users, 
  Clock, 
  Lock, 
  Database, 
  FileText, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  GitMerge, 
  Server,
  Layers,
  Sparkles
} from "lucide-react";

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // FAQ open/close state
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqItems = [
    {
      q: "What does the 'S' stand for in SCRM?",
      a: "The 'S' stands for Small (Small Customer Relationship Management). SCRM is intentionally engineered for agile, focused teams that need speed, precision, and complete data sovereignty without the endless configuration debt, bloat, and monthly license taxation of legacy enterprise CRM giants."
    },
    {
      q: "Is my business customer data completely sovereign?",
      a: "Yes. SCRM operates directly on your Microsoft SQL Server instance. Your contacts, deals, invoices, and communication histories remain strictly in your private database with zero telemetry leakage to third parties."
    },
    {
      q: "How does the Lead to Deal conversion workflow operate?",
      a: "SCRM strictly separates unqualified Leads from qualified Contacts and Deals. In one transactional operation, qualifying a lead automatically provisions a Contact record, binds their Company profile, and creates a deal in your visual sales pipeline with preserved activity logs."
    },
    {
      q: "What security measures protect our user authentication?",
      a: "SCRM enforces enterprise-grade security: bcrypt password hashing with 12 salt rounds, strict IP rate limiting against brute-force attacks, short-lived JWT access tokens with secure refresh token rotation, granular Role-Based Access Control (Admin, Manager, Standard User), and optional email 2-Step Verification (2FA OTP)."
    },
    {
      q: "Can I import existing contacts from CSV spreadsheets?",
      a: "Absolutely. SCRM includes a guided CSV importer with duplicate detection, automatic column mapping, and field sanitization to smoothly transition existing customer databases without data loss."
    }
  ];

  return (
    <div className="scrm-landing-page" style={{ minHeight: "100vh", backgroundColor: "transparent", color: "#DFDFDF", position: "relative" }}>
      {/* Authenticated User Banner if logged in */}
      {user && (
        <div style={{
          backgroundColor: "rgba(48, 48, 24, 0.85)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #4F5101",
          padding: "8px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "13px",
          color: "#DFDFDF",
          position: "relative",
          zIndex: 60
        }}>
          <div>
            Logged in as <strong style={{ color: "#F0FF60" }}>{user.name}</strong> ({user.role})
          </div>
          <Link
            to="/app"
            style={{
              color: "#151515",
              backgroundColor: "#F0FF60",
              padding: "4px 12px",
              borderRadius: "4px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            Open Workspace <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Sticky Header Navbar */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(24, 24, 24, 0.8)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid #414141",
        padding: "0 28px",
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <BrandLogo variant="horizontal" size={34} showTagline={true} />
          </Link>
          <nav style={{ display: "flex", gap: "24px" }} className="landing-nav-links">
            <a href="#features" style={{ color: "#DFDFDF", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Features</a>
            <a href="#workflow" style={{ color: "#DFDFDF", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Lifecycle</a>
            <a href="#security" style={{ color: "#DFDFDF", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Security</a>
            <a href="#pricing" style={{ color: "#DFDFDF", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>Editions</a>
            <a href="#faq" style={{ color: "#DFDFDF", textDecoration: "none", fontSize: "14px", fontWeight: 500 }}>FAQ</a>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {user ? (
            <Link
              to="/app"
              style={{
                backgroundColor: "#F0FF60",
                color: "#151515",
                fontWeight: 700,
                fontSize: "14px",
                padding: "8px 18px",
                borderRadius: "6px",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              Workspace <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  color: "#DFDFDF",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "8px 14px"
                }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: "#F0FF60",
                  color: "#151515",
                  fontWeight: 700,
                  fontSize: "14px",
                  padding: "8px 18px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 10px rgba(240, 255, 96, 0.2)"
                }}
              >
                Start Free <ArrowRight size={15} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "90px 24px 60px",
        textAlign: "center",
        position: "relative"
      }}>
        <div className="scrm-float-badge" style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: "rgba(48, 48, 24, 0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid #4F5101",
          borderRadius: "999px",
          padding: "6px 16px",
          fontSize: "12px",
          fontWeight: 700,
          color: "#FAFF69",
          letterSpacing: "0.1em",
          marginBottom: "24px",
          boxShadow: "0 4px 16px rgba(240, 255, 96, 0.15)"
        }}>
          <Sparkles size={14} color="#F0FF60" /> SOVEREIGN CUSTOMER RELATIONSHIP MANAGEMENT
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 5.5vw, 64px)",
          fontWeight: 900,
          lineHeight: 1.1,
          color: "#FFFFFF",
          letterSpacing: "-0.02em",
          maxWidth: "960px",
          margin: "0 auto 24px",
          textShadow: "0 6px 30px rgba(0, 0, 0, 0.7)"
        }}>
          Fast, Focused, Sovereign CRM Built for <span style={{ color: "#F0FF60", textShadow: "0 0 25px rgba(240, 255, 96, 0.35)" }}>Agile Growth</span>
        </h1>

        <p style={{
          fontSize: "clamp(16px, 2vw, 19px)",
          lineHeight: 1.6,
          color: "#DFDFDF",
          maxWidth: "760px",
          margin: "0 auto 36px",
          textShadow: "0 2px 10px rgba(0, 0, 0, 0.6)"
        }}>
          <strong>SCRM</strong> (where <em>S stands for Small</em>) eliminates bloated enterprise complexity. 
          Manage unqualified leads, qualified contacts, deal stage velocity, tasks, and transactional communications 
          with total control on a robust Microsoft SQL Server foundation.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", marginBottom: "50px" }}>
          <Link
            to={user ? "/app" : "/signup"}
            className="btn-primary-yellow interactive-lift"
            style={{
              backgroundColor: "#F0FF60",
              color: "#151515",
              fontWeight: 800,
              fontSize: "16px",
              padding: "14px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {user ? "Enter Your Workspace" : "Launch Free Instance"} <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="btn-ghost-dark interactive-lift"
            style={{
              backgroundColor: "rgba(32, 32, 32, 0.8)",
              backdropFilter: "blur(10px)",
              border: "1px solid #414141",
              color: "#DFDFDF",
              fontWeight: 600,
              fontSize: "16px",
              padding: "14px 28px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            Explore Architecture
          </a>
        </div>

        {/* Live Interactive CRM Dashboard Preview Frame with Floating Animation */}
        <div className="scrm-float-card interactive-lift" style={{
          backgroundColor: "rgba(32, 32, 32, 0.78)",
          backdropFilter: "blur(14px)",
          border: "1px solid #414141",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.65), 0 0 25px rgba(240, 255, 96, 0.12)",
          textAlign: "left"
        }}>
          {/* Mock Window Header */}
          <div style={{
            backgroundColor: "#181818",
            borderBottom: "1px solid #414141",
            padding: "12px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#FB2C36" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#E17100" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#22C55E" }} />
              <span style={{ fontSize: "12px", color: "#9E9E9E", marginLeft: "12px", fontFamily: "monospace" }}>
                scrm.workspace.internal/app/pipeline
              </span>
            </div>
            <div style={{ fontSize: "12px", color: "#F0FF60", fontWeight: 700 }}>
              PIPELINE VALUE: $148,500.00
            </div>
          </div>

          {/* Mock Kanban Pipeline Preview */}
          <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
            {/* Stage: New */}
            <div style={{ backgroundColor: "#181818", borderRadius: "8px", border: "1px solid #414141", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>New Leads</span>
                <span style={{ fontSize: "11px", backgroundColor: "#303018", color: "#F0FF60", padding: "2px 6px", borderRadius: "4px" }}>4</span>
              </div>
              <div style={{ backgroundColor: "#242424", border: "1px solid #414141", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Aura Technologies</div>
                <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Contact: Elena Rostova</div>
                <div style={{ fontSize: "12px", color: "#F0FF60", fontWeight: 700, marginTop: "6px" }}>$18,000.00</div>
              </div>
              <div style={{ backgroundColor: "#242424", border: "1px solid #414141", borderRadius: "6px", padding: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>Summit Logistics</div>
                <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Contact: Marcus Brody</div>
                <div style={{ fontSize: "12px", color: "#F0FF60", fontWeight: 700, marginTop: "6px" }}>$24,500.00</div>
              </div>
            </div>

            {/* Stage: Qualified */}
            <div style={{ backgroundColor: "#181818", borderRadius: "8px", border: "1px solid #414141", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>Qualified</span>
                <span style={{ fontSize: "11px", backgroundColor: "#303018", color: "#F0FF60", padding: "2px 6px", borderRadius: "4px" }}>2</span>
              </div>
              <div style={{ backgroundColor: "#242424", border: "1px solid #414141", borderRadius: "6px", padding: "10px", marginBottom: "8px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>CyberShield Systems</div>
                <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Decision Maker Aligned</div>
                <div style={{ fontSize: "12px", color: "#F0FF60", fontWeight: 700, marginTop: "6px" }}>$32,000.00</div>
              </div>
            </div>

            {/* Stage: Proposal */}
            <div style={{ backgroundColor: "#181818", borderRadius: "8px", border: "1px solid #414141", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#FFFFFF" }}>Proposal Sent</span>
                <span style={{ fontSize: "11px", backgroundColor: "#303018", color: "#F0FF60", padding: "2px 6px", borderRadius: "4px" }}>1</span>
              </div>
              <div style={{ backgroundColor: "#242424", border: "1px solid #4F5101", borderRadius: "6px", padding: "10px", position: "relative" }}>
                <div style={{ fontSize: "11px", color: "#FAFF69", fontWeight: 700, textTransform: "uppercase" }}>High Probability</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF", marginTop: "2px" }}>Vanguard Energy Corp</div>
                <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Quote #QT-2026-089 sent</div>
                <div style={{ fontSize: "12px", color: "#F0FF60", fontWeight: 700, marginTop: "6px" }}>$45,000.00</div>
              </div>
            </div>

            {/* Stage: Won */}
            <div style={{ backgroundColor: "#181818", borderRadius: "8px", border: "1px solid #414141", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#22C55E" }}>Closed Won</span>
                <span style={{ fontSize: "11px", backgroundColor: "rgba(34, 197, 94, 0.15)", color: "#22C55E", padding: "2px 6px", borderRadius: "4px" }}>3</span>
              </div>
              <div style={{ backgroundColor: "#242424", border: "1px solid #414141", borderRadius: "6px", padding: "10px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#FFFFFF" }}>NovaBio Labs</div>
                <div style={{ fontSize: "11px", color: "#9E9E9E", marginTop: "4px" }}>Invoice Generated · Paid</div>
                <div style={{ fontSize: "12px", color: "#22C55E", fontWeight: 700, marginTop: "6px" }}>$29,000.00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section Transition Band */}
      <div style={{ height: "40px", backgroundColor: "#303018", borderTop: "1px solid #414141", borderBottom: "1px solid #4F5101" }} />

      {/* Core Feature Grid */}
      <section id="features" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ color: "#F0FF60", fontWeight: 700, fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
            ENGINEERED WITHOUT ENTERPRISE BLOAT
          </div>
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#FFFFFF", marginBottom: "16px" }}>
            Comprehensive CRM Capabilities for Sovereign Teams
          </h2>
          <p style={{ color: "#DFDFDF", maxWidth: "680px", margin: "0 auto", fontSize: "16px", lineHeight: 1.6 }}>
            Every module in SCRM is intentionally built for everyday operational productivity. No fake buttons, no dummy states, no simulated integrations.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px"
        }}>
          {/* Feature 1 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "0.1s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Users size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Customer 360 & Contact Graph</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Store contacts, company domains, addresses, and multi-deal associations. Maintain unified activity feeds across logged calls, meetings, notes, and emails with duplicate detection and merging.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>Includes Deduplication & Search</div>
          </div>

          {/* Feature 2 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "0.3s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <TrendingUp size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Pipeline Stages & Velocity</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Advance deals through New, Contacted, Qualified, Proposal, Won, and Lost stages. Monitor weighted forecasts, expected close dates, deal values, and win-rate velocity with instant totals.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>Exact Decimal Sums · Zero Rounding Loss</div>
          </div>

          {/* Feature 3 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "0.5s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Clock size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Smart Tasks & Reminders</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Assign tasks to team members with due dates, priority tiers (High, Medium, Low), and direct links to contacts and deals. Never miss a customer follow-up or contract renewal.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>Overdue & Due-Today Smart Filters</div>
          </div>

          {/* Feature 4 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "0.7s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Mail size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Branded Communications</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Dispatch branded HTML communications via Nodemailer SMTP with built-in tracking pixel logging. Automated system triggers for welcome emails, 2FA OTP codes, and security alerts.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>Configurable SMTP & Tracking Logs</div>
          </div>

          {/* Feature 5 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "0.9s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <FileText size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Quotes & Invoice Lifecycle</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Generate quotes, convert to draft invoices, set payment due dates, and record partial/full payments. Direct association with contacts and customer ledger history.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>Real Persisted Commercial Records</div>
          </div>

          {/* Feature 6 */}
          <div className="interactive-lift scrm-float-gentle" style={{ backgroundColor: "rgba(32, 32, 32, 0.78)", backdropFilter: "blur(12px)", border: "1px solid #414141", borderRadius: "12px", padding: "28px", animationDelay: "1.1s" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Lock size={22} color="#F0FF60" />
            <div style={{ width: "42px", height: "42px", borderRadius: "8px", backgroundColor: "#303018", border: "1px solid #4F5101", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Lock size={22} color="#F0FF60" />
            </div>
            <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#FFFFFF", marginBottom: "10px" }}>Enterprise Security & Backups</h3>
            <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.6, marginBottom: "16px" }}>
              Granular RBAC (Admin, Manager, Standard User), short-lived JWTs with refresh token rotation, optional email 2FA OTP, audit trail logging, and one-click database snapshot triggers.
            </p>
            <div style={{ fontSize: "12px", color: "#FAFF69", fontWeight: 600 }}>MSSQL Point-in-Time Snapshots</div>
          </div>
        </div>
      </section>

      {/* Inverted Yellow Section (Full-Panel Inverted Band per specification) */}
      <section style={{
        backgroundColor: "#F0FF60",
        color: "#151515",
        padding: "80px 24px",
        margin: "40px 0"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "40px", alignItems: "center" }}>
          <div>
            <div style={{
              display: "inline-block",
              backgroundColor: "#151515",
              color: "#F0FF60",
              fontWeight: 800,
              fontSize: "12px",
              padding: "4px 12px",
              borderRadius: "4px",
              letterSpacing: "0.15em",
              marginBottom: "16px"
            }}>
              DATA SOVEREIGNTY BY DESIGN
            </div>
            <h2 style={{ fontSize: "38px", fontWeight: 900, lineHeight: 1.15, marginBottom: "18px", color: "#151515" }}>
              Deploy Anywhere. Own Every Byte of Customer Intelligence.
            </h2>
            <p style={{ fontSize: "16px", lineHeight: 1.6, color: "#1F2014", marginBottom: "24px" }}>
              Unlike multi-tenant SaaS vendors that monetize your customer graph and hold your historical communications hostage, SCRM is fully sovereign. Run on your own servers, local Docker containers, or private cloud VPCs.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                <CheckCircle2 size={18} color="#151515" /> Zero vendor lock-in with standard SQL Server schema
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                <CheckCircle2 size={18} color="#151515" /> Direct CSV data portability and deduplication
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700 }}>
                <CheckCircle2 size={18} color="#151515" /> Immutable security audit trails for full regulatory compliance
              </li>
            </ul>
          </div>

          <div style={{
            backgroundColor: "#181818",
            border: "2px solid #151515",
            borderRadius: "12px",
            padding: "32px",
            color: "#DFDFDF"
          }}>
            <div style={{ color: "#F0FF60", fontWeight: 800, fontSize: "18px", marginBottom: "16px" }}>
              SCRM Enterprise Architecture
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #414141", paddingBottom: "10px" }}>
                <span>Database Engine</span>
                <strong style={{ color: "#FFFFFF" }}>Microsoft SQL Server 2022</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #414141", paddingBottom: "10px" }}>
                <span>Backend Core</span>
                <strong style={{ color: "#FFFFFF" }}>Node.js Express + Sequelize ORM</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #414141", paddingBottom: "10px" }}>
                <span>Frontend Engine</span>
                <strong style={{ color: "#FFFFFF" }}>React 19 + Vite 8 (Electric Obsidian)</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #414141", paddingBottom: "10px" }}>
                <span>Security Suite</span>
                <strong style={{ color: "#FFFFFF" }}>Bcrypt-12, JWT Rotation, 2FA OTP</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Communications</span>
                <strong style={{ color: "#FFFFFF" }}>Nodemailer SMTP + Pixel Tracking</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 5-Stage SCRM Lifecycle Workflow */}
      <section id="workflow" style={{ maxWidth: "1200px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <div style={{ color: "#F0FF60", fontWeight: 700, fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
            LIFECYCLE ARCHITECTURE
          </div>
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#FFFFFF", marginBottom: "16px" }}>
            From First Touch to Retained Client
          </h2>
          <p style={{ color: "#DFDFDF", maxWidth: "680px", margin: "0 auto", fontSize: "16px" }}>
            Clean entity separation prevents pipeline contamination. Leads, contacts, deals, and invoices transition cleanly through verifiable stages.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "18px"
        }}>
          {[
            { step: "01", title: "Lead Ingestion", desc: "Capture inbound prospects, tag sources, and evaluate initial purchase intent." },
            { step: "02", title: "1-Click Conversion", desc: "Qualify into Contact, provision Company domain, and spawn pipeline deal." },
            { step: "03", title: "Pipeline Velocity", desc: "Progress through Discovery, Proposal, and Negotiation with weighted forecasts." },
            { step: "04", title: "Activity Execution", desc: "Automate follow-up tasks, schedule calls, and record timestamped meeting notes." },
            { step: "05", title: "Billing & Retention", desc: "Issue tracked quotes, invoice accepted contracts, and manage support tickets." }
          ].map((item, idx) => (
            <div key={idx} style={{
              backgroundColor: "#202020",
              border: "1px solid #414141",
              borderRadius: "8px",
              padding: "24px 18px",
              position: "relative"
            }}>
              <div style={{
                fontSize: "24px",
                fontWeight: 900,
                color: "#F0FF60",
                fontFamily: "monospace",
                marginBottom: "12px"
              }}>
                {item.step}
              </div>
              <h4 style={{ fontSize: "17px", fontWeight: 700, color: "#FFFFFF", marginBottom: "8px" }}>{item.title}</h4>
              <p style={{ fontSize: "13px", color: "#DFDFDF", lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Editions / Deployment Tiers */}
      <section id="pricing" style={{ maxWidth: "1000px", margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <div style={{ color: "#F0FF60", fontWeight: 700, fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
            DEPLOYMENT EDITIONS
          </div>
          <h2 style={{ fontSize: "36px", fontWeight: 800, color: "#FFFFFF", marginBottom: "16px" }}>
            Predictable, Sovereign Ownership
          </h2>
          <p style={{ color: "#DFDFDF", fontSize: "16px" }}>No per-seat penalties. Grow your team without recurring licensing spikes.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "28px" }}>
          {/* Sovereign Small Team */}
          <div style={{
            backgroundColor: "#202020",
            border: "2px solid #F0FF60",
            borderRadius: "12px",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                display: "inline-block",
                backgroundColor: "#303018",
                color: "#F0FF60",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "16px"
              }}>
                RECOMMENDED FOR SMALL TEAMS
              </div>
              <h3 style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", marginBottom: "8px" }}>SCRM Sovereign Core</h3>
              <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.5, marginBottom: "20px" }}>
                Complete self-hosted deployment on your private infrastructure.
              </p>
              <div style={{ fontSize: "36px", fontWeight: 900, color: "#FFFFFF", marginBottom: "24px" }}>
                $0 <span style={{ fontSize: "14px", color: "#9E9E9E", fontWeight: 500 }}>/ perpetual license</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> Unlimited Contacts & Deals</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> Visual Kanban Pipeline</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> Tasks, Reminders & Meeting Logs</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> Invoicing & Support Tickets</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> Microsoft SQL Server Durability</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#F0FF60" /> 2FA & Security Audit Logs</li>
              </ul>
            </div>
            <div style={{ marginTop: "32px" }}>
              <Link
                to="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  backgroundColor: "#F0FF60",
                  color: "#151515",
                  fontWeight: 800,
                  fontSize: "15px",
                  padding: "14px",
                  borderRadius: "6px",
                  textDecoration: "none"
                }}
              >
                Get Started with SCRM
              </Link>
            </div>
          </div>

          {/* Enterprise Support */}
          <div style={{
            backgroundColor: "#202020",
            border: "1px solid #414141",
            borderRadius: "12px",
            padding: "36px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                display: "inline-block",
                backgroundColor: "#242424",
                color: "#DFDFDF",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "16px"
              }}>
                MULTI-TENANT & SLA
              </div>
              <h3 style={{ fontSize: "26px", fontWeight: 800, color: "#FFFFFF", marginBottom: "8px" }}>Enterprise Managed</h3>
              <p style={{ color: "#DFDFDF", fontSize: "14px", lineHeight: 1.5, marginBottom: "20px" }}>
                Dedicated cloud clusters, custom integrations, and SLA support.
              </p>
              <div style={{ fontSize: "36px", fontWeight: 900, color: "#FFFFFF", marginBottom: "24px" }}>
                Custom <span style={{ fontSize: "14px", color: "#9E9E9E", fontWeight: 500 }}>/ deployment</span>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px", fontSize: "14px" }}>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#DFDFDF" /> Multi-Tenant Isolation</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#DFDFDF" /> Automated High-Availability Backups</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#DFDFDF" /> Custom SSO & Active Directory / SAML</li>
                <li style={{ display: "flex", alignItems: "center", gap: "8px" }}><CheckCircle2 size={16} color="#DFDFDF" /> 24/7 Priority Engineering SLA</li>
              </ul>
            </div>
            <div style={{ marginTop: "32px" }}>
              <Link
                to="/signup"
                style={{
                  display: "block",
                  textAlign: "center",
                  backgroundColor: "#282828",
                  border: "1px solid #414141",
                  color: "#DFDFDF",
                  fontWeight: 700,
                  fontSize: "15px",
                  padding: "14px",
                  borderRadius: "6px",
                  textDecoration: "none"
                }}
              >
                Contact Engineering
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" style={{ maxWidth: "860px", margin: "0 auto", padding: "60px 24px 100px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ color: "#F0FF60", fontWeight: 700, fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "12px" }}>
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2 style={{ fontSize: "32px", fontWeight: 800, color: "#FFFFFF" }}>
            Everything You Need to Know About SCRM
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "#202020",
                border: "1px solid #414141",
                borderRadius: "8px",
                overflow: "hidden"
              }}
            >
              <button
                onClick={() => toggleFaq(idx)}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  backgroundColor: "transparent",
                  border: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#FFFFFF",
                  fontSize: "16px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >
                <span>{item.q}</span>
                {openFaq === idx ? <ChevronUp size={18} color="#F0FF60" /> : <ChevronDown size={18} color="#9E9E9E" />}
              </button>
              {openFaq === idx && (
                <div style={{
                  padding: "0 24px 20px",
                  color: "#DFDFDF",
                  fontSize: "14px",
                  lineHeight: 1.6,
                  borderTop: "1px solid #303030"
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: "#141414",
        borderTop: "1px solid #414141",
        padding: "48px 28px 32px"
      }}>
        <div style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "24px"
        }}>
          <div>
            <BrandLogo variant="horizontal" size={32} showTagline={true} />
            <p style={{ fontSize: "13px", color: "#9E9E9E", marginTop: "10px", maxWidth: "340px" }}>
              Small Customer Relationship Management. Focused, sovereign, and engineered for high-velocity teams.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: "13px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#22C55E" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22C55E" }} />
              <span>All Systems Operational</span>
            </div>
            <span style={{ color: "#414141" }}>|</span>
            <span style={{ color: "#9E9E9E" }}>Database: MSSQL 2022</span>
            <span style={{ color: "#414141" }}>|</span>
            <span style={{ color: "#9E9E9E" }}>Node.js / React 19</span>
          </div>
        </div>

        <div style={{
          maxWidth: "1200px",
          margin: "32px auto 0",
          paddingTop: "20px",
          borderTop: "1px solid #242424",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          fontSize: "12px",
          color: "#9E9E9E"
        }}>
          <div>&copy; {new Date().getFullYear()} SCRM Platform. Built with Electric Obsidian visual system.</div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Link to="/login" style={{ color: "#DFDFDF", textDecoration: "none" }}>Sign In</Link>
            <Link to="/signup" style={{ color: "#DFDFDF", textDecoration: "none" }}>Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

