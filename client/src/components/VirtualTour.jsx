import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'

export default function VirtualTour({ place, isOpen, onClose }) {
  const containerRef = useRef(null)

  // Default to Kitcharao coordinates if place has no location
  // lat: 9.3562, lng: 125.5786 (Approx Kitcharao) - adjusting effectively
  const lat = place?.location?.coordinates?.lat || place?.lat || 9.3562
  const lng = place?.location?.coordinates?.lng || place?.lng || 125.5786
  const apiKey = 'AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8' // Using existing key

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
        ref={containerRef}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all group"
        >
          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="absolute top-6 left-6 z-50 text-white pointer-events-none">
          <h2 className="text-2xl font-bold mb-1 shadow-black drop-shadow-md">{place?.name || 'Virtual Tour'}</h2>
          <p className="text-sm opacity-90 drop-shadow-md">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Google Street View
            </span>
          </p>
        </div>

        {/* Main Street View Iframe */}
        <div className="w-full h-full">
          <iframe
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`}
            title="Google Street View"
          ></iframe>
        </div>

        {/* Footer Info */}
        <div className="absolute bottom-8 left-8 z-50 text-white/60 text-xs pointer-events-none">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 space-y-1">
            <p>Navigate using on-screen controls</p>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>
  )
}

VirtualTour.propTypes = {
  place: PropTypes.object,
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}




