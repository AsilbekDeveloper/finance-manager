import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  // loading = true means: "we don't know yet — don't render routes"
  const [loading, setLoading] = useState(true);

  // Prevent onAuthStateChange from re-running loadCompanies
  // right after we already did it in getSession
  const initialLoadDone = useRef(false);

  const loadCompanies = useCallback(async () => {
    try {
      const r = await api.getMyCompanies();
      const list = (r.data || [])
        .map((m) => m.companies ? { ...m.companies, role: m.role } : null)
        .filter(Boolean);

      setCompanies(list);

      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      setCompany(found);
      if (found) localStorage.setItem("active_company_id", found.id);

      return list;
    } catch (err) {
      console.error("[AuthContext] loadCompanies failed:", err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    // 1. Check existing session on mount
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data?.session?.user || null;
      setUser(u);
      if (u) {
        await loadCompanies();
      }
      initialLoadDone.current = true;
      setLoading(false);  // ← only set false AFTER loadCompanies finishes
    });

    // 2. Listen for future auth changes (login / logout / token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // Skip the first event — getSession already handled it
      if (!initialLoadDone.current) return;

      const u = session?.user || null;
      setUser(u);
      if (u) {
        await loadCompanies();
      } else {
        setCompanies([]);
        setCompany(null);
        localStorage.removeItem("active_company_id");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCompanies]);

  const switchCompany = useCallback((c) => {
    setCompany(c);
    localStorage.setItem("active_company_id", c.id);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCompany(null);
    setCompanies([]);
    localStorage.removeItem("active_company_id");
  }, []);

  return (
    <AuthContext.Provider value={{
      user, company, companies, loading,
      loadCompanies, switchCompany, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
