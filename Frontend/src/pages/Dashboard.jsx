import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BrandLogo from "../components/BrandLogo";
import WorkspaceShell from "../components/WorkspaceShell";
import SettingsView from "../components/SettingsView";
import useModalAccessibility from "../hooks/useModalAccessibility";
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
  Package
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
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  activateProduct,
  updateCompany,
  deleteCompany,
  getAuthUsers
} from "../services/api";
import "../App.css";

const STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  // URL-driven workspace navigation: /app/:section and /app/settings/:tab
  const { section } = useParams();
  const navigate = useNavigate();

  const SECTION_TO_TAB = {
    dashboard: "dashboard",
    leads: "leads",
    contacts: "contacts",
    pipeline: "pipeline",
    companies: "companies",
    tasks: "tasks",
    activities: "activities",
    invoices: "invoices",
    catalog: "catalog",
    tickets: "tickets",
    outbox: "emails",
    settings: "settings",
    profile: "settings",
    security: "security"
  };

  const TAB_TO_PATH = {
    dashboard: "/app/dashboard",
    leads: "/app/leads",
    contacts: "/app/contacts",
    pipeline: "/app/pipeline",
    companies: "/app/companies",
    tasks: "/app/tasks",
    activities: "/app/activities",
    invoices: "/app/invoices",
    catalog: "/app/catalog",
    tickets: "/app/tickets",
    emails: "/app/outbox",
    settings: "/app/settings/profile",
    profile: "/app/settings/profile",
    security: "/app/security"
  };

  const activeTab = SECTION_TO_TAB[section] || "dashboard";
  const navigateTo = (tab, options) => navigate(TAB_TO_PATH[tab] || "/app/dashboard", options);

  React.useEffect(() => {
    const knownSections = [
      "dashboard",
      "leads",
      "contacts",
      "pipeline",
      "companies",
      "tasks",
      "activities",
      "invoices",
      "catalog",
      "tickets",
      "outbox",
      "settings",
      "profile",
      "security"
    ];
    if (!section || !knownSections.includes(section)) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [section, navigate]);

  // In-App Toast Notification
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Form Error States
  const [leadFormError, setLeadFormError] = useState("");
  const [taskFormError, setTaskFormError] = useState("");
  const [activityFormError, setActivityFormError] = useState("");
  const [emailFormError, setEmailFormError] = useState("");
  const [importFormError, setImportFormError] = useState("");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState("contacts");

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

  // Product Catalog Modal (Supply Pillar)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: 0,
    category: "Services",
    unit: "unit"
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

  const { data: companiesResponse = { companies: [] }, refetch: refetchCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: getCompanies
  });
  const companies = Array.isArray(companiesResponse)
    ? companiesResponse
    : companiesResponse.companies || [];

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

  // Supply Pillar: Products Catalog Query
  const { data: products = [], refetch: refetchProducts } = useQuery({
    queryKey: ["products"],
    queryFn: getProducts
  });

  const { data: calendarSyncData = { status: "connected", scheduledEventsCount: 0 } } = useQuery({
    queryKey: ["calendarSync"],
    queryFn: getCalendarSync
  });

  const { data: teamUsersData = { users: [] } } = useQuery({
    queryKey: ["authUsers"],
    queryFn: getAuthUsers
  });
  const teamUsers = teamUsersData.users || [];

  // Outbox preview modal state
  const [selectedOutboxEmail, setSelectedOutboxEmail] = useState(null);

  // Catalog category filter state
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("All");

  // Company detail / edit modal state
  const [selectedCompanyDetail, setSelectedCompanyDetail] = useState(null);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [editingCompanyData, setEditingCompanyData] = useState({ id: null, name: "", domain: "", phone: "", address: "" });

  // CSV Import Step State (1: Upload/Paste, 2: Preview & Duplicate Handling, 3: Success Summary)
  const [importStep, setImportStep] = useState(1);
  const [importParsedPreview, setImportParsedPreview] = useState([]);
  const [importSkipDuplicates, setImportSkipDuplicates] = useState(true);

  // Mutations
  const createLeadMutation = useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsLeadModalOpen(false);
      setEditingLead(null);
      setLeadFormError("");
      showToast("Inbound lead captured successfully!");
    },
    onError: (err) => setLeadFormError(err.response?.data?.error || "Failed to create lead.")
  });

  const updateLeadMutation = useMutation({
    mutationFn: updateLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setIsLeadModalOpen(false);
      setEditingLead(null);
      setLeadFormError("");
      showToast("Lead updated successfully.");
    },
    onError: (err) => setLeadFormError(err.response?.data?.error || "Failed to update lead.")
  });

  const deleteLeadMutation = useMutation({
    mutationFn: deleteLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      showToast("Lead removed from system.");
    },
    onError: (err) => showToast(err.response?.data?.error || "Failed to delete lead.")
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
      showToast("Lead successfully converted to Contact, Company, and Deal!");
    },
    onError: (err) => showToast(err.response?.data?.error || "Failed to convert lead.")
  });

  const createContactMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsContactModalOpen(false);
      setContactFormError("");
      showToast("Contact & deal created successfully!");
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
      setContactFormError("");
      showToast("Contact updated successfully.");
    },
    onError: (err) => setContactFormError(err.response?.data?.error || "Failed to update contact.")
  });

  const deleteContactMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      showToast("Contact deleted.");
    }
  });

  const convertContactToDealMutation = useMutation({
    mutationFn: convertLeadToDeal,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsConvertModalOpen(false);
      showToast(res.message || "Lead converted successfully!");
    },
    onError: (err) => showToast("Conversion failed: " + (err.response?.data?.error || err.message))
  });

  const createCompanyMutation = useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsCompanyModalOpen(false);
      showToast("Company created successfully.");
    }
  });

  const updateCompanyMutation = useMutation({
    mutationFn: updateCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setIsEditCompanyModalOpen(false);
      showToast("Company details updated.");
    },
    onError: (err) => showToast("Failed to update company: " + (err.response?.data?.error || err.message))
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setSelectedCompanyDetail(null);
      showToast("Company removed.");
    },
    onError: (err) => showToast("Failed to delete company: " + (err.response?.data?.error || err.message))
  });

  const archiveProductMutation = useMutation({
    mutationFn: archiveProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("Item marked as archived.");
    },
    onError: (err) => showToast("Archive failed: " + (err.response?.data?.error || err.message))
  });

  const activateProductMutation = useMutation({
    mutationFn: activateProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("Item restored to active catalog.");
    },
    onError: (err) => showToast("Activation failed: " + (err.response?.data?.error || err.message))
  });

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setIsTaskModalOpen(false);
      setTaskFormError("");
      setTaskFormData({
        title: "",
        description: "",
        dueDate: "",
        priority: "Medium",
        status: "Pending",
        contactId: ""
      });
      showToast("Task scheduled successfully!");
    },
    onError: (err) => setTaskFormError(err.response?.data?.error || "Failed to schedule task.")
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
      setActivityFormError("");
      setActivityFormData({
        contactId: "",
        type: "Call",
        title: "",
        description: "",
        outcome: "Interested"
      });
      showToast("Interaction logged successfully!");
    },
    onError: (err) => setActivityFormError(err.response?.data?.error || "Failed to log interaction.")
  });

  const createInvoiceMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setIsInvoiceModalOpen(false);
      showToast("Invoice created.");
    }
  });

  const createTicketMutation = useMutation({
    mutationFn: createTicket,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsTicketModalOpen(false);
      showToast("Support ticket created.");
    }
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsProductModalOpen(false);
      showToast("Product registered in supply catalog!");
    },
    onError: (err) => showToast(err.response?.data?.error || "Failed to create product.")
  });

  const deleteProductMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      showToast("Product removed from catalog.");
    },
    onError: (err) => showToast(err.response?.data?.error || "Failed to delete product.")
  });

  const sendEmailMutation = useMutation({
    mutationFn: sendEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailLogs"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsEmailModalOpen(false);
      setEmailFormError("");
      setEmailFormData({
        contactId: "",
        recipientEmail: "",
        subject: "",
        body: ""
      });
      showToast("Email dispatched successfully with tracking pixel attached!");
    },
    onError: (err) => setEmailFormError(err.response?.data?.error || "Email delivery failed. Verify SMTP configuration.")
  });

  const mergeContactsMutation = useMutation({
    mutationFn: mergeContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      setIsDuplicateModalOpen(false);
      setSelectedDuplicate(null);
      showToast("Contacts merged cleanly!");
    }
  });

  const createSnapshotMutation = useMutation({
    mutationFn: createDatabaseSnapshot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backupHistory"] });
      showToast("Snapshot successfully created in server storage!");
    }
  });

  // Safe CSV Cell Formatter (RFC-4180 + Excel DDE Formula Injection Protection)
  const formatCsvCell = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    // Neutralize formula injection risk if starting with =, +, -, @, tab, or carriage return
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Export to CSV with Multiple Entity Support, Formula Injection Defense & UTF-8 BOM
  const handleExportCSV = (scope = "contacts") => {
    try {
      let headers = [];
      let rows = [];
      let filename = "";

      if (scope === "leads") {
        if (leads.length === 0) {
          showToast("No leads available to export.");
          return;
        }
        headers = ["ID", "Name", "Email", "Phone", "Company", "Title", "Status", "Source", "Estimated Value", "Created At"];
        rows = leads.map(l => [
          l.id,
          formatCsvCell(l.name),
          formatCsvCell(l.email),
          formatCsvCell(l.phone),
          formatCsvCell(l.company_name),
          formatCsvCell(l.title),
          formatCsvCell(l.status || "New"),
          formatCsvCell(l.source),
          l.estimated_value || 0,
          formatCsvCell(l.created_at)
        ]);
        filename = `SCRM_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      } else if (scope === "tasks") {
        if (tasks.length === 0) {
          showToast("No tasks available to export.");
          return;
        }
        headers = ["ID", "Title", "Status", "Priority", "Due Date", "Contact ID", "Description"];
        rows = tasks.map(t => [
          t.id,
          formatCsvCell(t.title),
          formatCsvCell(t.status || "Pending"),
          formatCsvCell(t.priority || "Medium"),
          formatCsvCell(t.dueDate),
          t.contactId || "",
          formatCsvCell(t.description)
        ]);
        filename = `SCRM_Tasks_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      } else {
        if (contacts.length === 0) {
          showToast("No contacts available to export.");
          return;
        }
        headers = ["ID", "Name", "Email", "Phone", "Company", "Status", "Value", "LeadSource", "Tags", "Expected Close Date"];
        rows = contacts.map(c => [
          c.id,
          formatCsvCell(c.name),
          formatCsvCell(c.email),
          formatCsvCell(c.phone),
          formatCsvCell(c.company),
          formatCsvCell(c.status || "New"),
          c.value || 0,
          formatCsvCell(c.leadSource),
          formatCsvCell(c.tags),
          formatCsvCell(c.expectedCloseDate)
        ]);
        filename = `SCRM_Contacts_Export_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      // Prepend UTF-8 BOM so Excel opens UTF-8 characters correctly
      const csvString = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
      showToast(`Exported ${rows.length} records safely to ${filename}`);
    } catch (err) {
      showToast("Failed to export CSV: " + err.message);
    }
  };

  // Import CSV text & file upload
  const handleCSVFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
      setImportFormError("");
    };
    reader.onerror = () => {
      setImportFormError("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  // Step 1 -> Step 2: Parse and Preview CSV rows
  const handleParseCsvForPreview = () => {
    setImportFormError("");
    if (!csvText.trim()) {
      setImportFormError("Please upload a CSV file or paste CSV content.");
      return;
    }
    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      setImportFormError("CSV content is empty.");
      return;
    }

    const parsed = [];
    const existingEmails = new Set(contacts.map(c => (c.email || "").toLowerCase().trim()));

    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && (lines[i].toLowerCase().includes("name") || lines[i].toLowerCase().includes("email"))) {
        continue; // skip header line
      }
      const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      if (cols[0] && cols[1]) {
        const emailLower = cols[1].toLowerCase().trim();
        const isDuplicate = existingEmails.has(emailLower);
        parsed.push({
          name: cols[0],
          email: cols[1],
          phone: cols[2] || "",
          company: cols[3] || "",
          status: cols[4] || "New",
          value: Number(cols[5]) || 0,
          leadSource: cols[6] || "CSV Import",
          tags: cols[7] || "Imported",
          isDuplicate
        });
      }
    }

    if (parsed.length === 0) {
      setImportFormError("No valid records found. Each record requires at least Name and Email.");
      return;
    }

    setImportParsedPreview(parsed);
    setImportStep(2);
  };

  // Step 2 -> Step 3: Execute Import
  const handleExecuteCSVImport = async () => {
    setImportFormError("");
    try {
      const recordsToImport = importSkipDuplicates 
        ? importParsedPreview.filter(p => !p.isDuplicate)
        : importParsedPreview;

      if (recordsToImport.length === 0) {
        setImportFormError("All parsed records are duplicates and skip duplicates is checked.");
        return;
      }

      const res = await bulkImportContacts(recordsToImport);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["duplicates"] });
      showToast(res.message || `Imported ${recordsToImport.length} contacts!`);
      setImportStep(3);
    } catch (e) {
      setImportFormError("Import error: " + (e.response?.data?.error || e.message));
    }
  };

  const handleResetImportModal = () => {
    setIsImportModalOpen(false);
    setImportStep(1);
    setCsvText("");
    setImportParsedPreview([]);
    setImportFormError("");
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

  const openNewLead = () => {
    setEditingLead(null);
    setLeadFormError("");
    setLeadFormData({
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
    navigateTo("leads");
    setIsLeadModalOpen(true);
  };

  const anyModalOpen =
    isLeadModalOpen ||
    isLeadConvertModalOpen ||
    isContactModalOpen ||
    isConvertModalOpen ||
    isCompanyModalOpen ||
    isDuplicateModalOpen ||
    isTaskModalOpen ||
    isActivityModalOpen ||
    isEmailModalOpen ||
    isImportModalOpen ||
    isExportModalOpen ||
    isInvoiceModalOpen ||
    isTicketModalOpen ||
    isProductModalOpen;

  const closeAllModals = () => {
    setIsLeadModalOpen(false);
    setIsLeadConvertModalOpen(false);
    setIsContactModalOpen(false);
    setIsConvertModalOpen(false);
    setIsCompanyModalOpen(false);
    setIsDuplicateModalOpen(false);
    setIsTaskModalOpen(false);
    setIsActivityModalOpen(false);
    setIsEmailModalOpen(false);
    setIsImportModalOpen(false);
    setIsExportModalOpen(false);
    setIsInvoiceModalOpen(false);
    setIsTicketModalOpen(false);
    setIsProductModalOpen(false);
  };

  useModalAccessibility(anyModalOpen, closeAllModals);

  // Metrics
  const totalPipelineValue = contacts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const wonValue = contacts.filter(c => c.status === "Won").reduce((sum, c) => sum + (Number(c.value) || 0), 0);
  const wonCount = contacts.filter(c => c.status === "Won").length;
  const proposalCount = contacts.filter(c => c.status === "Proposal").length;
  const pendingTasks = tasks.filter(t => t.status !== "Completed" && t.status !== "Cancelled");
  const openTickets = tickets.filter(t => t.status === "Open" || t.status === "In Progress");

  return (
    <>
      <WorkspaceShell
        user={user}
        counts={{
          leads: leads.length,
          contacts: contacts.length,
          companies: companies.length,
          tasks: pendingTasks.length,
          catalog: products.length,
          tickets: openTickets.length
        }}
        onNewLead={openNewLead}
      >
        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="dashboard-view-stack">
            {/* Top Hero Section */}
            <header className="crm-hero">
              <div className="eyebrow">ENTERPRISE CRM // OPERATOR: {user?.name || "OPERATOR"} ({user?.role?.toUpperCase() || "STANDARD_USER"})</div>
              <h1 className="hero-display-stack">
                DRIVE DEALS.<br />
                AUTOMATE TASKS.<br />
                <span className="yellow-text">COMPLETE VISIBILITY.</span>
              </h1>
              <p className="hero-lead-text">
                All-in-one relationship intelligence and revenue operations. Track deals, schedule priority follow-ups, dispatch verified email campaigns, and analyze sales performance in real time.
              </p>

              <div className="hero-three-button-row">
                <button className="btn-primary-yellow interactive-lift" onClick={() => { 
                  setEditingLead(null); 
                  setLeadFormError("");
                  setLeadFormData({
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
                  setIsLeadModalOpen(true); 
                }}>
                  <UserPlus size={17} />
                  <span>Create Lead</span>
                </button>
                <button className="btn-ghost-dark interactive-lift" onClick={() => { setTaskFormError(""); setIsTaskModalOpen(true); }}>
                  <Plus size={17} color="#F0FF60" />
                  <span>Schedule Task</span>
                </button>
                <button className="btn-ghost-dark interactive-lift" onClick={() => { setActivityFormError(""); setIsActivityModalOpen(true); }}>
                  <Phone size={16} color="#F0FF60" />
                  <span>Log Interaction</span>
                </button>
                <button className="btn-ghost-dark interactive-lift" onClick={() => { setEmailFormError(""); setIsEmailModalOpen(true); }}>
                  <Mail size={16} color="#F0FF60" />
                  <span>Compose Email</span>
                </button>
                <button className="btn-ghost-dark interactive-lift" onClick={() => setIsExportModalOpen(true)}>
                  <Download size={16} />
                  <span>Export CSV</span>
                </button>
                <button className="btn-ghost-dark interactive-lift" onClick={() => { setImportFormError(""); setIsImportModalOpen(true); }}>
                  <Upload size={16} />
                  <span>Import CSV</span>
                </button>
              </div>
            </header>

            {/* 4-Up High Impact Telemetry Grid */}
            <section className="metrics-4up-grid">
              <div className="metric-card-circuit interactive-lift" onClick={() => { navigateTo("contacts"); ; }} style={{ cursor: "pointer" }}>
                <div className="metric-icon-badge"><Users size={22} /></div>
                <div className="metric-val">{contacts.length}</div>
                <div className="metric-lbl">Total Contacts & Leads</div>
                <div className="metric-sub">Across all pipeline stages</div>
              </div>

              <div className="metric-card-circuit interactive-lift" onClick={() => { navigateTo("pipeline"); ; }} style={{ cursor: "pointer" }}>
                <div className="metric-icon-badge"><DollarSign size={22} /></div>
                <div className="metric-val" style={{ color: "var(--accent)" }}>
                  ${totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
                <div className="metric-lbl">Active Pipeline Value</div>
                <div className="metric-sub">{proposalCount} deals in Proposal stage</div>
              </div>

              <div className="metric-card-circuit interactive-lift" onClick={() => { navigateTo("pipeline"); ; }} style={{ cursor: "pointer" }}>
                <div className="metric-icon-badge"><ShieldCheck size={22} /></div>
                <div className="metric-val" style={{ color: "var(--semantic-success)" }}>
                  ${wonValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                </div>
                <div className="metric-lbl">Won Deals Revenue</div>
                <div className="metric-sub">{wonCount} closed won contracts ({dealMetrics.winRate || "0%"})</div>
              </div>

              <div className="metric-card-circuit interactive-lift" onClick={() => { navigateTo("tasks"); ; }} style={{ cursor: "pointer" }}>
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
            <div className="asymmetric-2up-grid">
              {/* Pipeline Overview Card */}
              <div className="card-circuit interactive-lift">
                <div className="card-header-bar">
                  <span className="card-title">Deal Pipeline Distribution</span>
                  <button className="btn-ghost-dark small" onClick={() => navigateTo("pipeline")}>View Board</button>
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
                    Round-robin lead routing, automated duplicate resolution, engagement tracking and instant lead-to-deal conversion, backed by a consistent and auditable record of every customer interaction.
                  </p>
                </div>
                <div className="inverted-actions">
                  <button className="btn-dark-on-yellow" onClick={() => { setEditingContact(null); setIsContactModalOpen(true); }}>
                    Add Record
                  </button>
                  <button className="btn-outline-on-yellow" onClick={() => navigateTo("security")}>
                    Security Audit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LEADS INGESTION & PIPELINE QUALIFICATION */}
        {activeTab === "leads" && (
          <div className="contacts-view-stack">
            <div className="toolbar-circuit">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search lead name, email, company..." 
                  value={leadSearchTerm} 
                  onChange={e => setLeadSearchTerm(e.target.value)} 
                />
              </div>

              <div className="filters-row">
                <select value={leadStatusFilter} onChange={e => setLeadStatusFilter(e.target.value)}>
                  <option value="All">All Lead Statuses</option>
                  <option value="New">New</option>
                  <option value="Contacted">Contacted</option>
                  <option value="Engaged">Engaged</option>
                  <option value="Qualified">Qualified</option>
                  <option value="Converted">Converted</option>
                  <option value="Disqualified">Disqualified</option>
                </select>

                <button 
                  className="btn-primary-yellow"
                  onClick={() => {
                    setEditingLead(null);
                    setLeadFormData({
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
                    setIsLeadModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>New Lead</span>
                </button>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="table-card-circuit empty-state">
                <Target size={40} color="#F0FF60" />
                <h3>No Leads Recorded</h3>
                <p>Ingest inbound prospects here to qualify them before converting to contacts and deals.</p>
                <button 
                  className="btn-primary-yellow"
                  style={{ marginTop: "16px" }}
                  onClick={() => {
                    setEditingLead(null);
                    setLeadFormData({
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
                    setIsLeadModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Create First Lead</span>
                </button>
              </div>
            ) : (
              <div className="table-card-circuit">
                <table className="circuit-table">
                  <thead>
                    <tr>
                      <th>Lead Prospect</th>
                      <th>Company & Title</th>
                      <th>Contact Info</th>
                      <th>Source</th>
                      <th>Est. Value</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map(lead => (
                      <tr key={lead.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#FFFFFF" }}>{lead.name}</div>
                          <div style={{ fontSize: "11px", color: "#9E9E9E" }}>Added {new Date(lead.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td>
                          <div style={{ color: "#FFFFFF" }}>{lead.company_name || "—"}</div>
                          <div style={{ fontSize: "11px", color: "#9E9E9E" }}>{lead.title || "Prospect"}</div>
                        </td>
                        <td>
                          <div>{lead.email}</div>
                          <div style={{ fontSize: "11px", color: "#9E9E9E" }}>{lead.phone || "No phone"}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "12px", color: "#DFDFDF" }}>{lead.source || "Website"}</span>
                        </td>
                        <td>
                          <span style={{ color: "#F0FF60", fontWeight: 700 }}>
                            ${parseFloat(lead.estimated_value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${lead.status.toLowerCase()}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            {lead.status !== "Converted" ? (
                              <button
                                className="btn-primary-yellow"
                                style={{ padding: "4px 10px", fontSize: "12px", gap: "4px" }}
                                onClick={() => {
                                  setConvertingLead(lead);
                                  setLeadConvertTitle(`${lead.company_name || lead.name} - Solution Engagement`);
                                  setLeadConvertValue(lead.estimated_value || 10000);
                                  setLeadConvertStage("Qualified");
                                  setIsLeadConvertModalOpen(true);
                                }}
                                title="Convert to Contact, Company & Deal"
                              >
                                <ArrowRight size={13} />
                                <span>Convert</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#22C55E", padding: "4px 8px", backgroundColor: "rgba(34,197,94,0.1)", borderRadius: "4px" }}>
                                ✓ Converted
                              </span>
                            )}
                            <button
                              className="action-icon-btn"
                              onClick={() => {
                                setEditingLead(lead);
                                setLeadFormData({
                                  name: lead.name,
                                  email: lead.email,
                                  phone: lead.phone || "",
                                  company_name: lead.company_name || "",
                                  title: lead.title || "",
                                  source: lead.source || "Website",
                                  status: lead.status || "New",
                                  estimated_value: lead.estimated_value || 0,
                                  notes: lead.notes || ""
                                });
                                setIsLeadModalOpen(true);
                              }}
                              title="Edit Lead"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              className="action-icon-btn delete"
                              onClick={() => {
                                if (window.confirm(`Delete lead "${lead.name}"?`)) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                              title="Delete Lead"
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
              <div>
                <span className="card-title">Client & Partner Companies</span>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Accounts, linked contacts, and collective deal valuation
                </div>
              </div>
              <button className="btn-primary-yellow" onClick={() => setIsCompanyModalOpen(true)}>
                <Building size={16} />
                <span>Add Company</span>
              </button>
            </div>

            <div className="asymmetric-2up-grid">
              {companies.map(comp => {
                const count = comp.contactCount ?? (contacts.filter(c => c.company && c.company.toLowerCase() === comp.name.toLowerCase()).length);
                const dealSum = comp.totalDealValue ?? (contacts.filter(c => c.company && c.company.toLowerCase() === comp.name.toLowerCase()).reduce((acc, curr) => acc + (Number(curr.value) || 0), 0));
                return (
                  <div key={comp.id} className="card-circuit interactive-lift">
                    <div className="card-header-bar">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Building size={18} color="#F0FF60" />
                        <span className="card-title">{comp.name}</span>
                      </div>
                      <span className="tag-pill">{comp.domain || "Enterprise"}</span>
                    </div>
                    <div style={{ marginTop: "12px", color: "var(--text-body)", fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div><strong>Domain:</strong> {comp.domain ? <a href={`https://${comp.domain}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>{comp.domain}</a> : "—"}</div>
                      <div><strong>Phone:</strong> {comp.phone || "—"}</div>
                      <div><strong>HQ Address:</strong> {comp.address || "—"}</div>
                      <div style={{ display: "flex", gap: "12px", marginTop: "8px", padding: "8px 10px", background: "rgba(0,0,0,0.3)", borderRadius: "6px" }}>
                        <div><span style={{ color: "var(--text-muted)", fontSize: "11px" }}>CONTACTS</span>: <strong>{count}</strong></div>
                        <div><span style={{ color: "var(--text-muted)", fontSize: "11px" }}>TOTAL DEALS</span>: <strong>${dealSum.toLocaleString()}</strong></div>
                      </div>
                      <div style={{ marginTop: "4px", fontSize: "11px", color: "var(--text-muted)" }}>
                        Created: {new Date(comp.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px", borderTop: "1px solid var(--border-hairline)", paddingTop: "10px" }}>
                      <button 
                        className="btn-ghost-dark small" 
                        onClick={() => {
                          setEditingCompanyData({
                            id: comp.id,
                            name: comp.name,
                            domain: comp.domain || "",
                            phone: comp.phone || "",
                            address: comp.address || ""
                          });
                          setIsEditCompanyModalOpen(true);
                        }}
                      >
                        <Edit3 size={13} />
                        <span>Edit</span>
                      </button>
                      <button 
                        className="btn-ghost-dark small" 
                        style={{ color: "#EF4444" }}
                        onClick={() => {
                          if (window.confirm(`Delete company record for ${comp.name}? Associated contacts will remain.`)) {
                            deleteCompanyMutation.mutate(comp.id);
                          }
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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

        {/* TAB: SUPPLY PILLAR - PRODUCTS CATALOG */}
        {activeTab === "catalog" && (
          <div className="invoices-view-stack">
            <div className="toolbar-circuit">
              <div>
                <span className="card-title">Commercial Products & Services Catalog</span>
                <div style={{ fontSize: "12px", color: "#9E9E9E", marginTop: "2px" }}>
                  Supply Pillar · Standardized pricing, product vs. service lines, and stock controls
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select 
                  value={catalogCategoryFilter} 
                  onChange={e => setCatalogCategoryFilter(e.target.value)}
                  style={{ padding: "6px 12px", background: "#1c1c1c", border: "1px solid var(--border-hairline)", borderRadius: "6px", color: "#fff", fontSize: "13px" }}
                >
                  <option value="All">All Categories</option>
                  <option value="Services">Services Only</option>
                  <option value="Hardware">Hardware Only</option>
                  <option value="Software License">Software License</option>
                  <option value="Subscription">Subscription</option>
                </select>
                <button className="btn-primary-yellow" onClick={() => setIsProductModalOpen(true)}>
                  <Plus size={16} />
                  <span>Add Product / Service</span>
                </button>
              </div>
            </div>

            <div className="table-container-circuit">
              <table className="crm-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Type / Line</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Unit Price</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products
                    .filter(p => catalogCategoryFilter === "All" || p.category === catalogCategoryFilter)
                    .map(p => {
                      const isService = p.category === "Services" || p.category === "Subscription";
                      return (
                        <tr key={p.id}>
                          <td><strong>{p.name}</strong></td>
                          <td>
                            <span style={{
                              fontSize: "10px",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              backgroundColor: isService ? "rgba(96,165,250,0.15)" : "rgba(240,255,96,0.15)",
                              color: isService ? "#60A5FA" : "#F0FF60",
                              fontWeight: 700
                            }}>
                              {isService ? "Service" : "Product"}
                            </span>
                          </td>
                          <td><span style={{ fontFamily: "monospace", fontSize: "12px", color: "#FAFF69" }}>{p.sku || "—"}</span></td>
                          <td>{p.category || "Services"}</td>
                          <td className="value-cell">${(Number(p.price) || 0).toLocaleString()}</td>
                          <td>{p.unit || "unit"}</td>
                          <td>
                            <span style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: "4px",
                              backgroundColor: p.is_active ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)",
                              color: p.is_active ? "#22C55E" : "#9E9E9E"
                            }}>
                              {p.is_active ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {p.is_active ? (
                                <button
                                  className="action-icon-btn"
                                  onClick={() => archiveProductMutation.mutate(p.id)}
                                  title="Archive item (deactivate)"
                                >
                                  <Lock size={13} color="#9E9E9E" />
                                </button>
                              ) : (
                                <button
                                  className="action-icon-btn"
                                  onClick={() => activateProductMutation.mutate(p.id)}
                                  title="Restore item to active"
                                >
                                  <CheckCircle2 size={13} color="#22C55E" />
                                </button>
                              )}
                              <button
                                className="action-icon-btn delete"
                                onClick={() => {
                                  if (window.confirm(`Permanently delete catalog item ${p.name}?`)) {
                                    deleteProductMutation.mutate(p.id);
                                  }
                                }}
                                title="Delete Product"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty-table-cell">
                        No products registered in catalog yet. Click "+ Add Product / Service" to build your pricing inventory.
                      </td>
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
              <div>
                <span className="card-title">Dispatched Emails & Pixel Open Tracking</span>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Live SMTP relay history with pixel-based receipt confirmation and payload inspection
                </div>
              </div>
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
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emailLogs.map(em => (
                    <tr key={em.id}>
                      <td><strong>{em.recipient_email || em.recipientEmail}</strong></td>
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
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-ghost-dark small"
                          onClick={() => setSelectedOutboxEmail(em)}
                          title="Inspect email payload and tracking telemetry"
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {emailLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="empty-table-cell">No emails dispatched yet. Click "Compose Email" above.</td>
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
                      <strong>Record protection:</strong> Every workspace record is scoped to your account and checked on the server before it is read or changed.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>Credential safety:</strong> Passwords are hashed and never stored in plain text or returned to the browser.
                    </div>
                  </div>
                  <div className="security-check-item">
                    <CheckCircle2 size={16} color="#22C55E" />
                    <div>
                      <strong>Abuse protection:</strong> Sign-in and account-recovery endpoints are rate limited against repeated attempts.
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
                      <strong>Secure transport:</strong> Strict response headers and origin checks protect requests between the browser and the workspace.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: ACCOUNT SETTINGS & PREFERENCES */}
        {activeTab === "security" && user?.role !== "admin" && (
          <div className="settings-card" role="alert">
            <h2 className="settings-card-title">Administrator access required</h2>
            <p className="settings-card-copy">
              Security and backup tools are restricted to workspace administrators. Ask an administrator
              if you need access, or return to your dashboard.
            </p>
            <button type="button" className="btn-ghost-dark small" onClick={() => navigateTo("dashboard")}>
              Back to dashboard
            </button>
          </div>
        )}

        {activeTab === "settings" && (
          <SettingsView
            user={user}
            refreshUser={refreshUser}
            logout={logout}
            showToast={showToast}
          />
        )}
      </WorkspaceShell>

      {/* MODAL: ADD / EDIT STANDALONE LEAD */}
      {isLeadModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsLeadModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingLead ? "Edit Inbound Lead" : "Ingest New Lead Prospect"}</h3>
              <button className="modal-close-btn" onClick={() => setIsLeadModalOpen(false)}>×</button>
            </div>
            {leadFormError && <div className="error-banner">{leadFormError}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              setLeadFormError("");
              if (editingLead) {
                updateLeadMutation.mutate({ id: editingLead.id, data: leadFormData });
              } else {
                createLeadMutation.mutate(leadFormData);
              }
            }}>
              <div className="form-group-circuit">
                <label>Prospect Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Rachel Adams"
                  value={leadFormData.name} 
                  onChange={e => setLeadFormData({ ...leadFormData, name: e.target.value })} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Work Email *</label>
                  <input 
                    type="email" 
                    required
                    placeholder="rachel@prospect.com"
                    value={leadFormData.email} 
                    onChange={e => setLeadFormData({ ...leadFormData, email: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="+1 555-0192"
                    value={leadFormData.phone} 
                    onChange={e => setLeadFormData({ ...leadFormData, phone: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Company Organization</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Apex Global"
                    value={leadFormData.company_name} 
                    onChange={e => setLeadFormData({ ...leadFormData, company_name: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Job Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. VP of Operations"
                    value={leadFormData.title} 
                    onChange={e => setLeadFormData({ ...leadFormData, title: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Lead Source</label>
                  <select 
                    value={leadFormData.source} 
                    onChange={e => setLeadFormData({ ...leadFormData, source: e.target.value })}
                  >
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Conference">Conference</option>
                    <option value="Cold Outbound">Cold Outbound</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>
                <div className="form-group-circuit">
                  <label>Status</label>
                  <select 
                    value={leadFormData.status} 
                    onChange={e => setLeadFormData({ ...leadFormData, status: e.target.value })}
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Engaged">Engaged</option>
                    <option value="Qualified">Qualified</option>
                    <option value="Disqualified">Disqualified</option>
                  </select>
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Estimated Value ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={leadFormData.estimated_value} 
                  onChange={e => setLeadFormData({ ...leadFormData, estimated_value: parseFloat(e.target.value) || 0 })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Prospect Notes & Background</label>
                <textarea 
                  rows="3"
                  placeholder="Key context, pain points, budget signals..."
                  value={leadFormData.notes} 
                  onChange={e => setLeadFormData({ ...leadFormData, notes: e.target.value })} 
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsLeadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-yellow">
                  {editingLead ? "Save Changes" : "Ingest Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 1-CLICK TRANSACTIONAL LEAD CONVERSION */}
      {isLeadConvertModalOpen && convertingLead && (
        <div className="modal-overlay-circuit" onClick={() => setIsLeadConvertModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Qualify & Convert Lead into Deal</h3>
              <button className="modal-close-btn" onClick={() => setIsLeadConvertModalOpen(false)}>×</button>
            </div>
            <div style={{ backgroundColor: "#303018", border: "1px solid #4F5101", borderRadius: "8px", padding: "14px", marginBottom: "18px", fontSize: "13px", color: "#DFDFDF" }}>
              <div style={{ fontWeight: 700, color: "#F0FF60", marginBottom: "4px" }}>
                Transactional Customer Provisioning
              </div>
              Qualifying <strong>{convertingLead.name}</strong> will create a Contact profile, bind the Company organization <strong>{convertingLead.company_name || "(Direct)"}</strong>, and initialize a pipeline Deal in one atomic transaction.
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              convertLeadMutation.mutate({
                id: convertingLead.id,
                data: {
                  dealTitle: leadConvertTitle,
                  dealValue: parseFloat(leadConvertValue) || 10000,
                  pipelineStage: leadConvertStage
                }
              });
            }}>
              <div className="form-group-circuit">
                <label>Pipeline Deal Title *</label>
                <input 
                  type="text" 
                  required
                  value={leadConvertTitle} 
                  onChange={e => setLeadConvertTitle(e.target.value)} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Deal Value ($ USD) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={leadConvertValue} 
                    onChange={e => setLeadConvertValue(e.target.value)} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Pipeline Stage</label>
                  <select 
                    value={leadConvertStage} 
                    onChange={e => setLeadConvertStage(e.target.value)}
                  >
                    <option value="Qualified">Qualified</option>
                    <option value="Proposal">Proposal</option>
                    <option value="Negotiation">Negotiation</option>
                    <option value="Won">Won</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsLeadConvertModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-yellow">
                  Confirm Qualification & Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              convertContactToDealMutation.mutate({
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
            {taskFormError && <div className="error-banner">{taskFormError}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              setTaskFormError("");
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
                <label>Assign To Team Member</label>
                <select 
                  value={taskFormData.assignedToUserId || ""} 
                  onChange={e => setTaskFormData({ ...taskFormData, assignedToUserId: e.target.value })}
                >
                  <option value="">Assign to Me ({user?.name || "Self"})</option>
                  {teamUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role}{u.title ? ` · ${u.title}` : ""})</option>
                  ))}
                </select>
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
                  placeholder="Action items, prep work, meeting link..."
                  value={taskFormData.description} 
                  onChange={e => setTaskFormData({ ...taskFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsTaskModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Scheduling..." : "Create Task"}
                </button>
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
            {activityFormError && <div className="error-banner">{activityFormError}</div>}
            <form onSubmit={e => {
              e.preventDefault();
              setActivityFormError("");
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
                  placeholder="Discussion takeaways, objections, next steps..."
                  value={activityFormData.description} 
                  onChange={e => setActivityFormData({ ...activityFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsActivityModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow" disabled={createActivityMutation.isPending}>
                  {createActivityMutation.isPending ? "Saving..." : "Save Log"}
                </button>
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
            {emailFormError && <div className="error-banner">{emailFormError}</div>}
            
            <div style={{ padding: "8px 12px", background: "rgba(240, 255, 96, 0.08)", border: "1px solid var(--border-hairline)", borderRadius: "6px", fontSize: "12px", color: "var(--accent)", marginBottom: "14px" }}>
              SMTP Sender Relay: <strong>farmanullah1224@gmail.com</strong> (Live Gmail Service)
            </div>

            <form onSubmit={e => {
              e.preventDefault();
              setEmailFormError("");
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
                  placeholder="recipient@client.com"
                  value={emailFormData.recipientEmail} 
                  onChange={e => setEmailFormData({ ...emailFormData, recipientEmail: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Subject *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Following up on proposal discussion"
                  value={emailFormData.subject} 
                  onChange={e => setEmailFormData({ ...emailFormData, subject: e.target.value })} 
                />
              </div>

              <div className="form-group-circuit">
                <label>Email Body *</label>
                <textarea 
                  rows="6" 
                  required
                  placeholder="Write message content here..."
                  value={emailFormData.body} 
                  onChange={e => setEmailFormData({ ...emailFormData, body: e.target.value })} 
                />
              </div>

              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>
                ℹ Open-tracking telemetry pixel will automatically be appended to track client read receipts.
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsEmailModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow" disabled={sendEmailMutation.isPending}>
                  <Send size={15} />
                  <span>{sendEmailMutation.isPending ? "Sending via SMTP..." : "Send & Track Open"}</span>
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
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Upload size={18} color="#F0FF60" />
                <h3>Bulk Import Contacts via CSV</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsImportModalOpen(false)}>×</button>
            </div>
            {importFormError && <div className="error-banner">{importFormError}</div>}
            
            <p style={{ color: "var(--text-body)", fontSize: "13px", margin: "10px 0" }}>
              Choose a <code>.csv</code> file or paste comma-separated rows. Required columns: <code>Name, Email, Phone, Company, Stage, Value, LeadSource, Tags</code>.
            </p>

            <div className="form-group-circuit" style={{ marginBottom: "12px" }}>
              <label>Upload .CSV File</label>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCSVFileUpload}
                style={{ padding: "8px", background: "#1c1c1c", border: "1px dashed var(--border-hairline)", borderRadius: "8px", color: "#fff", width: "100%" }}
              />
            </div>

            <div className="form-group-circuit">
              <label>Or Paste CSV Content</label>
              <textarea 
                rows="6"
                placeholder="John Doe, john@example.com, +1234567890, Acme Corp, Qualified, 5000, Website, Inbound"
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                style={{ width: "100%", padding: "10px", background: "#1c1c1c", border: "1px solid var(--border-hairline)", borderRadius: "8px", color: "#fff", fontFamily: "var(--font-mono)", fontSize: "12px" }}
              />
              {csvText.trim() && (
                <div style={{ color: "var(--accent)", fontSize: "12px", marginTop: "4px" }}>
                  {csvText.trim().split(/\r?\n/).filter(l => l.trim()).length} line(s) detected in import buffer.
                </div>
              )}
            </div>

            <div className="modal-footer-btns">
              <button type="button" className="btn-ghost-dark" onClick={() => setIsImportModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary-yellow" onClick={handleProcessCSVImport}>
                <Upload size={15} />
                <span>Process Import</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8B: EXPORT CSV DIALOG */}
      {isExportModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsExportModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Download size={18} color="#F0FF60" />
                <h3>Export SCRM Data to CSV</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsExportModalOpen(false)}>×</button>
            </div>
            <p style={{ color: "var(--text-body)", fontSize: "13px", margin: "10px 0" }}>
              Export clean, RFC-4180 compliant CSV files with UTF-8 BOM encoding for seamless Microsoft Excel and spreadsheet software compatibility.
            </p>
            <div className="form-group-circuit" style={{ margin: "16px 0" }}>
              <label>Select Dataset to Export</label>
              <select value={exportScope} onChange={e => setExportScope(e.target.value)}>
                <option value="contacts">Contacts & Deals Pipeline ({contacts.length} records)</option>
                <option value="leads">Inbound Prospect Leads ({leads.length} records)</option>
                <option value="tasks">Assigned & Pending Tasks ({tasks.length} records)</option>
              </select>
            </div>
            <div className="modal-footer-btns">
              <button type="button" className="btn-ghost-dark" onClick={() => setIsExportModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary-yellow" onClick={() => handleExportCSV(exportScope)}>
                <Download size={15} />
                <span>Download CSV File</span>
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

      {/* Product Catalog Modal (Supply Pillar) */}
      {isProductModalOpen && (
        <div className="modal-overlay-circuit" onClick={() => setIsProductModalOpen(false)}>
          <div className="modal-box-circuit interactive-lift" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register Product / Service</h3>
              <button className="modal-close-btn" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              createProductMutation.mutate(productFormData);
            }}>
              <div className="form-group-circuit">
                <label>Item / Service Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Enterprise SLA Consulting"
                  value={productFormData.name} 
                  onChange={e => setProductFormData({ ...productFormData, name: e.target.value })} 
                />
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>SKU / Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SVC-001"
                    value={productFormData.sku} 
                    onChange={e => setProductFormData({ ...productFormData, sku: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Category</label>
                  <select 
                    value={productFormData.category} 
                    onChange={e => setProductFormData({ ...productFormData, category: e.target.value })}
                  >
                    <option value="Services">Services</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Software License">Software License</option>
                    <option value="Subscription">Subscription</option>
                  </select>
                </div>
              </div>

              <div className="form-row-2col">
                <div className="form-group-circuit">
                  <label>Unit Price ($) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    step="0.01"
                    value={productFormData.price} 
                    onChange={e => setProductFormData({ ...productFormData, price: e.target.value })} 
                  />
                </div>
                <div className="form-group-circuit">
                  <label>Pricing Unit</label>
                  <input 
                    type="text" 
                    placeholder="e.g. hour, month, seat"
                    value={productFormData.unit} 
                    onChange={e => setProductFormData({ ...productFormData, unit: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group-circuit">
                <label>Description</label>
                <textarea 
                  rows="3" 
                  placeholder="Service description or line-item notes..."
                  value={productFormData.description} 
                  onChange={e => setProductFormData({ ...productFormData, description: e.target.value })} 
                />
              </div>

              <div className="modal-footer-btns">
                <button type="button" className="btn-ghost-dark" onClick={() => setIsProductModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary-yellow">Register Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating In-App Toast Notification */}
      {toastMessage && (
        <div className="scrm-toast-container">
          <div className="scrm-toast-bubble">
            <CheckCircle2 size={16} color="#F0FF60" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
