-- =====================================================
-- FinanceBot — Full Schema with Auth & Multi-Company
-- Run this ENTIRE file in Supabase SQL Editor
-- =====================================================

-- 1. Companies table
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Company members (owner + invited users)
CREATE TABLE IF NOT EXISTS company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  full_name TEXT,
  email TEXT,
  telegram_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- 3. Categories (per company)
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#6366f1',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions (per company)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT,
  note TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'dashboard' CHECK (source IN ('telegram', 'dashboard')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_user_id TEXT,
  telegram_message_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Budgets (per company)
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  category_name TEXT,
  amount NUMERIC(15,2) NOT NULL,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Telegram sessions (maps telegram_user_id to company)
CREATE TABLE IF NOT EXISTS telegram_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Helper: get company_ids for the logged-in user
CREATE OR REPLACE FUNCTION get_user_company_ids()
RETURNS SETOF UUID AS $$
  SELECT company_id FROM company_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Companies
CREATE POLICY "company_select" ON companies FOR SELECT
  USING (id IN (SELECT get_user_company_ids()));
CREATE POLICY "company_insert" ON companies FOR INSERT
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "company_update" ON companies FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "company_delete" ON companies FOR DELETE
  USING (owner_id = auth.uid());

-- Members
CREATE POLICY "members_select" ON company_members FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids()));
CREATE POLICY "members_insert" ON company_members FOR INSERT
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "members_delete" ON company_members FOR DELETE
  USING (
    company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Categories
CREATE POLICY "categories_all" ON categories FOR ALL
  USING (company_id IN (SELECT get_user_company_ids()))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

-- Transactions
CREATE POLICY "transactions_all" ON transactions FOR ALL
  USING (company_id IN (SELECT get_user_company_ids()))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

-- Budgets
CREATE POLICY "budgets_all" ON budgets FOR ALL
  USING (company_id IN (SELECT get_user_company_ids()))
  WITH CHECK (company_id IN (SELECT get_user_company_ids()));

-- Telegram sessions: service role bypasses RLS anyway
CREATE POLICY "telegram_sessions_all" ON telegram_sessions FOR ALL
  USING (true) WITH CHECK (true);

-- =====================================================
-- Seed default categories for a new company
-- =====================================================
CREATE OR REPLACE FUNCTION seed_default_categories(p_company_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO categories (company_id, name, type, icon, color, is_default) VALUES
    (p_company_id, 'Sotuvdan tushum',       'income',  '🛒', '#10b981', true),
    (p_company_id, 'Xizmat korsatish',      'income',  '🔧', '#6366f1', true),
    (p_company_id, 'Investitsiya',           'income',  '📈', '#f59e0b', true),
    (p_company_id, 'Boshqa daromad',         'income',  '💰', '#06b6d4', true),
    (p_company_id, 'Ish haqi',               'expense', '👥', '#ef4444', true),
    (p_company_id, 'Ijara',                  'expense', '🏢', '#f97316', true),
    (p_company_id, 'Transport Logistika',    'expense', '🚚', '#8b5cf6', true),
    (p_company_id, 'Marketing Reklama',      'expense', '📢', '#ec4899', true),
    (p_company_id, 'Kommunal xizmatlar',     'expense', '💡', '#14b8a6', true),
    (p_company_id, 'Soliq Tolov',            'expense', '🏛️', '#6b7280', true),
    (p_company_id, 'Xom ashyo Material',     'expense', '📦', '#a16207', true),
    (p_company_id, 'Boshqa xarajat',         'expense', '💸', '#dc2626', true);
END;
$$ LANGUAGE plpgsql;

-- Trigger: after company created → add owner as member + seed categories
CREATE OR REPLACE FUNCTION on_company_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO company_members (company_id, user_id, role, email)
  VALUES (
    NEW.id,
    NEW.owner_id,
    'owner',
    (SELECT email FROM auth.users WHERE id = NEW.owner_id)
  );
  PERFORM seed_default_categories(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_company_created ON companies;
CREATE TRIGGER trg_company_created
  AFTER INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION on_company_created();
