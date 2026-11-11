import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BrandLogo from "../components/BrandLogo";
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
  AlertCircle,
  Database,
  Lock,
  Building,
  Sparkles,
  Eye,
  Sliders,
  ExternalLink,
  Menu,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { 
  getLeads,
  createLead,
  updateLead,
  deleteLead,
  convertLead,
  getContacts, 
  createContact, 
  updateContact, 
  deleteContact,
  bulkImportContacts,
  mergeContacts,
  getContactDuplicates,
  convertLeadToDeal,
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
  sendEmail,
  getCompanies,
  createCompany,
  getDeals,
  getDealMetrics,
  createDeal,
  updateDeal,
  deleteDeal,
  createDatabaseSnapshot,
  getBackupHistory,
  getAutomations,
  testAutomationRule,
  getCalendarSync,
  triggerCalendarSync,
  toggle2FA,
  updateProfile
} from "../services/api";
import "../App.css";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  // Navigation Tabs: 'dashboard' | 'contacts' | 'pipeline' | 'companies' | 'tasks' | 'activities' | 'invoices' | 'tickets' | 'emails' | 'security'
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile & 2FA Settings State
  const [profileName, setProfileName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileMessage, setProfileMessage] = useState("");

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

  // Convert Lead Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertingContact, setConvertingContact] = useState(null);
  const [convertDealTitle, setConvertDealTitle] = useState("");
  const [convertDealValue, setConvertDealValue] = useState(5000);

  // Standalone Lead Management State
  const [leadSearchTerm, setLeadSearchTerm] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadFormData, setLeadFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company_name: "",
    title: "",
    source: "Website",
    status: "New",
    estimated_value: 10000,
    notes: ""
  });
  const [isLeadConvertModalOpen, setIsLeadConvertModalOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState(null);
  const [leadConvertTitle, setLeadConvertTitle] = useState("");
  const [leadConvertValue, setLeadConvertValue] = useState(10000);
  const [leadConvertStage, setLeadConvertStage] = useState("Qualified");

  // Company Modal State
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({
    name: "",
    domain: "",
    phone: "",
    address: ""
  });

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

  // Duplicate Merging Modal
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState(null);

  // CSV Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");

  // Queries
  const { data: leadsData = { leads: [], totalCount: 0 }, refetch: refetchLeads } = useQuery({
    queryKey: ["leads", { status: leadStatusFilter, search: leadSearchTerm }],
    queryFn: () => getLeads({ status: leadStatusFilter, search: leadSearchTerm })
  });
  const leads = Array.isArray(leadsData) ? leadsData : (leadsData.leads || []);

  const { data: contacts = [], isLoading: isContactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: ["contacts", { search: searchTerm, status: statusFilter, leadSource: leadSourceFilter }],
    queryFn: () => getContacts({ search: searchTerm, status: statusFilter, leadSource: leadSourceFilter })
  });

  const { data: companies = [], refetch: refetchCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies
  });

  const { data: dealsData = { deals: [], totalsByStage: {}, totalPipelineValue: 0 }, refetch: refetchDeals } = useQuery({
    queryKey: ["deals"],
    queryFn: () => getDeals({})
  });

  const { data: dealMetrics = {}, refetch: refetchMetrics } = useQuery({
    queryKey: ["dealMetrics"],
    queryFn: getDealMetrics
  });

  const { data: duplicatesData = { count: 0, duplicates: [] }, refetch: refetchDuplicates } = useQuery({
    queryKey: ["duplicates"],
    queryFn: getContactDuplicates
  });

  const { data: tasksData = { tasks: [], stats: { total: 0, overdue: 0, dueToday: 0, pending: 0 } }, refetch: refetchTasks } = useQuery({
    queryKey: ["tasks", { status: taskStatusFilter }],
    queryFn: () => getTasks({ status: taskStatusFilter })
  });

  const tasks = Array.isArray(tasksData) ? tasksData : (tasksData.tasks || []);
  const taskStats = tasksData.stats || { total: tasks.length, overdue: 0, dueToday: 0, pending: 0 };

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

  const { data: backupHistory = { snapshots: [] }, refetch: refetchBackups } = useQuery({
    queryKey: ["backupHistory"],
    queryFn: getBackupHistory,
    enabled: user?.role === "admin"
  });

  const { data: automationsData = { automations: [] } } = useQuery({
    queryKey: ["automations"],
    queryFn: getAutomations
  });

  const { data: calendarSyncData = { status: "connected", scheduledEventsCount: 0 } } = useQuery({
    queryKey: ["calendarSync"],
    queryFn: getCalendarSync
  });

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsLeadModalOpen(false);
      setEditingLead(null);
    },
    onError: (err) => alert(err.response?.data?.error || "Failed to create lead.")
  });

  const updateLeadMutation = useMutation({
    mutationFn: updateLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsLeadModalOpen(false);
      setEditingLead(null);
    },
    onError: (err) => alert(err.response?.data?.error || "Failed to update lead.")
  });

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (err) => alert(err.response?.data?.error || "Failed to delete lead.")
  });

  const convertLeadMutation = useMutation({
    mutationFn: convertLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsLeadConvertModalOpen(false);
      setConvertingLead(null);
      alert("Lead successfully converted to Contact, Company, and Deal!");
    },
    onError: (err) => alert(err.response?.data?.error || "Failed to convert lead.")
  });

  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsContactModalOpen(false);
    },
    onError: (err) => setContactFormError(err.response?.data?.error || "Failed to create contact.")
  });

  const updateContactMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsContactModalOpen(false);
    },
    onError: (err) => setContactFormError(err.response?.data?.error || "Failed to update contact.")
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
    }
  });

  const convertLeadMutation = useMutation({
    mutationFn: convertLeadToDeal,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsConvertModalOpen(false);
      alert(res.message || "Lead converted successfully!");
    },
    onError: (err) => alert("Conversion failed: " + (err.response?.data?.error || err.message))
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsCompanyModalOpen(false);
    }
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
      alert("Email dispatched and tracking pixel attached!");
    }
  });

  const mergeContactsMutation = useMutation({
    mutationFn: mergeContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      setIsDuplicateModalOpen(false);
      setSelectedDuplicate(null);
      alert("Contacts merged cleanly!");
    }
  });

  const createSnapshotMutation = useMutation({
    mutationFn: createDatabaseSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backupHistory"] });
      alert("Snapshot successfully created in server storage!");
    }
  });

  const toggle2FAMutation = useMutation({
    mutationFn: toggle2FA,
    onSuccess: (data) => {
      alert(data.message);
      if (refreshUser) refreshUser();
    },
    onError: (err) => alert(err.response?.data?.error || "Failed to toggle 2FA")
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setProfileMessage(data.message || "Profile successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      if (refreshUser) refreshUser();
    },
    onError: (err) => setProfileMessage(err.response?.data?.error || "Failed to update profile.")
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
            leadSource: cols[6] || "CSV Import",
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
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
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

  // Convert Lead Handler
  const openConvertModal = (contact) => {
    setConvertingContact(contact);
    setConvertDealTitle(`${contact.company || contact.name} - Enterprise Solution`);
    setConvertDealValue(contact.value || 10000);
    setIsConvertModalOpen(true);
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
      {/* 74px Sticky Top Navbar with Responsive Mobile Controls */}
      <nav className="navbar-circuit">
        <div className="nav-brand" onClick={() => setActiveTab("dashboard")} style={{ cursor: "pointer" }}>
          <BrandLogo variant="horizontal" size={30} showTagline={true} />
        </div>

        {/* Desktop Navigation Links */}
        <div className="nav-tab-links">
          <button 
            className={`nav-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <TrendingUp size={15} />
            <span>Dashboard</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "leads" ? "active" : ""}`}
            onClick={() => setActiveTab("leads")}
          >
            <Target size={15} />
            <span>Leads ({leads.length})</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "contacts" ? "active" : ""}`}
            onClick={() => setActiveTab("contacts")}
          >
            <Users size={15} />
            <span>Contacts ({contacts.length})</span>
            {duplicatesData.count > 0 && (
              <span className="badge-alert" title="Duplicates Detected">
                {duplicatesData.count}
              </span>
            )}
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "pipeline" ? "active" : ""}`}
            onClick={() => setActiveTab("pipeline")}
          >
            <Layers size={15} />
            <span>Pipeline</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "companies" ? "active" : ""}`}
            onClick={() => setActiveTab("companies")}
          >
            <Building size={15} />
            <span>Companies ({companies.length})</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <Calendar size={15} />
            <span>Tasks ({pendingTasks.length})</span>
            {taskStats.overdue > 0 && (
              <span className="badge-overdue" title="Overdue Tasks">
                !
              </span>
            )}
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
            <span>Invoices</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <LifeBuoy size={15} />
            <span>Tickets ({openTickets.length})</span>
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === "emails" ? "active" : ""}`}
            onClick={() => setActiveTab("emails")}
          >
            <Mail size={15} />
            <span>Outbox</span>
          </button>
          {user?.role === "admin" && (
            <button 
              className={`nav-tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <ShieldCheck size={15} color="#F0FF60" />
              <span>Security & Backup</span>
            </button>
          )}
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
          {/* Mobile Menu Hamburger */}
          <button className="mobile-menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <button onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }}>Dashboard</button>
          <button onClick={() => { setActiveTab("contacts"); setMobileMenuOpen(false); }}>Contacts ({contacts.length})</button>
          <button onClick={() => { setActiveTab("pipeline"); setMobileMenuOpen(false); }}>Pipeline Kanban</button>
          <button onClick={() => { setActiveTab("companies"); setMobileMenuOpen(false); }}>Companies ({companies.length})</button>
          <button onClick={() => { setActiveTab("tasks"); setMobileMenuOpen(false); }}>Tasks ({pendingTasks.length})</button>
          <button onClick={() => { setActiveTab("activities"); setMobileMenuOpen(false); }}>Activity Log</button>
          <button onClick={() => { setActiveTab("invoices"); setMobileMenuOpen(false); }}>Invoices & Quotes</button>
          <button onClick={() => { setActiveTab("tickets"); setMobileMenuOpen(false); }}>Support Tickets ({openTickets.length})</button>
          <button onClick={() => { setActiveTab("emails"); setMobileMenuOpen(false); }}>Outbox</button>
          {user?.role === "admin" && (
            <button onClick={() => { setActiveTab("security"); setMobileMenuOpen(false); }}>Security & Backup</button>
          )}
        </div>
      )}

      <main className="crm-layout">
        {/* Top Hero Section */}
        <header className="crm-hero">
          <div className="eyebrow">ENTERPRISE CRM // OPERATOR: {user?.name || "ADMIN"} ({user?.role?.toUpperCase() || "ADMIN"})</div>
          <h1 className="hero-display-stack">
            DRIVE DEALS.<br />
            AUTOMATE TASKS.<br />
            <span className="yellow-text">COMPLETE VISIBILITY.</span>
          </h1>
          <p className="hero-lead-text">
            Enterprise CRM platform with idempotent SQL migrations, RBAC access control, lead-to-deal conversion, email open tracking, automated duplicate detection, and automated database snapshots.
          </p>

          <div className="hero-three-button-row">
            <button className="btn-primary-yellow interactive-lift" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
              <UserPlus size={17} />
              <span>Create Lead</span>
            </button>
            <button className="btn-ghost-dark interactive-lift" onClick={() => setIsTaskModalOpen(true)}>
              <Plus size={17} color="#F0FF60" />
              <span>Schedule Task</span>
            </button>
            <button className="btn-ghost-dark interactive-lift" onClick={() => setIsActivityModalOpen(true)}>
              <Phone size={16} color="#F0FF60" />
              <span>Log Interaction</span>
            </button>
            <button className="btn-ghost-dark interactive-lift" onClick={() => setIsEmailModalOpen(true)}>
              <Mail size={16} color="#F0FF60" />
              <span>Compose Email</span>
            </button>
            <button className="btn-ghost-dark interactive-lift" onClick={handleExportCSV}>
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button className="btn-ghost-dark interactive-lift" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={16} />
              <span>Import CSV</span>
            </button>
          </div>
        </header>

        {/* 4-Up High Impact Telemetry Grid */}
        <section className="metrics-4up-grid">
          <div className="metric-card-circuit interactive-lift" onClick={() => setActiveTab("contacts")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><Users size={22} /></div>
            <div className="metric-val">{contacts.length}</div>
            <div className="metric-lbl">Total Contacts & Leads</div>
            <div className="metric-sub">Across all pipeline stages</div>
          </div>

          <div className="metric-card-circuit interactive-lift" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><DollarSign size={22} /></div>
            <div className="metric-val" style={{ color: "var(--accent)" }}>
              ${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Active Pipeline Value</div>
            <div className="metric-sub">{proposalCount} deals in Proposal stage</div>
          </div>

          <div className="metric-card-circuit interactive-lift" onClick={() => setActiveTab("pipeline")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><ShieldCheck size={22} /></div>
            <div className="metric-val" style={{ color: "var(--semantic-success)" }}>
              ${wonValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </div>
            <div className="metric-lbl">Won Deals Revenue</div>
            <div className="metric-sub">{wonCount} closed won contracts ({dealMetrics.winRate || "0%"})</div>
          </div>

          <div className="metric-card-circuit interactive-lift" onClick={() => setActiveTab("tasks")} style={{ cursor: "pointer" }}>
            <div className="metric-icon-badge"><Calendar size={22} /></div>
            <div className="metric-val" style={{ color: taskStats.overdue > 0 ? "var(--semantic-error)" : "var(--accent-bright)" }}>
              {pendingTasks.length}
            </div>
            <div className="metric-lbl">Pending Tasks</div>
            <div className="metric-sub">{taskStats.overdue > 0 ? `${taskStats.overdue} overdue alerts!` : `${openTickets.length} open tickets`}</div>
          </div>
        </section>

        {/* Duplicate Contacts Alert Banner */}
        {duplicatesData.count > 0 && (
          <div className="duplicate-alert-banner">
            <div className="banner-left">
              <AlertCircle size={20} color="#F0FF60" />
              <div>
                <strong>Automated Duplicate Detection:</strong> {duplicatesData.count} potential duplicate contacts identified by matching email or phone.
              </div>
            </div>
            <button className="btn-primary-yellow" onClick={() => setIsDuplicateModalOpen(true)}>
              <GitMerge size={16} />
              <span>Review & Merge Duplicates</span>
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="dashboard-view-stack">
            <div className="asymmetric-2up-grid">
              {/* Pipeline Overview Card */}
              <div className="card-circuit interactive-lift">
                <div className="card-header-bar">
                  <span className="card-title">Deal Pipeline Distribution</span>
                  <button className="btn-ghost-dark small" onClick={() => setActiveTab("pipeline")}>View Board</button>
                </div>
                <div className="pipeline-progress-stack">
                  {STAGES.map(stg => {
                    const stageContacts = contacts.filter(c => c.status === stg);
                    const stageVal = stageContacts.reduce((acc, c) => acc + (Number(c.value) || 0), 0);
                    const pct = totalPipelineValue > 0 ? Math.round((stageVal / totalPipelineValue) * 100) : 0;
                    return (
                      <div key={stg} className="stage-progress-row">
                        <div className="stage-meta">
                          <span className="stage-title">{stg} ({stageContacts.length})</span>
                          <span className="stage-val">${stageVal.toLocaleString()}</span>
                        </div>
                        <div className="progress-track">
                          <div className="progress-bar" style={{ width: `${Math.max(pct, 4)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions & Recent Tasks */}
              <div className="card-circuit interactive-lift">
                <div className="card-header-bar">
                  <span className="card-title">Urgent Tasks & Action Items</span>
                  <button className="btn-ghost-dark small" onClick={() => setIsTaskModalOpen(true)}>+ Task</button>
                </div>
                <div className="tasks-mini-list">
                  {pendingTasks.slice(0, 5).map(t => (
                    <div key={t.id} className="task-mini-item">
                      <div className="task-check" onClick={() => updateTaskMutation.mutate({ id: t.id, data: { status: "Completed" } })}>
                        <Check size={14} />
                      </div>
                      <div className="task-info">
                        <div className="task-title">{t.title}</div>
                        <div className="task-meta">
                          <span>Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}</span>
                          <span className={`priority-tag ${t.priority.toLowerCase()}`}>{t.priority}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingTasks.length === 0 && (
                    <div className="empty-state-notice">All tasks complete! You are clear for the day.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Inverted Card Section */}
            <div className="card-inverted-yellow interactive-lift" style={{ marginTop: "24px" }}>
              <div className="inverted-inner">
                <div className="inverted-copy">
                  <h3 className="inverted-title">ENTERPRISE CRM WORKFLOW AUTOMATION</h3>
                  <p className="inverted-desc">
                    Round-robin lead routing, automated duplicate resolution, tracking pixels, and instant Lead-to-Deal conversions with Microsoft SQL Server integrity.
                  </p>
                </div>
                <div className="inverted-actions">
                  <button className="btn-dark-on-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                    Add Record
                  </button>
                  <button className="btn-outline-on-yellow" onClick={() => setActiveTab("security")}>
                    Security Audit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS & LEADS DIRECTORY */}
        {activeTab === "contacts" && (
          <div className="contacts-view-stack">
            <div className="toolbar-circuit">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search name, email, company, or tags..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                />
              </div>

              <div className="filters-row">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="All">All Stages</option>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select value={leadSourceFilter} onChange={e => setLeadSourceFilter(e.target.value)}>
                  <option value="All">All Sources</option>
                  <option value="Website">Website</option>
                  <option value="Referral">Referral</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Import">Import</option>
                </select>

                <button className="btn-primary-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                  <Plus size={16} />
                  <span>Add Contact</span>
                </button>
              </div>
            </div>

            <div className="table-container-circuit">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Company</th>
                    <th>Status / Stage</th>
                    <th>Deal Value</th>
                    <th>Tags</th>
                    <th>Lead Source</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div className="contact-cell">
                          <span className="contact-name">{c.name}</span>
                          <span className="contact-email">{c.email}</span>
                          {c.phone && <span className="contact-phone">{c.phone}</span>}
                        </div>
                      </td>
                      <td>{c.company || "—"}</td>
                      <td>
                        <select 
                          className="stage-select-pill"
                          value={c.status}
                          onChange={e => handleMoveStage(c.id, e.target.value)}
                        >
                          {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="value-cell">${(Number(c.value) || 0).toLocaleString()}</td>
                      <td>
                        <div className="tags-flex">
                          {(c.tags || "Lead").split(",").map((t, idx) => (
                            <span key={idx} className="tag-pill">{t.trim()}</span>
                          ))}
                        </div>
                      </td>
                      <td>{c.leadSource || "Website"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div className="table-actions">
                          {c.status !== "Won" && (
                            <button 
                              className="btn-action-convert" 
                              title="1-Click Convert to Pipeline Deal"
                              onClick={() => openConvertModal(c)}
                            >
                              <Zap size={14} color="#F0FF60" />
                              <span>Convert</span>
                            </button>
                          )}
                          <button 
                            className="action-icon-btn" 
                            title="Send Email"
                            onClick={() => {
                              setEmailFormData({
                                contactId: c.id,
                                recipientEmail: c.email,
                                subject: `Following up with ${c.name}`,
                                body: `Hi ${c.name},\n\n`
                              });
                              setIsEmailModalOpen(true);
                            }}
                          >
                            <Mail size={15} />
                          </button>
                          <button 
                            className="action-icon-btn" 
                            title="Edit Contact"
                            onClick={() => {
                              setEditingContact(c);
                              setContactFormData({
                                name: c.name,
                                email: c.email,
                                phone: c.phone || "",
                                company: c.company || "",
                                status: c.status,
                                value: c.value || 0,
                                leadSource: c.leadSource || "Website",
                                tags: c.tags || "",
                                notes: c.notes || "",
                                expectedCloseDate: c.expectedCloseDate ? c.expectedCloseDate.slice(0, 10) : ""
                              });
                              setIsContactModalOpen(true);
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            className="action-icon-btn delete" 
                            title="Delete"
                            onClick={() => {
                              if (confirm(`Delete ${c.name}?`)) deleteContactMutation.mutate(c.id);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {contacts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="empty-table-cell">
                        No contacts matched your search. Click "Add Contact" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PIPELINE KANBAN VIEW */}
        {activeTab === "pipeline" && (
          <div className="pipeline-kanban-board">
            {STAGES.map(stage => {
              const stageDeals = contacts.filter(c => c.status === stage);
              const stageSum = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
              return (
                <div key={stage} className="kanban-column-circuit">
                  <div className="kanban-column-header">
                    <div className="col-title-wrap">
                      <span className="col-title">{stage}</span>
                      <span className="col-count">{stageDeals.length}</span>
                    </div>
                    <div className="col-sum">${stageSum.toLocaleString()}</div>
                  </div>

                  <div className="kanban-cards-stack">
                    {stageDeals.map(d => (
                      <div key={d.id} className="kanban-card interactive-lift">
                        <div className="kanban-card-top">
                          <span className="deal-contact-name">{d.name}</span>
                          <span className="deal-val">${(Number(d.value) || 0).toLocaleString()}</span>
                        </div>
                        <div className="deal-company">{d.company || "Independent Lead"}</div>
                        {d.expectedCloseDate && (
                          <div className="deal-date">
                            <Clock size={12} />
                            <span>Close: {new Date(d.expectedCloseDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        <div className="deal-actions-row">
                          <select 
                            className="kanban-move-select"
                            value={d.status}
                            onChange={e => handleMoveStage(d.id, e.target.value)}
                          >
                            {STAGES.map(s => <option key={s} value={s}>Move to: {s}</option>)}
                          </select>
                        </div>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className="empty-column-box">No deals</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: COMPANIES VIEW */}
        {activeTab === "companies" && (
          <div className="companies-view-stack">
            <div className="toolbar-circuit">
              <span className="card-title">Client & Partner Companies</span>
              <button className="btn-primary-yellow" onClick={() => setIsCompanyModalOpen(true)}>
                <Building size={16} />
                <span>Add Company</span>
              </button>
            </div>

            <div className="asymmetric-2up-grid">
              {companies.map(comp => (
                <div key={comp.id} className="card-circuit interactive-lift">
                  <div className="card-header-bar">
                    <span className="card-title">{comp.name}</span>
                    <span className="tag-pill">{comp.domain || "Enterprise"}</span>
                  </div>
                  <div style={{ marginTop: "12px", color: "var(--text-body)", fontSize: "14px" }}>
                    <p>Phone: {comp.phone || "—"}</p>
                    <p>Address: {comp.address || "—"}</p>
                    <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                      Created: {new Date(comp.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {companies.length === 0 && (
                <div className="empty-state-notice">No companies listed yet. Click "Add Company" above.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: TASKS & REMINDERS */}
        {activeTab === "tasks" && (
          <div className="tasks-view-stack">
            <div className="toolbar-circuit">
              <div className="filters-row">
                <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value)}>
                  <option value="All">All Task Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsTaskModalOpen(true)}>
                <Plus size={16} />
                <span>New Task</span>
              </button>
            </div>

            <div className="tasks-grid">
              {tasks.map(t => (
                <div key={t.id} className={`task-card-circuit ${t.status === "Completed" ? "completed" : ""} interactive-lift`}>
                  <div className="task-card-header">
                    <span className={`priority-badge ${t.priority.toLowerCase()}`}>{t.priority}</span>
                    <span className={`status-badge ${t.status.toLowerCase().replace(" ", "-")}`}>{t.status}</span>
                  </div>
                  <h4 className="task-card-title">{t.title}</h4>
                  {t.description && <p className="task-card-desc">{t.description}</p>}
                  {t.Contact && (
                    <div className="task-associated-contact">
                      <Users size={13} />
                      <span>{t.Contact.name} ({t.Contact.company || "No Company"})</span>
                    </div>
                  )}
                  <div className="task-card-footer">
                    <div className="task-due-date">
                      <Calendar size={13} />
                      <span>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "No date"}</span>
                    </div>
                    <div className="task-actions">
                      {t.status !== "Completed" && (
                        <button 
                          className="action-icon-btn" 
                          title="Complete Task"
                          onClick={() => updateTaskMutation.mutate({ id: t.id, data: { status: "Completed" } })}
                        >
                          <Check size={14} color="#22C55E" />
                        </button>
                      )}
                      <button 
                        className="action-icon-btn delete" 
                        title="Delete Task"
                        onClick={() => deleteTaskMutation.mutate(t.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="empty-state-notice">No tasks found. Click "New Task" to create one.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: ACTIVITY AUDIT LOG */}
        {activeTab === "activities" && (
          <div className="activities-view-stack">
            <div className="toolbar-circuit">
              <span className="card-title">Chronological Activity & Enterprise Audit Stream</span>
              <button className="btn-primary-yellow" onClick={() => setIsActivityModalOpen(true)}>
                <Plus size={16} />
                <span>Log Manual Interaction</span>
              </button>
            </div>

            <div className="timeline-circuit">
              {activities.map(a => (
                <div key={a.id} className="timeline-item">
                  <div className="timeline-marker">
                    <Clock size={14} color="#F0FF60" />
                  </div>
                  <div className="timeline-content interactive-lift">
                    <div className="timeline-header">
                      <span className="timeline-title">{a.action || a.title || "Audit Action"}</span>
                      <span className="timeline-time">{new Date(a.timestamp || a.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="timeline-desc">{a.description || a.details_json || "System logged action"}</p>
                    {a.target_type && (
                      <span className="tag-pill" style={{ marginTop: "6px", display: "inline-block" }}>
                        Target: {a.target_type} #{a.target_id || ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <div className="empty-state-notice">No activity logs recorded yet.</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: INVOICES & QUOTES */}
        {activeTab === "invoices" && (
          <div className="invoices-view-stack">
            <div className="toolbar-circuit">
              <span className="card-title">Commercial Quotes & Billing Invoices</span>
              <button className="btn-primary-yellow" onClick={() => setIsInvoiceModalOpen(true)}>
                <Plus size={16} />
                <span>Generate Quote / Invoice</span>
              </button>
            </div>

            <div className="table-container-circuit">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Doc #</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.type}</td>
                      <td className="value-cell">${(Number(inv.amount) || 0).toLocaleString()}</td>
                      <td><span className={`status-badge ${inv.status.toLowerCase()}`}>{inv.status}</span></td>
                      <td>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                      <td>{new Date(inv.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-table-cell">No invoices or quotes yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 8: CUSTOMER TICKETS */}
        {activeTab === "tickets" && (
          <div className="tickets-view-stack">
            <div className="toolbar-circuit">
              <span className="card-title">Customer Support & Incident Queues</span>
              <button className="btn-primary-yellow" onClick={() => setIsTicketModalOpen(true)}>
                <Plus size={16} />
                <span>Open Ticket</span>
              </button>
            </div>

            <div className="table-container-circuit">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Opened</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.ticketNumber}</strong></td>
                      <td>{t.subject}</td>
                      <td><span className={`priority-badge ${t.priority.toLowerCase()}`}>{t.priority}</span></td>
                      <td><span className={`status-badge ${t.status.toLowerCase().replace(" ", "-")}`}>{t.status}</span></td>
                      <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: "right" }}>
                        {t.status !== "Resolved" && (
                          <button 
                            className="btn-action-convert"
                            onClick={() => updateTicket({ id: t.id, data: { status: "Resolved" } }).then(() => refetchTickets())}
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {tickets.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-table-cell">No open support tickets.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 9: EMAIL OUTBOX & OPEN TRACKING */}
        {activeTab === "emails" && (
          <div className="emails-view-stack">
            <div className="toolbar-circuit">
              <span className="card-title">Dispatched Emails & Pixel Open Tracking</span>
              <button className="btn-primary-yellow" onClick={() => setIsEmailModalOpen(true)}>
                <Mail size={16} />
                <span>Compose Email</span>
              </button>
            </div>

            <div className="table-container-circuit">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Recipient</th>
                    <th>Subject</th>
                    <th>Template</th>
                    <th>Tracking Status</th>
                    <th>Sent At</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map(em => (
                    <tr key={em.id}>
                      <td>{em.recipient_email || em.recipientEmail}</td>
                      <td>{em.subject}</td>
                      <td><span className="tag-pill">{em.template_name || "Custom"}</span></td>
                      <td>
                        {em.is_opened ? (
                          <span className="status-badge won" title={`Opened at ${new Date(em.opened_at).toLocaleString()}`}>
                            ✓ Opened ({new Date(em.opened_at).toLocaleTimeString()})
                          </span>
                        ) : (
                          <span className="status-badge in-progress">
                            Delivered / Unread
                          </span>
                        )}
                      </td>
                      <td>{new Date(em.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan="5" className="empty-table-cell">No emails dispatched yet. Click "Compose Email" above.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 10: ENTERPRISE SECURITY & BACKUP (ADMIN ONLY) */}
        {activeTab === "security" && user?.role === "admin" && (
          <div className="security-view-stack">
            <div className="asymmetric-2up-grid">
              {/* Database Backup & Snapshots Card */}
              <div className="card-circuit interactive-lift">
                <div className="card-header-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Database size={18} color="#F0FF60" />
                    <span className="card-title">Database Safety & Automated Snapshots</span>
                  </div>
                </div>
                <p style={{ color: "var(--text-body)", fontSize: "14px", margin: "12px 0" }}>
                  Download immediate full-database JSON backups or trigger automated server storage snapshots. Backups are encrypted with enterprise access control.
                </p>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "16px 0" }}>
                  <a 
                    href="http://localhost:5000/api/backup/download" 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn-primary-yellow"
                    style={{ textDecoration: "none" }}
                  >
                    <Download size={16} />
                    <span>Download Full Backup Dump</span>
                  </a>
                  <button className="btn-ghost-dark" onClick={() => createSnapshotMutation.mutate()}>
                    <ShieldCheck size={16} color="#F0FF60" />
                    <span>Create Server Snapshot</span>
                  </button>
                </div>

                <h4 style={{ fontSize: "13px", color: "var(--accent)", marginTop: "20px", textTransform: "uppercase" }}>
                  Recent Server Snapshots ({backupHistory.snapshots?.length || 0})
                </h4>
                <div style={{ marginTop: "10px" }}>
                  {(backupHistory.snapshots || []).slice(0, 5).map((s, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-hairline)", fontSize: "13px" }}>
                      <span>{s.filename}</span>
                      <span style={{ color: "var(--text-muted)" }}>{(s.sizeBytes / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                  {(!backupHistory.snapshots || backupHistory.snapshots.length === 0) && (
                    <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>No snapshots saved yet.</p>
                  )}
                </div>
              </div>

              {/* Cybersecurity Architecture Status Card */}
              <div className="card-circuit interactive-lift">
                <div className="card-header-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Lock size={18} color="#F0FF60" />
                    <span className="card-title">Cybersecurity Defense Architecture</span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>SQL Injection Protection:</strong> Fully parameterized queries and Sequelize ORM abstraction against SQL injection.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>High-Salt Password Hashing:</strong> Enforced bcrypt hashing with 12 salt rounds for all user credentials.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>IP Rate Limiting:</strong> Enforced `express-rate-limit` on auth endpoints (15 req/15m) and general API routes.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>Role-Based Access Control (RBAC):</strong> Granular permissions for Admin, Manager, and Standard User roles across all API routes.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>Security Headers (Helmet):</strong> Frameguard, HSTS, NoSniff, and strict CORS policies active.
                    </div>
                  </div>
                </div>
              </div>

              {/* User Security & 2FA Configuration Card */}
              <div className="card-circuit interactive-lift" style={{ gridColumn: "1 / -1", marginTop: "20px" }}>
                <div className="card-header-bar">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <ShieldCheck size={18} color="#F0FF60" />
                    <span className="card-title">User Account & Two-Factor Authentication (2FA)</span>
                  </div>
                  <span className={`status-badge ${user?.twoFactorEnabled ? "won" : "in-progress"}`}>
                    {user?.twoFactorEnabled ? "2FA Active (Protected)" : "2FA Disabled"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", marginTop: "16px" }}>
                  <div>
                    <h4 style={{ color: "#F0FF60", fontSize: "14px", marginBottom: "8px" }}>Two-Step Verification (Email OTP)</h4>
                    <p style={{ color: "var(--text-body)", fontSize: "13px", lineHeight: "1.6" }}>
                      When enabled, logging into SCRM requires a 6-digit one-time verification code dispatched to your registered email (<code>{user?.email}</code>).
                    </p>
                    <button
                      className={user?.twoFactorEnabled ? "btn-ghost-dark" : "btn-primary-yellow"}
                      style={{ marginTop: "14px" }}
                      onClick={() => toggle2FAMutation.mutate()}
                    >
                      <ShieldCheck size={16} />
                      <span>{user?.twoFactorEnabled ? "Disable Two-Factor Auth" : "Enable Two-Factor Auth"}</span>
                    </button>
                  </div>

                  <div>
                    <h4 style={{ color: "#F0FF60", fontSize: "14px", marginBottom: "8px" }}>Update Profile & Credentials</h4>
                    {profileMessage && (
                      <div style={{ padding: "8px 12px", background: "rgba(240, 255, 96, 0.1)", border: "1px solid var(--border-yellow-adjacent)", borderRadius: "6px", color: "var(--accent)", fontSize: "12px", marginBottom: "10px" }}>
                        {profileMessage}
                      </div>
                    )}
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setProfileMessage("");
                      updateProfileMutation.mutate({
                        name: profileName,
                        currentPassword: currentPassword || undefined,
                        newPassword: newPassword || undefined
                      });
                    }}>
                      <div className="form-group-circuit" style={{ marginBottom: "10px" }}>
                        <label style={{ fontSize: "12px" }}>Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                      <div className="form-row-2col">
                        <div className="form-group-circuit">
                          <label style={{ fontSize: "12px" }}>Current Password</label>
                          <input
                            type="password"
                            placeholder="Required for password change"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                        </div>
                        <div className="form-group-circuit">
                          <label style={{ fontSize: "12px" }}>New Password</label>
                          <input
                            type="password"
                            placeholder="Min 8 chars"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary-yellow small" style={{ marginTop: "10px" }}>
                        Save Profile Changes
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD / EDIT CONTACT */}
      {isContactModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsContactModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? "Edit Contact & Deal" : "Create New Contact & Lead"}</h3>
              <button className="modal-close-btn" onClick={() => setIsContactModalOpen(false)}>×</button>
            </div>
            {contactFormError && <div className="error-banner">{contactFormError}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              setContactFormError("");
              if (editingContact) {
                updateContactMutation.mutate({ id: editingContact.id, data: contactFormData });
              } else {
                createContactMutation.mutate(contactFormData);
              }
            }}>
              <div className="form-group-circuit">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  required
                  value={contactFormData.name} 
                  onChange={e => setContactFormData({ ...contactFormData, name: e.target.value })} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    required
                    value={contactFormData.email} 
                    onChange={e => setContactFormData({ ...contactFormData, email: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    value={contactFormData.phone} 
                    onChange={e => setContactFormData({ ...contactFormData, phone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Company</label>
                  <input 
                    type="text" 
                    value={contactFormData.company} 
                    onChange={e => setContactFormData({ ...contactFormData, company: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Pipeline Stage</label>
                  <select 
                    value={contactFormData.status} 
                    onChange={e => setContactFormData({ ...contactFormData, status: e.target.value })}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Deal Value ($)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={contactFormData.value} 
                    onChange={e => setContactFormData({ ...contactFormData, value: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Expected Close Date</label>
                  <input 
                    type="date" 
                    value={contactFormData.expectedCloseDate} 
                    onChange={e => setContactFormData({ ...contactFormData, expectedCloseDate: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Tags (comma-separated)</label>
                <input 
                  type="text" 
                  placeholder="Enterprise, VIP, Inbound"
                  value={contactFormData.tags} 
                  onChange={e => setContactFormData({ ...contactFormData, tags: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Notes & Context</label>
                <textarea 
                  rows="3"
                  value={contactFormData.notes} 
                  onChange={e => setContactFormData({ ...contactFormData, notes: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsContactModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">
                  {editingContact ? "Save Changes" : "Create Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 1-CLICK CONVERT LEAD TO DEAL */}
      {isConvertModalOpen && convertingContact && (
        <div className="modal-overlay-circuit" onClick={() => setIsConvertModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={20} color="#F0FF60" />
                <h3>1-Click Convert Lead to Deal</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsConvertModalOpen(false)}>×</button>
            </div>
            <p style={{ color: "var(--text-body)", fontSize: "14px", margin: "12px 0" }}>
              Convert qualified lead <strong>{convertingContact.name}</strong> ({convertingContact.company || "Independent"}) into an active Pipeline Deal and create an automated discovery task.
            </p>
            <form onSubmit={e => {
              e.preventDefault();
              convertLeadMutation.mutate({
                id: convertingContact.id,
                data: {
                  dealTitle: convertDealTitle,
                  dealValue: convertDealValue,
                  stageName: "Qualified"
                }
              });
            }}>
              <div className="form-group-circuit">
                <label>Pipeline Deal Title</label>
                <input 
                  type="text" 
                  required
                  value={convertDealTitle} 
                  onChange={e => setConvertDealTitle(e.target.value)} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Estimated Deal Value ($)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  value={convertDealValue} 
                  onChange={e => setConvertDealValue(e.target.value)} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsConvertModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">
                  <Zap size={16} />
                  <span>Execute Conversion</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD COMPANY */}
      {isCompanyModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsCompanyModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Company Record</h3>
              <button className="modal-close-btn" onClick={() => setIsCompanyModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createCompanyMutation.mutate(companyFormData);
            }}>
              <div className="form-group-circuit">
                <label>Company Name *</label>
                <input 
                  type="text" 
                  required
                  value={companyFormData.name} 
                  onChange={e => setCompanyFormData({ ...companyFormData, name: e.target.value })} 
                />
              </div>
              <div className="form-group-circuit">
                <label>Domain / Website</label>
                <input 
                  type="text" 
                  placeholder="acme.com"
                  value={companyFormData.domain} 
                  onChange={e => setCompanyFormData({ ...companyFormData, domain: e.target.value })} 
                />
              </div>
              <div className="form-group-circuit">
                <label>Phone Number</label>
                <input 
                  type="tel" 
                  value={companyFormData.phone} 
                  onChange={e => setCompanyFormData({ ...companyFormData, phone: e.target.value })} 
                />
              </div>
              <div className="form-group-circuit">
                <label>Office Address</label>
                <input 
                  type="text" 
                  value={companyFormData.address} 
                  onChange={e => setCompanyFormData({ ...companyFormData, address: e.target.value })} 
                />
              </div>
              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsCompanyModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Save Company</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DUPLICATE MERGE MODAL */}
      {isDuplicateModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsDuplicateModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" style={{ maxWidth: "680px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GitMerge size={20} color="#F0FF60" />
                <h3>Duplicate Records Detected</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsDuplicateModalOpen(false)}>×</button>
            </div>
            <p style={{ color: "var(--text-body)", fontSize: "14px", margin: "12px 0" }}>
              The system automatically flagged the following duplicate contacts. Click "Merge" to combine their notes, tags, and activities safely.
            </p>
            <div style={{ maxHeight: "360px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              {duplicatesData.duplicates.map((dup, idx) => (
                <div key={idx} style={{ background: "rgba(0,0,0,0.5)", border: "1px solid var(--border-hairline)", borderRadius: "10px", padding: "12px" }}>
                  <div style={{ color: "var(--accent)", fontSize: "13px", fontWeight: "bold" }}>{dup.reason}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px", fontSize: "13px" }}>
                    <div style={{ padding: "8px", background: "#202020", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>PRIMARY RECORD</span>
                      <div><strong>{dup.existingRecord?.name}</strong></div>
                      <div>{dup.existingRecord?.email}</div>
                      <div>{dup.existingRecord?.phone || "No phone"}</div>
                    </div>
                    <div style={{ padding: "8px", background: "#202020", borderRadius: "6px" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>DUPLICATE RECORD</span>
                      <div><strong>{dup.duplicateRecord?.name}</strong></div>
                      <div>{dup.duplicateRecord?.email}</div>
                      <div>{dup.duplicateRecord?.phone || "No phone"}</div>
                    </div>
                  </div>
                  <button 
                    className="btn-primary-yellow small" 
                    style={{ marginTop: "10px", width: "100%" }}
                    onClick={() => mergeContactsMutation.mutate({
                      primaryId: dup.existingRecord.id,
                      duplicateId: dup.duplicateRecord.id
                    })}
                  >
                    Merge These Two Contacts
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SCHEDULE TASK */}
      {isTaskModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsTaskModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Schedule Task & Follow-Up</h3>
              <button className="modal-close-btn" onClick={() => setIsTaskModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createTaskMutation.mutate(taskFormData);
            }}>
              <div className="form-group-circuit">
                <label>Task Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Discovery call follow-up"
                  value={taskFormData.title} 
                  onChange={e => setTaskFormData({ ...taskFormData, title: e.target.value })} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Due Date</label>
                  <input 
                    type="date" 
                    value={taskFormData.dueDate} 
                    onChange={e => setTaskFormData({ ...taskFormData, dueDate: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Priority</label>
                  <select 
                    value={taskFormData.priority} 
                    onChange={e => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Related Contact</label>
                <select 
                  value={taskFormData.contactId} 
                  onChange={e => setTaskFormData({ ...taskFormData, contactId: e.target.value })}
                >
                  <option value="">No Contact Linked</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || "No Company"})</option>)}
                </select>
              </div>

              <div className="form-group-circuit">
                <label>Description</label>
                <textarea 
                  rows="3" 
                  value={taskFormData.description} 
                  onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: LOG ACTIVITY */}
      {isActivityModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsActivityModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Interaction</h3>
              <button className="modal-close-btn" onClick={() => setIsActivityModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createActivityMutation.mutate(activityFormData);
            }}>
              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Interaction Type</label>
                  <select 
                    value={activityFormData.type} 
                    onChange={e => setActivityFormData({ ...activityFormData, type: e.target.value })}
                  >
                    <option value="Call">Phone Call</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Email">Email</option>
                    <option value="Note">Quick Note</option>
                  </select>
                </div>
                <div className="form-group-circuit">
                  <label>Outcome</label>
                  <select 
                    value={activityFormData.outcome} 
                    onChange={e => setActivityFormData({ ...activityFormData, outcome: e.target.value })}
                  >
                    <option value="Interested">Interested</option>
                    <option value="Left Voicemail">Left Voicemail</option>
                    <option value="Proposal Requested">Proposal Requested</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Associated Contact</label>
                <select 
                  value={activityFormData.contactId} 
                  onChange={e => setActivityFormData({ ...activityFormData, contactId: e.target.value })}
                >
                  <option value="">No Contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group-circuit">
                <label>Summary / Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Reviewed pricing options"
                  value={activityFormData.title} 
                  onChange={e => setActivityFormData({ ...activityFormData, title: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Notes</label>
                <textarea 
                  rows="3" 
                  value={activityFormData.description} 
                  onChange={e => setActivityFormData({ ...activityFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsActivityModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: SEND EMAIL WITH TRACKING */}
      {isEmailModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsEmailModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={18} color="#F0FF60" />
                <h3>Compose Tracked Email</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEmailModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              sendEmailMutation.mutate(emailFormData);
            }}>
              <div className="form-group-circuit">
                <label>Quick Template</label>
                <select onChange={e => {
                  const tmpl = emailTemplates.find(t => t.id === e.target.value);
                  if (tmpl) {
                    const selContact = contacts.find(c => c.id === parseInt(emailFormData.contactId, 10));
                    const name = selContact?.name || "Client";
                    const company = selContact?.company || "Your Company";
                    setEmailFormData({
                      ...emailFormData,
                      subject: tmpl.subject.replace("{{name}}", name).replace("{{company}}", company),
                      body: tmpl.body.replace(/{{name}}/g, name).replace(/{{company}}/g, company)
                    });
                  }
                }}>
                  <option value="">Select a template...</option>
                  {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="form-group-circuit">
                <label>Recipient Email *</label>
                <input 
                  type="email" 
                  required
                  value={emailFormData.recipientEmail} 
                  onChange={e => setEmailFormData({ ...emailFormData, recipientEmail: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Subject *</label>
                <input 
                  type="text" 
                  required
                  value={emailFormData.subject} 
                  onChange={e => setEmailFormData({ ...emailFormData, subject: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Email Body *</label>
                <textarea 
                  rows="6" 
                  required
                  value={emailFormData.body} 
                  onChange={e => setEmailFormData({ ...emailFormData, body: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">
                  <Send size={15} />
                  <span>Send & Track Open</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 8: CSV BULK IMPORT */}
      {isImportModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsImportModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Import Contacts via CSV</h3>
              <button className="modal-close-btn" onClick={() => setIsImportModalOpen(false)}>×</button>
            </div>
            <p style={{ color: "var(--text-body)", fontSize: "13px", margin: "10px 0" }}>
              Paste comma-separated rows. Required columns: <code>Name, Email, Phone, Company, Stage, Value, LeadSource, Tags</code>.
            </p>
            <textarea 
              rows="7"
              placeholder="John Doe, john@example.com, +1234567890, Acme Corp, Qualified, 5000, Website, Inbound"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              style={{ width: "100%", padding: "10px", background: "#1c1c1c", border: "1px solid var(--border-hairline)", borderRadius: "8px", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "12px" }}
            />
            <div className="modal-footer-btns">
              <button type="button" className="btn-ghost-dark" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary-yellow" onClick={handleProcessCSVImport}>
                Process Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 9: CREATE INVOICE */}
      {isInvoiceModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Generate Quote or Invoice</h3>
              <button className="modal-close-btn" onClick={() => setIsInvoiceModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createInvoiceMutation.mutate({
                ...invoiceFormData,
                invoiceNumber: `INV-${Date.now().toString().slice(-6)}`
              });
            }}>
              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Document Type</label>
                  <select 
                    value={invoiceFormData.type} 
                    onChange={e => setInvoiceFormData({ ...invoiceFormData, type: e.target.value })}
                  >
                    <option value="Invoice">Tax Invoice</option>
                    <option value="Quote">Commercial Quote</option>
                  </select>
                </div>
                <div className="form-group-circuit">
                  <label>Amount ($) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={invoiceFormData.amount} 
                    onChange={e => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Related Contact</label>
                <select 
                  value={invoiceFormData.contactId} 
                  onChange={e => setInvoiceFormData({ ...invoiceFormData, contactId: e.target.value })}
                >
                  <option value="">Select Contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company})</option>)}
                </select>
              </div>

              <div className="form-group-circuit">
                <label>Due Date</label>
                <input 
                  type="date" 
                  value={invoiceFormData.dueDate} 
                  onChange={e => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Issue Document</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: CREATE TICKET */}
      {isTicketModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsTicketModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Support Ticket</h3>
              <button className="modal-close-btn" onClick={() => setIsTicketModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createTicketMutation.mutate({
                ...ticketFormData,
                ticketNumber: `TCK-${Date.now().toString().slice(-6)}`
              });
            }}>
              <div className="form-group-circuit">
                <label>Subject *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Production login failure"
                  value={ticketFormData.subject} 
                  onChange={e => setTicketFormData({ ...ticketFormData, subject: e.target.value })} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Priority</label>
                  <select 
                    value={ticketFormData.priority} 
                    onChange={e => setTicketFormData({ ...ticketFormData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                <div className="form-group-circuit">
                  <label>Status</label>
                  <select 
                    value={ticketFormData.status} 
                    onChange={e => setTicketFormData({ ...ticketFormData, status: e.target.value })}
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Description</label>
                <textarea 
                  rows="4" 
                  value={ticketFormData.description} 
                  onChange={e => setTicketFormData({ ...ticketFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsTicketModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
