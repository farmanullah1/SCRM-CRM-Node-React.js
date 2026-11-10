import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  UserPlus, 
  Search, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  LogOut,
  Users, 
  ShieldCheck, 
  Target, 
  DollarSign, 
  Send,
  Database,
  Lock,
  Zap,
  HelpCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getContacts, createContact, updateContact, deleteContact } from "../services/api";
import "../App.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Contact support / message form state
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
      setFormError(err.response?.data?.error || "Failed to create contact.");
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      handleCloseModal();
    },
    onError: (err) => {
      setFormError(err.response?.data?.error || "Failed to update contact.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to delete contact.");
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
    if (window.confirm("Are you sure you want to delete this contact?")) {
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
      {/* 81px Edge-to-Edge Navigation Bar */}
      <nav className="navbar-circuit">
        {/* Brand */}
        <div className="nav-brand">
          <div className="brand-glyph">
            <Zap size={20} color="#00D9FF" />
          </div>
          <span className="brand-title">SCRM</span>
        </div>

        {/* Center Links */}
        <div className="nav-center-links">
          <a href="#pipeline" className="nav-link-circuit">Overview</a>
          <a href="#contacts" className="nav-link-circuit">Contacts</a>
          <a href="#system" className="nav-link-circuit">Features</a>
          <a href="#contact-us" className="nav-link-circuit">Support</a>
        </div>

        {/* Right Actions */}
        <div className="nav-right-items">
          <button 
            className="button-nav-utility"
            onClick={() => handleOpenModal()}
          >
            <UserPlus size={15} />
            <span>Add Contact</span>
          </button>

          <button 
            className="action-icon-btn delete" 
            onClick={logout} 
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="crm-layout">
        {/* Hero Section */}
        <header className="crm-hero" id="pipeline">
          <div className="eyebrow">
            CRM DASHBOARD
          </div>

          <h1 className="hero-display-stack">
            TRACK DEALS.<br />
            MANAGE LEADS.<br />
            <span className="cyan-text">GROW YOUR BUSINESS.</span>
          </h1>

          <p className="hero-lead-text">
            A simple, fast CRM to organize your customer contacts, follow up on deals, and track pipeline revenue in real time.
          </p>

          {/* Action Row */}
          <div className="hero-three-button-row">
            <button className="button-primary-hero" onClick={() => handleOpenModal()}>
              <UserPlus size={18} />
              <span>Add New Contact</span>
            </button>
            <button className="button-secondary-hero" onClick={() => refetch()}>
              <RefreshCw size={16} className={isFetching ? "spin-icon" : ""} />
              <span>Refresh Data</span>
            </button>
            <a href="#contact-us" className="button-secondary-hero">
              <HelpCircle size={16} />
              <span>Contact Support</span>
            </a>
          </div>
        </header>

        {/* 4 Metrics Cards */}
        <section className="capability-4up-row">
          <div className="core-capability-card">
            <div className="icon-badge-square">
              <Users size={22} />
            </div>
            <div className="capability-card-stat">{contacts.length}</div>
            <h3 className="capability-card-heading">Total Contacts</h3>
            <p className="capability-card-desc">
              All active customer and prospect records saved in your CRM.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <ShieldCheck size={22} />
            </div>
            <div className="capability-card-stat" style={{ color: "#4ade80" }}>{activeCustomers}</div>
            <h3 className="capability-card-heading">Active Customers</h3>
            <p className="capability-card-desc">
              Clients who have successfully closed a deal or signed up.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <Target size={22} />
            </div>
            <div className="capability-card-stat" style={{ color: "#c084fc" }}>{qualifiedLeads}</div>
            <h3 className="capability-card-heading">Qualified Leads</h3>
            <p className="capability-card-desc">
              Prospects ready for follow-up and deal negotiation.
            </p>
          </div>

          <div className="core-capability-card">
            <div className="icon-badge-square">
              <DollarSign size={22} />
            </div>
            <div className="capability-card-stat">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <h3 className="capability-card-heading">Pipeline Value</h3>
            <p className="capability-card-desc">
              Estimated total value of all deals across your pipeline.
            </p>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="controls-glass-panel" id="contacts">
          <div className="search-field-wrapper">
            <Search className="search-field-icon" size={16} />
            <input
              type="text"
              className="search-field-input"
              placeholder="Search by name, company, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select-circuit"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Lead">Status: Lead</option>
            <option value="Contacted">Status: Contacted</option>
            <option value="Qualified">Status: Qualified</option>
            <option value="Customer">Status: Customer</option>
            <option value="Lost">Status: Lost</option>
          </select>
        </section>

        {/* Contacts Table */}
        <section className="table-glass-card">
          {isLoading ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw className="spin-icon" size={24} style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
              <div>Loading your contacts...</div>
            </div>
          ) : isError ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#f87171" }}>
              {error?.response?.data?.error || error?.message || "Failed to load contacts."}
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: "4.5rem 2rem", textAlign: "center" }}>
              <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>NO CONTACTS YET</div>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Your Contact List is Empty
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.75rem" }}>
                Add your first customer or deal to start tracking your sales pipeline.
              </p>
              <button className="button-primary-hero" onClick={() => handleOpenModal()}>
                <UserPlus size={16} />
                <span>Add First Contact</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Contact Name</th>
                    <th>Company</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Deal Value</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
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
                            title="Edit Contact"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            className="action-icon-btn delete"
                            onClick={() => handleDelete(contact.id)}
                            disabled={deleteMutation.isPending}
                            title="Delete Contact"
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

        {/* User Profile & Features Info */}
        <section className="crm-section-pad" id="system">
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>
            ACCOUNT & SYSTEM INFO
          </div>
          <div className="asymmetric-2up-grid">
            {/* User Profile Card */}
            <div className="card-identity-glass">
              <div className="eyebrow">YOUR PROFILE</div>
              <h2 className="identity-headline">{user?.name || "User Account"}</h2>
              <p className="identity-body">
                Signed in as <strong>{user?.email}</strong>. You have full permissions to add, edit, and organize customer data.
              </p>
              <p className="identity-body" style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                Connected to Microsoft SQL Server with safe, encrypted data storage.
              </p>
            </div>

            {/* Features 2x2 grid */}
            <div className="capability-chips-grid">
              <div className="card-capability-chip">
                <Database size={18} color="#00D9FF" />
                <span className="chip-label">SQL Server Database</span>
              </div>
              <div className="card-capability-chip">
                <Lock size={18} color="#00D9FF" />
                <span className="chip-label">Secure Authentication</span>
              </div>
              <div className="card-capability-chip">
                <Zap size={18} color="#00D9FF" />
                <span className="chip-label">Real-Time Updates</span>
              </div>
              <div className="card-capability-chip">
                <DollarSign size={18} color="#00D9FF" />
                <span className="chip-label">Deal Value Tracking</span>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Support Section */}
        <section className="crm-section-pad" id="contact-us" style={{ paddingBottom: "120px" }}>
          <div className="eyebrow" style={{ marginBottom: "1rem" }}>
            SUPPORT & FEEDBACK
          </div>
          <div className="contact-band-split">
            {/* Left text */}
            <div className="contact-details-col">
              <h2 style={{ fontSize: "2.4rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "1.25rem", lineHeight: 1.1 }}>
                HAVE QUESTIONS? <br />
                <span style={{ color: "var(--accent)" }}>WE'RE HERE TO HELP.</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "1rem", lineHeight: 1.6, marginBottom: "2rem" }}>
                Send us a message if you need assistance, want to suggest a new CRM feature, or have feedback about your experience.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <span>Support Email: <strong style={{ color: "#FFF" }}>support@scrm.com</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  <span>Response Time: <strong style={{ color: "#FFF" }}>Within 24 hours</strong></span>
                </div>
              </div>
            </div>

            {/* Right Form */}
            <div className="contact-form-module">
              {inquirySent ? (
                <div style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--accent)" }}>
                  <ShieldCheck size={32} style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem", color: "#FFF" }}>
                    Message Sent!
                  </h3>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    Thank you for reaching out. We will get back to you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleInquirySubmit}>
                  <div className="circuit-form-group">
                    <label className="circuit-label">Your Name</label>
                    <input
                      type="text"
                      required
                      className="circuit-input"
                      placeholder="e.g. Sarah Connor"
                      value={inquiryName}
                      onChange={(e) => setInquiryName(e.target.value)}
                    />
                  </div>

                  <div className="circuit-form-group">
                    <label className="circuit-label">Email Address</label>
                    <input
                      type="email"
                      required
                      className="circuit-input"
                      placeholder="sarah@company.com"
                      value={inquiryEmail}
                      onChange={(e) => setInquiryEmail(e.target.value)}
                    />
                  </div>

                  <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
                    <label className="circuit-label">Message</label>
                    <textarea
                      required
                      rows={4}
                      className="circuit-input"
                      style={{ resize: "vertical" }}
                      placeholder="How can we help you?"
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="button-cta-final">
                    <span>SEND MESSAGE</span>
                    <Send size={20} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer-circuit">
        <div>
          © {new Date().getFullYear()} SCRM. All rights reserved.
        </div>
        <div className="footer-tagline">
          SIMPLE CRM // FAST, RELIABLE & SECURE
        </div>
      </footer>

      {/* Add / Edit Contact Modal Card */}
      {isModalOpen && (
        <div className="modal-overlay-circuit" onClick={handleCloseModal}>
          <div className="modal-card-circuit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>
                {editingContact ? "UPDATE CONTACT" : "NEW CONTACT"}
              </div>
              <h3 className="modal-title-circuit">
                {editingContact ? "Edit Contact Details" : "Add New Contact"}
              </h3>
            </div>

            {formError && (
              <div className="auth-error-banner" style={{ marginBottom: "1.25rem" }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="circuit-form-group">
                <label className="circuit-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="circuit-input"
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="circuit-input"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Company Name</label>
                <input
                  type="text"
                  className="circuit-input"
                  placeholder="e.g. Acme Corporation"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Phone Number</label>
                <input
                  type="tel"
                  className="circuit-input"
                  placeholder="+1 (555) 019-2834"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                <div className="circuit-form-group" style={{ marginBottom: 0 }}>
                  <label className="circuit-label">Lead Status</label>
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
                  <label className="circuit-label">Deal Value ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="circuit-input"
                    placeholder="0"
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
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="button-cta-final" 
                  style={{ width: "auto", height: "46px", padding: "0 28px", fontSize: "0.9375rem" }}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : editingContact ? "Save Changes" : "Save Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
