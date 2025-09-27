-- 🚨 EMERGENCY FIX: Create missing profile for signed-up user
-- This creates the profile that should have been created during signup

-- Step 1: Check if profiles table exists and what columns it has
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Step 2: Check if companies table exists  
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- Step 3: Check if your user has a profile
SELECT * FROM profiles WHERE id = '639134a7-41d2-4c19-8435-133123d87d85';

-- Step 4: Check what's in auth.users for your user
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users 
WHERE id = '639134a7-41d2-4c19-8435-133123d87d85';

-- Step 5: Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create a company for your user
INSERT INTO companies (name, created_by, is_active)
VALUES ('My Company', '639134a7-41d2-4c19-8435-133123d87d85', true)
ON CONFLICT DO NOTHING;

-- Step 7: Create the missing profile
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    is_company_owner,
    created_at
) VALUES (
    '639134a7-41d2-4c19-8435-133123d87d85',
    'sonponyeshua@gmail.com',
    'Sonpon Yeshua',
    'manager',
    (SELECT id FROM companies WHERE created_by = '639134a7-41d2-4c19-8435-133123d87d85' LIMIT 1),
    true,
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    company_id = EXCLUDED.company_id,
    is_company_owner = EXCLUDED.is_company_owner;

-- Step 8: Verify the fix worked
SELECT 
    p.id,
    p.email,
    p.full_name,
    p.role,
    p.company_id,
    p.is_company_owner,
    c.name as company_name
FROM profiles p
JOIN companies c ON p.company_id = c.id
WHERE p.id = '639134a7-41d2-4c19-8435-133123d87d85';

-- Success message
SELECT 'Profile created successfully! Refresh your browser.' as status;