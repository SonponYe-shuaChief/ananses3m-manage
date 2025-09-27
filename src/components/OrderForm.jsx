import React, { useState, useEffect, useCallback } from 'react'
import { ORDER_STATUS, PRIORITY, supabase } from '../utils/supabaseClient'
import { useAuth } from '../hooks/useAuth'

const OrderForm = ({ order, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_name: '',
    due_date: '',
    priority: PRIORITY.MEDIUM,
    category: '',
    status: ORDER_STATUS.NEW,
  })
  const [workers, setWorkers] = useState([])
  const [selectedWorkers, setSelectedWorkers] = useState([])
  const [imageFiles, setImageFiles] = useState([])
  const [imageUrls, setImageUrls] = useState([])
  const [loading, setLoading] = useState(false)
  const { profile } = useAuth()

  const fetchWorkers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', profile.company_id)
        .eq('role', 'worker')

      if (error) throw error
      setWorkers(data || [])
    } catch (error) {
      console.error('Error fetching workers:', error)
    }
  }, [profile?.company_id])

  useEffect(() => {
    if (order) {
      setFormData({
        title: order.title || '',
        description: order.description || '',
        client_name: order.client_name || '',
        due_date: order.due_date || '',
        priority: order.priority || PRIORITY.MEDIUM,
        category: order.category || '',
        status: order.status || ORDER_STATUS.NEW,
      })
      setImageUrls(order.image_urls || [])
      setSelectedWorkers(order.order_assignments?.map(a => a.worker_id) || [])
    }
    
    fetchWorkers()
  }, [order, fetchWorkers])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleWorkerToggle = (workerId) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId) 
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return []

    const uploadPromises = Array.from(files).map(async (file) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `order-images/${fileName}`

      const { error } = await supabase.storage
        .from('order-images')
        .upload(filePath, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('order-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    })

    try {
      const urls = await Promise.all(uploadPromises)
      return urls
    } catch (error) {
      console.error('Error uploading images:', error)
      return []
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let uploadedImageUrls = [...imageUrls]

      // Upload new images if any
      if (imageFiles.length > 0) {
        const newUrls = await handleImageUpload(imageFiles)
        uploadedImageUrls = [...uploadedImageUrls, ...newUrls]
      }

      const orderData = {
        ...formData,
        image_urls: uploadedImageUrls,
        assignedWorkers: selectedWorkers,
      }

      await onSubmit(orderData)
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeImage = (index) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {order ? 'Edit Order' : 'Create New Order'}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                name="title"
                required
                className="input-field"
                placeholder="Enter order title"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="input-field"
                placeholder="Enter order description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  name="client_name"
                  className="input-field"
                  placeholder="Enter client name"
                  value={formData.client_name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  name="due_date"
                  className="input-field"
                  value={formData.due_date}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  name="priority"
                  className="input-field"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value={PRIORITY.LOW}>Low</option>
                  <option value={PRIORITY.MEDIUM}>Medium</option>
                  <option value={PRIORITY.HIGH}>High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  className="input-field"
                  placeholder="e.g., Web Design, Print"
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>
            </div>

            {order && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  className="input-field"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value={ORDER_STATUS.NEW}>New</option>
                  <option value={ORDER_STATUS.IN_PROGRESS}>In Progress</option>
                  <option value={ORDER_STATUS.COMPLETED}>Completed</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to Workers
              </label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
                {workers.length === 0 ? (
                  <p className="text-gray-500 text-sm">No workers found</p>
                ) : (
                  <div className="space-y-2">
                    {workers.map((worker) => (
                      <label key={worker.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedWorkers.includes(worker.id)}
                          onChange={() => handleWorkerToggle(worker.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-900">{worker.full_name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="input-field"
                onChange={(e) => setImageFiles(e.target.files)}
              />
              
              {imageUrls.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">Current images:</p>
                  <div className="flex flex-wrap gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (order ? 'Update Order' : 'Create Order')}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OrderForm