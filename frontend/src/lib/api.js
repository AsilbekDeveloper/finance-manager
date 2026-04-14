import { supabase } from "./supabase";

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

async function getToken() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("Session error:", error);
      return "";
    }
    return data?.session?.access_token || "";
  } catch (err) {
    console.error("getToken failed:", err);
    return "";
  }
}

async function req(path, options = {}) {
  const token = await getToken();

  const res = await fetch(`${BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: options.body || undefined,
    ...options,
  });

  if (!res.ok) {
    let errMsg = `API error ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.message || err.detail || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return res.json();
}

export const api = {
  // Companies
  createCompany: (name) =>
    req("/api/companies", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  getMyCompanies: () => req("/api/companies/me"),

  getMembers: (companyId) =>
    req(`/api/companies/${companyId}/members`),

  inviteMember: (companyId, email, full_name = null) =>
    req(`/api/companies/${companyId}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email, full_name }),
    }),

  removeMember: (companyId, memberId) =>
    req(`/api/companies/${companyId}/members/${memberId}`, { method: "DELETE" }),

  generateTelegramLink: (companyId) =>
    req(`/api/companies/${companyId}/telegram-link`, { method: "POST" }),

  // Transactions
  getTransactions: (companyId, params = {}) => {
    const query = new URLSearchParams({ company_id: companyId, ...params }).toString();
    return req(`/api/transactions?${query}`);
  },

  createTransaction: (data) =>
    req("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateTransaction: (id, data) =>
    req(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteTransaction: (id) =>
    req(`/api/transactions/${id}`, { method: "DELETE" }),

  // Categories
  getCategories: (companyId, type = null) => {
    const params = { company_id: companyId };
    if (type) params.type = type;
    const query = new URLSearchParams(params).toString();
    return req(`/api/categories?${query}`);
  },

  createCategory: (data) =>
    req("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteCategory: (id) =>
    req(`/api/categories/${id}`, { method: "DELETE" }),

  // Stats
  getOverview: (companyId, period = "month") => {
    const query = new URLSearchParams({ company_id: companyId, period }).toString();
    return req(`/api/stats/overview?${query}`);
  },

  getAnalytics: (companyId, year = null) => {
    const params = { company_id: companyId };
    if (year) params.year = year;
    const query = new URLSearchParams(params).toString();
    return req(`/api/stats/analytics?${query}`);
  },

  // Budgets
  getBudgets: (companyId) => {
    const query = new URLSearchParams({ company_id: companyId }).toString();
    return req(`/api/budgets?${query}`);
  },

  createBudget: (data) =>
    req("/api/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteBudget: (id) =>
    req(`/api/budgets/${id}`, { method: "DELETE" }),
};

// Format helpers
export function formatCurrency(amount) {
  if (amount == null) return "0 so'm";
  const num = parseFloat(amount);
  return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " so'm";
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}