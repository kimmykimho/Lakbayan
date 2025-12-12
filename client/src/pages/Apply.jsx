import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

export default function Apply() {
    const navigate = useNavigate()
    const { user, isAuthenticated } = useAuthStore()
    const [ownerStatus, setOwnerStatus] = useState(null) // null, 'pending', 'approved', 'rejected'
    const [driverStatus, setDriverStatus] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!isAuthenticated) {
            toast.error('Please login to access this page')
            navigate('/login', { state: { from: '/apply' } })
            return
        }
        checkApplicationStatus()
    }, [isAuthenticated])

    const checkApplicationStatus = async () => {
        try {
            setLoading(true)
            // Check owner application status
            const ownerRes = await api.get('/owners/my-application').catch(() => null)
            if (ownerRes?.data?.data) {
                setOwnerStatus(ownerRes.data.data.status)
            }

            // Check driver application status
            const driverRes = await api.get('/drivers/my-application').catch(() => null)
            if (driverRes?.data?.data) {
                setDriverStatus(driverRes.data.data.status)
            }
        } catch (error) {
            console.error('Error checking application status:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                        ⏳ Application Pending
                    </span>
                )
            case 'approved':
                return (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        ✅ Approved
                    </span>
                )
            case 'rejected':
                return (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        ❌ Rejected - Reapply
                    </span>
                )
            default:
                return null
        }
    }

    // Requirements based on actual form fields in ApplyBusiness.jsx
    const ownerRequirements = [
        { icon: '🏪', text: 'Business Name and Type (Restaurant, Hotel, Shop, etc.)' },
        { icon: '📝', text: 'Business Description and Category' },
        { icon: '📍', text: 'Complete Address in Kitcharao (Street, Barangay)' },
        { icon: '📱', text: 'Contact Phone Number and Email' },
        { icon: '🕐', text: 'Operating Hours for each day of the week' },
        { icon: '📄', text: 'Supporting Documents (Business Permit, Photos)' }
    ]

    // Requirements based on actual form fields in ApplyDriver.jsx
    const driverRequirements = [
        { icon: '🚗', text: 'Vehicle Details (Type, Plate Number, Model, Color)' },
        { icon: '🪪', text: "Driver's License Number and Expiry Date" },
        { icon: '👥', text: 'Vehicle Passenger Capacity' },
        { icon: '📍', text: 'Service Areas (Kitcharao and nearby)' },
        { icon: '💰', text: 'Pricing Rates (Base Rate, Per KM, Per Minute)' }
    ]

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-beige-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-12 sm:py-16">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <h1 className="text-3xl sm:text-4xl font-bold mb-3">Partner with Lakbayan</h1>
                        <p className="text-white/80 text-lg max-w-2xl mx-auto">
                            Join our growing community of local businesses and drivers. Expand your reach and connect with tourists visiting Kitcharao!
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
                <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">

                    {/* Business Owner Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
                    >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <span className="text-4xl">🏪</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Business Owner</h2>
                                    <p className="text-white/80">List your establishment</p>
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-6">
                            {/* Status Badge */}
                            {ownerStatus && (
                                <div className="mb-4">
                                    {getStatusBadge(ownerStatus)}
                                </div>
                            )}

                            {/* Description */}
                            <p className="text-gray-600 mb-6">
                                Register your restaurant, hotel, resort, shop, or tourist attraction on Lakbayan.
                                Get discovered by tourists and receive bookings directly through our platform.
                            </p>

                            {/* Benefits */}
                            <div className="bg-amber-50 rounded-xl p-4 mb-6">
                                <h4 className="font-bold text-amber-800 mb-2">✨ Benefits</h4>
                                <ul className="space-y-1 text-sm text-amber-700">
                                    <li>• Free listing on our platform</li>
                                    <li>• Direct booking management</li>
                                    <li>• Analytics and insights</li>
                                    <li>• Customer reviews and ratings</li>
                                </ul>
                            </div>

                            {/* Requirements */}
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-3">📋 Requirements</h4>
                                <div className="grid gap-2">
                                    {ownerRequirements.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                            <span className="text-lg">{req.icon}</span>
                                            <span className="text-sm text-gray-700">{req.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Button */}
                            {ownerStatus === 'approved' ? (
                                <Link
                                    to="/owner/dashboard"
                                    className="w-full block text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
                                >
                                    Go to Owner Dashboard →
                                </Link>
                            ) : ownerStatus === 'pending' ? (
                                <button
                                    disabled
                                    className="w-full px-6 py-3 bg-yellow-100 text-yellow-700 rounded-xl font-semibold cursor-not-allowed"
                                >
                                    ⏳ Application Under Review
                                </button>
                            ) : (
                                <Link
                                    to="/apply/business"
                                    className="w-full block text-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                                >
                                    {ownerStatus === 'rejected' ? '🔄 Reapply Now' : '📝 Apply Now'}
                                </Link>
                            )}
                        </div>
                    </motion.div>

                    {/* Driver Card */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100"
                    >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-6 text-white">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                                    <span className="text-4xl">🚗</span>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">Driver Partner</h2>
                                    <p className="text-white/80">Offer transport services</p>
                                </div>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-6">
                            {/* Status Badge */}
                            {driverStatus && (
                                <div className="mb-4">
                                    {getStatusBadge(driverStatus)}
                                </div>
                            )}

                            {/* Description */}
                            <p className="text-gray-600 mb-6">
                                Become a verified driver partner and help tourists explore Kitcharao safely.
                                Set your own schedule and earn money on your terms.
                            </p>

                            {/* Benefits */}
                            <div className="bg-blue-50 rounded-xl p-4 mb-6">
                                <h4 className="font-bold text-blue-800 mb-2">✨ Benefits</h4>
                                <ul className="space-y-1 text-sm text-blue-700">
                                    <li>• Flexible working hours</li>
                                    <li>• Direct booking from tourists</li>
                                    <li>• In-app navigation support</li>
                                    <li>• Build your reputation with ratings</li>
                                </ul>
                            </div>

                            {/* Requirements */}
                            <div className="mb-6">
                                <h4 className="font-bold text-gray-800 mb-3">📋 Requirements</h4>
                                <div className="grid gap-2">
                                    {driverRequirements.map((req, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                            <span className="text-lg">{req.icon}</span>
                                            <span className="text-sm text-gray-700">{req.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Button */}
                            {driverStatus === 'approved' ? (
                                <Link
                                    to="/driver/dashboard"
                                    className="w-full block text-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
                                >
                                    Go to Driver Dashboard →
                                </Link>
                            ) : driverStatus === 'pending' ? (
                                <button
                                    disabled
                                    className="w-full px-6 py-3 bg-yellow-100 text-yellow-700 rounded-xl font-semibold cursor-not-allowed"
                                >
                                    ⏳ Application Under Review
                                </button>
                            ) : (
                                <Link
                                    to="/apply/driver"
                                    className="w-full block text-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                                >
                                    {driverStatus === 'rejected' ? '🔄 Reapply Now' : '📝 Apply Now'}
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
