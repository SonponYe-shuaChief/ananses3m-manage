import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const Dashboard = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    dueToday: 0,
    overdue: 0,
    completed: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      if (profileData.role === 'manager') {
        await fetchManagerDashboard(profileData.company_id)
      } else {
        await fetchWorkerDashboard(user.id, profileData.company_id)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchManagerDashboard = async (companyId) => {
    try {
      // Fetch order statistics
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)

      if (ordersError) throw ordersError

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const stats = {
        totalOrders: orders.length,
        dueToday: orders.filter(order => {
          const dueDate = new Date(order.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate.getTime() === today.getTime() && order.status !== 'completed'
        }).length,
        overdue: orders.filter(order => {
          const dueDate = new Date(order.due_date)
          return dueDate < today && order.status !== 'completed'
        }).length,
        completed: orders.filter(order => order.status === 'completed').length
      }

      setStats(stats)

      // Fetch recent orders
      const { data: recentOrdersData, error: recentError } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentError) throw recentError
      setRecentOrders(recentOrdersData)

    } catch (error) {
      console.error('Error fetching manager dashboard:', error)
    }
  }

  const fetchWorkerDashboard = async (userId, companyId) => {
    try {
      // Fetch assigned orders for worker
      const { data: assignments, error: assignmentsError } = await supabase
        .from('order_assignments')
        .select(`
          *,
          orders (*)
        `)
        .eq('worker_id', userId)
        .eq('orders.status', 'in_progress')

      if (assignmentsError) throw assignmentsError

      // Also fetch general orders (not specifically assigned)
      const { data: generalOrders, error: generalError } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', companyId)
        .eq('assignment_type', 'general')
        .eq('status', 'in_progress')

      if (generalError) throw generalError

      const assignedOrders = assignments?.map(a => a.orders) || []
      const allMyOrders = [...assignedOrders, ...generalOrders]

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const stats = {
        totalOrders: allMyOrders.length,
        dueToday: allMyOrders.filter(order => {
          const dueDate = new Date(order.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate.getTime() === today.getTime()
        }).length,
        overdue: allMyOrders.filter(order => {
          const dueDate = new Date(order.due_date)
          return dueDate < today
        }).length,
        completed: assignments?.filter(a => a.marked_done).length || 0
      }

      setStats(stats)
      setRecentOrders(allMyOrders.slice(0, 5))

    } catch (error) {
      console.error('Error fetching worker dashboard:', error)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed':
        return 'badge-success'
      case 'in_progress':
        return 'badge-info'
      case 'pending':
        return 'badge-warning'
      default:
        return 'badge-info'
    }
  }

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high':
        return 'badge-error'
      case 'medium':
        return 'badge-warning'
      case 'low':
        return 'badge-success'
      default:
        return 'badge-info'
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
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.full_name}!
            </h1>
            <p className="text-gray-600">
              {profile?.role === 'manager' ? 'Manager Dashboard' : 'Worker Dashboard'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Today</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">📅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Due Today</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.dueToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">⚠️</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Overdue</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white font-bold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                {profile?.role === 'manager' ? 'Completed' : 'Marked Done'}
              </p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              {profile?.role === 'manager' ? 'Recent Orders' : 'My Work Today'}
            </h3>
            <Link 
              to="/orders" 
              className="text-primary-600 hover:text-primary-500 text-sm font-medium"
            >
              View all →
            </Link>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {recentOrders.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No orders found</p>
              {profile?.role === 'manager' && (
                <Link 
                  to="/orders" 
                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200"
                >
                  Create your first order
                </Link>
              )}
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {order.title}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      Client: {order.client_name}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`badge ${getPriorityBadgeClass(order.priority)}`}>
                        {order.priority} priority
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 text-right">
                    <p className="text-sm text-gray-500">Due</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(order.due_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile?.role === 'manager' ? (
            <>
              <Link
                to="/orders"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex-shrink-0">
                  <span className="text-2xl">➕</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Create Order</p>
                  <p className="text-sm text-gray-500">Add a new order</p>
                </div>
              </Link>
              
              <Link
                to="/settings"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex-shrink-0">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Invite Workers</p>
                  <p className="text-sm text-gray-500">Add team members</p>
                </div>
              </Link>
            </>
          ) : (
            <Link
              to="/orders"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex-shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">View My Orders</p>
                <p className="text-sm text-gray-500">See assigned work</p>
              </div>
            </Link>
          )}
          
          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex-shrink-0">
              <span className="text-2xl">👤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Update Profile</p>
              <p className="text-sm text-gray-500">Edit your information</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard