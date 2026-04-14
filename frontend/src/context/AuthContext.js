import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCompanies = async () => {
    try {
      const data = await api.getMyCompanies();
      const list = (data.data || []).map((m) => ({
        ...m.companies,
        role: m.role,
      }));

      setCompanies(list);

      // Restore active company from localStorage
      const savedId = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === savedId) || list[0] || null;

      if (found) {
        setActiveCompany(found);
        localStorage.setItem("active_company_id", found.id);
      }
    } catch (err) {
      console.error("loadCompanies error:", err);
      setCompanies([]);
      setActiveCompany(null);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data?.session?.user || null;
      setUser(currentUser);
      if (currentUser) loadCompanies();
      setLoading(false);
    });

    // Auth state listener
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        loadCompanies();
      } else {
        setCompanies([]);
        setActiveCompany(null);
        localStorage.removeItem("active_company_id");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const switchCompany = (company) => {
    setActiveCompany(company);
    localStorage.setItem("active_company_id", company.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveCompany(null);
    setCompanies([]);
    localStorage.removeItem("active_company_id");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeCompany,
        companies,
        loading,
        loadCompanies,
        switchCompany,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}