import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript-like intellisense
export const TABLES = {
  COMPANIES: 'companies',
  PROFILES: 'profiles',
  ORDERS: 'orders',
  ORDER_ASSIGNMENTS: 'order_assignments',
  BUY_LIST: 'buy_list',
  COMPANY_INVITATIONS: 'company_invitations'
}

export const ORDER_STATUS = {
  NEW: 'new',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
}

export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  WORKER: 'worker'
}

export const ROLES = {
  MANAGER: 'manager',
  WORKER: 'worker'
}