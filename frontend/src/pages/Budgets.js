import React, { useState, useEffect } from "react";
import { api, formatCurrency } from "../lib/api";
import { Plus, Trash2, X, AlertTriangle, CheckCircle } from "lucide-react";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category_id:"", category_name:"", amount:"", period:"monthly" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([api.getBudgets(), api.getCategories("expense")]);
      setBudgets(b.data || []);
      setCategories(c.data || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCatChange = (e) => {
    const id = e.target.value;
    const cat = categories.find(c => c.id === id);
    setForm(f => ({ ...f, category_id:id, category_name: cat?.name || "" }));
  };

  const handleSave = async () => {
    if (!form.category_id || !form.amount) return;
    setSaving(true);
    await api.createBudget({ ...form, amount: parseFloat(form.amount) });
    setSaving(false);
    setShowForm(false);
    setForm({ category_id:"", category_name:"", amount:"", period:"monthly" });
    load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    await api.deleteBudget(id);
    load();
  };

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overBudget = budgets.filter(b => b.percentage >= 100).length;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom:24 }}>
        <div>
          <h1>Byudjet nazorati</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Xarajat limitlarini belgilang va nazorat qiling</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Byudjet qo'shish
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom:20 }}>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12 }}>Jami byudjet</div>
          <div style={{ color:"var(--blue)", fontWeight:700, fontSize:22 }}>{formatCurrency(totalBudget)}</div>
        </div>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12 }}>Sarflangan</div>
          <div style={{ color:"var(--amber)", fontWeight:700, fontSize:22 }}>{formatCurrency(totalSpent)}</div>
        </div>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12 }}>Limit oshgan</div>
          <div style={{ color: overBudget > 0 ? "var(--red)" : "var(--green)", fontWeight:700, fontSize:22 }}>
            {overBudget > 0 ? `⚠️ ${overBudget} ta` : "✅ Hammasi normal"}
          </div>
        </div>
      </div>

      {/* Budget list */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : budgets.length === 0 ? (
        <div className="card">
          <div className="empty-state" style={{ padding:60 }}>
            <div className="empty-icon">🎯</div>
            <h3>Byudjet belgilanmagan</h3>
            <p style={{ marginTop:8, fontSize:13, color:"var(--text2)" }}>
              Xarajat kategoriyalari uchun oylik limit belgilab,<br />
              moliyangizni nazorat qiling
            </p>
            <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => setShowForm(true)}>
              <Plus size={16} /> Birinchi byudjetni qo'shish
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {budgets.map(b => {
            const isOver = b.percentage >= 100;
            const isWarning = b.percentage >= 80 && b.percentage < 100;
            const barColor = isOver ? "var(--red)" : isWarning ? "var(--amber)" : "var(--green)";
            return (
              <div key={b.id} className="card">
                <div className="flex items-center justify-between" style={{ marginBottom:12 }}>
                  <div className="flex items-center gap-3">
                    {isOver
                      ? <AlertTriangle size={18} color="var(--red)" />
                      : <CheckCircle size={18} color="var(--green)" />
                    }
                    <div>
                      <div style={{ fontWeight:600 }}>{b.category_name}</div>
                      <div style={{ fontSize:12, color:"var(--text2)" }}>
                        {b.period === "monthly" ? "Oylik" : b.period === "weekly" ? "Haftalik" : "Yillik"} byudjet
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{formatCurrency(b.spent)} <span style={{ color:"var(--text3)", fontWeight:400 }}>/ {formatCurrency(b.amount)}</span></div>
                      <div style={{ fontSize:12, color: barColor }}>{b.percentage}% sarflangan</div>
                    </div>
                    <button className="btn btn-danger" style={{ padding:"6px 8px" }} onClick={() => handleDelete(b.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="progress-bar" style={{ height:8 }}>
                  <div className="progress-fill" style={{ width:`${Math.min(b.percentage, 100)}%`, background: barColor }} />
                </div>
                {isOver && (
                  <div style={{ marginTop:8, padding:"6px 10px", background:"var(--red-dim)", borderRadius:6, fontSize:12, color:"var(--red)" }}>
                    ⚠️ Limit {formatCurrency(b.spent - b.amount)} ga oshib ketdi!
                  </div>
                )}
                {isWarning && (
                  <div style={{ marginTop:8, padding:"6px 10px", background:"var(--amber-dim)", borderRadius:6, fontSize:12, color:"var(--amber)" }}>
                    🔔 Byudjetning 80% dan oshdi. Ehtiyot bo'ling!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>🎯 Yangi byudjet</h2>
              <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", color:"var(--text2)", cursor:"pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label>Xarajat kategoriyasi</label>
              <select value={form.category_id} onChange={handleCatChange}>
                <option value="">Kategoriyani tanlang</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Limit miqdori (so'm)</label>
              <input type="number" placeholder="5000000" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} />
            </div>

            <div className="form-group">
              <label>Davr</label>
              <select value={form.period} onChange={e => setForm(f => ({ ...f, period:e.target.value }))}>
                <option value="monthly">Oylik</option>
                <option value="weekly">Haftalik</option>
                <option value="yearly">Yillik</option>
              </select>
            </div>

            <div className="flex gap-2" style={{ marginTop:8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} style={{ flex:1, justifyContent:"center" }}>Bekor qilish</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.category_id || !form.amount}
                style={{ flex:1, justifyContent:"center" }}>
                {saving ? "Saqlanmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
