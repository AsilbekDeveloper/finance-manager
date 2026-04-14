import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Layout from "./components/Layout";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import CreateCompany from "./pages/auth/CreateCompany";
import Overview from "./pages/Overview";
import Transactions from "./pages/Transactions";
import Analytics from "./pages/Analytics";
import Categories from "./pages/Categories";
import Budgets from "./pages/Budgets";
import Settings from "./pages/Settings";
import "./index.css";

function ProtectedRoute({ children }) {
  const { user, loading, company } = useAuth();
  if (loading) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (!company) return <Navigate to="/create-company" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, company, loading } = useAuth();
  if (loading) return null;
  if (user && company) return <Navigate to="/overview" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/create-company" element={<CreateCompany />} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview"      element={<Overview />} />
        <Route path="transactions"  element={<Transactions />} />
        <Route path="analytics"     element={<Analytics />} />
        <Route path="categories"    element={<Categories />} />
        <Route path="budgets"       element={<Budgets />} />
        <Route path="settings"      element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
