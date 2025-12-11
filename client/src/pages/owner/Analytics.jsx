import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function OwnerAnalytics() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await api.get('/owners/statistics')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
      toast.error('Failed to load statistics')
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
        <p className="text-gray-600">Track your business performance</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-gradient-to-br ${card.gradient} rounded-2xl shadow-lg p-6 text-white`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{card.icon}</span>
              <div className="text-right">
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
            </div>
            <p className="text-white/90 font-medium">{card.title}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Business Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Places</span>
              <span className="font-semibold">{stats?.totalPlaces || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Businesses</span>
              <span className="font-semibold">{stats?.totalBusinesses || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-600">No recent activity to display</p>
        </div>
      </div>
    </div>
  )
}




