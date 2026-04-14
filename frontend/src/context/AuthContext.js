import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [company, setCompany]     = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);  // true until first auth check done

  // Load companies — returns the list so callers can use it immediately
  const loadCompanies = useCallback(async () => {
    try {
      const r = await api.getMyCompanies();
      const list = (r.data || []).map((m) => ({
        ...m.companies,
        role: m.role,
      })).filter(Boolean);  // remove nulls if join fails

      setCompanies(list);

      // Restore last active company
      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      setCompany(found);
      if (found) localStorage.setItem("active_company_id", found.id);

      return list;  // return so CreateCompany can use it
    } catch (err) {
      console.error("[AuthContext] loadCompanies failed:", err);
      return [];
    }
  }, []);

  // Initial auth check
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data?.session?.user || null;
      setUser(u);
      if (u) {
        loadCompanies().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        loadCompanies();
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
      loadCompanies, switchCompany, signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}
