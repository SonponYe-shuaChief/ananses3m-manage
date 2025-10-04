import { useState, useEffect, createContext, useContext } from 'react'
import { supabase, handleSupabaseError } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error getting session:', error)
        setError(handleSupabaseError(error))
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        
        // Clear error on successful auth change
        if (session?.user) {
          setError(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, metadata) => {
    try {
      setLoading(true)
      setError(null)

      console.log('Starting signup with metadata:', metadata)

      // Step 1: Create auth user with metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: metadata.full_name,
            role: metadata.role,
            company_type: metadata.company_type,
            company_name: metadata.company_name || null,
            invitation_code: metadata.invitation_code || null
          }
        }
      })

      if (error) throw error

      // Step 2: If signup successful, complete profile setup
      if (data.user && !error) {
        console.log('Auth signup successful, completing profile setup...')
        await completeProfileSetup(data.user, metadata)
      }

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      const errorMessage = handleSupabaseError(error)
      setError(errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { user: data.user, error: null }
    } catch (error) {
      const errorMessage = handleSupabaseError(error)
      setError(errorMessage)
      return { user: null, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Clear user state immediately for better UX
      setUser(null)
      
      // Try to sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      // Even if there's an error, we've already cleared the local state
      // This handles cases where the session might be corrupted or missing
      if (error) {
        console.warn('Logout warning:', error.message)
        // Don't throw error for missing session - user is logging out anyway
        if (!error.message?.includes('session') && !error.message?.includes('auth')) {
          throw error
        }
      }
      
    } catch (error) {
      console.error('Logout error:', error)
      const errorMessage = handleSupabaseError(error)
      setError(errorMessage)
      
      // Still clear user state even if there's an error
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      setLoading(true)
      setError(null)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      return { error: null }
    } catch (error) {
      const errorMessage = handleSupabaseError(error)
      setError(errorMessage)
      return { error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to complete profile setup after signup
  const completeProfileSetup = async (user, metadata) => {
    try {
      console.log('Completing profile setup for:', user.email)

      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update the basic profile with full information
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: metadata.full_name,
          role: metadata.role,
          email: user.email
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Profile update error:', updateError)
        throw updateError
      }

      let companyId = null

      // Handle company creation or joining using database functions
      if (metadata.company_type === 'new' && metadata.company_name) {
        console.log('Creating new company:', metadata.company_name)
        
        const { data, error: companyError } = await supabase.rpc(
          'create_company_and_update_profile', 
          { 
            company_name: metadata.company_name,
            user_id: user.id 
          }
        )

        if (companyError) throw companyError
        companyId = data

      } else if (metadata.company_type === 'existing' && metadata.invitation_code) {
        console.log('Processing invitation:', metadata.invitation_code)
        
        const { data, error: invitationError } = await supabase.rpc(
          'process_invitation_and_update_profile',
          {
            invitation_code: metadata.invitation_code,
            user_id: user.id
          }
        )

        if (invitationError) throw invitationError
        companyId = data
      }

      console.log('Profile setup completed successfully')

    } catch (error) {
      console.error('Error completing profile setup:', error)
      throw error
    }
  }

  const value = {
    user,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}