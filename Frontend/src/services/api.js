import axios from "axios";

// Production uses the same origin: Vercel routes /api to the Express service.
// Local development keeps talking to the standalone backend on port 5000.
const configuredApiUrl = (import.meta.env.VITE_API_URL || "").trim();
export const API_BASE_URL = (
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api")
).replace(/\/$/, "");
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

export const assetUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return value;
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("crm_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem("crm_refresh_token");
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          if (res.data.token) {
            localStorage.setItem("crm_token", res.data.token);
            if (res.data.refreshToken) {
              localStorage.setItem("crm_refresh_token", res.data.refreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${res.data.token}`;
            return API(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem("crm_token");
          localStorage.removeItem("crm_refresh_token");
          localStorage.removeItem("crm_user");
          if (!window.location.pathname.includes("/login")) {
            window.location.href = "/login";
          }
        }
      } else {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth & Users
export const loginUser = async (credentials) => (await API.post("/auth/login", credentials)).data;
export const verify2FALogin = async (data) => (await API.post("/auth/2fa/verify", data)).data;
export const verify2FARecovery = async (data) => (await API.post("/auth/2fa/recovery", data)).data;
export const get2FAStatus = async () => (await API.get("/auth/2fa/status")).data;
export const setup2FA = async (data) => (await API.post("/auth/2fa/setup", data)).data;
export const enable2FA = async (data) => (await API.post("/auth/2fa/enable", data)).data;
export const disable2FA = async (data) => (await API.post("/auth/2fa/disable", data)).data;
export const regenerateRecoveryCodes = async (data) => (await API.post("/auth/2fa/recovery-codes", data)).data;
export const loginWithGoogle = async (data) => (await API.post("/auth/google", data)).data;
export const linkGoogleAccount = async (data) => (await API.post("/auth/google/link", data)).data;
export const unlinkGoogleAccount = async (data) => (await API.post("/auth/google/unlink", data)).data;
export const toggle2FA = async () => (await API.post("/auth/2fa/toggle")).data;
export const forgotPassword = async (data) => (await API.post("/auth/forgot-password", data)).data;
export const resetPassword = async (data) => (await API.post("/auth/reset-password", data)).data;
export const updateProfile = async (data) => (await API.put("/auth/profile", data)).data;
export const signupUser = async (userData) => (await API.post("/auth/signup", userData)).data;
export const getCurrentUser = async () => (await API.get("/auth/me")).data;
export const getUsers = async () => (await API.get("/auth/users")).data;
export const getRoles = async () => (await API.get("/auth/roles")).data;
export const logoutUser = async () => (await API.post("/auth/logout")).data;
export const uploadProfileAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return (await API.post("/auth/profile/avatar", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
export const removeProfileAvatar = async () => (await API.delete("/auth/profile/avatar")).data;
export const uploadProfileCover = async (file) => {
  const formData = new FormData();
  formData.append("cover", file);
  return (await API.post("/auth/profile/cover", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
export const removeProfileCover = async () => (await API.delete("/auth/profile/cover")).data;
export const getMediaStatus = async () => (await API.get("/media/status")).data;
export const getImageKitAuth = async (kind) => (await API.post("/media/imagekit/auth", { kind })).data;
export const saveExternalProfileImage = async (kind, data) =>
  (await API.post(`/media/profile/${kind}`, data)).data;

/** Upload directly to ImageKit, then attach the returned URL to the signed-in profile. */
export const uploadImageKitProfileImage = async (kind, file) => {
  const auth = await getImageKitAuth(kind);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name.replace(/[^\w.-]/g, "_") || "profile-image");
  formData.append("publicKey", auth.publicKey);
  formData.append("signature", auth.signature);
  formData.append("expire", String(auth.expire));
  formData.append("token", auth.token);
  formData.append("folder", auth.folder);
  formData.append("useUniqueFileName", "true");

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "ImageKit rejected the upload.");
  }

  return saveExternalProfileImage(kind, { url: result.url, fileId: result.fileId });
};
export const getSmtpStatus = async () => (await API.get("/auth/smtp/status")).data;
export const sendSmtpTest = async (recipient) => (await API.post("/auth/smtp/test", { recipient })).data;

// Global search, saved views and in-app notifications
export const globalSearch = async (q) => (await API.get("/search", { params: { q } })).data;
export const getSavedViews = async (entity) => (await API.get("/views", { params: entity ? { entity } : {} })).data;
export const createSavedView = async (data) => (await API.post("/views", data)).data;
export const deleteSavedView = async (id) => (await API.delete(`/views/${id}`)).data;
export const getNotifications = async () => (await API.get("/notifications")).data;
export const markNotificationRead = async (id) => (await API.post(`/notifications/${id}/read`)).data;
export const markAllNotificationsRead = async () => (await API.post("/notifications/read-all")).data;

// Users, roles and permission administration
export const getAccessCatalog = async () => (await API.get("/access/catalog")).data;
export const getAccessUsers = async () => (await API.get("/access/users")).data;
export const getAccessRoles = async () => (await API.get("/access/roles")).data;
export const updateUserAccess = async ({ id, data }) => (await API.patch(`/access/users/${id}`, data)).data;
export const revokeUserSessions = async (id) => (await API.post(`/access/users/${id}/revoke-sessions`)).data;
export const createAccessRole = async (data) => (await API.post("/access/roles", data)).data;
export const updateAccessRole = async ({ id, data }) => (await API.put(`/access/roles/${id}`, data)).data;
export const cloneAccessRole = async ({ id, data }) => (await API.post(`/access/roles/${id}/clone`, data)).data;
export const deleteAccessRole = async (id) => (await API.delete(`/access/roles/${id}`)).data;
export const getAccessAudit = async (params = {}) => (await API.get("/access/audit", { params })).data;
function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const exportAuditLog = async () => {
  const response = await API.get("/access/audit/export", { responseType: "blob" });
  saveBlob(response.data, `scrm-audit-${new Date().toISOString().slice(0, 10)}.csv`);
};

export const downloadBackup = async () => {
  const response = await API.get("/backup/download", { responseType: "blob" });
  saveBlob(response.data, `scrm-backup-${new Date().toISOString().slice(0, 10)}.json`);
};

export const downloadAttachment = async (id, fallbackName = "attachment") => {
  const response = await API.get(`/attachments/${id}/download`, { responseType: "blob" });
  const disposition = response.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, "")) : fallbackName;
  saveBlob(response.data, filename);
};

// Companies
export const getCompanies = async (params = {}) => (await API.get("/companies", { params })).data;
export const getCompanyById = async (id) => (await API.get(`/companies/${id}`)).data;
export const createCompany = async (data) => (await API.post("/companies", data)).data;
export const updateCompany = async ({ id, data }) => (await API.put(`/companies/${id}`, data)).data;
export const deleteCompany = async (id) => (await API.delete(`/companies/${id}`)).data;

// Standalone Leads (Unqualified Ingestion & Qualification)
export const getLeads = async (params = {}) => (await API.get("/leads", { params })).data;
export const getLeadById = async (id) => (await API.get(`/leads/${id}`)).data;
export const createLead = async (data) => (await API.post("/leads", data)).data;
export const updateLead = async ({ id, data }) => (await API.put(`/leads/${id}`, data)).data;
export const deleteLead = async (id) => (await API.delete(`/leads/${id}`)).data;
export const convertLead = async ({ id, data }) => (await API.post(`/leads/${id}/convert`, data || {})).data;

// Contacts & Relationships
export const getContacts = async (params = {}) => (await API.get("/contacts", { params })).data;
export const getContactById = async (id) => (await API.get(`/contacts/${id}`)).data;
export const createContact = async (data) => (await API.post("/contacts", data)).data;
export const updateContact = async ({ id, data }) => (await API.put(`/contacts/${id}`, data)).data;
export const deleteContact = async (id) => (await API.delete(`/contacts/${id}`)).data;
export const bulkImportContacts = async (contacts) => (await API.post("/contacts/bulk", { contacts })).data;
export const mergeContacts = async ({ primaryId, duplicateId }) => (await API.post("/contacts/merge", { primaryId, duplicateId })).data;
export const getContactDuplicates = async () => (await API.get("/contacts/duplicates")).data;
export const convertLeadToDeal = async ({ id, data }) => (await API.post(`/contacts/${id}/convert`, data || {})).data;
export const getContactActivities = async (id) => (await API.get(`/contacts/${id}/activities`)).data;

export const getAuthUsers = async () => (await API.get("/auth/users")).data;

// Deals & Pipeline
export const getPipelineStages = async () => (await API.get("/deals/stages")).data;
export const getDeals = async (params = {}) => (await API.get("/deals", { params })).data;
export const getDealMetrics = async () => (await API.get("/deals/metrics")).data;
export const getDealForecast = async (months = 6) => (await API.get("/deals/forecast", { params: { months } })).data;
export const createDeal = async (data) => (await API.post("/deals", data)).data;
export const updateDeal = async ({ id, data }) => (await API.put(`/deals/${id}`, data)).data;
export const deleteDeal = async (id) => (await API.delete(`/deals/${id}`)).data;

// Tasks & Reminders
export const getTasks = async (params = {}) => (await API.get("/tasks", { params })).data;
export const createTask = async (data) => (await API.post("/tasks", data)).data;
export const updateTask = async ({ id, data }) => (await API.put(`/tasks/${id}`, data)).data;
export const deleteTask = async (id) => (await API.delete(`/tasks/${id}`)).data;

// Activities & Audit Logs
export const getActivities = async (params = {}) => (await API.get("/activities", { params })).data;
export const createActivity = async (data) => (await API.post("/activities", data)).data;

// Invoices & Quotes
export const getInvoices = async (params = {}) => (await API.get("/invoices", { params })).data;
export const createInvoice = async (data) => (await API.post("/invoices", data)).data;
export const updateInvoice = async ({ id, data }) => (await API.put(`/invoices/${id}`, data)).data;
export const deleteInvoice = async (id) => (await API.delete(`/invoices/${id}`)).data;
export const recordInvoicePayment = async ({ id, data }) => (await API.post(`/invoices/${id}/payments`, data)).data;
export const getInvoicePayments = async (id) => (await API.get(`/invoices/${id}/payments`)).data;
export const downloadInvoicePdf = async (invoice) => {
  const response = await API.get(`/invoices/${invoice.id}/pdf`, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.invoiceNumber || "document"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Support Tickets
export const getTickets = async (params = {}) => (await API.get("/tickets", { params })).data;
export const createTicket = async (data) => (await API.post("/tickets", data)).data;
export const updateTicket = async ({ id, data }) => (await API.put(`/tickets/${id}`, data)).data;
export const deleteTicket = async (id) => (await API.delete(`/tickets/${id}`)).data;

// Email Communications & Templates
export const getEmailTemplates = async () => (await API.get("/emails/templates")).data;
export const getEmailLogs = async () => (await API.get("/emails")).data;
export const getEmailThreads = async () => (await API.get("/emails/threads")).data;
export const sendEmail = async (data) => (await API.post("/emails/send", data)).data;

// WhatsApp integration
export const getWhatsAppStatus = async () => (await API.get("/whatsapp/status")).data;
export const getWhatsAppQr = async () => (await API.get("/whatsapp/qr")).data;
export const restartWhatsApp = async () => (await API.post("/whatsapp/session/restart")).data;
export const logoutWhatsApp = async () => (await API.post("/whatsapp/session/logout")).data;
export const checkWhatsAppNumber = async (number) => (await API.get(`/whatsapp/check/${encodeURIComponent(number)}`)).data;
export const getWhatsAppMessages = async (params = {}) => (await API.get("/whatsapp/messages", { params })).data;
export const sendWhatsAppMessage = async (data) => (await API.post("/whatsapp/send", data)).data;
export const sendWhatsAppMedia = async (data) => (await API.post("/whatsapp/send-media", data)).data;

// Enterprise Backup & Recovery
export const createDatabaseSnapshot = async () => (await API.post("/backup/snapshot")).data;
export const getBackupHistory = async () => (await API.get("/backup/history")).data;

// File Attachments
export const getAttachments = async (entityType, entityId) => (await API.get(`/attachments/${entityType}/${entityId}`)).data;
export const uploadAttachment = async (formData) =>
  (await API.post("/attachments/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const deleteAttachment = async (id) => (await API.delete(`/attachments/${id}`)).data;

// Scalability Integrations: Automations, Calendar, Webhooks
export const getAutomations = async () => (await API.get("/integrations/automations")).data;
export const testAutomationRule = async (data) => (await API.post("/integrations/automations/test", data)).data;
export const getCalendarSync = async () => (await API.get("/integrations/calendar/sync")).data;
export const triggerCalendarSync = async (data) => (await API.post("/integrations/calendar/sync", data)).data;

// Supply Pillar: Products & Suppliers Catalog
export const getProducts = async () => (await API.get("/catalog/products")).data;
export const createProduct = async (data) => (await API.post("/catalog/products", data)).data;
export const updateProduct = async ({ id, data }) => (await API.put(`/catalog/products/${id}`, data)).data;
export const deleteProduct = async (id) => (await API.delete(`/catalog/products/${id}`)).data;
export const archiveProduct = async (id) => (await API.put(`/catalog/products/${id}`, { is_active: false })).data;
export const activateProduct = async (id) => (await API.put(`/catalog/products/${id}`, { is_active: true })).data;
export const getSuppliers = async () => (await API.get("/catalog/suppliers")).data;
export const createSupplier = async (data) => (await API.post("/catalog/suppliers", data)).data;

// Site Pillar: Web-to-Lead
export const submitWebLead = async (data) => (await API.post("/site/web-lead", data)).data;
export const getWebLeads = async () => (await API.get("/site/web-leads")).data;

export default API;
