import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import api from '../services/api'
import PasswordChangeModal from '../components/PasswordChangeModal'

export default function Profile() {
  const { user, updateUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const response = await api.put('/users/profile', formData)
      if (response.data.success) {
        updateUser(response.data.data) // Update local state with server response
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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const stats = [
    { label: 'Places Visited', value: '12', icon: '📍', gradient: 'from-primary to-primary-dark' },
    { label: 'Reviews Written', value: '8', icon: '⭐', gradient: 'from-primary-light to-primary' },
    { label: 'Photos Uploaded', value: '24', icon: '📸', gradient: 'from-primary to-primary-dark' },
    { label: 'Favorites', value: '15', icon: '❤️', gradient: 'from-primary to-red-600' }
  ]

  const recentActivity = [
    { type: 'visit', place: "Manlangit Nature's Park", date: '2 days ago', icon: '🏞️' },
    { type: 'review', place: 'Masao Public Beach', date: '1 week ago', icon: '⭐' },
    { type: 'photo', place: 'Municipal Plaza', date: '2 weeks ago', icon: '📸' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-beige-400 via-beige-500 to-primary-dark rounded-3xl shadow-xl p-8 sm:p-12 text-white mb-8"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-beige-500 text-5xl font-bold shadow-2xl">
              {user?.name?.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-4xl font-bold mb-2">{user?.name}</h1>
              <p className="text-lg opacity-90 mb-4">{user?.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  {user?.role === 'admin' ? '👑 Admin' : '🌟 Explorer'}
                </span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  🏆 Level 5
                </span>
                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  🔥 12 Day Streak
                </span>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-3 bg-white text-beige-500 rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6"
            >
              <div className={`w-12 h-12 bg-gradient-to-r ${stat.gradient} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                {stat.icon}
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Form / Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isEditing ? 'Edit Profile Information' : 'Profile Information'}
            </h2>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
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
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                  />
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
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
                    placeholder="Kitcharao, Agusan del Sur"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary text-white hover:shadow-lg'
                      }`}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
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
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-2">
                      Full Name
                    </label>
                    <p className="text-lg text-gray-900">{user?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-2">
                      Email Address
                    </label>
                    <p className="text-lg text-gray-900">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-2">
                      Phone Number
                    </label>
                    <p className="text-lg text-gray-900">{formData.phone || 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-500 mb-2">
                      Location
                    </label>
                    <p className="text-lg text-gray-900">{formData.location || 'Not set'}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Account Settings</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowPasswordModal(true)}
                      className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-beige-400 transition-all flex items-center justify-between"
                    >
                      <span className="font-medium text-gray-900">Change Password</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-beige-400 transition-all flex items-center justify-between">
                      <span className="font-medium text-gray-900">Privacy Settings</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button className="w-full px-4 py-3 text-left border-2 border-gray-200 rounded-xl hover:border-beige-400 transition-all flex items-center justify-between">
                      <span className="font-medium text-gray-900">Notification Preferences</span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Activity Feed */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="text-2xl">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{activity.place}</p>
                      <p className="text-xs text-gray-500">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">🏆 Achievements</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-2xl">🎯</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">First Visit</p>
                    <p className="text-xs opacity-80">Completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-2xl">⭐</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Reviewer</p>
                    <p className="text-xs opacity-80">8/10 reviews</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <span className="text-2xl">📸</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Photographer</p>
                    <p className="text-xs opacity-80">24/50 photos</p>
                  </div>
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
    </div>
  )
}



