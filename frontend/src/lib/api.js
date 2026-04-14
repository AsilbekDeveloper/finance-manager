// import { createClient } from "@supabase/supabase-js";

// export const supabase = createClient(
//   process.env.REACT_APP_SUPABASE_URL,
//   process.env.REACT_APP_SUPABASE_ANON_KEY
// );

const BASE = process.env.REACT_APP_API_URL || "";

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function req(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}

// Append company_id to query string
function withCompany(path, companyId, extra = {}) {
  const params = new URLSearchParams({ company_id: companyId, ...extra });
  return `${path}?${params}`;
}

export const api = {
  // ── Companies ───────────────────────────────────────────────────────────
  createCompany: (name) =>
    req("/api/companies", { method: "POST", body: JSON.stringify({ name }) }),

  getMyCompanies: () => req("/api/companies/me"),

  getMembers: (companyId) => req(`/api/companies/${companyId}/members`),

  inviteMember: (companyId, email, full_name) =>
    req(`/api/companies/${companyId}/members/invite`, {
      method: "POST",
      body: JSON.stringify({ email, full_name }),
    }),

  removeMember: (companyId, memberId) =>
    req(`/api/companies/${companyId}/members/${memberId}`, { method: "DELETE" }),

  generateTelegramLink: (companyId) =>
    req(`/api/companies/${companyId}/telegram-link`, { method: "POST" }),

  // ── Transactions ────────────────────────────────────────────────────────
  getTransactions: (companyId, params = {}) =>
    req(withCompany("/api/transactions", companyId, params)),

  createTransaction: (data) =>
    req("/api/transactions", { method: "POST", body: JSON.stringify(data) }),

  updateTransaction: (id, data) =>
    req(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteTransaction: (id) =>
    req(`/api/transactions/${id}`, { method: "DELETE" }),

  // ── Categories ──────────────────────────────────────────────────────────
  getCategories: (companyId, type) =>
    req(withCompany("/api/categories", companyId, type ? { type } : {})),

  createCategory: (data) =>
    req("/api/categories", { method: "POST", body: JSON.stringify(data) }),

  deleteCategory: (id) =>
    req(`/api/categories/${id}`, { method: "DELETE" }),

  // ── Stats ────────────────────────────────────────────────────────────────
  getOverview: (companyId, period = "month") =>
    req(withCompany("/api/stats/overview", companyId, { period })),

  getAnalytics: (companyId, year) =>
    req(withCompany("/api/stats/analytics", companyId, year ? { year } : {})),

  // ── Budgets ──────────────────────────────────────────────────────────────
  getBudgets: (companyId) => req(withCompany("/api/budgets", companyId)),

  createBudget: (data) =>
    req("/api/budgets", { method: "POST", body: JSON.stringify(data) }),

  deleteBudget: (id) => req(`/api/budgets/${id}`, { method: "DELETE" }),
};

// ── Formatting helpers ──────────────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "0 so'm";
  const num = parseFloat(amount);
  // Format with spaces as thousand separators: 1 500 000 so'm
  return num.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " so'm";
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("uz-UZ", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}
