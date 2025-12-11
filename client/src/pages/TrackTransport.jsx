import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import PhotoGallery from '../components/PhotoGallery'

export default function TrackTransport() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState(null)

  useEffect(() => {
    fetchTransportRequest()

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchTransportRequest, 10000)
    return () => clearInterval(interval)
  }, [requestId])

  const fetchTransportRequest = async () => {
    try {
      // Get user's transport requests
      const response = await api.get('/transport-requests')
      const transportRequest = response.data.data?.find(r => (r.id || r._id) === requestId)

      if (transportRequest) {
        setRequest(transportRequest)
        if (transportRequest.driverLocation?.coordinates) {
          setDriverLocation(transportRequest.driverLocation.coordinates)
        }
      }
    } catch (error) {
      console.error('Failed to fetch transport request:', error)
      if (!loading) toast.error('Failed to load tracking info')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-500',
      accepted: 'bg-primary',
      driver_enroute: 'bg-purple-500',
      arrived: 'bg-indigo-500',
      in_progress: 'bg-beige-400',
      completed: 'bg-gray-500',
      cancelled: 'bg-red-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'Finding Driver...',
      accepted: 'Driver Accepted',
      driver_enroute: 'Driver is on the way to pick you up',
      arrived: 'Driver has arrived at pickup location',
      in_progress: 'Ride in progress - Heading to destination',
      completed: 'Trip Completed',
      cancelled: 'Trip Cancelled'
    }
    return texts[status] || status
  }

  const getStatusIcon = (status) => {
    const icons = {
      pending: '⏳',
      accepted: '✅',
      driver_enroute: '🚗',
      arrived: '📍',
      in_progress: '🛣️',
      completed: '🏁',
      cancelled: '❌'
    }
    return icons[status] || '❓'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="w-20 h-20 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Transport Request Not Found</h2>
          <button
            onClick={() => navigate('/my-bookings')}
            className="mt-4 px-6 py-3 bg-primary-dark text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            Back to My Bookings
          </button>
        </div>
      </div>
    )
  }

  const pickupLat = request.pickup?.coordinates?.lat || 8.9600
  const pickupLng = request.pickup?.coordinates?.lng || 125.4300
  const destLat = request.destination?.coordinates?.lat || 8.9600
  const destLng = request.destination?.coordinates?.lng || 125.4300
  const driverLat = driverLocation?.lat || pickupLat
  const driverLng = driverLocation?.lng || pickupLng

  // Destination place name for marker
  const destinationPlaceName = request.destination?.placeName || request.booking?.place?.name || 'Destination'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-6">
        <div className="max-w-7xl mx-auto px-4">
          <button
            onClick={() => navigate('/my-bookings')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          <h1 className="text-3xl font-bold">Track Your Transport</h1>
          <p className="text-blue-100 mt-1">Real-time tracking</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${getStatusColor(request.status)} text-white rounded-2xl p-6 mb-6 shadow-lg`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">{getStatusIcon(request.status)}</span>
                <h2 className="text-2xl font-bold">{getStatusText(request.status)}</h2>
              </div>
              {request.eta && ['driver_enroute', 'in_progress'].includes(request.status) && (
                <p className="text-white/90 text-lg">
                  ETA: <span className="font-bold">{request.eta.minutes} minutes</span>
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="h-96 sm:h-[600px] relative">
                <iframe
                  title="Transport Tracking Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${driverLat},${driverLng}&destination=${request.status === 'driver_enroute' || request.status === 'accepted' ? pickupLat + ',' + pickupLng : destLat + ',' + destLng}&mode=driving`}
                  allowFullScreen
                />

                {/* Live indicator */}
                {['driver_enroute', 'in_progress'].includes(request.status) && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="font-semibold">LIVE</span>
                  </div>
                )}

                {/* Destination Place Label */}
                {request.status === 'in_progress' && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 border-2 border-red-500">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-semibold">HEADING TO</p>
                        <p className="text-lg font-bold text-gray-900">{destinationPlaceName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Info */}
              <div className="p-6 border-t space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-beige-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-beige-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Pickup Location</p>
                    <p className="font-semibold text-gray-900">{request.pickup?.address || 'Your Location'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Destination - Your Booked Place</p>
                    <p className="font-bold text-lg text-red-600">📍 {destinationPlaceName}</p>
                    <p className="text-sm text-gray-600 mt-1">{request.destination?.address || 'Tourist Destination'}</p>
                  </div>
                </div>

                {driverLocation && ['driver_enroute', 'in_progress'].includes(request.status) && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Driver's Current Location</p>
                      <p className="font-semibold text-gray-900">{request.driverLocation?.address || 'En route'}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated {request.driverLocation?.lastUpdated ? new Date(request.driverLocation.lastUpdated).toLocaleTimeString() : 'recently'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Driver Info & Trip Details */}
          <div className="space-y-6">
            {/* Driver Info */}
            {request.driver && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Your Driver</h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {request.driver.user?.name?.[0] || 'D'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-900">{request.driver.user?.name || 'Driver'}</p>
                    {request.driver.vehicle && (
                      <p className="text-sm text-gray-600 capitalize">{request.driver.vehicle.type}</p>
                    )}
                    {request.driver.rating?.average && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm font-semibold">{request.driver.rating.average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {request.driver.vehicle && (
                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Vehicle</span>
                      <span className="font-semibold capitalize">{request.driver.vehicle.type}</span>
                    </div>
                    {request.driver.vehicle.plateNumber && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Plate Number</span>
                        <span className="font-semibold">{request.driver.vehicle.plateNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Trip Details */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Trip Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Vehicle Type</span>
                  <span className="font-semibold capitalize">{request.vehicleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Distance</span>
                  <span className="font-semibold">{request.distance?.toFixed(1) || '0'} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Fare</span>
                  <span className="font-bold text-beige-500">₱{request.fare?.estimated || 0}</span>
                </div>
                {request.duration?.estimated && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Duration</span>
                    <span className="font-semibold">{request.duration.estimated} min</span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Trip Timeline</h3>
              <div className="space-y-4">
                {request.timeline.requested && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Requested</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.requested).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.timeline.accepted && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Driver Accepted</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.accepted).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.timeline.driverEnroute && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Driver En Route</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.driverEnroute).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.timeline.arrivedAtPickup && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Arrived at Pickup</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.arrivedAtPickup).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.timeline.started && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-beige-400 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Trip Started</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.started).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                {request.timeline.completed && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Completed</p>
                      <p className="text-xs text-gray-500">{new Date(request.timeline.completed).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Completed Trip Photos */}
            {request.status === 'completed' && request.photos && request.photos.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <PhotoGallery
                  photos={request.photos}
                  title="Trip Photos - Arrival at Destination"
                />
              </div>
            )}

            {/* Final Fare */}
            {request.status === 'completed' && request.fare?.final && (
              <div className="bg-beige-50 border-2 border-beige-400 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Trip Completed!</h3>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">Final Fare</span>
                  <span className="text-2xl font-bold text-beige-500">₱{request.fare.final}</span>
                </div>
                {request.duration?.actual && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">Duration</span>
                    <span className="text-sm font-semibold">{request.duration.actual} minutes</span>
                  </div>
                )}
              </div>
            )}

            {/* Contact Support */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
              <p className="text-sm text-yellow-800">
                <span className="font-bold">Need help?</span> Contact support if you experience any issues with your ride.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}




