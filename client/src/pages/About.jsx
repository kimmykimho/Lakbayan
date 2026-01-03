import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import ImageCarousel from '../components/ImageCarousel'
import useDataCache from '../store/dataCache'

export default function About() {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('all')

    // Use cache store
    const { getAboutItems, setAboutItems: setCachedAbout, setAboutItemsLoading } = useDataCache()

    const categories = [
        { id: 'all', name: 'All', icon: '🏛️' },
        { id: 'heritage', name: 'Heritage', icon: '🏺' },
        { id: 'culture', name: 'Culture', icon: '🎭' },
        { id: 'landmark', name: 'Landmarks', icon: '🗿' },
        { id: 'history', name: 'History', icon: '📜' },
        { id: 'events', name: 'Events', icon: '📅' },
        { id: 'achievements', name: 'Achievements', icon: '🏆' }
    ]

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        // Check cache first
        const cachedData = getAboutItems()
        if (cachedData && cachedData.length > 0) {
            console.log('📦 Using cached about items')
            setItems(cachedData)
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setAboutItemsLoading(true)
            const response = await api.get('/about')
            const data = response.data.data || []

            if (data.length > 0) {
                console.log('📦 Caching', data.length, 'about items')
                setCachedAbout(data)
            }

            setItems(data)
        } catch (error) {
            console.error('Failed to fetch about items:', error)
            // Try stale cache on error
            const staleCache = useDataCache.getState().aboutItems
            if (staleCache && staleCache.length > 0) {
                console.log('📦 Using stale cache due to error')
                setItems(staleCache)
            } else {
                setItems([])
            }
        } finally {
            setLoading(false)
            setAboutItemsLoading(false)
        }
    }

    const filteredItems = items.filter(item =>
        selectedCategory === 'all' || item.category === selectedCategory
    )

    const getGradient = (category) => {
        const gradients = {
            heritage: 'from-amber-500 to-orange-600',
            culture: 'from-violet-500 to-purple-600',
            landmark: 'from-emerald-500 to-teal-600',
            history: 'from-blue-500 to-indigo-600'
        }
        return gradients[category] || 'from-primary to-primary-dark'
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-primary via-primary-dark to-amber-700 text-white py-8 sm:py-10 lg:py-12 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
                            About Kitcharao
                        </h1>
                        <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto">
                            Discover the rich heritage, vibrant culture, and historical landmarks
                        </p>
                    </motion.div>
                </div>
            </div>

            {/* Category Filter */}
            <div className="bg-white shadow-sm border-b">
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 min-w-max lg:justify-center lg:min-w-0 lg:max-w-7xl lg:mx-auto">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`flex-shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base ${selectedCategory === category.id
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-beige-400'
                                    }`}
                            >
                                <span className="text-base sm:text-xl">{category.icon}</span>
                                <span className="whitespace-nowrap">{category.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🏛️</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Content Yet</h3>
                        <p className="text-gray-600">Check back soon for more about Kitcharao!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredItems.map((item, index) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group"
                            >
                                <Link
                                    to={`/about/${item.slug || item.id}`}
                                    className="block bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
                                >
                                    {/* Image */}
                                    <div className="relative h-40 sm:h-48 md:h-56">
                                        {(item.image || item.images?.[0]) ? (
                                            <img
                                                src={item.image || (typeof item.images?.[0] === 'object' ? item.images?.[0]?.url : item.images?.[0])}
                                                alt={item.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => {
                                                    e.target.src = 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=800'
                                                }}
                                            />
                                        ) : (
                                            <div className={`w-full h-full bg-gradient-to-br ${getGradient(item.category)} flex items-center justify-center`}>
                                                <span className="text-6xl">🏛️</span>
                                            </div>
                                        )}

                                        {/* Category Badge */}
                                        <div className="absolute top-3 left-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getGradient(item.category)}`}>
                                                {categories.find(c => c.id === item.category)?.name || 'Heritage'}
                                            </span>
                                        </div>

                                        {/* Featured Badge */}
                                        {item.featured && (
                                            <div className="absolute top-3 right-3">
                                                <span className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                                                    ⭐ Featured
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-1">
                                            {item.title}
                                        </h3>

                                        {/* Event/Achievement Date Display */}
                                        {(item.category === 'events' || item.category === 'achievements') && item.event_date?.start && (
                                            <div className={`flex items-center gap-2 mb-2 text-sm px-3 py-1.5 rounded-lg ${item.category === 'achievements'
                                                ? 'text-amber-600 bg-amber-50'
                                                : 'text-blue-600 bg-blue-50'
                                                }`}>
                                                <span>{item.category === 'achievements' ? '🏆' : '📅'}</span>
                                                <span className="font-medium">
                                                    {new Date(item.event_date.start).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                    {item.category === 'events' && item.event_date.end && (
                                                        <span>
                                                            {' - '}
                                                            {new Date(item.event_date.end).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        )}

                                        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                                            {item.description}
                                        </p>

                                        {/* View Details Button */}
                                        <div className="flex items-center text-primary font-medium text-sm">
                                            <span>Learn More</span>
                                            <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                            Discover Kitcharao's Story
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            From the indigenous Manobo culture to modern developments, Kitcharao holds a rich tapestry of stories waiting to be discovered.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-6">
                        {[
                            { icon: '🏺', title: 'Rich Heritage', desc: 'Centuries of cultural traditions preserved' },
                            { icon: '🎭', title: 'Living Culture', desc: 'Vibrant festivals and community celebrations' },
                            { icon: '🗿', title: 'Historic Sites', desc: 'Landmarks that tell our story' }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-xl p-6 shadow-md text-center"
                            >
                                <div className="text-4xl mb-3">{feature.icon}</div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-600 text-sm">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
