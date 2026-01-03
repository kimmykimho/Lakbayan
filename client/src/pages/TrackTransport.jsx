import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function TrackTransport() {
  const { requestId } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [driverLocation, setDriverLocation] = useState(null)

  useEffect(() => {
    fetchTransportRequest()
    const interval = setInterval(fetchTransportRequest, 10000)
    return () => clearInterval(interval)
  }, [requestId])

  const fetchTransportRequest = async () => {
    try {
      const response = await api.get('/transport-requests')
      const transportRequest = response.data.data?.find(r => (r.id || r._id) === requestId)
      if (transportRequest) {
        setRequest(transportRequest)
        if (transportRequest.driver_location?.lat) {
          setDriverLocation(transportRequest.driver_location)
        }
      }
    } catch (error) {
      console.error('Failed to fetch transport request:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status) => {
    const configs = {
      pending: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⏳', label: 'Finding Driver' },
      accepted: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '✓', label: 'Driver Assigned' },
      driver_enroute: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '🚗', label: 'Driver En Route' },
      arrived: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: '📍', label: 'Driver Arrived' },
      in_progress: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '🛣️', label: 'Trip In Progress' },
      completed: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '✓', label: 'Completed' },
      cancelled: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '✕', label: 'Cancelled' }
    }
    return configs[status] || configs.pending
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Request Not Found</h2>
          <button onClick={() => navigate('/my-bookings')} className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            Back to Bookings
          </button>
        </div>
      </div>
    )
  }

  const statusConfig = getStatusConfig(request.status)
  const pickupLat = request.pickup?.coordinates?.lat || 8.96
  const pickupLng = request.pickup?.coordinates?.lng || 125.43
  const destLat = request.destination?.coordinates?.lat || 8.96
  const destLng = request.destination?.coordinates?.lng || 125.43
  const driverLat = driverLocation?.lat || pickupLat
  const driverLng = driverLocation?.lng || pickupLng
  const isActive = ['driver_enroute', 'in_progress'].includes(request.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/my-bookings')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">Track Transport</h1>
          </div>
          {isActive && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs text-emerald-600 font-medium">Active</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${statusConfig.bg} ${statusConfig.border} border rounded-xl p-4 mb-6`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{statusConfig.icon}</span>
            <div className="flex-1">
              <p className={`font-semibold ${statusConfig.text}`}>{statusConfig.label}</p>
              {request.eta?.minutes && isActive && (
                <p className="text-sm text-gray-600">ETA: ~{request.eta.minutes} min</p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Map - Takes more space */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="h-80 sm:h-96 lg:h-[500px]">
                <iframe
                  title="Transport Map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${driverLat},${driverLng}&destination=${request.status === 'in_progress' ? `${destLat},${destLng}` : `${pickupLat},${pickupLng}`}&mode=driving`}
                  allowFullScreen
                />
              </div>

              {/* Route Info */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <div className="w-0.5 h-8 bg-gray-300"></div>
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Pickup</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{request.pickup?.address || 'Your Location'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Destination</p>
                      <p className="text-sm font-medium text-gray-900 truncate">{request.destination?.placeName || request.destination?.address || 'Destination'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Driver Card */}
            {(request.driver_name || request.driver) && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Driver</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-semibold">
                    {(request.driver_name || request.driver?.user?.name)?.[0] || 'D'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{request.driver_name || request.driver?.user?.name || 'Driver'}</p>
                    {request.driver_phone && (
                      <a href={`tel:${request.driver_phone}`} className="text-sm text-primary hover:underline">
                        {request.driver_phone}
                      </a>
                    )}
                    {request.driver?.vehicle?.type && (
                      <p className="text-sm text-gray-500 capitalize">{request.driver.vehicle.type}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Trip Info */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Trip Details</p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Vehicle</span>
                  <span className="font-medium text-gray-900 capitalize text-sm">{request.vehicleType || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">Distance</span>
                  <span className="font-medium text-gray-900 text-sm">{parseFloat(request.distance || 0).toFixed(1)} km</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-gray-900 font-medium">Fare</span>
                  <span className="font-bold text-lg text-primary">₱{parseFloat(request.fare || 0).toFixed(0)}</span>
                </div>
              </div>
            </div>

            {/* Timeline - Minimal */}
            {request.timeline && Object.keys(request.timeline).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Timeline</p>
                <div className="space-y-2">
                  {request.timeline?.requested && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-600">Requested</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(request.timeline.requested).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {request.timeline?.accepted && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">Accepted</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(request.timeline.accepted).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {request.timeline?.driverEnroute && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span className="text-gray-600">En Route</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(request.timeline.driverEnroute).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {request.timeline?.started && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span className="text-gray-600">Trip Started</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(request.timeline.started).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                  {request.timeline?.completed && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                      <span className="text-gray-600">Completed</span>
                      <span className="text-gray-400 text-xs ml-auto">{new Date(request.timeline.completed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-sm text-amber-800">
                <span className="font-medium">Need help?</span> Contact support for any issues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
