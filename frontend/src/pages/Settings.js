import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Plus, Trash2, X, Copy, Check, Send } from "lucide-react";

export default function Settings() {
  const { company, companies, switchCompany, user, signOut } = useAuth();
  const [members, setMembers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email:"", full_name:"" });
  const [tgCode, setTgCode]     = useState(null);
  const [copied, setCopied]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [showNewCo, setShowNewCo] = useState(false);
  const [newCoName, setNewCoName] = useState("");

  const isOwner = company?.role === "owner";

  useEffect(() => {
    if (!company) return;
    setLoading(true);
    api.getMembers(company.id)
      .then(r => setMembers(r.data || []))
      .finally(() => setLoading(false));
  }, [company]);

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setSaving(true);
    try {
      const r = await api.inviteMember(company.id, inviteForm.email, inviteForm.full_name);
      alert(`✅ Taklif yuborildi!\n\nJamoa a'zosi quyidagi kodni Telegram botga yuboring:\n/link ${r.link_code}\n\nBot: @uzfinx_bot`);
      setShowInvite(false);
      setInviteForm({ email:"", full_name:"" });
      api.getMembers(company.id).then(r => setMembers(r.data || []));
    } catch (e) {
      alert("Xato: " + e.message);
    } finally { setSaving(false); }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("O'chirishni tasdiqlaysizmi?")) return;
    await api.removeMember(company.id, memberId);
    api.getMembers(company.id).then(r => setMembers(r.data || []));
  };

  const handleTelegramLink = async () => {
    try {
      const r = await api.generateTelegramLink(company.id);
      setTgCode(r.code);
    } catch (e) { alert("Xato: " + e.message); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(`/link ${tgCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCompany = async () => {
    if (!newCoName.trim()) return;
    setSaving(true);
    try {
      const { loadCompanies } = require("../context/AuthContext");
      await api.createCompany(newCoName.trim());
      // reload companies via auth context refresh
      window.location.reload();
    } catch (e) { alert("Xato: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom:24 }}>
        <h1>Sozlamalar</h1>
        <p className="text-muted" style={{ marginTop:4 }}>Kompaniya va jamoa boshqaruvi</p>
      </div>

      {/* Company switcher */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:14 }}>🏢 Mening kompaniyalarim</h3>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {companies.map(co => (
            <div key={co.id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", borderRadius:8,
              background: co.id === company?.id ? "var(--blue-dim)" : "var(--bg3)",
              border: `1px solid ${co.id === company?.id ? "var(--blue)" : "var(--border)"}`,
              cursor:"pointer"
            }} onClick={() => switchCompany(co)}>
              <div>
                <div style={{ fontWeight:600 }}>{co.name}</div>
                <div style={{ fontSize:12, color:"var(--text2)" }}>
                  {co.role === "owner" ? "👑 Egasi" : "👤 A'zo"}
                </div>
              </div>
              {co.id === company?.id && (
                <span style={{ fontSize:11, padding:"3px 8px", borderRadius:20,
                  background:"var(--blue)", color:"white" }}>Faol</span>
              )}
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" style={{ marginTop:12, width:"100%", justifyContent:"center" }}
          onClick={() => setShowNewCo(true)}>
          <Plus size={15} /> Yangi kompaniya
        </button>
      </div>

      {/* Telegram linking */}
      <div className="card" style={{ marginBottom:16 }}>
        <h3 style={{ marginBottom:6 }}>✈️ Telegram bog'lash</h3>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:14 }}>
          @uzfinx_bot orqali tranzaksiyalar qo'shish uchun akkauntingizni bog'lang
        </p>
        {tgCode ? (
          <div>
            <div style={{
              padding:"12px 16px", background:"var(--bg3)", borderRadius:8,
              border:"1px solid var(--border)", marginBottom:10,
              display:"flex", alignItems:"center", justifyContent:"space-between"
            }}>
              <code style={{ fontSize:15, color:"var(--blue)", fontWeight:700 }}>
                /link {tgCode}
              </code>
              <button onClick={copyCode} className="btn btn-ghost" style={{ padding:"4px 10px" }}>
                {copied ? <Check size={14} color="var(--green)"/> : <Copy size={14}/>}
              </button>
            </div>
            <p style={{ fontSize:12, color:"var(--text2)" }}>
              1. @uzfinx_bot ni Telegramda oching<br/>
              2. Yuqoridagi kodni yuboring<br/>
              3. Tayyor! Bot sizning kompaniyangizga bog'lanadi.
            </p>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={handleTelegramLink}>
            <Send size={15}/> Telegram kod olish
          </button>
        )}
      </div>

      {/* Members */}
      <div className="card" style={{ marginBottom:16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom:16 }}>
          <h3>👥 Jamoa a'zolari</h3>
          {isOwner && (
            <button className="btn btn-primary" style={{ padding:"6px 14px" }}
              onClick={() => setShowInvite(true)}>
              <Plus size={15}/> Taklif qilish
            </button>
          )}
        </div>
        {loading ? (
          <div className="empty-state"><div className="spinner"/></div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {members.map(m => (
              <div key={m.id} style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", background:"var(--bg3)", borderRadius:8,
                border:"1px solid var(--border)"
              }}>
                <div>
                  <div style={{ fontWeight:500 }}>{m.full_name || m.email}</div>
                  <div style={{ fontSize:12, color:"var(--text2)" }}>
                    {m.email}
                    {m.telegram_user_id && <span style={{ marginLeft:8, color:"var(--blue)" }}>✈ Telegram</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    fontSize:11, padding:"3px 8px", borderRadius:20,
                    background: m.role==="owner" ? "var(--amber-dim)" : "var(--blue-dim)",
                    color: m.role==="owner" ? "var(--amber)" : "var(--blue)"
                  }}>
                    {m.role==="owner" ? "👑 Egasi" : "👤 A'zo"}
                  </span>
                  {isOwner && m.user_id !== user?.id && (
                    <button className="btn btn-danger" style={{ padding:"4px 8px" }}
                      onClick={() => handleRemoveMember(m.id)}>
                      <Trash2 size={13}/>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="card" style={{ border:"1px solid var(--red)", marginBottom:16 }}>
        <h3 style={{ marginBottom:10, color:"var(--red)" }}>⚠️ Hisobdan chiqish</h3>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:12 }}>
          {user?.email}
        </p>
        <button className="btn btn-danger" onClick={signOut}>Chiqish</button>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowInvite(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>👤 A'zo taklif qilish</h2>
              <button onClick={() => setShowInvite(false)} style={{ background:"none", border:"none", color:"var(--text2)", cursor:"pointer" }}><X size={20}/></button>
            </div>
            <div className="form-group">
              <label>Email</label>
              <input placeholder="employee@company.uz" value={inviteForm.email}
                onChange={e => setInviteForm(f=>({...f,email:e.target.value}))} autoFocus/>
            </div>
            <div className="form-group">
              <label>Ism (ixtiyoriy)</label>
              <input placeholder="Ism Familiya" value={inviteForm.full_name}
                onChange={e => setInviteForm(f=>({...f,full_name:e.target.value}))}/>
            </div>
            <p style={{ fontSize:12, color:"var(--text2)", marginBottom:14 }}>
              A'zo Telegram botga /link kodi yuborish orqali kompaniyaga qo'shiladi.
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => setShowInvite(false)} style={{ flex:1, justifyContent:"center" }}>Bekor</button>
              <button className="btn btn-primary" onClick={handleInvite} disabled={saving||!inviteForm.email} style={{ flex:1, justifyContent:"center" }}>
                {saving ? "..." : "Taklif yuborish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New company modal */}
      {showNewCo && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowNewCo(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>🏢 Yangi kompaniya</h2>
              <button onClick={() => setShowNewCo(false)} style={{ background:"none", border:"none", color:"var(--text2)", cursor:"pointer" }}><X size={20}/></button>
            </div>
            <div className="form-group">
              <label>Kompaniya nomi</label>
              <input placeholder="Kompaniya nomi" value={newCoName}
                onChange={e => setNewCoName(e.target.value)} autoFocus/>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => setShowNewCo(false)} style={{ flex:1, justifyContent:"center" }}>Bekor</button>
              <button className="btn btn-primary" onClick={handleCreateCompany} disabled={saving||!newCoName.trim()} style={{ flex:1, justifyContent:"center" }}>
                {saving ? "..." : "Yaratish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
