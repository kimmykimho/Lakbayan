import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import api from '../../services/api'
import toast from 'react-hot-toast'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend)

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'itemsets', label: 'Frequent Destinations' },
  { id: 'rules', label: 'Association Rules' },
  { id: 'correlation', label: 'Correlation Analysis' },
  { id: 'charts', label: 'Visual Charts' },
  { id: 'recommendations', label: 'Recommendations' }
]

function Tooltip({ text }) {
  return (
    <span className="relative group inline-flex items-center ml-1">
      <span className="w-4 h-4 inline-flex items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-500 cursor-help">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-52 text-center z-50">
        {text}
      </span>
    </span>
  )
}

export default function AssociationRules() {
  const [activeTab, setActiveTab] = useState('overview')
  const [params, setParams] = useState({
    minSupport: 0.1,
    minConfidence: 0.5,
    minLift: 1.0,
    type: 'bookings',
    period: 0
  })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const debounceRef = useRef(null)

  const fetchData = useCallback(async (queryParams) => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.get('/analytics/association-rules', { params: queryParams })
      if (res.data.success) setData(res.data.data)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load data'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(params) }, []) // eslint-disable-line

  const handleParamChange = (key, value) => {
    const newParams = { ...params, [key]: value }
    setParams(newParams)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(newParams), 600)
  }

  const fetchAiRecommendations = async () => {
    if (!data || data.warning) {
      toast.error('Need analysis data first')
      return
    }
    try {
      setAiLoading(true)
      const res = await api.post('/chatbot/recommendations', { analysisData: data })
      if (res.data.success) {
        setAiRecommendations(res.data.data.recommendations)
        toast.success('AI recommendations generated')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate recommendations')
    } finally {
      setAiLoading(false)
    }
  }

  const { stats, frequentItemsets = [], rules = [], correlationMatrix, recommendations = [], warning, suggestedMinSupport, deepInsights } = data || {}

  const downloadCSV = () => {
    if (!data) return
    
    let csv = 'ASSOCIATION RULE MINING RESULTS\n'
    csv += `Analysis Type,${stats?.analysisType || ''}\n`
    csv += `Period,${stats?.period || ''}\n`
    csv += `Total Transactions,${stats?.totalTransactions || 0}\n`
    csv += `Destinations Analyzed,${stats?.uniqueItems || 0}\n`
    csv += `Rules Found,${stats?.totalRules || 0}\n\n`

    // Frequent Itemsets
    csv += 'FREQUENT DESTINATION GROUPS\n'
    csv += 'Destinations,Support %,Count\n'
    frequentItemsets.forEach(is => {
      csv += `"${(is.itemNames || is.items).join(' + ')}",${(is.support * 100).toFixed(1)},${is.count}\n`
    })

    // Association Rules
    csv += '\nASSOCIATION RULES\n'
    csv += 'Antecedent,Consequent,Support %,Confidence %,Lift,Conviction\n'
    rules.forEach(r => {
      csv += `"${r.antecedent.join(', ')}","${r.consequent.join(', ')}",${(r.support * 100).toFixed(1)},${(r.confidence * 100).toFixed(1)},${r.lift.toFixed(2)},${r.conviction === Infinity ? 'Inf' : r.conviction.toFixed(2)}\n`
    })

    // Correlation Matrix
    if (correlationMatrix && correlationMatrix.labels?.length > 0) {
      csv += '\nCORRELATION MATRIX\n'
      csv += ',' + correlationMatrix.labels.join(',') + '\n'
      correlationMatrix.labels.forEach((label, i) => {
        csv += label + ',' + correlationMatrix.matrix[i].map(v => v.toFixed(3)).join(',') + '\n'
      })
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data_processing_${stats?.analysisType || 'analysis'}_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('CSV downloaded')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Data Processing</h2>
          <p className="text-gray-600 mt-1">Association rule mining on tourist behavior data</p>
        </div>
        {data && !warning && (
          <button
            onClick={downloadCSV}
            className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Parameters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-md p-6 mb-6"
      >
        <h3 className="font-bold text-gray-900 mb-4">Analysis Parameters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data Source</label>
            <select
              value={params.type}
              onChange={(e) => handleParamChange('type', e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none text-sm"
            >
              <option value="bookings">Tourist Bookings</option>
              <option value="favorites">Saved Favorites</option>
              <option value="transport">Transport Routes</option>
              <option value="categories">Place Categories</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Min Support: {(params.minSupport * 100).toFixed(0)}%
              <Tooltip text="Minimum percentage of tourists who must visit a destination group for it to be considered frequent. Lower = more results." />
            </label>
            <input type="range" min="0.01" max="1" step="0.01" value={params.minSupport}
              onChange={(e) => handleParamChange('minSupport', parseFloat(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Min Confidence: {(params.minConfidence * 100).toFixed(0)}%
              <Tooltip text="How reliable a rule is. If confidence is 80%, it means 80% of tourists who visit destination A also visit destination B." />
            </label>
            <input type="range" min="0.01" max="1" step="0.01" value={params.minConfidence}
              onChange={(e) => handleParamChange('minConfidence', parseFloat(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Min Lift: {params.minLift.toFixed(1)}
              <Tooltip text="How much MORE likely tourists are to visit B after visiting A, compared to random chance. Lift > 1 means positive correlation." />
            </label>
            <input type="range" min="1" max="10" step="0.1" value={params.minLift}
              onChange={(e) => handleParamChange('minLift', parseFloat(e.target.value))}
              className="w-full accent-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Period (days)</label>
            <input type="number" min="0" value={params.period}
              onChange={(e) => handleParamChange('period', parseInt(e.target.value) || 0)}
              placeholder="0 = all"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:border-beige-400 focus:outline-none text-sm" />
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-beige-500"></div>
        </div>
      )}

      {/* Error */}
      {error && !data && (
        <div className="text-center py-16">
          <p className="text-gray-600">{error}</p>
          <button onClick={() => fetchData(params)} className="mt-4 px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">Retry</button>
        </div>
      )}

      {data && (
        <>
          {/* Warning - compact */}
          {warning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
              <p className="text-amber-800 text-sm">{warning}</p>
              {suggestedMinSupport && (
                <button onClick={() => handleParamChange('minSupport', suggestedMinSupport)}
                  className="ml-4 px-3 py-1 bg-amber-200 text-amber-900 rounded-lg text-xs font-medium hover:bg-amber-300 whitespace-nowrap">
                  Try {(suggestedMinSupport * 100).toFixed(0)}%
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 border-b border-gray-200 min-w-max">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Updating */}
          {loading && data && (
            <div className="flex items-center gap-2 mb-4 text-gray-500 text-sm">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              <span>Updating...</span>
            </div>
          )}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && <OverviewTab stats={stats} data={data} deepInsights={deepInsights} />}
              {activeTab === 'itemsets' && <ItemsetsTab itemsets={frequentItemsets} />}
              {activeTab === 'rules' && <RulesTab rules={rules} />}
              {activeTab === 'correlation' && <CorrelationTab matrix={correlationMatrix} />}
              {activeTab === 'charts' && <ChartsTab data={data} />}
              {activeTab === 'recommendations' && (
                <RecommendationsTab
                  recommendations={recommendations}
                  aiRecommendations={aiRecommendations}
                  aiLoading={aiLoading}
                  onGenerateAi={fetchAiRecommendations}
                  hasData={!warning}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  )
}

/* ═══════════════ TAB COMPONENTS ═══════════════ */

function OverviewTab({ stats, data, deepInsights }) {
  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Tourist Transactions', value: stats.totalTransactions, gradient: 'from-primary to-primary-dark' },
          { label: 'Destinations Analyzed', value: stats.uniqueItems, gradient: 'from-primary to-primary-dark' },
          { label: 'Avg Places per Tourist', value: stats.avgTransactionSize?.toFixed(1), gradient: 'from-primary to-primary-dark' },
          { label: 'Rules Discovered', value: stats.totalRules, gradient: 'from-primary to-primary-dark' },
          { label: 'Data Source', value: stats.analysisType, gradient: 'from-primary-light to-primary' },
          { label: 'Time Period', value: stats.period, gradient: 'from-primary-light to-primary' }
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden"
          >
            <div className={`p-5 bg-gradient-to-br ${card.gradient}`}>
              <div className="text-white">
                <p className="text-sm opacity-90">{card.label}</p>
                <p className="text-2xl font-bold mt-1">{card.value ?? 0}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Deep Insights */}
      {deepInsights && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4">Key Insights</h3>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {deepInsights.topDestination && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Most Popular Destination</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{deepInsights.topDestination.name}</p>
                <p className="text-sm text-gray-600">Visited by {deepInsights.topDestination.percentage}% of tourists</p>
              </div>
            )}
            {deepInsights.mostConnectedDestination && (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Hub Destination</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{deepInsights.mostConnectedDestination.name}</p>
                <p className="text-sm text-gray-600">Connected to {deepInsights.mostConnectedDestination.connections} other destinations</p>
              </div>
            )}
          </div>
          {deepInsights.tourismPatterns && deepInsights.tourismPatterns.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Discovered Patterns</p>
              <ul className="space-y-2">
                {deepInsights.tourismPatterns.map((pattern, i) => (
                  <li key={i} className="text-sm text-gray-600 pl-4 border-l-2 border-primary/30">{pattern}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ItemsetsTab({ itemsets }) {
  if (!itemsets || itemsets.length === 0) return <EmptyState message="No frequent destination groups found. Try lowering the minimum support threshold." />
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Frequent Destination Groups ({itemsets.length})</h3>
        <p className="text-sm text-gray-600 mt-1">Destinations that tourists frequently visit together</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">#</th>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Destinations</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-700">Support</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-700">Tourist Count</th>
            </tr>
          </thead>
          <tbody>
            {itemsets.map((is, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-5 text-gray-400 text-xs">{i + 1}</td>
                <td className="py-3 px-5">
                  <div className="flex flex-wrap gap-1">
                    {(is.itemNames || is.items).map((name, j) => (
                      <span key={j} className="px-2 py-1 bg-beige-50 text-gray-800 rounded-lg text-xs font-medium border border-beige-200">{name}</span>
                    ))}
                  </div>
                </td>
                <td className="text-right py-3 px-5 font-mono text-sm">{(is.support * 100).toFixed(1)}%</td>
                <td className="text-right py-3 px-5 font-mono text-sm font-bold">{is.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RulesTab({ rules }) {
  if (!rules || rules.length === 0) return <EmptyState message="No association rules found. Try adjusting the confidence or lift thresholds." />
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Tourism Association Rules ({rules.length})</h3>
        <p className="text-sm text-gray-600 mt-1">If a tourist visits the left side, they are likely to also visit the right side</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-3 px-5 font-semibold text-gray-700">Rule</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-700">Support</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-700">Confidence</th>
              <th className="text-right py-3 px-5 font-semibold text-gray-700">Lift</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-beige-50 text-gray-800 rounded-lg text-xs font-medium border border-beige-200">{rule.antecedent.join(', ')}</span>
                    <span className="text-gray-400 font-semibold text-xs">THEN</span>
                    <span className="px-2 py-1 bg-green-50 text-green-800 rounded-lg text-xs font-medium border border-green-200">{rule.consequent.join(', ')}</span>
                  </div>
                </td>
                <td className="text-right py-3 px-5 font-mono text-xs">{(rule.support * 100).toFixed(1)}%</td>
                <td className="text-right py-3 px-5 font-mono text-xs font-bold">{(rule.confidence * 100).toFixed(1)}%</td>
                <td className="text-right py-3 px-5 font-mono text-xs font-bold">{rule.lift.toFixed(2)}x</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CorrelationTab({ matrix }) {
  if (!matrix || !matrix.labels || matrix.labels.length < 2) return <EmptyState message="Not enough data to compute destination correlations." />

  const { labels, matrix: data } = matrix

  // Color function: stronger correlation = darker teal
  const getColor = (v) => {
    const absV = Math.abs(v)
    if (v >= 0) {
      // Positive: light teal to dark teal
      const r = Math.round(230 - absV * 150)
      const g = Math.round(245 - absV * 70)
      const b = Math.round(240 - absV * 80)
      return `rgb(${r}, ${g}, ${b})`
    } else {
      // Negative: light red tones
      const r = Math.round(245 - absV * 30)
      const g = Math.round(220 - absV * 80)
      const b = Math.round(220 - absV * 80)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  const getTextColor = (v) => {
    return Math.abs(v) > 0.6 ? '#1a4a4a' : '#4a5568'
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="font-bold text-gray-900 mb-1">Destination Correlation Matrix</h3>
      <p className="text-sm text-gray-600 mb-6">How strongly destinations are associated based on tourist behavior</p>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {/* Header row */}
          <thead>
            <tr>
              <th className="p-3 text-xs font-medium text-gray-500 text-left min-w-[100px]"></th>
              {labels.map((label, j) => (
                <th key={j} className="p-3 text-xs font-medium text-gray-700 text-center min-w-[100px] max-w-[130px]">
                  <span className="block leading-tight">{label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel, i) => (
              <tr key={i}>
                <td className="p-3 text-xs font-medium text-gray-700 text-right pr-4 min-w-[100px]">
                  {rowLabel}
                </td>
                {labels.map((_, j) => {
                  const value = data[i][j]
                  return (
                    <td
                      key={j}
                      className="p-3 text-center text-sm font-semibold border border-white/50 min-w-[80px]"
                      style={{
                        backgroundColor: getColor(value),
                        color: getTextColor(value)
                      }}
                    >
                      {value.toFixed(2)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <span className="w-4 h-4 rounded" style={{ background: 'rgb(230, 245, 240)' }}></span>
            <span className="w-4 h-4 rounded" style={{ background: 'rgb(160, 210, 200)' }}></span>
            <span className="w-4 h-4 rounded" style={{ background: 'rgb(80, 175, 160)' }}></span>
          </div>
          <span>Weak to Strong Positive</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded" style={{ background: 'rgb(215, 140, 140)' }}></span>
          <span>Negative</span>
        </div>
      </div>
    </div>
  )
}

function ChartsTab({ data }) {
  const { frequentItemsets = [], rules = [], stats } = data || {}

  const hasItemsets = frequentItemsets.length > 0
  const hasRules = rules.length > 0

  if (!hasItemsets && !hasRules && stats?.totalTransactions === 0) {
    return <EmptyState message="No data available for charts. Tourist bookings will generate visualizations automatically." />
  }

  const topItemsets = frequentItemsets.slice(0, 8)
  const topRules = rules.slice(0, 8)

  const supportChart = hasItemsets ? {
    labels: topItemsets.map(is => (is.itemNames || is.items).join(' + ')),
    datasets: [{ label: 'Support %', data: topItemsets.map(is => (is.support * 100).toFixed(1)), backgroundColor: 'rgba(180, 140, 80, 0.7)', borderRadius: 4 }]
  } : null

  const liftChart = hasRules ? {
    labels: topRules.map(r => `${r.antecedent[0]} → ${r.consequent[0]}`),
    datasets: [{ label: 'Lift', data: topRules.map(r => r.lift.toFixed(2)), backgroundColor: 'rgba(34, 150, 80, 0.7)', borderRadius: 4 }]
  } : null

  const confidenceChart = hasRules ? {
    labels: topRules.map(r => `${r.antecedent[0]} → ${r.consequent[0]}`),
    datasets: [{ label: 'Confidence %', data: topRules.map(r => (r.confidence * 100).toFixed(1)), backgroundColor: 'rgba(59, 130, 180, 0.7)', borderRadius: 4 }]
  } : null

  const chartOpts = { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#f3f4f6' } } } }

  if (!supportChart && !liftChart) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h3 className="font-bold text-gray-900 mb-2">Visual Charts</h3>
        <p className="text-sm text-gray-500">Charts will appear once enough tourists visit multiple destinations. Currently there are {stats?.totalTransactions || 0} transactions with {stats?.uniqueItems || 0} destinations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        {supportChart && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Destination Group Support</h3>
            <div className="h-72 sm:h-80">
              <Bar data={supportChart} options={chartOpts} />
            </div>
          </div>
        )}
        {liftChart && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Rule Strength (Lift)</h3>
            <div className="h-72 sm:h-80">
              <Bar data={liftChart} options={chartOpts} />
            </div>
          </div>
        )}
      </div>
      {confidenceChart && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4">Rule Confidence</h3>
          <p className="text-sm text-gray-500 mb-4">How reliably tourists who visit one destination also visit the other</p>
          <div className="h-72 sm:h-80">
            <Bar data={confidenceChart} options={chartOpts} />
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationsTab({ recommendations, aiRecommendations, aiLoading, onGenerateAi, hasData }) {
  return (
    <div className="space-y-6">
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-2">Suggested Tourism Packages</h3>
          <p className="text-sm text-gray-600 mb-4">Based on real tourist behavior patterns</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 hover:border-beige-300 transition-colors">
                <div className="flex flex-wrap gap-1 mb-3">
                  {rec.places.map((p, j) => (
                    <span key={j} className="px-2 py-1 bg-beige-50 text-gray-800 rounded-lg text-xs font-medium border border-beige-200">{p}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mb-2">{rec.insight}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Confidence: <strong className="text-gray-700">{(rec.confidence * 100).toFixed(0)}%</strong></span>
                  <span>Lift: <strong className="text-gray-700">{rec.lift.toFixed(1)}x</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-gray-900">AI-Powered Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Interprets patterns and suggests tourism strategies</p>
          </div>
          <button
            onClick={onGenerateAi}
            disabled={aiLoading || !hasData}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl text-sm font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {aiLoading ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>

        {aiLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary"></div>
            </div>
            <div className="text-center">
              <p className="text-gray-700 font-medium">Analyzing tourism patterns...</p>
              <p className="text-gray-400 text-sm mt-1">Generating insights from your data</p>
            </div>
          </div>
        )}

        {!aiLoading && aiRecommendations ? (
          <div className="bg-gray-50 rounded-xl p-5 sm:p-6">
            {formatAiText(aiRecommendations)}
          </div>
        ) : !aiLoading && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">{hasData ? 'Click "Generate Insights" to get AI-powered tourism recommendations' : 'Need more tourist data before generating insights'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatAiText(text) {
  // Strip markdown symbols and format cleanly
  const lines = text.split('\n')
  const elements = []
  let currentSection = null

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    
    // Strip markdown formatting
    line = line.replace(/\*\*/g, '') // Remove **bold**
    line = line.replace(/#{1,4}\s*/g, '') // Remove ### headers
    line = line.replace(/^---+$/g, '') // Remove horizontal rules
    line = line.replace(/^\*\s+/g, '') // Remove * bullets
    
    const trimmed = line.trim()
    if (!trimmed) continue

    // Detect section headers (ALL CAPS lines or lines ending with :)
    const isHeader = (
      (trimmed === trimmed.toUpperCase() && trimmed.length > 3 && trimmed.length < 60 && !trimmed.match(/^\d/)) ||
      (trimmed.endsWith(':') && trimmed.length < 50 && !trimmed.startsWith('-'))
    )

    if (isHeader) {
      const headerText = trimmed.replace(/:$/, '')
      elements.push(
        <h4 key={i} className="text-sm font-bold text-gray-900 uppercase tracking-wide mt-5 mb-2 pb-1 border-b border-gray-200">
          {headerText}
        </h4>
      )
      currentSection = headerText
    } else if (trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
      // List items
      const content = trimmed.replace(/^-\s+/, '').replace(/^\d+\.\s+/, '')
      elements.push(
        <div key={i} className="flex items-start gap-2 mb-2 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
          <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
        </div>
      )
    } else {
      // Regular paragraph
      elements.push(
        <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">{trimmed}</p>
      )
    }
  }

  return <div>{elements}</div>
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-md">
      <p className="text-gray-500">{message}</p>
    </div>
  )
}
