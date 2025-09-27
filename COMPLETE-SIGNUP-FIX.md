# 🚨 COMPLETE SIGNUP FIX: Companies Table + Role Assignment

## 🔍 **Issues Identified:**

1. ❌ **Companies table** - not getting records during signup
2. ❌ **Role assignment** - getting 'worker' instead of chosen 'manager'  
3. ❌ **Database function** - has bugs in table references and role handling
4. ❌ **Table structures** - may not match expected format

---

## ⚡ **IMMEDIATE FIX STEPS:**

### **Step 1: Verify Table Structures**
Run in **Supabase SQL Editor**:
```sql
-- Check what tables you actually have
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### **Step 2: Fix the Signup Function** 
Run this corrected function:
```sql
-- Fixed handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  user_role TEXT;
BEGIN
  -- Get user's chosen role (fixes role assignment bug)
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'manager');
  
  -- Create company in companies table (fixes missing company records)
  INSERT INTO public.companies (
    name, 
    created_by,
    is_active,
    created_at
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', NEW.email || '''s Company'),
    NEW.id,
    true,
    NOW()
  )
  RETURNING id INTO new_company_id;
  
  -- Create profile with correct role and company_id
  INSERT INTO public.profiles (
    id,
    email, 
    full_name,
    role,           -- Uses chosen role, not hardcoded
    company_id,     -- Links to created company
    is_company_owner,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role,      -- Manager/Worker as chosen
    new_company_id, -- Links to companies table
    true,           -- Company creator is owner
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### **Step 3: Create Missing Tables (If Needed)**
If companies table doesn't exist:
```sql
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

If profiles table structure is wrong:
```sql
-- Add missing columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS is_company_owner BOOLEAN DEFAULT false;
```

---

## 🧪 **Test the Fix:**

### **1. Check Function is Active:**
```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
```

### **2. Test Signup Process:**
1. 🌐 Go to **http://localhost:5174** 
2. 📝 Click **Sign Up**
3. 🏢 Choose **Create New Company**
4. 👔 Select **Manager** role
5. ✅ Submit form

### **3. Verify Results:**
```sql
-- Check companies table gets record
SELECT * FROM companies ORDER BY created_at DESC LIMIT 1;

-- Check profiles table gets correct role  
SELECT 
    full_name,
    email,
    role,           -- Should be 'manager'
    company_id,     -- Should have UUID
    is_company_owner -- Should be true
FROM profiles 
ORDER BY created_at DESC LIMIT 1;
```

---

## 🎯 **Expected Success:**

### **Before Fix:**
```
❌ companies table: Empty
❌ profiles.role: 'worker' (wrong)  
❌ profiles.company_id: NULL
❌ Debug box: "Company ID: MISSING!"
```

### **After Fix:**
```
✅ companies table: New record with your company name
✅ profiles.role: 'manager' (correct)
✅ profiles.company_id: Valid UUID  
✅ Debug box: "Company ID: [green UUID]"
```

---

## 🔍 **Debug Information:**

I've enhanced the AuthContext with detailed logging. Check **Browser Console (F12)** for:
- ✅ Metadata sent to Supabase
- ✅ Auth signup success/failure  
- ✅ Profile creation results
- ✅ Company ID validation

---

## 📋 **Files Created:**
- ✅ `fix-signup-function.sql` - Corrected database function
- ✅ `verify-table-structures.sql` - Table structure checker
- ✅ Enhanced AuthContext with logging
- ✅ This troubleshooting guide

---

## ⚠️ **Critical Points:**

1. **Table Name**: Must be `companies` (not `company`)
2. **Role Field**: Must allow 'manager' value (check constraints)
3. **Foreign Keys**: company_id must reference companies.id
4. **Function**: Must use NEW.raw_user_meta_data->>'role' 
5. **Default Role**: Should be 'manager' for company creators

Run the SQL fixes above, test signup, and both **companies table** and **correct role assignment** should work! 🎯✨