import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const Orders = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [workers, setWorkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    client_name: '',
    due_date: '',
    priority: 'medium',
    category: '',
    quantity: 1,
    specs: {},
    assignment_type: 'general',
    assigned_workers: []
  })

  useEffect(() => {
    if (user) {
      fetchInitialData()
    }
  }, [user])

  const fetchInitialData = async () => {
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

      // Fetch orders based on role
      if (profileData.role === 'manager') {
        await fetchManagerOrders(profileData.company_id)
        await fetchWorkers(profileData.company_id)
      } else {
        await fetchWorkerOrders(user.id, profileData.company_id)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchManagerOrders = async (companyId) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) throw error
    setOrders(data)
  }

  const fetchWorkerOrders = async (userId, companyId) => {
    // Fetch assigned orders
    const { data: assignments, error: assignmentsError } = await supabase
      .from('order_assignments')
      .select(`
        *,
        orders (*)
      `)
      .eq('worker_id', userId)

    if (assignmentsError) throw assignmentsError

    // Fetch general orders
    const { data: generalOrders, error: generalError } = await supabase
      .from('orders')
      .select('*')
      .eq('company_id', companyId)
      .eq('assignment_type', 'general')

    if (generalError) throw generalError

    const assignedOrders = assignments?.map(a => ({
      ...a.orders,
      assignment_id: a.id,
      marked_done: a.marked_done
    })) || []

    const allOrders = [...assignedOrders, ...generalOrders]
    setOrders(allOrders)
  }

  const fetchWorkers = async (companyId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('company_id', companyId)
      .eq('role', 'worker')

    if (error) throw error
    setWorkers(data)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleWorkerSelection = (workerId) => {
    setFormData(prev => ({
      ...prev,
      assigned_workers: prev.assigned_workers.includes(workerId)
        ? prev.assigned_workers.filter(id => id !== workerId)
        : [...prev.assigned_workers, workerId]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.client_name || !formData.due_date) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          title: formData.title,
          details: formData.details,
          client_name: formData.client_name,
          due_date: formData.due_date,
          priority: formData.priority,
          category: formData.category,
          quantity: formData.quantity,
          specs: formData.specs,
          assignment_type: formData.assignment_type,
          company_id: profile.company_id,
          created_by: user.id,
          status: 'pending'
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Create assignments if specific workers selected
      if (formData.assignment_type === 'specific' && formData.assigned_workers.length > 0) {
        const assignments = formData.assigned_workers.map(workerId => ({
          order_id: order.id,
          worker_id: workerId,
          assigned_by: user.id
        }))

        const { error: assignmentError } = await supabase
          .from('order_assignments')
          .insert(assignments)

        if (assignmentError) throw assignmentError
      }

      toast.success('Order created successfully!')
      setShowCreateForm(false)
      resetForm()
      await fetchManagerOrders(profile.company_id)

    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const markOrderDone = async (orderId, assignmentId = null) => {
    try {
      if (assignmentId) {
        // Mark assignment as done
        const { error } = await supabase
          .from('order_assignments')
          .update({ marked_done: true })
          .eq('id', assignmentId)

        if (error) throw error
      } else {
        // For general orders, create an assignment record
        const { error } = await supabase
          .from('order_assignments')
          .insert({
            order_id: orderId,
            worker_id: user.id,
            marked_done: true
          })

        if (error) throw error
      }

      toast.success('Marked as done!')
      await fetchWorkerOrders(user.id, profile.company_id)

    } catch (error) {
      console.error('Error marking order done:', error)
      toast.error('Failed to mark order as done')
    }
  }

  const updateOrderStatus = async (orderId, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (error) throw error

      toast.success('Order status updated!')
      await fetchManagerOrders(profile.company_id)

    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      details: '',
      client_name: '',
      due_date: '',
      priority: 'medium',
      category: '',
      quantity: 1,
      specs: {},
      assignment_type: 'general',
      assigned_workers: []
    })
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

  if (loading && !orders.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.role === 'manager' ? 'Orders Management' : 'My Orders'}
          </h1>
          <p className="text-gray-600">
            {profile?.role === 'manager' 
              ? 'Create and manage orders for your team'
              : 'View and manage your assigned orders'
            }
          </p>
        </div>
        
        {profile?.role === 'manager' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
          >
            Create Order
          </button>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Create New Order</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Order Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="input-field mt-1"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    name="client_name"
                    required
                    className="input-field mt-1"
                    value={formData.client_name}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    required
                    className="input-field mt-1"
                    value={formData.due_date}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority
                  </label>
                  <select
                    name="priority"
                    className="input-field mt-1"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <input
                    type="text"
                    name="category"
                    className="input-field mt-1"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="e.g., Print, Design, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    className="input-field mt-1"
                    value={formData.quantity}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Order Details
                </label>
                <textarea
                  name="details"
                  rows="3"
                  className="input-field mt-1"
                  value={formData.details}
                  onChange={handleInputChange}
                  placeholder="Detailed description of the order..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Assignment Type
                </label>
                <select
                  name="assignment_type"
                  className="input-field mt-1"
                  value={formData.assignment_type}
                  onChange={handleInputChange}
                >
                  <option value="general">General (All Workers)</option>
                  <option value="specific">Specific Workers</option>
                </select>
              </div>

              {formData.assignment_type === 'specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Workers
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {workers.map((worker) => (
                      <label key={worker.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.assigned_workers.includes(worker.id)}
                          onChange={() => handleWorkerSelection(worker.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {worker.full_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow">
        {orders.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500 mb-4">
              {profile?.role === 'manager' 
                ? 'No orders created yet'
                : 'No orders assigned to you'
              }
            </p>
            {profile?.role === 'manager' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {order.title}
                      </h3>
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status?.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`badge ${getPriorityBadgeClass(order.priority)}`}>
                        {order.priority} priority
                      </span>
                      {order.marked_done && (
                        <span className="badge badge-success">⭐ Marked Done</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-gray-500">Client</p>
                        <p className="text-sm font-medium text-gray-900">{order.client_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Due Date</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(order.due_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Quantity</p>
                        <p className="text-sm font-medium text-gray-900">{order.quantity}</p>
                      </div>
                    </div>

                    {order.details && (
                      <p className="text-sm text-gray-600 mb-3">{order.details}</p>
                    )}

                    {order.category && (
                      <div className="mb-3">
                        <span className="badge badge-info">{order.category}</span>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex flex-col space-y-2">
                    {profile?.role === 'manager' ? (
                      <>
                        {order.status !== 'completed' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'in_progress')}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                          >
                            Start
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            Complete
                          </button>
                        )}
                      </>
                    ) : (
                      !order.marked_done && (
                        <button
                          onClick={() => markOrderDone(order.id, order.assignment_id)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          ⭐ Mark Done
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Orders