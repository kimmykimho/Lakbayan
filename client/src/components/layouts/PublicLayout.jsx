import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../../store/authStore'
import logo from '../../assets/logo.png'
import Chatbot from '../Chatbot'

export default function PublicLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAuthenticated, logout } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [applyDropdownOpen, setApplyDropdownOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const applyDropdownRef = useRef(null)
  const profileDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (applyDropdownRef.current && !applyDropdownRef.current.contains(event.target)) {
        setApplyDropdownOpen(false)
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setShowLogoutModal(false)
    setProfileDropdownOpen(false)
    setMobileMenuOpen(false)
    await logout()
    navigate('/')
  }

  const confirmLogout = () => {
    setShowLogoutModal(true)
  }

  // Get dashboard path based on user role
  const getDashboardPath = () => {
    if (!isAuthenticated || !user) return null

    switch (user.role) {
      case 'admin':
        return '/admin'
      case 'business_owner':
        return '/owner'
      case 'driver':
        return '/driver'
      default:
        return null
    }
  }

  const navigation = [
    { name: 'Home', path: '/', icon: '🏠' },
    { name: 'About', path: '/about', icon: '🏛️' },
    { name: 'Places', path: '/places', icon: '📍' },
    { name: 'Maps', path: '/maps', icon: '🗺️' },
    { name: 'Transport', path: '/transport', icon: '🚗' }
  ]

  // Remove Favorites and Bookings from main nav - they're now in profile dropdown
  const authenticatedNavigation = []

  // Dashboard is now in profile dropdown, not main nav
  const dashboardPath = getDashboardPath()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-white/95">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center group flex-shrink-0 mr-4">
              <img
                src={logo}
                alt="Lakbayan Logo"
                className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto transition-transform group-hover:scale-105"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-0.5 lg:space-x-1 flex-1 justify-center max-w-3xl lg:max-w-4xl mx-2 overflow-x-auto scrollbar-hide">
              {navigation.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.name}
                  className={`px-2 lg:px-3 py-2 rounded-lg font-medium transition-all flex items-center gap-1 lg:gap-1.5 whitespace-nowrap text-sm flex-shrink-0 ${isActive(item.path)
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-base lg:text-lg flex-shrink-0">{item.icon}</span>
                  <span className="hidden lg:inline text-sm">{item.name}</span>
                </Link>
              ))}
            </div>


            {/* User Menu / Auth Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 flex-shrink-0">
              {isAuthenticated ? (
                <>
                  {/* Profile Dropdown */}
                  <div className="relative" ref={profileDropdownRef}>
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full text-white font-semibold text-sm lg:text-base hover:shadow-lg transition-all"
                      title={user?.name}
                    >
                      {user?.name?.charAt(0).toUpperCase()}
                    </button>

                    <AnimatePresence>
                      {profileDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
                        >
                          {/* User Info Header */}
                          <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white">
                            <p className="font-semibold truncate">{user?.name}</p>
                            <p className="text-sm opacity-80 truncate">{user?.email}</p>
                          </div>

                          <div className="p-2">
                            <Link
                              to="/profile"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                            >
                              <span className="text-lg">👤</span>
                              <span className="font-medium">Profile</span>
                            </Link>

                            {dashboardPath && (
                              <Link
                                to={dashboardPath}
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                              >
                                <span className="text-lg">📊</span>
                                <span className="font-medium">Dashboard</span>
                              </Link>
                            )}

                            <div className="border-t my-2"></div>

                            <Link
                              to="/favorites"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                            >
                              <span className="text-lg">❤️</span>
                              <span className="font-medium">My Favorites</span>
                            </Link>

                            <Link
                              to="/my-bookings"
                              onClick={() => setProfileDropdownOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
                            >
                              <span className="text-lg">📅</span>
                              <span className="font-medium">My Bookings</span>
                            </Link>

                            <div className="border-t my-2"></div>

                            {/* Apply in Lakbayan - Only for tourists */}
                            {user?.role === 'tourist' && (
                              <Link
                                to="/apply"
                                onClick={() => setProfileDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 transition-all group"
                              >
                                <span className="text-lg group-hover:scale-110 transition-transform">🚀</span>
                                <div>
                                  <span className="font-medium">Apply in Lakbayan</span>
                                  <p className="text-xs text-gray-400 group-hover:text-amber-600">Become a partner</p>
                                </div>
                              </Link>
                            )}

                            <button
                              onClick={confirmLogout}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all"
                            >
                              <span className="text-lg">🚪</span>
                              <span className="font-medium">Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-2 lg:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-all text-sm lg:text-base whitespace-nowrap"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="px-2 lg:px-3 xl:px-4 py-2 bg-primary text-white rounded-lg font-medium shadow-sm hover:shadow-md transition-all text-sm lg:text-base whitespace-nowrap"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden overflow-hidden border-t"
              >
                <div className="py-3 space-y-1 max-h-[70vh] overflow-y-auto">
                  {navigation.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition-all ${isActive(item.path)
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <span className="text-xl">{item.icon}</span>
                      <span>{item.name}</span>
                    </Link>
                  ))}
                  <div className="border-t pt-2 mt-2 space-y-1">
                    {isAuthenticated ? (
                      <>
                        <Link
                          to="/profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-all"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                            {user?.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{user?.name}</span>
                        </Link>

                        {/* Dashboard - Show for non-tourist roles */}
                        {dashboardPath && (
                          <Link
                            to={dashboardPath}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-all"
                          >
                            <span className="text-xl">📊</span>
                            <span>Dashboard</span>
                          </Link>
                        )}

                        {/* Favorites */}
                        <Link
                          to="/favorites"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-all"
                        >
                          <span className="text-xl">❤️</span>
                          <span>My Favorites</span>
                        </Link>

                        {/* Bookings */}
                        <Link
                          to="/my-bookings"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-all"
                        >
                          <span className="text-xl">📅</span>
                          <span>My Bookings</span>
                        </Link>

                        {/* Apply in Lakbayan - Only show for tourists */}
                        {user?.role === 'tourist' && (
                          <Link
                            to="/apply"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 font-medium transition-all"
                          >
                            <span className="text-xl">🚀</span>
                            <span>Apply in Lakbayan</span>
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setMobileMenuOpen(false)
                            confirmLogout()
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-all"
                        >
                          <span className="text-xl">🚪</span>
                          <span>Logout</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-all"
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-4 py-2.5 bg-primary text-white rounded-lg font-medium text-center transition-all"
                        >
                          Sign Up
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <img
                  src={logo}
                  alt="Lakbayan sa Kitcharao Logo"
                  className="h-16 sm:h-20 md:h-24 lg:h-28 xl:h-32 w-auto mb-3"
                />
              </div>
              <p className="text-gray-400 text-sm">
                Your comprehensive guide to exploring the beautiful town of Kitcharao, Agusan del Sur.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Explore</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link to="/places" className="hover:text-white transition-colors">Popular Places</Link></li>
                <li><Link to="/maps" className="hover:text-white transition-colors">Interactive Maps</Link></li>
                <li><Link to="/transport" className="hover:text-white transition-colors">Transportation</Link></li>
                <li><Link to="/events" className="hover:text-white transition-colors">Events</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Safety Tips</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-lg">Contact</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li className="flex items-start gap-2">
                  <span>📍</span>
                  <span>Tourism Office<br />Kitcharao, Agusan del Sur<br />Philippines</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📧</span>
                  <span>tourism@Kitcharao.gov.ph</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {new Date().getFullYear()} Lakbayan sa Kitcharao Tourism Platform. All rights reserved.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                  <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chat/Help Button - Removing this as we have Chatbot now */}

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowLogoutModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚪</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Logout</h3>
                <p className="text-gray-600 mb-6">Are you sure you want to logout from your account?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kitcharao Chatbot - Only show for logged in users */}
      {isAuthenticated && <Chatbot />}
    </div>
  )
}



