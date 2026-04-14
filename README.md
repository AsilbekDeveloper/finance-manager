# 💼 FinanceBot — Biznes Moliya Menejeri

Telegram bot + Web Dashboard. Har bir kompaniya uchun alohida hisob va ma'lumotlar.

---

## 🚀 O'rnatish (ketma-ket bajaring)

### 1. Supabase — eski jadvallarni o'chiring, yangisini yarating

**MUHIM:** Agar oldin schema yugurtirilgan bo'lsa, avval eski jadvallarni o'chiring:

```sql
-- Supabase SQL Editor da avval shu ni yugurtiring:
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS telegram_sessions CASCADE;
DROP TABLE IF EXISTS company_members CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP FUNCTION IF EXISTS get_user_company_ids CASCADE;
DROP FUNCTION IF EXISTS seed_default_categories CASCADE;
DROP FUNCTION IF EXISTS on_company_created CASCADE;
```

Keyin `backend/schema.sql` faylini to'liq joylashtiring va **Run** bosing.

### 2. Supabase — service_role key oling

Settings → API → **service_role** (secret) key ni copy qiling.

### 3. Supabase — telegram_link_code ustuni qo'shing

```sql
ALTER TABLE company_members ADD COLUMN IF NOT EXISTS telegram_link_code TEXT;
```

### 4. Railway — Backend deploy

**Environment Variables:**
```
GROQ_API_KEY=gsk_IqCAr3EgsBA7eJH...
SUPABASE_URL=https://uqnmvanmucgvngvbgjqa.supabase.co
SUPABASE_KEY=eyJhbGci...          (anon key)
SUPABASE_SERVICE_KEY=eyJhbGci... (service_role key — YANGI!)
TELEGRAM_BOT_TOKEN=8746323835:AAE...
WEBHOOK_URL=https://YOUR-APP.up.railway.app
FRONTEND_URL=https://YOUR-APP.vercel.app
```

Root directory: `backend`

### 5. Vercel — Frontend deploy

**Environment Variables:**
```
REACT_APP_API_URL=https://YOUR-RAILWAY-APP.up.railway.app
REACT_APP_SUPABASE_URL=https://uqnmvanmucgvngvbgjqa.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGci...  (anon key)
```

Root directory: `frontend`

---

## 👤 Foydalanish tartibi

### Yangi kompaniya:
1. `/register` → email + parol
2. Kompaniya nomi kiriting
3. Dashboard tayyor!

### Telegram bog'lash:
1. **Sozlamalar** → **Telegram kod olish**
2. Kodni `@uzfinx_bot` ga yuboring: `/link YOUR_CODE`

### Jamoa a'zosi qo'shish:
1. **Sozlamalar** → **Taklif qilish** → email kiriting
2. Link code chiqadi → a'zoga yuboring
3. A'zo `/link CODE` yuborgach bog'lanadi

---

## 🗂 Loyiha strukturasi

```
finance-manager/
├── backend/
│   ├── main.py           FastAPI + bot + API
│   ├── schema.sql        Supabase SQL (auth+RLS)
│   ├── requirements.txt
│   └── .env
└── frontend/
    └── src/
        ├── context/AuthContext.js
        ├── pages/auth/   Login, Register, CreateCompany
        ├── pages/        Overview, Transactions, Analytics,
        │                 Categories, Budgets, Settings
        └── lib/api.js
```

## 📋 Product Brief

**Kim uchun:** O'zbekistondagi kichik va o'rta biznes egalari.
**Nima hal qiladi:** Har bir kompaniya o'z ma'lumotlari bilan alohida ishlaydi; Telegram orqali ovoz/matn xabar yuborib tranzaksiya qo'shiladi.
**V2:** Bank SMS auto-parse, multi-currency, mobil ilova, PDF hisobotlar.
