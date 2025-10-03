# Fix for Order Delete Issue - Missing RLS DELETE Policy

The issue is that Supabase RLS (Row Level Security) doesn't have a DELETE policy for the orders table.

## SQL to Add Missing DELETE Policy

Run this in your **Supabase Dashboard → SQL Editor**:

```sql
-- Add DELETE policy for orders table
CREATE POLICY "Managers can delete orders in their company"
ON orders FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);
```

## Alternative: Check and Add All Missing DELETE Policies

If you want to be thorough, run this to add DELETE policies for all main tables:

```sql
-- Orders DELETE policy (main issue)
CREATE POLICY "Managers can delete orders in their company"
ON orders FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'manager')
);

-- Order assignments DELETE policy (for cleanup)
CREATE POLICY "Managers can delete order assignments in their company"
ON order_assignments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM orders o, profiles p 
    WHERE o.id = order_assignments.order_id 
      AND p.id = auth.uid() 
      AND p.role = 'manager'
      AND o.company_id = p.company_id
  )
);

-- Buy list DELETE policy (already added earlier)
CREATE POLICY "Users can delete buy list items in their company"
ON buy_list FOR DELETE USING (
  company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);
```

## Why This Happens

RLS policies need to be explicitly defined for each operation (SELECT, INSERT, UPDATE, DELETE). 
Your database likely has:
- ✅ SELECT policies (can view orders)
- ✅ INSERT policies (can create orders) 
- ✅ UPDATE policies (can edit orders)
- ❌ DELETE policies (MISSING - this is the problem!)

## After Adding the Policy

1. Run the SQL in Supabase
2. Try deleting an order again
3. It should now work and disappear immediately

The order delete should work instantly once you add the DELETE policy!