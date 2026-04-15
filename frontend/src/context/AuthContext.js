import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Kompaniyalarni yuklash funksiyasi
  const loadCompanies = useCallback(async (uId) => {
    if (!uId) {
      setLoading(false);
      return;
    }
    try {
      console.log("[AuthContext] Kompaniyalar yuklanmoqda...");
      const r = await api.getMyCompanies();
      const rawData = r?.data || r || [];
      
      const list = Array.isArray(rawData) ? rawData.map((m) => {
        if (m?.companies) return { ...m.companies, role: m.role };
        return m?.id ? m : null;
      }).filter(Boolean) : [];

      setCompanies(list);

      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      
      if (found) {
        setCompany(found);
        localStorage.setItem("active_company_id", found.id);
      }
    } catch (e) {
      console.error("[AuthContext] Yuklashda xato:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Kompaniyani almashtirish
  const switchCompany = useCallback((c) => {
    console.log("[AuthContext] Kompaniya almashtirildi:", c.name);
    setCompany(c);
    localStorage.setItem("active_company_id", c.id);
  }, []);

  // 3. Tizimdan chiqish
  const signOut = useCallback(async () => {
    console.log("[AuthContext] SignOut bajarilmoqda...");
    await supabase.auth.signOut();
    setUser(null);
    setCompany(null);
    setCompanies([]);
    localStorage.removeItem("active_company_id");
    window.location.href = "/login";
  }, []);

  // 4. Auth holatini kuzatish
  useEffect(() => {
    // Dastlabki sessiyani olish
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      if (u) loadCompanies(u.id);
      else setLoading(false);
    });

    // O'zgarishlarni eshitish
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[AuthContext] Event:", event);
      const u = session?.user || null;
      setUser(u);

      if (u && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        loadCompanies(u.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCompanies([]);
        setCompany(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadCompanies]);

  // Render mantiqi
  return (
    <AuthContext.Provider value={{ 
      user, company, companies, loading, 
      loadCompanies, switchCompany, signOut 
    }}>
      {loading ? (
        <div style={{ 
          height: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          background: "var(--bg)"
        }}>
          <div className="spinner">Yuklanmoqda...</div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}