import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bir marta yuklashni nazorat qilish uchun flaglar
  const initialLoadDone = useRef(false);
  const isFetching = useRef(false);

  const loadCompanies = useCallback(async () => {
    // Agar hozir yuklanayotgan bo'lsa, qayta so'rov yubormaymiz
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      console.log("[AuthContext] loadCompanies chaqirildi...");
      const r = await api.getMyCompanies();
      
      console.log("[AuthContext] Backenddan kelgan xom data:", r);

      // --- LOGIKANI TOG'IRLASH: Data qayerda ekanligini aniqlash ---
      let rawData = [];
      if (Array.isArray(r)) {
        rawData = r;
      } else if (r && Array.isArray(r.data)) {
        rawData = r.data;
      } else if (r && typeof r === 'object') {
        // Agar bitta obyekt bo'lib kelsa (masalan r.name bor bo'lsa)
        rawData = r.id ? [r] : [];
      }

      const list = rawData.map((m) => {
        if (!m) return null;
        // Agar backend "join" qilib yuborsa: { role: 'admin', companies: { id: 1, name: '...' } }
        if (m.companies) {
          return { ...m.companies, role: m.role };
        }
        // Agar to'g'ridan-to'g'ri kompaniya obyekti bo'lsa
        return m.id ? m : null;
      }).filter(Boolean);

      console.log("[AuthContext] Yakuniy saralangan ro'yxat:", list);
      setCompanies(list);

      // Faol kompaniyani aniqlash
      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      
      setCompany(found);
      if (found) {
        localStorage.setItem("active_company_id", found.id);
        console.log("[AuthContext] Aktiv kompaniya:", found.name);
      } else {
        console.warn("[AuthContext] Hech qanday kompaniya topilmadi.");
      }

      return list;
    } catch (err) {
      console.error("[AuthContext] loadCompanies failed:", err.message);
      return [];
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Birinchi marta kirganda sessiyani tekshirish
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const u = session?.user || null;
        console.log("[AuthContext] Dastlabki sessiya:", u ? u.email : "Yo'q");
        setUser(u);
        
        if (u) {
          await loadCompanies();
        }
      } catch (e) {
        console.error("[AuthContext] Session error:", e);
      } finally {
        if (mounted) {
          initialLoadDone.current = true;
          setLoading(false);
        }
      }
    };

    checkInitialSession();

    // 2. Auth o'zgarishlarini kuzatish (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth hodisasi:", event);
      
      // Faqat kerakli hodisalarda reactsiyaga kirishamiz
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const u = session?.user || null;
        setUser(u);
        if (u) await loadCompanies();
      } 
      
      if (event === 'SIGNED_OUT') {
        console.log("[AuthContext] Logout holati");
        setUser(null);
        setCompanies([]);
        setCompany(null);
        localStorage.removeItem("active_company_id");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadCompanies]);

  const switchCompany = useCallback((c) => {
    if (!c) return;
    console.log("[AuthContext] Kompaniya almashtirildi:", c.name);
    setCompany(c);
    localStorage.setItem("active_company_id", c.id);
  }, []);

  const signOut = useCallback(async () => {
    try {
      console.log("[AuthContext] SignOut bajarilmoqda...");
      await supabase.auth.signOut();
      // onAuthStateChange SIGNED_OUT ni tutib oladi va ma'lumotlarni tozalaydi
    } catch (e) {
      console.error("Signout error:", e);
    }
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