const BASE = process.env.REACT_APP_API_URL || "";

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Transactions
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/transactions${q ? "?" + q : ""}`);
  },
  createTransaction: (data) =>
    req("/api/transactions", { method: "POST", body: JSON.stringify(data) }),
  updateTransaction: (id, data) =>
    req(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteTransaction: (id) =>
    req(`/api/transactions/${id}`, { method: "DELETE" }),

  // Categories
  getCategories: (type) =>
    req(`/api/categories${type ? "?type=" + type : ""}`),
  createCategory: (data) =>
    req("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  deleteCategory: (id) =>
    req(`/api/categories/${id}`, { method: "DELETE" }),

  // Stats
  getOverview: (period = "month") =>
    req(`/api/stats/overview?period=${period}`),
  getAnalytics: (year) =>
    req(`/api/stats/analytics${year ? "?year=" + year : ""}`),

  // Budgets
  getBudgets: () => req("/api/budgets"),
  createBudget: (data) =>
    req("/api/budgets", { method: "POST", body: JSON.stringify(data) }),
  deleteBudget: (id) =>
    req(`/api/budgets/${id}`, { method: "DELETE" }),
};

export function formatCurrency(amount) {
  return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

export function pctChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
