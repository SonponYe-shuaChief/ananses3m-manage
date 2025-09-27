# 📊 Anansesɛm Orders Manager - Complete Database Tables Reference

## 🏗️ **Main Application Tables**

### **1. `companies` 🏢**
**Purpose**: Stores company/organization information for multi-tenant architecture
**What it does**: Each business/organization gets their own record, enabling data isolation

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique company identifier (Primary Key) |
| `name` | TEXT | Company name (must be unique) |
| `description` | TEXT | Optional company description |
| `industry` | TEXT | Business industry/sector |
| `website` | TEXT | Company website URL |
| `logo_url` | TEXT | Company logo image URL |
| `subscription_tier` | TEXT | Plan level: 'free', 'pro', 'enterprise' |
| `max_users` | INTEGER | Maximum users allowed (default: 5) |
| `created_at` | TIMESTAMP | When company was created |
| `updated_at` | TIMESTAMP | Last modification time |

**Used for**: Company-based data isolation, subscription management, branding

---

### **2. `profiles` 👤**
**Purpose**: Extended user information beyond basic auth
**What it does**: Links authenticated users to companies with roles and permissions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | User ID (references auth.users) |
| `company_id` | UUID | Which company user belongs to |
| `email` | TEXT | User email address |
| `full_name` | TEXT | User's display name |
| `role` | TEXT | Permission level: 'admin', 'manager', 'worker' |
| `job_title` | TEXT | User's job position |
| `avatar_url` | TEXT | Profile picture URL |
| `is_company_owner` | BOOLEAN | Whether user owns the company |
| `created_at` | TIMESTAMP | When profile was created |
| `updated_at` | TIMESTAMP | Last profile update |

**Used for**: Role-based access control, user management, company ownership

---

### **3. `orders` 📋**
**Purpose**: Core business orders/tasks management
**What it does**: Stores all work orders, projects, and tasks for companies

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Unique order identifier |
| `company_id` | UUID | Which company owns this order |
| `title` | TEXT | Order/task title |
| `description` | TEXT | Detailed order description |
| `client_name` | TEXT | Customer/client name |
| `due_date` | DATE | When order should be completed |
| `status` | TEXT | Current status: 'new', 'in_progress', 'completed', 'cancelled' |
| `priority` | TEXT | Urgency level: 'low', 'medium', 'high', 'urgent' |
| `category` | TEXT | Order type/classification |
| `image_urls` | TEXT[] | Reference images/files array |
| `estimated_hours` | DECIMAL | Projected time to complete |
| `actual_hours` | DECIMAL | Time actually spent |
| `created_by` | UUID | Who created the order |
| `created_at` | TIMESTAMP | When order was created |
| `updated_at` | TIMESTAMP | Last modification time |

**Used for**: Work order tracking, project management, client service management

---

### **4. `order_assignments` 👷**
**Purpose**: Links workers to specific orders
**What it does**: Manages who is working on which orders with additional context

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Assignment identifier |
| `order_id` | UUID | Which order this assignment is for |
| `worker_id` | UUID | Which worker is assigned |
| `assigned_by` | UUID | Manager who made the assignment |
| `starred` | BOOLEAN | Worker marked as high priority |
| `notes` | TEXT | Assignment-specific notes |
| `assigned_at` | TIMESTAMP | When assignment was made |

**Used for**: Task delegation, workload distribution, priority management

---

### **5. `buy_list` 🛒**
**Purpose**: Shared company shopping/procurement list
**What it does**: Team members can add items needed and mark them as purchased

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Item identifier |
| `company_id` | UUID | Which company's shopping list |
| `item_name` | TEXT | What needs to be purchased |
| `quantity` | INTEGER | How many needed (default: 1) |
| `estimated_cost` | DECIMAL | Expected price |
| `category` | TEXT | Item type/classification |
| `priority` | TEXT | Purchase urgency: 'low', 'medium', 'high' |
| `added_by` | UUID | Who added the item |
| `bought` | BOOLEAN | Whether item was purchased |
| `bought_by` | UUID | Who purchased it |
| `bought_at` | TIMESTAMP | When it was purchased |
| `notes` | TEXT | Additional item notes |
| `created_at` | TIMESTAMP | When item was added |

**Used for**: Team procurement, expense tracking, resource management

---

### **6. `company_invitations` 📨**
**Purpose**: Manages team member invitations
**What it does**: Allows managers to invite new users to join their company

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Invitation identifier |
| `company_id` | UUID | Which company is inviting |
| `email` | TEXT | Email address being invited |
| `role` | TEXT | Role they'll have: 'admin', 'manager', 'worker' |
| `invited_by` | UUID | Manager who sent invitation |
| `expires_at` | TIMESTAMP | When invitation expires (7 days) |
| `accepted_at` | TIMESTAMP | When invitation was accepted |
| `created_at` | TIMESTAMP | When invitation was sent |

**Used for**: Team growth, controlled user onboarding, role management

---

## 🔒 **Security Features**

### **Row Level Security (RLS)**
All tables have RLS enabled, meaning:
- ✅ Users only see data from their own company
- ✅ Company owners have additional management permissions  
- ✅ Workers can only access what they're assigned to
- ✅ Data isolation prevents cross-company data leaks

### **Role-Based Access Control**
- **Admin/Manager**: Full company access, user management, all orders
- **Manager**: Company management, order creation, team assignments  
- **Worker**: Assigned orders, buy list access, profile management

---

## 🔄 **Table Relationships**

```
companies (1) ←→ (many) profiles
companies (1) ←→ (many) orders  
companies (1) ←→ (many) buy_list
companies (1) ←→ (many) company_invitations

profiles (1) ←→ (many) orders (created_by)
profiles (1) ←→ (many) order_assignments (worker_id)
profiles (1) ←→ (many) buy_list (added_by)

orders (1) ←→ (many) order_assignments
```

---

## 🎯 **Data Flow Example**

### **New Company Signup:**
1. **User signs up** → `auth.users` gets record
2. **Trigger creates** → `companies` record + `profiles` record  
3. **User becomes** → Company owner with 'manager' role

### **Order Management:**
1. **Manager creates order** → `orders` table
2. **Manager assigns worker** → `order_assignments` table
3. **Worker views assignment** → Filtered by company_id + worker_id
4. **Worker updates status** → `orders.status` changed

### **Team Shopping:**
1. **Anyone adds item** → `buy_list` table
2. **Real-time sync** → All company members see update
3. **Someone buys item** → `bought = true`, `bought_by` set
4. **Expense tracking** → Query `bought_at` + `estimated_cost`

---

## 📈 **Usage Statistics**

Your **Anansesɛm Orders Manager** uses these tables to provide:
- 🏢 **Multi-tenant architecture** (companies isolation)
- 👥 **Team collaboration** (shared orders, buy list)  
- 📋 **Work management** (orders, assignments, tracking)
- 🛒 **Procurement** (shared shopping list)
- 🔐 **Security** (RLS, role-based permissions)
- 📊 **Analytics** (order completion, team performance)

Each table is optimized for **real-time collaboration** and **company-based data isolation**! 🎯✨