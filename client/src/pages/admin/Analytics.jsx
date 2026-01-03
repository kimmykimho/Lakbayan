import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import api from '../../services/api'
import toast from 'react-hot-toast'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [aboutStats, setAboutStats] = useState({ events: 0, achievements: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')
  const [exporting, setExporting] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [aiReport, setAiReport] = useState(null)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [analyticsRes, aboutRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/about').catch(() => ({ data: { data: [] } }))
      ])

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data)
      }

      // Count about items by category
      const aboutItems = aboutRes.data.data || []
      const upcomingEvents = aboutItems.filter(item => {
        if (item.category !== 'events') return false
        if (!item.event_date?.start) return true
        return new Date(item.event_date.start) >= new Date()
      }).length
      const achievements = aboutItems.filter(item => item.category === 'achievements').length
      setAboutStats({ events: upcomingEvents, achievements, total: aboutItems.length })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      console.error('Error details:', error.response?.data)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true)
      toast.loading('Generating CSV...', { id: 'csv-export' })

      const response = await api.get('/analytics/export/csv', {
        responseType: 'blob'
      })

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lakbayan_analytics_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('CSV downloaded!', { id: 'csv-export' })
    } catch (error) {
      console.error('CSV export error:', error)
      toast.error('Failed to export CSV', { id: 'csv-export' })
    } finally {
      setExporting(false)
    }
  }

  // Generate AI Report
  const handleGenerateReport = async () => {
    try {
      setGeneratingReport(true)
      setShowReportModal(true)
      toast.loading('AI is analyzing your data...', { id: 'ai-report' })

      const response = await api.post('/analytics/generate-report')

      if (response.data.success) {
        setAiReport(response.data.data)
        toast.success('Report generated!', { id: 'ai-report' })
      }
    } catch (error) {
      console.error('AI report error:', error)
      toast.error(error.response?.data?.message || 'Failed to generate report', { id: 'ai-report' })
      setShowReportModal(false)
    } finally {
      setGeneratingReport(false)
    }
  }

  // Export report as PDF (print)
  const handleExportPDF = () => {
    window.print()
    toast.success('Print dialog opened!')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-beige-500"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    )
  }

  const { overview = {}, recentBookings = [], recentReviews = [], charts = {} } = analytics || {}

  // Chart data - using real data from API
  const visitorsData = {
    labels: charts?.weeklyVisitors?.labels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Visitors',
        data: charts?.weeklyVisitors?.data || [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const bookingsData = {
    labels: charts?.monthlyBookings?.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Bookings',
        data: charts?.monthlyBookings?.data || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Revenue (₱1000s)',
        data: charts?.monthlyRevenue?.data || [0, 0, 0, 0, 0, 0],
        backgroundColor: 'rgba(234, 179, 8, 0.8)',
      }
    ]
  }

  // Category colors for dynamic data
  const categoryColors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(99, 102, 241, 0.8)',
  ]

  const categoryData = {
    labels: charts?.categoryDistribution?.labels || ['No Data'],
    datasets: [
      {
        data: charts?.categoryDistribution?.data || [1],
        backgroundColor: categoryColors.slice(0, charts?.categoryDistribution?.labels?.length || 1),
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
  }

  const stats = [
    {
      label: 'Total Users',
      value: overview.totalUsers || 0,
      subtitle: `👤 ${overview.usersByRole?.tourists || 0} Tourists • 🏢 ${overview.usersByRole?.owners || 0} Owners • 🚗 ${overview.usersByRole?.drivers || 0} Drivers`,
      icon: '👥',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Places',
      value: overview.totalPlaces || 0,
      subtitle: 'Active destinations',
      icon: '📍',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Bookings',
      value: overview.totalBookings || 0,
      subtitle: 'All time bookings',
      icon: '📅',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Total Visitors',
      value: (overview.totalVisitors || 0).toLocaleString(),
      subtitle: 'Place visitors',
      icon: '🎯',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Avg Rating',
      value: (overview.avgRating || 0).toFixed(1),
      subtitle: 'Out of 5 stars',
      icon: '⭐',
      color: 'from-primary-light to-primary'
    },
    {
      label: 'Total Revenue',
      value: `₱${(overview.totalRevenue || 0).toLocaleString()}`,
      subtitle: 'Estimated earnings',
      icon: '💰',
      color: 'from-primary to-primary-dark'
    },
    {
      label: 'Upcoming Events',
      value: aboutStats.events,
      subtitle: 'Scheduled activities',
      icon: '📅',
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'Achievements',
      value: aboutStats.achievements,
      subtitle: 'Awards & recognitions',
      icon: '🏆',
      color: 'from-amber-500 to-amber-600'
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="text-4xl">📊</span>
            Analytics & Reports
          </h2>
          <p className="text-gray-600 mt-1">Track your platform performance and insights</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all overflow-hidden"
          >
            <div className={`p-6 bg-gradient-to-br ${stat.color}`}>
              <div className="flex items-start justify-between text-white">
                <div className="flex-1">
                  <p className="text-sm opacity-90 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold mb-2">{stat.value}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs opacity-75">{stat.subtitle}</span>
                  </div>
                </div>
                <div className="text-5xl opacity-20">{stat.icon}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Visitors Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>📈</span>
            Visitor Trends
          </h3>
          <div className="h-80">
            <Line data={visitorsData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Bookings & Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>💼</span>
            Bookings & Revenue
          </h3>
          <div className="h-80">
            <Bar data={bookingsData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Category Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎨</span>
            Category Distribution
          </h3>
          <div className="h-80 flex items-center justify-center">
            <Doughnut data={categoryData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-md"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>⚡</span>
            Recent Activity
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {recentBookings && recentBookings.length > 0 ? (
              recentBookings.map((booking, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-beige-400 rounded-full flex items-center justify-center text-white font-bold">
                    {booking.user?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {booking.user?.name || 'User'} booked {booking.place?.name || 'a place'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent bookings</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white p-6 rounded-2xl shadow-md"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>💬</span>
          Recent Reviews
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {recentReviews && recentReviews.length > 0 ? (
            recentReviews.map((review, index) => (
              <div key={index} className="p-4 border-2 border-gray-100 rounded-xl hover:border-beige-400 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400">⭐</span>
                    <span className="font-bold">{review.rating || 5}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">{review.place?.name || 'Place'}</p>
                <p className="text-sm text-gray-700 line-clamp-2">{review.comment || 'No comment'}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8 col-span-2">No recent reviews</p>
          )}
        </div>
      </motion.div>

      {/* Export Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 bg-gradient-to-br from-primary/5 to-amber-50 p-6 rounded-2xl border-2 border-primary/20"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="text-2xl">📑</span> Export & Reports
            </h3>
            <p className="text-gray-600">Download analytics data or generate AI-powered insights</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleExportPDF}
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2"
            >
              <span>🖨️</span> Print / PDF
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>📊</span> {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <span>🤖</span> {generatingReport ? 'Generating...' : 'AI Report'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* AI Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !generatingReport && setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-primary to-primary-dark text-white p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📊</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Business Analytics Report</h2>
                      <p className="text-white/80 text-sm">Powered by Gemini AI • {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowReportModal(false)}
                    disabled={generatingReport}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto bg-gray-50">
                {generatingReport ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary/30 border-t-primary"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl">🤖</span>
                      </div>
                    </div>
                    <p className="text-gray-700 font-semibold mt-6">Generating your report...</p>
                    <p className="text-gray-400 text-sm mt-1">AI is analyzing platform data</p>
                  </div>
                ) : aiReport ? (
                  <div className="space-y-5">
                    {/* Data Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-primary">{aiReport.dataSnapshot?.totalUsers || 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Total Users</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-blue-600">{aiReport.dataSnapshot?.totalPlaces || 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Listed Places</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-green-600">{aiReport.dataSnapshot?.totalBookings || 0}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Total Bookings</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                        <p className="text-3xl font-bold text-amber-600">{aiReport.dataSnapshot?.avgRating || '0.0'}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">Avg Rating</p>
                      </div>
                    </div>

                    {/* Report Content - Styled Sections */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">📋</span>
                          <h3 className="text-lg font-bold text-gray-800">Full Report</h3>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-700">
                          {(aiReport.report || '').split('\n\n').map((section, idx) => {
                            // Check if this is a header section
                            const lines = section.trim().split('\n');
                            const firstLine = lines[0].trim().toUpperCase();
                            const isHeader = firstLine === firstLine.toUpperCase() &&
                              firstLine.length < 50 &&
                              !firstLine.match(/^\d+\./);

                            if (isHeader && lines.length > 1) {
                              return (
                                <div key={idx} className="mb-5">
                                  <h4 className="text-sm font-bold text-primary uppercase tracking-wide border-b-2 border-primary/20 pb-2 mb-3">
                                    {lines[0]}
                                  </h4>
                                  <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                                    {lines.slice(1).join('\n')}
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <p key={idx} className="mb-3 text-gray-600 leading-relaxed whitespace-pre-line">
                                {section}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Generation Info */}
                    <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                      <span>Report ID: {Date.now().toString(36).toUpperCase()}</span>
                      <span>Generated: {new Date(aiReport.generatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📊</span>
                    </div>
                    <p className="font-medium">No report generated yet</p>
                    <p className="text-sm text-gray-400 mt-1">Click "Generate Report" to create one</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!generatingReport && aiReport && (
                <div className="border-t p-4 flex flex-wrap justify-between gap-3 bg-white">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // Create downloadable text file
                        const reportText = `LAKBAYAN SA KITCHARAO - BUSINESS ANALYTICS REPORT
Generated: ${new Date(aiReport.generatedAt).toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DATA SUMMARY
• Total Users: ${aiReport.dataSnapshot?.totalUsers || 0}
• Listed Places: ${aiReport.dataSnapshot?.totalPlaces || 0}
• Total Bookings: ${aiReport.dataSnapshot?.totalBookings || 0}
• Average Rating: ${aiReport.dataSnapshot?.avgRating || 0}/5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${aiReport.report}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report generated by Lakbayan sa Kitcharao Analytics
Powered by Gemini AI`;

                        const blob = new Blob([reportText], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Lakbayan_Analytics_Report_${new Date().toISOString().split('T')[0]}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success('Report downloaded!')
                      }}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                      <span>📥</span> Download Report
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(aiReport.report)
                        toast.success('Report copied to clipboard!')
                      }}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                      <span>📋</span> Copy
                    </button>
                  </div>
                  <button
                    onClick={handleGenerateReport}
                    className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <span>🔄</span> Regenerate Report
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

