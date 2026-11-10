import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json"
  }
});

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

export default API;

