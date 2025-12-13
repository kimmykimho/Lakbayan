import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import useDashboardCache from '../../store/dashboardCache'

export default function OwnerDashboard() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentReviews, setRecentReviews] = useState([])

  // Use dashboard cache
  const { getOwnerData, setOwnerData } = useDashboardCache()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Check cache first
    const cachedData = getOwnerData()
    if (cachedData?.profile) {
      console.log('📦 Using cached owner dashboard data')
      setProfile(cachedData.profile)
      setStats(cachedData.stats)
      setRecentReviews(cachedData.reviews || [])
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled([
        api.get('/owners/profile'),
        api.get('/owners/statistics'),
        api.get('/owners/reviews')
      ])

      let fetchedProfile = null
      let fetchedStats = null
      let fetchedReviews = []

      // Extract data safely
      if (results[0].status === 'fulfilled') {
        fetchedProfile = results[0].value.data.data
        setProfile(fetchedProfile)
      }

      if (results[1].status === 'fulfilled') {
        fetchedStats = results[1].value.data.data
        setStats(fetchedStats)
      }

      if (results[2].status === 'fulfilled') {
        fetchedReviews = results[2].value.data.data || []
        setRecentReviews(fetchedReviews)
      }

      // Cache the data if we got profile
      if (fetchedProfile) {
        setOwnerData(fetchedProfile, fetchedStats, fetchedReviews)
      }

      // Show error only if profile failed (critical)
      if (results[0].status === 'rejected') {
        console.error('Failed to fetch owner profile')
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🏢</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Owner Profile Not Found</h2>
          <p className="text-gray-600 mb-6">You may need to apply for business owner status</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-beige-500 text-white rounded-xl font-semibold hover:bg-beige-600"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats?.statistics?.totalBookings || 0,
      icon: '📅',
      gradient: 'from-primary to-primary-dark'
    },
    {
      title: 'Total Revenue',
      value: `₱${stats?.statistics?.totalRevenue?.toLocaleString() || 0}`,
      icon: '💰',
      gradient: 'from-primary to-primary-dark'
    },
    {
      title: 'Average Rating',
      value: (stats?.statistics?.averageRating || 0).toFixed(1),
      icon: '⭐',
      gradient: 'from-primary-light to-primary'
    },
    {
      title: 'Total Reviews',
      value: stats?.statistics?.totalReviews || 0,
      icon: '💬',
      gradient: 'from-primary to-primary-dark'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-beige-500 to-beige-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
              🏢
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Business Owner Dashboard</h1>
              <p className="text-beige-300">{profile.businessInfo?.businessName || 'Your Business'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm p-6"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-2xl mb-3`}>
                {stat.icon}
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/owner/places"
            className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">📍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">My Places</h3>
            <p className="text-gray-600 text-sm mb-3">Manage your tourist destinations</p>
            <div className="text-beige-500 font-semibold">
              {stats?.totalPlaces || 0} Places →
            </div>
          </Link>

          <Link
            to="/owner/bookings"
            className="bg-white rounded-2xl shadow-sm p-6 hover:shadow-md transition-all"
          >
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Bookings</h3>
            <p className="text-gray-600 text-sm mb-3">View and manage bookings</p>
            <div className="text-beige-500 font-semibold">
              View All →
            </div>
          </Link>
        </div>

        {/* Profile Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Business Information</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Business Name</p>
                <p className="font-semibold text-gray-900">{profile.businessInfo?.businessName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Business Type</p>
                <p className="font-semibold text-gray-900">{profile.businessInfo?.businessType || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-semibold text-gray-900">{profile.businessInfo?.address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold text-gray-900">{profile.businessInfo?.phone || 'N/A'}</p>
              </div>
            </div>
            <Link
              to="/owner/profile"
              className="mt-4 block text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Edit Profile
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-beige-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Verification Status</span>
                <span className="px-3 py-1 bg-beige-300 text-green-800 rounded-full text-sm font-semibold">
                  ✓ Verified
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Account Status</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold capitalize">
                  {profile.status || 'Active'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Member Since</span>
                <span className="font-semibold text-gray-900">
                  {new Date(profile.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reviews Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Recent Reviews</h3>
            <span className="text-sm text-gray-500">{recentReviews.length} reviews</span>
          </div>

          {recentReviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <span className="text-4xl block mb-3">💬</span>
              <p className="text-gray-600 mb-1">No reviews yet</p>
              <p className="text-sm text-gray-500">Reviews from your places will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {recentReviews.slice(0, 5).map((review) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    {/* User Avatar */}
                    {review.user?.avatar ? (
                      <img
                        src={review.user.avatar}
                        alt={review.user?.name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                        {(review.user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900">
                          {review.user?.name || 'Anonymous'}
                        </p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`text-sm ${star <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}
                            >
                              ⭐
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {review.place?.name || 'Unknown Place'}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm line-clamp-2">{review.comment}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




