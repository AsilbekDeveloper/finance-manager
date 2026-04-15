import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// AuthContext.js (Full Replacement)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadCompanies = useCallback(async (uId) => {
    try {
      const r = await api.getMyCompanies();
      const list = (r?.data || r || []).map(m => m.companies ? {...m.companies, role: m.role} : m);
      setCompanies(list);
      const saved = localStorage.getItem("active_company_id");
      const found = list.find(c => c.id === saved) || list[0] || null;
      setCompany(found);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false); // <--- ENG MUHIM QATOR: Har doim loadingni to'xtatadi
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({data: {session}}) => {
      setUser(session?.user || null);
      if (session?.user) loadCompanies(session.user.id);
      else setLoading(false);
    });

    const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setUser(session.user);
        loadCompanies(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null); setCompanies([]); setCompany(null); setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadCompanies]);

  if (loading) return <div className="spinner">Yuklanmoqda...</div>;

  return (
    <AuthContext.Provider value={{ user, company, companies, loadCompanies }}>
      {children}
    </AuthContext.Provider>
  );
} 

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
