import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function PhotoGallery({ photos, title = 'Trip Photos' }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null)

  if (!photos || photos.length === 0) {
    return null
  }

  const getPhotoLabel = (photo) => {
    if (photo.type === 'pickup') return '📍 Pickup Location'
    if (photo.type === 'destination') return '🏁 Arrived at Destination'
    return '📸 Trip Photo'
  }

  return (
    <>
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {title}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="relative group cursor-pointer"
              onClick={() => setSelectedPhoto(photo)}
            >
              <img
                src={photo.url}
                alt={getPhotoLabel(photo)}
                className="w-full h-32 object-cover rounded-lg shadow-sm hover:shadow-lg transition-all"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/300x200?text=Photo+Error'
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-all flex items-center justify-center">
                <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg p-2">
                <p className="text-xs text-white font-semibold truncate">{getPhotoLabel(photo)}</p>
                {photo.uploadedAt && (
                  <p className="text-xs text-white/80">
                    {new Date(photo.uploadedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Full Screen Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white z-10 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={selectedPhoto.url}
                alt={getPhotoLabel(selectedPhoto)}
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600?text=Photo+Error'
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-lg p-4 text-white">
                <p className="text-lg font-bold">{getPhotoLabel(selectedPhoto)}</p>
                {selectedPhoto.uploadedAt && (
                  <p className="text-sm text-white/80">
                    Uploaded: {new Date(selectedPhoto.uploadedAt).toLocaleString()}
                  </p>
                )}
                {selectedPhoto.uploadedBy && (
                  <p className="text-sm text-white/80 capitalize">
                    By: {selectedPhoto.uploadedBy}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}




