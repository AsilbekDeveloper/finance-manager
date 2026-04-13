import os
import json
import tempfile
import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
from groq import Groq

load_dotenv()

# ── Clients ──────────────────────────────────────────────────────────────────
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")
TELEGRAM_API = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ── App ───────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    if WEBHOOK_URL:
        async with httpx.AsyncClient() as client:
            await client.post(f"{TELEGRAM_API}/setWebhook",
                              json={"url": f"{WEBHOOK_URL}/webhook"})
    yield

app = FastAPI(title="Finance Manager API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    amount: float
    type: str  # income | expense
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
    name: str
    type: str
    icon: Optional[str] = "💰"
    color: Optional[str] = "#6366f1"

class BudgetCreate(BaseModel):
    category_id: str
    category_name: str
    amount: float
    period: Optional[str] = "monthly"

# ── Helper: Send Telegram message ────────────────────────────────────────────
async def send_message(chat_id: int, text: str, parse_mode: str = "HTML"):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage",
                          json={"chat_id": chat_id, "text": text, "parse_mode": parse_mode})

async def send_message_with_keyboard(chat_id: int, text: str, keyboard: dict):
    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/sendMessage",
                          json={"chat_id": chat_id, "text": text,
                                "parse_mode": "HTML", "reply_markup": keyboard})

# ── Helper: Download Telegram file ───────────────────────────────────────────
async def download_voice(file_id: str) -> bytes:
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{TELEGRAM_API}/getFile?file_id={file_id}")
        file_path = r.json()["result"]["file_path"]
        audio = await client.get(f"https://api.telegram.org/file/bot{TELEGRAM_TOKEN}/{file_path}")
        return audio.content

# ── Helper: Transcribe voice ─────────────────────────────────────────────────
async def transcribe_audio(audio_bytes: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as f:
        f.write(audio_bytes)
        f.flush()
        transcription = groq_client.audio.transcriptions.create(
            file=(f.name, audio_bytes),
            model="whisper-large-v3",
            language="uz",
            response_format="text"
        )
    return transcription

# ── Helper: Parse transaction with Groq LLaMA ────────────────────────────────
async def parse_transaction_intent(text: str, categories: list) -> dict:
    cat_list = "\n".join([f"- {c['name']} ({c['type']}, id: {c['id']})" for c in categories])

    prompt = f"""Siz moliyaviy assistent siz. Foydalanuvchi xabarini tahlil qiling va JSON qaytaring.

Mavjud kategoriyalar:
{cat_list}

Foydalanuvchi xabari: "{text}"

Quyidagi JSON formatida FAQAT JSON qaytaring (boshqa matn yo'q):
{{
  "intent": "add_income" | "add_expense" | "query" | "delete" | "correct" | "unknown",
  "amount": number yoki null,
  "type": "income" | "expense" | null,
  "category_id": "kategoriya id" yoki null,
  "category_name": "kategoriya nomi" yoki null,
  "note": "izoh" yoki null,
  "date": "YYYY-MM-DD" yoki null (bugun: {date.today()}),
  "query_type": "today" | "week" | "month" | "category" | null,
  "needs_clarification": true | false,
  "clarification_question": "savol matni" yoki null,
  "confidence": 0.0-1.0
}}

Qoidalar:
- Miqdor faqat raqam (so'm yoki so'm iborasi bo'lsa ham)
- Agar kategoriya noaniq bo'lsa, eng yaqin kategoriyani tanlang
- "tushum", "kirim", "olindi" = income
- "xarajat", "sarflandi", "to'landi", "chiqim" = expense
- Agar intent aniq bo'lmasa needs_clarification=true"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=500,
    )
    raw = response.choices[0].message.content.strip()
    # Strip markdown if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())

# ── Helper: Generate query response ──────────────────────────────────────────
def format_currency(amount: float) -> str:
    return f"{amount:,.0f} so'm"

async def handle_query(chat_id: int, query_type: str, text: str):
    today = date.today()

    if query_type == "today":
        start = today.isoformat()
        end = today.isoformat()
        period_label = "Bugun"
    elif query_type == "week":
        start = (today - timedelta(days=today.weekday())).isoformat()
        end = today.isoformat()
        period_label = "Bu hafta"
    else:  # month or default
        start = today.replace(day=1).isoformat()
        end = today.isoformat()
        period_label = "Bu oy"

    txns = supabase.table("transactions").select("*")\
        .gte("date", start).lte("date", end).execute()

    rows = txns.data or []
    income = sum(r["amount"] for r in rows if r["type"] == "income")
    expense = sum(r["amount"] for r in rows if r["type"] == "expense")
    net = income - expense

    # Category breakdown
    cat_breakdown = {}
    for r in rows:
        key = r.get("category_name") or "Boshqa"
        cat_breakdown[key] = cat_breakdown.get(key, 0) + r["amount"]

    top_cats = sorted(cat_breakdown.items(), key=lambda x: x[1], reverse=True)[:5]
    cat_text = "\n".join([f"  • {k}: {format_currency(v)}" for k, v in top_cats])

    msg = f"""📊 <b>{period_label} moliyaviy hisobot</b>

💚 Daromad: <b>{format_currency(income)}</b>
🔴 Xarajat: <b>{format_currency(expense)}</b>
{'✅' if net >= 0 else '⚠️'} Sof foyda: <b>{format_currency(net)}</b>

📂 <b>Kategoriyalar bo'yicha:</b>
{cat_text if cat_text else "  Ma'lumot yo'q"}

📝 Jami {len(rows)} ta tranzaksiya"""

    await send_message(chat_id, msg)

# ── Telegram Webhook ─────────────────────────────────────────────────────────
# Store pending confirmations in memory (for simplicity)
pending_transactions = {}

@app.post("/webhook")
async def telegram_webhook(request: Request):
    data = await request.json()

    # Handle callback queries (inline buttons)
    if "callback_query" in data:
        await handle_callback(data["callback_query"])
        return {"ok": True}

    message = data.get("message", {})
    if not message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    user_name = message.get("from", {}).get("first_name", "Do'stim")

    # ── Voice message ─────────────────────────────────────────────────────────
    if "voice" in message:
        await send_message(chat_id, "🎤 Ovoz xabar qabul qilindi, tahlil qilinmoqda...")
        try:
            audio = await download_voice(message["voice"]["file_id"])
            text = await transcribe_audio(audio)
            await send_message(chat_id, f"📝 <i>Transkriptsiya: {text}</i>")
            await process_text_intent(chat_id, text, user_name, message.get("message_id"))
        except Exception as e:
            await send_message(chat_id, f"❌ Ovozni qayta ishlashda xato: {str(e)}")
        return {"ok": True}

    # ── Text message ──────────────────────────────────────────────────────────
    text = message.get("text", "").strip()
    if not text:
        return {"ok": True}

    if text == "/start":
        await send_message(chat_id, f"""👋 Salom, <b>{user_name}</b>!

🏦 <b>Biznes Moliya Menejeri</b>ga xush kelibsiz!

Men sizga quyidagilarda yordam beraman:

💰 <b>Daromad qo'shish:</b>
<i>"500,000 so'm sotuvdan tushdi"</i>

💸 <b>Xarajat qo'shish:</b>
<i>"Xodimga 2,000,000 ish haqi berdik"</i>

📊 <b>Hisobot so'rash:</b>
<i>"Bu oy qancha sarfladik?"</i>
<i>"Bugungi daromad qancha?"</i>

🗣 Ovoz xabar ham yubora olasiz!

/help — yordam
/today — bugungi hisobot
/month — oylik hisobot""")
        return {"ok": True}

    if text == "/help":
        await send_message(chat_id, """📚 <b>Buyruqlar:</b>

/today — bugungi hisobot
/week — haftalik hisobot
/month — oylik hisobot
/categories — kategoriyalar ro'yxati

<b>Misol xabarlar:</b>
• "1,500,000 so'm xizmat ko'rsatishdan tushdi"
• "Transport uchun 200,000 to'ladik"
• "Bu hafta qancha sarfladik?"
• "Logistikaga qancha ketdi bu oy?"

Ovoz xabar ham ishlaydi! 🎤""")
        return {"ok": True}

    if text == "/today":
        await handle_query(chat_id, "today", text)
        return {"ok": True}

    if text == "/week":
        await handle_query(chat_id, "week", text)
        return {"ok": True}

    if text == "/month":
        await handle_query(chat_id, "month", text)
        return {"ok": True}

    if text == "/categories":
        cats = supabase.table("categories").select("*").order("type").execute()
        income_cats = [c for c in cats.data if c["type"] == "income"]
        expense_cats = [c for c in cats.data if c["type"] == "expense"]
        msg = "📂 <b>Kategoriyalar:</b>\n\n💚 <b>Daromad:</b>\n"
        msg += "\n".join([f"  {c['icon']} {c['name']}" for c in income_cats])
        msg += "\n\n🔴 <b>Xarajat:</b>\n"
        msg += "\n".join([f"  {c['icon']} {c['name']}" for c in expense_cats])
        await send_message(chat_id, msg)
        return {"ok": True}

    await process_text_intent(chat_id, text, user_name, message.get("message_id"))
    return {"ok": True}


async def process_text_intent(chat_id: int, text: str, user_name: str, message_id: int = None):
    try:
        cats = supabase.table("categories").select("*").execute()
        categories = cats.data or []

        parsed = await parse_transaction_intent(text, categories)
        intent = parsed.get("intent")

        # ── Query intent ──────────────────────────────────────────────────────
        if intent == "query":
            await handle_query(chat_id, parsed.get("query_type", "month"), text)
            return

        # ── Add transaction ───────────────────────────────────────────────────
        if intent in ("add_income", "add_expense"):
            amount = parsed.get("amount")
            if not amount:
                await send_message(chat_id, "❓ Miqdorni tushunmadim. Iltimos, aniqroq yozing.\n\nMasalan: <i>\"500,000 so'm tushdi\"</i>")
                return

            if parsed.get("needs_clarification") and not parsed.get("category_id"):
                # Ask for category
                cat_type = "income" if intent == "add_income" else "expense"
                filtered = [c for c in categories if c["type"] == cat_type]
                buttons = [[{"text": f"{c['icon']} {c['name']}", "callback_data": f"cat_{c['id']}_{c['name']}_{amount}_{cat_type}"}]
                           for c in filtered[:8]]
                keyboard = {"inline_keyboard": buttons}
                pending_transactions[str(chat_id)] = parsed
                await send_message_with_keyboard(
                    chat_id,
                    f"💭 <b>{format_currency(amount)}</b> — qaysi kategoriya?\n\nKategoriyani tanlang:",
                    keyboard
                )
                return

            # Save transaction
            tx_data = {
                "amount": amount,
                "type": "income" if intent == "add_income" else "expense",
                "category_id": parsed.get("category_id"),
                "category_name": parsed.get("category_name") or "Boshqa",
                "note": parsed.get("note"),
                "date": parsed.get("date") or date.today().isoformat(),
                "source": "telegram",
                "telegram_user_id": str(chat_id),
                "telegram_message_id": message_id,
            }
            result = supabase.table("transactions").insert(tx_data).execute()
            tx_id = result.data[0]["id"] if result.data else None

            emoji = "💚" if tx_data["type"] == "income" else "🔴"
            type_text = "Daromad" if tx_data["type"] == "income" else "Xarajat"

            confirm_msg = f"""{emoji} <b>{type_text} saqlandi!</b>

💵 Miqdor: <b>{format_currency(amount)}</b>
📂 Kategoriya: {tx_data['category_name']}
📅 Sana: {tx_data['date']}"""
            if tx_data.get("note"):
                confirm_msg += f"\n📝 Izoh: {tx_data['note']}"

            keyboard = {"inline_keyboard": [[
                {"text": "✏️ O'zgartirish", "callback_data": f"edit_{tx_id}"},
                {"text": "🗑 O'chirish", "callback_data": f"delete_{tx_id}"}
            ]]}
            await send_message_with_keyboard(chat_id, confirm_msg, keyboard)
            return

        # ── Unknown ───────────────────────────────────────────────────────────
        await send_message(chat_id, """🤔 Xabaringizni tushunmadim.

Quyidagi formatda yozing:
• <i>"500,000 so'm daromad bo'ldi"</i>
• <i>"Xodimga 1,500,000 ish haqi berdik"</i>
• <i>"Bu oy qancha sarfladik?"</i>

Yoki /help buyrug'ini bosing.""")

    except Exception as e:
        await send_message(chat_id, f"⚠️ Xato yuz berdi: {str(e)[:100]}\n\nIltimos qayta urinib ko'ring.")


async def handle_callback(callback: dict):
    chat_id = callback["from"]["id"]
    data = callback["data"]
    callback_id = callback["id"]

    async with httpx.AsyncClient() as client:
        await client.post(f"{TELEGRAM_API}/answerCallbackQuery",
                          json={"callback_query_id": callback_id})

    if data.startswith("cat_"):
        parts = data.split("_", 4)
        # cat_{id}_{name}_{amount}_{type}
        _, cat_id, cat_name, amount_str, tx_type = parts
        amount = float(amount_str)
        tx_data = {
            "amount": amount,
            "type": tx_type,
            "category_id": cat_id,
            "category_name": cat_name,
            "date": date.today().isoformat(),
            "source": "telegram",
            "telegram_user_id": str(chat_id),
        }
        result = supabase.table("transactions").insert(tx_data).execute()
        tx_id = result.data[0]["id"] if result.data else None
        emoji = "💚" if tx_type == "income" else "🔴"
        type_text = "Daromad" if tx_type == "income" else "Xarajat"
        keyboard = {"inline_keyboard": [[
            {"text": "✏️ O'zgartirish", "callback_data": f"edit_{tx_id}"},
            {"text": "🗑 O'chirish", "callback_data": f"delete_{tx_id}"}
        ]]}
        await send_message_with_keyboard(
            chat_id,
            f"{emoji} <b>{type_text} saqlandi!</b>\n\n💵 {format_currency(amount)}\n📂 {cat_name}\n📅 {date.today()}",
            keyboard
        )

    elif data.startswith("delete_"):
        tx_id = data.replace("delete_", "")
        supabase.table("transactions").delete().eq("id", tx_id).execute()
        await send_message(chat_id, "✅ Tranzaksiya o'chirildi.")

    elif data.startswith("edit_"):
        tx_id = data.replace("edit_", "")
        await send_message(chat_id, f"✏️ O'zgartirish uchun dashboard dan foydalaning.\n\nID: <code>{tx_id}</code>")


# ── REST API for Dashboard ────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "time": datetime.now().isoformat()}

# Transactions CRUD
@app.get("/api/transactions")
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    query = supabase.table("transactions").select("*, categories(icon, color)")
    if start_date:
        query = query.gte("date", start_date)
    if end_date:
        query = query.lte("date", end_date)
    if type:
        query = query.eq("type", type)
    if category_id:
        query = query.eq("category_id", category_id)
    query = query.order("date", desc=True).order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    return {"data": result.data, "count": len(result.data)}

@app.post("/api/transactions")
async def create_transaction(tx: TransactionCreate):
    data = tx.dict()
    data["date"] = data["date"] or date.today().isoformat()
    result = supabase.table("transactions").insert(data).execute()
    return result.data[0]

@app.put("/api/transactions/{tx_id}")
async def update_transaction(tx_id: str, tx: TransactionUpdate):
    data = {k: v for k, v in tx.dict().items() if v is not None}
    data["updated_at"] = datetime.now().isoformat()
    result = supabase.table("transactions").update(data).eq("id", tx_id).execute()
    return result.data[0]

@app.delete("/api/transactions/{tx_id}")
async def delete_transaction(tx_id: str):
    supabase.table("transactions").delete().eq("id", tx_id).execute()
    return {"success": True}

# Categories CRUD
@app.get("/api/categories")
async def get_categories(type: Optional[str] = None):
    query = supabase.table("categories").select("*").order("is_default", desc=True).order("name")
    if type:
        query = query.eq("type", type)
    result = query.execute()
    return {"data": result.data}

@app.post("/api/categories")
async def create_category(cat: CategoryCreate):
    result = supabase.table("categories").insert(cat.dict()).execute()
    return result.data[0]

@app.delete("/api/categories/{cat_id}")
async def delete_category(cat_id: str):
    supabase.table("categories").delete().eq("id", cat_id).execute()
    return {"success": True}

# Dashboard overview stats
@app.get("/api/stats/overview")
async def get_overview(period: str = "month"):
    today = date.today()
    if period == "today":
        start = today
        prev_start = today - timedelta(days=1)
        prev_end = today - timedelta(days=1)
    elif period == "week":
        start = today - timedelta(days=today.weekday())
        prev_start = start - timedelta(days=7)
        prev_end = start - timedelta(days=1)
    else:  # month
        start = today.replace(day=1)
        prev_month = (start - timedelta(days=1)).replace(day=1)
        prev_start = prev_month
        prev_end = start - timedelta(days=1)

    def get_stats(s, e):
        r = supabase.table("transactions").select("amount,type")\
            .gte("date", s.isoformat()).lte("date", e.isoformat()).execute()
        rows = r.data or []
        income = sum(x["amount"] for x in rows if x["type"] == "income")
        expense = sum(x["amount"] for x in rows if x["type"] == "expense")
        return {"income": income, "expense": expense, "net": income - expense, "count": len(rows)}

    current = get_stats(start, today)
    previous = get_stats(prev_start, prev_end)

    # Category breakdown for current period
    cat_result = supabase.table("transactions").select("amount,type,category_name")\
        .gte("date", start.isoformat()).lte("date", today.isoformat()).execute()

    cat_breakdown = {}
    for row in (cat_result.data or []):
        key = row.get("category_name") or "Boshqa"
        if key not in cat_breakdown:
            cat_breakdown[key] = {"name": key, "income": 0, "expense": 0}
        cat_breakdown[key][row["type"]] += row["amount"]

    return {
        "current": current,
        "previous": previous,
        "period": period,
        "categories": list(cat_breakdown.values()),
        "start_date": start.isoformat(),
        "end_date": today.isoformat()
    }

# Analytics
@app.get("/api/stats/analytics")
async def get_analytics(period: str = "month", year: int = None):
    today = date.today()
    if not year:
        year = today.year

    # Monthly trend for the year
    monthly = []
    for m in range(1, 13):
        s = date(year, m, 1)
        if m == 12:
            e = date(year, 12, 31)
        else:
            e = date(year, m + 1, 1) - timedelta(days=1)
        r = supabase.table("transactions").select("amount,type")\
            .gte("date", s.isoformat()).lte("date", e.isoformat()).execute()
        rows = r.data or []
        monthly.append({
            "month": s.strftime("%b"),
            "month_num": m,
            "income": sum(x["amount"] for x in rows if x["type"] == "income"),
            "expense": sum(x["amount"] for x in rows if x["type"] == "expense"),
        })

    # Category breakdown current month
    start = today.replace(day=1)
    cat_result = supabase.table("transactions").select("amount,type,category_name")\
        .gte("date", start.isoformat()).lte("date", today.isoformat()).execute()

    cat_expense = {}
    cat_income = {}
    for row in (cat_result.data or []):
        key = row.get("category_name") or "Boshqa"
        if row["type"] == "expense":
            cat_expense[key] = cat_expense.get(key, 0) + row["amount"]
        else:
            cat_income[key] = cat_income.get(key, 0) + row["amount"]

    return {
        "monthly_trend": monthly,
        "expense_by_category": [{"name": k, "value": v} for k, v in sorted(cat_expense.items(), key=lambda x: -x[1])],
        "income_by_category": [{"name": k, "value": v} for k, v in sorted(cat_income.items(), key=lambda x: -x[1])],
        "year": year
    }

# Budgets
@app.get("/api/budgets")
async def get_budgets():
    result = supabase.table("budgets").select("*").execute()
    today = date.today()
    start = today.replace(day=1)

    budgets = result.data or []
    for b in budgets:
        spent_r = supabase.table("transactions").select("amount")\
            .eq("category_name", b["category_name"])\
            .eq("type", "expense")\
            .gte("date", start.isoformat()).execute()
        spent = sum(x["amount"] for x in (spent_r.data or []))
        b["spent"] = spent
        b["remaining"] = b["amount"] - spent
        b["percentage"] = min(round((spent / b["amount"]) * 100, 1), 100) if b["amount"] > 0 else 0

    return {"data": budgets}

@app.post("/api/budgets")
async def create_budget(b: BudgetCreate):
    result = supabase.table("budgets").insert(b.dict()).execute()
    return result.data[0]

@app.delete("/api/budgets/{budget_id}")
async def delete_budget(budget_id: str):
    supabase.table("budgets").delete().eq("id", budget_id).execute()
    return {"success": True}
