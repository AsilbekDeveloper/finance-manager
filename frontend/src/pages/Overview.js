import React, { useState, useEffect } from "react";
import { api, formatCurrency, pctChange } from "../lib/api";
import { TrendingUp, TrendingDown, Minus, Plus, RefreshCw } from "lucide-react";
import TransactionModal from "../components/TransactionModal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

function StatCard({ label, value, prev, color, icon, prefix = "" }) {
  const change = pctChange(value, prev);
  return (
    <div className="stat-card fade-in">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div className="stat-value" style={{ color }}>
        {prefix}{formatCurrency(value)}
      </div>
      {change !== null && (
        <span className={`stat-change ${change >= 0 ? "text-green" : "text-red"}`}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(1)}% o'tgan oyga nisbatan
        </span>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg3)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 13
    }}>
      <div style={{ color: "var(--text2)", marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name === "income" ? "💚 Daromad" : "🔴 Xarajat"}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [recent, setRecent] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [chartData, setChartData] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [overview, txns, analytics] = await Promise.all([
        api.getOverview(period),
        api.getTransactions({ limit: 7 }),
        api.getAnalytics(),
      ]);
      setStats(overview);
      setRecent(txns.data || []);
      setChartData((analytics.monthly_trend || []).filter(m => m.income > 0 || m.expense > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [period]);

  if (loading && !stats) return (
    <div className="empty-state">
      <div className="spinner" />
      <p style={{ marginTop: 16, color: "var(--text2)" }}>Yuklanmoqda...</p>
    </div>
  );

  const c = stats?.current || {};
  const p = stats?.previous || {};

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>Biznesingiz moliyaviy ko'rinishi</p>
        </div>
        <div className="flex gap-2">
          {["today", "week", "month"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`btn ${period === p ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "6px 14px" }}
            >
              {p === "today" ? "Bugun" : p === "week" ? "Hafta" : "Oy"}
            </button>
          ))}
          <button className="btn btn-ghost" onClick={load} style={{ padding: "6px 10px" }}>
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard label="Jami daromad" value={c.income || 0} prev={p.income} color="var(--green)" icon="💚" />
        <StatCard label="Jami xarajat" value={c.expense || 0} prev={p.expense} color="var(--red)" icon="🔴" />
        <StatCard
          label="Sof foyda"
          value={Math.abs(c.net || 0)}
          prev={Math.abs(p.net || 0)}
          color={(c.net || 0) >= 0 ? "var(--green)" : "var(--red)"}
          icon={(c.net || 0) >= 0 ? "✅" : "⚠️"}
          prefix={(c.net || 0) >= 0 ? "+" : "-"}
        />
        <StatCard label="Tranzaksiyalar" value={c.count || 0} prev={p.count} color="var(--blue)" icon="📊" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Chart */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>📈 Oylik trend</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text3)" fontSize={12} />
                <YAxis stroke="var(--text3)" fontSize={11} tickFormatter={v => (v / 1000000).toFixed(0) + "M"} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" fill="url(#income)" strokeWidth={2} name="income" />
                <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="url(#expense)" strokeWidth={2} name="expense" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">📊</div>
              <p>Hali ma'lumot yo'q</p>
            </div>
          )}
        </div>

        {/* Category breakdown */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>📂 Kategoriyalar</h3>
          {(stats?.categories || []).length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-icon">📂</div>
              <p style={{ fontSize: 13 }}>Ma'lumot yo'q</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(stats?.categories || []).slice(0, 6).map((cat, i) => {
                const total = cat.income + cat.expense;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{cat.name}</span>
                      <span style={{ fontSize: 12, color: "var(--text2)" }}>{formatCurrency(total)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: "100%",
                        background: cat.income > cat.expense ? "var(--green)" : "var(--red)"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick add + Recent */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* Quick add */}
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>⚡ Tez qo'shish</h3>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
            onClick={() => setShowModal("income")}
          >
            <Plus size={16} /> Daromad
          </button>
          <button
            className="btn btn-ghost"
            style={{ width: "100%", justifyContent: "center", borderColor: "var(--red)", color: "var(--red)" }}
            onClick={() => setShowModal("expense")}
          >
            <Minus size={16} /> Xarajat
          </button>

          <div style={{ marginTop: 16, padding: 12, background: "var(--bg3)", borderRadius: 8 }}>
            <p style={{ fontSize: 12, color: "var(--text2)", textAlign: "center" }}>
              💬 Yoki Telegram orqali:<br />
              <strong style={{ color: "var(--blue)" }}>@YourFinanceBot</strong>
            </p>
          </div>
        </div>

        {/* Recent transactions */}
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3>🕐 So'nggi tranzaksiyalar</h3>
            <a href="/transactions" style={{ fontSize: 13, color: "var(--blue)", textDecoration: "none" }}>Barchasini ko'rish →</a>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-icon">📝</div>
              <p style={{ fontSize: 13 }}>Hali tranzaksiya yo'q</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>Yuqoridagi tugmani bosib boshlang</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Kategoriya</th>
                  <th>Izoh</th>
                  <th>Sana</th>
                  <th style={{ textAlign: "right" }}>Miqdor</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <span className={`badge badge-${tx.type}`}>
                        {tx.category_name || "Boshqa"}
                      </span>
                    </td>
                    <td style={{ color: "var(--text2)", fontSize: 13 }}>{tx.note || "—"}</td>
                    <td style={{ color: "var(--text3)", fontSize: 12 }}>{tx.date}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: tx.type === "income" ? "var(--green)" : "var(--red)" }}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <TransactionModal
          defaultType={showModal}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
