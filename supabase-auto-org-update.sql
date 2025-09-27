-- Updated Database Schema for Auto Organization ID
-- Run this AFTER the main schema to update the signup function

-- Updated function to automatically create profile with auto-generated organization_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, organization_id)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    gen_random_uuid() -- Auto-generate organization_id for each new user
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: If you want users to be able to join existing organizations,
-- add this function for managers to invite users to their organization
CREATE OR REPLACE FUNCTION public.invite_user_to_organization(
  user_email TEXT,
  target_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get the user ID from email
  SELECT id INTO user_id 
  FROM auth.users 
  WHERE email = user_email;
  
  -- Update the user's organization_id if they exist
  IF user_id IS NOT NULL THEN
    UPDATE profiles 
    SET organization_id = target_organization_id
    WHERE id = user_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.invite_user_to_organization TO authenticated;