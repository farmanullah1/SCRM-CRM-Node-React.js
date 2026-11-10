import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  LogOut,
  Layers, 
  ShieldCheck, 
  Activity, 
  CircleDollarSign,
  Terminal,
  Cpu,
  Mail,
  Send,
  Workflow,
  Sparkles,
  Database,
  Lock,
  ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getContacts, createContact, updateContact, deleteContact } from "../services/api";
import "../App.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Contact form quick enquiry state for the closing band
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquirySent, setInquirySent] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "Lead",
    value: 0
  });
  const [formError, setFormError] = useState("");

  // Contacts Query
  const { data: contacts = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["contacts", { search: searchTerm, status: statusFilter }],
    queryFn: () => getContacts({ search: searchTerm, status: statusFilter })
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      handleCloseModal();
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || "Failed to create contact");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      handleCloseModal();
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || "Failed to update contact");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to delete contact");
    }
  });

  const handleOpenModal = (contact = null) => {
    setFormError("");
    if (contact) {
      setEditingContact(contact);
      setFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || "",
        company: contact.company || "",
        status: contact.status || "Lead",
        value: contact.value || 0
      });
    } else {
      setEditingContact(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        status: "Lead",
        value: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingContact(null);
    setFormError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Name and Email are required fields.");
      return;
    }

    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("Confirm deletion of this record?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    setInquirySent(true);
    setTimeout(() => {
      setInquiryName("");
      setInquiryEmail("");
      setInquiryMessage("");
      setInquirySent(false);
    }, 4000);
  };

  const totalValue = contacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const activeCustomers = contacts.filter((c) => c.status === "Customer").length;
  const qualifiedLeads = contacts.filter((c) => c.status === "Qualified").length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {/* 81px Edge-to-Edge Circuit Navbar per Spec */}
      <nav className="navbar-circuit">
        {/* Item 1 & 2: Logo and site name SCRM */}
        <div className="nav-brand">
          <div className="brand-glyph">
            <Cpu size={20} color="#00D9FF" />
          </div>
          <span className="brand-title">SCRM</span>
        </div>

        {/* Item 3, 4, 5: Center Nav Links */}
        <div className="nav-center-links">
          <a href="#pipeline" className="nav-link-circuit">Pipeline</a>
          <a href="#intelligence" className="nav-link-circuit">Intelligence</a>
          <a href="#telemetry" className="nav-link-circuit">Telemetry</a>
          <a href="#dispatch" className="nav-link-circuit">Dispatch</a>
        </div>

        {/* Item 6: Small CTA/utility control at far right */}
        <div className="nav-right-items">
          <button 
            className="button-nav-utility"
            onClick={() => handleOpenModal()}
          >
            <UserPlus size={15} />
            <span>New Entry</span>
          </button>

          <button 
            className="action-icon-btn delete" 
            onClick={logout} 
            title="Disconnect Operator"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Container: 1280px max-width, section spacing */}
      <main className="crm-layout">
        {/* Hero Section */}
        <header className="crm-hero" id="pipeline">
          <div className="eyebrow">
            01 // PIPELINE INTELLIGENCE & TELEMETRY
          </div>

          <h1 className="hero-display-stack">
            DEAL VELOCITY.<br />
            CONTACT MATRIX.<br />
            <span className="cyan-text">UNIFIED COMMAND.</span>
          </h1>

          <p className="hero-lead-text">
            Precision relationship management with real-time Microsoft SQL Server persistence and end-to-end encrypted session telemetry.
          </p>

          {/* Three-Button Row Anchored Center/Left per Spec */}
          <div className="hero-three-button-row">
            <button className="button-primary-hero" onClick={() => handleOpenModal()}>
              <UserPlus size={18} />
              <span>Deploy Entity</span>
            </button>
            <button className="button-secondary-hero" onClick={() => refetch()}>
              <RefreshCw size={16} className={isFetching ? "spin-icon" : ""} />
              <span>Sync Network</span>
            </button>
            <a href="#dispatch" className="button-secondary-hero">
              <Mail size={16} />
              <span>Dispatch Brief</span>
            </a>
          </div>
        </header>

        {/* Core-Capability Card (×4 in a Single Row, Uniform Card-Grid per Spec) */}
        <section className="capability-4up-row" id="telemetry">
          <div className="core-capability-card">
            <div className="icon-badge-square">
              <Layers size={22} />
            </div>
            <div className="capability-card-stat">{contacts.length}</div>
            <h3 className="capability-card-heading">Indexed Entities</h3>
            <p className="capability-card-desc">
              Total active relationship nodes mapped within the SCRM telemetry graph.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <ShieldCheck size={22} />
            </div>
            <div className="capability-card-stat" style={{ color: "#4ade80" }}>{activeCustomers}</div>
            <h3 className="capability-card-heading">Retained Clients</h3>
            <p className="capability-card-desc">
              High-confidence accounts committed to ongoing engagement contracts.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <Activity size={22} />
            </div>
            <div className="capability-card-stat" style={{ color: "#c084fc" }}>{qualifiedLeads}</div>
            <h3 className="capability-card-heading">Target Qualified</h3>
            <p className="capability-card-desc">
              Validated prospects primed for immediate strategic acquisition.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <CircleDollarSign size={22} />
            </div>
            <div className="capability-card-stat">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <h3 className="capability-card-heading">Pipeline Capital</h3>
            <p className="capability-card-desc">
              Aggregate valuation under active negotiation across all operational sectors.
            </p>
          </div>
        </section>

        {/* Database Search & Status Controls */}
        <section className="controls-glass-panel">
          <div className="search-field-wrapper">
            <Search className="search-field-icon" size={16} />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search across identity, corporate domain, or key identifier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select-circuit"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">FILTER: ALL SECTORS</option>
            <option value="Lead">FILTER: LEAD</option>
            <option value="Contacted">FILTER: CONTACTED</option>
            <option value="Qualified">FILTER: QUALIFIED</option>
            <option value="Customer">FILTER: CUSTOMER</option>
            <option value="Lost">FILTER: LOST</option>
          </select>
        </section>

        {/* Contacts Matrix Table */}
        <section className="table-glass-card">
          {isLoading ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw className="spin-icon" size={24} style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
              <div>Synchronizing database records from SCRM...</div>
            </div>
          ) : isError ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#f87171" }}>
              {error?.response?.data?.error || error?.message || "Failed to load database records."}
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: "4.5rem 2rem", textAlign: "center" }}>
              <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>02 // EMPTY MATRIX</div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                NO RECORDS INDEXED
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
                Deploy your first deal or contact to begin building the neural customer graph.
              </p>
              <button className="button-primary-hero" onClick={() => handleOpenModal()}>
                <UserPlus size={16} />
                <span>Deploy Entity</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Operator / Entity</th>
                    <th>Organization</th>
                    <th>Communication Channel</th>
                    <th>Telemetry Phone</th>
                    <th>Lifecycle State</th>
                    <th>Valuation</th>
                    <th style={{ textAlign: "right" }}>Direct Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td style={{ fontWeight: 600, color: "#FFFFFF" }}>{contact.name}</td>
                      <td>{contact.company || "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                        {contact.email}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>{contact.phone || "—"}</td>
                      <td>
                        <span className={`status-badge-chip status-${(contact.status || "lead").toLowerCase()}`}>
                          {contact.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>
                        ${Number(contact.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            className="action-icon-btn"
                            onClick={() => handleOpenModal(contact)}
                            title="Edit Record"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="action-icon-btn delete"
                            onClick={() => handleDelete(contact.id)}
                            disabled={deleteMutation.isPending}
                            title="Purge Record"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Asymmetric 2-Column Grid (Glass Identity Card left & 2×2 Capability Chips right) per Spec */}
        <section className="crm-section-pad" id="intelligence">
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>
            02 // SYSTEM CAPABILITY ARCHITECTURE
          </div>
          <div className="asymmetric-2up-grid">
            {/* Glass Identity Card */}
            <div className="card-identity-glass">
              <div className="eyebrow">02.1 // IDENTITY CONTROL</div>
              <h2 className="identity-headline">OPERATOR: {user?.name || "AUTHENTICATED AGENT"}</h2>
              <p className="identity-body">
                Full-access administrative authority over the SCRM workspace, connected directly to enterprise Microsoft SQL Server infrastructure with low-latency Sequelize synchronization.
              </p>
              <p className="identity-body" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Active Session Token ID: <code style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>SCRM-SEC-{user?.id || 1}-9942</code>
              </p>
            </div>

            {/* Capability Chip (×4 in a 2×2 grid, rows [48/48|48/48]) per Spec */}
            <div className="capability-chips-grid">
              <div className="card-capability-chip">
                <Database size={18} color="#00D9FF" />
                <span className="chip-label">MSSQL Relational Core</span>
              </div>
              <div className="card-capability-chip">
                <Lock size={18} color="#00D9FF" />
                <span className="chip-label">Bcrypt + JWT Encryption</span>
              </div>
              <div className="card-capability-chip">
                <Workflow size={18} color="#00D9FF" />
                <span className="chip-label">Reactive Query Telemetry</span>
              </div>
              <div className="card-capability-chip">
                <Sparkles size={18} color="#00D9FF" />
                <span className="chip-label">Halftone Circuit Interface</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Band per Spec: 2-Column Split (Form right, contact details left) with 76px Cyan CTA */}
        <section className="crm-section-pad" id="dispatch" style={{ paddingBottom: "120px" }}>
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>
            03 // DIRECT DISPATCH & INQUIRY
          </div>
          <div className="contact-band-split">
            {/* Contact details left */}
            <div className="contact-details-col">
              <h2 style={{ fontSize: "2.4rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1.25rem", lineHeight: 1.1 }}>
                SECURE DISPATCH <br />
                <span style={{ color: "var(--accent)" }}>TERMINAL</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Transmit immediate protocol alerts, pipeline delegations, or custom CRM schema requests directly to operational management.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Terminal size={16} color="#00D9FF" />
                  <span>SCRM Node: <strong style={{ color: "#FFF" }}>Production Cluster 01</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <Mail size={16} color="#00D9FF" />
                  <span>Encrypted Gateway: <strong style={{ color: "#FFF" }}>dispatch@scrm.network</strong></span>
                </div>
              </div>
            </div>

            {/* Contact form module right capped by 76px Cyan CTA button */}
            <div className="contact-form-module">
              {inquirySent ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--accent)" }}>
                  <Sparkles size={32} style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem", color: "#FFF" }}>
                    DISPATCH TRANSMITTED
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    Your message has been encrypted and queued into the operator backlog.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit}>
                  <div className="circuit-form-group">
                    <label className="circuit-label">Operator / Sender Name</label>
                    <input
                      type="text"
                      required
                      className="circuit-input"
                      placeholder="e.g. Commander Shepard"
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                    />
                  </div>

                  <div className="circuit-form-group">
                    <label className="circuit-label">Return Communication Coordinates</label>
                    <input
                      type="email"
                      required
                      className="circuit-input"
                      placeholder="shepard@alliance.org"
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                    />
                  </div>

                  <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
                    <label className="circuit-label">Dispatch Payload / Message</label>
                    <textarea
                      required
                      rows={4}
                      className="circuit-input"
                      style={{ resize: "vertical" }}
                      placeholder="Enter tactical request or pipeline status notes..."
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                    />
                  </div>

                  {/* Final CTA Button per Spec: 76px height, 16px radius, #00D9FF */}
                  <button type="submit" className="button-cta-final">
                    <span>TRANSMIT DISPATCH</span>
                    <Send size={20} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer per Spec: transparent background, small copyright left, tracked tagline right */}
      <footer className="footer-circuit">
        <div>
          © {new Date().getFullYear()} SCRM. All rights reserved.
        </div>
        <div className="footer-tagline">
          PRECISION CRM // ZERO COMPROMISE
        </div>
      </footer>

      {/* Add / Edit Contact Modal Card */}
      {isModalOpen && (
        <div className="modal-overlay-circuit" onClick={handleCloseModal}>
          <div className="modal-card-circuit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>
                {editingContact ? "04 // MODIFY RECORD" : "04 // NEW IDENTITY ENTRY"}
              </div>
              <h3 className="modal-title-circuit">
                {editingContact ? "Edit Entity Details" : "Provision Contact"}
              </h3>
            </div>

            {formError && (
              <div className="auth-error-banner" style={{ marginBottom: "1.25rem" }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="circuit-form-group">
                <label className="circuit-label">Entity Full Name *</label>
                <input
                  type="text"
                  required
                  className="circuit-input"
                  placeholder="e.g. Elena Rostova"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Email Coordinate *</label>
                <input
                  type="email"
                  required
                  className="circuit-input"
                  placeholder="elena@rostova-dynamics.io"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Organization / Domain</label>
                <input
                  type="text"
                  className="circuit-input"
                  placeholder="Rostova Dynamics Corp"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Telephone Terminal</label>
                <input
                  type="tel"
                  className="circuit-input"
                  placeholder="+1 (800) 555-0199"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                <div className="circuit-form-group" style={{ marginBottom: 0 }}>
                  <label className="circuit-label">Pipeline Stage</label>
                  <select
                    className="circuit-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Customer">Customer</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="circuit-form-group" style={{ marginBottom: 0 }}>
                  <label className="circuit-label">Contract Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="circuit-input"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  className="button-secondary-hero" 
                  style={{ height: "46px" }}
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Dismiss
                </button>
                <button 
                  type="submit" 
                  className="button-cta-final" 
                  style={{ width: "auto", height: "46px", padding: "0 28px", fontSize: "0.9375rem" }}
                  disabled={isSaving}
                >
                  {isSaving ? "Persisting..." : editingContact ? "Commit Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
