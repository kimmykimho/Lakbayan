import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'

export default function ImageCarousel({ images, className = '', autoSlide = true, slideInterval = 3000 }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className={`bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-6xl ${className}`}>
        📷
      </div>
    )
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToIndex = (index) => {
    setCurrentIndex(index)
  }

  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlide || images.length <= 1 || isHovered) return

    const interval = setInterval(() => {
      goToNext()
    }, slideInterval)

    return () => clearInterval(interval)
  }, [currentIndex, autoSlide, images.length, isHovered, slideInterval])

  const currentImage = images[currentIndex]

  return (
    <div 
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          <img
            src={currentImage}
            alt={`Slide ${currentIndex + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null
              e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons - Always visible on hover */}
      {images.length > 1 && (
        <>
          {/* Previous Button */}
          <motion.button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToPrev()
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -20 }}
            transition={{ duration: 0.3 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-lg text-gray-800 rounded-full flex items-center justify-center transition-all z-10"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </motion.button>

          {/* Next Button */}
          <motion.button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToNext()
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 20 }}
            transition={{ duration: 0.3 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white shadow-lg text-gray-800 rounded-full flex items-center justify-center transition-all z-10"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
            </svg>
          </motion.button>
        </>
      )}

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-sm text-white rounded-full text-sm font-semibold z-10">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goToIndex(index)
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

ImageCarousel.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  autoSlide: PropTypes.bool,
  slideInterval: PropTypes.number
}




