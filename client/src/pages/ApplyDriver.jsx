import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function ApplyDriver() {
    const navigate = useNavigate()
    const { isAuthenticated, user } = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [checkingStatus, setCheckingStatus] = useState(true)
    const [existingApplication, setExistingApplication] = useState(null)
    const [showForm, setShowForm] = useState(false)
    const [formData, setFormData] = useState({
        vehicle: {
            type: 'tricycle',
            plateNumber: '',
            model: '',
            color: '',
            capacity: 2
        },
        license: {
            number: '',
            expiryDate: ''
        },
        serviceAreas: ['Kitcharao'],
        pricing: {
            baseRate: 50,
            perKilometer: 10,
            perMinute: 2
        }
    })

    const vehicleTypes = [
        { value: 'tricycle', label: 'Tricycle', icon: '🛺', capacity: 3 },
        { value: 'motorcycle', label: 'Motorcycle (Habal-habal)', icon: '🏍️', capacity: 2 },
        { value: 'van', label: 'Van', icon: '🚐', capacity: 12 },
        { value: 'private_car', label: 'Private Car', icon: '🚗', capacity: 4 }
    ]

    // Check for existing application on component mount
    useEffect(() => {
        const checkExistingApplication = async () => {
            if (!isAuthenticated) {
                setCheckingStatus(false)
                return
            }
            try {
                const response = await api.get('/drivers/my-application')
                if (response.data.success && response.data.data) {
                    setExistingApplication(response.data.data)
                }
            } catch (error) {
                // No existing application or error - show form
                console.log('No existing application found')
            } finally {
                setCheckingStatus(false)
            }
        }
        checkExistingApplication()
    }, [isAuthenticated])

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!isAuthenticated) {
            toast.error('Please login first to apply')
            navigate('/login')
            return
        }

        // Validation
        if (!formData.vehicle.plateNumber || !formData.license.number) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)
        try {
            const response = await api.post('/drivers/apply', formData)
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
                    <p className="text-gray-600 mb-6">You need to be logged in to apply as a driver.</p>
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
                                <p>🛺 Vehicle: {existingApplication.vehicle?.type || 'N/A'}</p>
                                <p>🔢 Plate: {existingApplication.vehicle?.plateNumber || 'N/A'}</p>
                                <p>📄 License: {existingApplication.license?.number || 'N/A'}</p>
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
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-4xl mx-auto mb-4">
                        🚗
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Become a Driver</h1>
                    <p className="text-gray-600">Join our team and earn by providing transport services in Kitcharao</p>
                </motion.div>

                {/* Application Form */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-xl p-8"
                >
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Vehicle Information */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🛺</span> Vehicle Information
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Type *</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {vehicleTypes.map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    vehicle: { ...formData.vehicle, type: type.value, capacity: type.capacity }
                                                })}
                                                className={`p-4 rounded-xl border-2 text-center transition-all ${formData.vehicle.type === type.value
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

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Plate Number *</label>
                                    <input
                                        type="text"
                                        value={formData.vehicle.plateNumber}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            vehicle: { ...formData.vehicle, plateNumber: e.target.value.toUpperCase() }
                                        })}
                                        placeholder="ABC 1234"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Model</label>
                                    <input
                                        type="text"
                                        value={formData.vehicle.model}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            vehicle: { ...formData.vehicle, model: e.target.value }
                                        })}
                                        placeholder="e.g. Honda TMX 155"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle Color</label>
                                    <input
                                        type="text"
                                        value={formData.vehicle.color}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            vehicle: { ...formData.vehicle, color: e.target.value }
                                        })}
                                        placeholder="e.g. Red"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Passenger Capacity</label>
                                    <input
                                        type="number"
                                        value={formData.vehicle.capacity}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            vehicle: { ...formData.vehicle, capacity: parseInt(e.target.value) }
                                        })}
                                        min="1"
                                        max="20"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* License Information */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>📄</span> License Information
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">License Number *</label>
                                    <input
                                        type="text"
                                        value={formData.license.number}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            license: { ...formData.license, number: e.target.value }
                                        })}
                                        placeholder="N01-23-456789"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">License Expiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.license.expiryDate}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            license: { ...formData.license, expiryDate: e.target.value }
                                        })}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>💰</span> Your Rates
                            </h3>

                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Base Rate (₱)</label>
                                    <input
                                        type="number"
                                        value={formData.pricing.baseRate}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pricing: { ...formData.pricing, baseRate: parseInt(e.target.value) }
                                        })}
                                        min="20"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Per Kilometer (₱)</label>
                                    <input
                                        type="number"
                                        value={formData.pricing.perKilometer}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pricing: { ...formData.pricing, perKilometer: parseInt(e.target.value) }
                                        })}
                                        min="5"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Per Minute (₱)</label>
                                    <input
                                        type="number"
                                        value={formData.pricing.perMinute}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            pricing: { ...formData.pricing, perMinute: parseInt(e.target.value) }
                                        })}
                                        min="1"
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:outline-none"
                                    />
                                </div>
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
                                        <li>After approval, you can start accepting ride requests</li>
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
