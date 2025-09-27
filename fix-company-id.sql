-- ⚠️ URGENT FIX: Add company_id to existing profiles
-- This fixes the "company_id not found" error when adding buy list items

-- Step 1: Check current profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Step 2: Add company_id column if it doesn't exist
DO $$
BEGIN
    -- Add company_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN company_id UUID REFERENCES companies(id);
        RAISE NOTICE 'Added company_id column to profiles table';
    END IF;
END $$;

-- Step 3: Create a default company for existing users without one
INSERT INTO companies (name, created_by, is_active)
SELECT 
    COALESCE(
        (SELECT company_name FROM profiles WHERE id = auth.uid() LIMIT 1),
        'Default Company'
    ),
    auth.uid(),
    true
WHERE NOT EXISTS (
    SELECT 1 FROM companies WHERE created_by = auth.uid()
)
AND auth.uid() IS NOT NULL;

-- Step 4: Update profiles without company_id
UPDATE profiles 
SET company_id = (
    SELECT id FROM companies 
    WHERE created_by = profiles.id 
    OR created_by IS NULL
    LIMIT 1
)
WHERE company_id IS NULL;

-- Step 5: Make company_id NOT NULL after all profiles have it
ALTER TABLE profiles ALTER COLUMN company_id SET NOT NULL;

-- Step 6: Verify the fix
SELECT 
    p.id,
    p.full_name,
    p.email,
    p.role,
    p.company_id,
    c.name as company_name
FROM profiles p
LEFT JOIN companies c ON p.company_id = c.id
ORDER BY p.created_at DESC;

-- Success message
SELECT 'company_id migration completed successfully!' as status;