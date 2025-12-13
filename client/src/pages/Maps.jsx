import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import api from '../services/api'
import toast from 'react-hot-toast'
import useDataCache from '../store/dataCache'

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icon creator
const createCustomIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

// Map center component
function MapCenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 13)
    }
  }, [center, map])
  return null
}

export default function Maps() {
  const navigate = useNavigate()
  const [places, setPlaces] = useState([])
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lat: 9.4550, lng: 125.5731 })
  const [route, setRoute] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [userLocation, setUserLocation] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Use cache
  const { getPlaces, setPlaces: setCachedPlaces } = useDataCache()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate category counts
  const categoryCounts = places.reduce((acc, place) => {
    acc[place.category] = (acc[place.category] || 0) + 1
    return acc
  }, {})

  const categories = [
    { id: 'all', name: 'All Places', icon: '🗺️', color: 'blue', count: places.length },
    { id: 'nature', name: 'Nature', icon: '🏞️', color: 'green', count: categoryCounts.nature || 0 },
    { id: 'adventure', name: 'Adventure', icon: '🏔️', color: 'red', count: categoryCounts.adventure || 0 },
    { id: 'food', name: 'Food & Dining', icon: '🍽️', color: 'orange', count: categoryCounts.food || 0 },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'pink', count: categoryCounts.shopping || 0 },
    { id: 'accommodation', name: 'Hotels', icon: '🏨', color: 'purple', count: categoryCounts.accommodation || 0 }
  ]

  useEffect(() => {
    fetchPlaces()
    getUserLocation()
  }, [])

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Location access denied:', error)
        }
      )
    }
  }

  const fetchPlaces = async () => {
    // Check cache first
    const cachedPlaces = getPlaces()
    if (cachedPlaces && cachedPlaces.length > 0) {
      console.log('📦 Using cached places data')
      setPlaces(cachedPlaces)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await api.get('/places')
      const data = response.data.data || []
      setPlaces(data)
      if (data.length > 0) {
        setCachedPlaces(data)
      }
    } catch (error) {
      toast.error('Failed to load places')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getDirections = async (destinationPlace) => {
    if (!userLocation) {
      toast.error('Please enable location access')
      return
    }

    setRouteLoading(true)
    try {
      const response = await api.post('/external/route', {
        start: [userLocation.lng, userLocation.lat],
        end: [destinationPlace.location.coordinates.lng, destinationPlace.location.coordinates.lat],
        profile: 'driving-car'
      })

      if (response.data.success) {
        const routeData = response.data.data

        // Convert GeoJSON coordinates to Leaflet LatLng format
        const coordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]])

        setRoute({
          coordinates,
          distance: routeData.distanceKm,
          duration: routeData.durationMin,
          fares: routeData.fareEstimates
        })

        setSelectedPlace({
          ...destinationPlace,
          routeInfo: routeData
        })

        toast.success(`Route calculated: ${routeData.distanceKm} km, ${routeData.durationMin} min`)
      }
    } catch (error) {
      toast.error('Failed to calculate route')
      console.error(error)
    } finally {
      setRouteLoading(false)
    }
  }

  const clearRoute = () => {
    setRoute(null)
    setSelectedPlace(null)
  }

  const filteredPlaces = selectedCategory === 'all'
    ? places
    : places.filter(p => p.category === selectedCategory)

  const getCategoryColor = (category) => {
    const colorMap = {
      nature: 'green',

      cultural: 'violet',
      adventure: 'red',
      food: 'orange',
      shopping: 'pink',
      accommodation: 'purple'
    }
    return colorMap[category] || 'blue'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-500 via-primary to-primary-dark text-white py-6 sm:py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-sm rounded-xl mb-2 sm:mb-3">
              <span className="text-3xl sm:text-4xl">🗺️</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Interactive Maps
            </h1>
            <p className="text-sm sm:text-base md:text-lg opacity-90 max-w-2xl mx-auto px-4">
              Navigate Kitcharao with real-time locations and AI-powered routing
            </p>
          </motion.div>
        </div>
      </div>

      {/* Categories - Full width horizontal scroll (matching Places page structure) */}
      <div className="bg-white shadow-sm border-b mb-6">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 min-w-max lg:justify-center lg:min-w-0 lg:max-w-7xl lg:mx-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  setSelectedCategory(category.id)
                  clearRoute()
                }}
                className={`flex-shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base ${selectedCategory === category.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-beige-400'
                  }`}
              >
                <span className="text-base sm:text-xl">{category.icon}</span>
                <span className="whitespace-nowrap">{category.name}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${selectedCategory === category.id ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Map Container */}
        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Map */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="h-[400px] sm:h-[500px] md:h-[600px] relative">
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={isMobile ? 12 : 13}
                  style={{ height: '100%', width: '100%' }}
                  className="rounded-xl sm:rounded-2xl"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapCenter center={mapCenter} />

                  {/* User Location */}
                  {userLocation && (
                    <Marker
                      position={[userLocation.lat, userLocation.lng]}
                      icon={createCustomIcon('red')}
                    >
                      <Popup>
                        <div className="text-center">
                          <strong>Your Location</strong>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Place Markers */}
                  {filteredPlaces.map((place) => (
                    <Marker
                      key={place.id || place._id}
                      position={[place.location.coordinates.lat, place.location.coordinates.lng]}
                      icon={createCustomIcon(getCategoryColor(place.category))}
                      eventHandlers={{
                        click: () => {
                          setSelectedPlace(place)
                          setMapCenter(place.location.coordinates)
                        }
                      }}
                    >
                      <Popup maxWidth={280} className="custom-popup">
                        <div className="min-w-[200px] sm:min-w-[250px]">
                          {/* Place Images */}
                          {place.images && place.images.length > 0 && (
                            <div className="mb-2 sm:mb-3 -mx-2 -mt-2">
                              <div className="relative h-24 sm:h-32 overflow-hidden rounded-t-lg">
                                <img
                                  src={place.images[0]}
                                  alt={place.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/280x128?text=No+Image'
                                  }}
                                />
                                {place.images.length > 1 && (
                                  <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-xs font-semibold">
                                    +{place.images.length - 1}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <h3 className="font-bold text-base sm:text-lg mb-1 sm:mb-2">{place.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{place.description?.substring(0, 80)}...</p>

                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm mb-2 sm:mb-3">
                            <span className="text-yellow-500">⭐</span>
                            <span className="font-semibold">{place.rating?.average || 0}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{place.visitors?.total || 0} visits</span>
                          </div>

                          <div className="space-y-1.5 sm:space-y-2">
                            <button
                              onClick={() => navigate(`/places/${place.id || place._id}`)}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-beige-400 text-white rounded-lg hover:bg-beige-500 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2"
                            >
                              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="hidden sm:inline">View All Details</span>
                              <span className="sm:hidden">Details</span>
                            </button>

                            {userLocation && (
                              <button
                                onClick={() => getDirections(place)}
                                disabled={routeLoading}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-xs sm:text-sm font-medium disabled:opacity-50"
                              >
                                {routeLoading ? 'Calculating...' : '🧭 Directions'}
                              </button>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* Route Line */}
                  {route && (
                    <Polyline
                      positions={route.coordinates}
                      color="blue"
                      weight={4}
                      opacity={0.7}
                    />
                  )}
                </MapContainer>

                {/* Map Controls */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex flex-col gap-2 z-[1000]">
                  {userLocation && (
                    <button
                      onClick={() => setMapCenter(userLocation)}
                      className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg sm:text-xl"
                      title="Center on my location"
                    >
                      📍
                    </button>
                  )}
                  {route && (
                    <button
                      onClick={clearRoute}
                      className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg sm:text-xl"
                      title="Clear route"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </div>

              {/* Route Info Banner */}
              {route && (
                <div className="p-3 sm:p-4 bg-beige-50 border-t">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 text-center">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Distance</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{route.distance} km</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Duration</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">{route.duration} min</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Tricycle</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">₱{route.fares?.tricycle.estimatedFare}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Jeepney</p>
                      <p className="text-base sm:text-lg font-bold text-gray-900">₱{route.fares?.jeepney.estimatedFare}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Places List */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 max-h-[400px] sm:max-h-[500px] md:max-h-[600px] overflow-y-auto"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                {selectedCategory === 'all' ? 'All Places' : categories.find(c => c.id === selectedCategory)?.name}
              </h3>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : filteredPlaces.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm sm:text-base">No places found in this category</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredPlaces.map((place, index) => (
                    <motion.div
                      key={place.id || place._id || index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 sm:p-4 border-2 rounded-lg sm:rounded-xl hover:shadow-md transition-all cursor-pointer ${selectedPlace?.id === place.id || selectedPlace?._id === place._id ? 'border-primary bg-beige-50' : 'border-gray-200'
                        }`}
                      onClick={() => {
                        setSelectedPlace(place)
                        setMapCenter(place.location.coordinates)
                      }}
                    >
                      {/* Thumbnail Image */}
                      {place.images && place.images.length > 0 && (
                        <div className="w-full h-24 sm:h-32 mb-2 sm:mb-3 rounded-lg overflow-hidden">
                          <img
                            src={place.images[0]}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/300x128?text=No+Image'
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-start gap-2 sm:gap-3">
                        <div className="text-2xl sm:text-3xl flex-shrink-0">
                          {categories.find(c => c.id === place.category)?.icon || '📍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">
                            {place.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                            {place.description}
                          </p>
                          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                            <span className="text-yellow-500 flex items-center gap-1">
                              ⭐ {place.rating?.average || 0}
                            </span>
                            <span className="text-gray-500">
                              {place.visitors?.total || 0} visits
                            </span>
                          </div>

                          <div className="space-y-1.5 sm:space-y-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/places/${place.id || place._id}`)
                              }}
                              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-beige-400 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-beige-500 transition-colors"
                            >
                              View Details
                            </button>
                            {userLocation && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  getDirections(place)
                                }}
                                disabled={routeLoading}
                                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-primary text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                              >
                                {routeLoading ? 'Calculating...' : '🧭 Directions'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-8 sm:mt-12">
          {[
            { icon: '🧭', title: 'Real-time Navigation', desc: 'Turn-by-turn directions powered by OpenRouteService' },
            { icon: '📱', title: 'Live Location', desc: 'Track your position in real-time' },
            { icon: '💰', title: 'Fare Estimates', desc: 'Know the cost before you go' },
            { icon: '📍', title: 'Save Favorites', desc: 'Bookmark your favorite spots' }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all"
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3">{feature.icon}</div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-xs sm:text-sm">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}



