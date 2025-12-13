import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import useDashboardCache from '../../store/dashboardCache'

export default function DriverDashboard() {
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAvailable, setIsAvailable] = useState(false)

  // Use dashboard cache
  const { getDriverData, setDriverData } = useDashboardCache()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Check cache first
    const cachedData = getDriverData()
    if (cachedData?.profile) {
      console.log('📦 Using cached driver dashboard data')
      setProfile(cachedData.profile)
      setStats(cachedData.stats)
      setIsAvailable(cachedData.profile?.availability?.isAvailable || false)
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled([
        api.get('/drivers/profile'),
        api.get('/drivers/statistics')
      ])

      let fetchedProfile = null
      let fetchedStats = null

      // Extract data safely
      if (results[0].status === 'fulfilled') {
        fetchedProfile = results[0].value.data.data
        setProfile(fetchedProfile)
        setIsAvailable(fetchedProfile?.availability?.isAvailable || false)
      }

      if (results[1].status === 'fulfilled') {
        fetchedStats = results[1].value.data.data
        setStats(fetchedStats)
      }

      // Cache the data if we got profile
      if (fetchedProfile) {
        setDriverData(fetchedProfile, fetchedStats)
      }

      // Show error only if both failed
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        console.error('Failed to fetch driver data')
        toast.error('Failed to load dashboard data')
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async () => {
    try {
      await api.put('/drivers/availability', { isAvailable: !isAvailable })
      setIsAvailable(!isAvailable)
      toast.success(isAvailable ? 'You are now offline' : 'You are now online and available!')
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  const updateLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put('/drivers/location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
          toast.success('Location updated!')
        } catch (error) {
          toast.error('Failed to update location')
        }
      },
      () => {
        toast.error('Failed to get location')
      }
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Driver Profile Not Found</h2>
          <p className="text-gray-600 mb-6">You may need to apply for driver status</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Trips',
      value: stats?.totalTrips || 0,
      icon: '🚗',
      gradient: 'from-primary to-primary-dark'
    },
    {
      title: 'Completed Trips',
      value: stats?.completedTrips || 0,
      icon: '✓',
      gradient: 'from-primary to-primary-dark'
    },
    {
      title: 'Total Earnings',
      value: `₱${stats?.totalEarnings?.toLocaleString() || 0}`,
      icon: '💰',
      gradient: 'from-primary-light to-primary'
    },
    {
      title: 'Rating',
      value: (profile.rating?.average || 0).toFixed(1),
      icon: '⭐',
      gradient: 'from-primary to-primary-dark'
    }
  ]

  const getVehicleIcon = (type) => {
    const icons = {
      car: '🚗',
      van: '🚐',
      motorcycle: '🏍️',
      tricycle: '🛺',
      jeepney: '🚙',
      bus: '🚌'
    }
    return icons[type] || '🚗'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.vehicle?.plateNumber || 'Driver'}!</p>
        </div>

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

        {/* Vehicle Info & Availability */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              {getVehicleIcon(profile.vehicle?.type)} Vehicle Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{profile.vehicle?.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plate Number</p>
                  <p className="font-semibold text-gray-900">{profile.vehicle?.plateNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Make & Model</p>
                  <p className="font-semibold text-gray-900">{profile.vehicle?.make} {profile.vehicle?.model}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="font-semibold text-gray-900">{profile.vehicle?.capacity} passengers</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">💰 Pricing</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Base Rate</span>
                <span className="font-bold text-gray-900">₱{profile.pricing?.baseRate || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Per Kilometer</span>
                <span className="font-bold text-gray-900">₱{profile.pricing?.perKilometer || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Per Minute</span>
                <span className="font-bold text-gray-900">₱{profile.pricing?.perMinute || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={updateLocation}
            className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-2 border-gray-200 hover:border-primary"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-bold text-gray-900">Update Location</h3>
                <p className="text-sm text-gray-600">Refresh your GPS position</p>
              </div>
            </div>
          </button>

          <Link
            to="/driver/requests"
            className="bg-primary text-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="font-bold">Transport Requests</h3>
                <p className="text-sm text-beige-300">View pending rides</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}




