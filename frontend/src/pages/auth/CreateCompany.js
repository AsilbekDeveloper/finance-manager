import React, { useState } from "react";
import { supabase, api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Building2, TrendingUp } from "lucide-react";

export default function CreateCompany() {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(""); 
    setLoading(true);

    try {
      console.log("[CreateCompany] Yaratish jarayoni boshlandi:", name);

      // 1. Sessiyani tekshirish
      let { data: sd } = await supabase.auth.getSession();
      if (!sd?.session) {
        console.log("[CreateCompany] Sessiya yo'q, yangilanmoqda...");
        const { data: rd } = await supabase.auth.refreshSession();
        sd = rd;
      }
      if (!sd?.session) throw new Error("Sessiya topilmadi. Qaytadan kiring.");

      // 2. Kompaniya yaratish
      const company = await api.createCompany(name.trim());
      console.log("[CreateCompany] Server javobi:", company);

      if (!company?.id) throw new Error("Kompaniya yaratilmadi — server javobi noto'g'ri");

      // 3. Aktiv ID ni saqlash
      console.log("[CreateCompany] ID saqlanmoqda:", company.id);
      localStorage.setItem("active_company_id", company.id);

      // 4. Redirect
      console.log("[CreateCompany] Muvaffaqiyat! Overview'ga yo'naltirilmoqda...");
      window.location.href = "/overview";
    } catch (e) {
      console.error("[CreateCompany Xatosi]", e);
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg)", padding:16
    }}>
      <div style={{ width:"100%", maxWidth:440 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:14, margin:"0 auto 12px",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center"
          }}>
            <TrendingUp size={28} color="white"/>
          </div>
          <h1 style={{ fontSize:22 }}>Xush kelibsiz! 🎉</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Kompaniyangizni sozlang</p>
        </div>

        <div className="card shadow-sm" style={{ padding: 24, borderRadius: 16, background: "white" }}>
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 16px", background:"#f0f7ff",
            borderRadius:10, marginBottom:24, border:"1px solid #cce3ff"
          }}>
            <Building2 size={20} color="#0066ff"/>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Kompaniya yarating</div>
              <div style={{ fontSize:12, color:"#666" }}>
                Har bir kompaniya uchun alohida ma'lumotlar saqlanadi
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label className="mb-2 d-block" style={{ fontWeight: 500 }}>Kompaniya nomi</label>
              <input
                className="form-control"
                placeholder="Masalan: Asilbek Trading LLC"
                value={name}
                onChange={e => setName(e.target.value)}
                required autoFocus
                style={{ padding: '10px 14px' }}
              />
            </div>

            {err && (
              <div style={{ background:"#fff5f5", color:"#e03131",
                padding:"10px 12px", borderRadius:8, marginBottom:16, fontSize:13, border: "1px solid #ffc9c9" }}>
                ❌ {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", padding:"12px", fontWeight: 600 }}
              disabled={loading || !name.trim()}>
              {loading ? "Yaratilmoqda..." : "Davom etish →"}
            </button>
          </form>

          <div style={{ marginTop:24, padding:"14px", background:"#f8f9fa", borderRadius:10 }}>
            <p style={{ fontSize:12, color:"#666", lineHeight:1.8, margin: 0 }}>
              ✅ Standart kategoriyalar avtomatik qo'shiladi<br/>
              ✅ Telegram botni bog'lash mumkin<br/>
              ✅ Jamoa a'zolarini taklif qilish mumkin
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}