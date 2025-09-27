import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOrders } from '../hooks/useOrders'
import { useAssignments } from '../hooks/useAssignments'
import OrderCard from '../components/OrderCard'
import OrderForm from '../components/OrderForm'
import { ORDER_STATUS } from '../utils/supabaseClient'

const Orders = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const { profile, isManager } = useAuth()
  const { orders, createOrder, updateOrder, deleteOrder } = useOrders()
  const { assignOrder, toggleStarred } = useAssignments()

  // Filter orders based on role and filters
  let filteredOrders = isManager 
    ? orders 
    : orders.filter(order => 
        order.order_assignments?.some(assignment => assignment.worker_id === profile?.id)
      )

  // Apply status filter
  if (filterStatus !== 'all') {
    filteredOrders = filteredOrders.filter(order => order.status === filterStatus)
  }

  // Apply search filter
  if (searchTerm) {
    filteredOrders = filteredOrders.filter(order =>
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  const handleCreateOrder = async (orderData) => {
    try {
      const { assignedWorkers, ...orderInfo } = orderData
      const { data: order, error } = await createOrder(orderInfo)
      
      if (error) {
        alert('Error creating order: ' + error.message)
        return
      }

      // Assign workers if any selected
      if (assignedWorkers && assignedWorkers.length > 0) {
        await assignOrder(order.id, assignedWorkers)
      }

      setShowForm(false)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Error creating order')
    }
  }

  const handleUpdateOrder = async (orderData) => {
    try {
      const { assignedWorkers, ...orderInfo } = orderData
      const { error } = await updateOrder(editingOrder.id, orderInfo)
      
      if (error) {
        alert('Error updating order: ' + error.message)
        return
      }

      // Update assignments if manager
      if (isManager && assignedWorkers) {
        await assignOrder(editingOrder.id, assignedWorkers)
      }

      setEditingOrder(null)
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Error updating order')
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const { error } = await updateOrder(orderId, { status: newStatus })
      if (error) {
        alert('Error updating status: ' + error.message)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Error updating status')
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return
    }

    try {
      const { error } = await deleteOrder(orderId)
      if (error) {
        alert('Error deleting order: ' + error.message)
      }
    } catch (error) {
      console.error('Error deleting order:', error)
      alert('Error deleting order')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isManager ? 'All Orders' : 'My Orders'}
            </h1>
            <p className="text-gray-600">
              {isManager 
                ? 'Manage and track all orders' 
                : 'View your assigned orders'
              }
            </p>
          </div>
          
          {isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              ➕ Create Order
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Orders
            </label>
            <input
              type="text"
              placeholder="Search by title, description, client, or category..."
              className="input-field"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Status
            </label>
            <select
              className="input-field"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Orders</option>
              <option value={ORDER_STATUS.NEW}>New</option>
              <option value={ORDER_STATUS.IN_PROGRESS}>In Progress</option>
              <option value={ORDER_STATUS.COMPLETED}>Completed</option>
            </select>
          </div>
        </div>

        {/* Results summary */}
        <div className="text-sm text-gray-600 mb-4">
          Showing {filteredOrders.length} of {orders.length} orders
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length > 0 ? (
        <div className="grid gap-6">
          {filteredOrders.map((order) => (
            <div key={order.id} className="relative">
              <OrderCard
                order={order}
                onStatusChange={isManager ? handleStatusChange : undefined}
                onStarToggle={toggleStarred}
                isManager={isManager}
                currentUserId={profile?.id}
              />
              
              {isManager && (
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={() => setEditingOrder(order)}
                    className="text-blue-600 hover:text-blue-700 p-2"
                    title="Edit order"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteOrder(order.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title="Delete order"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filterStatus !== 'all' 
              ? 'No orders match your filters' 
              : (isManager ? 'No orders yet' : 'No orders assigned to you')
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : (isManager 
                  ? 'Create your first order to get started' 
                  : 'Orders will appear here when assigned to you'
                )
            }
          </p>
          
          {isManager && !searchTerm && filterStatus === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              Create First Order
            </button>
          )}
        </div>
      )}

      {/* Order Form Modal */}
      {(showForm || editingOrder) && (
        <OrderForm
          order={editingOrder}
          onSubmit={editingOrder ? handleUpdateOrder : handleCreateOrder}
          onCancel={() => {
            setShowForm(false)
            setEditingOrder(null)
          }}
        />
      )}
    </div>
  )
}

export default Orders