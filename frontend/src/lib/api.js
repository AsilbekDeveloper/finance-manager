import { createClient } from "@supabase/supabase-js";

// 1. Supabase Client sozlamasi
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log("[DEBUG] Supabase URL yuklangan:", !!supabaseUrl);
console.log("[DEBUG] Supabase Key yuklangan:", !!supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

const BASE = process.env.REACT_APP_API_URL || "";
console.log("[DEBUG] Backend URL (BASE):", BASE);

// 2. Tokenni olish funksiyasi
async function getToken() {
  console.log("[api] Token so'ralmoqda...");
  let { data, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[api] Session olishda xato:", sessionError.message);
  }

  if (!data?.session?.access_token) {
    console.warn("[api] Session topilmadi, refresh qilib ko'rilmoqda...");
    const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error("[api] Refresh qilishda xato:", refreshError.message);
      return "";
    }
    data = refreshedData;
  }

  const token = data?.session?.access_token || "";
  if (!token) {
    console.warn("[api] No auth token available");
  } else {
    console.log("[api] Token muvaffaqiyatli olindi.");
  }
  return token;
}

// 3. Umumiy Request funksiyasi
async function req(path, options = {}) {
  const token = await getToken();
  
  if (!token) {
    throw new Error("Tizimga kiring (token topilmadi)");
  }

  const url = `${BASE}${path}`;
  console.log(`🚀 [API REQ] ${options.method || "GET"} ${url}`, options.body ? JSON.parse(options.body) : "");

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    ...options,
  });
  
  console.log(`📡 [API RES] Status: ${res.status}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.detail || `API error ${res.status}`;
    console.error(`❌ [api] ${options.method || "GET"} ${path} → ${res.status}:`, msg);
    throw new Error(msg);
  }
  
  const result = await res.json();
  console.log(`📦 [API DATA] ${path}:`, result);
  return result;
}

function withCompany(path, companyId, extra = {}) {
  const params = new URLSearchParams({ company_id: companyId, ...extra });
  return `${path}?${params}`;
}

export const api = {
  // Companies
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

  // Transactions
  getTransactions: (companyId, params = {}) =>
    req(withCompany("/api/transactions", companyId, params)),

  createTransaction: (data) =>
    req("/api/transactions", { method: "POST", body: JSON.stringify(data) }),

  updateTransaction: (id, data) =>
    req(`/api/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),

  deleteTransaction: (id) =>
    req(`/api/transactions/${id}`, { method: "DELETE" }),

  // Categories
  getCategories: (companyId, type) =>
    req(withCompany("/api/categories", companyId, type ? { type } : {})),

  createCategory: (data) =>
    req("/api/categories", { method: "POST", body: JSON.stringify(data) }),

  deleteCategory: (id) =>
    req(`/api/categories/${id}`, { method: "DELETE" }),

  // Stats
  getOverview: (companyId, period = "month") =>
    req(withCompany("/api/stats/overview", companyId, { period })),

  getAnalytics: (companyId, year) =>
    req(withCompany("/api/stats/analytics", companyId, year ? { year } : {})),

  // Budgets
  getBudgets: (companyId) => req(withCompany("/api/budgets", companyId)),

  createBudget: (data) =>
    req("/api/budgets", { method: "POST", body: JSON.stringify(data) }),

  deleteBudget: (id) => req(`/api/budgets/${id}`, { method: "DELETE" }),
};

// Formatting helpers
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return "0 so'm";
  const num = parseFloat(amount);
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