import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminBusinesses() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'restaurant',
    ownerEmail: '', // NEW: Owner email field
    images: [],
    contact: {
      phone: '',
      email: '',
      website: ''
    },
    location: {
      address: '',
      coordinates: {
        lat: 8.9600,
        lng: 125.4300
      }
    },
    status: 'active',
    featured: false
  })

  const businessTypes = [
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'hotel', label: 'Hotel', icon: '🏨' },
    { value: 'shop', label: 'Shop', icon: '🛍️' },
    { value: 'service', label: 'Service', icon: '🔧' },
    { value: 'transport', label: 'Transport', icon: '🚗' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎭' }
  ]

  useEffect(() => {
    fetchBusinesses()
  }, [])

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      const response = await api.get('/businesses')
      setBusinesses(response.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch businesses')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingBusiness) {
        await api.put(`/businesses/${editingBusiness._id}`, formData)
        toast.success('Business updated successfully!')
      } else {
        await api.post('/businesses', formData)
        toast.success('Business created successfully!')
      }
      fetchBusinesses()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
      console.error(error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this business?')) return
    try {
      await api.delete(`/businesses/${id}`)
      toast.success('Business deleted successfully!')
      fetchBusinesses()
    } catch (error) {
      toast.error('Failed to delete business')
      console.error(error)
    }
  }

  const openModal = (business = null) => {
    if (business) {
      setEditingBusiness(business)
      setFormData({
        name: business.name || '',
        description: business.description || '',
        type: business.type || 'restaurant',
        images: business.images || [],
        contact: business.contact || { phone: '', email: '', website: '' },
        location: business.location || { address: '', coordinates: { lat: 8.9600, lng: 125.4300 } },
        status: business.status || 'active',
        featured: business.featured || false
      })
    } else {
      setEditingBusiness(null)
      setFormData({
        name: '',
        description: '',
        type: 'restaurant',
        ownerEmail: '', // NEW: Owner email field for new businesses
        images: [],
        contact: { phone: '', email: '', website: '' },
        location: { address: '', coordinates: { lat: 8.9600, lng: 125.4300 } },
        status: 'active',
        featured: false
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingBusiness(null)
  }

  // Image compression function
  const compressImage = (file, maxWidth = 1200, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality)
          resolve(compressedBase64)
        }
        img.onerror = reject
        img.src = e.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      toast.error('Please upload only JPG, PNG, or WebP images')
      return
    }

    // Validate file sizes (10MB per file before compression)
    const maxSize = 10 * 1024 * 1024 // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      toast.error('Some images are too large (max 10MB per image)')
      return
    }

    setUploadingImages(true)
    
    try {
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      )
      
      setFormData({
        ...formData,
        images: [...formData.images, ...compressedImages]
      })
      toast.success(`${files.length} image(s) uploaded and compressed`)
    } catch (error) {
      toast.error('Failed to upload images')
      console.error(error)
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    })
  }

  const addImageURL = () => {
    const url = prompt('Enter image URL:')
    if (url && url.trim()) {
      setFormData({
        ...formData,
        images: [...formData.images, url.trim()]
      })
      toast.success('Image URL added')
    }
  }

  const filteredBusinesses = businesses.filter(business => {
    const matchesSearch = business.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || business.type === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Management</h1>
          <p className="text-gray-600">{filteredBusinesses.length} businesses found</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Business
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
          >
            <option value="all">All Types</option>
            {businessTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Businesses Grid */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading businesses...</p>
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-md">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No businesses found</h3>
          <p className="text-gray-600 mb-6">Create your first business to get started</p>
          <button
            onClick={() => openModal()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Add New Business
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBusinesses.map((business, index) => (
            <motion.div
              key={business._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="relative h-48 overflow-hidden">
                {business.images && business.images.length > 0 ? (
                  <img 
                    src={business.images[0]} 
                    alt={business.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                      e.target.parentElement.classList.add('bg-gradient-to-br', 'from-purple-500', 'to-pink-600', 'flex', 'items-center', 'justify-center', 'text-6xl');
                      e.target.parentElement.innerHTML = businessTypes.find(t => t.value === business.type)?.icon || '🏪';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl">
                    {businessTypes.find(t => t.value === business.type)?.icon || '🏪'}
                  </div>
                )}
                {business.featured && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold shadow-lg">
                    ⭐ Featured
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{business.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{business.description}</p>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold mb-4">
                  {businessTypes.find(t => t.value === business.type)?.label}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(business)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(business._id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingBusiness ? 'Edit Business' : 'Add New Business'}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="Business Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type *</label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Owner Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center gap-2">
                      Owner Email (Optional)
                      <span className="text-xs text-gray-500 font-normal">- Link this business to a user account</span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({...formData, ownerEmail: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    placeholder="owner@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 If provided, this business will be linked to the user's account. User must already be registered.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    placeholder="Describe the business..."
                  />
                </div>

                {/* Images Section */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Business Images</label>
                  
                  {/* Upload Buttons */}
                  <div className="flex gap-3 mb-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-beige-400 transition-colors text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          {uploadingImages ? 'Compressing & Uploading...' : 'Upload Images'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadingImages ? 'Please wait...' : 'JPG, PNG, WebP (max 10MB each)'}
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImages}
                      />
                    </label>
                    
                    <button
                      type="button"
                      onClick={addImageURL}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:border-beige-400 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Add URL
                    </button>
                  </div>

                  {/* Image Preview Grid */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/200x150?text=Invalid+Image'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-beige-400 text-white text-xs rounded-full">
                              Main
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      {formData.images.length} image(s) • First image is main display
                    </p>
                    <p className="text-xs text-beige-500 font-medium">
                      ✓ Auto-compressed to 1200px
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.contact.phone}
                      onChange={(e) => setFormData({...formData, contact: {...formData.contact, phone: e.target.value}})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="+63..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => setFormData({...formData, contact: {...formData.contact, email: e.target.value}})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="email@business.com"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.status === 'active'}
                      onChange={(e) => setFormData({...formData, status: e.target.checked ? 'active' : 'inactive'})}
                      className="w-4 h-4 text-beige-500 rounded focus:ring-beige-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                      className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  {editingBusiness ? 'Update Business' : 'Create Business'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}




