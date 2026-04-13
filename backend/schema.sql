-- Run this in Supabase SQL Editor

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'dashboard' CHECK (source IN ('telegram', 'dashboard')),
  telegram_user_id TEXT,
  telegram_message_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budgets table (bonus feature)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT,
  amount NUMERIC(15,2) NOT NULL,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS but allow all for now (single company)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all" ON budgets FOR ALL USING (true);

-- Default categories for Uzbek SMB
INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Sotuvdan tushum', 'income', '🛒', '#10b981', true),
  ('Xizmat ko''rsatish', 'income', '🔧', '#6366f1', true),
  ('Investitsiya', 'income', '📈', '#f59e0b', true),
  ('Boshqa daromad', 'income', '💰', '#06b6d4', true),
  ('Ish haqi', 'expense', '👥', '#ef4444', true),
  ('Ijara', 'expense', '🏢', '#f97316', true),
  ('Transport / Logistika', 'expense', '🚚', '#8b5cf6', true),
  ('Marketing / Reklama', 'expense', '📢', '#ec4899', true),
  ('Kommunal xizmatlar', 'expense', '💡', '#14b8a6', true),
  ('Soliq / To''lov', 'expense', '🏛️', '#6b7280', true),
  ('Xom ashyo / Material', 'expense', '📦', '#a16207', true),
  ('Boshqa xarajat', 'expense', '💸', '#dc2626', true);
