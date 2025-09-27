import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { supabase } from '../utils/supabaseClient'
import { ORDER_STATUS, PRIORITY } from '../utils/supabaseClient'

const Analytics = () => {
  const { profile, isManager } = useAuth()
  const { orders } = useOrders()
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWorkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          order_assignments(
            id,
            orders(status, priority, created_at)
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('role', 'worker')

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }, [profile?.company_id])

  useEffect(() => {
    if (isManager) {
      fetchWorkers()
    }
    setLoading(false)
  }, [isManager, fetchWorkers])

  if (!isManager) {
    // Personal analytics for workers
    const myOrders = orders.filter(order => 
      order.order_assignments?.some(assignment => assignment.worker_id === profile?.id)
    )

    const myStats = {
      total: myOrders.length,
      completed: myOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
      pending: myOrders.filter(o => o.status !== ORDER_STATUS.COMPLETED).length,
      highPriority: myOrders.filter(o => o.priority === PRIORITY.HIGH && o.status !== ORDER_STATUS.COMPLETED).length,
    }

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">My Analytics</h1>
          <p className="text-gray-600">Your personal work statistics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="bg-blue-500 p-3 rounded-lg text-white text-xl mr-4">📋</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myStats.total}</p>
                <p className="text-sm text-gray-600">Total Orders</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-green-500 p-3 rounded-lg text-white text-xl mr-4">✅</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myStats.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-yellow-500 p-3 rounded-lg text-white text-xl mr-4">⏳</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myStats.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="bg-red-500 p-3 rounded-lg text-white text-xl mr-4">🔥</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{myStats.highPriority}</p>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
            </div>
          </div>
        </div>

        {myStats.total > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate</h2>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-green-500 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${(myStats.completed / myStats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((myStats.completed / myStats.total) * 100)}%
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Manager analytics
  const totalOrders = orders.length
  const completedOrders = orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length
  const pendingOrders = orders.filter(o => o.status !== ORDER_STATUS.COMPLETED).length
  const highPriorityOrders = orders.filter(o => o.priority === PRIORITY.HIGH && o.status !== ORDER_STATUS.COMPLETED).length

  // Orders by status
  const ordersByStatus = {
    [ORDER_STATUS.NEW]: orders.filter(o => o.status === ORDER_STATUS.NEW).length,
    [ORDER_STATUS.IN_PROGRESS]: orders.filter(o => o.status === ORDER_STATUS.IN_PROGRESS).length,
    [ORDER_STATUS.COMPLETED]: orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
  }

  // Orders by priority
  const ordersByPriority = {
    [PRIORITY.LOW]: orders.filter(o => o.priority === PRIORITY.LOW).length,
    [PRIORITY.MEDIUM]: orders.filter(o => o.priority === PRIORITY.MEDIUM).length,
    [PRIORITY.HIGH]: orders.filter(o => o.priority === PRIORITY.HIGH).length,
  }

  // Recent orders (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentOrders = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo).length

  // Worker performance
  const workerStats = workers.map(worker => {
    const workerOrders = worker.order_assignments?.map(a => a.orders) || []
    const completed = workerOrders.filter(o => o.status === ORDER_STATUS.COMPLETED).length
    const total = workerOrders.length

    return {
      ...worker,
      totalOrders: total,
      completedOrders: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }).sort((a, b) => b.completionRate - a.completionRate)

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Team Analytics</h1>
        <p className="text-gray-600">Overview of team performance and order statistics</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center">
            <div className="bg-blue-500 p-3 rounded-lg text-white text-xl mr-4">📋</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-green-500 p-3 rounded-lg text-white text-xl mr-4">✅</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedOrders}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-yellow-500 p-3 rounded-lg text-white text-xl mr-4">⏳</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingOrders}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="bg-red-500 p-3 rounded-lg text-white text-xl mr-4">🔥</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{highPriorityOrders}</p>
              <p className="text-sm text-gray-600">High Priority</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Orders by Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-3">
            {Object.entries(ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {status.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{count}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders by Priority */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Priority</h2>
          <div className="space-y-3">
            {Object.entries(ordersByPriority).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">{priority}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{count}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        priority === PRIORITY.HIGH ? 'bg-red-500' :
                        priority === PRIORITY.MEDIUM ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${totalOrders > 0 ? (count / totalOrders) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worker Performance */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Worker Performance</h2>
        {workerStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Worker
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workerStats.map((worker) => (
                  <tr key={worker.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {worker.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.totalOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {worker.completedOrders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${worker.completionRate}%` }}
                          ></div>
                        </div>
                        <span className="font-medium">{worker.completionRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No workers found</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="card text-center">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-2xl font-bold text-gray-900">{recentOrders}</p>
          <p className="text-sm text-gray-600">Orders (Last 30 days)</p>
        </div>

        <div className="card text-center">
          <div className="text-3xl mb-2">⚡</div>
          <p className="text-2xl font-bold text-gray-900">
            {totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600">Overall Completion Rate</p>
        </div>

        <div className="card text-center">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-2xl font-bold text-gray-900">{workers.length}</p>
          <p className="text-sm text-gray-600">Active Workers</p>
        </div>
      </div>
    </div>
  )
}

export default Analytics