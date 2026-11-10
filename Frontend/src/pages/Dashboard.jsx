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
  ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { 
  getContacts, 
  createContact, 
  updateContact, 
  deleteContact,
  getTasks,
  createTask,
  updateTask,
  deleteTask 
} from "../services/api";
import "../App.css";

const STAGES = ["Lead", "Contacted", "Qualified", "Customer", "Lost"];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  // Navigation Tabs: 'dashboard' | 'contacts' | 'pipeline' | 'tasks'
  const [activeTab, setActiveTab] = useState("dashboard");

  // Search & Filter state for contacts
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Task Filter state
  const [taskStatusFilter, setTaskStatusFilter] = useState("All");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("All");

  // Contact Modal State
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    status: "Lead",
    value: 0
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
  const [taskFormError, setTaskFormError] = useState("");

  // Contacts Query
  const { 
    data: contacts = [], 
    isLoading: isContactsLoading, 
    refetch: refetchContacts, 
    isFetching: isContactsFetching 
  } = useQuery({
    queryKey: ["contacts", { search: searchTerm, status: statusFilter }],
    queryFn: () => getContacts({ search: searchTerm, status: statusFilter })
  });

  // Tasks Query
  const { 
    data: tasks = [], 
    isLoading: isTasksLoading, 
    refetch: refetchTasks, 
    isFetching: isTasksFetching 
  } = useQuery({
    queryKey: ["tasks", { status: taskStatusFilter, priority: taskPriorityFilter }],
    queryFn: () => getTasks({ status: taskStatusFilter, priority: taskPriorityFilter })
  });

  // Contact Mutations
  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      handleCloseContactModal();
    },
    onError: (err) => {
      setContactFormError(err.response?.data?.error || "Failed to create contact.");
    }
  });

  const updateContactMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      handleCloseContactModal();
    },
    onError: (err) => {
      setContactFormError(err.response?.data?.error || "Failed to update contact.");
    }
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to delete contact.");
    }
  });

  // Task Mutations
  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleCloseTaskModal();
    },
    onError: (err) => {
      setTaskFormError(err.response?.data?.error || "Failed to create task.");
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      handleCloseTaskModal();
    },
    onError: (err) => {
      setTaskFormError(err.response?.data?.error || "Failed to update task.");
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      alert(err.response?.data?.error || "Failed to delete task.");
    }
  });

  // Handlers for Contacts
  const handleOpenContactModal = (contact = null) => {
    setContactFormError("");
    if (contact) {
      setEditingContact(contact);
      setContactFormData({
        name: contact.name,
        email: contact.email,
        phone: contact.phone || "",
        company: contact.company || "",
        status: contact.status || "Lead",
        value: contact.value || 0
      });
    } else {
      setEditingContact(null);
      setContactFormData({
        name: "",
        email: "",
        phone: "",
        company: "",
        status: "Lead",
        value: 0
      });
    }
    setIsContactModalOpen(true);
  };

  const handleCloseContactModal = () => {
    setIsContactModalOpen(false);
    setEditingContact(null);
    setContactFormError("");
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactFormError("");

    if (!contactFormData.name.trim() || !contactFormData.email.trim()) {
      setContactFormError("Name and Email are required fields.");
      return;
    }

    if (editingContact) {
      updateContactMutation.mutate({ id: editingContact.id, data: contactFormData });
    } else {
      createContactMutation.mutate(contactFormData);
    }
  };

  const handleDeleteContact = (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      deleteContactMutation.mutate(id);
    }
  };

  // Handlers for Tasks
  const handleOpenTaskModal = (task = null, defaultContactId = "") => {
    setTaskFormError("");
    if (task) {
      setEditingTask(task);
      setTaskFormData({
        title: task.title,
        description: task.description || "",
        dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
        priority: task.priority || "Medium",
        status: task.status || "Pending",
        contactId: task.contactId || ""
      });
    } else {
      setEditingTask(null);
      setTaskFormData({
        title: "",
        description: "",
        dueDate: new Date().toISOString().substring(0, 10),
        priority: "Medium",
        status: "Pending",
        contactId: defaultContactId
      });
    }
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTask(null);
    setTaskFormError("");
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    setTaskFormError("");

    if (!taskFormData.title.trim()) {
      setTaskFormError("Task title is required.");
      return;
    }

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: taskFormData });
    } else {
      createTaskMutation.mutate(taskFormData);
    }
  };

  const handleToggleTaskStatus = (task) => {
    const nextStatus = task.status === "Completed" ? "Pending" : "Completed";
    updateTaskMutation.mutate({
      id: task.id,
      data: { status: nextStatus }
    });
  };

  const handleDeleteTask = (id) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  // Drag / Click to update stage in Kanban
  const handleMoveStage = (contactId, newStatus) => {
    updateContactMutation.mutate({
      id: contactId,
      data: { status: newStatus }
    });
  };

  // Metrics Calculations
  const totalValue = contacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const activeCustomers = contacts.filter((c) => c.status === "Customer").length;
  const qualifiedLeads = contacts.filter((c) => c.status === "Qualified").length;
  const pendingTasksCount = tasks.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length;

  const isContactSaving = createContactMutation.isPending || updateContactMutation.isPending;
  const isTaskSaving = createTaskMutation.isPending || updateTaskMutation.isPending;

  return (
    <>
      {/* 74px Sticky Top Navbar */}
      <nav className="navbar-circuit">
        {/* Brand */}
        <div className="nav-brand" onClick={() => setActiveTab("dashboard")}>
          <div className="brand-glyph">
            <Zap size={20} color="#F0FF60" />
          </div>
          <span className="brand-title">SCRM</span>
        </div>

        {/* Center Tabs */}
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
            <span>Pipeline Stages</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <Calendar size={15} />
            <span>Tasks ({pendingTasksCount})</span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="nav-right-items">
          <button 
            className="btn-primary-yellow"
            onClick={() => handleOpenContactModal()}
          >
            <UserPlus size={16} />
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

      {/* Main CRM Layout */}
      <main className="crm-layout">
        
        {/* Top Hero Overview Banner */}
        <header className="crm-hero">
          <div className="eyebrow">
            WELCOME, {user?.name || "OPERATOR"}
          </div>

          <h1 className="hero-display-stack">
            DRIVE SALES.<br />
            ORGANIZE LEADS.<br />
            <span className="yellow-text">STREAMLINE DEALS.</span>
          </h1>

          <p className="hero-lead-text">
            Enterprise customer relationship management with Microsoft SQL Server persistence, real-time pipeline monitoring, and automated task scheduling.
          </p>

          <div className="hero-three-button-row">
            <button className="btn-primary-yellow" onClick={() => handleOpenContactModal()}>
              <UserPlus size={17} />
              <span>New Contact</span>
            </button>
            <button className="btn-ghost-dark" onClick={() => handleOpenTaskModal()}>
              <Plus size={17} color="#F0FF60" />
              <span>Schedule Task</span>
            </button>
            <button 
              className="btn-ghost-dark" 
              onClick={() => { refetchContacts(); refetchTasks(); }}
              disabled={isContactsFetching || isTasksFetching}
            >
              <RefreshCw size={15} className={isContactsFetching || isTasksFetching ? "spin-icon" : ""} />
              <span>Refresh CRM</span>
            </button>
          </div>
        </header>

        {/* 4-Up High Impact Metrics Cards */}
        <section className="metrics-4up-grid">
          <div className="metric-card-circuit" onClick={() => setActiveTab("contacts")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge">
              <Users size={22} />
            </div>
            <div className="metric-val">{contacts.length}</div>
            <div className="metric-lbl">Total Contacts</div>
            <div className="metric-sub">Across all pipeline stages</div>
          </div>

          <div className="metric-card-circuit" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge">
              <ShieldCheck size={22} />
            </div>
            <div className="metric-val" style={{ color: "var(--semantic-success)" }}>{activeCustomers}</div>
            <div className="metric-lbl">Active Customers</div>
            <div className="metric-sub">Closed won contracts</div>
          </div>

          <div className="metric-card-circuit" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge">
              <Target size={22} />
            </div>
            <div className="metric-val" style={{ color: "#c084fc" }}>{qualifiedLeads}</div>
            <div className="metric-lbl">Qualified Leads</div>
            <div className="metric-sub">Ready for proposal</div>
          </div>

          <div className="metric-card-circuit">
            <div className="metric-icon-badge">
              <DollarSign size={22} />
            </div>
            <div className="metric-val" style={{ color: "var(--accent)" }}>
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Pipeline Value</div>
            <div className="metric-sub">Total expected revenue</div>
          </div>
        </section>

        {/* Inverted Card Section featuring #F0FF60 */}
        <section className="card-inverted-yellow">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div className="eyebrow" style={{ color: "#4F5101", marginBottom: "0.25rem" }}>
                PIPELINE VELOCITY ACCELERATOR
              </div>
              <h3>Empower Your Sales Operations with SCRM</h3>
              <p>
                Keep track of every lead conversation, schedule upcoming meetings, and close deals faster with our unified CRM platform.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button className="btn-inverted-dark" onClick={() => setActiveTab("pipeline")}>
                  <span>View Pipeline Board</span>
                  <ArrowRight size={16} />
                </button>
                <button 
                  className="btn-inverted-dark" 
                  style={{ background: "transparent", color: "var(--text-inverted)", border: "1px solid #4F5101" }}
                  onClick={() => handleOpenTaskModal()}
                >
                  <Calendar size={16} />
                  <span>Schedule Action Item</span>
                </button>
              </div>
            </div>

            <div style={{ background: "rgba(0, 0, 0, 0.08)", padding: "1rem 1.25rem", borderRadius: "14px", border: "1px solid #4F5101", minWidth: "220px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#3B3D01" }}>
                Task Telemetry
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-inverted)", margin: "0.25rem 0" }}>
                {pendingTasksCount}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#2B2D01" }}>
                Pending tasks requiring action
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            TAB 1: DASHBOARD OVERVIEW & COMBINED VIEW
           ========================================================================= */}
        {activeTab === "dashboard" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Recent Contacts & Leads
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Most recently updated customer contacts in your database.
                </p>
              </div>
              <button 
                className="btn-ghost-dark" 
                style={{ height: "38px", fontSize: "0.8125rem" }}
                onClick={() => setActiveTab("contacts")}
              >
                <span>View Full Contacts List</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Quick Contacts Table */}
            <div className="table-glass-card">
              {isContactsLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <RefreshCw className="spin-icon" size={24} style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
                  <div>Loading contacts from database...</div>
                </div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: "3.5rem 2rem", textAlign: "center" }}>
                  <Users size={36} color="#F0FF60" style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    No contacts recorded yet
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Add your first contact to start building your pipeline.
                  </p>
                  <button className="btn-primary-yellow" onClick={() => handleOpenContactModal()}>
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
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Stage</th>
                        <th>Deal Value</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.slice(0, 6).map((contact) => (
                        <tr key={contact.id}>
                          <td style={{ fontWeight: 700, color: "var(--text-heading)" }}>{contact.name}</td>
                          <td>{contact.company || "—"}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            {contact.email}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>{contact.phone || "—"}</td>
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
                                onClick={() => handleOpenContactModal(contact)}
                                title="Edit Contact"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="action-icon-btn"
                                onClick={() => handleOpenTaskModal(null, contact.id)}
                                title="Schedule Task for Contact"
                              >
                                <Calendar size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Scheduled Tasks Section */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", marginTop: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Scheduled Tasks & Follow-ups
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Active reminders and customer follow-up actions.
                </p>
              </div>
              <button 
                className="btn-primary-yellow" 
                style={{ height: "38px", fontSize: "0.8125rem" }}
                onClick={() => handleOpenTaskModal()}
              >
                <Plus size={16} />
                <span>New Task</span>
              </button>
            </div>

            <div className="tasks-container">
              {isTasksLoading ? (
                <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="table-glass-card" style={{ padding: "3rem", textAlign: "center" }}>
                  <Calendar size={36} color="#F0FF60" style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    No Scheduled Tasks
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
                    Create action items and deadlines linked directly to your contacts.
                  </p>
                  <button className="btn-primary-yellow" onClick={() => handleOpenTaskModal()}>
                    <Plus size={16} />
                    <span>Create a Task</span>
                  </button>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="task-item-card">
                    <div className="task-left-section">
                      <button
                        className={`task-checkbox-btn ${task.status === "Completed" ? "completed" : ""}`}
                        onClick={() => handleToggleTaskStatus(task)}
                        title="Mark complete / incomplete"
                      >
                        {task.status === "Completed" && <Check size={16} />}
                      </button>
                      <div>
                        <div className={`task-title ${task.status === "Completed" ? "completed" : ""}`}>
                          {task.title}
                        </div>
                        <div className="task-meta">
                          {task.dueDate && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <Clock size={12} color="#F0FF60" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.Contact && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--text-primary)" }}>
                              <Users size={12} />
                              {task.Contact.name} ({task.Contact.company || "Company"})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`priority-chip priority-${(task.priority || "medium").toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <button
                        className="action-icon-btn"
                        onClick={() => handleOpenTaskModal(task)}
                        title="Edit Task"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="action-icon-btn delete"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete Task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: FULL CONTACTS TABLE WITH SEARCH & FILTER
           ========================================================================= */}
        {activeTab === "contacts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Customer Contacts ({contacts.length})
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Search, filter, and edit all customer contact profiles and deals.
                </p>
              </div>

              <button className="btn-primary-yellow" onClick={() => handleOpenContactModal()}>
                <UserPlus size={16} />
                <span>Add Contact</span>
              </button>
            </div>

            {/* Filter controls */}
            <div className="controls-glass-panel">
              <div className="search-field-wrapper">
                <Search className="search-field-icon" size={16} />
                <input
                  type="text"
                  className="search-field-input"
                  placeholder="Search by name, company, or email address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="filter-select-circuit"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Stages</option>
                <option value="Lead">Status: Lead</option>
                <option value="Contacted">Status: Contacted</option>
                <option value="Qualified">Status: Qualified</option>
                <option value="Customer">Status: Customer</option>
                <option value="Lost">Status: Lost</option>
              </select>
            </div>

            {/* Main Full Table */}
            <div className="table-glass-card">
              {isContactsLoading ? (
                <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)" }}>
                  <RefreshCw className="spin-icon" size={24} style={{ margin: "0 auto 1rem", color: "var(--accent)" }} />
                  <div>Loading contacts...</div>
                </div>
              ) : contacts.length === 0 ? (
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <Users size={40} color="#F0FF60" style={{ margin: "0 auto 1rem" }} />
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    No matching contacts found
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Try modifying your search or stage filter to find records.
                  </p>
                  <button className="btn-primary-yellow" onClick={() => handleOpenContactModal()}>
                    <UserPlus size={16} />
                    <span>Create Contact</span>
                  </button>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="circuit-table">
                    <thead>
                      <tr>
                        <th>Contact Name</th>
                        <th>Organization</th>
                        <th>Email Address</th>
                        <th>Phone</th>
                        <th>Stage</th>
                        <th>Deal Value</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contacts.map((contact) => (
                        <tr key={contact.id}>
                          <td style={{ fontWeight: 700, color: "var(--text-heading)" }}>{contact.name}</td>
                          <td>{contact.company || "—"}</td>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                            {contact.email}
                          </td>
                          <td style={{ color: "var(--text-muted)" }}>{contact.phone || "—"}</td>
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
                                onClick={() => handleOpenContactModal(contact)}
                                title="Edit Contact"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                className="action-icon-btn"
                                onClick={() => handleOpenTaskModal(null, contact.id)}
                                title="Schedule Task"
                              >
                                <Calendar size={15} />
                              </button>
                              <button
                                className="action-icon-btn delete"
                                onClick={() => handleDeleteContact(contact.id)}
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
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: INTERACTIVE PIPELINE KANBAN BOARD
           ========================================================================= */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Pipeline Stages Board
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Visual deal pipeline stages. Click any contact to advance stage or edit contract values.
                </p>
              </div>

              <button className="btn-primary-yellow" onClick={() => handleOpenContactModal()}>
                <UserPlus size={16} />
                <span>Add Contact to Pipeline</span>
              </button>
            </div>

            <div className="pipeline-board">
              {STAGES.map((stage) => {
                const stageContacts = contacts.filter((c) => (c.status || "Lead") === stage);
                const stageTotalValue = stageContacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);

                return (
                  <div key={stage} className="pipeline-col">
                    <div className="pipeline-col-header">
                      <div className="pipeline-col-title">
                        <span>{stage}</span>
                      </div>
                      <span className="pipeline-col-count">{stageContacts.length}</span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--accent)", fontFamily: "var(--font-mono)", marginBottom: "0.75rem", fontWeight: 700 }}>
                      ${stageTotalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                    </div>

                    <div className="pipeline-cards-stack">
                      {stageContacts.length === 0 ? (
                        <div style={{ padding: "2rem 0.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem", border: "1px dashed var(--border-hairline)", borderRadius: "10px" }}>
                          No deals in this stage
                        </div>
                      ) : (
                        stageContacts.map((contact) => (
                          <div 
                            key={contact.id} 
                            className="pipeline-item-card"
                            onClick={() => handleOpenContactModal(contact)}
                          >
                            <div className="pipeline-item-name">{contact.name}</div>
                            <div className="pipeline-item-company">{contact.company || "Independent"}</div>
                            
                            <div className="pipeline-item-footer">
                              <span className="pipeline-item-value">
                                ${Number(contact.value || 0).toLocaleString()}
                              </span>

                              <div style={{ display: "flex", gap: "0.25rem" }}>
                                {stage !== "Customer" && (
                                  <button
                                    className="action-icon-btn"
                                    style={{ width: "26px", height: "26px" }}
                                    title="Advance stage"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextIndex = STAGES.indexOf(stage) + 1;
                                      if (nextIndex < STAGES.length) {
                                        handleMoveStage(contact.id, STAGES[nextIndex]);
                                      }
                                    }}
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: TASK SCHEDULING & ACTIVITIES
           ========================================================================= */}
        {activeTab === "tasks" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-heading)" }}>
                  Task Scheduling & Follow-ups
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
                  Schedule meetings, log follow-up calls, and track actionable tasks.
                </p>
              </div>

              <button className="btn-primary-yellow" onClick={() => handleOpenTaskModal()}>
                <Plus size={16} />
                <span>Schedule New Task</span>
              </button>
            </div>

            {/* Task Filters */}
            <div className="controls-glass-panel">
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", width: "100%" }}>
                <select
                  className="filter-select-circuit"
                  value={taskStatusFilter}
                  onChange={(e) => setTaskStatusFilter(e.target.value)}
                >
                  <option value="All">All Task Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  className="filter-select-circuit"
                  value={taskPriorityFilter}
                  onChange={(e) => setTaskPriorityFilter(e.target.value)}
                >
                  <option value="All">All Priorities</option>
                  <option value="Urgent">Priority: Urgent</option>
                  <option value="High">Priority: High</option>
                  <option value="Medium">Priority: Medium</option>
                  <option value="Low">Priority: Low</option>
                </select>
              </div>
            </div>

            <div className="tasks-container">
              {isTasksLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading tasks...
                </div>
              ) : tasks.length === 0 ? (
                <div className="table-glass-card" style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <Calendar size={44} color="#F0FF60" style={{ margin: "0 auto 1.25rem" }} />
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                    No Scheduled Tasks
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
                    Schedule follow-up phone calls, contract reviews, and meetings.
                  </p>
                  <button className="btn-primary-yellow" onClick={() => handleOpenTaskModal()}>
                    <Plus size={16} />
                    <span>Schedule Task</span>
                  </button>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="task-item-card">
                    <div className="task-left-section">
                      <button
                        className={`task-checkbox-btn ${task.status === "Completed" ? "completed" : ""}`}
                        onClick={() => handleToggleTaskStatus(task)}
                        title="Mark complete / incomplete"
                      >
                        {task.status === "Completed" && <Check size={16} />}
                      </button>
                      <div>
                        <div className={`task-title ${task.status === "Completed" ? "completed" : ""}`}>
                          {task.title}
                        </div>
                        {task.description && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--text-body)", marginTop: "0.2rem" }}>
                            {task.description}
                          </div>
                        )}
                        <div className="task-meta">
                          {task.dueDate && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <Clock size={12} color="#F0FF60" />
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {task.Contact && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--accent)" }}>
                              <Users size={12} />
                              {task.Contact.name} ({task.Contact.company || "Contact"})
                            </span>
                          )}
                          <span style={{ color: "var(--text-muted)" }}>
                            Status: <strong>{task.status}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`priority-chip priority-${(task.priority || "medium").toLowerCase()}`}>
                        {task.priority}
                      </span>
                      <button
                        className="action-icon-btn"
                        onClick={() => handleOpenTaskModal(task)}
                        title="Edit Task"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        className="action-icon-btn delete"
                        onClick={() => handleDeleteTask(task.id)}
                        title="Delete Task"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="footer-circuit">
        <div>
          © {new Date().getFullYear()} SCRM. High Performance Relationship Engine.
        </div>
        <div className="footer-tagline">
          SCRM // OBSIDIAN & ELECTRIC YELLOW ARCHITECTURE
        </div>
      </footer>

      {/* =========================================================================
          CONTACT MODAL (CREATE / EDIT)
         ========================================================================= */}
      {isContactModalOpen && (
        <div className="modal-overlay-circuit" onClick={handleCloseContactModal}>
          <div className="modal-card-circuit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>
                {editingContact ? "UPDATE CONTACT RECORD" : "PROVISION NEW CONTACT"}
              </div>
              <h3 className="modal-title-circuit">
                {editingContact ? "Edit Contact Details" : "Add Contact to SCRM"}
              </h3>
            </div>

            {contactFormError && (
              <div className="auth-error-banner" style={{ marginBottom: "1.25rem" }}>
                <span>{contactFormError}</span>
              </div>
            )}

            <form onSubmit={handleContactSubmit}>
              <div className="circuit-form-group">
                <label className="circuit-label">Full Name *</label>
                <input
                  type="text"
                  required
                  className="circuit-input"
                  placeholder="e.g. John Doe"
                  value={contactFormData.name}
                  onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Email Address *</label>
                <input
                  type="email"
                  required
                  className="circuit-input"
                  placeholder="john@example.com"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Organization / Company</label>
                <input
                  type="text"
                  className="circuit-input"
                  placeholder="Acme Corp"
                  value={contactFormData.company}
                  onChange={(e) => setContactFormData({ ...contactFormData, company: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Telephone</label>
                <input
                  type="tel"
                  className="circuit-input"
                  placeholder="+1 (555) 019-2834"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
                <div className="circuit-form-group" style={{ marginBottom: 0 }}>
                  <label className="circuit-label">Pipeline Stage</label>
                  <select
                    className="circuit-input"
                    value={contactFormData.status}
                    onChange={(e) => setContactFormData({ ...contactFormData, status: e.target.value })}
                  >
                    {STAGES.map((stg) => (
                      <option key={stg} value={stg}>{stg}</option>
                    ))}
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
                    value={contactFormData.value}
                    onChange={(e) => setContactFormData({ ...contactFormData, value: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  className="btn-ghost-dark" 
                  onClick={handleCloseContactModal}
                  disabled={isContactSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-yellow" 
                  disabled={isContactSaving}
                >
                  {isContactSaving ? "Saving..." : editingContact ? "Save Changes" : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          TASK MODAL (CREATE / EDIT)
         ========================================================================= */}
      {isTaskModalOpen && (
        <div className="modal-overlay-circuit" onClick={handleCloseTaskModal}>
          <div className="modal-card-circuit" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-circuit">
              <div className="eyebrow" style={{ marginBottom: "0.25rem" }}>
                {editingTask ? "UPDATE ACTION ITEM" : "SCHEDULE NEW TASK"}
              </div>
              <h3 className="modal-title-circuit">
                {editingTask ? "Edit Task Details" : "Schedule Activity"}
              </h3>
            </div>

            {taskFormError && (
              <div className="auth-error-banner" style={{ marginBottom: "1.25rem" }}>
                <span>{taskFormError}</span>
              </div>
            )}

            <form onSubmit={handleTaskSubmit}>
              <div className="circuit-form-group">
                <label className="circuit-label">Task Title *</label>
                <input
                  type="text"
                  required
                  className="circuit-input"
                  placeholder="e.g. Follow-up demo call"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                />
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Associated Contact</label>
                <select
                  className="circuit-input"
                  value={taskFormData.contactId}
                  onChange={(e) => setTaskFormData({ ...taskFormData, contactId: e.target.value })}
                >
                  <option value="">None / General Task</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.company || "Contact"})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="circuit-form-group">
                  <label className="circuit-label">Due Date</label>
                  <input
                    type="date"
                    className="circuit-input"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                  />
                </div>

                <div className="circuit-form-group">
                  <label className="circuit-label">Priority</label>
                  <select
                    className="circuit-input"
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="circuit-form-group">
                <label className="circuit-label">Task Status</label>
                <select
                  className="circuit-input"
                  value={taskFormData.status}
                  onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="circuit-form-group" style={{ marginBottom: "2rem" }}>
                <label className="circuit-label">Notes & Description</label>
                <textarea
                  rows={3}
                  className="circuit-input"
                  style={{ resize: "vertical" }}
                  placeholder="Enter details or notes regarding this task..."
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button 
                  type="button" 
                  className="btn-ghost-dark" 
                  onClick={handleCloseTaskModal}
                  disabled={isTaskSaving}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-yellow" 
                  disabled={isTaskSaving}
                >
                  {isTaskSaving ? "Saving..." : editingTask ? "Save Changes" : "Schedule Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
