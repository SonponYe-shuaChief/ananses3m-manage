import React from 'react'
import { ORDER_STATUS, PRIORITY } from '../utils/supabaseClient'

const OrderCard = ({ order, onStatusChange, onStarToggle, isManager, currentUserId }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case ORDER_STATUS.NEW:
        return 'bg-blue-100 text-blue-800'
      case ORDER_STATUS.IN_PROGRESS:
        return 'bg-yellow-100 text-yellow-800'
      case ORDER_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case PRIORITY.HIGH:
        return 'bg-red-100 text-red-800'
      case PRIORITY.MEDIUM:
        return 'bg-orange-100 text-orange-800'
      case PRIORITY.LOW:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date'
    return new Date(dateString).toLocaleDateString()
  }

  const userAssignment = order.order_assignments?.find(
    assignment => assignment.worker_id === currentUserId
  )

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{order.title}</h3>
            {userAssignment && (
              <button
                onClick={() => onStarToggle?.(userAssignment.id, !userAssignment.starred)}
                className={`text-xl ${
                  userAssignment.starred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                ⭐
              </button>
            )}
          </div>
          
          {order.description && (
            <p className="text-gray-600 mb-3">{order.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
              {order.status.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
              {order.priority.toUpperCase()} PRIORITY
            </span>
            {order.category && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                {order.category}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-500 mb-3">
            {order.client_name && (
              <div>
                <span className="font-medium">Client:</span> {order.client_name}
              </div>
            )}
            <div>
              <span className="font-medium">Due:</span> {formatDate(order.due_date)}
            </div>
            <div>
              <span className="font-medium">Created by:</span> {order.profiles?.full_name || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Created:</span> {formatDate(order.created_at)}
            </div>
          </div>

          {order.order_assignments?.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700">Assigned to:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {order.order_assignments.map((assignment) => (
                  <span
                    key={assignment.id}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                  >
                    {assignment.profiles?.full_name || 'Unknown'}
                    {assignment.starred && ' ⭐'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {order.image_urls && order.image_urls.length > 0 && (
            <div className="mb-3">
              <span className="text-sm font-medium text-gray-700 block mb-2">Reference Images:</span>
              <div className="flex flex-wrap gap-2">
                {order.image_urls.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`Reference ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {isManager && onStatusChange && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Update Status:
          </label>
          <select
            value={order.status}
            onChange={(e) => onStatusChange(order.id, e.target.value)}
            className="input-field text-sm"
          >
            <option value={ORDER_STATUS.NEW}>New</option>
            <option value={ORDER_STATUS.IN_PROGRESS}>In Progress</option>
            <option value={ORDER_STATUS.COMPLETED}>Completed</option>
          </select>
        </div>
      )}
    </div>
  )
}

export default OrderCard