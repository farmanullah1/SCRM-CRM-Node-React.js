import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
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
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (localStorage.getItem("crm_token") && !window.location.pathname.includes("/login")) {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const loginUser = async (credentials) => (await API.post("/auth/login", credentials)).data;
export const signupUser = async (userData) => (await API.post("/auth/signup", userData)).data;
export const getCurrentUser = async () => (await API.get("/auth/me")).data;

// Contacts & Leads API
export const getContacts = async (params = {}) => (await API.get("/contacts", { params })).data;
export const getContactById = async (id) => (await API.get(`/contacts/${id}`)).data;
export const createContact = async (data) => (await API.post("/contacts", data)).data;
export const updateContact = async ({ id, data }) => (await API.put(`/contacts/${id}`, data)).data;
export const deleteContact = async (id) => (await API.delete(`/contacts/${id}`)).data;
export const bulkImportContacts = async (contacts) => (await API.post("/contacts/bulk", { contacts })).data;
export const mergeContacts = async ({ primaryId, duplicateId }) => (await API.post("/contacts/merge", { primaryId, duplicateId })).data;

// Tasks & Reminders API
export const getTasks = async (params = {}) => (await API.get("/tasks", { params })).data;
export const createTask = async (data) => (await API.post("/tasks", data)).data;
export const updateTask = async ({ id, data }) => (await API.put(`/tasks/${id}`, data)).data;
export const deleteTask = async (id) => (await API.delete(`/tasks/${id}`)).data;

// Activities & Interaction Logs
export const getActivities = async (params = {}) => (await API.get("/activities", { params })).data;
export const createActivity = async (data) => (await API.post("/activities", data)).data;

// Invoices & Quotes
export const getInvoices = async (params = {}) => (await API.get("/invoices", { params })).data;
export const createInvoice = async (data) => (await API.post("/invoices", data)).data;
export const updateInvoice = async ({ id, data }) => (await API.put(`/invoices/${id}`, data)).data;
export const deleteInvoice = async (id) => (await API.delete(`/invoices/${id}`)).data;

// Support Tickets
export const getTickets = async (params = {}) => (await API.get("/tickets", { params })).data;
export const createTicket = async (data) => (await API.post("/tickets", data)).data;
export const updateTicket = async ({ id, data }) => (await API.put(`/tickets/${id}`, data)).data;
export const deleteTicket = async (id) => (await API.delete(`/tickets/${id}`)).data;

// Email Communications
export const getEmailTemplates = async () => (await API.get("/emails/templates")).data;
export const getEmailLogs = async () => (await API.get("/emails")).data;
export const sendEmail = async (data) => (await API.post("/emails/send", data)).data;

export default API;
