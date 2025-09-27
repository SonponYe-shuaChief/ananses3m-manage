# 🚨 IMMEDIATE FIX for Missing Profile

## 🎯 **Your Specific Issue:**
- User ID: `639134a7-41d2-4c19-8435-133123d87d85`
- Email: `sonponyeshua@gmail.com` 
- Problem: Profile = None, Company ID = MISSING!

## ⚡ **INSTANT FIX - Run This SQL Now:**

Go to **Supabase → SQL Editor** and run this:

```sql
-- 1. Create companies table if missing
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create profiles table if missing
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'manager' CHECK (role IN ('worker', 'manager', 'admin')),
    company_id UUID REFERENCES companies(id),
    is_company_owner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create your company
INSERT INTO companies (name, created_by, is_active)
VALUES ('Sonpon Company', '639134a7-41d2-4c19-8435-133123d87d85', true)
ON CONFLICT DO NOTHING;

-- 4. Create your profile
INSERT INTO profiles (
    id,
    email,
    full_name,
    role,
    company_id,
    is_company_owner
) VALUES (
    '639134a7-41d2-4c19-8435-133123d87d85',
    'sonponyeshua@gmail.com',
    'Sonpon Yeshua',
    'manager',
    (SELECT id FROM companies WHERE created_by = '639134a7-41d2-4c19-8435-133123d87d85'),
    true
) ON CONFLICT (id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    is_company_owner = EXCLUDED.is_company_owner;

-- 5. Verify it worked
SELECT 
    'SUCCESS: Profile Created!' as status,
    p.full_name,
    p.email,
    p.role,
    c.name as company_name,
    p.company_id
FROM profiles p
JOIN companies c ON p.company_id = c.id
WHERE p.id = '639134a7-41d2-4c19-8435-133123d87d85';
```

## 🔄 **After Running SQL:**

1. **Refresh your browser** at http://localhost:5174
2. **Check debug box**: Should show green Company ID
3. **Try Buy List**: Should work now!

## 🎯 **Expected Result:**
```
Debug Profile Info ✅
Loading: No
User ID: 639134a7-41d2-4c19-8435-133123d87d85
User Email: sonponyeshua@gmail.com  
Profile: {id: "639...", full_name: "Sonpon Yeshua", role: "manager", company_id: "uuid"}
Company ID: [UUID in green] ✅
```

## 🚨 **If SQL Doesn't Work:**

Use the **red "FIX: Create Missing Profile"** button in the debug box - it will automatically create the profile for you!

Run the SQL above and refresh your browser - your profile should be created and buy list should work! 🎯✨