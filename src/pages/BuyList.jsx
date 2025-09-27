import React, { useState } from 'react'
import { useBuyList } from '../hooks/useBuyList'
import BuyListItem from '../components/BuyListItem'

const BuyList = () => {
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(false)
  const { buyList, addItem, toggleBought, deleteItem } = useBuyList()

  const handleAddItem = async (e) => {
    e.preventDefault()
    if (!newItem.trim()) return

    setLoading(true)
    try {
      const { error } = await addItem(newItem.trim())
      if (error) {
        alert('Error adding item: ' + error.message)
      } else {
        setNewItem('')
      }
    } catch (error) {
      console.error('Error adding item:', error)
      alert('Error adding item')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleBought = async (itemId, bought) => {
    try {
      const { error } = await toggleBought(itemId, bought)
      if (error) {
        alert('Error updating item: ' + error.message)
      }
    } catch (error) {
      console.error('Error updating item:', error)
      alert('Error updating item')
    }
  }

  const handleDeleteItem = async (itemId) => {
    try {
      const { error } = await deleteItem(itemId)
      if (error) {
        alert('Error deleting item: ' + error.message)
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Error deleting item')
    }
  }

  const pendingItems = buyList.filter(item => !item.bought)
  const boughtItems = buyList.filter(item => item.bought)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Shopping List</h1>
        <p className="text-gray-600">
          Shared team shopping list - everyone can add items and mark them as bought
        </p>
      </div>

      {/* Add new item */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Item</h2>
        <form onSubmit={handleAddItem} className="flex space-x-3">
          <input
            type="text"
            placeholder="Enter item name..."
            className="input-field flex-1"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !newItem.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Item'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pending Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              To Buy ({pendingItems.length})
            </h2>
          </div>
          
          {pendingItems.length > 0 ? (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <BuyListItem
                  key={item.id}
                  item={item}
                  onToggleBought={handleToggleBought}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-4xl mb-2">🛒</div>
              <p className="text-gray-600">No items to buy</p>
              <p className="text-sm text-gray-500 mt-1">
                Add items above to get started
              </p>
            </div>
          )}
        </div>

        {/* Bought Items */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Bought ({boughtItems.length})
            </h2>
            {boughtItems.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Clear all bought items?')) {
                    boughtItems.forEach(item => handleDeleteItem(item.id))
                  }
                }}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>
          
          {boughtItems.length > 0 ? (
            <div className="space-y-3">
              {boughtItems.map((item) => (
                <BuyListItem
                  key={item.id}
                  item={item}
                  onToggleBought={handleToggleBought}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          ) : (
            <div className="card text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-600">No bought items</p>
              <p className="text-sm text-gray-500 mt-1">
                Items marked as bought will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {buyList.length > 0 && (
        <div className="mt-8 card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Shopping Progress</h3>
              <p className="text-sm text-gray-600">
                {boughtItems.length} of {buyList.length} items completed
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {Math.round((boughtItems.length / buyList.length) * 100)}%
                </div>
                <div className="text-xs text-gray-500">Complete</div>
              </div>
              
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-600"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${(boughtItems.length / buyList.length) * 100}, 100`}
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BuyList