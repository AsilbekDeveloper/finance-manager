import React, { useState } from "react";
import { supabase } from "../../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [form, setForm]   = useState({ email: "", password: "" });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow]   = useState(false);
  const nav = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(form);
    setLoading(false);
    if (error) { setErr(error.message); return; }
    nav("/overview");
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"var(--bg)", padding:16
    }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{
            width:56, height:56, borderRadius:14, margin:"0 auto 12px",
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center"
          }}>
            <TrendingUp size={28} color="white" />
          </div>
          <h1 style={{ fontSize:22 }}>FinanceBot</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Biznes moliya menejeri</p>
        </div>

        <div className="card">
          <h2 style={{ marginBottom:20, textAlign:"center" }}>Kirish</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="email@company.uz" value={form.email}
                onChange={e => set("email", e.target.value)} required autoFocus />
            </div>
            <div className="form-group">
              <label>Parol</label>
              <div style={{ position:"relative" }}>
                <input type={show ? "text" : "password"} placeholder="••••••••"
                  value={form.password} onChange={e => set("password", e.target.value)}
                  required style={{ paddingRight:40 }} />
                <button type="button" onClick={() => setShow(!show)} style={{
                  position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
                  background:"none", border:"none", color:"var(--text3)", cursor:"pointer"
                }}>
                  {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {err && (
              <div style={{ background:"var(--red-dim)", color:"var(--red)", padding:"8px 12px",
                borderRadius:8, marginBottom:12, fontSize:13 }}>
                {err}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ width:"100%", justifyContent:"center", padding:"10px" }}
              disabled={loading}>
              {loading ? "Kirish..." : "Kirish"}
            </button>
          </form>

          <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"var(--text2)" }}>
            Hisob yo'qmi?{" "}
            <Link to="/register" style={{ color:"var(--blue)", textDecoration:"none" }}>
              Ro'yxatdan o'ting
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
