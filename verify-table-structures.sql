-- 📋 TABLE VERIFICATION: Check current table structures match expected format

-- 1. Check companies table structure
SELECT 
    'companies table structure:' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check profiles table structure  
SELECT 
    'profiles table structure:' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
  AND table_schema = 'public' 
ORDER BY ordinal_position;

-- 3. Check if tables exist
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('companies', 'profiles', 'orders', 'buy_list')
ORDER BY table_name;

-- 4. Check current trigger status
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    trigger_schema,
    CASE WHEN trigger_name IS NOT NULL THEN '✅ ACTIVE' ELSE '❌ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
  AND trigger_name = 'on_auth_user_created';

-- 5. Test current function exists
SELECT 
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';

-- Expected table structures should be:

-- companies:
-- - id (uuid, primary key)
-- - name (text, not null)  
-- - created_by (uuid, references auth.users)
-- - is_active (boolean, default true)
-- - created_at (timestamp with time zone)

-- profiles:  
-- - id (uuid, primary key, references auth.users)
-- - email (text, not null)
-- - full_name (text)
-- - role (text, check constraint: worker/manager/admin)  
-- - company_id (uuid, references companies.id)
-- - is_company_owner (boolean, default false)
-- - created_at (timestamp with time zone)

SELECT 'Table verification complete!' as result;