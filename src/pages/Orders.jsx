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
    assigned_workers: [],
    images: []
  })
  const [selectedImages, setSelectedImages] = useState([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState(new Set())
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [imageModalImages, setImageModalImages] = useState([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

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

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const openImageModal = (imageUrl, allImages, imageIndex) => {
    setSelectedImageUrl(imageUrl)
    setImageModalImages(allImages)
    setCurrentImageIndex(imageIndex)
    setShowImageModal(true)
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setSelectedImageUrl('')
    setImageModalImages([])
    setCurrentImageIndex(0)
  }

  const navigateImage = (direction) => {
    if (imageModalImages.length === 0) return
    
    let newIndex = currentImageIndex
    if (direction === 'next') {
      newIndex = (currentImageIndex + 1) % imageModalImages.length
    } else {
      newIndex = currentImageIndex === 0 ? imageModalImages.length - 1 : currentImageIndex - 1
    }
    
    setCurrentImageIndex(newIndex)
    setSelectedImageUrl(imageModalImages[newIndex])
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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length + selectedImages.length > 5) {
      toast.error('Maximum 5 images allowed per order')
      return
    }
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error(`${file.name} is too large. Maximum 5MB allowed`)
        return false
      }
      return true
    })

    setSelectedImages(prev => [...prev, ...validFiles])
  }

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index))
  }

  const uploadImages = async () => {
    if (selectedImages.length === 0) return []

    setUploadingImages(true)
    const uploadedUrls = []

    try {
      for (const image of selectedImages) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${image.name}`
        
        const { data, error } = await supabase.storage
          .from('order-images')
          .upload(fileName, image)

        if (error) throw error

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('order-images')
          .getPublicUrl(fileName)

        uploadedUrls.push(publicUrl)
      }

      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      toast.error('Failed to upload some images')
      return []
    } finally {
      setUploadingImages(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.client_name || !formData.due_date) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      // Upload images first
      const imageUrls = await uploadImages()

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
          status: 'pending',
          image_urls: imageUrls
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
      assigned_workers: [],
      images: []
    })
    setSelectedImages([])
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
      <div className="flex flex-col items-center justify-center h-48 sm:h-64 px-4">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 text-sm sm:text-base mt-4">Loading orders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {profile?.role === 'manager' ? 'Orders Management' : 'My Orders'}
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {profile?.role === 'manager' 
              ? 'Create and manage orders for your team'
              : 'View and manage your assigned orders'
            }
          </p>
        </div>
        
        {profile?.role === 'manager' && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create Order
          </button>
        )}
      </div>

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Create New Order</h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Images
                </label>
                <div className="space-y-3">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 sm:h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-3 pb-4 sm:pt-5 sm:pb-6">
                        <svg className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                        </svg>
                        <p className="mb-1 sm:mb-2 text-xs sm:text-sm text-gray-500 text-center px-2">
                          <span className="font-semibold">Click to upload</span>
                          <span className="hidden sm:inline"> or drag and drop</span>
                        </p>
                        <p className="text-xs text-gray-500 text-center px-2">PNG, JPG, GIF up to 5MB (Max 5)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                  </div>

                  {/* Preview selected images */}
                  {selectedImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {selectedImages.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 sm:h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                          <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadingImages && (
                    <div className="flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-sm text-gray-600">Uploading images...</span>
                    </div>
                  )}
                </div>
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
                  <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto border rounded-lg p-2 sm:p-3 bg-gray-50">
                    {workers.map((worker) => (
                      <label key={worker.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.assigned_workers.includes(worker.id)}
                          onChange={() => handleWorkerSelection(worker.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-3 text-sm text-gray-700">
                          {worker.full_name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sticky bottom-0 bg-white border-t sm:border-t-0 p-4 sm:p-0 -mx-4 sm:mx-0 -mb-4 sm:mb-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    resetForm()
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 order-2 sm:order-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploadingImages}
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 order-1 sm:order-2"
                >
                  {loading ? 'Creating...' : uploadingImages ? 'Uploading...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow">
        {orders.length === 0 ? (
          <div className="px-4 py-8 sm:px-6 sm:py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <p className="text-gray-500 mb-4 text-sm sm:text-base">
              {profile?.role === 'manager' 
                ? 'No orders created yet'
                : 'No orders assigned to you'
              }
            </p>
            {profile?.role === 'manager' && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full sm:w-auto px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => {
              const isExpanded = expandedOrders.has(order.id)
              return (
              <div key={order.id} className="p-4 sm:p-6 hover:bg-gray-50 border-l-4 border-l-primary-200">
                <div className="flex flex-col space-y-3">
                  {/* Header - Always visible */}
                  <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleOrderExpansion(order.id)}>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {order.title}
                          </h3>
                          <svg 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </div>
                        <div className="flex flex-wrap gap-2">
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
                      </div>
                      
                      {/* Quick info - Always visible */}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>Client: {order.client_name}</span>
                        <span>Due: {new Date(order.due_date).toLocaleDateString()}</span>
                        <span>Qty: {order.quantity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable content */}
                  {isExpanded && (
                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      {order.details && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">Details</p>
                          <p className="text-sm text-gray-600">{order.details}</p>
                        </div>
                      )}

                      {order.category && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-1">Category</p>
                          <span className="badge badge-info">{order.category}</span>
                        </div>
                      )}

                      {/* Display order images */}
                      {order.image_urls && order.image_urls.length > 0 && (
                        <div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-2">Order Images</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {order.image_urls.map((url, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={url}
                                  alt={`Order image ${index + 1}`}
                                  className="w-full h-12 sm:h-16 object-cover rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                                  onClick={() => openImageModal(url, order.image_urls, index)}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-25 transition-all rounded-lg flex items-center justify-center">
                                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                  </svg>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="w-full flex flex-row space-x-2">
                    {profile?.role === 'manager' ? (
                      <>
                        {order.status !== 'completed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateOrderStatus(order.id, 'in_progress')
                            }}
                            className="flex-1 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 whitespace-nowrap"
                          >
                            Start
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              updateOrderStatus(order.id, 'completed')
                            }}
                            className="flex-1 px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 whitespace-nowrap"
                          >
                            Complete
                          </button>
                        )}
                      </>
                    ) : (
                      !order.marked_done && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markOrderDone(order.id, order.assignment_id)
                          }}
                          className="flex-1 px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 whitespace-nowrap"
                        >
                          ⭐ Mark Done
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closeImageModal}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            {/* Previous Button */}
            {imageModalImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigateImage('prev')
                }}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
            )}

            {/* Next Button */}
            {imageModalImages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigateImage('next')
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            )}

            {/* Image */}
            <img
              src={selectedImageUrl}
              alt="Expanded order image"
              className="max-w-full max-h-full object-contain cursor-default"
              onClick={(e) => e.stopPropagation()}
            />

            {/* Image Counter */}
            {imageModalImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} of {imageModalImages.length}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders