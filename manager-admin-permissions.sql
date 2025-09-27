-- ========================================
-- SIMPLIFIED ROLES: MANAGER = ADMIN
-- ========================================
-- Run this to make managers have admin-level permissions
-- ========================================

-- Update RLS policies to treat managers as admins

-- 1. COMPANIES POLICIES (Allow managers to update company settings)
DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
CREATE POLICY "Admins and managers can update their company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = companies.id 
        AND (p.role IN ('admin', 'manager') OR p.is_company_owner = true)
    )
  );

-- 2. COMPANY INVITATIONS (Allow managers to manage invitations)
DROP POLICY IF EXISTS "Admins/Managers can read company invitations" ON company_invitations;
DROP POLICY IF EXISTS "Admins/Managers can create invitations" ON company_invitations;

CREATE POLICY "Managers can read company invitations" ON company_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can create invitations" ON company_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can update invitations" ON company_invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Managers can delete invitations" ON company_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = company_invitations.company_id
        AND p.role IN ('admin', 'manager')
    )
  );

-- 3. PROFILES MANAGEMENT (Allow managers to manage all profiles)
CREATE POLICY "Managers can update user profiles in company" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles manager 
      WHERE manager.id = auth.uid() 
        AND manager.company_id = profiles.company_id
        AND manager.role IN ('admin', 'manager')
    )
  );

-- 4. UPDATE FUNCTIONS TO ALLOW MANAGERS SAME ACCESS
CREATE OR REPLACE FUNCTION public.invite_user_to_company(
  user_email TEXT,
  target_role TEXT,
  invitation_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
  user_role TEXT;
  invitation_id UUID;
BEGIN
  -- Get current user's company and role
  SELECT company_id, role INTO user_company_id, user_role
  FROM profiles 
  WHERE id = auth.uid();
  
  -- Check if user is admin or manager
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Only admins and managers can invite users';
  END IF;
  
  -- Create invitation
  INSERT INTO company_invitations (company_id, email, role, invited_by)
  VALUES (user_company_id, user_email, target_role, auth.uid())
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. GRANT MANAGERS ACCESS TO USER MANAGEMENT
GRANT EXECUTE ON FUNCTION public.invite_user_to_company TO authenticated;