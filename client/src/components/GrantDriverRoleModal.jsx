import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function GrantDriverRoleModal({ isOpen, onClose, user, onSuccess }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [vehicleData, setVehicleData] = useState({
    type: 'tricycle',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    plateNumber: '',
    capacity: 4
  })
  const [licenseData, setLicenseData] = useState({
    number: '',
    type: 'professional',
    expiryDate: ''
  })
  const [pricingData, setPricingData] = useState({
    baseRate: 50,
    perKilometer: 10,
    perMinute: 2
  })

  const vehicleTypes = [
    { value: 'tricycle', label: 'Tricycle', icon: '🛺', capacity: 4 },
    { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️', capacity: 2 },
    { value: 'car', label: 'Private Car', icon: '🚗', capacity: 5 },
    { value: 'van', label: 'Van', icon: '🚐', capacity: 12 }
  ]

  const handleSubmit = async () => {
    // Validation
    if (!vehicleData.plateNumber) {
      toast.error('Plate number is required')
      return
    }
    
    if (!licenseData.number) {
      toast.error('License number is required')
      return
    }

    setLoading(true)
    try {
      // First, update user role to driver
      await api.put(`/users/${user._id}`, { role: 'driver' })

      // Then create/update driver profile
      await api.post('/drivers/admin/create', {
        userId: user._id,
        vehicle: vehicleData,
        license: licenseData,
        pricing: pricingData,
        verified: true,
        verificationStatus: 'approved'
      })

      toast.success('Driver role granted successfully!')
      onSuccess()
      onClose()
      
      // Reset form
      setStep(1)
      setVehicleData({
        type: 'tricycle',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        plateNumber: '',
        capacity: 4
      })
      setLicenseData({
        number: '',
        type: 'professional',
        expiryDate: ''
      })
    } catch (error) {
      console.error('Error granting driver role:', error)
      toast.error(error.response?.data?.message || 'Failed to grant driver role')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b px-8 py-6 z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Grant Driver Role</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Setting up driver account for {user.name}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div className={`h-2 rounded-full ${s <= step ? 'bg-beige-400' : 'bg-gray-200'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Vehicle Information */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Vehicle Information</h3>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Vehicle Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {vehicleTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setVehicleData({ ...vehicleData, type: type.value, capacity: type.capacity })}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          vehicleData.type === type.value
                            ? 'border-beige-400 bg-beige-50'
                            : 'border-gray-200 hover:border-beige-500'
                        }`}
                      >
                        <div className="text-3xl mb-2">{type.icon}</div>
                        <div className="font-semibold text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.capacity} passengers</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plate Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Plate Number *</label>
                  <input
                    type="text"
                    value={vehicleData.plateNumber}
                    onChange={(e) => setVehicleData({ ...vehicleData, plateNumber: e.target.value.toUpperCase() })}
                    placeholder="ABC 1234"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none uppercase"
                  />
                </div>

                {/* Make and Model */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Make</label>
                    <input
                      type="text"
                      value={vehicleData.make}
                      onChange={(e) => setVehicleData({ ...vehicleData, make: e.target.value })}
                      placeholder="Honda, Toyota, etc."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Model</label>
                    <input
                      type="text"
                      value={vehicleData.model}
                      onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                      placeholder="Model name"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Year and Color */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={vehicleData.year}
                      onChange={(e) => setVehicleData({ ...vehicleData, year: parseInt(e.target.value) })}
                      min="1990"
                      max={new Date().getFullYear() + 1}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
                    <input
                      type="text"
                      value={vehicleData.color}
                      onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                      placeholder="Red, Blue, etc."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                  Next: License Information
                </button>
              </div>
            )}

            {/* Step 2: License Information */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">License Information</h3>

                {/* License Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">License Number *</label>
                  <input
                    type="text"
                    value={licenseData.number}
                    onChange={(e) => setLicenseData({ ...licenseData, number: e.target.value.toUpperCase() })}
                    placeholder="N01-XX-XXXXXX"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none uppercase"
                  />
                </div>

                {/* License Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">License Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['professional', 'non-professional'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLicenseData({ ...licenseData, type })}
                        className={`p-4 border-2 rounded-xl transition-all ${
                          licenseData.type === type
                            ? 'border-beige-400 bg-beige-50'
                            : 'border-gray-200 hover:border-beige-500'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 capitalize">{type}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={licenseData.expiryDate}
                    onChange={(e) => setLicenseData({ ...licenseData, expiryDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 py-3 bg-primary text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                  >
                    Next: Pricing
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Pricing */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-gray-900">Pricing Configuration</h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Base Rate (₱)</label>
                    <input
                      type="number"
                      value={pricingData.baseRate}
                      onChange={(e) => setPricingData({ ...pricingData, baseRate: parseFloat(e.target.value) })}
                      min="0"
                      step="10"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Starting fare</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Per Kilometer (₱)</label>
                    <input
                      type="number"
                      value={pricingData.perKilometer}
                      onChange={(e) => setPricingData({ ...pricingData, perKilometer: parseFloat(e.target.value) })}
                      min="0"
                      step="1"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Per km rate</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Per Minute (₱)</label>
                    <input
                      type="number"
                      value={pricingData.perMinute}
                      onChange={(e) => setPricingData({ ...pricingData, perMinute: parseFloat(e.target.value) })}
                      min="0"
                      step="0.5"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-beige-400 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Per minute rate</p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gradient-to-r from-beige-50 to-beige-50 rounded-xl p-6 border border-beige-400">
                  <h4 className="font-bold text-gray-900 mb-3">Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vehicle:</span>
                      <span className="font-semibold">{vehicleData.plateNumber} ({vehicleData.type})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">License:</span>
                      <span className="font-semibold">{licenseData.number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Rate:</span>
                      <span className="font-semibold">₱{pricingData.baseRate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="flex-1 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={`flex-1 py-3 rounded-xl font-semibold text-white transition-all ${
                      loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-primary hover:shadow-lg'
                    }`}
                  >
                    {loading ? 'Creating Driver Account...' : 'Grant Driver Role'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}




