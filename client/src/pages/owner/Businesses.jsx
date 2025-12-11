import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import ImageCarousel from '../../components/ImageCarousel'

export default function OwnerBusinesses() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'restaurant',
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
  const [uploadingImages, setUploadingImages] = useState(false)

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
      const response = await api.get('/owners/profile')
      setProfile(response.data.data)
    } catch (error) {
      console.error('Failed to fetch businesses:', error)
      toast.error('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      await api.put(`/owners/businesses/${editingBusiness.id || editingBusiness._id}`, formData)
      toast.success('Business updated successfully!')
      fetchBusinesses()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update business')
      console.error(error)
    }
  }

  const openModal = (business) => {
    setEditingBusiness(business)
    setFormData({
      name: business.name || '',
      description: business.description || '',
      type: business.type || 'restaurant',
      images: business.images || [],
      contact: business.contact || { phone: '', email: '', website: '' },
      location: business.location || {
        address: '',
        coordinates: { lat: 8.9600, lng: 125.4300 }
      },
      status: business.status || 'active',
      featured: business.featured || false
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingBusiness(null)
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Businesses</h1>
        <p className="text-gray-600">Manage and edit your business operations</p>
      </div>

      {profile?.businesses && profile.businesses.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profile.businesses.map((business, index) => (
            <motion.div
              key={business.id || business._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Image/Icon */}
              <div className="h-48 relative">
                {business.images && business.images.length > 0 ? (
                  <>
                    <ImageCarousel images={business.images} className="h-full" autoSlide={true} slideInterval={4000} />
                    {business.featured && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold z-20">
                        ⭐ Featured
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`h-full bg-gradient-to-br ${business.type === 'restaurant' ? 'from-primary to-primary-dark' :
                      business.type === 'hotel' ? 'from-primary to-primary-dark' :
                        business.type === 'shop' ? 'from-primary to-primary-dark' :
                          business.type === 'service' ? 'from-beige-400 to-primary-dark' :
                            business.type === 'transport' ? 'from-primary-light to-primary' :
                              'from-primary to-primary-dark'
                    } flex items-center justify-center text-6xl relative`}>
                    {businessTypes.find(t => t.value === business.type)?.icon || '🏢'}
                    {business.featured && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                        ⭐ Featured
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{business.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{business.location?.address || 'Kitcharao'}</p>
                    <span className="inline-block px-3 py-1 bg-blue-100 text-primary rounded-full text-xs font-semibold">
                      {businessTypes.find(t => t.value === business.type)?.label}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{business.description || 'No description provided'}</p>

                {/* Status Badge */}
                <div className="mb-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${business.status === 'active'
                        ? 'bg-beige-300 text-beige-600'
                        : 'bg-gray-100 text-gray-700'
                      }`}
                  >
                    {business.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(business)}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    Edit Business
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl shadow-md">
          <div className="text-6xl mb-4">🏢</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Businesses Yet</h3>
          <p className="text-gray-600 mb-6">
            Contact the admin to add businesses to your account
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Edit Business: {editingBusiness?.name}
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

            <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      placeholder="Business Name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Business Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.icon} {type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    placeholder="Describe your business..."
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Business Images
                  </label>

                  {/* Upload Buttons */}
                  <div className="flex gap-3 mb-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary transition-colors text-center">
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
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:border-primary transition-colors text-sm font-medium text-gray-700"
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
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
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
                    <p className="text-xs text-primary font-medium">
                      ✓ Auto-compressed to 1200px
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={formData.location.address}
                      onChange={(e) => setFormData({
                        ...formData,
                        location: { ...formData.location, address: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      placeholder="Street Address, Kitcharao"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.location.coordinates.lat}
                        onChange={(e) => setFormData({
                          ...formData,
                          location: {
                            ...formData.location,
                            coordinates: { ...formData.location.coordinates, lat: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Longitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.location.coordinates.lng}
                        onChange={(e) => setFormData({
                          ...formData,
                          location: {
                            ...formData.location,
                            coordinates: { ...formData.location.coordinates, lng: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.contact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, phone: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, email: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      placeholder="info@business.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.contact.website}
                      onChange={(e) => setFormData({
                        ...formData,
                        contact: { ...formData.contact, website: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Status Note */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-900 mb-1">Note about Status & Featured</p>
                      <p className="text-sm text-yellow-800">
                        Status (Active/Inactive) and Featured settings can only be changed by the admin. Contact them if you need to update these settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
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
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Update Business
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}



