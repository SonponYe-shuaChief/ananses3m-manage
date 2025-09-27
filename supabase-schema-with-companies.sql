-- ========================================
-- Enhanced Anansesɛm Orders Manager Database Schema
-- WITH COMPANIES TABLE
-- ========================================
-- Run this in Supabase SQL Editor in sequence.
-- ========================================

-- ========================================
-- STEP 1. MAIN TABLES (WITH COMPANIES)
-- ========================================

-- COMPANIES TABLE (New!)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  website TEXT,
  logo_url TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
  max_users INTEGER DEFAULT 5,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name) -- Company names must be unique
);

-- PROFILES TABLE (Updated to reference companies)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'manager', 'worker')) DEFAULT 'worker',
  job_title TEXT,
  avatar_url TEXT,
  is_company_owner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- COMPANY INVITATIONS TABLE (New!)
CREATE TABLE IF NOT EXISTS company_invitations (
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

-- ORDERS TABLE (Updated to reference companies)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')) DEFAULT 'new',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT,
  image_urls TEXT[],
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ORDER ASSIGNMENTS TABLE (Updated)
CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id),
  starred BOOLEAN DEFAULT FALSE,
  notes TEXT,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id, worker_id)
);

-- BUY LIST TABLE (Updated to reference companies)
CREATE TABLE IF NOT EXISTS buy_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  estimated_cost DECIMAL(10,2),
  category TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  added_by UUID REFERENCES profiles(id),
  bought BOOLEAN DEFAULT FALSE,
  bought_by UUID REFERENCES profiles(id),
  bought_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(company_id, item_name) -- prevent duplicates per company
);

-- ========================================
-- STEP 2. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buy_list ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3. RLS POLICIES
-- ========================================

-- COMPANIES POLICIES
CREATE POLICY "Users can read their own company" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() AND p.company_id = companies.id
    )
  );

CREATE POLICY "Company owners can update their company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = companies.id 
        AND p.is_company_owner = true
    )
  );

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read profiles in their company" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = profiles.company_id
    )
  );

-- COMPANY INVITATIONS POLICIES
CREATE POLICY "Admins/Managers can read company invitations" ON company_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can create invitations" ON company_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

-- ORDERS POLICIES
CREATE POLICY "Users can read orders in their company" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = orders.company_id
    )
  );

CREATE POLICY "Managers/Admins can manage orders in their company" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = orders.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

-- ORDER ASSIGNMENTS POLICIES
CREATE POLICY "Users can read assignments in their company" ON order_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN orders o ON o.company_id = p.company_id
      WHERE p.id = auth.uid() 
        AND o.id = order_assignments.order_id
    )
  );

CREATE POLICY "Workers can update their own starred assignments" ON order_assignments
  FOR UPDATE USING (auth.uid() = worker_id)
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Managers/Admins can manage assignments in their company" ON order_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN orders o ON o.company_id = p.company_id
      WHERE p.id = auth.uid() 
        AND p.role IN ('admin', 'manager')
        AND o.id = order_assignments.order_id
    )
  );

-- BUY LIST POLICIES
CREATE POLICY "Users can read buy list in their company" ON buy_list
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = buy_list.company_id
    )
  );

CREATE POLICY "Users can manage buy list in their company" ON buy_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = buy_list.company_id
    )
  );

-- ========================================
-- STEP 4. FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to create company and profile for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Check if this is a signup with company invitation
  IF NEW.raw_user_meta_data ? 'company_id' THEN
    -- User was invited to existing company
    INSERT INTO public.profiles (
      id, 
      company_id, 
      full_name, 
      role,
      is_company_owner
    )
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'company_id')::UUID,
      NEW.raw_user_meta_data->>'full_name',
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
      false
    );
  ELSE
    -- Create new company for new user
    INSERT INTO public.companies (name, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      'Auto-created company'
    )
    RETURNING id INTO new_company_id;
    
    -- Create profile as company owner
    INSERT INTO public.profiles (
      id, 
      company_id, 
      full_name, 
      role,
      is_company_owner
    )
    VALUES (
      NEW.id,
      new_company_id,
      NEW.raw_user_meta_data->>'full_name',
      'admin',
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to accept company invitation
CREATE OR REPLACE FUNCTION public.accept_company_invitation(
  invitation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record
  FROM company_invitations
  WHERE id = invitation_id
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update user's profile with company
  UPDATE profiles
  SET 
    company_id = invitation_record.company_id,
    role = invitation_record.role
  WHERE id = auth.uid();
  
  -- Mark invitation as accepted
  UPDATE company_invitations
  SET accepted_at = NOW()
  WHERE id = invitation_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 5. STORAGE BUCKETS & POLICIES
-- ========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('order-images', 'order-images', true),
  ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Order images policies
CREATE POLICY "Users can upload order images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'order-images');

CREATE POLICY "Anyone can view order images" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-images');

CREATE POLICY "Users can update own uploaded images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'order-images' 
    AND auth.role() = 'authenticated'
  );

-- Company logos policies
CREATE POLICY "Company owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- ========================================
-- STEP 6. REALTIME + INDEXES
-- ========================================

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE buy_list;
ALTER PUBLICATION supabase_realtime ADD TABLE company_invitations;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(is_company_owner);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_worker_id ON order_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_company_id ON buy_list(company_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_bought ON buy_list(bought);
CREATE INDEX IF NOT EXISTS idx_invitations_company_email ON company_invitations(company_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON company_invitations(expires_at);

-- ========================================
-- STEP 7. SAMPLE DATA (OPTIONAL)
-- ========================================

-- Insert some sample companies (optional - remove in production)
-- INSERT INTO companies (name, description, industry) VALUES
--   ('Acme Corp', 'Leading provider of innovative solutions', 'Technology'),
--   ('BuildRight Ltd', 'Construction and project management', 'Construction'),
--   ('Creative Studio', 'Design and marketing agency', 'Creative');