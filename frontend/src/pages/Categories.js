import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, X } from "lucide-react";

const ICONS   = ["💰","🛒","🔧","📈","💡","🚚","👥","🏢","📢","🏛️","📦","💸","🎯","📊","🤝","💳","🏭","🛠️","📱","🌐"];
const PALETTE = ["#6366f1","#22c55e","#ef4444","#f59e0b","#06b6d4","#8b5cf6","#ec4899","#14b8a6","#f97316","#a16207"];

export default function Categories() {
  const { company } = useAuth();
  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ name:"", type:"expense", icon:"💰", color:"#6366f1" });
  const [saving, setSaving]   = useState(false);

  const load = () => {
    if (!company) return;
    setLoading(true);
    api.getCategories(company.id)
      .then(r => setCats(r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [company]);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await api.createCategory({ ...form, company_id: company.id });
    setSaving(false);
    setShowForm(false);
    setForm({ name:"", type:"expense", icon:"💰", color:"#6366f1" });
    load();
  };

  const handleDelete = async (id, isDefault) => {
    if (isDefault) { alert("Standart kategoriyalarni o'chirib bo'lmaydi"); return; }
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    await api.deleteCategory(id);
    load();
  };

  const income  = cats.filter(c => c.type==="income");
  const expense = cats.filter(c => c.type==="expense");

  const CatList = ({ list }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {list.map(cat => (
        <div key={cat.id} style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"10px 12px", background:"var(--bg3)", borderRadius:8,
          border:"1px solid var(--border)"
        }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize:20 }}>{cat.icon}</span>
            <div>
              <div style={{ fontWeight:500, fontSize:14 }}>{cat.name}</div>
              {cat.is_default && <div style={{ fontSize:11, color:"var(--text3)" }}>Standart</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width:12, height:12, borderRadius:"50%", background:cat.color||"#6366f1" }}/>
            {!cat.is_default && (
              <button className="btn btn-danger" style={{ padding:"4px 8px" }}
                onClick={() => handleDelete(cat.id, cat.is_default)}>
                <Trash2 size={13}/>
              </button>
            )}
          </div>
        </div>
      ))}
      {list.length===0 && <p className="text-muted" style={{ textAlign:"center", padding:20 }}>Kategoriya yo'q</p>}
    </div>
  );

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom:24 }}>
        <div>
          <h1>Kategoriyalar</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Daromad va xarajat kategoriyalarini boshqaring</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16}/> Yangi
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div className="card">
          <h3 style={{ marginBottom:16, color:"var(--green)" }}>💚 Daromad ({income.length})</h3>
          {loading ? <div className="empty-state"><div className="spinner"/></div> : <CatList list={income}/>}
        </div>
        <div className="card">
          <h3 style={{ marginBottom:16, color:"var(--red)" }}>🔴 Xarajat ({expense.length})</h3>
          {loading ? <div className="empty-state"><div className="spinner"/></div> : <CatList list={expense}/>}
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>➕ Yangi kategoriya</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:"var(--text2)", cursor:"pointer" }}>
                <X size={20}/>
              </button>
            </div>

            <div className="form-group">
              <label>Tur</label>
              <div className="flex gap-2">
                {[["income","💚 Daromad"],["expense","🔴 Xarajat"]].map(([val,lbl]) => (
                  <button key={val} className="btn" onClick={() => setForm(f=>({...f,type:val}))} style={{
                    flex:1, justifyContent:"center",
                    background: form.type===val ? (val==="income"?"var(--green-dim)":"var(--red-dim)") : "var(--bg3)",
                    color:      form.type===val ? (val==="income"?"var(--green)":"var(--red)") : "var(--text2)",
                    border:     form.type===val ? `1px solid ${val==="income"?"var(--green)":"var(--red)"}` : "1px solid var(--border)",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Nomi</label>
              <input placeholder="Kategoriya nomi" value={form.name}
                onChange={e => setForm(f=>({...f,name:e.target.value}))} autoFocus/>
            </div>

            <div className="form-group">
              <label>Ikonka</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {ICONS.map(icon => (
                  <button key={icon} onClick={() => setForm(f=>({...f,icon}))} style={{
                    fontSize:22, padding:"4px 6px", borderRadius:6, cursor:"pointer",
                    background: form.icon===icon ? "var(--bg3)" : "transparent",
                    border: form.icon===icon ? "2px solid var(--blue)" : "2px solid transparent",
                  }}>{icon}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Rang</label>
              <div style={{ display:"flex", gap:8 }}>
                {PALETTE.map(color => (
                  <button key={color} onClick={() => setForm(f=>({...f,color}))} style={{
                    width:28, height:28, borderRadius:"50%", background:color,
                    border:"none", cursor:"pointer",
                    outline: form.color===color ? "3px solid white" : "none",
                    outlineOffset:2
                  }}/>
                ))}
              </div>
            </div>

            <div className="flex gap-2" style={{ marginTop:8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:"center" }}>Bekor</button>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={saving||!form.name.trim()} style={{ flex:1, justifyContent:"center" }}>
                {saving ? "Saqlanmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
