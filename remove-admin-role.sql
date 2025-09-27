-- ========================================
-- REMOVE ADMIN ROLE FROM SIGNUP
-- ========================================
-- Update signup function to use 'manager' role for new company owners
-- ========================================

-- Updated function for new user signup (removes admin, uses manager)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  invitation_record RECORD;
BEGIN
  -- Check if user was invited to existing company
  IF NEW.raw_user_meta_data ? 'invitation_code' THEN
    -- Find valid invitation
    SELECT * INTO invitation_record
    FROM company_invitations
    WHERE id = (NEW.raw_user_meta_data->>'invitation_code')::UUID
      AND expires_at > NOW()
      AND accepted_at IS NULL;
    
    IF FOUND THEN
      -- Join existing company
      INSERT INTO public.profiles (
        id, 
        company_id, 
        full_name, 
        role,
        is_company_owner
      )
      VALUES (
        NEW.id,
        invitation_record.company_id,
        NEW.raw_user_meta_data->>'full_name',
        invitation_record.role,
        false
      );
      
      -- Mark invitation as accepted
      UPDATE company_invitations
      SET accepted_at = NOW()
      WHERE id = invitation_record.id;
    ELSE
      -- Invalid invitation, create new company
      INSERT INTO public.companies (name, description)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        'Auto-created company'
      )
      RETURNING id INTO new_company_id;
      
      INSERT INTO public.profiles (
        id, 
        company_id, 
        full_name, 
        role,
        is_company_owner
      )
      VALUES (
        NEW.id,
        new_company_id,
        NEW.raw_user_meta_data->>'full_name',
        'manager', -- Changed from 'admin' to 'manager'
        true
      );
    END IF;
  ELSE
    -- Create new company for new user
    INSERT INTO public.companies (name, description)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      'Auto-created company'
    )
    RETURNING id INTO new_company_id;
    
    INSERT INTO public.profiles (
      id, 
      company_id, 
      full_name, 
      role,
      is_company_owner
    )
    VALUES (
      NEW.id,
      new_company_id,
      NEW.raw_user_meta_data->>'full_name',
      'manager', -- Changed from 'admin' to 'manager'
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Keep 'admin' in database constraint for existing users
-- New signups will automatically get 'manager' role with company owner privileges
-- The 'admin' role remains supported in the backend but is not shown in UI