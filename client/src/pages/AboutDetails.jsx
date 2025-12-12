import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'

export default function AboutDetails() {
    const { slug } = useParams()
    const navigate = useNavigate()
    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedImage, setSelectedImage] = useState(0)

    useEffect(() => {
        fetchItem()
    }, [slug])

    const fetchItem = async () => {
        try {
            setLoading(true)
            const response = await api.get(`/about/${slug}`)
            setItem(response.data.data)
        } catch (error) {
            console.error('Failed to fetch about item:', error)
            navigate('/about')
        } finally {
            setLoading(false)
        }
    }

    const getYouTubeId = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? match[1] : null
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!item) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Not Found</h2>
                    <Link to="/about" className="text-primary hover:underline">
                        Back to About
                    </Link>
                </div>
            </div>
        )
    }

    const images = item.images || []
    const videoUrls = item.video_urls || []
    const externalLinks = item.external_links || []

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Back Button */}
            <div className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => navigate('/about')}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="font-medium">Back to About Kitcharao</span>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-2 gap-8">
                    {/* Image Gallery */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {images.length > 0 ? (
                            <div className="space-y-4">
                                <div className="relative rounded-2xl overflow-hidden shadow-lg aspect-video bg-gray-100">
                                    <img
                                        src={typeof images[selectedImage] === 'object' ? images[selectedImage].url : images[selectedImage]}
                                        alt={item.title}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800'
                                        }}
                                    />
                                </div>

                                {images.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {images.map((img, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setSelectedImage(index)}
                                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-primary' : 'border-transparent'
                                                    }`}
                                            >
                                                <img
                                                    src={typeof img === 'object' ? img.url : img}
                                                    alt={`Thumbnail ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="rounded-2xl h-80 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                                <span className="text-8xl">🏛️</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        {/* Category Badge */}
                        <div>
                            <span className="px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-semibold capitalize">
                                {item.category || 'Heritage'}
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                            {item.title}
                        </h1>

                        {/* Description */}
                        <div className="prose prose-lg max-w-none">
                            <p className="text-gray-600 whitespace-pre-line">
                                {item.description}
                            </p>
                        </div>

                        {/* External Links */}
                        {externalLinks.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-3">Learn More</h3>
                                <div className="flex flex-wrap gap-2">
                                    {externalLinks.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                            <span className="text-sm font-medium">{link.label || 'Visit Link'}</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Video Section */}
                {videoUrls.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-12"
                    >
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Videos</h2>
                        <div className="grid sm:grid-cols-2 gap-6">
                            {videoUrls.map((url, index) => {
                                const youtubeId = getYouTubeId(url)
                                if (!youtubeId) return null

                                return (
                                    <div key={index} className="rounded-xl overflow-hidden shadow-lg aspect-video bg-gray-100">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${youtubeId}`}
                                            title={`Video ${index + 1}`}
                                            className="w-full h-full"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}
