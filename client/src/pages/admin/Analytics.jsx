import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import api from '../../services/api'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.get('/analytics/dashboard')
      if (response.data.success) {
        setAnalytics(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      console.error('Error details:', error.response?.data)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const { overview, recentBookings, recentReviews, charts } = analytics

  // Chart data - using real data from API
  const visitorsData = {
    labels: charts?.weeklyVisitors?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Visitors',
        data: charts?.weeklyVisitors?.data || [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const bookingsData = {
    labels: charts?.monthlyBookings?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Bookings',
        data: charts?.monthlyBookings?.data || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Revenue (₱1000s)',
        data: charts?.monthlyRevenue?.data || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
      }
    ]
  }

  // Category colors for dynamic data
  const categoryColors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(99, 102, 241, 0.8)',
  ]

  const categoryData = {
    labels: charts?.categoryDistribution?.labels || ['No Data'],
    datasets: [
      {
        data: charts?.categoryDistribution?.data || [1],
        backgroundColor: categoryColors.slice(0, charts?.categoryDistribution?.labels?.length || 1),
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  }

  const stats = [
    {
      label: 'Total Users',
      value: overview.totalUsers || 0,
      subtitle: `👤 ${overview.usersByRole?.tourists || 0} Tourists • 🏢 ${overview.usersByRole?.owners || 0} Owners • 🚗 ${overview.usersByRole?.drivers || 0} Drivers`,
      icon: '👥',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Places',
      value: overview.totalPlaces || 0,
      subtitle: 'Active destinations',
      icon: '📍',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Bookings',
      value: overview.totalBookings || 0,
      subtitle: 'All time bookings',
      icon: '📅',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Visitors',
      value: (overview.totalVisitors || 0).toLocaleString(),
      subtitle: 'Place visitors',
      icon: '🎯',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Avg Rating',
      value: (overview.avgRating || 0).toFixed(1),
      subtitle: 'Out of 5 stars',
      icon: '⭐',
      color: 'from-primary-light to-primary'
    },
    {
      label: 'Total Revenue',
      value: `₱${(overview.totalRevenue || 0).toLocaleString()}`,
      subtitle: 'Estimated earnings',
      icon: '💰',
      color: 'from-primary to-primary-dark'
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Analytics & Reports
          </h2>
          <p className="text-gray-600 mt-1">Track your platform performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
          >
            <div className={`p-6 bg-gradient-to-br ${stat.color}`}>
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <p className="text-sm opacity-90 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-75">{stat.subtitle}</span>
                  </div>
                </div>
                <div className="text-5xl opacity-20">{stat.icon}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Visitors Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📈</span>
            Visitor Trends
          </h3>
          <div className="h-80">
            <Line data={visitorsData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Bookings & Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💼</span>
            Bookings & Revenue
          </h3>
          <div className="h-80">
            <Bar data={bookingsData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎨</span>
            Category Distribution
          </h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={categoryData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚡</span>
            Recent Activity
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {recentBookings && recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-beige-400 rounded-full flex items-center justify-center text-white font-bold">
                    {booking.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {booking.user?.name || 'User'} booked {booking.place?.name || 'a place'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent bookings</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-md"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💬</span>
          Recent Reviews
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {recentReviews && recentReviews.length > 0 ? (
            recentReviews.map((review, index) => (
              <div key={index} className="p-4 border-2 border-gray-100 rounded-xl hover:border-beige-400 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="font-bold">{review.rating || 5}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{review.place?.name || 'Place'}</p>
                <p className="text-sm text-gray-700 line-clamp-2">{review.comment || 'No comment'}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8 col-span-2">No recent reviews</p>
          )}
        </div>
      </motion.div>

      {/* Export Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-br from-beige-50 to-beige-50 p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Export Reports</h3>
            <p className="text-gray-600">Download analytics data in various formats</p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
              Export PDF
            </button>
            <button className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
              Export CSV
            </button>
            <button className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Generate Report
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}




