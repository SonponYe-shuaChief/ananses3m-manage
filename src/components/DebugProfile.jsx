import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabaseClient'

const DebugProfile = () => {
  const { user, profile, loading } = useAuth()
  const [fixing, setFixing] = useState(false)
  const [fixResult, setFixResult] = useState(null)

  const handleCreateProfile = async () => {
    setFixing(true)
    setFixResult(null)
    
    try {
      // Call the database function to create missing profile
      const { data, error } = await supabase.rpc('create_missing_profile')
      
      if (error) {
        console.error('Error creating profile:', error)
        setFixResult({ success: false, error: error.message })
      } else {
        console.log('Profile creation result:', data)
        setFixResult(data)
        
        // Refresh the page after successful creation
        if (data?.success) {
          setTimeout(() => window.location.reload(), 2000)
        }
      }
    } catch (err) {
      console.error('Error:', err)
      setFixResult({ success: false, error: err.message })
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 rounded p-4 max-w-md z-50 text-xs">
      <h3 className="font-bold text-yellow-800 mb-2">Debug Profile Info</h3>
      
      <div className="space-y-2">
        <div>
          <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
        </div>
        
        <div>
          <strong>User ID:</strong> {user?.id || 'None'}
        </div>
        
        <div>
          <strong>User Email:</strong> {user?.email || 'None'}
        </div>
        
        <div>
          <strong>Profile:</strong>
          <pre className="bg-white p-2 rounded mt-1 max-h-32 overflow-auto">
            {profile ? JSON.stringify(profile, null, 2) : 'None'}
          </pre>
        </div>
        
        <div>
          <strong>Company ID:</strong> 
          <span className={profile?.company_id ? 'text-green-600' : 'text-red-600'}>
            {profile?.company_id || 'MISSING!'}
          </span>
        </div>
        
        {/* Fix Button for Missing Profile */}
        {!profile && user && (
          <div className="mt-3 pt-3 border-t border-yellow-300">
            <button
              onClick={handleCreateProfile}
              disabled={fixing}
              className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-2 rounded text-sm font-medium"
            >
              {fixing ? '🔧 Creating Profile...' : '🚨 FIX: Create Missing Profile'}
            </button>
            
            {fixResult && (
              <div className={`mt-2 p-2 rounded text-xs ${
                fixResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {fixResult.success ? (
                  <>✅ Profile created! Refreshing page...</>
                ) : (
                  <>❌ Error: {fixResult.error}</>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DebugProfile