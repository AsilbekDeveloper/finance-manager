import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  Tag, Target, Settings, Menu, X, TrendingUp, ChevronDown
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const nav = [
  { to: "/overview",      icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions",  icon: ArrowLeftRight,  label: "Tranzaksiyalar" },
  { to: "/analytics",     icon: BarChart3,        label: "Analitika" },
  { to: "/categories",    icon: Tag,              label: "Kategoriyalar" },
  { to: "/budgets",       icon: Target,           label: "Byudjet" },
  { to: "/settings",      icon: Settings,         label: "Sozlamalar" },
];

export default function Layout() {
  const [open, setOpen]       = useState(false);
  const [coMenu, setCoMenu]   = useState(false);
  const { company, companies, switchCompany } = useAuth();

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? 220 : 64,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden", flexShrink: 0, zIndex:10,
      }}>
        {/* Logo */}
        <div style={{
          padding:16, display:"flex", alignItems:"center", gap:10,
          borderBottom:"1px solid var(--border)", minHeight:60,
        }}>
          <div style={{
            width:32, height:32, flexShrink:0, borderRadius:8,
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <TrendingUp size={18} color="white" />
          </div>
          {open && (
            <div style={{ overflow:"hidden" }}>
              <div style={{ fontWeight:700, fontSize:13, lineHeight:1, whiteSpace:"nowrap" }}>FinanceBot</div>
              <div style={{ fontSize:11, color:"var(--text3)", whiteSpace:"nowrap" }}>Biznes Moliya</div>
            </div>
          )}
        </div>

        {/* Company badge */}
        {open && company && (
          <div style={{
            margin:"8px 8px 0", padding:"8px 10px",
            background:"var(--bg3)", borderRadius:8,
            border:"1px solid var(--border)", cursor:"pointer",
            position:"relative"
          }} onClick={() => setCoMenu(!coMenu)}>
            <div className="flex items-center justify-between">
              <div style={{ fontSize:12, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                🏢 {company.name}
              </div>
              {companies.length > 1 && <ChevronDown size={13} color="var(--text3)"/>}
            </div>
            <div style={{ fontSize:11, color:"var(--text3)" }}>
              {company.role === "owner" ? "👑 Egasi" : "👤 A'zo"}
            </div>
            {coMenu && companies.length > 1 && (
              <div style={{
                position:"absolute", top:"100%", left:0, right:0, marginTop:4,
                background:"var(--bg2)", border:"1px solid var(--border)",
                borderRadius:8, overflow:"hidden", zIndex:20
              }}>
                {companies.map(co => (
                  <div key={co.id} onClick={() => { switchCompany(co); setCoMenu(false); }}
                    style={{
                      padding:"8px 12px", fontSize:12, cursor:"pointer",
                      background: co.id===company.id ? "var(--bg3)" : "transparent",
                      borderBottom:"1px solid var(--border)"
                    }}>
                    {co.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex:1, padding:"10px 8px", display:"flex", flexDirection:"column", gap:2 }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:10,
              padding:"9px 10px", borderRadius:8,
              color: isActive ? "var(--text)" : "var(--text2)",
              background: isActive ? "var(--bg3)" : "transparent",
              textDecoration:"none", fontWeight: isActive ? 600 : 400,
              fontSize:13, transition:"all 0.15s", whiteSpace:"nowrap",
              overflow:"hidden",
              borderLeft: isActive ? "2px solid var(--blue)" : "2px solid transparent",
            })}>
              <Icon size={18} style={{ flexShrink:0 }} />
              {open && label}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button onClick={() => setOpen(!open)} style={{
          margin:8, padding:8, background:"transparent",
          border:"1px solid var(--border)", borderRadius:8,
          color:"var(--text2)", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {open ? <X size={16}/> : <Menu size={16}/>}
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex:1, overflow:"auto" }}>
        <div style={{ padding:24 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
