import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const Profile = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    email: ''
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies (
            id,
            name,
            created_at
          )
        `)
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)
      setCompany(profileData.companies)
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || user.email || ''
      })

    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.full_name.trim()) {
      toast.error('Full name is required')
      return
    }

    try {
      setUpdating(true)

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          email: formData.email
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully!')
      await fetchProfile()

    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your account information</p>
      </div>

      {/* Profile Information Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Personal Information</h3>
          <p className="text-xs sm:text-sm text-gray-500">Update your personal details below</p>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                required
                className="input-field mt-1"
                value={formData.full_name}
                onChange={handleInputChange}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="input-field mt-1 bg-gray-50"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                title="Email cannot be changed. Contact support if needed."
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <input
                type="text"
                className="input-field mt-1 bg-gray-50"
                value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Member Since
              </label>
              <input
                type="text"
                className="input-field mt-1 bg-gray-50"
                value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}
                disabled
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={updating}
              className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {updating ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Company Information Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Company Information</h3>
          <p className="text-xs sm:text-sm text-gray-500">Your company details</p>
        </div>

        <div className="p-4 sm:p-6">
          {company ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  className="input-field mt-1 bg-gray-50"
                  value={company.name}
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Company Since
                </label>
                <input
                  type="text"
                  className="input-field mt-1 bg-gray-50"
                  value={new Date(company.created_at).toLocaleDateString()}
                  disabled
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Company ID
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Share this ID with new team members for invitations
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(company.id)
                      toast.success('Company ID copied to clipboard!')
                    }}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Copy ID
                  </button>
                </div>
                <input
                  type="text"
                  className="input-field mt-1 bg-gray-50 font-mono text-sm"
                  value={company.id}
                  disabled
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No company information available</p>
          )}
        </div>
      </div>

      {/* Account Security Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Account Security</h3>
          <p className="text-xs sm:text-sm text-gray-500">Manage your account security settings</p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3 sm:gap-0">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Password</h4>
                <p className="text-sm text-gray-500">
                  Last updated: Not available
                </p>
              </div>
              <button
                onClick={() => {
                  // This would typically trigger a password reset email
                  toast.info('Password reset functionality can be added here')
                }}
                className="w-full sm:w-auto px-3 py-1 text-sm text-primary-600 hover:text-primary-500"
              >
                Change Password
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3 sm:gap-0">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-xs sm:text-sm text-gray-500">
                  Add an extra layer of security to your account
                </p>
              </div>
              <button
                onClick={() => {
                  toast.info('2FA setup can be implemented here')
                }}
                className="w-full sm:w-auto px-3 py-1 text-sm text-primary-600 hover:text-primary-500"
              >
                Setup 2FA
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-3 sm:gap-0">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Login Sessions</h4>
                <p className="text-sm text-gray-500">
                  Manage your active login sessions
                </p>
              </div>
              <button
                onClick={() => {
                  toast.info('Session management can be implemented here')
                }}
                className="w-full sm:w-auto px-3 py-1 text-sm text-primary-600 hover:text-primary-500"
              >
                View Sessions
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions Card */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Account Actions</h3>
          <p className="text-xs sm:text-sm text-gray-500">Dangerous actions that affect your account</p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border border-red-200 rounded-lg bg-red-50 gap-3 sm:gap-0">
              <div>
                <h4 className="text-sm font-medium text-red-900">Delete Account</h4>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    toast.error('Account deletion functionality needs to be implemented')
                  }
                }}
                className="w-full sm:w-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile