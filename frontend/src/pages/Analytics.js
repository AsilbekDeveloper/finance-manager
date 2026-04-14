import React, { useState, useEffect } from "react";
import { api, formatCurrency } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";

const COLORS = ["#6366f1","#22c55e","#ef4444","#f59e0b","#06b6d4","#8b5cf6","#ec4899","#14b8a6","#f97316","#a16207"];

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border)",
      borderRadius:8, padding:"10px 14px", fontSize:13 }}>
      <div style={{ color:"var(--text2)", marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color }}>
          {p.name==="income" ? "💚 Daromad" : p.name==="expense" ? "🔴 Xarajat" : p.name}: {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"var(--bg3)", border:"1px solid var(--border)",
      borderRadius:8, padding:"8px 12px", fontSize:13 }}>
      <div style={{ fontWeight:600 }}>{payload[0].name}</div>
      <div style={{ color:payload[0].payload.fill }}>{formatCurrency(payload[0].value)}</div>
    </div>
  );
};

export default function Analytics() {
  const { company } = useAuth();
  const [data, setData]     = useState(null);
  const [year, setYear]     = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("trend");

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    api.getAnalytics(company.id, year)
      .then(setData).catch(console.error)
      .finally(() => setLoading(false));
  }, [company, year]);

  if (loading) return <div className="empty-state"><div className="spinner"/></div>;

  const monthly  = data?.monthly_trend       || [];
  const expCats  = data?.expense_by_category || [];
  const incCats  = data?.income_by_category  || [];
  const totalExp = expCats.reduce((s,c) => s+c.value, 0);
  const totalInc = incCats.reduce((s,c) => s+c.value, 0);
  const netData  = monthly.map(m => ({ ...m, net: m.income - m.expense }));

  const tabs = [
    { key:"trend",   label:"📈 Trend" },
    { key:"expense", label:"🔴 Xarajat" },
    { key:"income",  label:"💚 Daromad" },
    { key:"net",     label:"💰 Sof foyda" },
  ];

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ marginBottom:24 }}>
        <div>
          <h1>Analitika</h1>
          <p className="text-muted" style={{ marginTop:4 }}>Moliyaviy ko'rsatkichlar va trendlar</p>
        </div>
        <div className="flex gap-2">
          {[new Date().getFullYear(), new Date().getFullYear()-1].map(y => (
            <button key={y} className={`btn ${year===y?"btn-primary":"btn-ghost"}`}
              style={{ padding:"6px 14px" }} onClick={() => setYear(y)}>{y}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.key} className={`btn ${tab===t.key?"btn-primary":"btn-ghost"}`}
            style={{ padding:"6px 14px" }} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Trend */}
      {tab==="trend" && (
        <div className="card">
          <h3 style={{ marginBottom:16 }}>📊 Oylik daromad va xarajat ({year})</h3>
          {monthly.every(m => m.income===0 && m.expense===0) ? (
            <div className="empty-state" style={{ padding:60 }}>
              <div className="empty-icon">📊</div><p>Bu yil uchun ma'lumot yo'q</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="month" stroke="var(--text3)" fontSize={12}/>
                <YAxis stroke="var(--text3)" fontSize={11} tickFormatter={v=>(v/1000000).toFixed(1)+"M"}/>
                <Tooltip content={<ChartTip/>}/>
                <Legend formatter={v=>v==="income"?"Daromad":"Xarajat"}/>
                <Bar dataKey="income"  fill="#22c55e" radius={[4,4,0,0]} name="income"/>
                <Bar dataKey="expense" fill="#ef4444" radius={[4,4,0,0]} name="expense"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Expense breakdown */}
      {tab==="expense" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>🥧 Xarajat taqsimoti</h3>
            {expCats.length===0 ? (
              <div className="empty-state" style={{ padding:60 }}>
                <div className="empty-icon">📊</div><p>Bu oy xarajat yo'q</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={expCats} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={90} label={({name,percent})=>`${(percent*100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}>
                    {expCats.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip content={<PieTip/>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>📋 Xarajat ro'yxati</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {expCats.length===0 ? (
                <p className="text-muted" style={{ textAlign:"center", padding:40 }}>Ma'lumot yo'q</p>
              ) : expCats.map((cat,i) => {
                const pct = totalExp>0 ? (cat.value/totalExp)*100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width:10,height:10,borderRadius:2,background:COLORS[i%COLORS.length],flexShrink:0 }}/>
                        <span style={{ fontSize:13 }}>{cat.name}</span>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{formatCurrency(cat.value)}</span>
                        <span style={{ color:"var(--text3)", fontSize:11, marginLeft:6 }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%`, background:COLORS[i%COLORS.length] }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Income breakdown */}
      {tab==="income" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>🥧 Daromad taqsimoti</h3>
            {incCats.length===0 ? (
              <div className="empty-state" style={{ padding:60 }}>
                <div className="empty-icon">📊</div><p>Bu oy daromad yo'q</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={incCats} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={90} label={({name,percent})=>`${(percent*100).toFixed(0)}%`}
                    labelLine={false} fontSize={11}>
                    {incCats.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip content={<PieTip/>}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="card">
            <h3 style={{ marginBottom:16 }}>📋 Daromad ro'yxati</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {incCats.length===0 ? (
                <p className="text-muted" style={{ textAlign:"center", padding:40 }}>Ma'lumot yo'q</p>
              ) : incCats.map((cat,i) => {
                const pct = totalInc>0 ? (cat.value/totalInc)*100 : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between" style={{ marginBottom:4 }}>
                      <div className="flex items-center gap-2">
                        <div style={{ width:10,height:10,borderRadius:2,background:COLORS[i%COLORS.length],flexShrink:0 }}/>
                        <span style={{ fontSize:13 }}>{cat.name}</span>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <span style={{ fontWeight:600, fontSize:13 }}>{formatCurrency(cat.value)}</span>
                        <span style={{ color:"var(--text3)", fontSize:11, marginLeft:6 }}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width:`${pct}%`, background:COLORS[i%COLORS.length] }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Net profit */}
      {tab==="net" && (
        <div className="card">
          <h3 style={{ marginBottom:16 }}>💰 Oylik sof foyda ({year})</h3>
          {netData.every(m=>m.net===0) ? (
            <div className="empty-state" style={{ padding:60 }}>
              <div className="empty-icon">💰</div><p>Bu yil uchun ma'lumot yo'q</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={netData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="month" stroke="var(--text3)" fontSize={12}/>
                <YAxis stroke="var(--text3)" fontSize={11} tickFormatter={v=>(v/1000000).toFixed(1)+"M"}/>
                <Tooltip content={<ChartTip/>}/>
                <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2}
                  dot={{ fill:"#6366f1", r:4 }} name="Sof foyda"/>
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
}
