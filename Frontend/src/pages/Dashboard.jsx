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
  Cpu
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getContacts, createContact, updateContact, deleteContact } from "../services/api";
import "../App.css";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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

  const totalValue = contacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const activeCustomers = contacts.filter((c) => c.status === "Customer").length;
  const qualifiedLeads = contacts.filter((c) => c.status === "Qualified").length;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {/* 81px Edge-to-Edge Circuit Navbar */}
      <nav className="navbar-circuit">
        <div className="nav-brand">
          <div className="brand-glyph">
            <Cpu size={20} color="#00D9FF" />
          </div>
          <div>
            <span className="brand-title">SCRM <span className="brand-accent">//</span> SYSTEM</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div className="nav-profile-pill">
            <Terminal size={14} color="#00D9FF" />
            <span>OPERATOR: <strong style={{ color: "#FFFFFF" }}>{user?.name || "Agent"}</strong></span>
          </div>

          <button 
            className="btn-pill-glass" 
            onClick={() => refetch()} 
            disabled={isFetching}
            title="Refresh database records"
          >
            <RefreshCw size={14} className={isFetching ? "spin-icon" : ""} />
            <span>Sync</span>
          </button>

          <button 
            className="btn-pill-solid" 
            onClick={() => handleOpenModal()}
          >
            <UserPlus size={16} />
            <span>New Record</span>
          </button>

          <button 
            className="action-icon-btn delete" 
            onClick={logout} 
            title="Disconnect Session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="crm-layout">
        {/* Hero Section */}
        <header className="crm-hero">
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

          <div className="hero-action-row">
            <button className="btn-pill-solid" onClick={() => handleOpenModal()}>
              <UserPlus size={16} />
              <span>Deploy Contact</span>
            </button>
            <button className="btn-pill-glass" onClick={() => refetch()}>
              <RefreshCw size={15} />
              <span>Query Database</span>
            </button>
          </div>
        </header>

        {/* Uniform 4-Up Core Capability / Metric Grid */}
        <section className="metrics-4up-grid">
          <div className="metric-card-circuit">
            <div className="metric-icon-badge">
              <Layers size={22} />
            </div>
            <div className="metric-val">{contacts.length}</div>
            <div className="metric-lbl">Total Entities</div>
          </div>

          <div className="metric-card-circuit">
            <div className="metric-icon-badge">
              <ShieldCheck size={22} />
            </div>
            <div className="metric-val" style={{ color: "#4ade80" }}>{activeCustomers}</div>
            <div className="metric-lbl">Retained Clients</div>
          </div>

          <div className="metric-card-circuit">
            <div className="metric-icon-badge">
              <Activity size={22} />
            </div>
            <div className="metric-val" style={{ color: "#c084fc" }}>{qualifiedLeads}</div>
            <div className="metric-lbl">Qualified Targets</div>
          </div>

          <div className="metric-card-circuit">
            <div className="metric-icon-badge">
              <CircleDollarSign size={22} />
            </div>
            <div className="metric-val" style={{ color: "var(--accent)" }}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Pipeline Allocation</div>
          </div>
        </section>

        {/* Controls Glass Panel */}
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
            <option value="All">STATUS: ALL ENTITIES</option>
            <option value="Lead">STATUS: LEAD</option>
            <option value="Contacted">STATUS: CONTACTED</option>
            <option value="Qualified">STATUS: QUALIFIED</option>
            <option value="Customer">STATUS: CUSTOMER</option>
            <option value="Lost">STATUS: LOST</option>
          </select>
        </section>

        {/* Table Glass Card */}
        <section className="table-glass-card">
          {isLoading ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw className="spin-icon" size={24} style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
              <div>Synchronizing records from MSSQL...</div>
            </div>
          ) : isError ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#f87171" }}>
              {error?.response?.data?.error || error?.message || "Failed to load database records."}
            </div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
              <div className="eyebrow" style={{ marginBottom: "0.5rem" }}>02 // EMPTY MATRIX</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                NO RECORDS INDEXED
              </h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                Add your first deal or contact to begin building the neural customer graph.
              </p>
              <button className="btn-pill-solid" onClick={() => handleOpenModal()}>
                <UserPlus size={16} />
                <span>Create Entity Record</span>
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
      </main>

      {/* Modal Card */}
      {isModalOpen && (
        <div className="modal-overlay-circuit" onClick={handleCloseModal}>
          <div className="modal-card-circuit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>
                {editingContact ? "03 // MODIFY RECORD" : "03 // NEW IDENTITY ENTRY"}
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
                  className="btn-pill-glass" 
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Dismiss
                </button>
                <button 
                  type="submit" 
                  className="btn-cyan-cta" 
                  style={{ width: "auto", minHeight: "44px", padding: "10px 24px" }}
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
