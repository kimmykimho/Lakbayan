import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminOwners() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all') // 'all', '7days', '30days'
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionType, setActionType] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    fetchApplications()
  }, [filter])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const endpoint = filter === 'all'
        ? '/owners/applications'
        : `/owners/applications?status=${filter}`

      const response = await api.get(endpoint)
      setApplications(response.data.data || [])
    } catch (error) {
      toast.error('Failed to load applications')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await api.put(`/owners/${id}/approve`)
      toast.success('Application approved! Owner role granted.')
      fetchApplications()
      setShowModal(false)
      setShowDetailsModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve application')
    }
  }

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }

    try {
      await api.put(`/owners/${id}/reject`, {
        reason: rejectionReason
      })
      toast.success('Application rejected')
      fetchApplications()
      setShowModal(false)
      setShowDetailsModal(false)
      setRejectionReason('')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject application')
    }
  }

  const openActionModal = (app, type) => {
    setSelectedApp(app)
    setActionType(type)
    setShowModal(true)
  }

  const openDetailsModal = (app) => {
    setSelectedApp(app)
    setShowDetailsModal(true)
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Filter by date range
  const filterByDate = (apps) => {
    if (dateFilter === 'all') return apps
    const now = new Date()
    const daysAgo = dateFilter === '7days' ? 7 : 30
    const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    return apps.filter(app => new Date(app.created_at) >= cutoff)
  }

  // Filter by search term
  const filterBySearch = (apps) => {
    if (!searchTerm.trim()) return apps
    const term = searchTerm.toLowerCase()
    return apps.filter(app =>
      app.user?.name?.toLowerCase().includes(term) ||
      app.user?.email?.toLowerCase().includes(term) ||
      app.business_info?.businessName?.toLowerCase().includes(term)
    )
  }

  const filteredApplications = filterBySearch(filterByDate(applications))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Owner Applications</h1>
          <p className="text-gray-600">{filteredApplications.length} applications found</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All Time' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${dateFilter === opt.id
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${filter === status
                ? 'bg-beige-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {status}
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/20">
                {applications.filter(app => status === 'all' || app.verification_status === status).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No applications found</h3>
          <p className="text-gray-600">No {filter !== 'all' ? filter : ''} applications match your criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b font-semibold text-sm text-gray-600">
            <div className="col-span-4">Applicant</div>
            <div className="col-span-3">Business</div>
            <div className="col-span-2">Applied</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Body */}
          <div className="divide-y">
            {filteredApplications.map((app) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid md:grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center cursor-pointer"
                onClick={() => openDetailsModal(app)}
              >
                {/* Applicant */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {app.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{app.user?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500 truncate">{app.user?.email}</p>
                  </div>
                </div>

                {/* Business */}
                <div className="col-span-3">
                  <p className="font-medium text-gray-900 truncate">{app.business_info?.businessName || 'N/A'}</p>
                  <p className="text-sm text-gray-500 truncate">{app.business_info?.businessType || 'Not specified'}</p>
                </div>

                {/* Applied Date */}
                <div className="col-span-2 text-sm text-gray-600">
                  {new Date(app.created_at).toLocaleDateString()}
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(app.verification_status)}`}>
                    {app.verification_status}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => { e.stopPropagation(); openDetailsModal(app); }}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200"
                  >
                    View
                  </button>
                  {app.verification_status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); openActionModal(app, 'approve'); }}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openActionModal(app, 'reject'); }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white">
                <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                {/* Applicant Info */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedApp.user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedApp.business_info?.businessName || 'No Business Name'}</h3>
                    <p className="text-gray-600">{selectedApp.user?.name} • {selectedApp.user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(selectedApp.verification_status)}`}>
                        {selectedApp.verification_status}
                      </span>
                      <span className="text-sm text-gray-500">Applied {new Date(selectedApp.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div className="grid md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">Business Type</p>
                    <p className="font-semibold text-gray-900">{selectedApp.business_info?.businessType || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contact Phone</p>
                    <p className="font-semibold text-gray-900">{selectedApp.business_info?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{selectedApp.business_info?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-semibold text-gray-900">
                      {typeof selectedApp.business_info?.address === 'object'
                        ? (selectedApp.business_info?.address?.fullAddress ||
                          `${selectedApp.business_info?.address?.street || ''}, Brgy. ${selectedApp.business_info?.address?.barangay || ''}, ${selectedApp.business_info?.address?.city || ''}`.replace(/^, |, $/g, ''))
                        : (selectedApp.business_info?.address || 'N/A')
                      }
                    </p>
                  </div>
                  {selectedApp.business_info?.website && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Website</p>
                      <a href={selectedApp.business_info.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-beige-500 hover:underline">
                        {selectedApp.business_info.website}
                      </a>
                    </div>
                  )}
                  {selectedApp.business_info?.description && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-gray-900">{selectedApp.business_info.description}</p>
                    </div>
                  )}
                </div>

                {/* Documents */}
                {selectedApp.documents && selectedApp.documents.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Documents ({selectedApp.documents.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedApp.documents.map((doc, index) => (
                        <a
                          key={index}
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-100 text-primary rounded-lg text-sm hover:bg-blue-200 transition-colors"
                        >
                          {doc.type.replace(/_/g, ' ')} 📄
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedApp.verification_status === 'rejected' && selectedApp.rejection_reason && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-semibold text-red-800 mb-1">Rejection Reason:</p>
                    <p className="text-sm text-red-700">{selectedApp.rejection_reason}</p>
                  </div>
                )}

                {/* Approval Info */}
                {selectedApp.verification_status === 'approved' && (
                  <div className="flex items-center gap-2 text-green-600 mb-6 p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl">✓</span>
                    <span className="font-semibold">Approved by admin on {new Date(selectedApp.approved_at).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Actions */}
                {selectedApp.verification_status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowDetailsModal(false); openActionModal(selectedApp, 'approve'); }}
                      className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
                    >
                      ✓ Approve Application
                    </button>
                    <button
                      onClick={() => { setShowDetailsModal(false); openActionModal(selectedApp, 'reject'); }}
                      className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
                    >
                      ✗ Reject Application
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {showModal && selectedApp && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold mb-4">
                {actionType === 'approve' ? 'Approve Application?' : 'Reject Application?'}
              </h3>

              {actionType === 'approve' ? (
                <>
                  <p className="text-gray-600 mb-6">
                    This will grant <strong>{selectedApp.user?.name}</strong> business owner access.
                    They will be able to manage their assigned places and businesses.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedApp.id)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                    >
                      Confirm Approval
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-4">
                    Please provide a reason for rejecting this application:
                  </p>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter rejection reason..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none mb-4"
                    rows="4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(selectedApp.id)}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                    >
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => {
                        setShowModal(false)
                        setRejectionReason('')
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
