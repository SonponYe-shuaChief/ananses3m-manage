import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing'
  })
  
  // Create a fallback client to prevent app crash
  const fallbackUrl = 'https://placeholder.supabase.co'
  const fallbackKey = 'placeholder-key'
  
  console.warn('Using fallback Supabase client - app will not function properly')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    }
})

// Helper function to handle Supabase errors
export const handleSupabaseError = (error) => {
  console.error('Supabase error:', error)
  
  if (error?.message) {
    // Common Supabase error messages mapping
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please try again.'
    }
    if (error.message.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.'
    }
    if (error.message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.'
    }
    if (error.message.includes('Invalid email')) {
      return 'Please enter a valid email address.'
    }
    if (error.message.includes('Database error saving new user')) {
      return 'Account creation failed. Please check if all required fields are filled and try again.'
    }
    if (error.message.includes('Invalid or expired invitation code')) {
      return 'The invitation code is invalid or has expired. Please check with your manager.'
    }
    if (error.message.includes('duplicate key value')) {
      return 'This email is already registered. Please sign in instead.'
    }
    if (error.message.includes('violates check constraint')) {
      return 'Invalid data provided. Please check your inputs and try again.'
    }
    
    // Log the full error for debugging
    console.error('Full error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    return error.message
  }
  
  return 'An unexpected error occurred. Please try again.'
}