import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminAbout() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [saving, setSaving] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [imageUrl, setImageUrl] = useState('')
    const [videoUrl, setVideoUrl] = useState('')
    const [uploading, setUploading] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [linkForm, setLinkForm] = useState({ label: '', url: '' })
    const fileInputRef = useRef(null)

    const initialFormData = {
        title: '',
        description: '',
        category: 'heritage',
        images: [],
        video_urls: [],
        external_links: [],
        featured: false,
        status: 'active',
        event_date: { start: '', end: '' }
    }

    const [formData, setFormData] = useState(initialFormData)

    const categories = [
        { value: 'heritage', label: '🏺 Heritage', description: 'Historical artifacts and traditions' },
        { value: 'culture', label: '🎭 Culture', description: 'Festivals, customs, and practices' },
        { value: 'landmark', label: '🗿 Landmarks', description: 'Notable places and monuments' },
        { value: 'history', label: '📜 History', description: 'Historical events and stories' },
        { value: 'events', label: '📅 Events', description: 'Upcoming events and activities' },
        { value: 'achievements', label: '🏆 Achievements', description: 'Awards, recognitions, and milestones' }
    ]

    useEffect(() => {
        fetchItems()
    }, [])

    const fetchItems = async () => {
        try {
            setLoading(true)
            const response = await api.get('/about')
            setItems(response.data.data || [])
        } catch (error) {
            console.error('Failed to fetch about items:', error)
            toast.error('Failed to load about items')
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setEditingItem(null)
        setFormData(initialFormData)
        setImageUrl('')
        setVideoUrl('')
        setShowModal(true)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setFormData({
            title: item.title || '',
            description: item.description || '',
            category: item.category || 'heritage',
            images: item.images || [],
            video_urls: item.video_urls || [],
            external_links: item.external_links || [],
            featured: item.featured || false,
            status: item.status || 'active',
            event_date: item.event_date || { start: '', end: '' }
        })
        setImageUrl('')
        setVideoUrl('')
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingItem) {
                await api.put(`/about/${editingItem.id}`, formData)
                toast.success('Content updated successfully!')
            } else {
                await api.post('/about', formData)
                toast.success('Content created successfully!')
            }
            fetchItems()
            setShowModal(false)
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save content')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!itemToDelete) return

        try {
            await api.delete(`/about/${itemToDelete.id}`)
            toast.success('Content deleted successfully!')
            fetchItems()
            setShowDeleteConfirm(false)
            setItemToDelete(null)
        } catch (error) {
            toast.error('Failed to delete content')
        }
    }

    // Image handling
    const addImageUrl = () => {
        if (imageUrl.trim() && isValidUrl(imageUrl)) {
            setFormData({
                ...formData,
                images: [...formData.images, imageUrl.trim()]
            })
            setImageUrl('')
            toast.success('Image added!')
        } else {
            toast.error('Please enter a valid URL')
        }
    }

    const isValidUrl = (string) => {
        try {
            new URL(string)
            return true
        } catch (_) {
            return false
        }
    }

    const handleFileUpload = async (e) => {
        const files = e.target.files
        if (!files.length) return

        setUploading(true)
        const newImages = []

        try {
            for (const file of files) {
                // Convert to base64 for preview (in production, you'd upload to a storage service)
                const reader = new FileReader()
                const base64 = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result)
                    reader.readAsDataURL(file)
                })
                newImages.push(base64)
            }
            setFormData({
                ...formData,
                images: [...formData.images, ...newImages]
            })
            toast.success(`${files.length} image(s) added!`)
        } catch (error) {
            toast.error('Failed to upload images')
        } finally {
            setUploading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const removeImage = (index) => {
        setFormData({
            ...formData,
            images: formData.images.filter((_, i) => i !== index)
        })
        toast.success('Image removed')
    }

    const moveImage = (index, direction) => {
        const newImages = [...formData.images]
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= newImages.length) return
        [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]]
        setFormData({ ...formData, images: newImages })
    }

    // Video handling
    const addVideoUrl = () => {
        if (videoUrl.trim() && (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'))) {
            setFormData({
                ...formData,
                video_urls: [...formData.video_urls, videoUrl.trim()]
            })
            setVideoUrl('')
            toast.success('Video added!')
        } else {
            toast.error('Please enter a valid YouTube URL')
        }
    }

    const removeVideo = (index) => {
        setFormData({
            ...formData,
            video_urls: formData.video_urls.filter((_, i) => i !== index)
        })
    }

    // External links handling
    const openLinkModal = () => {
        setLinkForm({ label: '', url: '' })
        setShowLinkModal(true)
    }

    const addExternalLink = () => {
        if (linkForm.label.trim() && linkForm.url.trim()) {
            setFormData({
                ...formData,
                external_links: [...formData.external_links, { ...linkForm }]
            })
            setShowLinkModal(false)
            toast.success('Link added!')
        } else {
            toast.error('Please fill in both fields')
        }
    }

    const removeExternalLink = (index) => {
        setFormData({
            ...formData,
            external_links: formData.external_links.filter((_, i) => i !== index)
        })
    }

    const getYouTubeThumbnail = (url) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
        return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">About Kitcharao</h1>
                    <p className="text-gray-600 mt-1">Manage heritage, culture, and historical content</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Content
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="text-2xl font-bold text-gray-900">{items.length}</div>
                    <div className="text-sm text-gray-500">Total Items</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="text-2xl font-bold text-amber-600">{items.filter(i => i.featured).length}</div>
                    <div className="text-sm text-gray-500">Featured</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="text-2xl font-bold text-green-600">{items.filter(i => i.status === 'active').length}</div>
                    <div className="text-sm text-gray-500">Active</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border">
                    <div className="text-2xl font-bold text-purple-600">{new Set(items.map(i => i.category)).size}</div>
                    <div className="text-sm text-gray-500">Categories</div>
                </div>
            </div>

            {/* Items Grid */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl shadow-md">
                    <div className="text-6xl mb-4">🏛️</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Content Yet</h3>
                    <p className="text-gray-600 mb-6">Add heritage and cultural content to showcase Kitcharao's story</p>
                    <button
                        onClick={openCreateModal}
                        className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        Add First Content
                    </button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
                        >
                            <div className="h-44 relative overflow-hidden">
                                {item.images && item.images.length > 0 ? (
                                    <img
                                        src={item.images[0]}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => {
                                            e.target.src = 'https://images.unsplash.com/photo-1566127444979-b3d2b654e3d7?w=400'
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-5xl">
                                        🏛️
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Badges */}
                                <div className="absolute top-3 left-3 flex gap-2">
                                    <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-semibold capitalize shadow-sm">
                                        {categories.find(c => c.value === item.category)?.label.split(' ')[0]} {item.category}
                                    </span>
                                </div>
                                {item.featured && (
                                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-yellow-400 text-yellow-900 rounded-full text-xs font-bold shadow-sm">
                                        ⭐ Featured
                                    </div>
                                )}

                                {/* Image count */}
                                {item.images && item.images.length > 1 && (
                                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 text-white rounded-full text-xs">
                                        📷 {item.images.length}
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-gray-900 mb-1.5 line-clamp-1">{item.title}</h3>
                                <p className="text-gray-600 text-sm line-clamp-2 mb-4 min-h-[2.5rem]">{item.description}</p>

                                {/* Quick info */}
                                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                                    {item.video_urls?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <span>🎬</span> {item.video_urls.length} video{item.video_urls.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                    {item.external_links?.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <span>🔗</span> {item.external_links.length} link{item.external_links.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(item)}
                                        className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setItemToDelete(item)
                                            setShowDeleteConfirm(true)
                                        }}
                                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {editingItem ? '✏️ Edit Content' : '➕ Add New Content'}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {editingItem ? 'Update the content details below' : 'Fill in the details to create new content'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
                                <div className="space-y-6">
                                    {/* Title & Category Row */}
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Title <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                                                placeholder="e.g., Kitcharao Heritage Museum"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none transition-all appearance-none bg-white"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Event/Achievement Dates - For Events and Achievements categories */}
                                    {(formData.category === 'events' || formData.category === 'achievements') && (
                                        <div className={`rounded-xl p-4 border-2 ${formData.category === 'achievements' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                                            <label className={`block text-sm font-semibold mb-3 ${formData.category === 'achievements' ? 'text-amber-700' : 'text-blue-700'}`}>
                                                {formData.category === 'achievements' ? '🏆 Achievement Date' : '📅 Event Dates'}
                                            </label>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        {formData.category === 'achievements' ? 'Date Achieved' : 'Start Date'} <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="datetime-local"
                                                        value={formData.event_date?.start || ''}
                                                        onChange={(e) => setFormData({
                                                            ...formData,
                                                            event_date: { ...formData.event_date, start: e.target.value }
                                                        })}
                                                        className={`w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none transition-all ${formData.category === 'achievements' ? 'focus:border-amber-500' : 'focus:border-blue-500'}`}
                                                    />
                                                </div>
                                                {formData.category === 'events' && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                                            End Date
                                                        </label>
                                                        <input
                                                            type="datetime-local"
                                                            value={formData.event_date?.end || ''}
                                                            onChange={(e) => setFormData({
                                                                ...formData,
                                                                event_date: { ...formData.event_date, end: e.target.value }
                                                            })}
                                                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-all"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <p className={`text-xs mt-2 ${formData.category === 'achievements' ? 'text-amber-600' : 'text-blue-600'}`}>
                                                {formData.category === 'achievements'
                                                    ? '💡 When was this achievement received?'
                                                    : '💡 Leave end date empty for single-day events'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Description */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Description <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all resize-none"
                                            placeholder="Describe the heritage, culture, or landmark in detail..."
                                        />
                                        <p className="text-xs text-gray-400 mt-1">{formData.description.length} characters</p>
                                    </div>

                                    {/* Images Section */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            📷 Images
                                        </label>

                                        {/* Upload options */}
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="px-4 py-2.5 bg-white border-2 border-dashed border-gray-300 hover:border-primary text-gray-600 hover:text-primary rounded-xl font-medium transition-all flex items-center gap-2"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                        Uploading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Upload Files
                                                    </>
                                                )}
                                            </button>

                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="url"
                                                    value={imageUrl}
                                                    onChange={(e) => setImageUrl(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                                                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                                                    placeholder="Or paste image URL..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={addImageUrl}
                                                    className="px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>

                                        {/* Image preview grid */}
                                        {formData.images.length > 0 ? (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                {formData.images.map((img, i) => (
                                                    <div key={i} className="relative group aspect-square">
                                                        <img
                                                            src={img}
                                                            alt={`Image ${i + 1}`}
                                                            className="w-full h-full object-cover rounded-lg ring-2 ring-transparent group-hover:ring-primary transition-all"
                                                            onError={(e) => {
                                                                e.target.src = 'https://via.placeholder.com/100?text=Error'
                                                            }}
                                                        />
                                                        {i === 0 && (
                                                            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary text-white text-[10px] font-bold rounded">
                                                                Cover
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                                                            {i > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => moveImage(i, 'up')}
                                                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-colors"
                                                                    title="Move left"
                                                                >
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImage(i)}
                                                                className="p-1.5 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                                                                title="Remove"
                                                            >
                                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                            {i < formData.images.length - 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => moveImage(i, 'down')}
                                                                    className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition-colors"
                                                                    title="Move right"
                                                                >
                                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-400">
                                                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <p className="text-sm">No images added yet</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Videos Section */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            🎬 YouTube Videos
                                        </label>
                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="url"
                                                value={videoUrl}
                                                onChange={(e) => setVideoUrl(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addVideoUrl())}
                                                className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none text-sm"
                                                placeholder="https://youtube.com/watch?v=..."
                                            />
                                            <button
                                                type="button"
                                                onClick={addVideoUrl}
                                                className="px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                                            >
                                                Add Video
                                            </button>
                                        </div>

                                        {formData.video_urls.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {formData.video_urls.map((url, i) => (
                                                    <div key={i} className="relative group">
                                                        <img
                                                            src={getYouTubeThumbnail(url)}
                                                            alt={`Video ${i + 1}`}
                                                            className="w-full aspect-video object-cover rounded-lg"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                                                                    <path d="M8 5v14l11-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeVideo(i)}
                                                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-500 text-white rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center py-4 text-gray-400 text-sm">No videos added</p>
                                        )}
                                    </div>

                                    {/* External Links Section */}
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-sm font-semibold text-gray-700">
                                                🔗 External Links
                                            </label>
                                            <button
                                                type="button"
                                                onClick={openLinkModal}
                                                className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                            >
                                                + Add Link
                                            </button>
                                        </div>

                                        {formData.external_links.length > 0 ? (
                                            <div className="space-y-2">
                                                {formData.external_links.map((link, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-sm text-gray-900">{link.label}</p>
                                                            <p className="text-xs text-gray-500 truncate">{link.url}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExternalLink(i)}
                                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center py-4 text-gray-400 text-sm">No external links added</p>
                                        )}
                                    </div>

                                    {/* Options Row */}
                                    <div className="flex flex-wrap items-center gap-6 pt-2">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.featured}
                                                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </div>
                                            <span className="font-medium text-gray-700">⭐ Featured Content</span>
                                        </label>

                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.status === 'active'}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'active' : 'inactive' })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                            </div>
                                            <span className="font-medium text-gray-700">✅ Active</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex gap-3 mt-8 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 px-4 py-3 border-2 border-gray-200 hover:bg-gray-50 rounded-xl font-semibold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-bold disabled:opacity-50 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                {editingItem ? 'Update Content' : 'Create Content'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Link Modal */}
            <AnimatePresence>
                {showLinkModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowLinkModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Add External Link</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={linkForm.label}
                                        onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        placeholder="e.g., Wikipedia Article"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                                    <input
                                        type="url"
                                        value={linkForm.url}
                                        onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowLinkModal(false)}
                                    className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addExternalLink}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-bold"
                                >
                                    Add Link
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowDeleteConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Content?</h3>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to delete "<span className="font-semibold">{itemToDelete?.title}</span>"? This action cannot be undone.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors"
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
