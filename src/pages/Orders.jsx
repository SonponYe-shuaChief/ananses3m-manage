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

      const isEditing = formData.editingOrderId

      if (isEditing) {
        // Update existing order
        const { error: orderError } = await supabase
          .from('orders')
          .update({
            title: formData.title,
            details: formData.details,
            client_name: formData.client_name,
            due_date: formData.due_date,
            priority: formData.priority,
            category: formData.category,
            quantity: formData.quantity,
            specs: formData.specs,
            assignment_type: formData.assignment_type,
            image_urls: imageUrls.length > 0 ? imageUrls : formData.images
          })
          .eq('id', formData.editingOrderId)

        if (orderError) throw orderError

        toast.success('Order updated successfully!')
      } else {
        // Create new order
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
      }

      setShowCreateForm(false)
      resetForm()
      await fetchManagerOrders(profile.company_id)

    } catch (error) {
      console.error(`Error ${formData.editingOrderId ? 'updating' : 'creating'} order:`, error)
      toast.error(`Failed to ${formData.editingOrderId ? 'update' : 'create'} order`)
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

  const editOrder = (order) => {
    setFormData({
      title: order.title,
      details: order.details || '',
      client_name: order.client_name,
      due_date: order.due_date,
      priority: order.priority,
      category: order.category || '',
      quantity: order.quantity || 1,
      specs: order.specs || {},
      assignment_type: order.assignment_type,
      assigned_workers: [], // Will be filled from assignments
      images: order.image_urls || []
    })
    setShowCreateForm(true)
    // Store the order being edited
    setFormData(prev => ({ ...prev, editingOrderId: order.id }))
  }

  const deleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return
    }

    // Show loading toast
    const loadingToast = toast.loading('Deleting order...')

    try {
      // Test: Check if user can see this order first
      const { data: orderCheck, error: checkError } = await supabase
        .from('orders')
        .select('id, title')
        .eq('id', orderId)
        .single()
      
      console.log('Order check before delete:', orderCheck, checkError)
      
      // First delete any order assignments
      const { error: assignmentError } = await supabase
        .from('order_assignments')
        .delete()
        .eq('order_id', orderId)

      if (assignmentError) {
        console.warn('Warning deleting assignments:', assignmentError)
        // Continue anyway - assignments might not exist
      }

      // Then delete the order
      const { data: deletedData, error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId)
        .select()

      if (orderError) throw orderError
      
      console.log('Deleted order:', deletedData)

      toast.dismiss(loadingToast)
      toast.success('Order deleted successfully!')
      
      // Immediately remove the order from the local state
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId))
      
      // Close detail view if this order was selected
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null)
      }
      
      // Refresh orders from server to ensure consistency
      if (profile?.role === 'manager') {
        await fetchManagerOrders(profile.company_id)
      } else {
        await fetchWorkerOrders(user.id, profile.company_id)
      }

    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error deleting order:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      toast.error(`Failed to delete order: ${error.message}`)
    }
  }

  const showAssignWorkersModal = (order) => {
    // Set the order and show assignment interface
    setSelectedOrder(order)
    // You can add a separate modal state for assignments if needed
    // For now, we'll use the selectedOrder state to show assignment UI
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
      images: [],
      editingOrderId: null
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
                <h3 className="text-lg font-medium text-gray-900">
                  {formData.editingOrderId ? 'Edit Order' : 'Create New Order'}
                </h3>
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
                  {loading 
                    ? (formData.editingOrderId ? 'Updating...' : 'Creating...') 
                    : uploadingImages 
                      ? 'Uploading...' 
                      : (formData.editingOrderId ? 'Update Order' : 'Create Order')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-semibold text-gray-900">{selectedOrder.title}</h2>
                  <span className={`badge ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {selectedOrder.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`badge ${getPriorityBadgeClass(selectedOrder.priority)}`}>
                    {selectedOrder.priority} priority
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Information */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Order Details</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Client Name</label>
                        <p className="text-gray-900">{selectedOrder.client_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Due Date</label>
                          <p className="text-gray-900">{new Date(selectedOrder.due_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Quantity</label>
                          <p className="text-gray-900">{selectedOrder.quantity}</p>
                        </div>
                      </div>
                      {selectedOrder.category && (
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <p className="text-gray-900">{selectedOrder.category}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Created</label>
                        <p className="text-gray-900">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {selectedOrder.details && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedOrder.details}</p>
                    </div>
                  )}

                  {selectedOrder.specs && Object.keys(selectedOrder.specs).length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Specifications</h3>
                      <div className="space-y-2">
                        {Object.entries(selectedOrder.specs).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-700 font-medium">{key}:</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Images and Actions */}
                <div className="space-y-4">
                  {selectedOrder.image_urls && selectedOrder.image_urls.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Images</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedOrder.image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Order image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => openImageModal(url, selectedOrder.image_urls, index)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {profile?.role === 'manager' && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Actions</h3>
                      <div className="space-y-2">
                        <button 
                          onClick={() => editOrder(selectedOrder)}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Edit Order
                        </button>
                        <button 
                          onClick={() => showAssignWorkersModal(selectedOrder)}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          Assign Workers
                        </button>
                        <button 
                          onClick={() => deleteOrder(selectedOrder.id)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
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
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Create Your First Order
              </button>
            )}
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id)
            const isOverdue = new Date(order.due_date) < new Date() && order.status !== 'completed'
            
            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md ${
                  isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                {/* Collapsed View - Always Visible */}
                <div className="p-4 cursor-pointer" onClick={() => toggleOrderExpansion(order.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Title and Status */}
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {order.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                            {order.status?.replace('_', ' ').toUpperCase()}
                          </span>
                          {isOverdue && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Key Info - Always Visible */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                          {order.client_name}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                          {new Date(order.due_date).toLocaleDateString()}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
                          {order.priority} priority
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrder(order)
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                        title="View Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleOrderExpansion(order.id)
                        }}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-all duration-200"
                      >
                        <svg 
                          className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Order Details */}
                      <div className="space-y-3">
                        {order.details && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
                            <p className="text-sm text-gray-700">{order.details}</p>
                          </div>
                        )}
                        
                        {order.category && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Category</p>
                            <p className="text-sm text-gray-700">{order.category}</p>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Created</p>
                          <p className="text-sm text-gray-700">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Images */}
                      {order.image_urls && order.image_urls.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Images</p>
                          <div className="grid grid-cols-3 gap-2">
                            {order.image_urls.slice(0, 6).map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`Order ${index + 1}`}
                                className="w-full h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openImageModal(url, order.image_urls, index)
                                }}
                              />
                            ))}
                            {order.image_urls.length > 6 && (
                              <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                                +{order.image_urls.length - 6} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions for expanded view */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedOrder(order)
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                      >
                        View Full Details
                      </button>
                      
                      {profile?.role === 'manager' && (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              showAssignWorkersModal(order)
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                          >
                            Assign Workers
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              editOrder(order)
                            }}
                            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors"
                          >
                            Edit Order
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteOrder(order.id)
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      
                      {order.assignment_id && !order.marked_done && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            markOrderDone(order.id, order.assignment_id)
                          }}
                          className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 transition-colors"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
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