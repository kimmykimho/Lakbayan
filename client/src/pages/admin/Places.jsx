import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminPlaces() {
    const [places, setPlaces] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [showModal, setShowModal] = useState(false)
    const [selectedPlace, setSelectedPlace] = useState(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [placeToDelete, setPlaceToDelete] = useState(null)
    const [saving, setSaving] = useState(false)
    const [isEditMode, setIsEditMode] = useState(false)
    const [imageUrl, setImageUrl] = useState('')
    const [imageInputMode, setImageInputMode] = useState('upload') // 'upload' or 'url'

    const initialPlaceData = {
        name: '',
        description: '',
        category: 'nature',
        images: [],
        location: {
            address: '',
            barangay: '',
            city: 'Kitcharao',
            province: 'Agusan del Norte',
            coordinates: { lat: 9.4550, lng: 125.5731 }
        },
        contact: {
            phone: '',
            email: ''
        },
        amenities: [],
        activities: [],
        highlights: [],
        status: 'active',
        featured: false,
        // Category-specific fields
        pricing: {
            entranceFee: 0,
            isFree: true,
            pricePerNight: 0
        },
        menu: [],
        accommodation: {
            pricePerNight: 0,
            roomTypes: [],
            checkInTime: '14:00',
            checkOutTime: '12:00'
        },
        shop: {
            categories: [],
            details: '',
            products: []
        },
        ownerEmail: ''
    }

    const [newPlaceData, setNewPlaceData] = useState(initialPlaceData)

    // Categories matching database schema
    const categories = [
        { value: 'nature', label: '🏞️ Nature' },
        { value: 'adventure', label: '🏔️ Adventure' },
        { value: 'food', label: '🍽️ Food' },
        { value: 'shopping', label: '🛍️ Shopping' },
        { value: 'accommodation', label: '🏨 Accommodation' }
    ]

    // Kitcharao barangays
    const barangays = [
        'Bangayan',
        'Canaway',
        'Crossing',
        'Hinimbangan',
        'Jaliobong',
        'Mahayahay',
        'Poblacion',
        'San Isidro',
        'San Roque',
        'Sangay',
        'Crossing Luna'
    ]

    useEffect(() => {
        fetchPlaces()
    }, [])

    const fetchPlaces = async () => {
        try {
            setLoading(true)
            const response = await api.get('/places/admin/all')
            setPlaces(response.data.data || [])
        } catch (error) {
            toast.error('Failed to fetch places')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleViewPlace = async (placeSummary) => {
        try {
            // Show loading toast if you want, or just wait
            // Fetch FULL place details because list view has incomplete data
            const response = await api.get(`/places/${placeSummary.id}`)
            // Handle both structure formats (some APIs return data directly, others data.data)
            const place = response.data.data || response.data

            // Open edit modal with FULL place data
            setIsEditMode(true)
            setSelectedPlace(place)
            setNewPlaceData({
                name: place.name || '',
                description: place.description || '',
                category: place.category || 'nature',
                images: place.images || [],
                location: {
                    address: place.location?.address || '',
                    barangay: place.location?.barangay || '',
                    city: place.location?.city || 'Kitcharao',
                    province: place.location?.province || 'Agusan del Norte',
                    coordinates: {
                        lat: place.location?.coordinates?.lat || 9.4550,
                        lng: place.location?.coordinates?.lng || 125.5731
                    }
                },
                contact: {
                    phone: place.contact?.phone || '',
                    email: place.contact?.email || ''
                },
                amenities: place.amenities || [],
                activities: place.activities || [],
                highlights: place.highlights || [],
                status: place.status || 'active',
                status: place.status || 'active',
                featured: place.featured || false,
                ownerEmail: place.owner_email || '',
                // Ensure other fields are mapped if needed
                pricing: place.pricing || { entranceFee: 0, isFree: true, pricePerNight: 0 },
                menu: place.menu || [],
                shop: place.shop || { categories: [], details: '', products: [] },
                accommodation: place.accommodation || { pricePerNight: 0, roomTypes: [], checkInTime: '14:00', checkOutTime: '12:00' }
            })
            // Set image URL to empty as we are editing existing images
            setImageUrl('')
            setShowCreateModal(true)
        } catch (error) {
            console.error('Error fetching details:', error)
            toast.error('Failed to load place details')
        }
    }

    const handleOpenCreateModal = () => {
        setIsEditMode(false)
        setSelectedPlace(null)
        setNewPlaceData(initialPlaceData)
        setImageUrl('')
        setImageInputMode('upload')
        setShowCreateModal(true)
    }

    const handleSavePlace = async () => {
        if (!newPlaceData.name || !newPlaceData.description) {
            toast.error('Name and description are required')
            return
        }

        try {
            setSaving(true)

            if (isEditMode && selectedPlace) {
                // Update existing place
                await api.put(`/places/${selectedPlace.id}`, newPlaceData)
                toast.success('Place updated successfully!')
            } else {
                // Create new place
                await api.post('/places', newPlaceData)
                toast.success('Place created successfully!')
            }

            setShowCreateModal(false)
            setIsEditMode(false)
            setSelectedPlace(null)
            setNewPlaceData(initialPlaceData)
            setImageUrl('')
            fetchPlaces()
        } catch (error) {
            toast.error(isEditMode ? 'Failed to update place' : 'Failed to create place')
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleAddImage = () => {
        if (imageUrl.trim()) {
            setNewPlaceData({
                ...newPlaceData,
                images: [...newPlaceData.images, imageUrl.trim()]
            })
            setImageUrl('')
        }
    }

    const handleRemoveImage = (index) => {
        setNewPlaceData({
            ...newPlaceData,
            images: newPlaceData.images.filter((_, i) => i !== index)
        })
    }

    const handleToggleFeatured = async (placeId, currentFeatured) => {
        try {
            await api.put(`/places/${placeId}`, { featured: !currentFeatured })
            toast.success(currentFeatured ? 'Removed from featured' : 'Added to featured')
            fetchPlaces()
        } catch (error) {
            toast.error('Failed to update place')
        }
    }

    const handleToggleStatus = async (placeId, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
        try {
            await api.put(`/places/${placeId}`, { status: newStatus })
            toast.success(`Place ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
            fetchPlaces()
        } catch (error) {
            toast.error('Failed to update status')
        }
    }

    const handleDeletePlace = async () => {
        if (!placeToDelete) return
        try {
            await api.delete(`/places/${placeToDelete.id}`)
            toast.success('Place deleted successfully')
            setShowDeleteConfirm(false)
            setPlaceToDelete(null)
            fetchPlaces()
        } catch (error) {
            toast.error('Failed to delete place')
        }
    }

    const filteredPlaces = places.filter(place => {
        const matchesSearch = place.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            place.description?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = filterCategory === 'all' || place.category === filterCategory
        const matchesStatus = filterStatus === 'all' || place.status === filterStatus
        return matchesSearch && matchesCategory && matchesStatus
    })

    const getCategoryIcon = (category) => {
        const icons = {
            nature: '🏞️',
            cultural: '🏛️',
            beach: '🏖️',
            food: '🍽️',
            adventure: '🏔️',
            historical: '🏛️',
            shopping: '🛍️',
            accommodation: '🏨'
        }
        return icons[category] || '📍'
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Places Management</h1>
                    <p className="text-gray-600">{places.length} total places</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                >
                    <span>➕</span> Add New Place
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search places..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Places Cards Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlaces.map((place, index) => (
                    <motion.div
                        key={place.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all overflow-hidden group"
                    >
                        {/* Image/Icon */}
                        <div className="h-48 relative overflow-hidden">
                            {place.images?.[0] ? (
                                <img
                                    src={place.images[0]}
                                    alt={place.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                            ) : (
                                <div className="h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300">
                                    {getCategoryIcon(place.category)}
                                </div>
                            )}

                            {/* Featured Badge */}
                            {place.featured && (
                                <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold">
                                    ⭐ Featured
                                </div>
                            )}

                            {/* Status Badge */}
                            <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold ${place.status === 'active'
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                                }`}>
                                {place.status === 'active' ? '✓ Active' : '✗ Inactive'}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                        {place.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 line-clamp-1">
                                        {place.location?.address || 'No address'}
                                    </p>
                                </div>
                            </div>

                            {/* Category & Rating */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                    {getCategoryIcon(place.category)} {place.category}
                                </span>
                                <div className="flex items-center gap-1 text-sm">
                                    <span className="text-yellow-400">⭐</span>
                                    <span className="font-medium">{place.rating?.average?.toFixed(1) || '0.0'}</span>
                                    <span className="text-gray-400">({place.rating?.count || 0})</span>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {place.description || 'No description available'}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleViewPlace(place)}
                                    className="flex-1 px-3 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors text-sm flex items-center justify-center gap-1"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => handleToggleFeatured(place.id, place.featured)}
                                    className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${place.featured
                                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    title={place.featured ? 'Remove from featured' : 'Add to featured'}
                                >
                                    {place.featured ? '⭐' : '☆'}
                                </button>
                                <button
                                    onClick={() => handleToggleStatus(place.id, place.status)}
                                    className={`px-3 py-2 rounded-xl font-medium transition-colors text-sm ${place.status === 'active'
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                                        }`}
                                    title={place.status === 'active' ? 'Deactivate' : 'Activate'}
                                >
                                    {place.status === 'active' ? '✓' : '✗'}
                                </button>
                                <button
                                    onClick={() => {
                                        setPlaceToDelete(place)
                                        setShowDeleteConfirm(true)
                                    }}
                                    className="px-3 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-colors text-sm"
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredPlaces.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-gray-500 text-lg">No places found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or add a new place</p>
                </div>
            )}

            {/* Create/Edit Place Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {isEditMode ? '✏️ Edit Place' : '➕ Add New Place'}
                                    </h2>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {/* Basic Info Section */}
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">📝 Basic Information</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                            <input
                                                type="text"
                                                value={newPlaceData.name}
                                                onChange={(e) => setNewPlaceData({ ...newPlaceData, name: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Enter place name"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                                            <textarea
                                                value={newPlaceData.description}
                                                onChange={(e) => setNewPlaceData({ ...newPlaceData, description: e.target.value })}
                                                rows={4}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Enter detailed description"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                                <select
                                                    value={newPlaceData.category}
                                                    onChange={(e) => setNewPlaceData({ ...newPlaceData, category: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                >
                                                    {categories.map(cat => (
                                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                                <select
                                                    value={newPlaceData.status}
                                                    onChange={(e) => setNewPlaceData({ ...newPlaceData, status: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="active">✓ Active</option>
                                                    <option value="inactive">✗ Inactive</option>
                                                    <option value="maintenance">🔧 Maintenance</option>
                                                    <option value="closed">🚫 Closed</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location Section */}
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">📍 Location</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                                            <select
                                                value={newPlaceData.location.barangay}
                                                onChange={(e) => setNewPlaceData({
                                                    ...newPlaceData,
                                                    location: { ...newPlaceData.location, barangay: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">Select Barangay</option>
                                                {barangays.map(brgy => (
                                                    <option key={brgy} value={brgy}>{brgy}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address/Landmark</label>
                                            <input
                                                type="text"
                                                value={newPlaceData.location.address}
                                                onChange={(e) => setNewPlaceData({
                                                    ...newPlaceData,
                                                    location: { ...newPlaceData.location, address: e.target.value }
                                                })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                placeholder="Enter street address or landmark"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    value={newPlaceData.location.coordinates.lat}
                                                    onChange={(e) => setNewPlaceData({
                                                        ...newPlaceData,
                                                        location: {
                                                            ...newPlaceData.location,
                                                            coordinates: { ...newPlaceData.location.coordinates, lat: parseFloat(e.target.value) || 0 }
                                                        }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                                <input
                                                    type="number"
                                                    step="0.0001"
                                                    value={newPlaceData.location.coordinates.lng}
                                                    onChange={(e) => setNewPlaceData({
                                                        ...newPlaceData,
                                                        location: {
                                                            ...newPlaceData.location,
                                                            coordinates: { ...newPlaceData.location.coordinates, lng: parseFloat(e.target.value) || 0 }
                                                        }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Owner Account Section */}
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">👤 Owner Account</h3>
                                        <p className="text-sm text-gray-500">Link this place to a business owner account by entering their email.</p>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Email</label>
                                            <input
                                                type="email"
                                                value={newPlaceData.ownerEmail || ''}
                                                onChange={(e) => setNewPlaceData({ ...newPlaceData, ownerEmail: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                placeholder="registered.user@gmail.com"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact Section */}
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">📞 Contact Information</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                <input
                                                    type="text"
                                                    value={newPlaceData.contact?.phone || ''}
                                                    onChange={(e) => setNewPlaceData({
                                                        ...newPlaceData,
                                                        contact: { ...newPlaceData.contact, phone: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                    placeholder="09XX XXX XXXX"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={newPlaceData.contact?.email || ''}
                                                    onChange={(e) => setNewPlaceData({
                                                        ...newPlaceData,
                                                        contact: { ...newPlaceData.contact, email: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                    placeholder="email@example.com"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Images Section */}
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                                        <h3 className="font-semibold text-gray-700 flex items-center gap-2">🖼️ Images</h3>

                                        {/* Tab buttons */}
                                        <div className="flex gap-2 border-b border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setImageInputMode('upload')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors ${imageInputMode === 'upload'
                                                    ? 'text-primary border-b-2 border-primary'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                📁 Upload File
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setImageInputMode('url')}
                                                className={`px-4 py-2 text-sm font-medium transition-colors ${imageInputMode === 'url'
                                                    ? 'text-primary border-b-2 border-primary'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                🔗 URL Link
                                            </button>
                                        </div>

                                        {/* File Upload */}
                                        {imageInputMode === 'upload' && (
                                            <div className="space-y-2">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files)
                                                        files.forEach(file => {
                                                            const reader = new FileReader()
                                                            reader.onloadend = () => {
                                                                setNewPlaceData(prev => ({
                                                                    ...prev,
                                                                    images: [...prev.images, reader.result]
                                                                }))
                                                            }
                                                            reader.readAsDataURL(file)
                                                        })
                                                        e.target.value = '' // Reset input
                                                    }}
                                                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg focus:border-primary cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-dark"
                                                />
                                                <p className="text-xs text-gray-500">
                                                    Supports: JPG, PNG, GIF, WebP. Multiple files allowed.
                                                </p>
                                            </div>
                                        )}

                                        {/* URL Input */}
                                        {imageInputMode === 'url' && (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={imageUrl}
                                                    onChange={(e) => setImageUrl(e.target.value)}
                                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    placeholder="https://example.com/image.jpg"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleAddImage}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        )}

                                        {/* Image Previews */}
                                        {newPlaceData.images.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-sm font-medium text-gray-600">{newPlaceData.images.length} image(s) added</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {newPlaceData.images.map((img, index) => (
                                                        <div key={index} className="relative group">
                                                            <img
                                                                src={img}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-20 object-cover rounded-lg border-2 border-gray-200"
                                                                onError={(e) => {
                                                                    e.target.src = 'https://via.placeholder.com/150?text=Invalid+URL'
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveImage(index)}
                                                                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                            >
                                                                ✕
                                                            </button>
                                                            {img.startsWith('data:') && (
                                                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">
                                                                    Uploaded
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Category-Specific Fields */}
                                    {/* Food Category - Menu Items */}
                                    {newPlaceData.category === 'food' && (
                                        <div className="bg-orange-50 rounded-lg p-4 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-gray-700 flex items-center gap-2">🍽️ Menu Items</h3>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = prompt('Enter menu item name:')
                                                        if (!name) return
                                                        const description = prompt('Enter description:') || ''
                                                        const recipe = prompt('Enter recipe/ingredients:') || ''
                                                        const price = parseFloat(prompt('Enter price (PHP):') || '0')
                                                        const category = prompt('Category (appetizer/main/dessert/drinks):') || 'main'
                                                        setNewPlaceData(prev => ({
                                                            ...prev,
                                                            menu: [...(prev.menu || []), { name, description, recipe, price, category, isAvailable: true }]
                                                        }))
                                                    }}
                                                    className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                                                >
                                                    + Add Item
                                                </button>
                                            </div>
                                            {(newPlaceData.menu || []).length > 0 ? (
                                                <div className="space-y-2">
                                                    {newPlaceData.menu.map((item, index) => (
                                                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{item.name}</p>
                                                                <p className="text-sm text-gray-500">{item.description}</p>
                                                                {item.recipe && <p className="text-xs text-orange-600 mt-1">Recipe: {item.recipe}</p>}
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-primary">₱{item.price}</p>
                                                                <p className="text-xs text-gray-400">{item.category}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewPlaceData(prev => ({
                                                                    ...prev,
                                                                    menu: prev.menu.filter((_, i) => i !== index)
                                                                }))}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center py-4">No menu items added yet</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Accommodation Category - Room Types & Pricing */}
                                    {newPlaceData.category === 'accommodation' && (
                                        <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">🏨 Accommodation Details</h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Night (₱)</label>
                                                    <input
                                                        type="number"
                                                        value={newPlaceData.accommodation?.pricePerNight || newPlaceData.pricing?.pricePerNight || 0}
                                                        onChange={(e) => setNewPlaceData(prev => ({
                                                            ...prev,
                                                            accommodation: { ...prev.accommodation, pricePerNight: parseFloat(e.target.value) || 0 },
                                                            pricing: { ...prev.pricing, pricePerNight: parseFloat(e.target.value) || 0 }
                                                        }))}
                                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in / Check-out</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="time"
                                                            value={newPlaceData.accommodation?.checkInTime || '14:00'}
                                                            onChange={(e) => setNewPlaceData(prev => ({
                                                                ...prev,
                                                                accommodation: { ...prev.accommodation, checkInTime: e.target.value }
                                                            }))}
                                                            className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm"
                                                        />
                                                        <input
                                                            type="time"
                                                            value={newPlaceData.accommodation?.checkOutTime || '12:00'}
                                                            onChange={(e) => setNewPlaceData(prev => ({
                                                                ...prev,
                                                                accommodation: { ...prev.accommodation, checkOutTime: e.target.value }
                                                            }))}
                                                            className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">Room Types</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = prompt('Room type name (e.g., Deluxe, Suite):')
                                                        if (!name) return
                                                        const capacity = parseInt(prompt('Capacity (guests):') || '2')
                                                        const price = parseFloat(prompt('Price per night (₱):') || '0')
                                                        setNewPlaceData(prev => ({
                                                            ...prev,
                                                            accommodation: {
                                                                ...prev.accommodation,
                                                                roomTypes: [...(prev.accommodation?.roomTypes || []), { name, capacity, price, amenities: [] }]
                                                            }
                                                        }))
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
                                                >
                                                    + Add Room
                                                </button>
                                            </div>
                                            {(newPlaceData.accommodation?.roomTypes || []).length > 0 ? (
                                                <div className="space-y-2">
                                                    {newPlaceData.accommodation.roomTypes.map((room, index) => (
                                                        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-gray-900">{room.name}</p>
                                                                <p className="text-sm text-gray-500">Capacity: {room.capacity} guests</p>
                                                            </div>
                                                            <p className="font-bold text-primary">₱{room.price}/night</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewPlaceData(prev => ({
                                                                    ...prev,
                                                                    accommodation: {
                                                                        ...prev.accommodation,
                                                                        roomTypes: prev.accommodation.roomTypes.filter((_, i) => i !== index)
                                                                    }
                                                                }))}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center py-2">No room types added</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Shopping Category - Products */}
                                    {newPlaceData.category === 'shopping' && (
                                        <div className="bg-purple-50 rounded-lg p-4 space-y-4">
                                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">🛍️ Shop Details</h3>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Shop Description</label>
                                                <textarea
                                                    value={newPlaceData.shop?.details || ''}
                                                    onChange={(e) => setNewPlaceData(prev => ({
                                                        ...prev,
                                                        shop: { ...prev.shop, details: e.target.value }
                                                    }))}
                                                    rows={2}
                                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary"
                                                    placeholder="Describe what the shop offers..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Shop Categories</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Clothing', 'Electronics', 'Groceries', 'Souvenirs', 'Crafts', 'Jewelry', 'Home Decor'].map(cat => (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => {
                                                                const current = newPlaceData.shop?.categories || []
                                                                const updated = current.includes(cat)
                                                                    ? current.filter(c => c !== cat)
                                                                    : [...current, cat]
                                                                setNewPlaceData(prev => ({
                                                                    ...prev,
                                                                    shop: { ...prev.shop, categories: updated }
                                                                }))
                                                            }}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${(newPlaceData.shop?.categories || []).includes(cat)
                                                                ? 'bg-purple-500 text-white'
                                                                : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
                                                                }`}
                                                        >
                                                            {cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-700">Products</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const name = prompt('Product name:')
                                                        if (!name) return
                                                        const description = prompt('Description:') || ''
                                                        const price = parseFloat(prompt('Price (₱):') || '0')
                                                        const category = prompt('Category:') || 'General'
                                                        setNewPlaceData(prev => ({
                                                            ...prev,
                                                            shop: {
                                                                ...prev.shop,
                                                                products: [...(prev.shop?.products || []), { name, description, price, category }]
                                                            }
                                                        }))
                                                    }}
                                                    className="px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600"
                                                >
                                                    + Add Product
                                                </button>
                                            </div>
                                            {(newPlaceData.shop?.products || []).length > 0 ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {newPlaceData.shop.products.map((product, index) => (
                                                        <div key={index} className="p-3 bg-white rounded-lg border relative group">
                                                            <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                                                            <p className="text-xs text-gray-500">{product.category}</p>
                                                            <p className="font-bold text-primary text-sm mt-1">₱{product.price}</p>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewPlaceData(prev => ({
                                                                    ...prev,
                                                                    shop: {
                                                                        ...prev.shop,
                                                                        products: prev.shop.products.filter((_, i) => i !== index)
                                                                    }
                                                                }))}
                                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 text-center py-2">No products added</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Nature/Adventure Category - Pricing */}
                                    {(newPlaceData.category === 'nature' || newPlaceData.category === 'adventure') && (
                                        <div className="bg-green-50 rounded-lg p-4 space-y-4">
                                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">💰 Pricing</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="flex items-center gap-2 mb-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={newPlaceData.pricing?.isFree || false}
                                                            onChange={(e) => setNewPlaceData(prev => ({
                                                                ...prev,
                                                                pricing: { ...prev.pricing, isFree: e.target.checked, entranceFee: e.target.checked ? 0 : prev.pricing?.entranceFee }
                                                            }))}
                                                            className="w-4 h-4 rounded"
                                                        />
                                                        <span className="text-sm font-medium text-gray-700">Free Entrance</span>
                                                    </label>
                                                    {!newPlaceData.pricing?.isFree && (
                                                        <input
                                                            type="number"
                                                            value={newPlaceData.pricing?.entranceFee || 0}
                                                            onChange={(e) => setNewPlaceData(prev => ({
                                                                ...prev,
                                                                pricing: { ...prev.pricing, entranceFee: parseFloat(e.target.value) || 0 }
                                                            }))}
                                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                                            placeholder="Entrance fee (₱)"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Featured Toggle */}
                                    <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newPlaceData.featured}
                                                onChange={(e) => setNewPlaceData({ ...newPlaceData, featured: e.target.checked })}
                                                className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">⭐ Mark as Featured Place</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSavePlace}
                                        disabled={saving}
                                        className="flex-1 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-medium"
                                    >
                                        {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Place')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && placeToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-2xl max-w-md w-full p-6"
                        >
                            <div className="text-center">
                                <div className="text-5xl mb-4">⚠️</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Place?</h3>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete "{placeToDelete.name}"? This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowDeleteConfirm(false)
                                            setPlaceToDelete(null)
                                        }}
                                        className="flex-1 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeletePlace}
                                        className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
