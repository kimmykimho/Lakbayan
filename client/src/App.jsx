import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

// Public Pages
import Home from './pages/Home'
import Places from './pages/Places'
import PlaceDetails from './pages/PlaceDetails'
import Maps from './pages/Maps'
import About from './pages/About'
import AboutDetails from './pages/AboutDetails'
import Transport from './pages/Transport'
import TrackTransport from './pages/TrackTransport'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Register from './pages/Register'
import Favorites from './pages/Favorites'
import MyBookings from './pages/MyBookings'
import OAuthCallback from './pages/OAuthCallback'
import ApplyDriver from './pages/ApplyDriver'
import ApplyBusiness from './pages/ApplyBusiness'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminPlaces from './pages/admin/Places'
import AdminUsers from './pages/admin/Users'
import AdminBusinesses from './pages/admin/Businesses'
import AdminAnalytics from './pages/admin/Analytics'
import AdminOwners from './pages/admin/Owners'
import AdminDrivers from './pages/admin/Drivers'
import AdminAbout from './pages/admin/About'

// Owner Pages
import OwnerDashboard from './pages/owner/Dashboard'
import OwnerBookings from './pages/owner/Bookings'
import OwnerPlaces from './pages/owner/Places'
import OwnerBusinesses from './pages/owner/Businesses'
import OwnerAnalytics from './pages/owner/Analytics'
import OwnerTrackTransport from './pages/owner/TrackTransport'
import ArrivingTourists from './pages/owner/ArrivingTourists'

// Driver Pages
import DriverDashboard from './pages/driver/Dashboard'
import DriverTransportRequests from './pages/driver/TransportRequests'
import TripHistory from './pages/driver/TripHistory'

// Layouts
import PublicLayout from './components/layouts/PublicLayout'
import AdminLayout from './components/layouts/AdminLayout'
import OwnerLayout from './components/layouts/OwnerLayout'
import DriverLayout from './components/layouts/DriverLayout'

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, isAuthenticated } = useAuthStore()

  // Debug logging
  console.log('ProtectedRoute check:', {
    isAuthenticated,
    user: user,
    role: user?.role,
    adminOnly
  })

  if (!isAuthenticated || !user) {
    console.log('Redirecting to login: not authenticated or no user')
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    console.log('Redirecting to home: not admin', user?.role)
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  const { initAuth, handleOAuthCallback, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  // Initialize auth and check for OAuth callback
  useEffect(() => {
    initAuth()

    // Check if this is an OAuth callback (URL contains access_token hash)
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      console.log('OAuth callback detected, processing...')
      handleOAuthCallback().then(result => {
        if (result.success) {
          // Clear the hash from URL
          window.history.replaceState(null, '', window.location.pathname)
          window.location.reload() // Reload to reflect logged-in state
        } else {
          console.error('OAuth callback failed:', result.message)
        }
      })
    }
  }, [initAuth, handleOAuthCallback])

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/places" element={<Places />} />
        <Route path="/places/:id" element={<PlaceDetails />} />
        <Route path="/maps" element={<Maps />} />
        <Route path="/about" element={<About />} />
        <Route path="/about/:slug" element={<AboutDetails />} />
        <Route path="/transport" element={<Transport />} />
        <Route path="/track-transport/:requestId" element={<TrackTransport />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/apply/driver" element={<ApplyDriver />} />
        <Route path="/apply/business" element={<ApplyBusiness />} />

        {/* Protected Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute>
              <MyBookings />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="places" element={<AdminPlaces />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="businesses" element={<AdminBusinesses />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="owners" element={<AdminOwners />} />
        <Route path="drivers" element={<AdminDrivers />} />
        <Route path="about" element={<AdminAbout />} />
      </Route>

      {/* Owner Routes */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="places" element={<OwnerPlaces />} />
        <Route path="businesses" element={<OwnerBusinesses />} />
        <Route path="bookings" element={<OwnerBookings />} />
        <Route path="arriving-tourists" element={<ArrivingTourists />} />
        <Route path="track-transport/:requestId" element={<OwnerTrackTransport />} />
        <Route path="analytics" element={<OwnerAnalytics />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={
        <ProtectedRoute>
          <DriverLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DriverDashboard />} />
        <Route path="requests" element={<DriverTransportRequests />} />
        <Route path="history" element={<TripHistory />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="flex items-center justify-center min-h-screen"><h1 className="text-4xl font-bold">404 - Page Not Found</h1></div>} />
    </Routes>
  )
}

export default App




