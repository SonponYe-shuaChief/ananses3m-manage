import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const ToBuy = () => {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    item_name: '',
    estimated_cost: ''
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

      // Fetch to-buy items for the company
      await fetchToBuyItems(profileData.company_id)

    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const fetchToBuyItems = async (companyId) => {
    const { data, error } = await supabase
      .from('buy_list')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    setItems(data || [])
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
    
    if (!formData.item_name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    try {
      const { error } = await supabase
        .from('buy_list')
        .insert([{
          item_name: formData.item_name.trim(),
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          company_id: profile.company_id,
          added_by: user.id,
          status: 'pending'
        }])

      if (error) throw error

      toast.success('Item added!')
      setShowAddForm(false)
      resetForm()
      fetchToBuyItems(profile.company_id)
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const resetForm = () => {
    setFormData({
      item_name: '',
      estimated_cost: ''
    })
  }

  const toggleAcquired = async (itemId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'received' ? 'pending' : 'received'

      const { error } = await supabase
        .from('buy_list')
        .update({ status: newStatus })
        .eq('id', itemId)

      if (error) throw error

      toast.success(newStatus === 'received' ? 'Marked as bought!' : 'Marked as needed!')
      fetchToBuyItems(profile.company_id)
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const editItem = async (itemId, newItemName, newEstimatedCost) => {
    try {
      const { error } = await supabase
        .from('buy_list')
        .update({ 
          item_name: newItemName.trim(),
          estimated_cost: newEstimatedCost ? parseFloat(newEstimatedCost) : null
        })
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item updated!')
      setEditingId(null)
      fetchToBuyItems(profile.company_id)
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Failed to update item')
    }
  }

  const deleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('buy_list')
        .delete()
        .eq('id', itemId)

      if (error) throw error

      toast.success('Item deleted!')
      fetchToBuyItems(profile.company_id)
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Failed to delete item')
    }
  }

  const getPriorityBadgeClass = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const pendingItems = items.filter(item => item.status !== 'received')
  const receivedItems = items.filter(item => item.status === 'received')
  
  console.log('Items state:', items)
  console.log('Pending items:', pendingItems.length)
  console.log('Received items:', receivedItems.length)

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Workshop Supplies</h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage items needed for the workshop
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
              </div>
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Needed</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">{pendingItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Received</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">{receivedItems.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-3 sm:p-6 col-span-2 lg:col-span-1">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                </svg>
              </div>
            </div>
            <div className="sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-gray-500">Est. Cost</p>
              <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                ${pendingItems.reduce((sum, item) => sum + (item.estimated_cost || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Items */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Items Needed ({pendingItems.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {pendingItems.length === 0 ? (
            <div className="px-4 sm:px-6 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
              <p className="text-gray-500 text-sm sm:text-base">No items needed right now</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
              >
                Add the first item
              </button>
            </div>
          ) : (
            pendingItems.map((item) => (
              <div key={item.id} className="px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="text-sm sm:text-base font-medium text-gray-900">{item.item_name}</h4>
                      <div className="flex flex-wrap gap-1">
                        <span className={`badge ${getPriorityBadgeClass(item.priority)}`}>
                          {item.priority} priority
                        </span>
                        <span className="badge badge-gray">{item.status}</span>
                      </div>
                    </div>
                    {item.notes && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                      <span>Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                      {item.estimated_cost && (
                        <span>Est: ${item.estimated_cost}</span>
                      )}
                      <span>Added by: {item.added_by?.full_name || 'Unknown'}</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleAcquired(item.id, item.status)}
                      className="px-3 py-1 text-xs sm:text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                      </svg>
                      Mark Received
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-3 py-1 text-xs sm:text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Received Items */}
      {receivedItems.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">Recently Received ({receivedItems.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {receivedItems.slice(0, 5).map((item) => (
              <div key={item.id} className="px-4 sm:px-6 py-3 sm:py-4 opacity-75">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <h4 className="text-sm sm:text-base font-medium text-gray-900 line-through">{item.item_name}</h4>
                      <span className="badge badge-success flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                        </svg>
                        Received
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-500">
                      <span>Qty: {item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                      <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAcquired(item.id, item.status)}
                    className="px-3 py-1 text-xs sm:text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                  >
                    Mark as Needed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Add Item to Buy</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Item Name *
                </label>
                <input
                  type="text"
                  name="item_name"
                  required
                  className="input-field mt-1"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  placeholder="e.g., A4 Paper, Ink Cartridge"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <input
                    type="text"
                    name="unit"
                    className="input-field mt-1"
                    value={formData.unit}
                    onChange={handleInputChange}
                    placeholder="e.g., pcs, kg, boxes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    name="estimated_cost"
                    step="0.01"
                    min="0"
                    className="input-field mt-1"
                    value={formData.estimated_cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  className="input-field mt-1"
                  rows="2"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional details about the item"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    resetForm()
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm sm:text-base order-1 sm:order-2"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ToBuy