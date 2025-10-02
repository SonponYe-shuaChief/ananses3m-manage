# AMAYA Orders Manager

A lightweight SaaS-ready web application designed for small creative and production teams (e.g., design & print shops). AMAYA helps managers create, assign, and track orders with design images and detailed specifications, while allowing workers to view and mark their assigned tasks as complete.

## Purpose

AMAYA reduces miscommunication, prevents missed supplies, and provides managers with visibility (analytics) and simple shop-floor coordination. The core value proposition is faster, clearer job handoffs and shared visibility of supplies.

**Target Users:** Shop managers and on-floor workers

## Features

### For Managers
- **Order Management**: Create, edit, and track orders with detailed specifications
- **Team Assignment**: Assign orders to specific workers or make them available to all
- **Real-time Dashboard**: View order statistics, due dates, and overdue items
- **Team Management**: Invite workers, manage company settings
- **File Upload**: Attach reference images and documents to orders

### For Workers
- **My Work Dashboard**: View assigned orders and general tasks
- **Progress Tracking**: Mark orders as completed with star system
- **Real-time Updates**: Get notified of new assignments
- **Order Details**: Access all order specifications and reference materials

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (Authentication, Database, Storage, Realtime)
- **Routing**: React Router v6
- **State Management**: React Hooks + Context API
- **Notifications**: React Hot Toast
- **PWA**: Vite PWA Plugin

## 📦 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ananses3m-manage
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase Database**
   
   Create the following tables in your Supabase project:

   ```sql
   -- Companies table
   CREATE TABLE companies (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     name TEXT NOT NULL,
     created_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Profiles table
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     full_name TEXT,
     email TEXT,
     role TEXT CHECK (role IN ('manager', 'worker')) DEFAULT 'worker',
     company_id UUID REFERENCES companies(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Orders table
   CREATE TABLE orders (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     title TEXT NOT NULL,
     details TEXT,
     client_name TEXT NOT NULL,
     due_date DATE NOT NULL,
     priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
     category TEXT,
     quantity INTEGER DEFAULT 1,
     specs JSONB DEFAULT '{}',
     status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
     assignment_type TEXT CHECK (assignment_type IN ('general', 'specific')) DEFAULT 'general',
     company_id UUID REFERENCES companies(id) NOT NULL,
     created_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Order assignments table
   CREATE TABLE order_assignments (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
     worker_id UUID REFERENCES auth.users(id),
     assigned_by UUID REFERENCES auth.users(id),
     marked_done BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Invitations table
   CREATE TABLE invitations (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     email TEXT NOT NULL,
     role TEXT CHECK (role IN ('manager', 'worker')) DEFAULT 'worker',
     company_id UUID REFERENCES companies(id) NOT NULL,
     code TEXT UNIQUE NOT NULL,
     is_used BOOLEAN DEFAULT FALSE,
     used_by UUID REFERENCES auth.users(id),
     used_at TIMESTAMP WITH TIME ZONE,
     expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
     created_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Buy list table (for future supply management)
   CREATE TABLE buy_list (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     item_name TEXT NOT NULL,
     quantity INTEGER DEFAULT 1,
     priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
     order_id UUID REFERENCES orders(id),
     company_id UUID REFERENCES companies(id) NOT NULL,
     added_by UUID REFERENCES auth.users(id),
     is_purchased BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. **Enable Row Level Security (RLS)**
   
   Enable RLS on all tables and add policies:

   ```sql
   -- Enable RLS
   ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
   ALTER TABLE order_assignments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE buy_list ENABLE ROW LEVEL SECURITY;

   -- Policies (basic examples - customize as needed)
   CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
   
   -- Add more policies as needed for your security requirements
   ```

6. **Add a logo image**
   
   Place your company logo as `public/amaya.png` (or update the image references in the code)

7. **Start the development server**
   ```bash
   npm run dev
   ```

## 🏗 Project Structure

```
src/
├── components/
│   ├── AuthGuard.jsx      # Route protection
│   └── Layout.jsx         # Main app layout
├── hooks/
│   └── useAuth.js         # Authentication hook
├── lib/
│   └── supabaseClient.js  # Supabase configuration
├── pages/
│   ├── Dashboard.jsx      # Main dashboard
│   ├── Login.jsx          # Authentication page
│   ├── Orders.jsx         # Orders management
│   ├── Profile.jsx        # User profile
│   └── Settings.jsx       # App settings
├── App.jsx               # Main app component
├── index.css            # Global styles
└── main.jsx            # App entry point
```

## 🔑 Key Features Implementation

### Authentication & Onboarding
- Single login page with toggle between Sign In/Sign Up
- Company creation or joining via invitation codes
- User metadata stored in both auth.user_metadata and profiles table
- Forgot password functionality

### Role-Based Access
- **Manager**: Full CRUD operations, team management, analytics
- **Worker**: View assigned orders, mark tasks complete

### Real-time Features
- Order assignments notifications
- Buy list updates
- Status changes (using Supabase Realtime)

### PWA Support
- Service worker for offline functionality
- App manifest for installation
- Push notification support (framework ready)

## Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**
   - Vercel
   - Netlify  
   - Supabase Hosting
   - Any static hosting service

3. **Update environment variables** in your deployment platform

## Usage

### For New Companies
1. Sign up and select "Create new company"
2. Enter company name and manager details
3. Access the dashboard and start creating orders
4. Invite workers via Settings > Team Management

### For Existing Companies
1. Get invitation code from company manager
2. Sign up and select "Join existing company"
3. Enter the invitation code
4. Access assigned orders via Dashboard

### Creating Orders
1. Go to Orders page
2. Click "Create Order"
3. Fill in order details, specifications
4. Choose assignment type (General or Specific workers)
5. Submit to make available to workers

### Worker Workflow
1. View assigned orders on Dashboard
2. Check order details and specifications
3. Mark orders as done when completed
4. Manager receives notification of completion

## Configuration

### Supabase Storage (Optional)
For file uploads, enable Supabase Storage and create a bucket:

```sql
-- Create storage bucket for order attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-attachments', 'order-attachments', true);

-- Create storage policies
CREATE POLICY "Users can upload files" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'order-attachments');
```

### Real-time Subscriptions
Enable real-time on required tables in your Supabase dashboard:
- orders
- order_assignments  
- buy_list

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**AMAYA** - Empowering small creative teams with better order management.
