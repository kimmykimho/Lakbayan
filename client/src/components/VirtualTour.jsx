import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PropTypes from 'prop-types'

export default function VirtualTour({ place, isOpen, onClose }) {
  // Coming Soon Mode - Set to false when ready to launch
  const COMING_SOON = false;
  
  const [currentView, setCurrentView] = useState(0)
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [fullscreen, setFullscreen] = useState(false)
  const containerRef = useRef(null)
  
  // Show Coming Soon message
  if (COMING_SOON && isOpen) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-3xl p-8 md:p-12 max-w-2xl w-full text-center shadow-2xl border border-gray-700"
          >
            <div className="mb-6">
              <span className="text-6xl md:text-8xl">🚧</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Virtual Tour Coming Soon!</h2>
            <p className="text-gray-300 text-base md:text-lg mb-8 leading-relaxed">
              We're working on an amazing 360° virtual tour experience for <span className="text-beige-600 font-semibold">{place?.name || 'this location'}</span>. 
              Stay tuned for immersive views of Kitcharao's beautiful destinations!
            </p>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 text-sm md:text-base text-gray-400">
                <span className="flex items-center gap-2">
                  <span>🎯</span>
                  <span>360° Views</span>
                </span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-2">
                  <span>📸</span>
                  <span>High-Res Photos</span>
                </span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-2">
                  <span>🎬</span>
                  <span>Interactive</span>
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Mock 360 views - in production, these would be actual 360° images
  const views = [
    {
      id: 1,
      name: 'Entrance View',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200',
      hotspots: [
        { x: 30, y: 50, label: 'Main Gate', link: 1 },
        { x: 70, y: 60, label: 'Parking Area', link: 2 }
      ]
    },
    {
      id: 2,
      name: 'Main Area',
      image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200',
      hotspots: [
        { x: 20, y: 40, label: 'Nature Trail', link: 2 },
        { x: 80, y: 55, label: 'Viewpoint', link: 3 }
      ]
    },
    {
      id: 3,
      name: 'Scenic Viewpoint',
      image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200',
      hotspots: [
        { x: 50, y: 70, label: 'Back to Main', link: 1 }
      ]
    }
  ]

  const currentViewData = views[currentView]

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') navigateView(-1)
      if (e.key === 'ArrowRight') navigateView(1)
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'auto'
    }
  }, [isOpen, currentView]) // eslint-disable-line react-hooks/exhaustive-deps

  const navigateView = (direction) => {
    setCurrentView((prev) => {
      const next = prev + direction
      if (next < 0) return views.length - 1
      if (next >= views.length) return 0
      return next
    })
  }

  const handleMouseDown = (e) => {
    setIsDragging(true)
    setStartPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    
    setRotation(prev => ({
      x: Math.max(-30, Math.min(30, prev.x + deltaY * 0.1)),
      y: (prev.y + deltaX * 0.1) % 360
    }))
    
    setStartPos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const toggleFullscreen = () => {
    if (!fullscreen && containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen()
    }
    setFullscreen(!fullscreen)
  }

  const handleHotspotClick = (link) => {
    setCurrentView(link)
  }

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
        <div className="absolute top-6 left-6 z-50 text-white">
          <h2 className="text-2xl font-bold mb-1">{place?.name || 'Virtual Tour'}</h2>
          <p className="text-sm opacity-75">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 bg-beige-600 rounded-full animate-pulse"></span>
              {currentViewData.name}
            </span>
          </p>
        </div>

        {/* Main 360° Viewer */}
        <motion.div
          className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentViewData.image})`,
              filter: 'brightness(0.9)'
            }}
          />

          {/* Hotspots */}
          {currentViewData.hotspots.map((hotspot, index) => (
            <motion.button
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="absolute w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-125 transition-all group"
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => handleHotspotClick(hotspot.link)}
            >
              <span className="text-2xl">👁️</span>
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                {hotspot.label}
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
            </motion.button>
          ))}

          {/* Guide Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: isDragging ? 0 : 0.5 }}
              className="text-center text-white"
            >
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-black/50 backdrop-blur-sm rounded-full mb-4">
                <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span className="text-sm font-semibold">Drag to look around</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Navigation Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4">
          {/* Previous */}
          <button
            onClick={() => navigateView(-1)}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* View Thumbnails */}
          <div className="flex gap-2">
            {views.map((view, index) => (
              <button
                key={view.id}
                onClick={() => setCurrentView(index)}
                className={`relative overflow-hidden rounded-lg transition-all ${
                  currentView === index
                    ? 'w-32 h-20 ring-4 ring-cyan-400'
                    : 'w-20 h-12 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={view.image}
                  alt={view.name}
                  className="w-full h-full object-cover"
                />
                {currentView === index && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                    <span className="text-white text-xs font-semibold">{view.name}</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => navigateView(1)}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Control Panel */}
        <div className="absolute bottom-8 right-8 z-50 flex flex-col gap-3">
          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            title="Toggle Fullscreen"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>

          {/* Info */}
          <button
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            title="Information"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Share */}
          <button
            className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all"
            title="Share Virtual Tour"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="absolute bottom-8 left-8 z-50 text-white/60 text-xs">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-3 space-y-1">
            <p><kbd className="px-2 py-1 bg-white/10 rounded">←</kbd> <kbd className="px-2 py-1 bg-white/10 rounded">→</kbd> Navigate</p>
            <p><kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd> Close</p>
            <p><kbd className="px-2 py-1 bg-white/10 rounded">Drag</kbd> Look around</p>
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




