import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function Transport() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [userLocation, setUserLocation] = useState(null)
  const [destination, setDestination] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [pageError, setPageError] = useState(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [manualLocation, setManualLocation] = useState({
    lat: '',
    lng: '',
    address: ''
  })

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationError(null)
          toast.success('Location detected!')
        },
        (error) => {
          console.error('Error getting location:', error)
          let errorMessage = 'Unable to get location. '
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Location permission denied. You can enter your location manually.'
              break
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.'
              break
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.'
              break
            default:
              errorMessage += 'Unknown error occurred.'
          }
          setLocationError(errorMessage)
          // Use default Butuan City location as fallback
          toast.success('Using default location. Click "Edit Location" to change.')
          setUserLocation({
            lat: 8.9600,
            lng: 125.4300
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    } else {
      setLocationError('Geolocation not supported by your browser')
      // Use default location
      toast.success('Using default location. Click "Edit Location" to change.')
      setUserLocation({
        lat: 8.9600,
        lng: 125.4300
      })
    }
  }

  const handleManualLocationSubmit = () => {
    const lat = parseFloat(manualLocation.lat)
    const lng = parseFloat(manualLocation.lng)

    if (isNaN(lat) || isNaN(lng)) {
      toast.error('Please enter valid coordinates')
      return
    }

    if (lat < -90 || lat > 90) {
      toast.error('Latitude must be between -90 and 90')
      return
    }

    if (lng < -180 || lng > 180) {
      toast.error('Longitude must be between -180 and 180')
      return
    }

    setUserLocation({ lat, lng })
    setShowLocationModal(false)
    toast.success('Location updated successfully!')
  }

  const popularLocations = [
    { name: 'Butuan City Center', lat: 8.9600, lng: 125.4300 },
    { name: 'Agusan del Norte Capitol', lat: 8.9474, lng: 125.5406 },
    { name: 'Butuan Airport', lat: 8.9515, lng: 125.4789 },
    { name: 'Robinsons Place Butuan', lat: 8.9331, lng: 125.5289 },
    { name: 'Gaisano Mall Butuan', lat: 8.9478, lng: 125.5376 },
    { name: 'Nasipit Port', lat: 8.9906, lng: 125.3481 }
  ]

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers')
      console.log('Fetched drivers:', response.data)
      // Drivers are already filtered by availability on the backend
      setDrivers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch drivers:', error)
      toast.error('Unable to fetch available drivers')
    } finally {
      setInitialLoading(false)
    }
  }

  // Get destination from location state (passed from booking)
  useEffect(() => {
    try {
      console.log('Transport page loaded with state:', location.state)
      if (location.state?.destination) {
        setDestination(location.state.destination)
      }
      getUserLocation()
      fetchDrivers()
    } catch (error) {
      console.error('Error initializing transport page:', error)
      setPageError('Failed to load transport page. Please try again.')
      toast.error('Failed to load transport page')
      setInitialLoading(false)
    }
  }, [])

  const vehicles = [
    {
      id: 'own_vehicle',
      name: 'Own Vehicle',
      icon: '🚗',
      capacity: 'Personal transport',
      description: 'I have my own transportation',
      baseRate: 0,
      perKm: 0,
      speed: 0,
      requiresLocation: false
    },
    {
      id: 'tricycle',
      name: 'Tricycle',
      icon: '🛺',
      capacity: '3-4 people',
      baseRate: 20,
      perKm: 10,
      speed: 30, // km/h average
      color: 'from-primary to-primary-dark',
      description: 'Perfect for short distances'
    },
    {
      id: 'motorcycle',
      name: 'Motorcycle',
      icon: '🏍️',
      capacity: '1-2 people',
      baseRate: 15,
      perKm: 8,
      speed: 50,
      color: 'from-primary to-primary-dark',
      description: 'Fast and economical'
    },
    {
      id: 'van',
      name: 'Van',
      icon: '🚐',
      capacity: '6-12 people',
      baseRate: 100,
      perKm: 15,
      speed: 60,
      color: 'from-primary to-primary-dark',
      description: 'Ideal for groups'
    },
    {
      id: 'car',
      name: 'Private Car',
      icon: '🚗',
      capacity: '4-5 people',
      baseRate: 50,
      perKm: 12,
      speed: 70,
      color: 'from-primary to-primary-dark',
      description: 'Comfortable ride'
    }
  ]

  const calculateRoute = (vehicle) => {
    if (!userLocation || !destination) return

    // Calculate straight-line distance (simplified)
    const lat1 = userLocation.lat
    const lon1 = userLocation.lng
    const lat2 = destination.lat
    const lon2 = destination.lng

    const R = 6371 // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // Add 30% for street routing (roads aren't straight)
    const roadDistance = distance * 1.3

    const fare = vehicle.baseRate + (roadDistance * vehicle.perKm)
    const duration = (roadDistance / vehicle.speed) * 60 // in minutes

    setRouteInfo({
      distance: roadDistance.toFixed(2),
      duration: Math.ceil(duration),
      fare: Math.ceil(fare)
    })
  }

  useEffect(() => {
    if (selectedVehicle && userLocation && destination && selectedVehicle.id !== 'own_vehicle') {
      calculateRoute(selectedVehicle)
    }
  }, [selectedVehicle, userLocation, destination])

  const handleBookTransport = async () => {
    // Check if user is authenticated (except for 'own_vehicle')
    if (!isAuthenticated) {
      toast.error('Please login to request transport')
      navigate('/login', { state: { from: '/transport' } })
      return
    }

    if (!selectedVehicle) {
      toast.error('Please select a vehicle type')
      return
    }

    // If user selected "Own Vehicle", just navigate back
    if (selectedVehicle.id === 'own_vehicle') {
      toast.success('Great! You can use your own vehicle.')
      navigate(-1) // Go back to previous page
      return
    }

    if (!destination) {
      toast.error('Please set a destination')
      return
    }

    if (!userLocation) {
      toast.error('Getting your location... Please wait or use default location')
      getUserLocation()
      return
    }

    setLoading(true)
    try {
      await api.post('/transport-requests', {
        vehicleType: selectedVehicle.id,
        pickup: {
          address: 'Current Location',
          coordinates: {
            lat: userLocation.lat,
            lng: userLocation.lng
          }
        },
        destination: {
          address: destination.name || 'Destination',
          coordinates: {
            lat: destination.lat,
            lng: destination.lng
          },
          placeName: destination.name
        },
        passengers: 1,
        bookingId: location.state?.destination?.bookingId,
        notes: location.state?.destination?.notes || ''
      })

      toast.success('Transport requested! A driver will contact you soon.')
      navigate('/my-bookings')
    } catch (error) {
      console.error('Failed to request transport:', error)
      toast.error(error.response?.data?.message || 'Failed to request transport')
    } finally {
      setLoading(false)
    }
  }

  // Initial loading state
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading transport options...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (pageError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <svg className="w-20 h-20 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{pageError}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 via-primary to-primary-dark text-white py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
                🚗 Transport Service
              </h1>
            </div>
            <p className="text-base sm:text-lg opacity-90 mb-2">
              {destination ? `Get directions to ${destination.name}` : 'Book your ride in Kitcharao'}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${userLocation ? 'bg-beige-400/20' : 'bg-yellow-500/20'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {userLocation ? `✓ Location: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : '⏳ Detecting location...'}
              </div>
              {userLocation && (
                <button
                  onClick={() => {
                    setManualLocation({
                      lat: userLocation.lat.toString(),
                      lng: userLocation.lng.toString(),
                      address: ''
                    })
                    setShowLocationModal(true)
                  }}
                  className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-all"
                >
                  ✏️ Edit Location
                </button>
              )}
              {drivers.length > 0 && (
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-beige-400/20">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  {drivers.length} driver{drivers.length > 1 ? 's' : ''} online
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="h-96 sm:h-[500px] relative">
                {!userLocation ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-6">
                    <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-gray-600 text-center mb-4">Getting your location...</p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <button
                      onClick={getUserLocation}
                      className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Retry Location
                    </button>
                    <button
                      onClick={() => {
                        setUserLocation({ lat: 8.9600, lng: 125.4300 })
                        toast.success('Using default location (Butuan City)')
                      }}
                      className="mt-3 px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all"
                    >
                      Use Default Location
                    </button>
                    <button
                      onClick={() => setShowLocationModal(true)}
                      className="mt-3 px-6 py-3 bg-beige-400 text-white rounded-xl font-semibold hover:bg-beige-500 transition-all"
                    >
                      📍 Enter Location Manually
                    </button>
                  </div>
                ) : (
                  <iframe
                    title="Transport Route Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation.lat},${userLocation.lng}&destination=${destination?.lat || 8.9600},${destination?.lng || 125.4300}&mode=${selectedVehicle?.id === 'motorcycle' || selectedVehicle?.id === 'tricycle' ? 'driving' : 'driving'}`}
                    allowFullScreen
                  />
                )}
              </div>

              {/* Route Info */}
              {routeInfo && selectedVehicle && (
                <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{routeInfo.distance} km</div>
                      <div className="text-sm text-gray-600">Distance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{routeInfo.duration} min</div>
                      <div className="text-sm text-gray-600">ETA</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-beige-500">₱{routeInfo.fare}</div>
                      <div className="text-sm text-gray-600">Estimated Fare</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Choose Vehicle</h2>
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${selectedVehicle?.id === vehicle.id
                      ? 'border-beige-400 bg-beige-50'
                      : 'border-gray-200 hover:border-beige-500'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{vehicle.icon}</div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-gray-900">{vehicle.name}</div>
                        <div className="text-sm text-gray-600">{vehicle.capacity}</div>
                        <div className="text-xs text-gray-500">{vehicle.description}</div>
                      </div>
                      {selectedVehicle?.id === vehicle.id && (
                        <div className="text-beige-400">
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Available Drivers */}
            {drivers.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Available Drivers</h2>
                <div className="space-y-3">
                  {drivers.slice(0, 3).map((driver) => (
                    <div key={driver.id || driver._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold">
                        {driver.user?.name?.[0] || driver.name?.[0] || 'D'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{driver.user?.name || driver.name || 'Driver'}</div>
                        <div className="text-sm text-gray-600 capitalize">{driver.vehicle?.type || 'Vehicle'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-semibold">{driver.rating?.average?.toFixed(1) || '4.5'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Book Button */}
            <button
              onClick={handleBookTransport}
              disabled={!selectedVehicle || loading}
              className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${!selectedVehicle || loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-primary hover:shadow-xl'
                }`}
            >
              {loading ? 'Requesting...' : selectedVehicle?.id === 'own_vehicle' ? 'Confirm Own Vehicle' : 'Request Transport'}
            </button>

            {/* Debug Info */}
            {!userLocation && selectedVehicle && selectedVehicle.id !== 'own_vehicle' && (
              <div className="mt-2 text-xs text-gray-600 text-center">
                ℹ️ Getting location... or use default location button above
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Location Edit Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowLocationModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">📍 Set Your Location</h2>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">Enter your coordinates or select from popular locations</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Location */}
              {userLocation && (
                <div className="bg-beige-50 border-2 border-beige-300 rounded-xl p-4">
                  <h3 className="font-bold text-primary-dark mb-2">📌 Current Location</h3>
                  <p className="text-sm text-primary">
                    Latitude: <span className="font-mono font-bold">{userLocation.lat.toFixed(6)}</span><br />
                    Longitude: <span className="font-mono font-bold">{userLocation.lng.toFixed(6)}</span>
                  </p>
                </div>
              )}

              {/* Manual Coordinates Entry */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">✏️ Enter Coordinates Manually</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={manualLocation.lat}
                      onChange={(e) => setManualLocation({ ...manualLocation, lat: e.target.value })}
                      placeholder="e.g., 8.9600"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: -90 to 90</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={manualLocation.lng}
                      onChange={(e) => setManualLocation({ ...manualLocation, lng: e.target.value })}
                      placeholder="e.g., 125.4300"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: -180 to 180</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Address/Location Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={manualLocation.address}
                    onChange={(e) => setManualLocation({ ...manualLocation, address: e.target.value })}
                    placeholder="e.g., My Home, Office, etc."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Popular Locations */}
              <div className="space-y-3">
                <h3 className="font-bold text-gray-900 text-lg">🗺️ Quick Select - Popular Locations</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {popularLocations.map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => {
                        setManualLocation({
                          lat: loc.lat.toString(),
                          lng: loc.lng.toString(),
                          address: loc.name
                        })
                      }}
                      className={`p-4 text-left border-2 rounded-xl transition-all hover:border-primary hover:bg-beige-50 ${manualLocation.lat === loc.lat.toString() && manualLocation.lng === loc.lng.toString()
                        ? 'border-primary bg-beige-50'
                        : 'border-gray-200'
                        }`}
                    >
                      <div className="font-semibold text-gray-900">{loc.name}</div>
                      <div className="text-xs text-gray-600 font-mono mt-1">
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* GPS Button */}
              <button
                onClick={() => {
                  getUserLocation()
                  toast.success('Detecting your GPS location...')
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use My Current GPS Location
              </button>

              {/* Help Text */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h4 className="font-bold text-yellow-900 mb-2">💡 How to find your coordinates:</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Open Google Maps on your phone or computer</li>
                  <li>• Long-press (mobile) or right-click (desktop) on your location</li>
                  <li>• Copy the coordinates (first number is latitude, second is longitude)</li>
                  <li>• Or select from popular locations above</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleManualLocationSubmit}
                  className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Save Location
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}




