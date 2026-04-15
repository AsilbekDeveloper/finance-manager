import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCompanies = useCallback(async (userId) => {
    if (!userId) return [];
    try {
      console.log("[AuthContext] loadCompanies chaqirildi...");
      const r = await api.getMyCompanies();
      const rawData = r.data || r || [];
      
      const list = Array.isArray(rawData) ? rawData.map((m) => {
        if (m.companies) return { ...m.companies, role: m.role };
        return m.id ? m : null;
      }).filter(Boolean) : [];

      setCompanies(list);

      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      
      if (found) {
        setCompany(found);
        localStorage.setItem("active_company_id", found.id);
      }
      return list;
    } catch (err) {
      console.error("[AuthContext] loadCompanies failed:", err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    // Sessiyani bir marta tekshirish
    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      setUser(u);
      if (u) await loadCompanies(u.id);
      setLoading(false);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth hodisasi:", event);
      const u = session?.user || null;
      setUser(u);

      if (u && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        await loadCompanies(u.id);
      } else if (event === "SIGNED_OUT") {
        setCompanies([]);
        setCompany(null);
        localStorage.removeItem("active_company_id");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCompanies]);

  // ... switchCompany va signOut o'zgarishsiz qoladi

  const switchCompany = useCallback((c) => {
    console.log("[AuthContext] Kompaniya almashtirildi:", c.name);
    setCompany(c);
    localStorage.setItem("active_company_id", c.id);
  }, []);

  const signOut = useCallback(async () => {
    console.log("[AuthContext] SignOut bajarilmoqda...");
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