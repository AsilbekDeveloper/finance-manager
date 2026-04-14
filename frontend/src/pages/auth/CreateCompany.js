import React, { useState } from "react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Building2, TrendingUp } from "lucide-react";

export default function CreateCompany() {
  const [name, setName]   = useState("");
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const { loadCompanies } = useAuth();
  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(""); setLoading(true);
    try {
      await api.createCompany(name.trim());
      await loadCompanies();
      nav("/overview");
    } catch (e) {
      setErr(e.message);
    } finally {
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
            <TrendingUp size={28} color="white" />
          </div>
          <h1 style={{ fontSize:22 }}>Xush kelibsiz! 🎉</h1>
          <p className="text-muted" style={{ marginTop:4 }}>
            Kompaniyangizni sozlang
          </p>
        </div>

        <div className="card">
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"14px 16px", background:"var(--blue-dim)",
            borderRadius:10, marginBottom:24, border:"1px solid var(--blue)"
          }}>
            <Building2 size={20} color="var(--blue)" />
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>Kompaniya yarating</div>
              <div style={{ fontSize:12, color:"var(--text2)" }}>
                Har bir kompaniya uchun alohida ma'lumotlar saqlanadi
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Kompaniya nomi</label>
              <input
                placeholder="Masalan: Asilbek Trading LLC"
                value={name}
                onChange={e => setName(e.target.value)}
                required autoFocus
              />
            </div>

            {err && (
              <div style={{ background:"var(--red-dim)", color:"var(--red)",
                padding:"8px 12px", borderRadius:8, marginBottom:12, fontSize:13 }}>
                {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", padding:"10px" }}
              disabled={loading || !name.trim()}>
              {loading ? "Yaratilmoqda..." : "Davom etish →"}
            </button>
          </form>

          <div style={{ marginTop:20, padding:"12px 14px", background:"var(--bg3)", borderRadius:8 }}>
            <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.7 }}>
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
