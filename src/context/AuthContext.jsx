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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const signUp = async (email, password, profileData) => {
    try {
      // Prepare metadata for the trigger function
      let metadata = {
        full_name: profileData.full_name,
        role: profileData.role || 'worker'
      }

      // Handle company setup
      if (profileData.company_type === 'new') {
        // Creating new company
        metadata.company_name = profileData.company_name
      } else if (profileData.company_type === 'existing' && profileData.invitation_code) {
        // Joining existing company via invitation
        // You would typically validate invitation_code and get company_id
        // For now, we'll handle this in the trigger or separately
        metadata.invitation_code = profileData.invitation_code
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: undefined, // No email redirect needed
          captchaToken: undefined     // Skip captcha for company emails
        }
      })

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