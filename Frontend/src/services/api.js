import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

// Request interceptor to attach JWT token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("crm_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401/403
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // If unauthorized, clear storage if expired
      if (localStorage.getItem("crm_token") && !window.location.pathname.includes("/login")) {
        localStorage.removeItem("crm_token");
        localStorage.removeItem("crm_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Contacts API
export const getContacts = async ({ search = "", status = "All" } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (status && status !== "All") params.status = status;
  const res = await API.get("/contacts", { params });
  return res.data;
};

export const getContactById = async (id) => {
  const res = await API.get(`/contacts/${id}`);
  return res.data;
};

export const createContact = async (data) => {
  const res = await API.post("/contacts", data);
  return res.data;
};

export const updateContact = async ({ id, data }) => {
  const res = await API.put(`/contacts/${id}`, data);
  return res.data;
};

export const deleteContact = async (id) => {
  const res = await API.delete(`/contacts/${id}`);
  return res.data;
};

// Auth API
export const loginUser = async (credentials) => {
  const res = await API.post("/auth/login", credentials);
  return res.data;
};

export const signupUser = async (userData) => {
  const res = await API.post("/auth/signup", userData);
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await API.get("/auth/me");
  return res.data;
};

export default API;

