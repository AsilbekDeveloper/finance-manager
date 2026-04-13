# 💼 FinanceBot — Biznes Moliya Menejeri

Kichik va o'rta bizneslar uchun **Telegram bot + Web Dashboard** moliya tizimi.

Telegram orqali ovoz yoki matn xabar yuboring → tranzaksiya avtomatik saqlanadi → dashboardda real vaqtda ko'ring.

---

## 🎯 Imkoniyatlar

### Telegram Bot
- 🎤 **Ovoz xabarlar** — Whisper AI orqali avtomatik transkriptsiya
- 🤖 **AI tahlil** — LLaMA 3.3 70B orqali intentsiyani aniqlash
- ➕ Daromad / xarajat qo'shish (matn yoki ovoz)
- 📊 Hisobot so'rash (`/today`, `/week`, `/month`)
- ✏️ Tranzaksiyani o'zgartirish va o'chirish
- 🗂 Kategoriyalar ro'yxati (`/categories`)
- ❓ Noaniq input bo'lsa — aqlli savol beradi

### Web Dashboard (5 sahifa)
- **Overview** — asosiy ko'rsatkichlar, trendlar, tez qo'shish
- **Tranzaksiyalar** — filter, qidiruv, inline tahrirlash
- **Analitika** — oylik trend, pie chart, kategoriya tahlili
- **Kategoriyalar** — CRUD, ikonka va rang tanlash
- **Byudjet** ⭐ — xarajat limiti, progress bar, ogohlantirish

---

## 🚀 O'rnatish

### 1. Reponi clone qiling
```bash
git clone https://github.com/AsilbekDeveloper/finance-manager.git
cd finance-manager
```

### 2. Supabase — Database sozlash
1. [supabase.com](https://supabase.com) ga kiring
2. Loyihangizni oching → **SQL Editor**
3. `backend/schema.sql` faylini nusxalab, SQL Editorga joylashtiring
4. **Run** tugmasini bosing

### 3. Backend — Railway deploy

1. [railway.app](https://railway.app) ga kiring
2. **New Project** → **Deploy from GitHub repo**
3. `finance-manager` reponi tanlang
4. **Root directory** ni `backend` ga o'zgartiring
5. **Variables** bo'limiga quyidagi env o'zgaruvchilarni kiriting:

```
GROQ_API_KEY=your_groq_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
TELEGRAM_BOT_TOKEN=your_bot_token
WEBHOOK_URL=https://YOUR-APP.up.railway.app
```

6. Deploy bo'lgach, URL ni copy qiling (masalan: `https://finance-manager-production.up.railway.app`)
7. `WEBHOOK_URL` ni shu URL ga yangilang

### 4. Frontend — Vercel deploy

1. [vercel.com](https://vercel.com) ga kiring
2. **New Project** → GitHub dan `finance-manager` reponi import qiling
3. **Root directory**: `frontend`
4. **Environment Variables**:
```
REACT_APP_API_URL=https://YOUR-RAILWAY-APP.up.railway.app
```
5. **Deploy** tugmasini bosing

---

## 💬 Bot ishlatish

Bot username: `@YourBotUsername`

**Tranzaksiya qo'shish:**
```
"500,000 so'm sotuvdan tushdi"
"Xodimga 2,000,000 ish haqi berdik"
"Transport uchun 150,000 to'ladik"
```

**Hisobot so'rash:**
```
"Bu oy qancha sarfladik?"
"Bugungi daromad?"
/today   /week   /month
```

**Boshqa buyruqlar:**
```
/start      — boshlash
/help       — yordam
/categories — kategoriyalar
```

---

## 🗂 Loyiha strukturasi

```
finance-manager/
├── backend/
│   ├── main.py          # FastAPI + Telegram bot
│   ├── requirements.txt
│   ├── schema.sql       # Supabase SQL
│   ├── railway.toml     # Railway config
│   └── .env             # Environment variables
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.js
    │   ├── index.js
    │   ├── index.css
    │   ├── lib/api.js
    │   ├── components/
    │   │   ├── Layout.js
    │   │   └── TransactionModal.js
    │   └── pages/
    │       ├── Overview.js
    │       ├── Transactions.js
    │       ├── Analytics.js
    │       ├── Categories.js
    │       └── Budgets.js
    ├── package.json
    └── vercel.json
```

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, Uvicorn |
| Bot | python-telegram-bot |
| AI/Voice | Groq (Whisper + LLaMA 3.3 70B) |
| Database | Supabase (PostgreSQL) |
| Frontend | React 18, React Router |
| Charts | Recharts |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## 📦 Mahalliy ishga tushirish (local)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

---

## 📋 Product Brief

**Kim uchun:** O'zbekistondagi kichik va o'rta biznes egalari va moliya jamoalari.

**Nima muammoni hal qiladi:** WhatsApp, daftar yoki Excel orqali sochilgan moliyaviy ma'lumotlarni birlashtirib, real vaqtda biznes moliyasini ko'rish imkonini beradi.

**V2 nima bo'ladi:** Ko'p foydalanuvchi (rol asosida), bank API integratsiyasi, avtomatik hisob-kitob, va mobil ilova.

---

## ➕ Qo'shimcha 3 kun bo'lsa nima qilardim

Multi-tenant (ko'p kompaniya) tizim qurardim: har bir biznes o'z ma'lumotlarini alohida ko'rsin. Bank SMS larini avtomatik parse qilish (Kapital Bank, Ipak Yo'li) qo'shardim — foydalanuvchi hech narsa kiritmay, SMS kelib tranzaksiya o'zi saqlansin. Telegram guruh botini qo'shardim, ya'ni butun jamoa bitta guruhda ishlaydi va har kim tranzaksiya qo'sha oladi. Oylik moliyaviy hisobotni PDF qilib email yuborish ham qo'shardim.
