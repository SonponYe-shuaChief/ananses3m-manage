# 🔗 Database Relationships & Data Flow

## 📊 **Table Relationships Diagram**

```
                    🏢 COMPANIES (Multi-tenant isolation)
                           |
                           | 1:many
                           ↓
    ┌─────────────────────────────────────────────────────────┐
    |                                                         |
    ↓                     ↓                     ↓             ↓
👤 PROFILES         📨 INVITATIONS        📋 ORDERS      🛒 BUY_LIST
(Users & Roles)    (Team Growth)       (Work Tasks)   (Shopping)
    |                     |                 |
    | 1:many             | many:1          | 1:many
    ↓                     ↓                 ↓
👷 ORDER_ASSIGNMENTS ─────┘                 |
(Who works on what)                        |
    |                                      |
    └──────────── many:1 ──────────────────┘
```

## 🔄 **Data Flow Examples**

### **1. New Company Signup Flow**
```sql
-- Step 1: User signs up
INSERT INTO auth.users → triggers handle_new_user()

-- Step 2: Function creates company  
INSERT INTO companies (name, created_by)

-- Step 3: Function creates profile
INSERT INTO profiles (company_id, role='manager', is_company_owner=true)
```

### **2. Team Invitation Flow** 
```sql
-- Step 1: Manager creates invitation
INSERT INTO company_invitations (company_id, email, role)

-- Step 2: Invited user signs up with invitation_code
INSERT INTO auth.users (raw_user_meta_data->>'invitation_code')

-- Step 3: Function links to existing company
INSERT INTO profiles (company_id=existing, role=invited_role, is_company_owner=false)
```

### **3. Order Management Flow**
```sql  
-- Step 1: Manager creates order
INSERT INTO orders (company_id, title, description, created_by)

-- Step 2: Manager assigns workers
INSERT INTO order_assignments (order_id, worker_id, assigned_by)

-- Step 3: Workers update progress
UPDATE orders SET status='in_progress', actual_hours=5.5
UPDATE order_assignments SET hours_logged=5.5, notes='Progress update'
```

### **4. Shopping List Flow**
```sql
-- Step 1: Anyone adds item
INSERT INTO buy_list (company_id, item_name, added_by)

-- Step 2: Someone purchases item  
UPDATE buy_list SET bought=true, bought_by=user_id, bought_at=NOW(), actual_cost=25.99

-- Step 3: Optional link to specific order
UPDATE buy_list SET order_id=some_order_id
```

## 🔐 **Security Model (RLS Policies)**

### **Company Isolation**
```sql
-- Every query automatically filters by user's company_id
WHERE EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.company_id = table.company_id
)
```

### **Role-Based Permissions**
```sql
-- Managers can do everything in their company
WHERE p.role IN ('admin', 'manager') 

-- Workers can only update what they're assigned to  
WHERE worker_id = auth.uid() OR assigned_to = auth.uid()
```

## 📈 **Key Constraints & Business Rules**

### **Referential Integrity**
- ✅ **Profiles must belong to a company** (NOT NULL company_id)
- ✅ **Orders must belong to a company** (NOT NULL company_id)  
- ✅ **Assignments must reference valid order + worker**
- ✅ **Buy list items must belong to a company**

### **Business Logic**
- ✅ **Company names are unique** (UNIQUE constraint)
- ✅ **Invitation codes are unique** (UNIQUE constraint)
- ✅ **One assignment per worker per order** (UNIQUE constraint)
- ✅ **Roles limited to valid values** (CHECK constraints)
- ✅ **Invitations expire in 7 days** (DEFAULT expires_at)

### **Performance Optimization**  
- ✅ **Indexed foreign keys** (company_id, order_id, worker_id)
- ✅ **Indexed search fields** (email, status, priority)
- ✅ **Indexed time fields** (due_date, expires_at)

## 🎯 **Query Patterns Your App Uses**

### **Dashboard Queries**
```sql
-- Get user's company info
SELECT * FROM companies c
JOIN profiles p ON p.company_id = c.id  
WHERE p.id = auth.uid();

-- Get user's assigned orders
SELECT o.*, oa.starred, oa.notes 
FROM orders o
JOIN order_assignments oa ON oa.order_id = o.id
WHERE oa.worker_id = auth.uid();
```

### **Orders Page Queries**
```sql  
-- Get all company orders (managers)
SELECT o.*, p.full_name as created_by_name
FROM orders o
LEFT JOIN profiles p ON p.id = o.created_by
WHERE o.company_id = user_company_id;

-- Get order assignments
SELECT oa.*, p.full_name as worker_name
FROM order_assignments oa  
JOIN profiles p ON p.id = oa.worker_id
WHERE oa.order_id = some_order_id;
```

### **Buy List Queries**
```sql
-- Get company shopping list
SELECT bl.*, p.full_name as added_by_name, p2.full_name as bought_by_name
FROM buy_list bl
LEFT JOIN profiles p ON p.id = bl.added_by
LEFT JOIN profiles p2 ON p2.id = bl.bought_by  
WHERE bl.company_id = user_company_id
ORDER BY bl.bought, bl.priority DESC, bl.created_at;
```

## 🚀 **Scalability Features**

### **Multi-Tenant Ready**
- Each company's data is completely isolated
- Easy to add new companies without affecting others
- Can scale to thousands of companies

### **Role-Based Growth**  
- Easy to add new roles (just update CHECK constraints)
- Granular permissions per table/operation
- Supports complex organizational hierarchies

### **Performance Optimized**
- Strategic indexes for common queries
- RLS policies use indexed columns
- Efficient JOIN patterns for related data

This schema supports **real-time collaboration**, **company-based isolation**, and **role-based security** perfectly for your Anansesɛm Orders Manager! 🎯✨