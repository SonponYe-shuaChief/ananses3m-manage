-- 🚨 QUICK FIX: Manual company_id assignment for immediate testing
-- Run this if you need an immediate fix for your current user

-- 1. Create a test company (run this first)
INSERT INTO companies (id, name, created_by, is_active)
VALUES (
    gen_random_uuid(),
    'Test Company',
    auth.uid(),
    true
) ON CONFLICT DO NOTHING;

-- 2. Update your profile with the company_id (replace YOUR_USER_ID)
UPDATE profiles 
SET company_id = (
    SELECT id FROM companies 
    WHERE created_by = auth.uid() 
    LIMIT 1
)
WHERE id = auth.uid();

-- 3. Verify the update worked
SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    p.role,
    p.company_id,
    c.name as company_name
FROM profiles p
JOIN companies c ON p.company_id = c.id
WHERE p.id = auth.uid();

-- 4. Check if buy_list table exists and is ready
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'buy_list'
) as buy_list_table_exists;