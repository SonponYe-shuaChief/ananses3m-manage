-- 🔧 AUTO-PROFILE CREATOR: Fixes missing profiles for authenticated users
-- This creates profiles for users who were authenticated but missing profile records

-- Function to create missing profile for current authenticated user
CREATE OR REPLACE FUNCTION create_missing_profile()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id UUID;
    user_email TEXT;
    user_meta JSONB;
    company_uuid UUID;
    result JSON;
BEGIN
    -- Get current user info
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RETURN '{"success": false, "error": "Not authenticated"}'::JSON;
    END IF;
    
    -- Get user details from auth.users
    SELECT email, raw_user_meta_data INTO user_email, user_meta
    FROM auth.users WHERE id = user_id;
    
    -- Check if profile already exists
    IF EXISTS (SELECT 1 FROM profiles WHERE id = user_id) THEN
        RETURN '{"success": false, "error": "Profile already exists"}'::JSON;
    END IF;
    
    -- Create companies table if it doesn't exist
    CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        created_by UUID REFERENCES auth.users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create a default company
    INSERT INTO companies (name, created_by, is_active)
    VALUES (
        COALESCE(user_meta->>'company_name', 'Default Company'),
        user_id,
        true
    ) 
    ON CONFLICT DO NOTHING
    RETURNING id INTO company_uuid;
    
    -- If company wasn't created (conflict), get existing one
    IF company_uuid IS NULL THEN
        SELECT id INTO company_uuid 
        FROM companies 
        WHERE created_by = user_id 
        LIMIT 1;
    END IF;
    
    -- If still no company, create a generic one
    IF company_uuid IS NULL THEN
        INSERT INTO companies (name, created_by, is_active)
        VALUES ('My Company', user_id, true)
        RETURNING id INTO company_uuid;
    END IF;
    
    -- Create the profile
    INSERT INTO profiles (
        id,
        email,
        full_name,
        role,
        company_id,
        is_company_owner,
        created_at
    ) VALUES (
        user_id,
        user_email,
        COALESCE(user_meta->>'full_name', 'User'),
        COALESCE(user_meta->>'role', 'manager'),
        company_uuid,
        true,
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'user_id', user_id,
        'email', user_email,
        'company_id', company_uuid,
        'message', 'Profile created successfully'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION create_missing_profile() TO authenticated;

-- Test the function (run this after creating the function)
SELECT create_missing_profile();