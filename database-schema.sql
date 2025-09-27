-- Anansesɛm Orders Manager Database Schema
-- Run this in your Supabase SQL editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buy_list ENABLE ROW LEVEL SECURITY;

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  organization_id uuid NOT NULL,
  full_name text,
  role text CHECK (role IN ('manager', 'worker')) DEFAULT 'worker',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  client_name text,
  due_date date,
  status text CHECK (status IN ('new', 'in_progress', 'completed')) DEFAULT 'new',
  priority text CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  category text,
  image_urls text[],
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create order_assignments table
CREATE TABLE IF NOT EXISTS public.order_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  worker_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  starred boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(order_id, worker_id)
);

-- Create buy_list table
CREATE TABLE IF NOT EXISTS public.buy_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  item_name text NOT NULL,
  added_by uuid REFERENCES public.profiles(id),
  bought boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_order_assignments_updated_at
  BEFORE UPDATE ON public.order_assignments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_buy_list_updated_at
  BEFORE UPDATE ON public.buy_list
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers can read all profiles in org" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND role = 'manager' 
        AND organization_id = profiles.organization_id
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Orders policies
CREATE POLICY "Users can read orders in their org" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = orders.organization_id
    )
  );

CREATE POLICY "Managers can create orders" ON public.orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND role = 'manager' 
        AND organization_id = orders.organization_id
    )
  );

CREATE POLICY "Managers can update orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND role = 'manager' 
        AND organization_id = orders.organization_id
    )
  );

CREATE POLICY "Managers can delete orders" ON public.orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND role = 'manager' 
        AND organization_id = orders.organization_id
    )
  );

-- Order assignments policies
CREATE POLICY "Users can read assignments" ON public.order_assignments
  FOR SELECT USING (
    worker_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.organization_id = p.organization_id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager' 
        AND o.id = order_assignments.order_id
    )
  );

CREATE POLICY "Managers can manage assignments" ON public.order_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.orders o ON o.organization_id = p.organization_id
      WHERE p.id = auth.uid() 
        AND p.role = 'manager' 
        AND o.id = order_assignments.order_id
    )
  );

CREATE POLICY "Workers can update their own assignments" ON public.order_assignments
  FOR UPDATE USING (worker_id = auth.uid())
  WITH CHECK (worker_id = auth.uid());

-- Buy list policies
CREATE POLICY "Users can read buy list in org" ON public.buy_list
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = buy_list.organization_id
    )
  );

CREATE POLICY "Users can create buy list items" ON public.buy_list
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = buy_list.organization_id
    )
  );

CREATE POLICY "Users can update buy list items" ON public.buy_list
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = buy_list.organization_id
    )
  );

CREATE POLICY "Users can delete buy list items" ON public.buy_list
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
        AND organization_id = buy_list.organization_id
    )
  );

-- Create storage bucket for order images (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('order-images', 'order-images', true);

-- Create storage policy for order images
-- CREATE POLICY "Users can upload order images" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'order-images');

-- CREATE POLICY "Users can view order images" ON storage.objects
--   FOR SELECT USING (bucket_id = 'order-images');