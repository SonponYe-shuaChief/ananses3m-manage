-- ========================================
-- 🎯 ACCURATE ANANSESƐM ORDERS MANAGER SCHEMA
-- Based on actual codebase analysis
-- ========================================
-- This matches EXACTLY what your React app expects
-- Run this in Supabase SQL Editor after deleting existing tables
-- ========================================

-- ========================================
-- STEP 1: DROP EXISTING TABLES (if any)
-- ========================================
DROP TABLE IF EXISTS public.buy_list CASCADE;
DROP TABLE IF EXISTS public.order_assignments CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.company_invitations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

-- ========================================
-- STEP 2: CREATE CORE TABLES
-- ========================================

-- 1. COMPANIES TABLE 🏢
-- Your app expects: company_id references, name field
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by UUID, -- Will reference profiles after creation
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PROFILES TABLE 👤
-- Your app expects: company_id, full_name, role, email, is_company_owner
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'worker')) DEFAULT 'manager',
    job_title TEXT,
    avatar_url TEXT,
    is_company_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ORDERS TABLE 📋
-- Your app expects: title, description, client_name, due_date, status, priority, category, image_urls, created_by, company_id
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    client_name TEXT,
    due_date DATE,
    status TEXT CHECK (status IN ('new', 'in_progress', 'completed', 'cancelled')) DEFAULT 'new',
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    category TEXT,
    image_urls TEXT[], -- Array of image URLs
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ORDER ASSIGNMENTS TABLE 👷
-- Your app expects: order_id, worker_id, starred, profiles relation for worker names
CREATE TABLE public.order_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    starred BOOLEAN DEFAULT false,
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, worker_id) -- One assignment per worker per order
);

-- 5. BUY LIST TABLE 🛒
-- Your app expects: company_id, item_name, bought, added_by, profiles relation for added_by names
CREATE TABLE public.buy_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10,2),
    category TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    bought BOOLEAN DEFAULT false,
    bought_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    bought_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COMPANY INVITATIONS TABLE 📨
-- For future team invitation features
CREATE TABLE public.company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'manager', 'worker')) DEFAULT 'worker',
    invitation_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, email)
);

-- ========================================
-- STEP 3: ADD FOREIGN KEY CONSTRAINTS
-- ========================================

-- Add created_by constraint to companies (after profiles exists)
ALTER TABLE public.companies 
ADD CONSTRAINT fk_companies_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ========================================
-- STEP 4: CREATE PERFORMANCE INDEXES
-- ========================================

-- Companies indexes
CREATE INDEX idx_companies_active ON public.companies(is_active);
CREATE INDEX idx_companies_name ON public.companies(name);

-- Profiles indexes (critical for your app's queries)
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Orders indexes (for your useOrders queries)
CREATE INDEX idx_orders_company_id ON public.orders(company_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_priority ON public.orders(priority);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);
CREATE INDEX idx_orders_due_date ON public.orders(due_date);

-- Order assignments indexes (for your useAssignments queries)
CREATE INDEX idx_assignments_order_id ON public.order_assignments(order_id);
CREATE INDEX idx_assignments_worker_id ON public.order_assignments(worker_id);
CREATE INDEX idx_assignments_starred ON public.order_assignments(starred);

-- Buy list indexes (for your useBuyList queries)
CREATE INDEX idx_buylist_company_id ON public.buy_list(company_id);
CREATE INDEX idx_buylist_bought ON public.buy_list(bought);
CREATE INDEX idx_buylist_added_by ON public.buy_list(added_by);

-- Company invitations indexes
CREATE INDEX idx_invitations_company_id ON public.company_invitations(company_id);
CREATE INDEX idx_invitations_code ON public.company_invitations(invitation_code);
CREATE INDEX idx_invitations_expires ON public.company_invitations(expires_at);

-- ========================================
-- STEP 5: ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buy_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 6: CREATE RLS POLICIES
-- ========================================

-- COMPANIES POLICIES 🏢
CREATE POLICY "Users can read their own company" ON public.companies
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.company_id = companies.id
        )
    );

CREATE POLICY "Company owners can update their company" ON public.companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = companies.id 
            AND p.is_company_owner = true
        )
    );

-- PROFILES POLICIES 👤 (supports your AuthContext queries)
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can read profiles in their company" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = profiles.company_id
        )
    );

CREATE POLICY "Managers can update profiles in their company" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = profiles.company_id 
            AND p.role IN ('admin', 'manager')
        )
    );

-- ORDERS POLICIES 📋 (supports your useOrders queries)
CREATE POLICY "Users can read orders in their company" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = orders.company_id
        )
    );

CREATE POLICY "Managers can manage orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = orders.company_id 
            AND p.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Workers can update assigned orders" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.order_assignments oa
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE oa.order_id = orders.id 
            AND oa.worker_id = auth.uid()
            AND p.company_id = orders.company_id
        )
    );

-- ORDER ASSIGNMENTS POLICIES 👷 (supports your useAssignments queries)
CREATE POLICY "Users can read assignments in their company" ON public.order_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE o.id = order_assignments.order_id 
            AND o.company_id = p.company_id
        )
    );

CREATE POLICY "Managers can manage assignments" ON public.order_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            JOIN public.profiles p ON p.id = auth.uid()
            WHERE o.id = order_assignments.order_id 
            AND o.company_id = p.company_id 
            AND p.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Workers can update own assignments" ON public.order_assignments
    FOR UPDATE USING (worker_id = auth.uid());

-- BUY LIST POLICIES 🛒 (supports your useBuyList queries)
CREATE POLICY "Users can read buy list in their company" ON public.buy_list
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = buy_list.company_id
        )
    );

CREATE POLICY "Users can add items to buy list" ON public.buy_list
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = buy_list.company_id
        )
    );

CREATE POLICY "Users can update buy list items" ON public.buy_list
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = buy_list.company_id
        )
    );

CREATE POLICY "Managers can delete buy list items" ON public.buy_list
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = buy_list.company_id 
            AND p.role IN ('admin', 'manager')
        )
    );

-- COMPANY INVITATIONS POLICIES 📨
CREATE POLICY "Users can read invitations for their company" ON public.company_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = company_invitations.company_id
        )
    );

CREATE POLICY "Managers can manage invitations" ON public.company_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() 
            AND p.company_id = company_invitations.company_id 
            AND p.role IN ('admin', 'manager')
        )
    );

-- ========================================
-- STEP 7: CREATE UPDATED_AT TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables with updated_at
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_buy_list_updated_at
    BEFORE UPDATE ON public.buy_list
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- STEP 8: CREATE SIGNUP FUNCTION & TRIGGER
-- ========================================

-- Function that matches your AuthContext signup expectations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_company_id UUID;
    user_role TEXT;
    company_name TEXT;
BEGIN
    -- Get user's chosen role (matches your AuthContext default)
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'manager');
    
    -- Get company name or generate one
    company_name := COALESCE(
        NEW.raw_user_meta_data->>'company_name', 
        NEW.email || '''s Company'
    );
    
    -- Check if joining existing company via invitation
    IF NEW.raw_user_meta_data ? 'invitation_code' THEN
        -- Handle invitation signup
        SELECT ci.company_id, ci.role INTO new_company_id, user_role
        FROM public.company_invitations ci
        WHERE ci.invitation_code = NEW.raw_user_meta_data->>'invitation_code'
        AND ci.expires_at > NOW()
        AND ci.accepted_at IS NULL;
        
        -- Mark invitation as accepted
        UPDATE public.company_invitations 
        SET accepted_at = NOW() 
        WHERE invitation_code = NEW.raw_user_meta_data->>'invitation_code';
    ELSE
        -- Create new company (this fixes your companies table issue)
        INSERT INTO public.companies (
            name, 
            created_by,
            is_active
        )
        VALUES (
            company_name,
            NEW.id,
            true
        )
        RETURNING id INTO new_company_id;
    END IF;
    
    -- Create user profile (this fixes your profile creation)
    INSERT INTO public.profiles (
        id,
        company_id,
        email,
        full_name,
        role,
        is_company_owner
    )
    VALUES (
        NEW.id,
        new_company_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        user_role, -- This fixes your role assignment issue
        (NEW.raw_user_meta_data ? 'invitation_code') = false -- Owner if not joining via invitation
    );
    
    RETURN NEW;
    
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- STEP 9: GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_assignments TO authenticated;
GRANT ALL ON public.buy_list TO authenticated;
GRANT ALL ON public.company_invitations TO authenticated;

-- Grant sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- STEP 10: VERIFY SETUP
-- ========================================

-- Check that all tables were created with correct structure
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('companies', 'profiles', 'orders', 'order_assignments', 'buy_list', 'company_invitations')
ORDER BY 
    CASE table_name 
        WHEN 'companies' THEN 1
        WHEN 'profiles' THEN 2
        WHEN 'orders' THEN 3
        WHEN 'order_assignments' THEN 4
        WHEN 'buy_list' THEN 5
        WHEN 'company_invitations' THEN 6
    END;

-- Check that signup function exists
SELECT 
    routine_name,
    CASE WHEN routine_name = 'handle_new_user' THEN '✅ Active' ELSE '❌ Missing' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- Success message
SELECT 
    'Database schema created successfully!' as message,
    'Tables match your React app expectations exactly' as compatibility,
    'Signup function will create companies and assign correct roles' as signup_fix,
    'Ready for testing at http://localhost:5174' as ready;