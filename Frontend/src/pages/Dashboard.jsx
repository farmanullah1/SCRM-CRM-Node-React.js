import React, { useState, useMemo } from "react";
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
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  Filter,
  Check,
  Zap,
  Briefcase,
  Layers,
  ChevronRight,
  Download,
  Upload,
  Mail,
  Send,
  FileText,
  LifeBuoy,
  GitMerge,
  Phone,
  MessageSquare,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { 
  getContacts, 
  createContact, 
  updateContact, 
  deleteContact,
  bulkImportContacts,
  mergeContacts,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getActivities,
  createActivity,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  getEmailTemplates,
  getEmailLogs,
  sendEmail
} from "../services/api";
import "../App.css";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Navigation Tabs: 'dashboard' | 'contacts' | 'pipeline' | 'tasks' | 'activities' | 'invoices' | 'tickets' | 'emails'
  const [activeTab, setActiveTab] = useState("dashboard");

  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [leadSourceFilter, setLeadSourceFilter] = useState("All");
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "New",
    value: 0,
    leadSource: "Website",
    tags: "",
    notes: "",
    expectedCloseDate: ""
  });
  const [contactFormError, setContactFormError] = useState("");

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    status: "Pending",
    contactId: ""
  });

  // Activity Log Modal
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityFormData, setActivityFormData] = useState({
    contactId: "",
    type: "Call",
    title: "",
    description: "",
    outcome: "Interested"
  });

  // Invoice / Quote Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    contactId: "",
    type: "Invoice",
    amount: 0,
    status: "Draft",
    dueDate: "",
    items: ""
  });

  // Ticket Modal
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({
    contactId: "",
    subject: "",
    description: "",
    priority: "Medium",
    status: "Open"
  });

  // Send Email Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailFormData, setEmailFormData] = useState({
    contactId: "",
    recipientEmail: "",
    subject: "",
    body: ""
  });

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  // Queries
  const { data: contacts = [], isLoading: isContactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: ["contacts", { search: searchTerm, status: statusFilter, leadSource: leadSourceFilter }],
    queryFn: () => getContacts({ search: searchTerm, status: statusFilter, leadSource: leadSourceFilter })
  });

  const { data: tasks = [], isLoading: isTasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", { status: taskStatusFilter }],
    queryFn: () => getTasks({ status: taskStatusFilter })
  });

  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ["activities"],
    queryFn: () => getActivities({})
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => getInvoices({})
  });

  const { data: tickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ["tickets"],
    queryFn: () => getTickets({})
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ["emailTemplates"],
    queryFn: getEmailTemplates
  });

  const { data: emailLogs = [], refetch: refetchEmails } = useQuery({
    queryKey: ["emailLogs"],
    queryFn: getEmailLogs
  });

  // Mutations
  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsContactModalOpen(false);
    },
    onError: (err) => setContactFormError(err.response?.data?.error || "Failed to create contact.")
  });

  const updateContactMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsContactModalOpen(false);
    },
    onError: (err) => setContactFormError(err.response?.data?.error || "Failed to update contact.")
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] })
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
  });

  const createActivityMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsActivityModalOpen(false);
    }
  });

  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setIsInvoiceModalOpen(false);
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsTicketModalOpen(false);
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsEmailModalOpen(false);
      alert("Email sent and recorded in activity log!");
    }
  });

  // Export to CSV
  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert("No contacts to export.");
      return;
    }
    const headers = ["ID", "Name", "Email", "Phone", "Company", "Status", "Value", "LeadSource", "Tags"];
    const rows = contacts.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.email}"`,
      `"${c.phone || ""}"`,
      `"${c.company || ""}"`,
      `"${c.status}"`,
      c.value || 0,
      `"${c.leadSource || ""}"`,
      `"${c.tags || ""}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SCRM_Contacts_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV text
  const handleProcessCSVImport = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split("\n");
      const parsedContacts = [];
      for (let i = 0; i < lines.length; i++) {
        // Skip header if contains 'name' or 'email'
        if (i === 0 && (lines[i].toLowerCase().includes("name") || lines[i].toLowerCase().includes("email"))) continue;
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (cols[0] && cols[1]) {
          parsedContacts.push({
            name: cols[0],
            email: cols[1],
            phone: cols[2] || "",
            company: cols[3] || "",
            status: cols[4] || "New",
            value: Number(cols[5]) || 0,
            leadSource: cols[6] || "Import",
            tags: cols[7] || "Imported"
          });
        }
      }
      if (parsedContacts.length === 0) {
        alert("No valid contacts found in CSV text.");
        return;
      }
      const res = await bulkImportContacts(parsedContacts);
      alert(res.message);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setIsImportModalOpen(false);
      setCsvText("");
    } catch (e) {
      alert("Import error: " + (e.response?.data?.error || e.message));
    }
  };

  // Stage change trigger
  const handleMoveStage = (contactId, newStatus) => {
    updateContactMutation.mutate({
      id: contactId,
      data: { status: newStatus }
    });
  };

  // Metrics
  const totalPipelineValue = contacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const wonValue = contacts.filter(c => c.status === "Won").reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const wonCount = contacts.filter(c => c.status === "Won").length;
  const proposalCount = contacts.filter(c => c.status === "Proposal").length;
  const pendingTasks = tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress");

  return (
    <>
      {/* 74px Sticky Top Navbar */}
      <nav className="navbar-circuit">
        <div className="nav-brand" onClick={() => setActiveTab("dashboard")}>
          <div className="brand-glyph">
            <Zap size={20} color="#F0FF60" />
          </div>
          <span className="brand-title">SCRM</span>
        </div>

        {/* Dynamic CRM Tabs */}
        <div className="nav-tab-links">
          <button 
            className={`nav-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <TrendingUp size={15} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "contacts" ? "active" : ""}`}
            onClick={() => setActiveTab("contacts")}
          >
            <Users size={15} />
            <span>Contacts ({contacts.length})</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "pipeline" ? "active" : ""}`}
            onClick={() => setActiveTab("pipeline")}
          >
            <Layers size={15} />
            <span>Pipeline</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <Calendar size={15} />
            <span>Tasks ({pendingTasks.length})</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "activities" ? "active" : ""}`}
            onClick={() => setActiveTab("activities")}
          >
            <Clock size={15} />
            <span>Activity Log</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "invoices" ? "active" : ""}`}
            onClick={() => setActiveTab("invoices")}
          >
            <FileText size={15} />
            <span>Quotes & Invoices</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <LifeBuoy size={15} />
            <span>Tickets ({openTickets.length})</span>
          </button>
        </div>

        {/* Right Action Bar */}
        <div className="nav-right-items">
          <button className="btn-primary-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
            <UserPlus size={16} />
            <span>New Lead</span>
          </button>
          <button className="action-icon-btn delete" onClick={logout} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <main className="crm-layout">
        {/* Top Hero Section */}
        <header className="crm-hero">
          <div className="eyebrow">ENTERPRISE CRM // OPERATOR: {user?.name || "ADMIN"}</div>
          <h1 className="hero-display-stack">
            DRIVE DEALS.<br />
            AUTOMATE TASKS.<br />
            <span className="yellow-text">COMPLETE VISIBILITY.</span>
          </h1>
          <p className="hero-lead-text">
            Comprehensive CRM suite for contact relationships, pipeline stages, automated activities, invoicing, and customer ticketing backed by Microsoft SQL Server.
          </p>

          <div className="hero-three-button-row">
            <button className="btn-primary-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
              <UserPlus size={17} />
              <span>Create Lead</span>
            </button>
            <button className="btn-ghost-dark" onClick={() => setIsTaskModalOpen(true)}>
              <Plus size={17} color="#F0FF60" />
              <span>Schedule Follow-Up</span>
            </button>
            <button className="btn-ghost-dark" onClick={() => setIsActivityModalOpen(true)}>
              <Phone size={16} color="#F0FF60" />
              <span>Log Call / Meeting</span>
            </button>
            <button className="btn-ghost-dark" onClick={() => setIsEmailModalOpen(true)}>
              <Mail size={16} color="#F0FF60" />
              <span>Send Email</span>
            </button>
            <button className="btn-ghost-dark" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button className="btn-ghost-dark" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={16} />
              <span>Import CSV</span>
            </button>
          </div>
        </header>

        {/* 4-Up High Impact Telemetry Grid */}
        <section className="metrics-4up-grid">
          <div className="metric-card-circuit" onClick={() => setActiveTab("contacts")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><Users size={22} /></div>
            <div className="metric-val">{contacts.length}</div>
            <div className="metric-lbl">Total Contacts & Leads</div>
            <div className="metric-sub">Across all pipeline stages</div>
          </div>

          <div className="metric-card-circuit" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><DollarSign size={22} /></div>
            <div className="metric-val" style={{ color: "var(--accent)" }}>
              ${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Active Pipeline Value</div>
            <div className="metric-sub">{proposalCount} deals in Proposal stage</div>
          </div>

          <div className="metric-card-circuit" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><ShieldCheck size={22} /></div>
            <div className="metric-val" style={{ color: "var(--semantic-success)" }}>
              ${wonValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Won Deals Revenue</div>
            <div className="metric-sub">{wonCount} closed won contracts</div>
          </div>

          <div className="metric-card-circuit" onClick={() => setActiveTab("tasks")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><Calendar size={22} /></div>
            <div className="metric-val" style={{ color: pendingTasks.length > 0 ? "var(--accent-bright)" : "var(--text-muted)" }}>
              {pendingTasks.length}
            </div>
            <div className="metric-lbl">Pending Reminders</div>
            <div className="metric-sub">{openTickets.length} open support tickets</div>
          </div>
        </section>

        {/* Inverted Yellow Card */}
        <section className="card-inverted-yellow">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <div className="eyebrow" style={{ color: "#4F5101", marginBottom: "0.25rem" }}>
                PIPELINE OPERATIONS ACCELERATOR
              </div>
              <h3>Automated Lead Capture & Deal Tracking</h3>
              <p>
                Capture website inquiries, log customer interactions automatically, generate quotes, and manage tickets in one unified dark workspace.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn-inverted-dark" onClick={() => setActiveTab("pipeline")}>
                  <span>Pipeline Kanban</span>
                  <ArrowRight size={16} />
                </button>
                <button className="btn-inverted-dark" onClick={() => setActiveTab("invoices")}>
                  <FileText size={16} />
                  <span>Create Quote / Invoice</span>
                </button>
              </div>
            </div>

            <div style={{ background: "rgba(0, 0, 0, 0.08)", padding: "1.25rem 1.5rem", borderRadius: "14px", border: "1px solid #4F5101" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3B3D01" }}>
                CRM Database Health
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--text-inverted)", margin: "0.25rem 0" }}>
                MS SQL SERVER
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#2B2D01" }}>
                Encrypted Session · Role: {user?.role || "Admin"}
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TAB 1: DASHBOARD OVERVIEW
           ========================================================================= */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              {/* Recent Deals */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-heading)" }}>Recent Leads & Contacts</h3>
                  <button className="btn-ghost-dark" style={{ height: "34px", fontSize: "0.8125rem" }} onClick={() => setActiveTab("contacts")}>
                    View All ({contacts.length})
                  </button>
                </div>
                <div className="table-glass-card" style={{ marginBottom: 0 }}>
                  <table className="circuit-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Stage</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.slice(0, 5).map(c => (
                        <tr key={c.id} onClick={() => { setEditingContact(c); setIsContactModalOpen(true); }} style={{ cursor: "pointer" }}>
                          <td style={{ fontWeight: 700, color: "#FFF" }}>{c.name}</td>
                          <td>{c.company || "—"}</td>
                          <td><span className={`status-badge-chip status-${(c.status || "new").toLowerCase()}`}>{c.status}</span></td>
                          <td style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            ${Number(c.value || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actionable Follow-ups */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-heading)" }}>Upcoming Tasks & Calls</h3>
                  <button className="btn-primary-yellow" style={{ height: "34px", fontSize: "0.8125rem" }} onClick={() => setIsTaskModalOpen(true)}>
                    <Plus size={14} />
                    <span>New Task</span>
                  </button>
                </div>
                <div className="tasks-container">
                  {pendingTasks.slice(0, 4).map(t => (
                    <div key={t.id} className="task-item-card" style={{ padding: "0.85rem 1.15rem" }}>
                      <div className="task-left-section">
                        <button className="task-checkbox-btn" onClick={() => updateTaskMutation.mutate({ id: t.id, data: { status: "Completed" } })}>
                          <Check size={14} />
                        </button>
                        <div>
                          <div className="task-title" style={{ fontSize: "0.875rem" }}>{t.title}</div>
                          <div className="task-meta">
                            {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                            {t.Contact && <span style={{ color: "var(--accent)" }}>{t.Contact.name}</span>}
                          </div>
                        </div>
                      </div>
                      <span className={`priority-chip priority-${(t.priority || "medium").toLowerCase()}`}>{t.priority}</span>
                    </div>
                  ))}
                  {pendingTasks.length === 0 && (
                    <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", border: "1px dashed var(--border-hairline)", borderRadius: "14px" }}>
                      No pending tasks! All caught up.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-heading)" }}>Live Interaction & Activity Timeline</h3>
                <button className="btn-ghost-dark" style={{ height: "34px", fontSize: "0.8125rem" }} onClick={() => setIsActivityModalOpen(true)}>
                  <Plus size={14} />
                  <span>Log Activity</span>
                </button>
              </div>
              <div className="table-glass-card">
                <table className="circuit-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Activity Subject</th>
                      <th>Associated Contact</th>
                      <th>Outcome / Note</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.slice(0, 6).map(a => (
                      <tr key={a.id}>
                        <td>
                          <span className="eyebrow" style={{ color: a.type === "Call" ? "var(--accent)" : a.type === "Email" ? "var(--semantic-info)" : "#FFF" }}>
                            {a.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "#FFF" }}>{a.title}</td>
                        <td>{a.Contact ? a.Contact.name : "General"}</td>
                        <td style={{ color: "var(--text-muted)" }}>{a.outcome || a.description || "—"}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {activities.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                          No activities logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: CONTACTS & LEADS MANAGEMENT
           ========================================================================= */}
        {activeTab === "contacts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Contact Directory ({contacts.length})
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Manage leads, companies, communication channels, tags, and custom fields.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn-ghost-dark" onClick={handleExportCSV}>
                  <Download size={15} />
                  <span>Export</span>
                </button>
                <button className="btn-ghost-dark" onClick={() => setIsImportModalOpen(true)}>
                  <Upload size={15} />
                  <span>Import</span>
                </button>
                <button className="btn-primary-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                  <UserPlus size={16} />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="controls-glass-panel">
              <div className="search-field-wrapper">
                <Search className="search-field-icon" size={16} />
                <input
                  type="text"
                  className="search-field-input"
                  placeholder="Search by name, email, company, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select className="filter-select-circuit" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Stages</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <select className="filter-select-circuit" value={leadSourceFilter} onChange={(e) => setLeadSourceFilter(e.target.value)}>
                <option value="All">All Lead Sources</option>
                <option value="Website">Website</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Cold Outreach">Cold Outreach</option>
                <option value="Import">Import</option>
              </select>
            </div>

            {/* Table */}
            <div className="table-glass-card">
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Contact & Company</th>
                    <th>Email & Phone</th>
                    <th>Stage</th>
                    <th>Source</th>
                    <th>Tags</th>
                    <th>Value</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "#FFF" }}>{c.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.company || "Independent"}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-body)" }}>{c.email}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.phone || "—"}</div>
                      </td>
                      <td>
                        <span className={`status-badge-chip status-${(c.status || "new").toLowerCase()}`}>{c.status}</span>
                      </td>
                      <td style={{ fontSize: "0.8125rem" }}>{c.leadSource || "Website"}</td>
                      <td>
                        {c.tags ? c.tags.split(",").map(t => (
                          <span key={t} style={{ background: "rgba(255,255,255,0.06)", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", marginRight: "0.3rem" }}>
                            {t.trim()}
                          </span>
                        )) : "—"}
                      </td>
                      <td style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        ${Number(c.value || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button className="action-icon-btn" onClick={() => { setEditingContact(c); setIsContactModalOpen(true); }} title="Edit">
                            <Edit3 size={14} />
                          </button>
                          <button className="action-icon-btn" onClick={() => { setEmailFormData({ contactId: c.id, recipientEmail: c.email, subject: "", body: "" }); setIsEmailModalOpen(true); }} title="Send Email">
                            <Mail size={14} />
                          </button>
                          <button className="action-icon-btn" onClick={() => { setActivityFormData({ contactId: c.id, type: "Call", title: `Call with ${c.name}`, description: "", outcome: "Completed" }); setIsActivityModalOpen(true); }} title="Log Activity">
                            <Phone size={14} />
                          </button>
                          <button className="action-icon-btn delete" onClick={() => { if (window.confirm("Delete contact?")) deleteContactMutation.mutate(c.id); }} title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: KANBAN PIPELINE BOARD
           ========================================================================= */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>Deal Pipeline</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Interactive Kanban deal stages: New → Contacted → Qualified → Proposal → Won/Lost.</p>
              </div>
              <button className="btn-primary-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                <Plus size={16} />
                <span>Add Deal</span>
              </button>
            </div>

            <div className="pipeline-board" style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}>
              {STAGES.map(stage => {
                const stageDeals = contacts.filter(c => (c.status || "New") === stage);
                const stageTotal = stageDeals.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

                return (
                  <div key={stage} className="pipeline-col">
                    <div className="pipeline-col-header">
                      <span className="pipeline-col-title">{stage}</span>
                      <span className="pipeline-col-count">{stageDeals.length}</span>
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: "0.75rem" }}>
                      ${stageTotal.toLocaleString()}
                    </div>

                    <div className="pipeline-cards-stack">
                      {stageDeals.map(deal => (
                        <div key={deal.id} className="pipeline-item-card" onClick={() => { setEditingContact(deal); setIsContactModalOpen(true); }}>
                          <div className="pipeline-item-name">{deal.name}</div>
                          <div className="pipeline-item-company">{deal.company || "Direct Lead"}</div>
                          <div className="pipeline-item-footer">
                            <span className="pipeline-item-value">${Number(deal.value || 0).toLocaleString()}</span>
                            <div style={{ display: "flex", gap: "0.2rem" }}>
                              {stage !== "Won" && stage !== "Lost" && (
                                <button 
                                  className="action-icon-btn" 
                                  style={{ width: "24px", height: "24px" }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = STAGES.indexOf(stage) + 1;
                                    if (nextIdx < STAGES.length) handleMoveStage(deal.id, STAGES[nextIdx]);
                                  }}
                                  title="Advance to next stage"
                                >
                                  <ChevronRight size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {stageDeals.length === 0 && (
                        <div style={{ padding: "2rem 0.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem", border: "1px dashed var(--border-hairline)", borderRadius: "10px" }}>
                          No deals
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: TASKS & REMINDERS
           ========================================================================= */}
        {activeTab === "tasks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>Tasks & Follow-Up Reminders</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Schedule to-dos, set priorities, and link actions to leads.</p>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsTaskModalOpen(true)}>
                <Plus size={16} />
                <span>Schedule Task</span>
              </button>
            </div>

            <div className="controls-glass-panel">
              <select className="filter-select-circuit" value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)}>
                <option value="All">All Task Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="tasks-container">
              {tasks.map(t => (
                <div key={t.id} className="task-item-card">
                  <div className="task-left-section">
                    <button 
                      className={`task-checkbox-btn ${t.status === "Completed" ? "completed" : ""}`}
                      onClick={() => updateTaskMutation.mutate({ id: t.id, data: { status: t.status === "Completed" ? "Pending" : "Completed" } })}
                    >
                      {t.status === "Completed" && <Check size={16} />}
                    </button>
                    <div>
                      <div className={`task-title ${t.status === "Completed" ? "completed" : ""}`}>{t.title}</div>
                      {t.description && <div style={{ fontSize: "0.8125rem", color: "var(--text-body)", marginTop: "0.2rem" }}>{t.description}</div>}
                      <div className="task-meta">
                        {t.dueDate && <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>}
                        {t.Contact && <span style={{ color: "var(--accent)" }}>{t.Contact.name} ({t.Contact.company || "Contact"})</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span className={`priority-chip priority-${(t.priority || "medium").toLowerCase()}`}>{t.priority}</span>
                    <button className="action-icon-btn delete" onClick={() => { if (window.confirm("Delete task?")) deleteTaskMutation.mutate(t.id); }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: INVOICES & QUOTES
           ========================================================================= */}
        {activeTab === "invoices" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>Quotes & Invoices</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Generate proposals, quotes, and billing invoices for your clients.</p>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsInvoiceModalOpen(true)}>
                <Plus size={16} />
                <span>New Invoice / Quote</span>
              </button>
            </div>

            <div className="table-glass-card">
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Type</th>
                    <th>Client / Contact</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "#FFF" }}>{inv.invoiceNumber}</td>
                      <td><span className="eyebrow">{inv.type}</span></td>
                      <td>{inv.Contact ? `${inv.Contact.name} (${inv.Contact.company || ""})` : "General"}</td>
                      <td style={{ color: "var(--accent)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        ${Number(inv.amount || 0).toLocaleString()}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <span className={`status-badge-chip ${inv.status === "Paid" ? "status-customer" : inv.status === "Sent" ? "status-contacted" : "status-lead"}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button className="action-icon-btn delete" onClick={() => { if (window.confirm("Remove invoice?")) deleteInvoice(inv.id).then(() => queryClient.invalidateQueries({ queryKey: ["invoices"] })); }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        No invoices or quotes generated yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: TICKETS & SUPPORT
           ========================================================================= */}
        {activeTab === "tickets" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>Customer Support Tickets</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Manage support issues, service inquiries, and resolution statuses.</p>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsTicketModalOpen(true)}>
                <Plus size={16} />
                <span>Create Ticket</span>
              </button>
            </div>

            <div className="table-glass-card">
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(tck => (
                    <tr key={tck.id}>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>{tck.ticketNumber}</td>
                      <td style={{ fontWeight: 600, color: "#FFF" }}>{tck.subject}</td>
                      <td>{tck.Contact ? tck.Contact.name : "Unassigned"}</td>
                      <td><span className={`priority-chip priority-${(tck.priority || "medium").toLowerCase()}`}>{tck.priority}</span></td>
                      <td>
                        <span className={`status-badge-chip ${tck.status === "Resolved" || tck.status === "Closed" ? "status-customer" : "status-lead"}`}>
                          {tck.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>{new Date(tck.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="action-icon-btn delete" onClick={() => { if (window.confirm("Remove ticket?")) deleteTicket(tck.id).then(() => queryClient.invalidateQueries({ queryKey: ["tickets"] })); }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                        No support tickets currently open.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: ACTIVITY LOG TIMELINE
           ========================================================================= */}
        {activeTab === "activities" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>Full Activity History</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Audit log of calls, meetings, stage updates, and note entries.</p>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsActivityModalOpen(true)}>
                <Plus size={16} />
                <span>Log New Interaction</span>
              </button>
            </div>

            <div className="table-glass-card">
              <table className="circuit-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Activity Summary</th>
                    <th>Contact</th>
                    <th>Notes & Outcome</th>
                    <th>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(a => (
                    <tr key={a.id}>
                      <td><span className="eyebrow">{a.type}</span></td>
                      <td style={{ fontWeight: 600, color: "#FFF" }}>{a.title}</td>
                      <td>{a.Contact ? a.Contact.name : "General"}</td>
                      <td style={{ color: "var(--text-muted)" }}>{a.description || a.outcome || "—"}</td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="footer-circuit">
        <div>© {new Date().getFullYear()} SCRM Enterprise. Complete Customer Relationship Management.</div>
        <div className="footer-tagline">SCRM // OBSIDIAN & ELECTRIC YELLOW</div>
      </footer>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. Contact / Lead Modal */}
      {isContactModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsContactModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">{editingContact ? "UPDATE RECORD" : "PROVISION LEAD"}</div>
              <h3 className="modal-title-circuit">{editingContact ? "Edit Contact Profile" : "Create New Contact / Deal"}</h3>
            </div>
            {contactFormError && <div className="auth-error-banner">{contactFormError}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              if (editingContact) updateContactMutation.mutate({ id: editingContact.id, data: contactFormData });
              else createContactMutation.mutate(contactFormData);
            }}>
              <div className="circuit-form-group">
                <label className="circuit-label">Full Name *</label>
                <input type="text" required className="circuit-input" placeholder="e.g. John Doe" value={contactFormData.name} onChange={e => setContactFormData({ ...contactFormData, name: e.target.value })} />
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Email Address *</label>
                <input type="email" required className="circuit-input" placeholder="john@example.com" value={contactFormData.email} onChange={e => setContactFormData({ ...contactFormData, email: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Company</label>
                  <input type="text" className="circuit-input" placeholder="Acme Corp" value={contactFormData.company} onChange={e => setContactFormData({ ...contactFormData, company: e.target.value })} />
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Phone</label>
                  <input type="tel" className="circuit-input" placeholder="+1 (555) 019-2834" value={contactFormData.phone} onChange={e => setContactFormData({ ...contactFormData, phone: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Pipeline Stage</label>
                  <select className="circuit-input" value={contactFormData.status} onChange={e => setContactFormData({ ...contactFormData, status: e.target.value })}>
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Deal Value ($)</label>
                  <input type="number" min="0" step="0.01" className="circuit-input" value={contactFormData.value} onChange={e => setContactFormData({ ...contactFormData, value: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Lead Source</label>
                  <select className="circuit-input" value={contactFormData.leadSource} onChange={e => setContactFormData({ ...contactFormData, leadSource: e.target.value })}>
                    <option value="Website">Website</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Import">Import</option>
                  </select>
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Tags (comma separated)</label>
                  <input type="text" className="circuit-input" placeholder="Enterprise, Priority" value={contactFormData.tags} onChange={e => setContactFormData({ ...contactFormData, tags: e.target.value })} />
                </div>
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Notes & Summary</label>
                <textarea rows={2} className="circuit-input" style={{ resize: "vertical" }} placeholder="Key notes about this lead..." value={contactFormData.notes} onChange={e => setContactFormData({ ...contactFormData, notes: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsContactModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">{editingContact ? "Save Changes" : "Create Contact"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Task Modal */}
      {isTaskModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">SCHEDULE TASK</div>
              <h3 className="modal-title-circuit">Add Follow-Up Item</h3>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createTaskMutation.mutate(taskFormData);
            }}>
              <div className="circuit-form-group">
                <label className="circuit-label">Task Title *</label>
                <input type="text" required className="circuit-input" placeholder="e.g. Call to discuss contract" value={taskFormData.title} onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })} />
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Associated Contact</label>
                <select className="circuit-input" value={taskFormData.contactId} onChange={e => setTaskFormData({ ...taskFormData, contactId: e.target.value })}>
                  <option value="">None / General</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || "Contact"})</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Due Date</label>
                  <input type="date" className="circuit-input" value={taskFormData.dueDate} onChange={e => setTaskFormData({ ...taskFormData, dueDate: e.target.value })} />
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Priority</label>
                  <select className="circuit-input" value={taskFormData.priority} onChange={e => setTaskFormData({ ...taskFormData, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Description</label>
                <textarea rows={2} className="circuit-input" placeholder="Notes for this reminder..." value={taskFormData.description} onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Schedule Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Activity Modal */}
      {isActivityModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsActivityModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">LOG ACTIVITY</div>
              <h3 className="modal-title-circuit">Record Customer Touchpoint</h3>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createActivityMutation.mutate(activityFormData);
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Type</label>
                  <select className="circuit-input" value={activityFormData.type} onChange={e => setActivityFormData({ ...activityFormData, type: e.target.value })}>
                    <option value="Call">Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Note">Quick Note</option>
                  </select>
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Contact</label>
                  <select className="circuit-input" value={activityFormData.contactId} onChange={e => setActivityFormData({ ...activityFormData, contactId: e.target.value })}>
                    <option value="">General</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Summary / Title *</label>
                <input type="text" required className="circuit-input" placeholder="e.g. Discovery Call with CTO" value={activityFormData.title} onChange={e => setActivityFormData({ ...activityFormData, title: e.target.value })} />
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Outcome / Results</label>
                <input type="text" className="circuit-input" placeholder="e.g. Positive, follow-up scheduled" value={activityFormData.outcome} onChange={e => setActivityFormData({ ...activityFormData, outcome: e.target.value })} />
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Detailed Notes</label>
                <textarea rows={3} className="circuit-input" placeholder="Discussed pricing, timelines..." value={activityFormData.description} onChange={e => setActivityFormData({ ...activityFormData, description: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsActivityModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Log Interaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Invoice / Quote Modal */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">COMMERCIAL PROPOSAL</div>
              <h3 className="modal-title-circuit">Create Quote / Invoice</h3>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createInvoiceMutation.mutate(invoiceFormData);
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Document Type</label>
                  <select className="circuit-input" value={invoiceFormData.type} onChange={e => setInvoiceFormData({ ...invoiceFormData, type: e.target.value })}>
                    <option value="Invoice">Invoice</option>
                    <option value="Quote">Quote</option>
                  </select>
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Contact</label>
                  <select className="circuit-input" value={invoiceFormData.contactId} onChange={e => setInvoiceFormData({ ...invoiceFormData, contactId: e.target.value })}>
                    <option value="">General Client</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Total Amount ($)</label>
                  <input type="number" step="0.01" required className="circuit-input" value={invoiceFormData.amount} onChange={e => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })} />
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Due Date</label>
                  <input type="date" className="circuit-input" value={invoiceFormData.dueDate} onChange={e => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })} />
                </div>
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Line Items / Description</label>
                <textarea rows={2} className="circuit-input" placeholder="CRM Setup & Implementation..." value={invoiceFormData.items} onChange={e => setInvoiceFormData({ ...invoiceFormData, items: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Generate Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Support Ticket Modal */}
      {isTicketModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsTicketModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">CUSTOMER SUPPORT</div>
              <h3 className="modal-title-circuit">Create Support Ticket</h3>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createTicketMutation.mutate(ticketFormData);
            }}>
              <div className="circuit-form-group">
                <label className="circuit-label">Ticket Subject *</label>
                <input type="text" required className="circuit-input" placeholder="e.g. Account configuration inquiry" value={ticketFormData.subject} onChange={e => setTicketFormData({ ...ticketFormData, subject: e.target.value })} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Customer</label>
                  <select className="circuit-input" value={ticketFormData.contactId} onChange={e => setTicketFormData({ ...ticketFormData, contactId: e.target.value })}>
                    <option value="">Unassigned</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="circuit-form-group">
                  <label className="circuit-label">Priority</label>
                  <select className="circuit-input" value={ticketFormData.priority} onChange={e => setTicketFormData({ ...ticketFormData, priority: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Issue Details</label>
                <textarea rows={3} className="circuit-input" placeholder="Explain the customer inquiry or issue..." value={ticketFormData.description} onChange={e => setTicketFormData({ ...ticketFormData, description: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsTicketModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Open Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Send Email Modal with Templates */}
      {isEmailModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsEmailModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">COMMUNICATION</div>
              <h3 className="modal-title-circuit">Send Customer Email</h3>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              sendEmailMutation.mutate(emailFormData);
            }}>
              <div className="circuit-form-group">
                <label className="circuit-label">Insert Email Template</label>
                <select className="circuit-input" onChange={e => {
                  const tpl = emailTemplates.find(t => t.id === e.target.value);
                  if (tpl) {
                    const selContact = contacts.find(c => c.id === parseInt(emailFormData.contactId, 10));
                    const name = selContact ? selContact.name : "Client";
                    const company = selContact ? (selContact.company || "Company") : "your organization";
                    setEmailFormData({
                      ...emailFormData,
                      subject: tpl.subject.replace(/{{name}}/g, name).replace(/{{company}}/g, company),
                      body: tpl.body.replace(/{{name}}/g, name).replace(/{{company}}/g, company)
                    });
                  }
                }}>
                  <option value="">Choose a template...</option>
                  {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Recipient Email *</label>
                <input type="email" required className="circuit-input" placeholder="client@company.com" value={emailFormData.recipientEmail} onChange={e => setEmailFormData({ ...emailFormData, recipientEmail: e.target.value })} />
              </div>
              <div className="circuit-form-group">
                <label className="circuit-label">Subject *</label>
                <input type="text" required className="circuit-input" placeholder="Subject..." value={emailFormData.subject} onChange={e => setEmailFormData({ ...emailFormData, subject: e.target.value })} />
              </div>
              <div className="circuit-form-group" style={{ marginBottom: "1.75rem" }}>
                <label className="circuit-label">Message Body *</label>
                <textarea rows={5} required className="circuit-input" placeholder="Type your message..." value={emailFormData.body} onChange={e => setEmailFormData({ ...emailFormData, body: e.target.value })} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button type="button" className="btn-ghost-dark" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">
                  <Send size={15} />
                  <span>Send & Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. CSV Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-card-circuit" onClick={e => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow">DATA MANAGEMENT</div>
              <h3 className="modal-title-circuit">Bulk Import Contacts (CSV)</h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
              Paste comma-separated rows. Columns: <br />
              <code style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>Name, Email, Phone, Company, Stage, Value, Source, Tags</code>
            </p>
            <textarea
              rows={8}
              className="circuit-input"
              style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", marginBottom: "1.5rem" }}
              placeholder={"Jane Doe, jane@example.com, +1555123456, Acme Corp, New, 5000, Website, VIP\nBob Smith, bob@globex.org, +1555987654, Globex, Qualified, 12000, Referral, Tech"}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" className="btn-ghost-dark" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary-yellow" onClick={handleProcessCSVImport}>
                <Upload size={15} />
                <span>Import Contacts</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
