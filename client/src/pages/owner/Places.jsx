import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import ImageCarousel from '../../components/ImageCarousel'

export default function OwnerPlaces() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlace, setEditingPlace] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'nature',
    location: {
      address: '',
      city: 'Kitcharao',
      province: 'Agusan del Sur',
      coordinates: {
        lat: 8.9600,
        lng: 125.4300
      }
    },
    contactInfo: {
      phone: '',
      email: '',
      website: ''
    },
    openingHours: {
      monday: { open: '08:00', close: '17:00', closed: false },
      tuesday: { open: '08:00', close: '17:00', closed: false },
      wednesday: { open: '08:00', close: '17:00', closed: false },
      thursday: { open: '08:00', close: '17:00', closed: false },
      friday: { open: '08:00', close: '17:00', closed: false },
      saturday: { open: '08:00', close: '17:00', closed: false },
      sunday: { open: '08:00', close: '17:00', closed: false }
    },
    entryFee: {
      adult: 0,
      child: 0,
      senior: 0
    },
    pricePerNight: 0, // For hotels
    menu: [], // For restaurants
    shopCategories: [], // For shops
    shopDetails: '', // For shops
    services: [], // For service businesses
    nowShowing: [], // For entertainment/cinema
    facilities: [],
    activities: [],
    images: [],
    status: 'active',
    featured: false
  })
  const [uploadingImages, setUploadingImages] = useState(false)

  const categories = [
    { value: 'nature', label: 'Nature & Parks', icon: '🏞️' },
    { value: 'adventure', label: 'Adventure', icon: '🏔️' },
    { value: 'food', label: 'Food & Dining', icon: '🍽️' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'accommodation', label: 'Hotels & Resorts', icon: '🏨' }
  ]

  const facilityOptions = ['Parking', 'Restroom', 'WiFi', 'Restaurant', 'First Aid', 'Gift Shop', 'Guided Tours', 'Picnic Area', 'Swimming Pool', 'Playground']
  const activityOptions = ['Hiking', 'Swimming', 'Photography', 'Bird Watching', 'Camping', 'Fishing', 'Snorkeling', 'Kayaking', 'Rock Climbing', 'Sightseeing']

  useEffect(() => {
    fetchPlaces()
  }, [])

  const fetchPlaces = async () => {
    try {
      setLoading(true)
      const response = await api.get('/owners/profile')
      setProfile(response.data.data)
    } catch (error) {
      console.error('Failed to fetch places:', error)
      toast.error('Failed to load places')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      // Prepare data with proper pricing structure (same as admin)
      const placeData = {
        ...formData,
        pricing: {
          adult: formData.entryFee?.adult || 0,
          child: formData.entryFee?.child || 0,
          senior: formData.entryFee?.senior || 0,
          pricePerNight: formData.pricePerNight || 0,
          entranceFee: formData.entryFee?.adult || formData.pricePerNight || 0,
          currency: 'PHP',
          isFree: !formData.entryFee?.adult && !formData.pricePerNight && !formData.entryFee?.child && !formData.entryFee?.senior
        },
        shop: {
          categories: formData.shopCategories || [],
          details: formData.shopDetails || ''
        },
        entertainment: {
          nowShowing: formData.nowShowing || []
        }
      }

      await api.put(`/owners/places/${editingPlace.id || editingPlace._id}`, placeData)
      toast.success('Place updated successfully!')
      fetchPlaces()
      closeModal()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update place')
      console.error(error)
    }
  }

  const openModal = (place) => {
    setEditingPlace(place)
    // Map backend place data to frontend formData structure
    setFormData({
      name: place.name || '',
      description: place.description || '',
      category: place.category || 'nature',
      location: {
        address: place.location?.address || '',
        city: place.location?.municipality || place.location?.city || 'Kitcharao',
        province: place.location?.province || 'Agusan del Sur',
        coordinates: {
          lat: place.location?.coordinates?.lat || 8.9600,
          lng: place.location?.coordinates?.lng || 125.4300
        }
      },
      contactInfo: {
        phone: place.contact?.phone || place.contactInfo?.phone || '',
        email: place.contact?.email || place.contactInfo?.email || '',
        website: place.contact?.website || place.contactInfo?.website || ''
      },
      openingHours: place.hours || place.openingHours || {
        monday: { open: '08:00', close: '17:00', closed: false },
        tuesday: { open: '08:00', close: '17:00', closed: false },
        wednesday: { open: '08:00', close: '17:00', closed: false },
        thursday: { open: '08:00', close: '17:00', closed: false },
        friday: { open: '08:00', close: '17:00', closed: false },
        saturday: { open: '08:00', close: '17:00', closed: false },
        sunday: { open: '08:00', close: '17:00', closed: false }
      },
      entryFee: {
        adult: place.pricing?.entranceFee || place.pricing?.adult || place.entryFee?.adult || 0,
        child: place.pricing?.child || place.entryFee?.child || 0,
        senior: place.pricing?.senior || place.entryFee?.senior || 0
      },
      pricePerNight: place.pricing?.pricePerNight || 0,
      menu: place.menu || [],
      shopCategories: place.shop?.categories || [],
      shopDetails: place.shop?.details || '',
      services: place.services || [],
      nowShowing: place.entertainment?.nowShowing || [],
      facilities: place.amenities || place.facilities || [],
      activities: place.activities || [],
      images: Array.isArray(place.images)
        ? (place.images.length > 0 && typeof place.images[0] === 'object'
          ? place.images.map(img => img.url || img)
          : place.images)
        : [],
      status: place.status || 'active',
      featured: place.featured || place.isFeatured || false
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPlace(null)
  }

  const toggleArrayItem = (array, item) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item]
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Places</h1>
        <p className="text-gray-600">Manage and edit your tourist destinations</p>
      </div>

      {profile?.places && profile.places.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profile.places.map((place, index) => (
            <motion.div
              key={place.id || place._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Image/Icon */}
              <div className="h-48 relative">
                {place.images && place.images.length > 0 ? (
                  <>
                    <ImageCarousel images={place.images} className="h-full" autoSlide={true} slideInterval={4000} />
                    {place.featured && (
                      <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold z-20">
                        ⭐ Featured
                      </div>
                    )}
                  </>
                ) : (
                  <div className={`h-full bg-gradient-to-br ${place.category === 'nature' ? 'from-primary to-primary-dark' :

                    place.category === 'cultural' ? 'from-primary to-primary-dark' :
                      'from-primary to-primary-dark'
                    } flex items-center justify-center text-6xl relative`}>
                    {categories.find(c => c.value === place.category)?.icon || '📍'}
                    {place.featured && (
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
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{place.location?.address || 'Kitcharao'}</p>
                    <span className="inline-block px-3 py-1 bg-beige-300 text-beige-600 rounded-full text-xs font-semibold">
                      {categories.find(c => c.value === place.category)?.label}
                    </span>
                  </div>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{place.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Visitors</p>
                    <p className="font-bold text-gray-900">{place.visitors?.total || 0}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-xs">Rating</p>
                    <p className="font-bold text-gray-900">⭐ {place.rating?.average || 0}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(place)}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:shadow-lg transition-all"
                  >
                    Edit Place
                  </button>
                  <Link
                    to={`/places/${place.id || place._id}`}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors text-center"
                  >
                    View
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl shadow-md">
          <div className="text-6xl mb-4">📍</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No Places Yet</h3>
          <p className="text-gray-600 mb-6">
            Contact the admin to add places to your account
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
                Edit Place: {editingPlace?.name}
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
                      Place Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="Manlangit Nature's Park"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    placeholder="Describe the place..."
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Place Images
                  </label>

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
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="Barangay Manlangit"
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
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
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
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
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
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, phone: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="info@place.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={formData.contactInfo.website}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, website: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Entry Fees - Only for nature, beach, cultural, adventure */}
                {(formData.category === 'nature' || formData.category === 'cultural' || formData.category === 'adventure') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Entry Fees (PHP)
                    </label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Adult</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.entryFee.adult || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({
                              ...formData,
                              entryFee: { ...formData.entryFee, adult: value ? parseInt(value) : 0 }
                            });
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Child</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.entryFee.child || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({
                              ...formData,
                              entryFee: { ...formData.entryFee, child: value ? parseInt(value) : 0 }
                            });
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Senior</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.entryFee.senior || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            setFormData({
                              ...formData,
                              entryFee: { ...formData.entryFee, senior: value ? parseInt(value) : 0 }
                            });
                          }}
                          placeholder="0"
                          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Hotel - Price per Night */}
                {formData.category === 'accommodation' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price per Night (PHP)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.pricePerNight || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setFormData({
                          ...formData,
                          pricePerNight: value ? parseInt(value) : 0
                        });
                      }}
                      placeholder="e.g., 1500"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">💡 Base price for standard room per night</p>
                  </div>
                )}

                {/* Restaurant - Menu Items */}
                {formData.category === 'food' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Menu Items 🍽️
                    </label>
                    <div className="space-y-3">
                      {(formData.menu || []).map((item, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={item?.name || ''}
                              onChange={(e) => {
                                const newMenu = [...(formData.menu || [])];
                                newMenu[index] = { ...newMenu[index], name: e.target.value };
                                setFormData({ ...formData, menu: newMenu });
                              }}
                              placeholder="Dish name (e.g., Adobo)"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={item?.price || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                const newMenu = [...(formData.menu || [])];
                                newMenu[index] = { ...newMenu[index], price: value ? parseInt(value) : 0 };
                                setFormData({ ...formData, menu: newMenu });
                              }}
                              placeholder="Price (₱)"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                          </div>
                          <textarea
                            value={item?.description || ''}
                            onChange={(e) => {
                              const newMenu = [...(formData.menu || [])];
                              newMenu[index] = { ...newMenu[index], description: e.target.value };
                              setFormData({ ...formData, menu: newMenu });
                            }}
                            placeholder="Description"
                            rows="2"
                            className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                          />
                          <textarea
                            value={item?.recipe || ''}
                            onChange={(e) => {
                              const newMenu = [...(formData.menu || [])];
                              newMenu[index] = { ...newMenu[index], recipe: e.target.value };
                              setFormData({ ...formData, menu: newMenu });
                            }}
                            placeholder="Recipe/Ingredients (optional)"
                            rows="2"
                            className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newMenu = (formData.menu || []).filter((_, i) => i !== index);
                              setFormData({ ...formData, menu: newMenu });
                            }}
                            className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                          >
                            Remove Item
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            menu: [...(formData.menu || []), { name: '', description: '', recipe: '', price: 0 }]
                          });
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-beige-500 rounded-lg text-beige-500 font-medium hover:bg-beige-50"
                      >
                        + Add Menu Item
                      </button>
                    </div>
                  </div>
                )}

                {/* Shop - Categories and Details */}
                {formData.category === 'shopping' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Shop Categories 🛍️
                      </label>
                      <input
                        type="text"
                        value={(formData.shopCategories || []).join(', ')}
                        onChange={(e) => {
                          const categories = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                          setFormData({ ...formData, shopCategories: categories });
                        }}
                        placeholder="e.g., Electronics, Clothing, Accessories"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">💡 Separate categories with commas</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        What You're Selling
                      </label>
                      <textarea
                        value={formData.shopDetails}
                        onChange={(e) => setFormData({ ...formData, shopDetails: e.target.value })}
                        placeholder="Describe your products and what makes your shop special..."
                        rows="4"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Services */}
                {formData.category === 'service' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Services Offered 🔧
                    </label>
                    <div className="space-y-3">
                      {(formData.services || []).map((service, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                          <div className="grid grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={service?.name || ''}
                              onChange={(e) => {
                                const newServices = [...(formData.services || [])];
                                newServices[index] = { ...newServices[index], name: e.target.value };
                                setFormData({ ...formData, services: newServices });
                              }}
                              placeholder="Service name"
                              className="col-span-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={service?.price || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                const newServices = [...(formData.services || [])];
                                newServices[index] = { ...newServices[index], price: value ? parseInt(value) : 0 };
                                setFormData({ ...formData, services: newServices });
                              }}
                              placeholder="Price (₱)"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                          </div>
                          <input
                            type="text"
                            value={service?.duration || ''}
                            onChange={(e) => {
                              const newServices = [...(formData.services || [])];
                              newServices[index] = { ...newServices[index], duration: e.target.value };
                              setFormData({ ...formData, services: newServices });
                            }}
                            placeholder="Duration (e.g., 1 hour, 30 minutes)"
                            className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                          />
                          <textarea
                            value={service?.description || ''}
                            onChange={(e) => {
                              const newServices = [...(formData.services || [])];
                              newServices[index] = { ...newServices[index], description: e.target.value };
                              setFormData({ ...formData, services: newServices });
                            }}
                            placeholder="Service description"
                            rows="2"
                            className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newServices = (formData.services || []).filter((_, i) => i !== index);
                              setFormData({ ...formData, services: newServices });
                            }}
                            className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                          >
                            Remove Service
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            services: [...(formData.services || []), { name: '', description: '', price: 0, duration: '' }]
                          });
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-beige-500 rounded-lg text-beige-500 font-medium hover:bg-beige-50"
                      >
                        + Add Service
                      </button>
                    </div>
                  </div>
                )}

                {/* Entertainment - Cinema/Now Showing */}
                {formData.category === 'entertainment' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Now Showing 🎬
                    </label>
                    <div className="space-y-3">
                      {(formData.nowShowing || []).map((show, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={show?.title || ''}
                              onChange={(e) => {
                                const newShowing = [...(formData.nowShowing || [])];
                                newShowing[index] = { ...newShowing[index], title: e.target.value };
                                setFormData({ ...formData, nowShowing: newShowing });
                              }}
                              placeholder="Movie/Show title"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={show?.genre || ''}
                              onChange={(e) => {
                                const newShowing = [...(formData.nowShowing || [])];
                                newShowing[index] = { ...newShowing[index], genre: e.target.value };
                                setFormData({ ...formData, nowShowing: newShowing });
                              }}
                              placeholder="Genre"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-2">
                            <input
                              type="date"
                              value={show?.date || ''}
                              onChange={(e) => {
                                const newShowing = [...(formData.nowShowing || [])];
                                newShowing[index] = { ...newShowing[index], date: e.target.value };
                                setFormData({ ...formData, nowShowing: newShowing });
                              }}
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                            <input
                              type="time"
                              value={show?.time || ''}
                              onChange={(e) => {
                                const newShowing = [...(formData.nowShowing || [])];
                                newShowing[index] = { ...newShowing[index], time: e.target.value };
                                setFormData({ ...formData, nowShowing: newShowing });
                              }}
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              value={show?.price || ''}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '');
                                const newShowing = [...(formData.nowShowing || [])];
                                newShowing[index] = { ...newShowing[index], price: value ? parseInt(value) : 0 };
                                setFormData({ ...formData, nowShowing: newShowing });
                              }}
                              placeholder="Price (₱)"
                              className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                            />
                          </div>
                          <textarea
                            value={show?.description || ''}
                            onChange={(e) => {
                              const newShowing = [...(formData.nowShowing || [])];
                              newShowing[index] = { ...newShowing[index], description: e.target.value };
                              setFormData({ ...formData, nowShowing: newShowing });
                            }}
                            placeholder="Description/Synopsis"
                            rows="2"
                            className="w-full mt-2 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newShowing = (formData.nowShowing || []).filter((_, i) => i !== index);
                              setFormData({ ...formData, nowShowing: newShowing });
                            }}
                            className="mt-2 px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            nowShowing: [...(formData.nowShowing || []), { title: '', genre: '', date: '', time: '', price: 0, description: '' }]
                          });
                        }}
                        className="w-full px-4 py-3 border-2 border-dashed border-beige-500 rounded-lg text-beige-500 font-medium hover:bg-beige-50"
                      >
                        + Add Show/Movie
                      </button>
                    </div>
                  </div>
                )}

                {/* Facilities */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Facilities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {facilityOptions.map(facility => (
                      <button
                        key={facility}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          facilities: toggleArrayItem(formData.facilities, facility)
                        })}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${formData.facilities.includes(facility)
                          ? 'bg-beige-400 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {facility}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Activities */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Activities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {activityOptions.map(activity => (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          activities: toggleArrayItem(formData.activities, activity)
                        })}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${formData.activities.includes(activity)
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {activity}
                      </button>
                    ))}
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
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Update Place
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}



