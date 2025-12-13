import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import useDataCache from '../../store/dataCache'
import useDashboardCache from '../../store/dashboardCache'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalPlaces: 0,
    totalUsers: 0,
    totalVisits: 0,
    totalReviews: 0,
    totalDrivers: 0,
    totalOwners: 0,
    pendingOwners: 0,
    pendingDrivers: 0,
    totalAboutItems: 0,
    upcomingEvents: 0,
    achievements: 0,
    recentActivities: [],
    popularPlaces: [],
    categoryDistribution: {},
    visitorTrend: []
  })
  const [loading, setLoading] = useState(true)
  const [weather, setWeather] = useState(null)

  // Use cache for places and about items
  const { getPlaces, getAboutItems, setPlaces: setCachedPlaces, setAboutItems: setCachedAbout } = useDataCache()

  // Use dashboard cache for full stats
  const { getAdminStats, setAdminStats } = useDashboardCache()

  useEffect(() => {
    fetchDashboardData()
    fetchWeather()
  }, [])

  const fetchDashboardData = async () => {
    // Check dashboard cache first
    const cachedStats = getAdminStats()
    if (cachedStats) {
      console.log('📦 Using cached admin dashboard data')
      setStats(cachedStats)
      setLoading(false)
      return
    }

    try {
      // Check cache first for places and about items
      const cachedPlaces = getPlaces()
      const cachedAbout = getAboutItems()

      // Fetch all data with proper error handling
      const results = await Promise.allSettled([
        cachedPlaces ? Promise.resolve({ data: { data: cachedPlaces } }) : api.get('/places'),
        api.get('/users').catch(() => ({ data: { data: [] } })),
        api.get('/drivers').catch(() => ({ data: { data: [] } })),
        api.get('/owners').catch(() => ({ data: { data: [] } })),
        api.get('/reviews').catch(() => ({ data: { data: [] } })),
        cachedAbout ? Promise.resolve({ data: { data: cachedAbout } }) : api.get('/about')
      ])

      // Extract data safely from results
      const places = results[0].status === 'fulfilled' ? (results[0].value.data.data || []) : []
      const users = results[1].status === 'fulfilled' ? (results[1].value.data.data || []) : []
      const drivers = results[2].status === 'fulfilled' ? (results[2].value.data.data || []) : []
      const owners = results[3].status === 'fulfilled' ? (results[3].value.data.data || []) : []
      const reviews = results[4].status === 'fulfilled' ? (results[4].value.data.data || []) : []
      const aboutItems = results[5].status === 'fulfilled' ? (results[5].value.data.data || []) : []

      // Cache the fetched data
      if (!cachedPlaces && places.length > 0) setCachedPlaces(places)
      if (!cachedAbout && aboutItems.length > 0) setCachedAbout(aboutItems)

      // Count events and achievements
      const upcomingEvents = aboutItems.filter(item => {
        if (item.category !== 'events') return false
        if (!item.event_date?.start) return true
        return new Date(item.event_date.start) >= new Date()
      }).length
      const achievements = aboutItems.filter(item => item.category === 'achievements').length

      // Calculate stats
      const totalVisits = places.reduce((sum, place) => sum + (place.visitors?.total || 0), 0)
      const totalReviews = reviews.length

      // Get popular places
      const popularPlaces = places
        .sort((a, b) => (b.visitors?.total || 0) - (a.visitors?.total || 0))
        .slice(0, 5)

      // Category distribution
      const categoryDist = places.reduce((acc, place) => {
        const category = place.category || 'Other'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})

      // Pending applications
      const pendingOwners = owners.filter(o => o.status === 'pending').length
      const pendingDrivers = drivers.filter(d => d.status === 'pending').length

      // Recent activities - mix of places, reviews, and registrations
      const recentActivities = [
        ...places.slice(0, 2).map(place => ({
          type: 'place',
          name: `New place: ${place.name}`,
          date: place.createdAt,
          icon: '📍'
        })),
        ...reviews.slice(0, 2).map(review => ({
          type: 'review',
          name: `Review on ${review.place?.name || 'a place'}`,
          date: review.createdAt,
          icon: '⭐'
        })),
        ...users.slice(0, 1).map(user => ({
          type: 'user',
          name: `New user: ${user.name || user.email}`,
          date: user.createdAt,
          icon: '👤'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

      const newStats = {
        totalPlaces: places.length,
        totalUsers: users.length,
        totalVisits,
        totalReviews,
        totalDrivers: drivers.length,
        totalOwners: owners.length,
        pendingOwners,
        pendingDrivers,
        totalAboutItems: aboutItems.length,
        upcomingEvents,
        achievements,
        popularPlaces,
        categoryDistribution: categoryDist,
        recentActivities
      }

      // Cache the computed stats
      setAdminStats(newStats)
      setStats(newStats)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const fetchWeather = async () => {
    try {
      const response = await api.get('/external/weather', {
        params: { lat: 8.9600, lon: 125.4300 }
      })
      if (response.data.success) {
        setWeather(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error)
    }
  }

  const statCards = [
    {
      title: 'Total Places',
      value: stats.totalPlaces,
      icon: '📍',
      gradient: 'from-primary to-primary-dark',
      change: '+12%'
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      gradient: 'from-primary to-primary-dark',
      change: '+18%'
    },
    {
      title: 'Total Visits',
      value: stats.totalVisits.toLocaleString(),
      icon: '👁️',
      gradient: 'from-primary to-primary-dark',
      change: '+25%'
    },
    {
      title: 'Total Reviews',
      value: stats.totalReviews,
      icon: '⭐',
      gradient: 'from-primary to-primary-dark',
      change: '+8%'
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: '📅',
      gradient: 'from-blue-500 to-blue-600',
      change: 'New'
    },
    {
      title: 'Achievements',
      value: stats.achievements,
      icon: '🏆',
      gradient: 'from-amber-500 to-amber-600',
      change: 'New'
    }
  ]

  // Chart data
  const visitorChartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Visitors',
        data: [120, 190, 170, 210, 300, 450, 380],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  }

  const categoryChartData = {
    labels: Object.keys(stats.categoryDistribution),
    datasets: [
      {
        data: Object.values(stats.categoryDistribution),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)'
        ],
        borderWidth: 0
      }
    ]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with Lakbayan sa Kitcharao today.</p>
      </div>

      {/* Weather Banner */}
      {weather && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl p-6 text-white mb-6 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-6xl">
                {weather.main === 'Clear' ? '☀️' : weather.main === 'Rain' ? '🌧️' : '⛅'}
              </div>
              <div>
                <h3 className="text-2xl font-bold">{weather.temperature}°C</h3>
                <p className="text-sm opacity-90">Kitcharao • {weather.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-90">Humidity: {weather.humidity}%</p>
              <p className="text-sm opacity-90">Wind: {weather.windSpeed} m/s</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-full -mr-16 -mt-16`}></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">{stat.icon}</div>
                <span className="px-2 py-1 bg-beige-300 text-beige-600 rounded-full text-xs font-semibold">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-sm mb-1">{stat.title}</h3>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Visitor Trend */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Visitor Trends</h3>
          <Line data={visitorChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Places by Category</h3>
          <Doughnut data={categoryChartData} options={{ responsive: true, maintainAspectRatio: true }} />
        </div>
      </div>

      {/* Popular Places & Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular Places */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Popular Places</h3>
            <Link to="/admin/places" className="text-beige-500 hover:text-beige-600 font-semibold text-sm">
              View All →
            </Link>
          </div>
          <div className="space-y-3">
            {stats.popularPlaces.map((place, index) => (
              <div key={place.id || place._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{place.name}</h4>
                  <p className="text-sm text-gray-500">{place.visitors?.total || 0} visits</p>
                </div>
                <div className="text-yellow-500 flex items-center gap-1">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm font-semibold">{place.rating?.average || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white text-lg">
                    {activity.icon || '📍'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{activity.name}</h4>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No recent activities</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/admin/places"
          className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">📍</div>
          <h4 className="font-bold text-lg">Manage Places</h4>
          <p className="text-sm opacity-90">Add or edit tourist spots</p>
        </Link>
        <Link
          to="/admin/users"
          className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">👥</div>
          <h4 className="font-bold text-lg">Manage Users</h4>
          <p className="text-sm opacity-90">View and manage users</p>
        </Link>
        <Link
          to="/admin/analytics"
          className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">📊</div>
          <h4 className="font-bold text-lg">Analytics</h4>
          <p className="text-sm opacity-90">View detailed reports</p>
        </Link>
        <Link
          to="/admin/owners"
          className="p-6 bg-gradient-to-br from-yellow-500 to-beige-500 rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">🏢</div>
          <h4 className="font-bold text-lg">Business Owners</h4>
          <p className="text-sm opacity-90">Approve owner applications</p>
        </Link>
        <Link
          to="/admin/drivers"
          className="p-6 bg-gradient-to-br from-primary to-primary-dark rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">🚗</div>
          <h4 className="font-bold text-lg">Drivers</h4>
          <p className="text-sm opacity-90">Approve driver applications</p>
        </Link>
        <Link
          to="/admin/about"
          className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl text-white hover:shadow-xl transition-all"
        >
          <div className="text-3xl mb-2">🏛️</div>
          <h4 className="font-bold text-lg">About Kitcharao</h4>
          <p className="text-sm opacity-90">Events, achievements & heritage</p>
        </Link>
      </div>
    </div>
  )
}



