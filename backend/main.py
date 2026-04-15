import os, json, tempfile
from datetime import datetime, date, timedelta
from typing import Optional
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

load_dotenv()

# Clients
_supa_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(os.getenv("SUPABASE_URL"), _supa_key)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL    = os.getenv("WEBHOOK_URL", "")
TG             = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if WEBHOOK_URL:
        async with httpx.AsyncClient() as c:
            await c.post(f"{TG}/setWebhook", json={"url": f"{WEBHOOK_URL}/webhook"})
    yield

app = FastAPI(title="FinanceBot API", lifespan=lifespan)

# 🔥 To'g'rilangan CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://finance-manager-gamma-gray.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

# ── Auth middleware ───────────────────────────────────────────────────────────
async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = auth_header.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")
    try:
        user_resp = supabase.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"id": user_resp.user.id, "email": user_resp.user.email, "token": token}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Auth failed: {str(e)[:80]}")

# Qolgan barcha kodlaringiz shu yerda qoladi...

# ── Pydantic Models ───────────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    name: str

class MemberInvite(BaseModel):
    email: str
    full_name: Optional[str] = None

class TransactionCreate(BaseModel):
    company_id: str
    amount: float
    type: str
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None
    source: Optional[str] = "dashboard"

class TransactionUpdate(BaseModel):
    amount: Optional[float] = None
    type: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    note: Optional[str] = None
    date: Optional[str] = None

class CategoryCreate(BaseModel):
    company_id: str
    name: str
    type: str
    icon: Optional[str] = "💰"
    color: Optional[str] = "#6366f1"

class BudgetCreate(BaseModel):
    company_id: str
    category_id: str
    category_name: str
    amount: float
    period: Optional[str] = "monthly"

# ── Currency helper ───────────────────────────────────────────────────────────
def fmt(amount: float) -> str:
    """Format number as Uzbek sum: 1,500,000 so'm"""
    return f"{int(amount):,} so'm".replace(",", " ")

# ── Telegram helpers ──────────────────────────────────────────────────────────
async def tg_send(chat_id: int, text: str, parse_mode="HTML"):
    async with httpx.AsyncClient() as c:
        await c.post(f"{TG}/sendMessage",
                     json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode})

async def tg_send_kb(chat_id: int, text: str, keyboard: dict):
    async with httpx.AsyncClient() as c:
        await c.post(f"{TG}/sendMessage",
                     json={"chat_id": chat_id, "text": text,
                           "parse_mode": "HTML", "reply_markup": keyboard})

async def tg_download_voice(file_id: str) -> bytes:
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{TG}/getFile?file_id={file_id}")
        path = r.json()["result"]["file_path"]
        audio = await c.get(f"https://api.telegram.org/file/bot{TELEGRAM_TOKEN}/{path}")
        return audio.content

async def tg_transcribe(audio_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
        f.write(audio_bytes)
        t = groq_client.audio.transcriptions.create(
            file=(f.name, audio_bytes),
            model="whisper-large-v3",
            language="uz",
            response_format="text"
        )
    return t

async def ai_parse(text: str, categories: list) -> dict:
    cat_list = "\n".join([f"- {c['name']} ({c['type']}, id: {c['id']})" for c in categories])
    prompt = f"""Siz moliyaviy assistent siz. Foydalanuvchi xabarini tahlil qiling.

Mavjud kategoriyalar:
{cat_list}

Foydalanuvchi xabari: "{text}"

FAQAT JSON qaytaring:
{{
  "intent": "add_income"|"add_expense"|"query"|"delete"|"unknown",
  "amount": number|null,
  "type": "income"|"expense"|null,
  "category_id": "id"|null,
  "category_name": "nom"|null,
  "note": "izoh"|null,
  "date": "YYYY-MM-DD"|null,
  "query_type": "today"|"week"|"month"|null,
  "needs_clarification": true|false,
  "confidence": 0.0-1.0
}}

Bugun: {date.today()}
Qoidalar:
- "tushum","kirim","olindi","kelib tushdi" = income
- "xarajat","sarflandi","toladik","chiqim","berdik" = expense
- Miqdor faqat raqam (so'm iboralarini olib tashlang)"""

    r = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1, max_tokens=400
    )
    raw = r.choices[0].message.content.strip()
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"): raw = raw[4:]
    return json.loads(raw.strip())

# ── Telegram session helpers ──────────────────────────────────────────────────
def get_session(telegram_user_id: str) -> Optional[dict]:
    r = supabase.table("telegram_sessions").select("*").eq("telegram_user_id", telegram_user_id).execute()
    return r.data[0] if r.data else None

def get_or_prompt_session(chat_id: int, telegram_user_id: str) -> Optional[str]:
    """Returns company_id or None (if not linked)."""
    s = get_session(str(telegram_user_id))
    return s["company_id"] if s else None

# ── Query helper ──────────────────────────────────────────────────────────────
async def handle_query(chat_id: int, query_type: str, company_id: str):
    today = date.today()
    if query_type == "today":
        start = end = today
        label = "Bugun"
    elif query_type == "week":
        start = today - timedelta(days=today.weekday())
        end = today; label = "Bu hafta"
    else:
        start = today.replace(day=1)
        end = today; label = "Bu oy"

    r = supabase.table("transactions").select("*")\
        .eq("company_id", company_id)\
        .gte("date", start.isoformat()).lte("date", end.isoformat()).execute()
    rows = r.data or []
    income  = sum(x["amount"] for x in rows if x["type"] == "income")
    expense = sum(x["amount"] for x in rows if x["type"] == "expense")
    net     = income - expense

    cats = {}
    for row in rows:
        k = row.get("category_name") or "Boshqa"
        cats[k] = cats.get(k, 0) + row["amount"]
    top = sorted(cats.items(), key=lambda x: -x[1])[:5]
    cat_lines = "\n".join([f"  • {k}: {fmt(v)}" for k, v in top]) or "  —"

    await tg_send(chat_id, f"""📊 <b>{label} hisobot</b>

💚 Daromad:  <b>{fmt(income)}</b>
🔴 Xarajat:  <b>{fmt(expense)}</b>
{'✅' if net >= 0 else '⚠️'} Sof:     <b>{fmt(net)}</b>

📂 <b>Kategoriyalar:</b>
{cat_lines}

📝 Jami {len(rows)} ta tranzaksiya""")

# ── Telegram webhook ──────────────────────────────────────────────────────────
@app.post("/webhook")
async def webhook(req: Request):
    data = await req.json()

    if "callback_query" in data:
        await handle_callback(data["callback_query"])
        return {"ok": True}

    msg = data.get("message", {})
    if not msg:
        return {"ok": True}

    chat_id   = msg["chat"]["id"]
    tg_uid    = str(msg["from"]["id"])
    user_name = msg["from"].get("first_name", "Do'stim")
    text      = msg.get("text", "").strip()

    # ── /start ─────────────────────────────────────────────────────────────
    if text == "/start":
        session = get_session(tg_uid)
        if session:
            co = supabase.table("companies").select("name").eq("id", session["company_id"]).execute()
            co_name = co.data[0]["name"] if co.data else "Kompaniya"
            await tg_send(chat_id, f"""👋 Salom, <b>{user_name}</b>!

✅ Siz <b>{co_name}</b> kompaniyasiga bog'langansiz.

Nima qila olasiz:
💰 "500 000 so'm sotuvdan tushdi"
💸 "Xodimga 2 000 000 ish haqi berdik"
📊 "Bu oy qancha sarfladik?"

/today  /week  /month  /help""")
        else:
            await tg_send(chat_id, f"""👋 Salom, <b>{user_name}</b>!

🔗 Bot ishlatish uchun avval <b>dashboard</b>dan Telegram akkauntingizni bog'lang.

1️⃣ Dashboard ga kiring
2️⃣ <b>Sozlamalar</b> → <b>Telegram bog'lash</b>
3️⃣ Sizga <b>maxsus kod</b> beriladi
4️⃣ Kodni shu yerga yuboring: /link SIZNING_KOD

<i>Dashboard: {os.getenv('FRONTEND_URL', 'https://your-app.vercel.app')}</i>""")
        return {"ok": True}

    # ── /link CODE ─────────────────────────────────────────────────────────
    if text.startswith("/link "):
        code = text.split(" ", 1)[1].strip()
        r = supabase.table("company_members").select("*").eq("telegram_link_code", code).execute()
        if not r.data:
            await tg_send(chat_id, "❌ Kod noto'g'ri yoki muddati o'tgan. Dashboard dan yangi kod oling.")
            return {"ok": True}
        member = r.data[0]
        # Save session
        supabase.table("telegram_sessions").upsert({
            "telegram_user_id": tg_uid,
            "telegram_username": msg["from"].get("username"),
            "company_id": member["company_id"]
        }).execute()
        # Mark member's telegram
        supabase.table("company_members").update({
            "telegram_user_id": tg_uid,
            "telegram_link_code": None
        }).eq("id", member["id"]).execute()
        co = supabase.table("companies").select("name").eq("id", member["company_id"]).execute()
        await tg_send(chat_id, f"✅ <b>{co.data[0]['name']}</b> kompaniyasiga muvaffaqiyatli bog'landingiz!\n\nEndi tranzaksiyalar yozishingiz mumkin.")
        return {"ok": True}

    # ── Check session ───────────────────────────────────────────────────────
    company_id = get_or_prompt_session(chat_id, tg_uid)
    if not company_id:
        await tg_send(chat_id, "🔗 Avval dashboard dan Telegram akkauntingizni bog'lang.\n/start ni bosing.")
        return {"ok": True}

    # ── Commands ────────────────────────────────────────────────────────────
    if text == "/help":
        await tg_send(chat_id, """📚 <b>Buyruqlar:</b>
/today  — bugungi hisobot
/week   — haftalik hisobot
/month  — oylik hisobot
/categories — kategoriyalar

<b>Misol xabarlar:</b>
• "1 500 000 so'm xizmat ko'rsatishdan tushdi"
• "Transport uchun 200 000 to'ladik"
• "Bu hafta qancha sarfladik?"

🎤 Ovoz xabar ham ishlaydi!""")
        return {"ok": True}

    if text == "/today":
        await handle_query(chat_id, "today", company_id); return {"ok": True}
    if text == "/week":
        await handle_query(chat_id, "week", company_id); return {"ok": True}
    if text == "/month":
        await handle_query(chat_id, "month", company_id); return {"ok": True}

    if text == "/categories":
        cats = supabase.table("categories").select("*").eq("company_id", company_id).order("type").execute()
        inc  = [c for c in cats.data if c["type"] == "income"]
        exp  = [c for c in cats.data if c["type"] == "expense"]
        msg_text  = "📂 <b>Kategoriyalar:</b>\n\n💚 <b>Daromad:</b>\n"
        msg_text += "\n".join([f"  {c['icon']} {c['name']}" for c in inc])
        msg_text += "\n\n🔴 <b>Xarajat:</b>\n"
        msg_text += "\n".join([f"  {c['icon']} {c['name']}" for c in exp])
        await tg_send(chat_id, msg_text); return {"ok": True}

    # ── Voice ───────────────────────────────────────────────────────────────
    if "voice" in msg:
        await tg_send(chat_id, "🎤 Ovoz qabul qilindi, tahlil qilinmoqda...")
        try:
            audio = await tg_download_voice(msg["voice"]["file_id"])
            text  = await tg_transcribe(audio)
            await tg_send(chat_id, f"📝 <i>{text}</i>")
            await process_intent(chat_id, text, company_id, msg.get("message_id"))
        except Exception as e:
            await tg_send(chat_id, f"❌ Xato: {str(e)[:120]}")
        return {"ok": True}

    # ── Text ────────────────────────────────────────────────────────────────
    if text:
        await process_intent(chat_id, text, company_id, msg.get("message_id"))
    return {"ok": True}


async def process_intent(chat_id: int, text: str, company_id: str, message_id=None):
    try:
        cats   = supabase.table("categories").select("*").eq("company_id", company_id).execute()
        parsed = await ai_parse(text, cats.data or [])
        intent = parsed.get("intent")

        if intent == "query":
            await handle_query(chat_id, parsed.get("query_type") or "month", company_id)
            return

        if intent in ("add_income", "add_expense"):
            amount = parsed.get("amount")
            if not amount:
                await tg_send(chat_id, "❓ Miqdorni tushunmadim.\n\n<i>Masalan: \"500 000 so'm tushdi\"</i>")
                return

            if not parsed.get("category_id"):
                tx_type  = "income" if intent == "add_income" else "expense"
                filtered = [c for c in (cats.data or []) if c["type"] == tx_type]
                buttons  = [[{"text": f"{c['icon']} {c['name']}",
                              "callback_data": f"cat|{c['id']}|{c['name']}|{amount}|{tx_type}|{company_id}"}]
                            for c in filtered[:8]]
                await tg_send_kb(chat_id,
                    f"💭 <b>{fmt(amount)}</b> — qaysi kategoriya?",
                    {"inline_keyboard": buttons})
                return

            tx = {
                "company_id":   company_id,
                "amount":       amount,
                "type":         "income" if intent == "add_income" else "expense",
                "category_id":  parsed.get("category_id"),
                "category_name":parsed.get("category_name") or "Boshqa",
                "note":         parsed.get("note"),
                "date":         parsed.get("date") or date.today().isoformat(),
                "source":       "telegram",
                "telegram_user_id": str(chat_id),
                "telegram_message_id": message_id,
            }
            res = supabase.table("transactions").insert(tx).execute()
            tx_id = res.data[0]["id"]
            emoji = "💚" if tx["type"] == "income" else "🔴"
            label = "Daromad" if tx["type"] == "income" else "Xarajat"
            confirm = f"""{emoji} <b>{label} saqlandi!</b>

💵 Miqdor:     <b>{fmt(amount)}</b>
📂 Kategoriya: {tx['category_name']}
📅 Sana:       {tx['date']}"""
            if tx.get("note"):
                confirm += f"\n📝 Izoh: {tx['note']}"
            await tg_send_kb(chat_id, confirm, {"inline_keyboard": [[
                {"text": "🗑 O'chirish", "callback_data": f"del|{tx_id}"}
            ]]})
            return

        await tg_send(chat_id, """🤔 Tushunmadim. Misol:
• <i>"500 000 so'm daromad bo'ldi"</i>
• <i>"Xodimga 1 500 000 ish haqi berdik"</i>
• <i>"Bu oy qancha sarfladik?"</i>""")
    except Exception as e:
        await tg_send(chat_id, f"⚠️ Xato: {str(e)[:100]}")


async def handle_callback(cb: dict):
    chat_id = cb["from"]["id"]
    data    = cb["data"]
    async with httpx.AsyncClient() as c:
        await c.post(f"{TG}/answerCallbackQuery", json={"callback_query_id": cb["id"]})

    if data.startswith("cat|"):
        _, cat_id, cat_name, amount_str, tx_type, company_id = data.split("|")
        amount = float(amount_str)
        tx = {
            "company_id":    company_id,
            "amount":        amount,
            "type":          tx_type,
            "category_id":   cat_id,
            "category_name": cat_name,
            "date":          date.today().isoformat(),
            "source":        "telegram",
            "telegram_user_id": str(chat_id),
        }
        res   = supabase.table("transactions").insert(tx).execute()
        tx_id = res.data[0]["id"]
        emoji = "💚" if tx_type == "income" else "🔴"
        label = "Daromad" if tx_type == "income" else "Xarajat"
        await tg_send_kb(chat_id,
            f"{emoji} <b>{label} saqlandi!</b>\n\n💵 {fmt(amount)}\n📂 {cat_name}\n📅 {date.today()}",
            {"inline_keyboard": [[{"text": "🗑 O'chirish", "callback_data": f"del|{tx_id}"}]]}
        )

    elif data.startswith("del|"):
        tx_id = data.split("|")[1]
        supabase.table("transactions").delete().eq("id", tx_id).execute()
        await tg_send(chat_id, "✅ Tranzaksiya o'chirildi.")


# ══════════════════════════════════════════════════════════════════════════════
# REST API  (used by React dashboard)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"status": "ok"}

# ── Auth / Company ────────────────────────────────────────────────────────────

@app.get("/api/companies")
async def list_companies(user: dict = Depends(get_current_user)):
    """Alias for /api/companies/me — prevents 405 errors."""
    r = supabase.table("company_members")        .select("company_id, role, companies(id, name, created_at)")        .eq("user_id", user["id"]).execute()
    return {"data": r.data}
###
@app.post("/api/companies")
async def create_company(body: CompanyCreate, user: dict = Depends(get_current_user)):
    try:
        # 1. Kompaniyani yaratish (RLS uchun created_by qo'shildi)
        comp_res = supabase.table("companies").insert({
            "name": body.name,
            "owner_id": user["id"],
            "created_by": user["id"]
        }).execute()
        
        if not comp_res.data:
            raise HTTPException(status_code=500, detail="Kompaniya yaratishda xatolik yuz berdi")
            
        new_company = comp_res.data[0]

        # 2. MUHIM: Yaratuvchini company_members jadvaliga 'owner' sifatida qo'shish
        # Busiz /api/companies/me endpointi bo'sh qaytadi
        supabase.table("company_members").insert({
            "company_id": new_company["id"],
            "user_id": user["id"],
            "role": "owner",
            "email": user["email"]
        }).execute()

        return new_company
    except Exception as e:
        print(f"[API ERROR] create_company: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
###
@app.get("/api/companies/me")
async def get_my_companies(user: dict = Depends(get_current_user)):
    r = supabase.table("company_members")\
        .select("company_id, role, companies(id, name, created_at)")\
        .eq("user_id", user["id"]).execute()
    return {"data": r.data}

@app.get("/api/companies/{company_id}/members")
async def get_members(company_id: str, user: dict = Depends(get_current_user)):
    r = supabase.table("company_members").select("*").eq("company_id", company_id).execute()
    return {"data": r.data}

@app.post("/api/companies/{company_id}/members/invite")
async def invite_member(company_id: str, body: MemberInvite, user: dict = Depends(get_current_user)):
    """Owner invites a user by email — creates a placeholder member row."""
    # Verify caller is owner
    check = supabase.table("company_members").select("role")\
        .eq("company_id", company_id).eq("user_id", user["id"]).execute()
    if not check.data or check.data[0]["role"] != "owner":
        raise HTTPException(403, "Only owner can invite")

    # Try to find existing auth user by email
    import secrets
    link_code = secrets.token_urlsafe(8)

    # Insert member with placeholder (user_id will be filled on first login)
    r = supabase.table("company_members").insert({
        "company_id":         company_id,
        "user_id":            user["id"],  # temporary; updated on accept
        "role":               "member",
        "email":              body.email,
        "full_name":          body.full_name,
        "telegram_link_code": link_code,
    }).execute()
    return {"data": r.data[0], "link_code": link_code}

@app.delete("/api/companies/{company_id}/members/{member_id}")
async def remove_member(company_id: str, member_id: str, user: dict = Depends(get_current_user)):
    check = supabase.table("company_members").select("role")\
        .eq("company_id", company_id).eq("user_id", user["id"]).execute()
    if not check.data or check.data[0]["role"] != "owner":
        raise HTTPException(403, "Only owner can remove members")
    supabase.table("company_members").delete().eq("id", member_id).execute()
    return {"success": True}

# ── Telegram link code ────────────────────────────────────────────────────────
@app.post("/api/companies/{company_id}/telegram-link")
async def generate_telegram_link(company_id: str, user: dict = Depends(get_current_user)):
    """Generate a link code for the current user to link their Telegram."""
    import secrets
    code = secrets.token_urlsafe(8)
    supabase.table("company_members").update({"telegram_link_code": code})\
        .eq("company_id", company_id).eq("user_id", user["id"]).execute()
    return {"code": code, "bot_username": "uzfinx_bot"}

# Add telegram_link_code column if missing (run once)
# ALTER TABLE company_members ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;

from datetime import date, datetime
from typing import Optional
from fastapi import HTTPException, Depends

# ── Transactions ──────────────────────────────────────────────────────────────

@app.get("/api/transactions")
async def get_transactions(
    company_id: str,
    start_date: Optional[str] = None,
    end_date:   Optional[str] = None,
    type:       Optional[str] = None,
    category_id:Optional[str] = None,
    limit: int = 200, offset: int = 0,
    user: dict = Depends(get_current_user)
):
    # Dastlab so'rovni yaratamiz
    q = supabase.table("transactions").select("*").eq("company_id", company_id)
    
    # Filtrlarni qo'shamiz
    if start_date:   q = q.gte("date", start_date)
    if end_date:     q = q.lte("date", end_date)
    if type:         q = q.eq("type", type)
    if category_id:  q = q.eq("category_id", category_id)
    
    # Tartiblash va limit
    q = q.order("date", desc=True).order("created_at", desc=True).range(offset, offset+limit-1)
    
    try:
        r = q.execute()
        return {"data": r.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tranzaksiyalarni olishda xato: {str(e)}")

@app.post("/api/transactions")
async def create_transaction(tx: TransactionCreate, user: dict = Depends(get_current_user)):
    data = tx.dict()
    
    # 1. Sana bo'lmasa, bugungi sanani qo'shish
    data["date"] = data.get("date") or date.today().isoformat()
    
    # 2. DIQQAT: Agar bazada 'user_id' bo'lsa, quyidagi qatorni ishlating
    # Agar siz SQL editor'da 'created_by' qo'shgan bo'lsangiz, bu qolishi mumkin.
    # Eng xavfsiz yo'li - ikkala ustunga ham user id ni yozish:
    data["created_by"] = user["id"]
    
    try:
        r = supabase.table("transactions").insert(data).execute()
        if not r.data:
            raise HTTPException(status_code=400, detail="Tranzaksiya yaratilmadi (Baza bo'sh qaytdi)")
        return r.data[0]
    except Exception as e:
        # Xatoni aniq ko'rish uchun Railway loglariga chiqaradi
        print(f"DEBUG ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/transactions/{tx_id}")
async def update_transaction(tx_id: str, tx: TransactionUpdate, user: dict = Depends(get_current_user)):
    data = {k: v for k, v in tx.dict().items() if v is not None}
    data["updated_at"] = datetime.now().isoformat()
    
    try:
        # Faqat o'ziga tegishli tranzaksiyani o'zgartira olishi uchun filter (ixtiyoriy)
        r = supabase.table("transactions").update(data).eq("id", tx_id).execute()
        return r.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/transactions/{tx_id}")
async def delete_transaction(tx_id: str, user: dict = Depends(get_current_user)):
    try:
        supabase.table("transactions").delete().eq("id", tx_id).execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Auth / Company ────────────────────────────────────────────────────────────

# main.py ichida create_company funksiyasini mana shunday qoldiring:
@app.post("/api/companies")
async def create_company(body: CompanyCreate, user: dict = Depends(get_current_user)):
    res = supabase.table("companies").insert({
        "name": body.name,
        "owner_id": user["id"],  # Endi bu uuid bo'lib tushadi
        "created_by": user["id"]
    }).execute()
    
    new_comp = res.data[0]
    
    # Member sifatida o'zini qo'shish
    supabase.table("company_members").insert({
        "company_id": new_comp["id"],
        "user_id": user["id"],   # Endi bu uuid bo'lib tushadi
        "role": "owner"
    }).execute()
    
    return new_comp

# ── Categories ────────────────────────────────────────────────────────────────

@app.post("/api/categories")
async def create_category(cat: CategoryCreate, user: dict = Depends(get_current_user)):
    try:
        data = cat.dict()
        data["created_by"] = user["id"]  # RLS uchun foydalanuvchini biriktiramiz
        
        r = supabase.table("categories").insert(data).execute()
        return r.data[0]
    except Exception as e:
        print(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ── Transactions (Eski kodda created_by yetishmayotgan edi) ───────────────────

@app.post("/api/transactions")
async def create_transaction(tx: TransactionCreate, user: dict = Depends(get_current_user)):
    try:
        data = tx.dict()
        data["created_by"] = user["id"]  # RLS uchun foydalanuvchini biriktiramiz
        data["date"] = data.get("date") or date.today().isoformat()
        
        r = supabase.table("transactions").insert(data).execute()
        return r.data[0]
    except Exception as e:
        print(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats/overview")
async def overview(company_id: str, period: str = "month", user: dict = Depends(get_current_user)):
    today = date.today()
    if period == "today":
        start = prev_s = prev_e = today
        prev_s = today - timedelta(days=1); prev_e = today - timedelta(days=1)
    elif period == "week":
        start  = today - timedelta(days=today.weekday())
        prev_s = start - timedelta(days=7); prev_e = start - timedelta(days=1)
    else:
        start  = today.replace(day=1)
        prev_m = (start - timedelta(days=1)).replace(day=1)
        prev_s = prev_m; prev_e = start - timedelta(days=1)

    def stats(s, e):
        r = supabase.table("transactions").select("amount,type")\
            .eq("company_id", company_id).gte("date", s.isoformat()).lte("date", e.isoformat()).execute()
        rows = r.data or []
        inc  = sum(x["amount"] for x in rows if x["type"] == "income")
        exp  = sum(x["amount"] for x in rows if x["type"] == "expense")
        return {"income": inc, "expense": exp, "net": inc-exp, "count": len(rows)}

    cur  = stats(start, today)
    prev = stats(prev_s, prev_e)

    cat_r = supabase.table("transactions").select("amount,type,category_name")\
        .eq("company_id", company_id).gte("date", start.isoformat()).lte("date", today.isoformat()).execute()
    cats = {}
    for row in (cat_r.data or []):
        k = row.get("category_name") or "Boshqa"
        if k not in cats: cats[k] = {"name": k, "income": 0, "expense": 0}
        cats[k][row["type"]] += row["amount"]

    return {"current": cur, "previous": prev, "categories": list(cats.values()),
            "start_date": start.isoformat(), "end_date": today.isoformat()}

@app.get("/api/stats/analytics")
async def analytics(company_id: str, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    today = date.today()
    if not year: year = today.year
    monthly = []
    for m in range(1, 13):
        s = date(year, m, 1)
        e = date(year, 12, 31) if m == 12 else date(year, m+1, 1) - timedelta(days=1)
        r = supabase.table("transactions").select("amount,type")\
            .eq("company_id", company_id).gte("date", s.isoformat()).lte("date", e.isoformat()).execute()
        rows = r.data or []
        monthly.append({
            "month":   s.strftime("%b"),
            "income":  sum(x["amount"] for x in rows if x["type"] == "income"),
            "expense": sum(x["amount"] for x in rows if x["type"] == "expense"),
        })

    start = today.replace(day=1)
    cat_r = supabase.table("transactions").select("amount,type,category_name")\
        .eq("company_id", company_id).gte("date", start.isoformat()).lte("date", today.isoformat()).execute()
    exp_cats = {}; inc_cats = {}
    for row in (cat_r.data or []):
        k = row.get("category_name") or "Boshqa"
        if row["type"] == "expense": exp_cats[k] = exp_cats.get(k,0) + row["amount"]
        else:                        inc_cats[k] = inc_cats.get(k,0) + row["amount"]

    return {
        "monthly_trend":       monthly,
        "expense_by_category": [{"name":k,"value":v} for k,v in sorted(exp_cats.items(), key=lambda x:-x[1])],
        "income_by_category":  [{"name":k,"value":v} for k,v in sorted(inc_cats.items(), key=lambda x:-x[1])],
    }

# ── Budgets ───────────────────────────────────────────────────────────────────

@app.get("/api/budgets")
async def get_budgets(company_id: str, user: dict = Depends(get_current_user)):
    r = supabase.table("budgets").select("*").eq("company_id", company_id).execute()
    today = date.today()
    start = today.replace(day=1)
    budgets = r.data or []
    for b in budgets:
        sp = supabase.table("transactions").select("amount")\
            .eq("company_id", company_id).eq("category_name", b["category_name"])\
            .eq("type", "expense").gte("date", start.isoformat()).execute()
        spent = sum(x["amount"] for x in (sp.data or []))
        b["spent"]      = spent
        b["remaining"]  = b["amount"] - spent
        b["percentage"] = min(round((spent/b["amount"])*100, 1), 100) if b["amount"] > 0 else 0
    return {"data": budgets}

@app.post("/api/budgets")
async def create_budget(b: BudgetCreate, user: dict = Depends(get_current_user)):
    r = supabase.table("budgets").insert(b.dict()).execute()
    return r.data[0]

@app.delete("/api/budgets/{budget_id}")
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    supabase.table("budgets").delete().eq("id", budget_id).execute()
    return {"success": True}
