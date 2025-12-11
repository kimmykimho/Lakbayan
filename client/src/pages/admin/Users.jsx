import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import GrantDriverRoleModal from '../../components/GrantDriverRoleModal'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [ownedPlaces, setOwnedPlaces] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [driverCandidate, setDriverCandidate] = useState(null)
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    role: 'tourist'
  })
  const [createdUserInfo, setCreatedUserInfo] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showAddPlaceModal, setShowAddPlaceModal] = useState(false)
  const [placeData, setPlaceData] = useState({
    name: '',
    description: '',
    category: 'nature',
    images: [],
    location: {
      address: '',
      city: 'Kitcharao',
      province: 'Agusan del Sur',
      coordinates: { lat: 8.9600, lng: 125.4300 }
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
    facilities: [],
    activities: [],
    status: 'active',
    featured: false
  })
  const [uploadingPlaceImages, setUploadingPlaceImages] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users')
      setUsers(response.data.data || [])
    } catch (error) {
      toast.error('Failed to fetch users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdate = async (userId, newRole) => {
    // If selecting driver role, show driver setup modal
    if (newRole === 'driver') {
      const user = users.find(u => u.id === userId)
      setDriverCandidate(user)
      setShowDriverModal(true)
      return
    }

    try {
      await api.put(`/users/${userId}`, { role: newRole })
      toast.success('User role updated successfully!')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user role')
      console.error(error)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      // Database uses is_active (boolean), not status (string)
      const isCurrentlyActive = currentStatus === true || currentStatus === 'active'
      const newIsActive = !isCurrentlyActive
      await api.put(`/users/${userId}`, { is_active: newIsActive })
      toast.success(`User ${newIsActive ? 'activated' : 'deactivated'} successfully!`)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
      console.error(error)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    try {
      await api.delete(`/users/${userId}`)
      toast.success('User deleted successfully!')
      fetchUsers()
    } catch (error) {
      toast.error('Failed to delete user')
      console.error(error)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()

    // Validate email
    if (!newUserData.email || !newUserData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    try {
      setCreating(true)
      const response = await api.post('/users/create', newUserData)

      if (response.data.success) {
        toast.success('User created successfully!')
        setCreatedUserInfo({
          email: newUserData.email,
          tempPassword: response.data.data.tempPassword,
          role: newUserData.role
        })
        fetchUsers()
        // Don't close modal yet, show credentials first
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create user')
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  const resetCreateModal = () => {
    setShowCreateModal(false)
    setNewUserData({
      email: '',
      name: '',
      role: 'business_owner'
    })
    setCreatedUserInfo(null)
  }

  const fetchUserDetails = async (userId) => {
    try {
      const response = await api.get(`/users/${userId}/details`)
      if (response.data.success) {
        setUserProfile(response.data.data.profile)
        setOwnedPlaces(response.data.data.ownedPlaces || [])
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    }
  }

  const handleViewUser = async (user) => {
    setSelectedUser(user)
    setShowModal(true)
    // Clear previous data
    setUserProfile(null)
    setOwnedPlaces([])
    // Fetch fresh data for all users (to show owned places)
    await fetchUserDetails(user.id)
  }

  const categories = [
    { value: 'nature', label: 'Nature & Parks', icon: '🏞️' },

    { value: 'cultural', label: 'Cultural Sites', icon: '🏛️' },
    { value: 'adventure', label: 'Adventure', icon: '🏔️' },
    { value: 'food', label: 'Food & Dining', icon: '🍽️' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'accommodation', label: 'Hotels & Resorts', icon: '🏨' }
  ]


  const facilityOptions = ['Parking', 'Restroom', 'WiFi', 'Restaurant', 'First Aid', 'Gift Shop', 'Guided Tours', 'Picnic Area', 'Swimming Pool', 'Playground']
  const activityOptions = ['Hiking', 'Swimming', 'Photography', 'Bird Watching', 'Camping', 'Fishing', 'Snorkeling', 'Kayaking', 'Rock Climbing', 'Sightseeing']

  const compressImage = (file, maxWidth = 1200, maxHeight = 800, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

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

  const handlePlaceImageUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    const invalidFiles = files.filter(file => !validTypes.includes(file.type))

    if (invalidFiles.length > 0) {
      toast.error('Please upload only JPG, PNG, or WebP images')
      return
    }

    const maxSize = 10 * 1024 * 1024
    const oversizedFiles = files.filter(file => file.size > maxSize)

    if (oversizedFiles.length > 0) {
      toast.error('Some images are too large (max 10MB per image)')
      return
    }

    setUploadingPlaceImages(true)

    try {
      const compressedImages = await Promise.all(
        files.map(file => compressImage(file))
      )

      setPlaceData({
        ...placeData,
        images: [...placeData.images, ...compressedImages]
      })
      toast.success(`${files.length} image(s) uploaded and compressed`)
    } catch (error) {
      toast.error('Failed to upload images')
      console.error(error)
    } finally {
      setUploadingPlaceImages(false)
    }
  }

  const removePlaceImage = (index) => {
    setPlaceData({
      ...placeData,
      images: placeData.images.filter((_, i) => i !== index)
    })
  }

  const addPlaceImageURL = () => {
    const url = prompt('Enter image URL:')
    if (url && url.trim()) {
      setPlaceData({
        ...placeData,
        images: [...placeData.images, url.trim()]
      })
      toast.success('Image URL added')
    }
  }

  const toggleArrayItem = (array, item) => {
    return array.includes(item)
      ? array.filter(i => i !== item)
      : [...array, item]
  }

  const handleAddPlace = async (e) => {
    e.preventDefault()
    try {
      setCreating(true)
      await api.post(`/users/${selectedUser.id}/place`, placeData)
      toast.success('Place added successfully!')
      setShowAddPlaceModal(false)
      await fetchUserDetails(selectedUser.id)
      setPlaceData({
        name: '',
        description: '',
        category: 'nature',
        images: [],
        location: {
          address: '',
          city: 'Kitcharao',
          province: 'Agusan del Sur',
          coordinates: { lat: 8.9600, lng: 125.4300 }
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
        facilities: [],
        activities: [],
        status: 'active',
        featured: false
      })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add place')
    } finally {
      setCreating(false)
    }
  }


  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-red-100 text-red-700',
      tourist: 'bg-blue-100 text-primary',
      user: 'bg-blue-100 text-primary',
      business_owner: 'bg-beige-300 text-beige-600',
      driver: 'bg-orange-100 text-orange-700',
      moderator: 'bg-purple-100 text-purple-700'
    }
    return styles[role] || styles.user
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
          <p className="text-gray-600">{filteredUsers.length} users found</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="tourist">Tourists</option>
            <option value="business_owner">Business Owners</option>
            <option value="driver">Drivers</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-md">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Joined</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{user.name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role || 'tourist'}
                        onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getRoleBadge(user.role)}`}
                      >
                        <option value="tourist">Tourist</option>
                        <option value="business_owner">Business Owner</option>
                        <option value="driver">Driver</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStatusToggle(user.id, user.status || 'active')}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${(user.status || 'active') === 'active'
                          ? 'bg-beige-300 text-beige-600'
                          : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {(user.status || 'active') === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="px-3 py-1 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedUser(null)
                  setUserProfile(null)
                }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Name</label>
                  <p className="text-gray-900 mt-1">{selectedUser.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <p className="text-gray-900 mt-1">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Role</label>
                  <p className="text-gray-900 mt-1 capitalize">{selectedUser.role?.replace('_', ' ') || 'user'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Status</label>
                  <p className="text-gray-900 mt-1 capitalize">{selectedUser.status || 'active'}</p>
                </div>
              </div>

              {/* Owned Places (from admin assignment) */}
              {ownedPlaces.length > 0 && (
                <div className="mt-6 space-y-6">
                  <div className="border-t pt-6">
                    <div className="bg-beige-50 border border-beige-300 rounded-lg p-4 mb-4">
                      <h3 className="text-lg font-bold text-primary-dark flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Assigned Places
                      </h3>
                      <p className="text-sm text-primary mt-1">
                        Places linked to this user via admin assignment
                      </p>
                    </div>

                    {ownedPlaces.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">
                          Owned Places ({ownedPlaces.length})
                        </h4>
                        <div className="grid gap-3">
                          {ownedPlaces.map(place => (
                            <div key={place.id} className="border-2 border-beige-400 bg-beige-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start gap-4">
                                {place.images && place.images[0] && (
                                  <img src={place.images[0]} alt={place.name} className="w-20 h-20 rounded-lg object-cover" />
                                )}
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900">{place.name}</h5>
                                  <p className="text-sm text-gray-600 capitalize">{place.category}</p>
                                  <div className="flex gap-2 mt-2">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${place.status === 'active' ? 'bg-beige-300 text-beige-600' : 'bg-gray-100 text-gray-700'
                                      }`}>
                                      {place.status}
                                    </span>
                                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-primary">
                                      📍 Owner
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Business Owner Management (Legacy System) */}
              {selectedUser.role === 'business_owner' && (
                <div className="mt-6 space-y-6">
                  <div className="border-t pt-6">
                    {ownedPlaces.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <p className="text-xs text-yellow-800">
                          ℹ️ Note: The sections below are from the legacy Business Owner Profile system.
                          Items shown in "Assigned Places" above are managed via admin panel.
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900">
                        Places - Legacy Profile ({userProfile?.places?.length || 0})
                      </h3>
                      <button
                        onClick={() => setShowAddPlaceModal(true)}
                        className="px-4 py-2 bg-beige-400 text-white rounded-lg text-sm font-medium hover:bg-beige-500 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Place
                      </button>
                    </div>

                    {userProfile?.places && userProfile.places.length > 0 ? (
                      <div className="grid gap-3">
                        {userProfile.places.map(place => (
                          <div key={place.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                              {place.images && place.images[0] && (
                                <img src={place.images[0]} alt={place.name} className="w-20 h-20 rounded-lg object-cover" />
                              )}
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{place.name}</h4>
                                <p className="text-sm text-gray-600 capitalize">{place.category}</p>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${place.status === 'active' ? 'bg-beige-300 text-beige-600' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {place.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">No places yet</p>
                        <button
                          onClick={() => setShowAddPlaceModal(true)}
                          className="mt-3 text-beige-500 font-medium hover:text-beige-600"
                        >
                          Add their first place
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {createdUserInfo ? 'User Created Successfully' : 'Add New User'}
              </h2>
              <button
                onClick={resetCreateModal}
                className="w-10 h-10 sm:w-8 sm:h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center touch-manipulation"
              >
                <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!createdUserInfo ? (
              <form onSubmit={handleCreateUser} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="user@example.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">If not provided, email will be used</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      required
                    >
                      <option value="business_owner">Business Owner</option>
                      <option value="driver">Driver</option>
                      <option value="tourist">Tourist</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="bg-beige-50 border border-beige-300 rounded-xl p-4">
                    <div className="flex gap-3">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Automatic Account Setup</p>
                        <p>A temporary password will be generated. Make sure to copy it and share with the user securely.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={resetCreateModal}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-beige-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-beige-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">User Account Created!</h3>
                  <p className="text-gray-600">Share these credentials with the user securely</p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Email</label>
                    <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg mt-1">
                      <p className="text-gray-900 font-mono text-sm">{createdUserInfo.email}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.email)
                          toast.success('Email copied!')
                        }}
                        className="text-beige-500 hover:text-beige-600 text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Temporary Password</label>
                    <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg mt-1">
                      <p className="text-gray-900 font-mono text-sm">{createdUserInfo.tempPassword}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(createdUserInfo.tempPassword)
                          toast.success('Password copied!')
                        }}
                        className="text-beige-500 hover:text-beige-600 text-sm font-medium"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Role</label>
                    <p className="text-gray-900 mt-1 capitalize">{createdUserInfo.role.replace('_', ' ')}</p>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="flex gap-3">
                    <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold">Important</p>
                      <p>The user should change this password after their first login for security purposes.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={resetCreateModal}
                  className="w-full px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Add Place Modal */}
      {showAddPlaceModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Add Place for {selectedUser.name}</h2>
              <button
                onClick={() => setShowAddPlaceModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddPlace} className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Place Name *</label>
                    <input
                      type="text"
                      required
                      value={placeData.name}
                      onChange={(e) => setPlaceData({ ...placeData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="Manlangit Nature's Park"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                    <select
                      required
                      value={placeData.category}
                      onChange={(e) => setPlaceData({ ...placeData, category: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={placeData.description}
                    onChange={(e) => setPlaceData({ ...placeData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                    placeholder="Describe the place..."
                  />
                </div>

                {/* Images */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Place Images</label>

                  <div className="flex gap-3 mb-4">
                    <label className="flex-1 cursor-pointer">
                      <div className="px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-beige-400 transition-colors text-center">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">
                          {uploadingPlaceImages ? 'Compressing & Uploading...' : 'Upload Images'}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {uploadingPlaceImages ? 'Please wait...' : 'JPG, PNG, WebP (max 10MB each)'}
                        </p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handlePlaceImageUpload}
                        className="hidden"
                        disabled={uploadingPlaceImages}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={addPlaceImageURL}
                      className="px-4 py-3 border-2 border-gray-300 rounded-xl hover:border-beige-400 transition-colors text-sm font-medium text-gray-700"
                    >
                      <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Add URL
                    </button>
                  </div>

                  {placeData.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {placeData.images.map((image, index) => (
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
                            onClick={() => removePlaceImage(index)}
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
                      {placeData.images.length} image(s) • First image is main display
                    </p>
                    <p className="text-xs text-beige-500 font-medium">
                      ✓ Auto-compressed to 1200px
                    </p>
                  </div>
                </div>

                {/* Location */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={placeData.location.address}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        location: { ...placeData.location, address: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="Barangay Manlangit"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        value={placeData.location.coordinates.lat}
                        onChange={(e) => setPlaceData({
                          ...placeData,
                          location: {
                            ...placeData.location,
                            coordinates: { ...placeData.location.coordinates, lat: parseFloat(e.target.value) }
                          }
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        value={placeData.location.coordinates.lng}
                        onChange={(e) => setPlaceData({
                          ...placeData,
                          location: {
                            ...placeData.location,
                            coordinates: { ...placeData.location.coordinates, lng: parseFloat(e.target.value) }
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
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={placeData.contactInfo.phone}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        contactInfo: { ...placeData.contactInfo, phone: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={placeData.contactInfo.email}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        contactInfo: { ...placeData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="info@place.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Website</label>
                    <input
                      type="url"
                      value={placeData.contactInfo.website}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        contactInfo: { ...placeData.contactInfo, website: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Entry Fees */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Entry Fees (PHP)</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Adult</label>
                      <input
                        type="number"
                        min="0"
                        value={placeData.entryFee.adult}
                        onChange={(e) => setPlaceData({
                          ...placeData,
                          entryFee: { ...placeData.entryFee, adult: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Child</label>
                      <input
                        type="number"
                        min="0"
                        value={placeData.entryFee.child}
                        onChange={(e) => setPlaceData({
                          ...placeData,
                          entryFee: { ...placeData.entryFee, child: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Senior</label>
                      <input
                        type="number"
                        min="0"
                        value={placeData.entryFee.senior}
                        onChange={(e) => setPlaceData({
                          ...placeData,
                          entryFee: { ...placeData.entryFee, senior: parseInt(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-beige-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Facilities */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Facilities</label>
                  <div className="flex flex-wrap gap-2">
                    {facilityOptions.map(facility => (
                      <button
                        key={facility}
                        type="button"
                        onClick={() => setPlaceData({
                          ...placeData,
                          facilities: toggleArrayItem(placeData.facilities, facility)
                        })}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${placeData.facilities.includes(facility)
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Activities</label>
                  <div className="flex flex-wrap gap-2">
                    {activityOptions.map(activity => (
                      <button
                        key={activity}
                        type="button"
                        onClick={() => setPlaceData({
                          ...placeData,
                          activities: toggleArrayItem(placeData.activities, activity)
                        })}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${placeData.activities.includes(activity)
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                      >
                        {activity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status & Featured */}
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={placeData.status === 'active'}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        status: e.target.checked ? 'active' : 'inactive'
                      })}
                      className="w-4 h-4 text-beige-500 rounded focus:ring-beige-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={placeData.featured}
                      onChange={(e) => setPlaceData({
                        ...placeData,
                        featured: e.target.checked
                      })}
                      className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Featured</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddPlaceModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {creating ? 'Adding...' : 'Add Place'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Grant Driver Role Modal */}
      <GrantDriverRoleModal
        isOpen={showDriverModal}
        onClose={() => {
          setShowDriverModal(false)
          setDriverCandidate(null)
        }}
        user={driverCandidate}
        onSuccess={() => {
          fetchUsers()
          setShowDriverModal(false)
          setDriverCandidate(null)
        }}
      />
    </div>
  )
}




