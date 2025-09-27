-- ========================================
-- NEW TABLES ONLY - Companies Architecture
-- ========================================
-- Run these if you want to add company functionality to existing schema
-- ========================================

-- 1. COMPANIES TABLE
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  max_users INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. COMPANY INVITATIONS TABLE  
CREATE TABLE company_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'manager', 'worker')) DEFAULT 'worker',
  invited_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- 3. ADD COMPANY_ID TO EXISTING TABLES
ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE orders ADD COLUMN company_id UUID REFERENCES companies(id);  
ALTER TABLE buy_list ADD COLUMN company_id UUID REFERENCES companies(id);

-- 4. ENABLE RLS ON NEW TABLES
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- 5. BASIC RLS POLICIES
CREATE POLICY "company_select" ON companies FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = companies.id)
);

CREATE POLICY "invitations_select" ON company_invitations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.company_id = company_invitations.company_id)
);

-- 6. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE company_invitations;

-- 7. INDEXES
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_orders_company_id ON orders(company_id);
CREATE INDEX idx_buy_list_company_id ON buy_list(company_id);