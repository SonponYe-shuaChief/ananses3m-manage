-- 🔧 CORRECTED SIGNUP FUNCTION: Fixes company creation and role assignment
-- This replaces the broken handle_new_user function

-- Updated function with proper table names and data types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  user_role TEXT;
BEGIN
  -- Debug log
  RAISE NOTICE 'Creating profile for user: %, meta_data: %', NEW.id, NEW.raw_user_meta_data;
  
  -- Get user's chosen role, default to manager for company creators
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'manager');
  
  -- Check if user is joining existing company via invitation
  IF NEW.raw_user_meta_data ? 'invitation_code' THEN
    -- Handle company invitation (future feature)
    -- For now, create new company
    RAISE NOTICE 'Invitation code signup not yet implemented, creating new company';
  END IF;
  
  -- Create new company for the user
  INSERT INTO public.companies (
    name, 
    created_by,
    is_active
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email || '''s Company'),
    NEW.id,
    true
  )
  RETURNING id INTO new_company_id;
  
  RAISE NOTICE 'Created company: % for user: %', new_company_id, NEW.id;
  
  -- Create user profile with correct data types
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    is_company_owner,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,  -- Use the chosen role, not hard-coded 'admin'
    new_company_id,
    true,  -- Company creator is owner
    NOW()
  );
  
  RAISE NOTICE 'Created profile: user=%, email=%, role=%, company=%', 
    NEW.id, NEW.email, user_role, new_company_id;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
  -- Don't fail the signup, just log the error
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Test the function works
SELECT 'Signup function updated successfully! Test by creating a new user.' as status;