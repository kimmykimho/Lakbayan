import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'
import FavoriteButton from '../components/FavoriteButton'
import ShareButton from '../components/ShareButton'

export default function Favorites() {
  const navigate = useNavigate()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFavorites()
  }, [])

  const fetchFavorites = async () => {
    try {
      setLoading(true)
      const response = await api.get('/favorites')
      setFavorites(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load favorites')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleFavoriteRemoved = () => {
    // Refresh favorites list after removing
    fetchFavorites()
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

  const getCategoryIcon = (category) => {
    const icons = {
      nature: '🏞️',

      cultural: '🏛️',
      adventure: '🏔️',
      food: '🍽️'
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back</span>
          </button>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="text-4xl md:text-5xl mb-2">❤️</div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">My Favorites</h1>
            <p className="text-base md:text-lg opacity-90">
              {favorites.length} place{favorites.length !== 1 ? 's' : ''} you love
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {favorites.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-8xl mb-6">💔</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No favorites yet</h2>
            <p className="text-gray-600 text-lg mb-8">
              Start exploring and click the heart icon on places you love!
            </p>
            <Link
              to="/places"
              className="inline-block px-8 py-4 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all text-lg"
            >
              Explore Places
            </Link>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((place, index) => (
              <motion.div
                key={place.id || place._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all overflow-hidden group"
              >
                {/* Image */}
                <Link to={`/places/${place.id || place._id}`} className="block">
                  <div className="h-48 relative overflow-hidden">
                    {place.images && place.images.length > 0 ? (
                      <img
                        src={place.images[0]}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className={`h-full bg-gradient-to-br ${getCategoryGradient(place.category)} flex items-center justify-center text-6xl`}>
                        {getCategoryIcon(place.category)}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2 z-10">
                      <div onClick={(e) => e.preventDefault()}>
                        <FavoriteButton
                          placeId={place.id || place._id}
                          size="md"
                          onRemove={handleFavoriteRemoved}
                        />
                      </div>
                      <div onClick={(e) => e.preventDefault()}>
                        <ShareButton place={place} size="md" />
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <div className="p-6">
                  <Link to={`/places/${place.id || place._id}`}>
                    <h3 className="text-xl font-bold text-gray-900 mb-2 hover:text-beige-500 transition-colors">
                      {place.name}
                    </h3>
                  </Link>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {place.description}
                  </p>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-semibold">{place.rating?.average || 0}</span>
                    </div>
                    <div className="text-gray-500">
                      {place.visitors?.total || 0} visits
                    </div>
                  </div>

                  {/* View Button */}
                  <Link
                    to={`/places/${place.id || place._id}`}
                    className="block w-full px-4 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all text-center"
                  >
                    View Details
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}




