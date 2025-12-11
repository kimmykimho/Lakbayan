import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import PropTypes from 'prop-types'

export default function ShareButton({ place, size = 'md' }) {
  const [showMenu, setShowMenu] = useState(false)

  const generateShareUrl = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/places/${place.id || place._id}?ref=share`
  }

  const handleCopyLink = () => {
    const url = generateShareUrl()
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard! 📋')
    setShowMenu(false)
  }

  const handleShareFacebook = () => {
    const url = generateShareUrl()
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
    setShowMenu(false)
  }

  const handleShareTwitter = () => {
    const url = generateShareUrl()
    const text = `Check out ${place.name} in Kitcharao! 🌴`
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank')
    setShowMenu(false)
  }

  const handleShareWhatsApp = () => {
    const url = generateShareUrl()
    const text = `Check out ${place.name} in Kitcharao! 🌴 ${url}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    setShowMenu(false)
  }

  const handleShareEmail = () => {
    const url = generateShareUrl()
    const subject = `Check out ${place.name}!`
    const body = `I thought you might be interested in visiting ${place.name} in Kitcharao!\n\n${place.description}\n\nVisit: ${url}`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setShowMenu(false)
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
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowMenu(!showMenu)}
        className={`${sizeClasses[size]} rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark transition-all flex items-center justify-center hover:shadow-xl`}
        title="Share this place"
      >
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />

            {/* Share Menu - Desktop: Dropdown, Mobile: Bottom Sheet */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed md:absolute bottom-0 md:bottom-full left-0 right-0 md:left-auto md:right-0 md:mb-2 bg-white rounded-t-3xl md:rounded-2xl shadow-2xl p-4 md:p-3 md:min-w-[200px] z-50 border-t md:border border-gray-100 max-h-[70vh] md:max-h-none overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-3 md:mb-2">
                <div className="text-sm md:text-xs font-semibold text-gray-700 md:text-gray-500 px-2">
                  Share this place
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-base md:text-sm font-medium text-gray-700">Copy Link</span>
                </button>

                <button
                  onClick={handleShareFacebook}
                  className="w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-xl hover:bg-blue-50 transition-colors text-left"
                >
                  <svg className="w-6 h-6 md:w-5 md:h-5" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-base md:text-sm font-medium text-gray-700">Facebook</span>
                </button>

                <button
                  onClick={handleShareTwitter}
                  className="w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <svg className="w-6 h-6 md:w-5 md:h-5" viewBox="0 0 24 24" fill="#000000">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  <span className="text-base md:text-sm font-medium text-gray-700">X (Twitter)</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-xl hover:bg-green-50 transition-colors text-left"
                >
                  <svg className="w-6 h-6 md:w-5 md:h-5" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-base md:text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                <button
                  onClick={handleShareEmail}
                  className="w-full flex items-center gap-3 px-3 py-3 md:py-2 rounded-xl hover:bg-gray-100 transition-colors text-left"
                >
                  <svg className="w-6 h-6 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-base md:text-sm font-medium text-gray-700">Email</span>
                </button>
              </div>

              {/* Safe area for mobile notch */}
              <div className="h-4 md:hidden" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

ShareButton.propTypes = {
  place: PropTypes.shape({
    id: PropTypes.string,
    _id: PropTypes.string,
    name: PropTypes.string.isRequired,
    description: PropTypes.string
  }).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
}




