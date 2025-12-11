import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PhotoGallery from '../../components/PhotoGallery'

export default function OwnerBookings() {
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
      const response = await api.get('/bookings/owner')
      if (response.data.success) {
        setBookings(response.data.data || [])
      } else {
        toast.error(response.data.message || 'Failed to load bookings')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load bookings'
      toast.error(errorMessage)
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTransportRequests = async () => {
    try {
      // Fetch all transport requests
      const response = await api.get('/transport-requests/all')
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

  const handleConfirm = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/confirm`)
      toast.success('Booking confirmed successfully!')
      fetchBookings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm booking')
    }
  }

  const handleComplete = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/complete`)
      toast.success('Booking marked as completed!')
      fetchBookings()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete booking')
    }
  }

  const handleCancel = async (bookingId) => {
    try {
      const reason = window.prompt('Reason for cancellation (optional):') || 'Cancelled by owner'
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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Booking Management</h1>
          <p className="text-gray-600 mt-1">View and manage visitor bookings</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${filter === status
                ? 'bg-beige-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
            >
              {status}
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                {bookings.filter(b => status === 'all' || b.status === status).length}
              </span>
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600">No {filter !== 'all' ? filter : ''} bookings to display</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => (
              <motion.div
                key={booking.id || booking._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      {booking.place?.name || 'Unknown Place'}
                    </h3>
                    <p className="text-gray-600">
                      Booked by: {booking.user?.name || 'Unknown User'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Confirmation Code: <span className="font-mono font-semibold">{booking.confirmationCode}</span>
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-500">Visit Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.visitDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Visit Time</p>
                    <p className="font-semibold text-gray-900">{booking.visitTime}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Number of Visitors</p>
                    <p className="font-semibold text-gray-900">{booking.numberOfVisitors} people</p>
                  </div>
                </div>

                {booking.contactInfo && (
                  <div className="mb-4 p-4 bg-beige-50 rounded-lg">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Contact Information</p>
                    <div className="grid md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="font-semibold">{booking.contactInfo.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Phone: </span>
                        <span className="font-semibold">{booking.contactInfo.phone}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="font-semibold">{booking.contactInfo.email}</span>
                      </div>
                    </div>
                  </div>
                )}

                {booking.transport && booking.transport.vehicleType && booking.transport.vehicleType !== 'none' && (
                  <div className="mb-4 p-3 bg-beige-50 border border-beige-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-700 mb-1">🚗 Transportation:</p>
                        {booking.transport.vehicleType === 'own_vehicle' ? (
                          <p className="text-sm text-gray-900">Visitor has own vehicle</p>
                        ) : (
                          <>
                            <p className="text-sm text-gray-900 capitalize">
                              Transport requested: {booking.transport.vehicleType}
                            </p>
                            {transportRequests[booking.id || booking._id] && (() => {
                              const tr = transportRequests[booking.id || booking._id];
                              return (
                                <div className="mt-2">
                                  <div className="flex items-center gap-2 flex-wrap">
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
                                    {tr.driver?.vehicle && (
                                      <span className="text-xs text-gray-600 capitalize">
                                        Vehicle: {tr.driver.vehicle.type}
                                      </span>
                                    )}
                                  </div>
                                  {['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(tr.status) && (
                                    <Link
                                      to={`/owner/track-transport/${tr.id || tr._id}`}
                                      className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-primary-dark text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Track Driver Coming to Your Place
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
                    <div className="mb-4 p-4 bg-beige-50 border border-emerald-200 rounded-lg">
                      <PhotoGallery
                        photos={tr.photos}
                        title="📸 Visitor Arrival Photos"
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

                {booking.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleConfirm(booking.id || booking._id)}
                      className="flex-1 px-4 py-2 bg-beige-500 text-white rounded-lg font-semibold hover:bg-beige-600 transition-colors"
                    >
                      ✓ Confirm Booking
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id || booking._id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      ✗ Cancel Booking
                    </button>
                  </div>
                )}

                {booking.status === 'confirmed' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleComplete(booking.id || booking._id)}
                      className="flex-1 px-4 py-2 bg-primary-dark text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Mark as Completed
                    </button>
                    <button
                      onClick={() => handleCancel(booking.id || booking._id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {booking.status === 'cancelled' && booking.cancelReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
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
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




