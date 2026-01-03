import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PhotoGallery from '../../components/PhotoGallery'

export default function ArrivingTourists() {
  const [transportRequests, setTransportRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active') // active, all
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // specific status
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchTransportRequests()

    // Poll for updates every 15 seconds (reduced frequency)
    const interval = setInterval(fetchTransportRequests, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchTransportRequests = async () => {
    try {
      const response = await api.get('/transport-requests/all')

      if (response.data.message?.includes('business owner profile')) {
        toast.error('Please set up your business profile first')
      }

      setTransportRequests(response.data.data || [])
    } catch (error) {
      console.error('Error fetching requests:', error)
      // Only show toast on specific errors to avoid spamming on poll
      if (error.response?.status === 403 || error.response?.status === 401) {
        toast.error('Access denied or session expired')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      accepted: 'bg-blue-100 text-blue-800 border-blue-300',
      driver_enroute: 'bg-purple-100 text-purple-800 border-purple-300',
      arrived: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      in_progress: 'bg-beige-300 text-green-800 border-beige-500',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'Finding Driver',
      accepted: 'Driver Assigned',
      driver_enroute: 'Picking Up Visitor',
      arrived: 'Visitor Boarding',
      in_progress: 'Coming to Your Place',
      completed: 'Arrived',
      cancelled: 'Cancelled'
    }
    return texts[status] || status
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      accepted: '✅',
      driver_enroute: '🚗',
      arrived: '👥',
      in_progress: '🛣️',
      completed: '🏁',
      cancelled: '❌'
    }
    return icons[status] || '📍'
  }

  const filteredRequests = transportRequests
    .filter(request => {
      // 1. Primary Tab Filter
      if (filter === 'active') {
        if (!['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(request.status)) return false
      }

      // 2. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchesName = request.user?.name?.toLowerCase().includes(q)
        const matchesPlace = (request.booking?.place?.name || request.destination?.placeName || '').toLowerCase().includes(q)
        const matchesCode = request.booking?.confirmationCode?.toLowerCase().includes(q)
        if (!matchesName && !matchesPlace && !matchesCode) return false
      }

      // 3. Specific Status Filter
      if (statusFilter !== 'all' && request.status !== statusFilter) return false

      return true
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0)
      const dateB = new Date(b.created_at || b.createdAt || 0)
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

  const activeCount = transportRequests.filter(r =>
    ['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(r.status)
  ).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading arriving tourists...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Arriving Tourists</h1>
            <p className="text-gray-600">Track visitors coming to your places in real-time</p>
          </div>
          {activeCount > 0 && (
            <div className="bg-beige-300 border-2 border-beige-500 rounded-full px-6 py-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-beige-400 rounded-full animate-pulse"></div>
                <span className="text-lg font-bold text-green-800">{activeCount} Active {activeCount === 1 ? 'Arrival' : 'Arrivals'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => { setFilter('active'); setStatusFilter('all'); }}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${filter === 'active'
            ? 'bg-beige-500 text-white shadow-lg'
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
        >
          🚗 Active Arrivals ({activeCount})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${filter === 'all'
            ? 'bg-beige-500 text-white shadow-lg'
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'
            }`}
        >
          📋 All Transports ({transportRequests.length})
        </button>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search visitor, place, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-beige-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-beige-500 text-sm text-gray-700"
          >
            <option value="all">All Statuses</option>
            <option value="pending">⏳ Pending</option>
            <option value="accepted">✅ Driver Assigned</option>
            <option value="driver_enroute">🚗 Picking Up</option>
            <option value="arrived">👥 Visitor Boarded</option>
            <option value="in_progress">🛣️ In Progress</option>
            <option value="completed">🏁 Completed</option>
            <option value="cancelled">❌ Cancelled</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-beige-500 text-sm text-gray-700"
          >
            <option value="newest">📅 Newest First</option>
            <option value="oldest">📅 Oldest First</option>
          </select>
        </div>
      </div>

      {/* Transport Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-600">
            Try adjusting your search or filters.
          </p>
          {transportRequests.length === 0 && (
            <div className="mt-6 p-4 bg-beige-50 border border-beige-300 rounded-lg max-w-md mx-auto">
              <p className="text-sm text-blue-800">
                <span className="font-bold">💡 Note:</span> Transport requests will appear here when visitors book your places and request transportation.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id || request._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={`/owner/track-transport/${request.id || request._id}`}
                className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all p-6 border-2 border-transparent hover:border-beige-500"
              >
                {/* Status Badge at Top */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`px-4 py-2 rounded-full text-sm font-bold border-2 flex items-center gap-2 ${getStatusColor(request.status)}`}>
                    <span className="text-lg">{getStatusIcon(request.status)}</span>
                    {getStatusText(request.status)}
                  </div>
                  {request.booking?.confirmationCode && (
                    <span className="text-xs text-gray-500 font-mono">#{request.booking.confirmationCode}</span>
                  )}
                </div>

                {/* Main Info: Place Destination */}
                <div className="mb-4 p-4 bg-gradient-to-r from-beige-50 to-beige-50 rounded-xl border-2 border-emerald-200">
                  <p className="text-xs text-beige-500 font-semibold mb-1">🏠 DESTINATION PLACE</p>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {request.booking?.place?.name || request.destination?.placeName || 'Your Place'}
                  </h3>
                  {request.booking?.place?.address && (
                    <p className="text-sm text-gray-600 flex items-start gap-2">
                      <svg className="w-4 h-4 text-beige-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>{request.booking.place.address}</span>
                    </p>
                  )}
                  {request.booking?.place?.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-white border border-emerald-300 rounded-full text-xs font-semibold text-emerald-700 capitalize">
                      {request.booking.place.category}
                    </span>
                  )}
                </div>

                {/* Visitor Information */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 font-semibold mb-2">👤 INCOMING VISITOR</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                      {request.user?.name?.[0] || 'T'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900">
                        {request.user?.name || 'Unknown Tourist'}
                      </h4>
                      <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                        {request.user?.phone && (
                          <span className="flex items-center gap-1">
                            📞 {request.user.phone}
                          </span>
                        )}
                        {request.booking?.numberOfVisitors && (
                          <span className="flex items-center gap-1">
                            👥 {request.booking.numberOfVisitors} {request.booking.numberOfVisitors === 1 ? 'person' : 'people'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visit Schedule */}
                {request.booking && (
                  <div className="mb-4 p-3 bg-beige-50 border border-beige-300 rounded-lg">
                    <p className="text-xs text-primary font-semibold mb-2">📅 SCHEDULED VISIT</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {request.booking.visitDate && (
                        <div>
                          <span className="text-gray-600">Date: </span>
                          <span className="font-semibold text-gray-900">
                            {new Date(request.booking.visitDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                      {request.booking.visitTime && (
                        <div>
                          <span className="text-gray-600">Time: </span>
                          <span className="font-semibold text-gray-900">{request.booking.visitTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Driver & Transport Details */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  {/* Driver Info */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-semibold mb-2">🚗 DRIVER</p>
                    {request.driver ? (
                      <>
                        <p className="font-semibold text-gray-900">{request.driver.user?.name || 'Assigned'}</p>
                        <p className="text-sm text-gray-600 capitalize">{request.driver.vehicle?.type || 'Vehicle'}</p>
                        {request.driver.vehicle?.plateNumber && (
                          <p className="text-xs text-gray-500 font-mono mt-1">{request.driver.vehicle.plateNumber}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Not assigned yet</p>
                    )}
                  </div>

                  {/* Trip Details */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 font-semibold mb-2">📊 TRIP INFO</p>
                    <p className="font-semibold text-gray-900 capitalize">{request.vehicleType}</p>
                    <p className="text-sm text-gray-600">
                      {request.distance ? `${Number(request.distance).toFixed(1)} km` : 'Calculating...'}
                    </p>
                    {request.fare?.estimated && (
                      <p className="text-sm text-beige-500 font-semibold">₱{request.fare.estimated}</p>
                    )}
                  </div>
                </div>

                {/* Route Info */}
                {request.pickup?.address && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-xs text-purple-600 font-semibold mb-1">📍 PICKUP LOCATION</p>
                    <p className="text-sm text-gray-900">{request.pickup.address}</p>
                  </div>
                )}

                {/* ETA & Track Button */}
                {['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(request.status) && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-beige-50 to-beige-50 border-2 border-emerald-300 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-beige-500 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        {request.eta && request.eta.minutes ? (
                          <>
                            <p className="text-xs text-gray-600 font-semibold">ESTIMATED ARRIVAL</p>
                            <p className="font-bold text-xl text-emerald-700">{request.eta.minutes} min</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-600 font-semibold">STATUS</p>
                            <p className="font-bold text-lg text-emerald-700">En Route</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="bg-beige-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-lg">
                        🗺️ Track Live
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Click to view map</p>
                    </div>
                  </div>
                )}

                {/* Trip Photos - Show when completed */}
                {request.status === 'completed' && request.photos && request.photos.length > 0 && (
                  <div className="mt-4 p-4 bg-beige-50 border border-emerald-200 rounded-lg">
                    <PhotoGallery
                      photos={request.photos}
                      title="📸 Visitor Arrival Photos"
                    />
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Banner */}
      {activeCount > 0 && (
        <div className="mt-6 bg-beige-50 border-2 border-beige-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-primary-dark mb-1">Real-time Tracking Active</p>
              <p className="text-sm text-blue-800">
                Click on any tourist card to view live tracking with map, driver location, and detailed timeline.
                The page auto-updates every 10 seconds to show the latest information.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




