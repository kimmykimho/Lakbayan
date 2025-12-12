import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [weather, setWeather] = useState(null)
  const [places, setPlaces] = useState([])
  const [topPlaces, setTopPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeather()
    fetchPlaces()
  }, [])

  const fetchWeather = async () => {
    try {
      const response = await api.get('/external/weather', {
        params: { lat: 8.9600, lon: 125.4300 }
      })
      if (response.data.success) {
        setWeather(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error)
    }
  }

  const fetchPlaces = async () => {
    try {
      setLoading(true)
      const response = await api.get('/places')

      let fetchedPlaces = []
      if (response.data.success && response.data.data) {
        fetchedPlaces = response.data.data
      } else if (Array.isArray(response.data.data)) {
        fetchedPlaces = response.data.data
      } else if (Array.isArray(response.data)) {
        fetchedPlaces = response.data
      }

      // Sort by most visited (total visitors)
      const sorted = [...fetchedPlaces].sort((a, b) => {
        const aVisits = a.visitors?.total || 0
        const bVisits = b.visitors?.total || 0
        return bVisits - aVisits
      })

      // Top 5 for carousel
      setTopPlaces(sorted.slice(0, 5))

      // Top 3 for most visited section
      setPlaces(sorted.slice(0, 3))

      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch places:', error)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (topPlaces.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % topPlaces.length)
      }, 5000)
      return () => clearInterval(timer)
    }
  }, [topPlaces])

  const getCategoryIcon = (category) => {
    const icons = {
      nature: '🏞️',

      cultural: '🏛️',
      adventure: '🏔️',
      food: '🍽️'
    }
    return icons[category] || '📍'
  }

  const getCategoryGradient = (category) => {
    const gradients = {
      nature: 'from-primary to-primary-dark',

      cultural: 'from-primary to-primary-dark',
      adventure: 'from-primary to-primary-dark',
      food: 'from-primary-light to-primary'
    }
    return gradients[category] || 'from-gray-500 to-gray-600'
  }

  const getWeatherIcon = () => {
    if (!weather) return '🌤️'
    const main = weather.main?.toLowerCase()
    if (main?.includes('clear')) return '☀️'
    if (main?.includes('rain')) return '🌧️'
    if (main?.includes('cloud')) return '⛅'
    return '🌤️'
  }

  const getWeatherRecommendation = () => {
    if (!weather) return "AI suggests visiting Manlangit Nature's Park for a cooler escape!"

    const temp = weather.temperature
    if (temp > 32) return "Very hot! Visit waterfalls or beaches for a cool escape!"
    if (temp > 28) return "Perfect weather! Great time for outdoor activities."
    if (temp < 24) return "Cool weather! Ideal for mountain viewdecks."
    return "Great weather for exploring Kitcharao!"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Weather Banner */}
      {weather && (
        <div className="bg-primary text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm sm:text-base">
              <span className="text-2xl">{getWeatherIcon()}</span>
              <span className="font-medium">{weather.temperature}°C | {getWeatherRecommendation()}</span>
            </div>
            <Link to="/places" className="px-4 py-1.5 bg-white text-beige-500 rounded-full text-sm font-semibold hover:bg-gray-100 transition-all whitespace-nowrap">
              View Suggestions
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-beige-50 via-beige-50 to-beige-50 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary to-primary-dark rounded-xl sm:rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg flex-shrink-0">
                🏝️
              </div>
              <div className="text-left">
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  <span className="hidden sm:inline">Lakbayan sa </span>
                  <span className="text-primary">Kitcharao</span>
                </h1>
                <p className="text-sm sm:text-lg md:text-xl text-gray-600 mt-0.5 sm:mt-1">Your Pocket Guide to Great Getaways</p>
              </div>
            </div>
          </motion.div>

          {/* Carousel */}
          <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-5xl mx-auto">
            {loading || topPlaces.length === 0 ? (
              <div className="h-96 sm:h-[500px] bg-gradient-to-br from-beige-600 via-beige-400 to-beige-500 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                  <p className="text-xl font-semibold">Loading amazing places...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="relative h-96 sm:h-[500px]">
                  {topPlaces.map((place, index) => (
                    <div
                      key={place.id || index}
                      className={`absolute inset-0 transition-opacity duration-500 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
                        }`}
                    >
                      {/* Background Image */}
                      {place.images && place.images.length > 0 ? (
                        <div className="relative w-full h-full">
                          <img
                            src={place.images[0]}
                            alt={place.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextElementSibling.style.display = 'flex'
                            }}
                          />
                          <div
                            className={`hidden w-full h-full bg-gradient-to-br ${getCategoryGradient(place.category)} items-center justify-center text-9xl opacity-30`}
                          >
                            {getCategoryIcon(place.category)}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        </div>
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(place.category)} flex items-center justify-center text-9xl opacity-30 relative`}>
                          {getCategoryIcon(place.category)}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                        </div>
                      )}

                      {/* Content Overlay */}
                      <div className="absolute inset-0 flex items-end">
                        <div className="p-4 sm:p-8 md:p-12 text-white w-full">
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: index === currentSlide ? 1 : 0, y: index === currentSlide ? 0 : 20 }}
                            transition={{ delay: 0.2 }}
                          >
                            {place.featured && (
                              <span className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-400 text-yellow-900 rounded-full text-xs sm:text-sm font-bold mb-2 sm:mb-4">
                                ⭐ Featured
                              </span>
                            )}
                            <h2 className="text-xl sm:text-3xl md:text-5xl font-bold mb-2 sm:mb-4 drop-shadow-lg line-clamp-2">{place.name}</h2>
                            <p className="text-sm sm:text-base md:text-xl mb-3 sm:mb-4 max-w-2xl opacity-90 drop-shadow-md line-clamp-2">
                              {place.description || `Discover the beauty of ${place.name} in Kitcharao`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
                              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-base">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                                <span className="font-semibold">{place.visitors?.total || 0} total visits</span>
                              </div>
                              <div className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-base">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="font-semibold">{place.rating?.average || 0} ({place.rating?.count || 0} reviews)</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 sm:gap-3">
                              <Link
                                to={`/places/${place.id || place._id}`}
                                className="px-4 py-2 sm:px-6 sm:py-3 bg-white text-beige-500 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-100 transition-all shadow-lg text-sm sm:text-base"
                              >
                                Visit Now
                              </Link>
                              <Link
                                to={`/places/${place.id || place._id}`}
                                className="px-4 py-2 sm:px-6 sm:py-3 bg-white/20 backdrop-blur-sm text-white rounded-lg sm:rounded-xl font-semibold hover:bg-white/30 transition-all border-2 border-white/50 text-sm sm:text-base"
                              >
                                Learn More
                              </Link>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel Controls */}
                <button
                  onClick={() => setCurrentSlide((prev) => (prev - 1 + topPlaces.length) % topPlaces.length)}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentSlide((prev) => (prev + 1) % topPlaces.length)}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all z-10"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Dots */}
                <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 sm:gap-2 z-10">
                  {topPlaces.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`transition-all rounded-full ${index === currentSlide ? 'w-6 sm:w-8 bg-white' : 'w-2 bg-white/60'
                        } h-2`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Most Visited Places */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Most Visited Places</h2>
              <p className="text-gray-600">Real-time popularity based on current visits</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-beige-400 rounded-full animate-pulse"></div>
              <span>Updated just now</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            {places.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-beige-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading popular places...</p>
              </div>
            ) : places.map((place, index) => (
              <motion.div
                key={place.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (isAuthenticated) {
                    navigate(`/places/${place.id || place._id}`)
                  } else {
                    toast.error('Please login to view place details')
                    navigate('/login', { state: { from: `/places/${place.id || place._id}` } })
                  }
                }}
                className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all cursor-pointer overflow-hidden group border border-gray-100"
              >
                <div className="relative h-48 overflow-hidden">
                  {place.images && place.images.length > 0 ? (
                    <img
                      src={place.images[0]}
                      alt={place.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.parentElement.innerHTML = `<div class="w-full h-full bg-gradient-to-br ${getCategoryGradient(place.category)} flex items-center justify-center text-6xl">${getCategoryIcon(place.category)}</div>`;
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(place.category)} flex items-center justify-center text-6xl`}>
                      {getCategoryIcon(place.category)}
                    </div>
                  )}
                  {place.featured && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                      <span>⭐</span> Featured
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-gray-900 flex-1">{place.name}</h3>
                    <span className="px-3 py-1 bg-beige-300 text-beige-600 rounded-full text-sm font-semibold capitalize">
                      {getCategoryIcon(place.category)} {place.category}
                    </span>
                  </div>
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-beige-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span className="font-semibold text-gray-900">{place.visitors?.current || 0} people are here</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      Rating: {place.rating?.average || 0} ({place.rating?.count || 0} reviews)
                    </p>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Total Visits</span>
                      <span className="font-semibold">{place.visitors?.total || 0}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (place.visitors?.current || 0) * 2)}%` }}
                        transition={{ duration: 1, delay: index * 0.2 }}
                        className={`h-full bg-gradient-to-r ${getCategoryGradient(place.category)} rounded-full`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Total visits this month</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <Link to="/places" className="px-6 py-2.5 sm:px-8 sm:py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm sm:text-base">
              Book Now
            </Link>
            <Link to="/places" className="px-6 py-2.5 sm:px-8 sm:py-3 bg-white border-2 border-beige-400 text-beige-500 rounded-xl font-semibold hover:bg-beige-50 transition-all text-sm sm:text-base">
              View All Places
            </Link>
          </div>
        </div>
      </section>


    </div>
  )
}




