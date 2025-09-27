# 👥 Role Hierarchy & Permissions Guide

## 🏢 **Role Structure Overview**

```
Company Owner (Admin) 
    ↓
Admin
    ↓  
Manager
    ↓
Worker
```

---

## 🔐 **Role Differences Explained**

### 🏛️ **ADMIN Role**

#### **Core Responsibilities:**
- **Company Management**: Full control over company settings
- **User Management**: Can invite, remove, and change roles of all users
- **Billing & Subscriptions**: Manage subscription tiers and billing
- **Security**: Highest level access to all company data
- **System Administration**: Configure company-wide settings

#### **Permissions:**
- ✅ **All Manager permissions** (inherits everything below)
- ✅ **Company Settings**: Edit name, description, logo, industry
- ✅ **User Administration**: 
  - Invite new users to company
  - Remove users from company
  - Change user roles (promote/demote)
  - View all user profiles and activity
- ✅ **Subscription Management**: 
  - Upgrade/downgrade subscription tiers
  - Manage billing and payments
  - Set user limits and company features
- ✅ **Advanced Analytics**: 
  - Company-wide performance metrics
  - User productivity reports
  - Financial and operational insights
- ✅ **Data Export**: 
  - Export all company data
  - Generate compliance reports
- ✅ **Security Settings**:
  - Manage company-wide security policies
  - Access audit logs
  - Configure data retention policies

#### **Database Access:**
- Can read/write **ALL** company data
- Can modify company table directly
- Can manage company_invitations
- Full access to all orders, assignments, buy lists

---

### 👔 **MANAGER Role**

#### **Core Responsibilities:**
- **Team Leadership**: Manage workers and daily operations
- **Project Management**: Create, assign, and track orders
- **Resource Planning**: Manage buy lists and resource allocation
- **Team Coordination**: Assign tasks and monitor progress

#### **Permissions:**
- ✅ **All Worker permissions** (inherits everything below)
- ✅ **Order Management**:
  - Create new orders
  - Edit existing orders
  - Delete orders
  - Assign orders to workers
  - Change order status and priority
- ✅ **Team Management**:
  - View all team members in company
  - Assign/unassign orders to workers
  - View worker performance metrics
- ✅ **Buy List Management**:
  - Add items to company buy list
  - Edit buy list items
  - Mark items as purchased
  - Manage buy list categories and priorities
- ✅ **Basic Analytics**:
  - View team performance reports
  - Track order completion rates
  - Monitor buy list usage
- ✅ **User Invitations**:
  - Invite new workers to company (but cannot change roles)

#### **Database Access:**
- Can read/write orders in their company
- Can manage order_assignments
- Can manage buy_list items
- Can read profiles in their company
- **Cannot** modify company settings or user roles

---

### 👷 **WORKER Role**

#### **Core Responsibilities:**
- **Task Execution**: Complete assigned orders
- **Status Updates**: Update progress on assigned work
- **Resource Requests**: Add items to buy list when needed

#### **Permissions:**
- ✅ **View Orders**:
  - See all orders in company
  - View order details and attachments
- ✅ **Manage Assignments**:
  - Star/unstar orders for priority
  - Add notes to their assignments
  - Update completion status
- ✅ **Buy List Participation**:
  - View company buy list
  - Add needed items
  - Mark items as bought
- ✅ **Profile Management**:
  - Update own profile information
  - Change avatar and job title
- ✅ **Basic Analytics**:
  - View their own performance metrics
  - See their assigned orders summary

#### **Database Access:**
- Can read orders in their company
- Can update their own order_assignments (starred, notes)
- Can read/write buy_list items
- Can read/write own profile only
- **Cannot** create/edit orders or manage other users

---

## 🎯 **Key Differences Summary**

| **Permission** | **Admin** | **Manager** | **Worker** |
|---------------|-----------|-------------|------------|
| **Company Settings** | ✅ Full Control | ❌ No Access | ❌ No Access |
| **User Management** | ✅ All Users | ⚠️ Invite Only | ❌ No Access |
| **Billing/Subscriptions** | ✅ Full Access | ❌ No Access | ❌ No Access |
| **Create/Edit Orders** | ✅ Yes | ✅ Yes | ❌ View Only |
| **Assign Orders** | ✅ Yes | ✅ Yes | ❌ No |
| **Delete Orders** | ✅ Yes | ✅ Yes | ❌ No |
| **Manage Buy List** | ✅ Yes | ✅ Yes | ⚠️ Add Items Only |
| **View Analytics** | ✅ Advanced | ✅ Team Level | ⚠️ Personal Only |
| **Export Data** | ✅ All Data | ⚠️ Team Data | ❌ No Export |
| **Security Settings** | ✅ Yes | ❌ No | ❌ No |

---

## 🏗️ **Database Implementation**

### **RLS Policy Examples:**

#### **Admin Access (Company Management):**
```sql
-- Admins can update company settings
CREATE POLICY "admins_update_company" ON companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = companies.id 
        AND (p.role = 'admin' OR p.is_company_owner = true)
    )
  );
```

#### **Manager Access (Order Management):**
```sql
-- Managers can create/edit/delete orders
CREATE POLICY "managers_manage_orders" ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = orders.company_id
        AND p.role IN ('admin', 'manager')
    )
  );
```

#### **Worker Access (View Only):**
```sql
-- Workers can only view orders
CREATE POLICY "workers_view_orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
        AND p.company_id = orders.company_id
    )
  );
```

---

## 🎭 **Real-World Examples**

### **Admin Scenarios:**
- **Sarah (Company Owner/Admin)**:
  - Sets up company profile and branding
  - Invites first managers and workers
  - Manages subscription and billing
  - Reviews company-wide performance
  - Configures security policies

### **Manager Scenarios:**
- **John (Project Manager)**:
  - Creates client orders and assigns to team
  - Reviews team progress and reassigns tasks
  - Manages project buy list and approves purchases
  - Invites new workers when team grows
  - Generates team performance reports

### **Worker Scenarios:**
- **Lisa (Designer)**:
  - Views assigned design orders
  - Stars urgent projects for quick access
  - Adds design supplies to buy list
  - Updates order status when complete
  - Views her personal productivity metrics

---

## 🚀 **Upgrade Path**

### **Promoting Users:**
- **Worker → Manager**: Gets order management and assignment permissions
- **Manager → Admin**: Gets company management and billing permissions
- **Admin → Company Owner**: Gets highest level system access

### **Role Changes:**
```sql
-- Admin can promote/demote users
UPDATE profiles 
SET role = 'manager' 
WHERE id = 'user_id' 
  AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
```

The **Admin** role is essentially the "Company Owner" level with full business control, while **Manager** is the "Team Lead" level focused on project and team management! 🎯