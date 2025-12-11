import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import toast from 'react-hot-toast'
import logo from '../../assets/logo.png'

export default function DriverLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [profile, setProfile] = useState(null)
  const [isAvailable, setIsAvailable] = useState(false)
  const [stats, setStats] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fetch driver profile
  useEffect(() => {
    fetchProfile()
    fetchStats()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/drivers/profile')
      setProfile(response.data.data)
      setIsAvailable(response.data.data?.availability?.isAvailable || false)
    } catch (error) {
      console.error('Failed to fetch driver profile:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/drivers/statistics')
      setStats(response.data.data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const toggleAvailability = async () => {
    try {
      await api.put('/drivers/availability', { isAvailable: !isAvailable })
      setIsAvailable(!isAvailable)
      toast.success(isAvailable ? 'You are now offline' : 'You are now online!')
    } catch (error) {
      toast.error('Failed to update availability')
    }
  }

  const handleBackToWebsite = () => {
    navigate('/')
  }

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

  const navItems = [
    {
      name: 'Dashboard',
      path: '/driver',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      name: 'Transport Requests',
      path: '/driver/requests',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      name: 'Trip History',
      path: '/driver/history',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      name: 'Profile',
      path: '/profile',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay for mobile */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isMobile ? (sidebarOpen ? 0 : '-100%') : 0
        }}
        className="fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 lg:z-10 flex flex-col overflow-y-auto"
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b bg-gradient-to-r from-beige-50 to-beige-100">
          <Link to="/" className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Lakbayan sa Kitcharao" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Driver Panel</h1>
              <p className="text-xs text-gray-500">Manage your rides</p>
            </div>
          </Link>

          {/* Availability Toggle */}
          <button
            onClick={toggleAvailability}
            className={`w-full mt-4 px-4 py-3 rounded-xl font-bold text-white transition-all ${
              isAvailable
                ? 'bg-primary shadow-lg'
                : 'bg-gray-400 hover:bg-gray-500'
            }`}
          >
            {isAvailable ? '🟢 Online' : '⚫ Offline'}
          </button>
        </div>

        {/* Driver Info */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold text-2xl">
              {getVehicleIcon(profile?.vehicle?.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{user?.name || 'Driver'}</p>
              <p className="text-sm text-gray-600 truncate">{user?.email}</p>
            </div>
          </div>

          {/* Vehicle Info */}
          {profile?.vehicle && (
            <div className="bg-gradient-to-r from-beige-50 to-beige-100 rounded-xl p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Vehicle</span>
                <span className="text-sm font-bold text-gray-900 capitalize">{profile.vehicle.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Plate</span>
                <span className="text-sm font-bold text-primary">{profile.vehicle.plateNumber}</span>
              </div>
              {profile.vehicle.make && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Make/Model</span>
                  <span className="text-sm font-semibold text-gray-700">{profile.vehicle.make} {profile.vehicle.model}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Capacity</span>
                <span className="text-sm font-semibold text-gray-700">{profile.vehicle.capacity} passengers</span>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {stats && (
          <div className="p-4 border-b">
            <h3 className="text-sm font-bold text-gray-900 mb-3">📊 Statistics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-beige-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-beige-500">{stats.totalTrips || 0}</div>
                <div className="text-xs text-gray-600">Total Trips</div>
              </div>
              <div className="bg-beige-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">{stats.completedTrips || 0}</div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center col-span-2">
                <div className="text-2xl font-bold text-yellow-600">₱{(stats.totalEarnings || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Total Earnings</div>
              </div>
            </div>

            {/* Rating */}
            {profile?.rating && (
              <div className="mt-3 bg-purple-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <span className="text-2xl font-bold text-purple-600">
                    {profile.rating.average?.toFixed(1) || '0.0'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  {profile.rating.count || 0} ratings
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => isMobile && setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Pricing Info */}
        {profile?.pricing && (
          <div className="p-4 border-t">
            <h3 className="text-sm font-bold text-gray-900 mb-2">💰 Your Rates</h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Rate:</span>
                <span className="font-bold text-gray-900">₱{profile.pricing.baseRate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Kilometer:</span>
                <span className="font-bold text-gray-900">₱{profile.pricing.perKilometer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Minute:</span>
                <span className="font-bold text-gray-900">₱{profile.pricing.perMinute}</span>
              </div>
            </div>
          </div>
        )}

        {/* Back to Website Button */}
        <div className="p-4 border-t">
          <button
            onClick={handleBackToWebsite}
            className="w-full flex items-center gap-3 px-4 py-3 text-primary hover:bg-beige-50 rounded-xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Website</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-80">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Lakbayan sa Kitcharao" className="h-8" />
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
              isAvailable ? 'bg-beige-400 text-white' : 'bg-gray-400 text-white'
            }`}>
              {isAvailable ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page Content */}
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}




