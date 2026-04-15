import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase, api } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bir marta yuklashni va takroriy so'rovlarni nazorat qilish
  const initialLoadDone = useRef(false);
  const isFetching = useRef(false);

  const loadCompanies = useCallback(async () => {
    // Agar hozir yuklash jarayoni ketayotgan bo'lsa, ikkinchi so'rovni bloklaymiz
    if (isFetching.current) return;
    isFetching.current = true;

    try {
      console.log("[AuthContext] loadCompanies chaqirildi...");
      const r = await api.getMyCompanies();
      
      // LOG: Backenddan kelgan haqiqiy strukturani ko'ramiz
      console.log("[AuthContext] Backenddan kelgan xom data:", r);

      // --- BACKEND FORMATINI TO'G'RI PARSE QILISH ---
      let rawData = [];
      if (Array.isArray(r)) {
        rawData = r;
      } else if (r && Array.isArray(r.data)) {
        rawData = r.data;
      } else if (r && typeof r === 'object' && r.id) {
        // Agar bitta obyekt bo'lib kelsa
        rawData = [r];
      }

      const list = rawData.map((m) => {
        if (!m) return null;
        // Agar backend "join" qilib yuborsa: { role: 'admin', companies: { id: '...', name: '...' } }
        if (m.companies) {
          return { ...m.companies, role: m.role };
        }
        // Agar to'g'ridan-to'g'ri kompaniya obyekti bo'lsa
        return m.id ? m : null;
      }).filter(Boolean);

      console.log("[AuthContext] Yakuniy saralangan ro'yxat:", list);
      setCompanies(list);

      // Faol kompaniyani tanlash logikasi
      const saved = localStorage.getItem("active_company_id");
      const found = list.find((c) => c.id === saved) || list[0] || null;
      
      if (found) {
        setCompany(found);
        localStorage.setItem("active_company_id", found.id);
        console.log("[AuthContext] Aktiv kompaniya o'rnatildi:", found.name);
      } else {
        setCompany(null);
        console.warn("[AuthContext] Hech qanday kompaniya topilmadi.");
      }

      return list;
    } catch (err) {
      console.error("[AuthContext] loadCompanies xatosi:", err.message);
      return [];
    } finally {
      isFetching.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Dastur ishga tushganda sessiyani tekshirish
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        const u = session?.user || null;
        console.log("[AuthContext] Sessiya holati:", u ? u.email : "Tizimga kirilmagan");
        setUser(u);
        
        if (u) {
          await loadCompanies();
        }
      } catch (e) {
        console.error("[AuthContext] Init error:", e);
      } finally {
        if (mounted) {
          setLoading(false);
          initialLoadDone.current = true;
        }
      }
    };

    initAuth();

    // 2. Auth o'zgarishlarini kuzatish (Login/Logout/Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] Auth hodisasi:", event);
      
      // Faqat kerakli eventlarda reactsiyaga kirishamiz (cheksiz loopni oldini olish)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const u = session?.user || null;
        setUser(u);
        if (u) await loadCompanies();
      } 
      
      if (event === 'SIGNED_OUT') {
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
    console.log("[AuthContext] Chiqish bajarilmoqda...");
    await supabase.auth.signOut();
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