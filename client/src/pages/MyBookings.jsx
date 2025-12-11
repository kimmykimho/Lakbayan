import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import PhotoGallery from '../components/PhotoGallery'

export default function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [transportRequests, setTransportRequests] = useState({})

  useEffect(() => {
    fetchBookings()
    fetchTransportRequests()

    // Poll for transport updates every 15 seconds
    const interval = setInterval(fetchTransportRequests, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await api.get('/bookings')
      setBookings(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load bookings')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransportRequests = async () => {
    try {
      const response = await api.get('/transport-requests')
      const requests = response.data.data || []

      // Map transport requests by booking ID for easy lookup
      const requestsMap = {}
      requests.forEach(request => {
        const bookingId = request.booking_id || request.booking?.id || request.booking?._id
        if (bookingId) {
          requestsMap[bookingId] = request
        }
      })

      setTransportRequests(requestsMap)
    } catch (error) {
      console.error('Failed to load transport requests:', error)
    }
  }

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      const reason = window.prompt('Reason for cancellation (optional):') || 'Cancelled by visitor'
      await api.put(`/bookings/${bookingId}/cancel`, { reason })
      toast.success('Booking cancelled successfully!')
      fetchBookings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-beige-300 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      confirmed: '✓',
      cancelled: '✗',
      completed: '✓'
    }
    return icons[status] || '📅'
  }

  const filteredBookings = bookings.filter(booking =>
    filter === 'all' || booking.status === filter
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-beige-300">View and manage your visit bookings</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${filter === status
                ? 'bg-beige-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
                }`}
            >
              {status}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${filter === status ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                {bookings.filter(b => status === 'all' || b.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {filter !== 'all'
                ? `You don't have any ${filter} bookings.`
                : "You haven't made any bookings yet."}
            </p>
            {filter === 'all' && (
              <Link
                to="/places"
                className="inline-block px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Browse Places
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <motion.div
                key={booking.id || booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    {booking.place?.images && booking.place.images[0] && (
                      <img
                        src={booking.place.images[0]}
                        alt={booking.place.name}
                        className="w-24 h-24 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/200x200?text=No+Image'
                        }}
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {booking.place?.name || 'Unknown Place'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        Confirmation Code: <span className="font-mono font-semibold text-gray-900">{booking.confirmationCode}</span>
                      </p>
                      <Link
                        to={`/places/${booking.place?.id || booking.place?._id}`}
                        className="text-beige-500 hover:text-beige-600 text-sm font-medium"
                      >
                        View Place Details →
                      </Link>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 ${getStatusColor(booking.status)}`}>
                    <span>{getStatusIcon(booking.status)}</span>
                    {booking.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Visit Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.visitDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Visit Time</p>
                    <p className="font-semibold text-gray-900">{booking.visitTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Number of Visitors</p>
                    <p className="font-semibold text-gray-900">{booking.numberOfVisitors} {booking.numberOfVisitors === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>

                {booking.transport && booking.transport.vehicleType && booking.transport.vehicleType !== 'none' && (
                  <div className="mb-4 p-3 bg-beige-50 border border-beige-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700 mb-1">🚗 Transportation:</p>
                        {booking.transport.vehicleType === 'own_vehicle' ? (
                          <p className="text-sm text-gray-900">Using own vehicle</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-900 capitalize">
                              Requested: {booking.transport.vehicleType}
                            </p>
                            {transportRequests[booking.id || booking._id] && (() => {
                              const tr = transportRequests[booking.id || booking._id];
                              return (
                                <div className="mt-2">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tr.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      tr.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                        tr.status === 'driver_enroute' ? 'bg-purple-100 text-purple-800' :
                                          tr.status === 'arrived' ? 'bg-indigo-100 text-indigo-800' :
                                            tr.status === 'in_progress' ? 'bg-beige-300 text-green-800' :
                                              tr.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                                                'bg-red-100 text-red-800'
                                      }`}>
                                      Status: {tr.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    {tr.driver && (
                                      <span className="text-xs text-gray-600">
                                        Driver: {tr.driver.user?.name || 'Assigned'}
                                      </span>
                                    )}
                                  </div>
                                  {['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(tr.status) && (
                                    <Link
                                      to={`/track-transport/${tr.id || tr._id}`}
                                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary-dark text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Track Transport Live
                                    </Link>
                                  )}
                                </div>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Transport Photos - Show when completed */}
                {(() => {
                  const tr = transportRequests[booking.id || booking._id];
                  return tr?.status === 'completed' && tr?.photos && tr.photos.length > 0 && (
                    <div className="mb-4 p-4 bg-beige-50 border border-beige-300 rounded-lg">
                      <PhotoGallery
                        photos={tr.photos}
                        title="📸 Trip Photos - Arrival at Destination"
                      />
                    </div>
                  );
                })()}

                {booking.specialRequests && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Special Requests:</p>
                    <p className="text-sm text-gray-900">{booking.specialRequests}</p>
                  </div>
                )}

                {booking.status === 'cancelled' && booking.cancelReason && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Cancelled:</span> {booking.cancelReason}
                    </p>
                    {booking.cancelledAt && (
                      <p className="text-xs text-red-600 mt-1">
                        {new Date(booking.cancelledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {booking.status === 'pending' && (
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⏳ Waiting for owner confirmation
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(booking.id || booking._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <div className="flex gap-3">
                    <div className="flex-1 p-3 bg-beige-50 border border-beige-400 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Booking confirmed! You can proceed with your visit.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(booking.id || booking._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {booking.status === 'completed' && (
                  <div className="p-3 bg-beige-50 border border-beige-300 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ✓ Visit completed successfully!
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



