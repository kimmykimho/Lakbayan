import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'
import PhotoGallery from '../../components/PhotoGallery'

export default function DriverTransportRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [activeRequest, setActiveRequest] = useState(null)

  useEffect(() => {
    fetchRequests()
    // Poll for new requests every 30 seconds
    const interval = setInterval(fetchRequests, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await api.get('/transport-requests/driver')
      console.log('Driver Transport Requests Response:', response.data)
      setRequests(response.data.data || [])

      // Check for active request
      const active = response.data.data?.find(r =>
        r.driver && ['accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(r.status)
      )
      setActiveRequest(active || null)
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      console.error('Error details:', error.response?.data)
      if (!loading) toast.error('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (requestId) => {
    try {
      await api.put(`/transport-requests/${requestId}/accept`)
      toast.success('Request accepted!')
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept request')
    }
  }

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.put(`/transport-requests/${requestId}/update-status`, { status: newStatus })
      toast.success('Status updated!')
      fetchRequests()
    } catch (error) {
      console.error('Update status error:', error)
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  const handleCancel = async (requestId, reason) => {
    const cancelReason = reason || prompt('Reason for cancellation (optional):')

    try {
      await api.put(`/transport-requests/${requestId}/cancel`, { reason: cancelReason })
      toast.success('Request cancelled')
      fetchRequests()
    } catch (error) {
      toast.error('Failed to cancel request')
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
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusText = (status) => {
    const texts = {
      pending: 'New Request',
      accepted: 'Accepted',
      driver_enroute: 'En Route to Pickup',
      arrived: 'Arrived at Pickup',
      in_progress: 'Ride in Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }
    return texts[status] || status
  }

  const getNextAction = (status) => {
    const actions = {
      accepted: { label: 'Start Driving to Pickup', nextStatus: 'driver_enroute', icon: '🚗' },
      driver_enroute: { label: 'Mark as Arrived at Pickup', nextStatus: 'arrived', icon: '📍' },
      arrived: { label: 'Pickup Complete - Start Ride', action: 'pickup-complete', icon: '✅' },
      in_progress: { label: 'Arrived at Destination', action: 'destination-arrived', icon: '🏁' }
    }
    return actions[status]
  }

  const handlePickupComplete = async (requestId) => {
    try {
      await api.put(`/transport-requests/${requestId}/pickup-complete`)
      toast.success('Pickup completed! Heading to destination')
      fetchRequests()
    } catch (error) {
      console.error('Pickup complete error:', error)
      toast.error(error.response?.data?.message || 'Failed to mark pickup complete')
    }
  }

  const handleDestinationArrived = async (requestId) => {
    const photoInput = document.createElement('input')
    photoInput.type = 'file'
    photoInput.accept = 'image/*'
    photoInput.capture = 'environment' // Use back camera on mobile

    photoInput.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      // Convert to base64 for now (in production, upload to cloud storage)
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const photoUrl = reader.result
          await api.put(`/transport-requests/${requestId}/destination-arrived`, { photoUrl })
          toast.success('Trip completed successfully!')
          fetchRequests()
        } catch (error) {
          console.error('Destination arrival error:', error)
          toast.error(error.response?.data?.message || 'Failed to complete trip')
        }
      }
      reader.readAsDataURL(file)
    }

    photoInput.click()
  }

  const filteredRequests = filter === 'all'
    ? requests
    : filter === 'active'
      ? requests.filter(r => ['pending', 'accepted', 'driver_enroute', 'arrived', 'in_progress'].includes(r.status))
      : requests.filter(r => r.status === filter)

  const filters = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'active', label: 'Active', icon: '🟢' },
    { value: 'pending', label: 'Pending', icon: '⏳' },
    { value: 'completed', label: 'Completed', icon: '✓' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transport Requests</h1>
          <p className="text-gray-600">Manage your ride requests</p>
        </div>
        {/* Active Request Card */}
        {activeRequest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl shadow-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Active Ride</h2>
              <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-semibold">
                {getStatusText(activeRequest.status)}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <p className="text-beige-300 text-sm mb-1">Passenger</p>
                  <p className="text-xl font-semibold">{activeRequest.user?.name}</p>
                  <p className="text-beige-300 text-sm">{activeRequest.user?.phone || 'No phone'}</p>
                </div>

                <div className="mb-4">
                  <p className="text-beige-300 text-sm mb-1">📍 Pickup</p>
                  <p className="font-semibold">{activeRequest.pickup?.address || 'Pickup Location'}</p>
                </div>

                <div>
                  <p className="text-beige-300 text-sm mb-1">🎯 Destination</p>
                  <p className="font-semibold">
                    {activeRequest.destination?.placeName || activeRequest.destination?.address || 'Destination'}
                  </p>
                </div>
              </div>

              <div>
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-beige-300 text-xs mb-1">Distance</p>
                      <p className="text-2xl font-bold">{activeRequest.distance?.toFixed(1) || '0'} km</p>
                    </div>
                    <div>
                      <p className="text-beige-300 text-xs mb-1">Fare</p>
                      <p className="text-2xl font-bold">₱{activeRequest.fare?.estimated || 0}</p>
                    </div>
                  </div>
                </div>

                {getNextAction(activeRequest.status) && (
                  <button
                    onClick={() => {
                      const action = getNextAction(activeRequest.status)
                      if (action.action === 'pickup-complete') {
                        handlePickupComplete(activeRequest.id || activeRequest._id)
                      } else if (action.action === 'destination-arrived') {
                        handleDestinationArrived(activeRequest.id || activeRequest._id)
                      } else if (action.nextStatus) {
                        handleUpdateStatus(activeRequest.id || activeRequest._id, action.nextStatus)
                      }
                    }}
                    className="w-full py-4 bg-white text-beige-500 rounded-xl font-bold text-lg hover:bg-beige-50 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{getNextAction(activeRequest.status).icon}</span>
                    {getNextAction(activeRequest.status).label}
                  </button>
                )}

                {activeRequest.status !== 'completed' && activeRequest.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancel(activeRequest.id || activeRequest._id)}
                    className="w-full mt-3 py-3 bg-red-500/20 text-white rounded-xl font-semibold hover:bg-red-500/30 transition-all"
                  >
                    Cancel Ride
                  </button>
                )}

                {/* Trip Photos - Show when completed */}
                {activeRequest.status === 'completed' && activeRequest.photos && activeRequest.photos.length > 0 && (
                  <div className="mt-4 p-4 bg-white/10 rounded-xl border border-white/20">
                    <PhotoGallery
                      photos={activeRequest.photos}
                      title="📸 Trip Photos - Arrival Photos"
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${filter === f.value
                  ? 'bg-primary-dark text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl">
            <div className="text-6xl mb-4">🚗</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {filter === 'pending' ? 'No pending requests at the moment' : 'No requests match your filter'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map((request) => (
              <motion.div
                key={request.id || request._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {request.user?.name || 'Unknown Passenger'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-beige-500">₱{request.fare?.estimated || 0}</div>
                    <div className="text-xs text-gray-500">{request.distance?.toFixed(1) || 0} km</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">📍 Pickup</p>
                    <p className="font-semibold text-gray-900">{request.pickup?.address || 'Pickup Location'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">🎯 Destination</p>
                    <p className="font-semibold text-gray-900">
                      {request.destination?.placeName || request.destination?.address || 'Destination'}
                    </p>
                  </div>
                </div>

                {request.notes && (
                  <div className="mb-4 p-3 bg-beige-50 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Notes:</p>
                    <p className="text-sm text-gray-900">{request.notes}</p>
                  </div>
                )}

                {/* Trip Photos - Show when completed */}
                {request.status === 'completed' && request.photos && request.photos.length > 0 && (
                  <div className="mb-4 p-4 bg-beige-50 border border-beige-400 rounded-lg">
                    <PhotoGallery
                      photos={request.photos}
                      title="📸 Trip Photos - Arrival Photos"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                {request.status === 'pending' && !activeRequest && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccept(request.id || request._id)}
                      className="flex-1 py-3 bg-beige-500 text-white rounded-lg font-semibold hover:bg-beige-600 transition-colors"
                    >
                      Accept Request
                    </button>
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




