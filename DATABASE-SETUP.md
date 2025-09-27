# 🗄️ Database Setup Guide for Anansesɛm Orders Manager

## Overview
This guide walks you through setting up the complete database schema for your Anansesɛm Orders Manager PWA in Supabase.

## Prerequisites
- Supabase project created
- Access to Supabase SQL Editor
- Your Supabase project URL and API keys

## 📋 Database Schema Components

### Core Tables:
1. **`profiles`** - User profiles extending auth.users
2. **`orders`** - Main orders with status, priority, images
3. **`order_assignments`** - Many-to-many relationship (orders ↔ workers)
4. **`buy_list`** - Shared shopping/buy list items

### Security Features:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Role-based access control (manager/worker permissions)
- ✅ Organization-level data isolation
- ✅ Secure storage bucket for order images

## 🚀 Setup Instructions

### Method 1: Complete Script (Recommended)
1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the entire content from `supabase-schema-complete.sql`
4. Paste and run the script
5. Verify all tables are created successfully

### Method 2: Step-by-Step Execution
If you prefer to run each section separately:

#### Step 1: Create Tables
```sql
-- Run the STEP 1 section from the schema file
-- Creates: profiles, orders, order_assignments, buy_list
```

#### Step 2: Enable Security
```sql
-- Run the STEP 2 section
-- Enables Row Level Security on all tables
```

#### Step 3: Add Security Policies
```sql
-- Run the STEP 3 section
-- Creates all RLS policies for proper access control
```

#### Step 4: Setup Functions & Triggers
```sql
-- Run the STEP 4 section
-- Auto-creates user profiles on signup
```

#### Step 5: Configure Storage
```sql
-- Run the STEP 5 section
-- Sets up image storage bucket with policies
```

#### Step 6: Enable Realtime & Indexes
```sql
-- Run the STEP 6 section
-- Enables live updates and optimizes performance
```

## 🔧 Environment Configuration

After running the schema, update your `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🧪 Testing the Setup

### 1. Test Authentication
- Try signing up a new user
- Check if profile is auto-created in `profiles` table

### 2. Test Data Operations
- Create a test order
- Assign workers to orders
- Add items to buy list
- Upload test images

### 3. Test Security
- Verify users can only see their organization's data
- Test manager vs worker permissions
- Confirm RLS policies are working

## 📊 Database Schema Overview

```
auth.users (Supabase managed)
├── profiles (extends auth.users)
    ├── orders
    │   └── order_assignments
    └── buy_list

storage.objects
└── order-images (bucket)
```

## 🔑 Key Features

### Multi-Tenancy
- Organization-based data isolation
- Users only see their organization's data

### Role-Based Access
- **Managers**: Full CRUD on orders, can assign workers
- **Workers**: Read orders, update starred status

### Real-time Updates
- Live notifications when orders change
- Instant buy list updates across team

### File Storage
- Secure image uploads for orders
- Public access to uploaded images
- User-specific upload permissions

## 🚨 Important Notes

1. **Organization ID**: Set this when users first sign up or join
2. **Image Naming**: Prefix files with user_id for security
3. **Backup**: Always backup before making schema changes
4. **Testing**: Test all permissions thoroughly before production

## 📝 Next Steps

After database setup:
1. Configure your React app environment variables
2. Test authentication flow
3. Verify data operations work correctly
4. Deploy and monitor performance

## 🆘 Troubleshooting

### Common Issues:
- **RLS Policy Errors**: Check if user has proper organization_id set
- **Image Upload Fails**: Verify storage bucket policies
- **Realtime Not Working**: Ensure tables are added to publication

### Debug Queries:
```sql
-- Check user profile
SELECT * FROM profiles WHERE id = auth.uid();

-- Verify organization data
SELECT * FROM orders WHERE organization_id = 'your_org_id';

-- Test RLS policies
SELECT * FROM orders; -- Should only show user's org orders
```