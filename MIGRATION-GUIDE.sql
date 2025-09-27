-- ========================================
-- MIGRATION GUIDE: FROM ORGANIZATION_ID TO COMPANIES ARCHITECTURE
-- ========================================
-- This SQL shows the complete migration from the old schema to the new one
-- Run these commands in sequence in your Supabase SQL Editor
-- ========================================

-- ========================================
-- STEP 1: CREATE NEW COMPANIES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS companies (
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

-- ========================================
-- STEP 2: CREATE COMPANY INVITATIONS TABLE
-- ========================================

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

-- ========================================
-- STEP 3: MODIFY EXISTING PROFILES TABLE
-- ========================================

-- Add new columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS is_company_owner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update role enum to include 'admin'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'manager', 'worker'));

-- ========================================
-- STEP 4: MODIFY EXISTING ORDERS TABLE
-- ========================================

-- Add company_id column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add new fields for enhanced order management
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Update status enum to include 'cancelled'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled'));

-- Update priority enum to include 'urgent'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_priority_check;
ALTER TABLE orders ADD CONSTRAINT orders_priority_check 
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- ========================================
-- STEP 5: MODIFY EXISTING ORDER_ASSIGNMENTS TABLE
-- ========================================

-- Add new columns to order_assignments
ALTER TABLE order_assignments 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT NOW();

-- Rename created_at to assigned_at for clarity (if you want)
-- ALTER TABLE order_assignments RENAME COLUMN created_at TO assigned_at;

-- ========================================
-- STEP 6: MODIFY EXISTING BUY_LIST TABLE
-- ========================================

-- Add company_id column to buy_list
ALTER TABLE buy_list 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add enhanced buy list fields
ALTER TABLE buy_list 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS bought_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS bought_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- ========================================
-- STEP 7: DATA MIGRATION
-- ========================================

-- Create a default company for existing data
INSERT INTO companies (id, name, description, subscription_tier)
VALUES (
  'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID,
  'Default Company',
  'Auto-migrated from organization-based system',
  'free'
) ON CONFLICT (id) DO NOTHING;

-- Migrate existing profiles to use company_id instead of organization_id
UPDATE profiles SET 
  company_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID,
  is_company_owner = (role = 'manager') -- Make existing managers company owners
WHERE company_id IS NULL;

-- Migrate existing orders to use company_id
UPDATE orders SET 
  company_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID
WHERE company_id IS NULL;

-- Migrate existing buy_list items to use company_id
UPDATE buy_list SET 
  company_id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID
WHERE company_id IS NULL;

-- ========================================
-- STEP 8: DROP OLD ORGANIZATION_ID COLUMNS (OPTIONAL)
-- ========================================

-- WARNING: Only run these after confirming data migration worked correctly!
-- You may want to keep these columns for a while as backup

-- ALTER TABLE profiles DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE orders DROP COLUMN IF EXISTS organization_id;
-- ALTER TABLE buy_list DROP COLUMN IF EXISTS organization_id;

-- ========================================
-- STEP 9: UPDATE RLS POLICIES
-- ========================================

-- Drop old policies that reference organization_id
DROP POLICY IF EXISTS "Users can read orders in their organization" ON orders;
DROP POLICY IF EXISTS "Managers can create/update/delete orders in their org" ON orders;
DROP POLICY IF EXISTS "Users can read buy list in their organization" ON buy_list;
DROP POLICY IF EXISTS "Users can create/update buy list items in their org" ON buy_list;

-- Enable RLS on new tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_invitations ENABLE ROW LEVEL SECURITY;

-- Companies policies
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

-- Enhanced profiles policies
DROP POLICY IF EXISTS "Managers can read all profiles in their org" ON profiles;
CREATE POLICY "Users can read profiles in their company" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = profiles.company_id
    )
  );

-- Company invitations policies
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

-- Updated orders policies for company_id
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

-- Updated buy_list policies for company_id
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
-- STEP 10: UPDATE FUNCTIONS AND TRIGGERS
-- ========================================

-- Updated function for new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  invitation_record RECORD;
BEGIN
  -- Check if user was invited to existing company
  IF NEW.raw_user_meta_data ? 'invitation_code' THEN
    -- Find valid invitation
    SELECT * INTO invitation_record
    FROM company_invitations
    WHERE id = (NEW.raw_user_meta_data->>'invitation_code')::UUID
      AND expires_at > NOW()
      AND accepted_at IS NULL;
    
    IF FOUND THEN
      -- Join existing company
      INSERT INTO public.profiles (
        id, 
        company_id, 
        full_name, 
        role,
        is_company_owner
      )
      VALUES (
        NEW.id,
        invitation_record.company_id,
        NEW.raw_user_meta_data->>'full_name',
        invitation_record.role,
        false
      );
      
      -- Mark invitation as accepted
      UPDATE company_invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;
    ELSE
      -- Invalid invitation, create new company
      INSERT INTO public.companies (name, description)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        'Auto-created company'
      )
      RETURNING id INTO new_company_id;
      
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
  ELSE
    -- Create new company for new user
    INSERT INTO public.companies (name, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      'Auto-created company'
    )
    RETURNING id INTO new_company_id;
    
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
      COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite users to company
CREATE OR REPLACE FUNCTION public.invite_user_to_company(
  user_email TEXT,
  target_role TEXT,
  invitation_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
  invitation_id UUID;
BEGIN
  -- Get current user's company
  SELECT company_id INTO user_company_id
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Create invitation
  INSERT INTO company_invitations (company_id, email, role, invited_by)
  VALUES (user_company_id, user_email, target_role, auth.uid())
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- STEP 11: CREATE STORAGE BUCKETS
-- ========================================

-- Company logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Company logos policies
CREATE POLICY "Company owners can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-logos'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Anyone can view company logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'company-logos');

-- ========================================
-- STEP 12: ADD REALTIME AND INDEXES
-- ========================================

-- Enable Realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE companies;
ALTER PUBLICATION supabase_realtime ADD TABLE company_invitations;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_owner ON profiles(is_company_owner);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_company_id ON buy_list(company_id);
CREATE INDEX IF NOT EXISTS idx_invitations_company_email ON company_invitations(company_id, email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON company_invitations(expires_at);

-- Update existing indexes that might reference organization_id
-- DROP INDEX IF EXISTS idx_orders_organization_id;
-- DROP INDEX IF EXISTS idx_buy_list_organization_id;