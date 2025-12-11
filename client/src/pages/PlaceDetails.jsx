import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import VirtualTour from '../components/VirtualTour'
import ImageCarousel from '../components/ImageCarousel'
import FavoriteButton from '../components/FavoriteButton'
import ShareButton from '../components/ShareButton'
import { useAuthStore } from '../store/authStore'

export default function PlaceDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [place, setPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showVirtualTour, setShowVirtualTour] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' })
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewFilter, setReviewFilter] = useState(0) // 0 = all, 1-5 = specific star
  const [userLocation, setUserLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingData, setBookingData] = useState({
    visitDate: '',
    visitTime: '',
    numberOfVisitors: 1,
    specialRequests: '',
    transport: {
      needed: false,
      vehicleType: 'none'
    },
    contactInfo: {
      name: '',
      phone: '',
      email: ''
    }
  })

  useEffect(() => {
    fetchPlaceDetails()
    fetchReviews()
    getUserLocation()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          setLocationError(null)
        },
        (error) => {
          console.error('Error getting location:', error)
          setLocationError('Please enable location services to see directions')
        }
      )
    } else {
      setLocationError('Geolocation is not supported by your browser')
    }
  }

  const fetchPlaceDetails = async () => {
    // Validate ID before making request
    if (!id || id === 'undefined') {
      console.error('Invalid place ID:', id)
      toast.error('Invalid place ID')
      navigate('/places')
      return
    }

    try {
      setLoading(true)
      const response = await api.get(`/places/${id}`)
      if (response.data.success) {
        setPlace(response.data.data)
      } else if (response.data.data) {
        setPlace(response.data.data)
      }
    } catch (error) {
      console.error('Failed to fetch place details:', error)
      toast.error('Failed to load place details')
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    if (!id || id === 'undefined') return

    try {
      setLoadingReviews(true)
      const response = await api.get(`/reviews/place/${id}`)
      if (response.data.success) {
        setReviews(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
      setReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleSubmitReview = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to write a review')
      navigate('/login', { state: { from: `/places/${id}` } })
      return
    }

    try {
      if (!reviewData.comment.trim()) {
        toast.error('Please write a comment')
        return
      }

      if (reviewData.comment.trim().length < 10) {
        toast.error('Review must be at least 10 characters long')
        return
      }

      setSubmittingReview(true)

      await api.post(`/reviews`, {
        place: id,
        rating: reviewData.rating,
        comment: reviewData.comment.trim()
      })

      toast.success('Review submitted successfully!')
      setShowReviewModal(false)
      setReviewData({ rating: 5, comment: '' })

      // Refresh reviews and place details to show new rating
      await Promise.all([fetchReviews(), fetchPlaceDetails()])
    } catch (error) {
      console.error('Failed to submit review:', error)
      toast.error(error.response?.data?.message || 'Failed to submit review')
    } finally {
      setSubmittingReview(false)
    }
  }

  const handleBookVisit = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Please login to book a visit')
      navigate('/login', { state: { from: `/places/${id}` } })
      return
    }

    try {
      if (!bookingData.visitDate || !bookingData.visitTime) {
        toast.error('Please select visit date and time')
        return
      }

      if (!bookingData.contactInfo.name || !bookingData.contactInfo.phone) {
        toast.error('Please provide contact information')
        return
      }

      const booking = await api.post('/bookings', {
        place: id,
        visitDate: bookingData.visitDate,
        visitTime: bookingData.visitTime,
        numberOfVisitors: bookingData.numberOfVisitors,
        specialRequests: bookingData.specialRequests,
        transport: bookingData.transport,
        contactInfo: bookingData.contactInfo
      })

      toast.success('Booking request sent! Waiting for owner confirmation.')
      setShowBookingModal(false)

      // Reset booking form
      setBookingData({
        visitDate: '',
        visitTime: '',
        numberOfVisitors: 1,
        transport: {
          needed: false,
          vehicleType: 'none'
        },
        contactInfo: {
          name: '',
          phone: '',
          email: ''
        },
        specialRequests: ''
      })

      // If they selected transport needed (but not own vehicle), navigate to transport page
      if (bookingData.transport.needed && bookingData.transport.vehicleType !== 'own_vehicle') {
        setTimeout(() => {
          navigate('/transport', {
            state: {
              destination: {
                lat: place.location?.coordinates?.lat || 8.9600,
                lng: place.location?.coordinates?.lng || 125.4300,
                name: place.name,
                bookingId: booking.data.data.id || booking.data.data._id
              }
            }
          })
        }, 1000)
      }

      // Ask if they need transport (after booking is confirmed by owner)
      // setTimeout(() => {
      //   const needsTransport = window.confirm('Booking confirmed! Would you like to arrange transport to this location?')
      //   if (needsTransport) {
      //     navigate('/transport', {
      //       state: {
      //         destination: {
      //           lat: place.location?.coordinates?.lat || 8.9600,
      //           lng: place.location?.coordinates?.lng || 125.4300,
      //           name: place.name,
      //           bookingId: booking.data.data._id
      //         }
      //       }
      //     })
      //   }
      // }, 1000)
    } catch (error) {
      console.error('Failed to create booking:', error)
      toast.error(error.response?.data?.message || 'Failed to create booking')
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  if (!place) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Place not found</h2>
          <button
            onClick={() => navigate('/places')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Back to Places
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'activities', name: 'Activities', icon: '🎯' },
    { id: 'amenities', name: 'Amenities', icon: '🏪' },
    { id: 'reviews', name: 'Reviews', icon: '⭐' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="relative h-64 sm:h-80 md:h-96">
        {place.images && place.images.length > 0 ? (
          <>
            <ImageCarousel images={place.images} className="h-full" autoSlide={true} slideInterval={5000} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
          </>
        ) : (
          <>
            <div className={`h-full bg-gradient-to-br ${getCategoryGradient(place.category)}`}>
              <div className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl md:text-9xl opacity-20">
                {getCategoryIcon(place.category)}
              </div>
              <div className="absolute inset-0 bg-black/30"></div>
            </div>
          </>
        )}

        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 md:pb-12">
            <button
              onClick={() => navigate('/places')}
              className="absolute top-4 sm:top-6 left-4 sm:left-6 px-3 py-2 sm:px-4 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-lg sm:rounded-xl font-semibold transition-all flex items-center gap-2 text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <span className="px-3 py-1 sm:px-4 bg-white/20 backdrop-blur-sm rounded-full text-xs sm:text-sm font-semibold capitalize">
                  {place.category}
                </span>
                {place.featured && (
                  <span className="px-3 py-1 sm:px-4 bg-yellow-400 text-yellow-900 rounded-full text-xs sm:text-sm font-bold">
                    ⭐ Featured
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-4">{place.name}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm sm:text-base md:text-lg">
                <div className="flex items-center gap-1 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-bold">{place.rating?.average || 0}</span>
                  <span className="opacity-90 hidden sm:inline">({place.rating?.count || 0} reviews)</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <span>{place.visitors?.total || 0} visitors</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="bg-white border-b sticky top-0 md:top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => setShowVirtualTour(true)}
                className="flex-1 sm:flex-initial px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <span className="text-lg sm:text-xl">🎬</span>
                <span className="hidden sm:inline">Virtual Tour</span>
                <span className="sm:hidden">Tour</span>
              </button>
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    toast.error('Please login to book a visit')
                    navigate('/login', { state: { from: `/places/${id}` } })
                    return
                  }
                  setShowBookingModal(true)
                }}
                className="flex-1 sm:flex-initial px-3 sm:px-4 md:px-6 py-2 sm:py-3 bg-primary text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm sm:text-base">
                <span className="text-lg sm:text-xl">📅</span>
                <span className="hidden sm:inline">Book Visit</span>
                <span className="sm:hidden">Book</span>
              </button>
              <div className="flex-shrink-0">
                <FavoriteButton placeId={place.id} size="md" />
              </div>
              <div className="flex-shrink-0">
                <ShareButton place={place} size="md" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-beige-500 text-center sm:text-right">
              {place.category === 'accommodation' && place.pricing?.pricePerNight
                ? `₱${place.pricing.pricePerNight}/night`
                : place.category === 'food' && place.menu && place.menu.length > 0
                  ? 'See Menu'
                  : place.category === 'shopping'
                    ? 'Shop Now'
                    : (place.category === 'nature' || place.category === 'cultural' || place.category === 'adventure')
                      ? (place.entryFee?.adult || place.pricing?.adult || place.pricing?.entranceFee
                        ? `₱${place.entryFee?.adult || place.pricing?.adult || place.pricing?.entranceFee}`
                        : '')
                      : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden mb-6 sm:mb-8">
              <div className="flex border-b overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 min-w-[80px] px-3 sm:px-4 md:px-6 py-3 sm:py-4 font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm md:text-base whitespace-nowrap ${activeTab === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                      }`}
                  >
                    <span className="text-base sm:text-lg md:text-xl">{tab.icon}</span>
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-6 md:p-8">
                {activeTab === 'overview' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">About this place</h2>
                    <p className="text-gray-700 leading-relaxed mb-6">
                      {place.description || 'No description available.'}
                    </p>

                    {place.highlights && place.highlights.length > 0 && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Highlights</h3>
                        <div className="grid sm:grid-cols-2 gap-3 mb-6">
                          {place.highlights.map((highlight, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-beige-50 rounded-xl">
                              <span className="text-2xl">✅</span>
                              <span className="text-gray-700">{highlight}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Restaurant Menu */}
                    {place.category === 'food' && place.menu && place.menu.length > 0 && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🍽️ Our Menu</h3>
                        <div className="space-y-3 mb-6">
                          {place.menu.map((item, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100 hover:border-beige-500 transition-colors">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900">{item.name}</h4>
                                <span className="text-lg font-bold text-beige-500">₱{item.price}</span>
                              </div>
                              {item.description && (
                                <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                              )}
                              {item.recipe && (
                                <p className="text-xs text-gray-500 italic">{item.recipe}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Hotel Pricing */}
                    {place.category === 'accommodation' && place.pricing?.pricePerNight && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🏨 Room Rates</h3>
                        <div className="p-6 bg-gradient-to-r from-beige-50 to-beige-50 rounded-xl border-2 border-beige-400 mb-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Starting from</p>
                              <p className="text-3xl font-bold text-beige-500">₱{place.pricing.pricePerNight}</p>
                              <p className="text-sm text-gray-600">per night</p>
                            </div>
                            <div className="text-6xl">🛏️</div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Shop Categories */}
                    {place.category === 'shopping' && place.shop && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🛍️ What We Sell</h3>
                        {place.shop.categories && place.shop.categories.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {place.shop.categories.map((cat, index) => (
                              <span key={index} className="px-4 py-2 bg-beige-300 text-beige-600 rounded-full font-medium">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                        {place.shop.details && (
                          <p className="text-gray-700 bg-gray-50 p-4 rounded-xl mb-6">{place.shop.details}</p>
                        )}
                      </>
                    )}

                    {/* Services */}
                    {place.category === 'service' && place.services && place.services.length > 0 && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🔧 Services Offered</h3>
                        <div className="space-y-3 mb-6">
                          {place.services.map((service, index) => (
                            <div key={index} className="p-4 bg-gray-50 rounded-xl border-2 border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-900">{service.name}</h4>
                                  {service.duration && (
                                    <span className="text-sm text-gray-500">⏱️ {service.duration}</span>
                                  )}
                                </div>
                                <span className="text-lg font-bold text-beige-500">₱{service.price}</span>
                              </div>
                              {service.description && (
                                <p className="text-sm text-gray-600">{service.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Entertainment - Now Showing */}
                    {place.category === 'entertainment' && place.entertainment?.nowShowing && place.entertainment.nowShowing.length > 0 && (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">🎬 Now Showing</h3>
                        <div className="space-y-4 mb-6">
                          {place.entertainment.nowShowing.map((show, index) => (
                            <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">{show.title}</h4>
                                  {show.genre && (
                                    <span className="inline-block px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-xs font-semibold mt-1">
                                      {show.genre}
                                    </span>
                                  )}
                                </div>
                                <span className="text-lg font-bold text-purple-600">₱{show.price}</span>
                              </div>
                              {show.description && (
                                <p className="text-sm text-gray-700 mb-2">{show.description}</p>
                              )}
                              {(show.date || show.time) && (
                                <div className="flex gap-4 text-sm text-gray-600">
                                  {show.date && <span>📅 {show.date}</span>}
                                  {show.time && <span>🕒 {show.time}</span>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Operating Hours</p>
                        <p className="font-semibold text-gray-900">
                          {place.operatingHours?.open || '8:00 AM'} - {place.operatingHours?.close || '5:00 PM'}
                        </p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Best Time to Visit</p>
                        <p className="font-semibold text-gray-900">{place.bestTime || 'Morning'}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'activities' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Things to Do</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {place.activities && place.activities.length > 0 ? (
                        place.activities.map((activity, index) => (
                          <div key={index} className="p-4 border-2 border-gray-200 rounded-xl hover:border-beige-400 transition-all">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl">🎯</span>
                              <span className="font-semibold text-gray-900">{activity}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 col-span-2">No activities listed</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'amenities' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Amenities & Facilities</h2>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {place.amenities && place.amenities.length > 0 ? (
                        place.amenities.map((amenity, index) => (
                          <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                            <span className="text-2xl">✓</span>
                            <span className="text-gray-700">{amenity}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600 col-span-3">No amenities listed</p>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'reviews' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {/* Header with Rating Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">Visitor Reviews</h2>
                      <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-xl">
                        <span className="text-3xl">⭐</span>
                        <div>
                          <span className="text-2xl font-bold text-gray-900">{place.rating?.average?.toFixed(1) || '0.0'}</span>
                          <span className="text-gray-500 ml-2">({place.rating?.count || 0} reviews)</span>
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution */}
                    {reviews.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Rating Distribution</p>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = reviews.filter(r => r.rating === star).length
                            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="w-8 text-sm text-gray-600">{star}★</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-yellow-400 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <span className="w-8 text-sm text-gray-500 text-right">{count}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        { value: 0, label: 'All', count: reviews.length },
                        { value: 5, label: '5★', count: reviews.filter(r => r.rating === 5).length },
                        { value: 4, label: '4★', count: reviews.filter(r => r.rating === 4).length },
                        { value: 3, label: '3★', count: reviews.filter(r => r.rating === 3).length },
                        { value: 2, label: '2★', count: reviews.filter(r => r.rating === 2).length },
                        { value: 1, label: '1★', count: reviews.filter(r => r.rating === 1).length },
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => setReviewFilter(filter.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${reviewFilter === filter.value
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                          {filter.label} ({filter.count})
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {loadingReviews ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-gray-500">Loading reviews...</p>
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl">
                          <span className="text-4xl mb-3 block">💬</span>
                          <p className="text-gray-600 mb-2">No reviews yet</p>
                          <p className="text-sm text-gray-500">Be the first to share your experience!</p>
                        </div>
                      ) : (
                        <>
                          {reviews
                            .filter(review => reviewFilter === 0 || review.rating === reviewFilter)
                            .map((review) => (
                              <div key={review.id} className="p-4 border-2 border-gray-200 rounded-xl hover:border-primary transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    {review.user?.avatar ? (
                                      <img
                                        src={review.user.avatar}
                                        alt={review.user?.name || 'User'}
                                        className="w-12 h-12 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                                        {(review.user?.name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                                      <p className="text-sm text-gray-500">
                                        {new Date(review.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                        ⭐
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {review.title && (
                                  <p className="font-semibold text-gray-900 mb-1">{review.title}</p>
                                )}
                                <p className="text-gray-700">{review.comment}</p>
                              </div>
                            ))}
                          {reviews.filter(review => reviewFilter === 0 || review.rating === reviewFilter).length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl">
                              <span className="text-4xl mb-3 block">🔍</span>
                              <p className="text-gray-600">No {reviewFilter}★ reviews yet</p>
                            </div>
                          )}
                        </>
                      )}

                      <button
                        onClick={() => {
                          if (!isAuthenticated) {
                            toast.error('Please login to write a review')
                            navigate('/login', { state: { from: `/places/${id}` } })
                            return
                          }
                          setShowReviewModal(true)
                        }}
                        className="w-full px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <span>✏️</span>
                        Write a Review
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Location */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📍</span>
                Location
              </h3>
              <p className="text-gray-700 mb-4">
                {place.location?.address || 'Kitcharao, Agusan del Sur'}
              </p>

              {/* Google Map */}
              <div className="h-64 bg-gray-200 rounded-xl mb-4 overflow-hidden relative">
                {locationError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 p-4">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <p className="text-sm text-gray-600 text-center">{locationError}</p>
                    <button
                      onClick={getUserLocation}
                      className="mt-3 px-4 py-2 bg-beige-400 text-white rounded-lg text-sm font-semibold hover:bg-beige-500 transition-all"
                    >
                      Turn On Location
                    </button>
                  </div>
                ) : (
                  <iframe
                    title="Place Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${userLocation ? `${userLocation.lat},${userLocation.lng}` : '8.9600,125.4300'}&destination=${place.location?.coordinates?.lat || 8.9600},${place.location?.coordinates?.lng || 125.4300}&mode=driving`}
                    allowFullScreen
                  />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const lat = place.location?.coordinates?.lat || 8.9600
                    const lng = place.location?.coordinates?.lng || 125.4300
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Get Directions
                </button>
                {locationError && (
                  <button
                    onClick={getUserLocation}
                    className="px-4 py-3 bg-beige-400 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    title="Enable Location"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>📞</span>
                Contact
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <span className="text-gray-700">{place.contact?.phone || '(085) 123-4567'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-gray-700">{place.contact?.email || 'info@Lakbayan sa Kitcharao.com'}</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-br from-yellow-50 to-beige-50 rounded-2xl shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>💡</span>
                Visitor Tips
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Bring sunscreen and water</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Wear comfortable shoes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Best visited during dry season</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Respect local guidelines</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Virtual Tour Modal */}
      <VirtualTour
        place={place}
        isOpen={showVirtualTour}
        onClose={() => setShowVirtualTour(false)}
      />

      {/* Booking Modal */}
      <AnimatePresence>
        {showBookingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto"
            onClick={() => setShowBookingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-2xl w-full my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Book Your Visit</h2>
              <p className="text-gray-600 mb-4 sm:mb-6">to {place.name}</p>

              <div className="space-y-4">
                {/* Visit Date and Time */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={bookingData.visitDate}
                      onChange={(e) => setBookingData({ ...bookingData, visitDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Visit Time</label>
                    <input
                      type="time"
                      value={bookingData.visitTime}
                      onChange={(e) => setBookingData({ ...bookingData, visitTime: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Number of Visitors */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Visitors</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingData.numberOfVisitors}
                    onChange={(e) => setBookingData({ ...bookingData, numberOfVisitors: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                  />
                </div>

                {/* Contact Information */}
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                      <input
                        type="text"
                        value={bookingData.contactInfo.name}
                        onChange={(e) => setBookingData({
                          ...bookingData,
                          contactInfo: { ...bookingData.contactInfo, name: e.target.value }
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        value={bookingData.contactInfo.phone}
                        onChange={(e) => setBookingData({
                          ...bookingData,
                          contactInfo: { ...bookingData.contactInfo, phone: e.target.value }
                        })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      value={bookingData.contactInfo.email}
                      onChange={(e) => setBookingData({
                        ...bookingData,
                        contactInfo: { ...bookingData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Special Requests (Optional)</label>
                  <textarea
                    value={bookingData.specialRequests}
                    onChange={(e) => setBookingData({ ...bookingData, specialRequests: e.target.value })}
                    placeholder="Any special requirements or requests..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                  />
                </div>

                {/* Transport Selection */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Transportation</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: bookingData.transport.vehicleType === 'none' ? '#10b981' : '#e5e7eb' }}>
                      <input
                        type="radio"
                        name="transport"
                        checked={bookingData.transport.vehicleType === 'none'}
                        onChange={() => setBookingData({
                          ...bookingData,
                          transport: { needed: false, vehicleType: 'none' }
                        })}
                        className="w-4 h-4 text-beige-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">No Transport Needed</div>
                        <div className="text-sm text-gray-500">I'll arrange my own way to get there</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: bookingData.transport.vehicleType === 'own_vehicle' ? '#10b981' : '#e5e7eb' }}>
                      <input
                        type="radio"
                        name="transport"
                        checked={bookingData.transport.vehicleType === 'own_vehicle'}
                        onChange={() => setBookingData({
                          ...bookingData,
                          transport: { needed: true, vehicleType: 'own_vehicle' }
                        })}
                        className="w-4 h-4 text-beige-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">🚗 I Have My Own Vehicle</div>
                        <div className="text-sm text-gray-500">I will drive/ride there myself</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{ borderColor: bookingData.transport.needed && bookingData.transport.vehicleType !== 'none' && bookingData.transport.vehicleType !== 'own_vehicle' ? '#10b981' : '#e5e7eb' }}>
                      <input
                        type="radio"
                        name="transport"
                        checked={bookingData.transport.needed && bookingData.transport.vehicleType !== 'none' && bookingData.transport.vehicleType !== 'own_vehicle'}
                        onChange={() => setBookingData({
                          ...bookingData,
                          transport: { needed: true, vehicleType: 'tricycle' }
                        })}
                        className="w-4 h-4 text-beige-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">🚖 Request Transport Service</div>
                        <div className="text-sm text-gray-500">Book a ride to the location</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBookVisit}
                  className="flex-1 px-4 sm:px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Confirm Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowReviewModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Write a Review</h2>

              {/* Rating */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                      className="text-4xl transition-all hover:scale-110"
                    >
                      {star <= reviewData.rating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Review
                  <span className="text-xs text-gray-500 ml-2">
                    (minimum 10 characters)
                  </span>
                </label>
                <textarea
                  value={reviewData.comment}
                  onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                  placeholder="Share your experience... (at least 10 characters)"
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reviewData.comment.length}/10 characters
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingReview ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}




