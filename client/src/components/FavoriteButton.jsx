import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import toast from 'react-hot-toast'
import PropTypes from 'prop-types'

export default function FavoriteButton({ placeId, size = 'md' }) {
  const { isAuthenticated, user } = useAuthStore()
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated && placeId) {
      checkFavorite()
    }
  }, [isAuthenticated, placeId])

  const checkFavorite = async () => {
    try {
      const response = await api.get(`/favorites/check/${placeId}`)
      setIsFavorite(response.data.isFavorite)
    } catch (error) {
      console.error('Failed to check favorite:', error)
    }
  }

  const toggleFavorite = async (e) => {
    e.stopPropagation() // Prevent event bubbling
    
    if (!isAuthenticated) {
      toast.error('Please login to add favorites')
      return
    }

    setLoading(true)
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${placeId}`)
        setIsFavorite(false)
        toast.success('Removed from favorites')
      } else {
        await api.post(`/favorites/${placeId}`)
        setIsFavorite(true)
        toast.success('Added to favorites! ❤️')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update favorites')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return null // Don't show button if not logged in
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleFavorite}
      disabled={loading}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center transition-all ${
        isFavorite 
          ? 'bg-red-500 text-white shadow-lg' 
          : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white shadow-md'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'}`}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      {loading ? (
        <svg className={`${iconSizes[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg 
          className={iconSizes[size]} 
          fill={isFavorite ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      )}
    </motion.button>
  )
}

FavoriteButton.propTypes = {
  placeId: PropTypes.string.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
}




