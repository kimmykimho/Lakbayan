import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import ImageCarousel from '../components/ImageCarousel'
import FavoriteButton from '../components/FavoriteButton'
import ShareButton from '../components/ShareButton'

export default function Places() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [nearbyPlaces, setNearbyPlaces] = useState([])
  const [loadingNearby, setLoadingNearby] = useState(false)
  const [showNearby, setShowNearby] = useState(false)
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    fetchPlaces()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPlaces = async () => {
    try {
      setLoading(true)
      const response = await api.get('/places')
      console.log('📍 Places API response:', response.data)
      // Handle both response formats: { success: true, data: [...] } or { data: [...] }
      if (response.data) {
        let placesData = null
        if (response.data.success && response.data.data) {
          placesData = response.data.data
        } else if (Array.isArray(response.data.data)) {
          placesData = response.data.data
        } else if (Array.isArray(response.data)) {
          placesData = response.data
        }

        if (placesData && placesData.length > 0) {
          console.log('📍 First place object:', placesData[0])
          console.log('📍 First place ID:', placesData[0].id, 'or _id:', placesData[0]._id)
        }

        setPlaces(placesData || [])
      }
    } catch (error) {
      console.error('Failed to fetch places:', error)
      // Set empty array on error so UI shows "No places" instead of crashing
      setPlaces([])
    } finally {
      setLoading(false)
    }
  }

  const discoverNearby = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setLoadingNearby(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation({ lat: latitude, lng: longitude })

        try {
          const response = await api.get('/external/nearby', {
            params: {
              lat: latitude,
              lng: longitude,
              radius: 10000 // 10km radius
            }
          })

          if (response.data.success) {
            setNearbyPlaces(response.data.data)
            setShowNearby(true)
            toast.success(`Found ${response.data.data.length} places nearby!`)
          } else {
            toast.error('Failed to discover nearby places')
          }
        } catch (error) {
          console.error('Failed to fetch nearby places:', error)
          toast.error('Failed to discover nearby places')
        } finally {
          setLoadingNearby(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        toast.error('Unable to get your location')
        setLoadingNearby(false)
      }
    )
  }

  const getCategoryIcon = (category) => {
    const icons = {
      nature: '🏞️',

      cultural: '🏛️',
      adventure: '🏔️',
      food: '🍽️',
      shopping: '🛍️',
      accommodation: '🏨'
    }
    return icons[category] || '📍'
  }

  const getCategoryGradient = (category) => {
    const gradients = {
      nature: 'from-primary to-primary-dark',

      cultural: 'from-primary to-primary-dark',
      adventure: 'from-primary to-primary-dark',
      food: 'from-primary-light to-primary',
      shopping: 'from-primary to-primary-dark',
      accommodation: 'from-primary to-primary-dark'
    }
    return gradients[category] || 'from-gray-500 to-gray-600'
  }

  // Calculate category counts
  const categoryCounts = places.reduce((acc, place) => {
    acc[place.category] = (acc[place.category] || 0) + 1
    return acc
  }, {})

  const categories = [
    { id: 'all', name: 'All Places', icon: '🌍', count: places.length },
    { id: 'nature', name: 'Nature', icon: '🏞️', count: categoryCounts.nature || 0 },

    { id: 'cultural', name: 'Cultural', icon: '🏛️', count: categoryCounts.cultural || 0 },
    { id: 'adventure', name: 'Adventure', icon: '🏔️', count: categoryCounts.adventure || 0 },
    { id: 'food', name: 'Food & Dining', icon: '🍽️', count: categoryCounts.food || 0 },
    { id: 'shopping', name: 'Shopping', icon: '🛍️', count: categoryCounts.shopping || 0 },
    { id: 'accommodation', name: 'Hotels', icon: '🏨', count: categoryCounts.accommodation || 0 }
  ]

  const filteredPlaces = places.filter(place => {
    const matchesFilter = filter === 'all' || place.category === filter
    const matchesSearch = place.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary-dark to-primary text-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-6">
              <span className="text-5xl">📍</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
              Explore Kitcharao
            </h1>
            <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto">
              Discover amazing destinations, hidden gems, and unforgettable experiences
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search and Filter - Mobile Responsive */}
      <div className="bg-white shadow-sm sticky top-0 md:top-16 z-40 border-b">
        {/* Search Bar Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Search Bar with Nearby Discovery */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-3xl mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search places..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 pl-10 sm:pl-14 rounded-xl sm:rounded-2xl border-2 border-gray-200 focus:border-beige-400 focus:outline-none text-sm sm:text-base md:text-lg shadow-sm"
              />
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 absolute left-3 sm:left-5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={discoverNearby}
              disabled={loadingNearby}
              className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl sm:rounded-2xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:text-base"
            >
              {loadingNearby ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Discovering...</span>
                  <span className="sm:hidden">Finding...</span>
                </>
              ) : (
                <>
                  <span className="text-lg sm:text-xl">📍</span>
                  <span className="hidden sm:inline">Discover Nearby</span>
                  <span className="sm:hidden">Nearby</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Categories - Full width horizontal scroll */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 pb-3 sm:pb-4 min-w-max lg:justify-center lg:min-w-0 lg:max-w-7xl lg:mx-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setFilter(category.id)}
                className={`flex-shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base ${filter === category.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-beige-400'
                  }`}
              >
                <span className="text-base sm:text-xl">{category.icon}</span>
                <span className="whitespace-nowrap">{category.name}</span>
                <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-semibold ${filter === category.id ? 'bg-white/20' : 'bg-gray-200'
                  }`}>
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Places Grid - Responsive */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {filteredPlaces.length} {filter === 'all' ? 'Places' : categories.find(c => c.id === filter)?.name}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Find your next adventure</p>
          </div>
          <select className="px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg border-2 border-gray-200 focus:border-beige-400 focus:outline-none w-full sm:w-auto">
            <option>Most Popular</option>
            <option>Highest Rated</option>
            <option>Most Visited</option>
            <option>Nearest</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading places...</p>
          </div>
        ) : filteredPlaces.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No places found</h3>
            <p className="text-gray-600 mb-4">
              {places.length === 0
                ? "No places available yet. Contact admin to add places."
                : "Try adjusting your filters or search term"
              }
            </p>
            {places.length === 0 && (
              <Link
                to="/admin/places"
                className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Add Places (Admin)
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlaces.map((place, index) => (
              <motion.div
                key={place.id || place._id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all cursor-pointer overflow-hidden group"
              >
                {/* Image/Icon */}
                <div className="h-56 relative overflow-hidden">
                  {place.images && place.images.length > 0 ? (
                    <>
                      <ImageCarousel images={place.images} className="h-full" />
                      {place.featured && (
                        <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold z-10">
                          ⭐ Featured
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`h-full bg-gradient-to-br ${getCategoryGradient(place.category)} flex items-center justify-center text-7xl group-hover:scale-110 transition-transform duration-300 relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all"></div>
                      {getCategoryIcon(place.category)}
                      {place.featured && (
                        <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                          ⭐ Featured
                        </div>
                      )}
                    </div>
                  )}

                  {/* Favorite and Share Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <FavoriteButton placeId={place.id || place._id} size="md" />
                    <ShareButton place={place} size="md" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-beige-500 transition-colors">
                        {place.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="ml-1 font-bold text-gray-900">{place.rating?.average || 0}</span>
                        </div>
                        <span className="text-sm text-gray-500">({place.rating?.count || 0} reviews)</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {place.description}
                  </p>

                  {/* Tags/Activities */}
                  {place.activities && place.activities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {place.activities.slice(0, 3).map((activity) => (
                        <span key={activity} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">
                          {activity}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-beige-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span className="font-semibold">{place.visitors?.current || 0} visiting</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Total: {place.visitors?.total || 0}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/places/${place.id || place._id}`}
                      className="w-full px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredPlaces.length > 0 && !showNearby && (
          <div className="text-center mt-12">
            <button className="px-8 py-3 bg-white border-2 border-beige-400 text-beige-500 rounded-xl font-semibold hover:bg-beige-50 transition-all">
              Load More Places
            </button>
          </div>
        )}

        {/* Nearby Places from Foursquare */}
        {showNearby && nearbyPlaces.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="text-4xl">🌐</span>
                  Nearby Places via Foursquare
                </h2>
                <p className="text-gray-600 mt-2">
                  Discovered {nearbyPlaces.length} places near your location
                </p>
              </div>
              <button
                onClick={() => setShowNearby(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold"
              >
                ← Back to All Places
              </button>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyPlaces.map((place, index) => (
                <motion.div
                  key={place.foursquareId || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all overflow-hidden group"
                >
                  {/* Header with Category */}
                  <div className="h-48 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl relative">
                    {place.categories && place.categories[0]?.icon ? (
                      <img
                        src={`${place.categories[0].icon.prefix}88${place.categories[0].icon.suffix}`}
                        alt={place.categories[0].name}
                        className="w-20 h-20"
                      />
                    ) : (
                      <span>📍</span>
                    )}
                    <div className="absolute top-3 right-3 px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-bold">
                      {place.distance}m away
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                      {place.name}
                    </h3>

                    {/* Address */}
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>{place.location.address || place.location.city || 'Address not available'}</span>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {place.categories && place.categories.slice(0, 2).map((cat) => (
                        <span key={cat.id} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">
                          {cat.name}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                        View on Map
                      </button>
                      <button className="px-4 py-2.5 border-2 border-purple-500 text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
