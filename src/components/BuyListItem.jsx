import React from 'react'

const BuyListItem = ({ item, onToggleBought, onDelete, canEdit = true }) => {
  const handleToggle = () => {
    if (canEdit) {
      onToggleBought(item.id, !item.bought)
    }
  }

  const handleDelete = () => {
    if (canEdit && window.confirm('Are you sure you want to delete this item?')) {
      onDelete(item.id)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div className={`flex items-center p-3 border rounded-lg transition-colors ${
      item.bought ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center flex-1">
        <input
          type="checkbox"
          checked={item.bought}
          onChange={handleToggle}
          disabled={!canEdit}
          className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        
        <div className="ml-3 flex-1">
          <div className={`text-sm font-medium ${
            item.bought ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}>
            {item.item_name}
          </div>
          
          <div className="text-xs text-gray-500">
            <span>Added by {item.profiles?.full_name || 'Unknown'}</span>
            <span className="mx-2">•</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>
      </div>

      {canEdit && (
        <button
          onClick={handleDelete}
          className="ml-2 text-red-400 hover:text-red-600 p-1"
          title="Delete item"
        >
          🗑️
        </button>
      )}
    </div>
  )
}

export default BuyListItem