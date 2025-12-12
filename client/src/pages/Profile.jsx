import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../services/api'
import PasswordChangeModal from '../components/PasswordChangeModal'

export default function Profile() {
  const navigate = useNavigate()
  const { user, updateUser, fetchUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [bookings, setBookings] = useState([])
  const [fetchingData, setFetchingData] = useState(true)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || ''
  })

  const [preferences, setPreferences] = useState({
    notifications: user?.preferences?.notifications ?? true,
    newsletter: user?.preferences?.newsletter ?? true,
    language: user?.preferences?.language || 'en'
  })

  // Fetch user data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchingData(true)

        // Fetch favorites
        const favResponse = await api.get('/favorites')
        if (favResponse.data.success) {
          setFavorites(favResponse.data.data || [])
        }

        // Fetch user bookings
        const bookResponse = await api.get('/bookings/my')
        if (bookResponse.data.success) {
          setBookings(bookResponse.data.data || [])
        }

        // Refresh user data
        if (fetchUser) {
          await fetchUser()
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setFetchingData(false)
      }
    }
    fetchData()
  }, [fetchUser])

  // Update form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || ''
      })
      setPreferences({
        notifications: user.preferences?.notifications ?? true,
        newsletter: user.preferences?.newsletter ?? true,
        language: user.preferences?.language || 'en'
      })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.put('/users/profile', formData)
      if (response.data.success) {
        updateUser(response.data.data)
        setIsEditing(false)
        toast.success('Profile updated successfully!')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setAvatarUploading(true)
    try {
      // Convert to base64 for now (you can implement proper file upload)
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const response = await api.put('/users/profile', { avatar: reader.result })
          if (response.data.success) {
            updateUser(response.data.data)
            toast.success('Avatar updated!')
          }
        } catch (error) {
          toast.error('Failed to update avatar')
        } finally {
          setAvatarUploading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('Failed to upload avatar')
      setAvatarUploading(false)
    }
  }

  const handlePreferencesUpdate = async () => {
    try {
      const response = await api.put('/users/profile', { preferences })
      if (response.data.success) {
        updateUser(response.data.data)
        setShowPreferencesModal(false)
        toast.success('Preferences updated!')
      }
    } catch (error) {
      toast.error('Failed to update preferences')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Dynamic stats from database
  const stats = [
    {
      label: 'Places Visited',
      value: user?.stats?.placesVisited || 0,
      icon: '📍',
      gradient: 'from-emerald-500 to-teal-600'
    },
    {
      label: 'Reviews Written',
      value: user?.stats?.reviewsCount || 0,
      icon: '⭐',
      gradient: 'from-amber-500 to-orange-600'
    },
    {
      label: 'Bookings',
      value: bookings.length || user?.stats?.bookingsCount || 0,
      icon: '📅',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      label: 'Favorites',
      value: favorites.length,
      icon: '❤️',
      gradient: 'from-pink-500 to-rose-600'
    }
  ]

  // Role display
  const getRoleDisplay = () => {
    switch (user?.role) {
      case 'admin':
        return { label: '👑 Administrator', color: 'bg-yellow-500' }
      case 'business_owner':
        return { label: '🏢 Business Owner', color: 'bg-blue-500' }
      case 'driver':
        return { label: '🚗 Driver', color: 'bg-green-500' }
      default:
        return { label: '🌟 Tourist', color: 'bg-primary' }
    }
  }

  const roleInfo = getRoleDisplay()

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-primary mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back</span>
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-primary via-primary-dark to-amber-700 rounded-3xl shadow-xl p-6 sm:p-10 text-white mb-8 relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            {/* Avatar with Upload */}
            <div className="relative group">
              <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center text-primary text-4xl sm:text-5xl font-bold shadow-2xl overflow-hidden">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase()
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={avatarUploading}
                />
                <span className="text-white text-sm font-medium">
                  {avatarUploading ? '...' : '📷 Change'}
                </span>
              </label>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">{user?.name}</h1>
              <p className="text-lg opacity-90 mb-4">{user?.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className={`px-4 py-1.5 ${roleInfo.color} rounded-full text-sm font-semibold`}>
                  {roleInfo.label}
                </span>
                {user?.last_login && (
                  <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                    🕐 Last login: {formatDate(user.last_login)}
                  </span>
                )}
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  📅 Joined: {formatDate(user?.created_at)}
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-3 bg-white text-primary rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              {isEditing ? '✕ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-5 sm:p-6"
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r ${stat.gradient} rounded-xl flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4`}>
                {stat.icon}
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                {fetchingData ? '...' : stat.value}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Profile Form / Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-6 sm:p-8"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">
              {isEditing ? '✏️ Edit Profile Information' : '👤 Profile Information'}
            </h2>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="09XX-XXX-XXXX"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Location
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Kitcharao, Agusan del Norte"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-primary text-white hover:shadow-lg'
                      }`}
                  >
                    {loading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Full Name
                    </label>
                    <p className="text-lg font-medium text-gray-900">{user?.name || 'Not set'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Email Address
                    </label>
                    <p className="text-lg font-medium text-gray-900">{user?.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Phone Number
                    </label>
                    <p className="text-lg font-medium text-gray-900">{user?.phone || 'Not set'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <label className="block text-xs font-semibold text-gray-500 mb-1">
                      Location
                    </label>
                    <p className="text-lg font-medium text-gray-900">{user?.location || 'Not set'}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">⚙️ Account Settings</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full px-4 py-3.5 text-left border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔐</span>
                        <span className="font-medium text-gray-900">Change Password</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setShowPreferencesModal(true)}
                      className="w-full px-4 py-3.5 text-left border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">🔔</span>
                        <span className="font-medium text-gray-900">Notification Preferences</span>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Recent Bookings */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">📅 Recent Bookings</h3>
                <button
                  onClick={() => navigate('/bookings')}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              {fetchingData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.slice(0, 3).map((booking, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-lg">
                        📍
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {booking.place?.name || 'Unknown Place'}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(booking.booking_date)}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-3xl mb-2">📭</p>
                  <p className="text-sm">No bookings yet</p>
                </div>
              )}
            </div>

            {/* Favorites Preview */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">❤️ Favorites</h3>
                <button
                  onClick={() => navigate('/favorites')}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  View All
                </button>
              </div>
              {fetchingData ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : favorites.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {favorites.slice(0, 6).map((place, index) => (
                    <div
                      key={index}
                      onClick={() => navigate(`/places/${place.id}`)}
                      className="aspect-square rounded-lg overflow-hidden cursor-pointer group"
                    >
                      <img
                        src={place.images?.[0] || 'https://via.placeholder.com/100'}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p className="text-3xl mb-2">💔</p>
                  <p className="text-sm">No favorites yet</p>
                </div>
              )}
            </div>

            {/* Account Status */}
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4">📊 Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-sm">Account Status</span>
                  <span className="px-3 py-1 bg-green-500 rounded-full text-xs font-bold">
                    {user?.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-sm">Notifications</span>
                  <span className="text-sm font-medium">
                    {preferences.notifications ? '✅ On' : '❌ Off'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-sm">Newsletter</span>
                  <span className="text-sm font-medium">
                    {preferences.newsletter ? '✅ Subscribed' : '❌ Not subscribed'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferencesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPreferencesModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6">🔔 Notification Preferences</h2>

              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Push Notifications</p>
                    <p className="text-sm text-gray-500">Receive booking and activity updates</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.notifications}
                    onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                  <div>
                    <p className="font-medium text-gray-900">Newsletter</p>
                    <p className="text-sm text-gray-500">Receive weekly updates and offers</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.newsletter}
                    onChange={(e) => setPreferences({ ...preferences, newsletter: e.target.checked })}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-900 mb-2">Language</p>
                  <select
                    value={preferences.language}
                    onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="en">English</option>
                    <option value="fil">Filipino</option>
                    <option value="ceb">Cebuano</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePreferencesUpdate}
                  className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark"
                >
                  Save Preferences
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
