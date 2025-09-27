-- ========================================
-- Anansesɛm Orders Manager Database Schema
-- ========================================
-- Run this in Supabase SQL Editor in sequence.
-- Step 1: Tables
-- Step 2: Enable RLS
-- Step 3: RLS Policies
-- Step 4: Functions & Triggers
-- Step 5: Storage
-- Step 6: Realtime + Indexes
-- ========================================

-- ========================================
-- STEP 1. MAIN TABLES
-- ========================================

-- PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  organization_id UUID, -- nullable at creation, set later
  full_name TEXT,
  role TEXT CHECK (role IN ('manager', 'worker')) DEFAULT 'worker',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  due_date DATE,
  status TEXT CHECK (status IN ('new', 'in_progress', 'completed')) DEFAULT 'new',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category TEXT,
  image_urls TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ORDER ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id, worker_id)
);

-- BUY LIST TABLE
CREATE TABLE IF NOT EXISTS buy_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  item_name TEXT NOT NULL,
  added_by UUID REFERENCES profiles(id),
  bought BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, item_name) -- prevent duplicates per org
);

-- ========================================
-- STEP 2. ENABLE ROW LEVEL SECURITY
-- ========================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buy_list ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 3. RLS POLICIES
-- ========================================

-- PROFILES POLICIES
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can read all profiles in their org" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.role = 'manager' 
        AND p.organization_id = profiles.organization_id
    )
  );

-- ORDERS POLICIES
CREATE POLICY "Users can read orders in their organization" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.organization_id = orders.organization_id
    )
  );

CREATE POLICY "Managers can manage orders in their org" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.role = 'manager' 
        AND p.organization_id = orders.organization_id
    )
  );

-- ORDER ASSIGNMENTS POLICIES
CREATE POLICY "Users can read assignments in their organization" ON order_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN orders o ON o.organization_id = p.organization_id
      WHERE p.id = auth.uid() 
        AND o.id = order_assignments.order_id
    )
  );

CREATE POLICY "Workers can update their own starred assignments" ON order_assignments
  FOR UPDATE USING (auth.uid() = worker_id)
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Managers can manage assignments in their org" ON order_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      JOIN orders o ON o.organization_id = p.organization_id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager' 
        AND o.id = order_assignments.order_id
    )
  );

-- BUY LIST POLICIES
CREATE POLICY "Users can read buy list in their organization" ON buy_list
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.organization_id = buy_list.organization_id
    )
  );

CREATE POLICY "Users can manage buy list in their org" ON buy_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.organization_id = buy_list.organization_id
    )
  );

-- ========================================
-- STEP 4. FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to automatically create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================
-- STEP 5. STORAGE BUCKETS & POLICIES
-- ========================================

-- Create storage bucket for order images
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to insert into bucket
CREATE POLICY "Users can upload order images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'order-images');

-- Allow everyone to view order images (public bucket)
CREATE POLICY "Anyone can view order images" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-images');

-- Allow uploader to update their own files
-- (App should name files with user_id prefix for enforcement)
CREATE POLICY "Users can update own uploaded images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'order-images' 
    AND auth.role() = 'authenticated'
  );

-- ========================================
-- STEP 6. REALTIME + INDEXES
-- ========================================

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE buy_list;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_assignments_order_id ON order_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_assignments_worker_id ON order_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_org_id ON buy_list(organization_id);
CREATE INDEX IF NOT EXISTS idx_buy_list_bought ON buy_list(bought);