import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { X } from "lucide-react";

export default function TransactionModal({ defaultType = "expense", transaction = null, onClose, onSaved }) {
  const isEdit = !!transaction;
  const [form, setForm] = useState({
    amount: transaction?.amount || "",
    type: transaction?.type || defaultType,
    category_id: transaction?.category_id || "",
    category_name: transaction?.category_name || "",
    note: transaction?.note || "",
    date: transaction?.date || new Date().toISOString().split("T")[0],
    source: "dashboard",
  });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getCategories(form.type).then(r => setCategories(r.data || []));
  }, [form.type]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCatChange = (e) => {
    const id = e.target.value;
    const cat = categories.find(c => c.id === id);
    set("category_id", id);
    set("category_name", cat?.name || "");
  };

  const handleSubmit = async () => {
    if (!form.amount || !form.type) { setError("Miqdor va tur kiritilishi shart"); return; }
    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await api.updateTransaction(transaction.id, form);
      } else {
        await api.createTransaction(form);
      }
      onSaved();
    } catch (e) {
      setError("Xato yuz berdi: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? "✏️ O'zgartirish" : "➕ Yangi tranzaksiya"}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Type selector */}
        <div className="form-group">
          <label>Tur</label>
          <div className="flex gap-2">
            <button
              onClick={() => set("type", "income")}
              className="btn"
              style={{
                flex: 1, justifyContent: "center",
                background: form.type === "income" ? "var(--green-dim)" : "var(--bg3)",
                color: form.type === "income" ? "var(--green)" : "var(--text2)",
                border: form.type === "income" ? "1px solid var(--green)" : "1px solid var(--border)",
              }}
            >
              💚 Daromad
            </button>
            <button
              onClick={() => set("type", "expense")}
              className="btn"
              style={{
                flex: 1, justifyContent: "center",
                background: form.type === "expense" ? "var(--red-dim)" : "var(--bg3)",
                color: form.type === "expense" ? "var(--red)" : "var(--text2)",
                border: form.type === "expense" ? "1px solid var(--red)" : "1px solid var(--border)",
              }}
            >
              🔴 Xarajat
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="form-group">
          <label>Miqdor (so'm)</label>
          <input
            type="number"
            placeholder="500000"
            value={form.amount}
            onChange={e => set("amount", e.target.value)}
            autoFocus
          />
        </div>

        {/* Category */}
        <div className="form-group">
          <label>Kategoriya</label>
          <select value={form.category_id} onChange={handleCatChange}>
            <option value="">Kategoriyani tanlang</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="form-group">
          <label>Sana</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set("date", e.target.value)}
          />
        </div>

        {/* Note */}
        <div className="form-group">
          <label>Izoh (ixtiyoriy)</label>
          <input
            placeholder="Qo'shimcha ma'lumot..."
            value={form.note}
            onChange={e => set("note", e.target.value)}
          />
        </div>

        {error && (
          <div style={{ background: "var(--red-dim)", color: "var(--red)", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div className="flex gap-2" style={{ marginTop: 4 }}>
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: "center" }}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 1, justifyContent: "center" }}>
            {saving ? "Saqlanmoqda..." : isEdit ? "Saqlash" : "Qo'shish"}
          </button>
        </div>
      </div>
    </div>
  );
}
