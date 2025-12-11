import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function ApplyBusiness() {
    const navigate = useNavigate()
    const { isAuthenticated } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(true)
    const [existingApplication, setExistingApplication] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        businessInfo: {
            businessName: '',
            businessType: 'restaurant',
            category: 'food', // Maps to place category
            description: '',
            phone: '',
            email: '',
            website: ''
        },
        documents: [],
        address: {
            street: '',
            barangay: '',
            city: 'Kitcharao',
            province: 'Agusan del Norte',
            postalCode: '8601',
            fullAddress: ''
        },
        location: {
            coordinates: {
                lat: 9.4500,  // Default Kitcharao coordinates
                lng: 125.5700
            }
        },
        operatingHours: {
            monday: { open: '08:00', close: '17:00', closed: false },
            tuesday: { open: '08:00', close: '17:00', closed: false },
            wednesday: { open: '08:00', close: '17:00', closed: false },
            thursday: { open: '08:00', close: '17:00', closed: false },
            friday: { open: '08:00', close: '17:00', closed: false },
            saturday: { open: '08:00', close: '17:00', closed: false },
            sunday: { open: '08:00', close: '17:00', closed: true }
        }
    })

    const businessTypes = [
        { value: 'restaurant', label: 'Restaurant/Food', icon: '🍽️', category: 'food' },
        { value: 'hotel', label: 'Hotel/Resort', icon: '🏨', category: 'accommodation' },
        { value: 'shop', label: 'Shop/Store', icon: '🛍️', category: 'shopping' },
        { value: 'tour', label: 'Tour Services', icon: '🗺️', category: 'services' },
        { value: 'attraction', label: 'Tourist Attraction', icon: '🏞️', category: 'nature' },
        { value: 'other', label: 'Other', icon: '📋', category: 'services' }
    ]

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
        'Songkoy'
    ]

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

    // Check for existing application on component mount
    useEffect(() => {
        const checkExistingApplication = async () => {
            if (!isAuthenticated) {
                setCheckingStatus(false)
                return
            }
            try {
                const response = await api.get('/owners/my-application')
                if (response.data.success && response.data.data) {
                    setExistingApplication(response.data.data)
                }
            } catch (error) {
                // No existing application - show form
                console.log('No existing business application found')
            } finally {
                setCheckingStatus(false)
            }
        }
        checkExistingApplication()
    }, [isAuthenticated])

    // Generate full address when components change
    const updateFullAddress = (newAddress) => {
        const parts = [
            newAddress.street,
            newAddress.barangay ? `Brgy. ${newAddress.barangay}` : '',
            newAddress.city,
            newAddress.province,
            newAddress.postalCode
        ].filter(Boolean)
        return parts.join(', ')
    }

    const handleAddressChange = (field, value) => {
        const newAddress = { ...formData.address, [field]: value }
        newAddress.fullAddress = updateFullAddress(newAddress)
        setFormData({ ...formData, address: newAddress })
    }

    const handleBusinessTypeChange = (type) => {
        setFormData({
            ...formData,
            businessInfo: {
                ...formData.businessInfo,
                businessType: type.value,
                category: type.category
            }
        })
    }

    const handleOperatingHoursChange = (day, field, value) => {
        setFormData({
            ...formData,
            operatingHours: {
                ...formData.operatingHours,
                [day]: {
                    ...formData.operatingHours[day],
                    [field]: field === 'closed' ? value : value
                }
            }
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!isAuthenticated) {
            toast.error('Please login first to apply')
            navigate('/login')
            return
        }

        // Validation
        if (!formData.businessInfo.businessName) {
            toast.error('Please enter your business name')
            return
        }

        if (!formData.address.barangay) {
            toast.error('Please select a barangay')
            return
        }

        setLoading(true)
        try {
            const response = await api.post('/owners/apply', formData)
            if (response.data.success) {
                toast.success('Application submitted successfully! Please wait for admin approval.')
                navigate('/profile')
            }
        } catch (error) {
            console.error('Application error:', error)
            toast.error(error.response?.data?.message || 'Failed to submit application')
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-700 border-green-300'
            case 'rejected': return 'bg-red-100 text-red-700 border-red-300'
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300'
            default: return 'bg-gray-100 text-gray-700 border-gray-300'
        }
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved': return '✅'
            case 'rejected': return '❌'
            case 'pending': return '⏳'
            default: return '📋'
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
                    <p className="text-gray-600 mb-6">You need to be logged in to apply as a business owner.</p>
                    <Link
                        to="/login"
                        className="inline-block px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        Login Now
                    </Link>
                </div>
            </div>
        )
    }

    if (checkingStatus) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Show existing application status
    if (existingApplication && !showForm) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-2xl mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-xl p-8 text-center"
                    >
                        <div className="text-6xl mb-4">{getStatusIcon(existingApplication.verification_status || existingApplication.status)}</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Already Submitted</h2>

                        <div className={`inline-block px-4 py-2 rounded-full border-2 font-semibold mb-6 ${getStatusColor(existingApplication.verification_status || existingApplication.status)}`}>
                            Status: {(existingApplication.verification_status || existingApplication.status || 'pending').toUpperCase()}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                            <h3 className="font-semibold text-gray-900 mb-2">Application Details:</h3>
                            <div className="space-y-1 text-sm text-gray-600">
                                <p>🏢 Business: {existingApplication.business_info?.businessName || 'N/A'}</p>
                                <p>📍 Type: {existingApplication.business_info?.businessType || 'N/A'}</p>
                                <p>📅 Applied: {existingApplication.created_at ? new Date(existingApplication.created_at).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>

                        {existingApplication.verification_status === 'rejected' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                                <p className="text-sm text-red-700">
                                    <strong>Rejection Reason:</strong> {existingApplication.rejection_reason || 'No reason provided'}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={() => navigate('/profile')}
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                            >
                                ← Back to Profile
                            </button>
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                            >
                                Submit New Application
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
                        🏪
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Business Owner</h1>
                    <p className="text-gray-600">List your business on Lakbayan sa Kitcharao and reach more customers</p>
                </motion.div>

                {/* Application Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-xl p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Business Information */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🏢</span> Business Information
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name *</label>
                                    <input
                                        type="text"
                                        value={formData.businessInfo.businessName}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            businessInfo: { ...formData.businessInfo, businessName: e.target.value }
                                        })}
                                        placeholder="Your Business Name"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Type *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {businessTypes.map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => handleBusinessTypeChange(type)}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${formData.businessInfo.businessType === type.value
                                                    ? 'border-primary bg-beige-50'
                                                    : 'border-gray-200 hover:border-primary'
                                                    }`}
                                            >
                                                <div className="text-2xl mb-1">{type.icon}</div>
                                                <div className="text-sm font-medium">{type.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description *</label>
                                    <textarea
                                        value={formData.businessInfo.description}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            businessInfo: { ...formData.businessInfo, description: e.target.value }
                                        })}
                                        placeholder="Tell us about your business, what you offer, and what makes you unique..."
                                        rows={4}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none resize-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                                    <input
                                        type="tel"
                                        value={formData.businessInfo.phone}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            businessInfo: { ...formData.businessInfo, phone: e.target.value }
                                        })}
                                        placeholder="09XX-XXX-XXXX"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Email</label>
                                    <input
                                        type="email"
                                        value={formData.businessInfo.email}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            businessInfo: { ...formData.businessInfo, email: e.target.value }
                                        })}
                                        placeholder="business@email.com"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Website (optional)</label>
                                    <input
                                        type="url"
                                        value={formData.businessInfo.website}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            businessInfo: { ...formData.businessInfo, website: e.target.value }
                                        })}
                                        placeholder="https://www.yourbusiness.com"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Complete Address */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>📍</span> Business Location
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address *</label>
                                    <input
                                        type="text"
                                        value={formData.address.street}
                                        onChange={(e) => handleAddressChange('street', e.target.value)}
                                        placeholder="House/Building No., Street Name"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Barangay *</label>
                                    <select
                                        value={formData.address.barangay}
                                        onChange={(e) => handleAddressChange('barangay', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    >
                                        <option value="">Select Barangay</option>
                                        {barangays.map((brgy) => (
                                            <option key={brgy} value={brgy}>{brgy}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Municipality</label>
                                    <input
                                        type="text"
                                        value={formData.address.city}
                                        onChange={(e) => handleAddressChange('city', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-gray-50"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Province</label>
                                    <input
                                        type="text"
                                        value={formData.address.province}
                                        onChange={(e) => handleAddressChange('province', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none bg-gray-50"
                                        readOnly
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Postal Code</label>
                                    <input
                                        type="text"
                                        value={formData.address.postalCode}
                                        onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                {/* GPS Coordinates */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        GPS Coordinates (optional)
                                        <span className="text-gray-500 font-normal ml-2">For map location</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={formData.location.coordinates.lat}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: {
                                                        ...formData.location,
                                                        coordinates: {
                                                            ...formData.location.coordinates,
                                                            lat: parseFloat(e.target.value) || 0
                                                        }
                                                    }
                                                })}
                                                placeholder="Latitude (e.g. 9.4500)"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Latitude</p>
                                        </div>
                                        <div>
                                            <input
                                                type="number"
                                                step="0.0001"
                                                value={formData.location.coordinates.lng}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: {
                                                        ...formData.location,
                                                        coordinates: {
                                                            ...formData.location.coordinates,
                                                            lng: parseFloat(e.target.value) || 0
                                                        }
                                                    }
                                                })}
                                                placeholder="Longitude (e.g. 125.5700)"
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Longitude</p>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 Tip: Get coordinates from Google Maps by right-clicking your location
                                    </p>
                                </div>

                                {/* Full Address Preview */}
                                {formData.address.fullAddress && (
                                    <div className="sm:col-span-2 p-4 bg-gray-50 rounded-xl">
                                        <p className="text-sm font-semibold text-gray-700 mb-1">Complete Address:</p>
                                        <p className="text-gray-600">{formData.address.fullAddress}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🕐</span> Operating Hours
                            </h3>

                            <div className="space-y-3">
                                {days.map((day) => (
                                    <div key={day} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                                        <div className="w-24 font-medium capitalize text-gray-700">{day}</div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.operatingHours[day].closed}
                                                onChange={(e) => handleOperatingHoursChange(day, 'closed', e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-gray-600">Closed</span>
                                        </label>
                                        {!formData.operatingHours[day].closed && (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="time"
                                                    value={formData.operatingHours[day].open}
                                                    onChange={(e) => handleOperatingHoursChange(day, 'open', e.target.value)}
                                                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                                                />
                                                <span className="text-gray-500">to</span>
                                                <input
                                                    type="time"
                                                    value={formData.operatingHours[day].close}
                                                    onChange={(e) => handleOperatingHoursChange(day, 'close', e.target.value)}
                                                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:outline-none"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-beige-50 border border-beige-300 rounded-xl p-4">
                            <div className="flex gap-3">
                                <span className="text-2xl">ℹ️</span>
                                <div className="text-sm text-gray-700">
                                    <p className="font-semibold mb-1">What happens next?</p>
                                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                                        <li>Your application will be reviewed by an admin</li>
                                        <li>You'll receive notification once approved</li>
                                        <li>Your business will be listed on the platform</li>
                                        <li>You can then manage your business listing and receive bookings</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                            >
                                ← Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-primary hover:shadow-lg'
                                    }`}
                            >
                                {loading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    )
}
