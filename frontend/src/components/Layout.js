import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ArrowLeftRight, BarChart3,
  Tag, Target, Menu, X, TrendingUp
} from "lucide-react";

const nav = [
  { to: "/overview", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/transactions", icon: ArrowLeftRight, label: "Tranzaksiyalar" },
  { to: "/analytics", icon: BarChart3, label: "Analitika" },
  { to: "/categories", icon: Tag, label: "Kategoriyalar" },
  { to: "/budgets", icon: Target, label: "Byudjet" },
];

export default function Layout() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside style={{
        width: open ? 220 : 64,
        background: "var(--bg2)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease",
        overflow: "hidden",
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid var(--border)",
          minHeight: 60,
        }}>
          <div style={{
            width: 32, height: 32,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <TrendingUp size={18} color="white" />
          </div>
          {open && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>FinanceBot</div>
              <div style={{ fontSize: 11, color: "var(--text3)" }}>Biznes Moliya</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                borderRadius: 8,
                color: isActive ? "var(--text)" : "var(--text2)",
                background: isActive ? "var(--bg3)" : "transparent",
                textDecoration: "none",
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
                overflow: "hidden",
                borderLeft: isActive ? "2px solid var(--blue)" : "2px solid transparent",
              })}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {open && label}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            margin: "8px",
            padding: "8px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text2)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      {/* Main */}
      <main style={{
        flex: 1,
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
      }}>
        <div style={{ flex: 1, padding: "24px" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
