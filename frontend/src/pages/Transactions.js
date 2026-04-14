import React, { useState, useEffect, useCallback } from "react";
import { api, formatCurrency, formatDate } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Search, Pencil, Trash2, Send } from "lucide-react";
import TransactionModal from "../components/TransactionModal";

export default function Transactions() {
  const { company } = useAuth();
  const [txns, setTxns]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters]   = useState({
    start_date:"", end_date:"", type:"", category_id:"", search:""
  });

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const params = {};
      if (filters.start_date)  params.start_date  = filters.start_date;
      if (filters.end_date)    params.end_date    = filters.end_date;
      if (filters.type)        params.type        = filters.type;
      if (filters.category_id) params.category_id = filters.category_id;
      const r = await api.getTransactions(company.id, { ...params, limit:200 });
      let data = r.data || [];
      if (filters.search) {
        const q = filters.search.toLowerCase();
        data = data.filter(t =>
          (t.category_name||"").toLowerCase().includes(q) ||
          (t.note||"").toLowerCase().includes(q)
        );
      }
      setTxns(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [company, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!company) return;
    api.getCategories(company.id).then(r => setCategories(r.data || []));
  }, [company]);

  const handleDelete = async (id) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    setDeleting(id);
    await api.deleteTransaction(id);
    setDeleting(null);
    load();
  };

  const income  = txns.filter(t => t.type==="income").reduce((s,t) => s+t.amount, 0);
  const expense = txns.filter(t => t.type==="expense").reduce((s,t) => s+t.amount, 0);
  const net     = income - expense;

  const setF = (k, v) => setFilters(f => ({ ...f, [k]:v }));

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom:24 }}>
        <div>
          <h1>Tranzaksiyalar</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Barcha moliyaviy harakatlar</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16}/> Yangi
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3" style={{ marginBottom:20 }}>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12, marginBottom:4 }}>Daromad</div>
          <div style={{ color:"var(--green)", fontWeight:700, fontSize:20 }}>+{formatCurrency(income)}</div>
        </div>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12, marginBottom:4 }}>Xarajat</div>
          <div style={{ color:"var(--red)", fontWeight:700, fontSize:20 }}>-{formatCurrency(expense)}</div>
        </div>
        <div className="card" style={{ textAlign:"center" }}>
          <div style={{ color:"var(--text2)", fontSize:12, marginBottom:4 }}>Sof</div>
          <div style={{ color: net>=0 ? "var(--green)" : "var(--red)", fontWeight:700, fontSize:20 }}>
            {net>=0 ? "+" : ""}{formatCurrency(net)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:16, display:"flex", gap:12, flexWrap:"wrap", alignItems:"flex-end" }}>
        <div style={{ flex:"1 1 180px" }}>
          <label>Qidiruv</label>
          <div style={{ position:"relative" }}>
            <Search size={14} style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", color:"var(--text3)" }}/>
            <input placeholder="Kategoriya, izoh..." value={filters.search}
              onChange={e => setF("search", e.target.value)} style={{ paddingLeft:32 }}/>
          </div>
        </div>
        <div style={{ flex:"1 1 130px" }}>
          <label>Boshlanish</label>
          <input type="date" value={filters.start_date} onChange={e => setF("start_date", e.target.value)}/>
        </div>
        <div style={{ flex:"1 1 130px" }}>
          <label>Tugash</label>
          <input type="date" value={filters.end_date} onChange={e => setF("end_date", e.target.value)}/>
        </div>
        <div style={{ flex:"1 1 120px" }}>
          <label>Tur</label>
          <select value={filters.type} onChange={e => setF("type", e.target.value)}>
            <option value="">Barchasi</option>
            <option value="income">💚 Daromad</option>
            <option value="expense">🔴 Xarajat</option>
          </select>
        </div>
        <div style={{ flex:"1 1 160px" }}>
          <label>Kategoriya</label>
          <select value={filters.category_id} onChange={e => setF("category_id", e.target.value)}>
            <option value="">Barchasi</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <button className="btn btn-ghost"
          onClick={() => setFilters({ start_date:"", end_date:"", type:"", category_id:"", search:"" })}>
          Tozalash
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", borderBottom:"1px solid var(--border)",
          display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, color:"var(--text2)" }}>{txns.length} ta natija</span>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <Send size={13} style={{ color:"var(--text3)" }}/>
            <span style={{ fontSize:12, color:"var(--text3)" }}>@uzfinx_bot orqali ham qo'shish mumkin</span>
          </div>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner"/></div>
        ) : txns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Tranzaksiya topilmadi</h3>
            <p style={{ marginTop:8, fontSize:13 }}>Filter o'zgartiring yoki yangi qo'shing</p>
          </div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Kategoriya</th>
                  <th>Izoh</th>
                  <th>Manba</th>
                  <th style={{ textAlign:"right" }}>Miqdor</th>
                  <th style={{ textAlign:"right" }}>Amal</th>
                </tr>
              </thead>
              <tbody>
                {txns.map(tx => (
                  <tr key={tx.id}>
                    <td style={{ color:"var(--text2)", fontSize:13, whiteSpace:"nowrap" }}>
                      {formatDate(tx.date)}
                    </td>
                    <td>
                      <span className={`badge badge-${tx.type}`}>
                        {tx.category_name || "Boshqa"}
                      </span>
                    </td>
                    <td style={{ color:"var(--text2)", fontSize:13 }}>{tx.note || "—"}</td>
                    <td>
                      <span style={{
                        fontSize:11, padding:"2px 8px", borderRadius:20,
                        background: tx.source==="telegram" ? "var(--blue-dim)" : "var(--amber-dim)",
                        color:      tx.source==="telegram" ? "var(--blue)"     : "var(--amber)",
                      }}>
                        {tx.source==="telegram" ? "✈ Telegram" : "🖥 Dashboard"}
                      </span>
                    </td>
                    <td style={{
                      textAlign:"right", fontWeight:600, whiteSpace:"nowrap",
                      color: tx.type==="income" ? "var(--green)" : "var(--red)"
                    }}>
                      {tx.type==="income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                    <td style={{ textAlign:"right" }}>
                      <div className="flex gap-2" style={{ justifyContent:"flex-end" }}>
                        <button className="btn btn-ghost" style={{ padding:"4px 8px" }}
                          onClick={() => setEditing(tx)}>
                          <Pencil size={14}/>
                        </button>
                        <button className="btn btn-danger" style={{ padding:"4px 8px" }}
                          onClick={() => handleDelete(tx.id)}
                          disabled={deleting===tx.id}>
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
      {editing && (
        <TransactionModal
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
