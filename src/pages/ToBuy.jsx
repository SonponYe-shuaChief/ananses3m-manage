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
  const [editData, setEditData] = useState({ item_name: '', estimated_cost: '' })
  const [newItem, setNewItem] = useState({ item_name: '', estimated_cost: '' })

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

  const addItem = async (e) => {
    e.preventDefault()
    
    if (!newItem.item_name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    try {
      const { error } = await supabase
        .from('buy_list')
        .insert([{
          item_name: newItem.item_name.trim(),
          estimated_cost: newItem.estimated_cost ? parseFloat(newItem.estimated_cost) : null,
          company_id: profile.company_id,
          added_by: user.id,
          status: 'pending'
        }])

      if (error) throw error

      toast.success('Item added!')
      setShowAddForm(false)
      setNewItem({ item_name: '', estimated_cost: '' })
      fetchToBuyItems(profile.company_id)
    } catch (error) {
      console.error('Error adding item:', error)
      toast.error('Failed to add item')
    }
  }

  const updateItem = async (itemId) => {
    if (!editData.item_name.trim()) {
      toast.error('Please enter an item name')
      return
    }

    try {
      const { error } = await supabase
        .from('buy_list')
        .update({ 
          item_name: editData.item_name.trim(),
          estimated_cost: editData.estimated_cost ? parseFloat(editData.estimated_cost) : null
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

  const toggleBought = async (itemId, currentStatus) => {
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

  const startEdit = (item) => {
    setEditingId(item.id)
    setEditData({ 
      item_name: item.item_name, 
      estimated_cost: item.estimated_cost || '' 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const pendingItems = items.filter(item => item.status !== 'received')
  const boughtItems = items.filter(item => item.status === 'received')

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Workshop Supplies</h1>
          <p className="text-sm sm:text-base text-gray-600">Items needed for the workshop</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full sm:w-auto px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base"
        >
          + Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
          <h3 className="font-medium sm:font-semibold text-yellow-800 text-xs sm:text-sm">Need to Buy</h3>
          <p className="text-xl sm:text-2xl font-bold text-yellow-900">{pendingItems.length}</p>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
          <h3 className="font-medium sm:font-semibold text-green-800 text-xs sm:text-sm">Already Bought</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-900">{boughtItems.length}</p>
        </div>
      </div>

      {/* Items to Buy */}
      <div className="space-y-4 sm:space-y-6">
        {pendingItems.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Need to Buy</h2>
            <div className="space-y-2 sm:space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  {editingId === item.id ? (
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-2 sm:items-center">
                      <input
                        type="text"
                        value={editData.item_name}
                        onChange={(e) => setEditData({...editData, item_name: e.target.value})}
                        className="w-full sm:flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                        placeholder="Item name"
                      />
                      <input
                        type="number"
                        value={editData.estimated_cost}
                        onChange={(e) => setEditData({...editData, estimated_cost: e.target.value})}
                        className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-md text-sm sm:text-base"
                        placeholder="GH₵"
                        step="0.01"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateItem(item.id)}
                          className="flex-1 sm:flex-none px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 sm:flex-none px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm sm:text-base">{item.item_name}</h3>
                        {item.estimated_cost && (
                          <p className="text-xs sm:text-sm text-gray-600">GH₵{item.estimated_cost}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
                        <button
                          onClick={() => toggleBought(item.id, item.status)}
                          className="px-2 sm:px-3 py-2 sm:py-1 bg-green-600 text-white text-xs sm:text-sm rounded hover:bg-green-700"
                        >
                          ✓ Bought
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="px-2 sm:px-3 py-2 sm:py-1 bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="px-2 sm:px-3 py-2 sm:py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Bought Items */}
        {boughtItems.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Already Bought</h2>
            <div className="space-y-2 sm:space-y-3">
              {boughtItems.map((item) => (
                <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="space-y-3 sm:space-y-0 sm:flex sm:justify-between sm:items-center">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 line-through text-sm sm:text-base">{item.item_name}</h3>
                      {item.estimated_cost && (
                        <p className="text-xs sm:text-sm text-gray-600">GH₵{item.estimated_cost}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                      <button
                        onClick={() => toggleBought(item.id, item.status)}
                        className="px-2 sm:px-3 py-2 sm:py-1 bg-yellow-600 text-white text-xs sm:text-sm rounded hover:bg-yellow-700"
                      >
                        ↶ Need Again
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-2 sm:px-3 py-2 sm:py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <p className="text-gray-500 text-sm sm:text-base mb-4">No items yet. Add your first item to get started!</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
            >
              Add First Item
            </button>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-lg sm:rounded-lg shadow-lg max-w-md w-full sm:max-w-lg">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Add New Item</h3>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewItem({ item_name: '', estimated_cost: '' })
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={addItem} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({...newItem, item_name: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base sm:text-sm"
                  placeholder="What do you need?"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Price (GH₵)
                </label>
                <input
                  type="number"
                  value={newItem.estimated_cost}
                  onChange={(e) => setNewItem({...newItem, estimated_cost: e.target.value})}
                  className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md text-base sm:text-sm"
                  placeholder="0.00 GH₵"
                  step="0.01"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewItem({ item_name: '', estimated_cost: '' })
                  }}
                  className="flex-1 px-4 py-3 sm:py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
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