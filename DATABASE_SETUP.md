
# Complete Database Setup for AMAYA Orders Manager

**Copy and paste this entire SQL script into your Supabase SQL Editor and run it all at once:**

```sql
-- ============================
-- 1. HELPER FUNCTIONS (MUST BE CREATED FIRST)
-- ============================
-- Helper function to get user's company ID
CREATE OR REPLACE FUNCTION public.user_company_id() 
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.user_role() 
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================
-- 2. COMPANIES TABLE
-- ============================
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Only managers can create companies" ON companies;
DROP POLICY IF EXISTS "Only company creators can update companies" ON companies;

CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    created_by = auth.uid() OR 
    id = public.user_company_id()
  );

CREATE POLICY "Only managers can create companies" ON companies
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Only company creators can update companies" ON companies
  FOR UPDATE USING (created_by = auth.uid());

-- ============================
-- 3. PROFILES TABLE
-- ============================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255),
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'worker')) DEFAULT 'worker',
  company_id UUID REFERENCES companies(id),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

CREATE POLICY "Users can view own and company profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid() OR 
    (company_id IS NOT NULL AND company_id = public.user_company_id())
  );

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================
-- 4. INVITATIONS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'worker')),
  company_id UUID REFERENCES companies(id) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can view invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Managers can create invitations for their company" ON invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations they're using" ON invitations;

CREATE POLICY "Managers can view invitations for their company" ON invitations
  FOR SELECT USING (
    company_id = public.user_company_id() AND public.user_role() = 'manager'
  );

CREATE POLICY "Managers can create invitations for their company" ON invitations
  FOR INSERT WITH CHECK (
    company_id = public.user_company_id() AND public.user_role() = 'manager'
  );

CREATE POLICY "Anyone can view invitations by code" ON invitations
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update invitations they're using" ON invitations
  FOR UPDATE USING (used_by = auth.uid() OR invited_by = auth.uid());

-- ============================
-- 5. ORDERS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  client_name VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  category VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  specs JSONB DEFAULT '{}',
  assignment_type VARCHAR(20) DEFAULT 'general' CHECK (assignment_type IN ('general', 'specific')),
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view orders in their company" ON orders;
DROP POLICY IF EXISTS "Managers can insert orders in their company" ON orders;
DROP POLICY IF EXISTS "Managers can update orders in their company" ON orders;

CREATE POLICY "Users can view orders in their company" ON orders
  FOR SELECT USING (
    company_id = public.user_company_id()
  );

CREATE POLICY "Managers can insert orders in their company" ON orders
  FOR INSERT WITH CHECK (
    company_id = public.user_company_id() AND public.user_role() = 'manager'
  );

CREATE POLICY "Managers can update orders in their company" ON orders
  FOR UPDATE USING (
    company_id = public.user_company_id() AND public.user_role() = 'manager'
  );

-- ============================
-- 6. ORDER ASSIGNMENTS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  marked_done BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(order_id, worker_id)
);

ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assignments in their company" ON order_assignments;
DROP POLICY IF EXISTS "Managers can assign orders" ON order_assignments;
DROP POLICY IF EXISTS "Workers can update their assignments" ON order_assignments;
DROP POLICY IF EXISTS "Managers can update assignments in their company" ON order_assignments;

CREATE POLICY "Users can view assignments in their company" ON order_assignments
  FOR SELECT USING (
    worker_id = auth.uid() OR
    assigned_by = auth.uid() OR
    public.user_role() = 'manager'
  );

CREATE POLICY "Managers can assign orders" ON order_assignments
  FOR INSERT WITH CHECK (
    public.user_role() = 'manager'
  );

CREATE POLICY "Workers can update their assignments" ON order_assignments
  FOR UPDATE USING (worker_id = auth.uid());

CREATE POLICY "Managers can update assignments in their company" ON order_assignments
  FOR UPDATE USING (
    public.user_role() = 'manager' OR worker_id = auth.uid()
  );

-- ============================
-- 7. AUTOMATIC PROFILE CREATION TRIGGER
-- ============================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user ID: %', NEW.id;
  
  -- Insert a basic profile for the new user
  -- We'll update this later via the client with metadata
  BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
    );
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.email;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile for user %: % - %', NEW.email, SQLSTATE, SQLERRM;
    -- Don't fail the auth signup if profile creation fails
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================
-- 8. UPDATED_AT TRIGGERS
-- ============================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON companies;
DROP TRIGGER IF EXISTS handle_updated_at ON profiles;
DROP TRIGGER IF EXISTS handle_updated_at ON orders;

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================
-- 9. IMPROVED RLS POLICIES FOR SIGNUP
-- ============================

-- Allow users to insert their own profile during signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id OR 
    -- Allow service role to insert profiles (for triggers)
    auth.role() = 'service_role'
  );

-- Allow users to update their own profile even without company_id initially
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id OR
    auth.role() = 'service_role'
  );

-- ============================
-- 10. COMPANY MANAGEMENT FUNCTION
-- ============================
CREATE OR REPLACE FUNCTION public.create_company_and_update_profile(
  company_name TEXT,
  user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  RAISE NOTICE 'Creating company % for user %', company_name, user_id;
  
  -- Create the company
  INSERT INTO companies (name, created_by)
  VALUES (company_name, user_id)
  RETURNING id INTO new_company_id;
  
  -- Update user profile with company_id and manager role
  UPDATE profiles 
  SET company_id = new_company_id, role = 'manager'
  WHERE id = user_id;
  
  RAISE NOTICE 'Company created with ID: %', new_company_id;
  RETURN new_company_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating company: % - %', SQLSTATE, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- 11. INVITATION PROCESSING FUNCTION  
-- ============================
CREATE OR REPLACE FUNCTION public.process_invitation_and_update_profile(
  invitation_code TEXT,
  user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  invitation_record RECORD;
  target_company_id UUID;
BEGIN
  RAISE NOTICE 'Processing invitation % for user %', invitation_code, user_id;
  
  -- Get and validate invitation
  SELECT * INTO invitation_record
  FROM invitations 
  WHERE code = invitation_code 
    AND is_used = FALSE 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation code: %', invitation_code;
  END IF;
  
  target_company_id := invitation_record.company_id;
  
  -- Mark invitation as used
  UPDATE invitations 
  SET is_used = TRUE, used_by = user_id, used_at = NOW()
  WHERE code = invitation_code;
  
  -- Update user profile
  UPDATE profiles 
  SET company_id = target_company_id, role = invitation_record.role
  WHERE id = user_id;
  
  RAISE NOTICE 'Invitation processed. User joined company: %', target_company_id;
  RETURN target_company_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error processing invitation: % - %', SQLSTATE, SQLERRM;
  RAISE;
END;
$$ LANGUAGE plpgsql;
```

## Instructions:

1. **Go to your Supabase Dashboard** → https://supabase.com/dashboard
2. **Select your project** (tkikolzmecscgnbkyqrd)
3. **Go to SQL Editor** (in the left sidebar)
4. **Copy and paste the entire SQL script above**
5. **Click "Run"** to execute all the commands

After running this script, your database will be fully set up and ready to use!


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their company"
ON profiles FOR SELECT USING (
  id = auth.uid() OR 
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT WITH CHECK (id = auth.uid());


-- ============================
-- Orders Table
-- ============================
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  client_name VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  category VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  specs JSONB DEFAULT '{}'::jsonb,
  assignment_type VARCHAR(20) DEFAULT 'general' CHECK (assignment_type IN ('general', 'specific')),
  company_id UUID REFERENCES companies(id) NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  image_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view orders in their company"
ON orders FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Managers can insert orders in their company"
ON orders FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

CREATE POLICY "Managers can update orders in their company"
ON orders FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);


-- ============================
-- Order Assignments Table
-- ============================
CREATE TABLE IF NOT EXISTS order_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) NOT NULL,
  marked_done BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(order_id, worker_id)
);

ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments in their company"
ON order_assignments FOR SELECT USING (
  worker_id = auth.uid() OR
  assigned_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
      AND p2.id = worker_id 
      AND p1.company_id = p2.company_id
  )
);

CREATE POLICY "Managers can assign orders"
ON order_assignments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

CREATE POLICY "Workers can update their assignments"
ON order_assignments FOR UPDATE USING (worker_id = auth.uid());

CREATE POLICY "Managers can update assignments in their company"
ON order_assignments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p1, profiles p2 
    WHERE p1.id = auth.uid() 
      AND p1.role = 'manager'
      AND p2.id = worker_id 
      AND p1.company_id = p2.company_id
  )
);


-- ============================
-- Invitations Table
-- ============================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'worker')),
  company_id UUID REFERENCES companies(id) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view invitations for their company"
ON invitations FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

CREATE POLICY "Managers can create invitations for their company"
ON invitations FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

CREATE POLICY "Anyone can view invitations by code"
ON invitations FOR SELECT USING (TRUE);

CREATE POLICY "Users can update invitations they're using"
ON invitations FOR UPDATE USING (used_by = auth.uid() OR invited_by = auth.uid());


-- ============================
-- Buy List Table
-- ============================
CREATE TABLE IF NOT EXISTS buy_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(50),
  estimated_cost DECIMAL(10,2),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'received')),
  order_id UUID REFERENCES orders(id),
  company_id UUID REFERENCES companies(id) NOT NULL,
  added_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE buy_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view buy list in their company"
ON buy_list FOR SELECT USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can add to buy list in their company"
ON buy_list FOR INSERT WITH CHECK (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update buy list in their company"
ON buy_list FOR UPDATE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);


-- ============================
-- Auto-Profile Creation Trigger
-- ============================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, company_id, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================
-- Handle Updated At Trigger
-- ============================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
BEGIN
  PERFORM 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_companies';
  IF NOT FOUND THEN
    CREATE TRIGGER handle_updated_at_companies BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  PERFORM 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_profiles';
  IF NOT FOUND THEN
    CREATE TRIGGER handle_updated_at_profiles BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  PERFORM 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_orders';
  IF NOT FOUND THEN
    CREATE TRIGGER handle_updated_at_orders BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;

  PERFORM 1 FROM pg_trigger WHERE tgname = 'handle_updated_at_buy_list';
  IF NOT FOUND THEN
    CREATE TRIGGER handle_updated_at_buy_list BEFORE UPDATE ON buy_list
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


-- ============================
-- Storage Bucket for Order Images
-- ============================
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-images', 'order-images', TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload order images"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'order-images' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can view order images in their company"
ON storage.objects FOR SELECT USING (
  bucket_id = 'order-images' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their uploaded images"
ON storage.objects FOR UPDATE USING (
  bucket_id = 'order-images' AND owner = auth.uid()
);

CREATE POLICY "Users can delete their uploaded images"
ON storage.objects FOR DELETE USING (
  bucket_id = 'order-images' AND owner = auth.uid()
);
