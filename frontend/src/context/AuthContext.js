import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const initialLoadDone = useRef(false);

  const loadCompanies = useCallback(async () => {
    try {
      console.log("[AuthContext] loadCompanies chaqirildi...");
      const r = await api.getMyCompanies();
      
      console.log("[AuthContext] Backenddan kelgan data:", r);

      // Backend formatiga moslashuvchan mapping (r.data yoki r o'zi)
      const rawData = r.data || r || [];
      const list = Array.isArray(rawData) ? rawData.map((m) => {
        // Agar join formatida bo'lsa (m.companies), aks holda obyektning o'zi
        if (m.companies) return { ...m.companies, role: m.role };
        return m.id ? m : null;
      }).filter(Boolean) : [];

      console.log("[AuthContext] Saralangan kompaniyalar ro'yxati:", list);
      setCompanies(list);

      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      
      setCompany(found);
      if (found) {
        localStorage.setItem("active_company_id", found.id);
        console.log("[AuthContext] Aktiv kompaniya o'rnatildi:", found.name);
      }

      return list;
    } catch (err) {
      console.error("[AuthContext] loadCompanies failed:", err.message);
      return [];
    }
  }, []);

  useEffect(() => {
    // 1. Mount bo'lganda sessiyani tekshirish
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data?.session?.user || null;
      console.log("[AuthContext] Dastlabki sessiya:", u ? u.email : "Yo'q");
      setUser(u);
      
      if (u) {
        await loadCompanies();
      }
      
      initialLoadDone.current = true;
      setLoading(false);
    });

    // 2. Auth o'zgarishlarini kuzatish
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth hodisasi:", event);
      
      if (!initialLoadDone.current) return;

      const u = session?.user || null;
      setUser(u);
      
      if (u) {
        await loadCompanies();
      } else {
        console.log("[AuthContext] Logout holati, ma'lumotlar tozalanmoqda");
        setCompanies([]);
        setCompany(null);
        localStorage.removeItem("active_company_id");
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadCompanies]);

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