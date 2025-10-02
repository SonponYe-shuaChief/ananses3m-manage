import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const Settings = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [workers, setWorkers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('worker')

  useEffect(() => {
    if (user) {
      fetchSettingsData()
    }
  }, [user])

  const fetchSettingsData = async () => {
    try {
      setLoading(true)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies (*)
        `)
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)
      setCompany(profileData.companies)

      // If user is a manager, fetch team data
      if (profileData.role === 'manager') {
        await fetchTeamData(profileData.company_id)
      }

    } catch (error) {
      console.error('Error fetching settings data:', error)
      toast.error('Failed to load settings data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamData = async (companyId) => {
    try {
      // Fetch team members
      const { data: workersData, error: workersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', companyId)
        .neq('id', user.id)

      if (workersError) throw workersError
      setWorkers(workersData)

      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_used', false)

      if (invitationsError) throw invitationsError
      setInvitations(invitationsData)

    } catch (error) {
      console.error('Error fetching team data:', error)
    }
  }

  const generateInvitationCode = () => {
    return Math.random().toString(36).substr(2, 9).toUpperCase()
  }

  const handleSendInvitation = async (e) => {
    e.preventDefault()

    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    try {
      const invitationCode = generateInvitationCode()

      // Create invitation record
      const { error } = await supabase
        .from('invitations')
        .insert({
          email: inviteEmail.toLowerCase().trim(),
          role: inviteRole,
          company_id: company.id,
          code: invitationCode,
          invited_by: user.id
        })

      if (error) throw error

      toast.success(`Invitation sent! Code: ${invitationCode}`)
      setShowInviteForm(false)
      setInviteEmail('')
      setInviteRole('worker')
      
      // Refresh invitations list
      await fetchTeamData(company.id)

    } catch (error) {
      console.error('Error sending invitation:', error)
      toast.error('Failed to send invitation')
    }
  }

  const handleDeleteInvitation = async (invitationId) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)

      if (error) throw error

      toast.success('Invitation deleted')
      await fetchTeamData(company.id)

    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast.error('Failed to delete invitation')
    }
  }

  const handleRemoveWorker = async (workerId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      // First, remove worker's assignments
      const { error: assignmentsError } = await supabase
        .from('order_assignments')
        .delete()
        .eq('worker_id', workerId)

      if (assignmentsError) throw assignmentsError

      // Then update their profile to remove company association
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_id: null })
        .eq('id', workerId)

      if (profileError) throw profileError

      toast.success('Team member removed')
      await fetchTeamData(company.id)

    } catch (error) {
      console.error('Error removing worker:', error)
      toast.error('Failed to remove team member')
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
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600">Manage your company settings and team</p>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Company Settings</h3>
          <p className="text-xs sm:text-sm text-gray-500">Your company information</p>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company Name
              </label>
              <input
                type="text"
                className="input-field mt-1 bg-gray-50"
                value={company?.name || ''}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company ID
              </label>
              <div className="flex mt-1">
                <input
                  type="text"
                  className="input-field bg-gray-50 rounded-r-none text-xs sm:text-sm"
                  value={company?.id || ''}
                  disabled
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(company?.id || '')
                    toast.success('Company ID copied!')
                  }}
                  className="px-2 sm:px-3 py-2 bg-gray-200 text-gray-700 rounded-r-md hover:bg-gray-300 border border-l-0 border-gray-300 text-xs sm:text-sm"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created Date
              </label>
              <input
                type="text"
                className="input-field mt-1 bg-gray-50"
                value={company?.created_at ? new Date(company.created_at).toLocaleDateString() : ''}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Your Role
              </label>
              <input
                type="text"
                className="input-field mt-1 bg-gray-50"
                value={profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ''}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* Team Management - Only for Managers */}
      {profile?.role === 'manager' && (
        <>
          {/* Team Members */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">Team Members</h3>
                  <p className="text-xs sm:text-sm text-gray-500">Manage your team members</p>
                </div>
                <button
                  onClick={() => setShowInviteForm(true)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  Invite Member
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {workers.length === 0 ? (
                <div className="px-4 sm:px-6 py-6 sm:py-8 text-center">
                  <p className="text-gray-500 text-sm sm:text-base">No team members yet</p>
                  <button
                    onClick={() => setShowInviteForm(true)}
                    className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
                  >
                    Invite your first team member
                  </button>
                </div>
              ) : (
                workers.map((worker) => (
                  <div key={worker.id} className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{worker.full_name}</p>
                      <p className="text-sm text-gray-500">{worker.email}</p>
                      <p className="text-xs text-gray-400 capitalize">{worker.role}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                      <span className="text-xs text-gray-400">
                        Joined {new Date(worker.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleRemoveWorker(worker.id)}
                        className="text-red-600 hover:text-red-500 text-sm self-start sm:self-auto"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Pending Invitations</h3>
              <p className="text-xs sm:text-sm text-gray-500">Invitations that haven't been accepted yet</p>
            </div>

            <div className="divide-y divide-gray-200">
              {invitations.length === 0 ? (
                <div className="px-4 sm:px-6 py-6 sm:py-8 text-center">
                  <p className="text-gray-500 text-sm sm:text-base">No pending invitations</p>
                </div>
              ) : (
                invitations.map((invitation) => (
                  <div key={invitation.id} className="px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {invitation.code}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{invitation.role}</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-center sm:space-x-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invitation.code)
                          toast.success('Invitation code copied!')
                        }}
                        className="text-primary-600 hover:text-primary-500 text-sm self-start sm:self-auto"
                      >
                        Copy Code
                      </button>
                      <button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-500 text-sm self-start sm:self-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

    

      {/* Invite Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Invite Team Member</h3>
                <button
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail('')
                    setInviteRole('worker')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSendInvitation} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  className="input-field mt-1"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Enter team member's email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  className="input-field mt-1"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="worker">Worker</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false)
                    setInviteEmail('')
                    setInviteRole('worker')
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm sm:text-base order-1 sm:order-2"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings