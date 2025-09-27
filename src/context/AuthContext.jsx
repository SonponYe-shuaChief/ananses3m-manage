import React, { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { AuthContext } from './contexts'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      console.log('Fetching profile for user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        return
      }

      console.log('Profile fetched successfully:', data)
      
      // Check if company_id exists
      if (!data.company_id) {
        console.warn('Profile missing company_id:', data)
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signUp = async (email, password, profileData) => {
    try {
      console.log('signUp: Starting signup process', { email, profileData })
      
      // Prepare metadata for the trigger function  
      let metadata = {
        full_name: profileData.full_name,
        role: profileData.role || 'manager'  // Default to manager, not worker
      }

      console.log('signUp: Base metadata prepared', metadata)

      // Handle company setup
      if (profileData.company_type === 'new') {
        // Creating new company
        metadata.company_name = profileData.company_name
        console.log('signUp: New company signup', metadata.company_name)
      } else if (profileData.company_type === 'existing' && profileData.invitation_code) {
        // Joining existing company via invitation
        metadata.invitation_code = profileData.invitation_code
        console.log('signUp: Existing company signup with invitation', metadata.invitation_code)
      }

      console.log('signUp: Final metadata for Supabase', metadata)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: undefined, // No email redirect needed
          captchaToken: undefined     // Skip captcha for company emails
        }
      })

      console.log('signUp: Supabase auth result', { data, error })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setProfile(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isManager: profile?.role === 'manager' || profile?.role === 'admin',
    isAdmin: profile?.role === 'admin',
    isWorker: profile?.role === 'worker',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}