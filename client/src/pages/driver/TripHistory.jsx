import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function TripHistory() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalEarnings: 0,
    completedTrips: 0,
    cancelledTrips: 0
  })

  useEffect(() => {
    fetchTripHistory()
  }, [])

  const fetchTripHistory = async () => {
    try {
      setLoading(true)
      const response = await api.get('/transport-requests/driver')
      const allRequests = response.data.data || []

      // Filter for completed and cancelled trips
      const historyTrips = allRequests.filter(req =>
        req.status === 'completed' || req.status === 'cancelled'
      )

      setTrips(historyTrips)

      // Calculate stats
      const completed = historyTrips.filter(t => t.status === 'completed')
      const cancelled = historyTrips.filter(t => t.status === 'cancelled')
      const totalEarnings = completed.reduce((sum, trip) => sum + (trip.fare?.final || trip.fare?.estimated || 0), 0)

      setStats({
        totalTrips: historyTrips.length,
        completedTrips: completed.length,
        cancelledTrips: cancelled.length,
        totalEarnings
      })
    } catch (error) {
      toast.error('Failed to load trip history')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTrips = trips.filter(trip => {
    if (filter === 'all') return true
    return trip.status === filter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trip History</h1>
        <p className="text-gray-600">View your completed and cancelled trips</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Trips</p>
              <p className="text-3xl font-bold">{stats.totalTrips}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-beige-300 text-sm mb-1">Completed</p>
              <p className="text-3xl font-bold">{stats.completedTrips}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm mb-1">Cancelled</p>
              <p className="text-3xl font-bold">{stats.cancelledTrips}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm mb-1">Total Earnings</p>
              <p className="text-3xl font-bold">₱{stats.totalEarnings.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all'
              ? 'bg-primary-dark text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
        >
          All ({trips.length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'completed'
              ? 'bg-beige-500 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
        >
          Completed ({stats.completedTrips})
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'cancelled'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
        >
          Cancelled ({stats.cancelledTrips})
        </button>
      </div>

      {/* Trips List */}
      {filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? "You haven't completed any trips yet."
              : `No ${filter} trips.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredTrips.map((trip, index) => (
            <motion.div
              key={trip._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {trip.destination?.placeName || 'Trip to Destination'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${trip.status === 'completed'
                        ? 'bg-beige-300 text-green-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      {trip.status === 'completed' ? '✓ Completed' : '✗ Cancelled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {trip.timeline?.completed
                      ? new Date(trip.timeline.completed).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                      : new Date(trip.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {trip.status === 'completed' && (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Earned</p>
                    <p className="text-2xl font-bold text-beige-500">
                      ₱{trip.fare?.final || trip.fare?.estimated || 0}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                {/* Passenger Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Passenger</p>
                  <p className="font-semibold text-gray-900">{trip.user?.name || 'Unknown'}</p>
                  {trip.user?.phone && (
                    <p className="text-sm text-gray-600">{trip.user.phone}</p>
                  )}
                </div>

                {/* Trip Details */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">Vehicle Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{trip.vehicleType}</p>
                  {trip.distance && (
                    <p className="text-sm text-gray-600">{Number(trip.distance || 0).toFixed(1)} km</p>
                  )}
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-beige-300 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-beige-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Pickup</p>
                    <p className="font-medium text-gray-900">{trip.pickup?.address || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Destination</p>
                    <p className="font-medium text-gray-900">{trip.destination?.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Photos */}
              {trip.photos && trip.photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Trip Photos</p>
                  <div className="grid grid-cols-4 gap-2">
                    {trip.photos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={photo.url}
                          alt={photo.label || `Photo ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => window.open(photo.url, '_blank')}
                        />
                        {photo.label && (
                          <div className="absolute inset-0 bg-black/60 text-white text-xs p-1 rounded-lg flex items-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="w-full text-center truncate">{photo.label}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {trip.status === 'completed' && trip.timeline && (
                <div className="p-4 bg-beige-50 border border-beige-300 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Trip Timeline</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {trip.timeline.accepted && (
                      <div>
                        <p className="text-gray-500">Accepted</p>
                        <p className="font-semibold">{new Date(trip.timeline.accepted).toLocaleTimeString()}</p>
                      </div>
                    )}
                    {trip.timeline.driverEnroute && (
                      <div>
                        <p className="text-gray-500">En Route</p>
                        <p className="font-semibold">{new Date(trip.timeline.driverEnroute).toLocaleTimeString()}</p>
                      </div>
                    )}
                    {trip.timeline.arrivedAtPickup && (
                      <div>
                        <p className="text-gray-500">Picked Up</p>
                        <p className="font-semibold">{new Date(trip.timeline.arrivedAtPickup).toLocaleTimeString()}</p>
                      </div>
                    )}
                    {trip.timeline.completed && (
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="font-semibold">{new Date(trip.timeline.completed).toLocaleTimeString()}</p>
                      </div>
                    )}
                  </div>
                  {trip.duration?.actual && (
                    <div className="mt-2 pt-2 border-t border-beige-300">
                      <p className="text-sm">
                        <span className="text-gray-600">Duration:</span>{' '}
                        <span className="font-semibold">{trip.duration.actual} minutes</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Reason */}
              {trip.status === 'cancelled' && trip.cancelReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    <span className="font-semibold">Cancellation Reason:</span> {trip.cancelReason}
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}




