import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [company, setCompany]     = useState(null); // active company
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);

  // Load companies for logged-in user
  const loadCompanies = async () => {
    try {
      const r = await api.getMyCompanies();
      const list = (r.data || []).map((m) => ({
        ...m.companies,
        role: m.role,
      }));
      setCompanies(list);
      // Restore last active company from localStorage
      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      setCompany(found);
    } catch (_) {}
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      if (data?.session?.user) loadCompanies();
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadCompanies();
      else { setCompanies([]); setCompany(null); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const switchCompany = (c) => {
    setCompany(c);
    localStorage.setItem("active_company_id", c.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setCompany(null); setCompanies([]);
  };

  return (
    <AuthContext.Provider value={{ user, company, companies, loading, loadCompanies, switchCompany, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
