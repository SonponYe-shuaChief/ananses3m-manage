import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { useAssignments } from '../hooks/useAssignments'
import { Link } from 'react-router-dom'
import OrderCard from '../components/OrderCard'
import { ORDER_STATUS } from '../utils/supabaseClient'

const Dashboard = () => {
  const { profile, isManager } = useAuth()
  const { orders } = useOrders()
  const { assignments, toggleStarred } = useAssignments()

  // Filter orders based on role
  const myOrders = isManager ? orders : orders.filter(order => 
    order.order_assignments?.some(assignment => assignment.worker_id === profile?.id)
  )



  const completedOrders = myOrders.filter(order => order.status === ORDER_STATUS.COMPLETED)
  const pendingOrders = myOrders.filter(order => order.status !== ORDER_STATUS.COMPLETED)
  const highPriorityOrders = myOrders.filter(order => 
    order.priority === 'high' && order.status !== ORDER_STATUS.COMPLETED
  )

  const stats = isManager ? [
    {
      name: 'Total Orders',
      value: orders.length,
      icon: '📋',
      color: 'bg-blue-500'
    },
    {
      name: 'Pending Orders',
      value: orders.filter(o => o.status !== ORDER_STATUS.COMPLETED).length,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      name: 'Completed Orders',
      value: orders.filter(o => o.status === ORDER_STATUS.COMPLETED).length,
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      name: 'High Priority',
      value: orders.filter(o => o.priority === 'high' && o.status !== ORDER_STATUS.COMPLETED).length,
      icon: '🔥',
      color: 'bg-red-500'
    }
  ] : [
    {
      name: 'My Orders',
      value: myOrders.length,
      icon: '📋',
      color: 'bg-blue-500'
    },
    {
      name: 'Pending',
      value: pendingOrders.length,
      icon: '⏳',
      color: 'bg-yellow-500'
    },
    {
      name: 'Completed',
      value: completedOrders.length,
      icon: '✅',
      color: 'bg-green-500'
    },
    {
      name: 'Starred',
      value: assignments.filter(a => a.starred).length,
      icon: '⭐',
      color: 'bg-purple-500'
    }
  ]

  const quickActions = isManager ? [
    {
      name: 'Create Order',
      href: '/orders',
      icon: '➕',
      description: 'Add a new order'
    },
    {
      name: 'View Analytics',
      href: '/analytics',
      icon: '📊',
      description: 'See detailed reports'
    },
    {
      name: 'Buy List',
      href: '/buy-list',
      icon: '🛒',
      description: 'Manage shopping list'
    }
  ] : [
    {
      name: 'My Orders',
      href: '/orders',
      icon: '📋',
      description: 'View assigned orders'
    },
    {
      name: 'Buy List',
      href: '/buy-list',
      icon: '🛒',
      description: 'Check shopping list'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name}!
        </h1>
        <p className="text-gray-600">
          {isManager 
            ? "Here's an overview of your team's work" 
            : "Here's your work for today"
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`${stat.color} p-3 rounded-lg text-white text-xl mr-4`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              to={action.href}
              className="card hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center">
                <div className="text-2xl mr-3 group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{action.name}</h3>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders / My Work Today */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {isManager ? 'Recent Orders' : 'My Work Today'}
            </h2>
            <Link
              to="/orders"
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              View all →
            </Link>
          </div>
          
          <div className="space-y-4">
            {(isManager ? orders.slice(0, 3) : pendingOrders.slice(0, 3)).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStarToggle={toggleStarred}
                currentUserId={profile?.id}
                isManager={isManager}
              />
            ))}
            
            {myOrders.length === 0 && (
              <div className="card text-center py-8">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-gray-600">
                  {isManager ? 'No orders yet. Create your first order!' : 'No orders assigned to you yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* High Priority / Starred Orders */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isManager ? 'High Priority Orders' : 'Starred Orders'}
          </h2>
          
          <div className="space-y-4">
            {(isManager 
              ? highPriorityOrders.slice(0, 3)
              : assignments.filter(a => a.starred).slice(0, 3).map(a => a.orders)
            ).map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStarToggle={toggleStarred}
                currentUserId={profile?.id}
                isManager={isManager}
              />
            ))}
            
            {(isManager ? highPriorityOrders : assignments.filter(a => a.starred)).length === 0 && (
              <div className="card text-center py-8">
                <div className="text-4xl mb-2">{isManager ? '🔥' : '⭐'}</div>
                <p className="text-gray-600">
                  {isManager 
                    ? 'No high priority orders' 
                    : 'No starred orders yet. Star important orders for quick access!'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard