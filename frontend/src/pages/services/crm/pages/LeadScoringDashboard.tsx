import React, { useState, useEffect } from 'react'
import { 
  Brain, TrendingUp, Users, Activity, Target, RefreshCw, 
  BarChart3, PieChart, Calculator, Award, AlertCircle
} from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

const LeadScoringDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [topLeads, setTopLeads] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionKey!) {
      fetchDashboardData()
    }
  }, [sessionKey])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [dashboardRes, topLeadsRes] = await Promise.all([
        crmApi.getLeadScoringDashboard(sessionKey!),
        crmApi.getTopScoredLeads(sessionKey!)
      ])
      
      setDashboardData(dashboardRes.data)
      setTopLeads(topLeadsRes.data.results || topLeadsRes.data || [])
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setError('Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkCalculate = async () => {
    try {
      setCalculating(true)
      await crmApi.calculateLeadScores(sessionKey!)
      toast.success('Calculated scores for leads')
      fetchDashboardData()
    } catch (error) {
      console.error('Error calculating scores:', error)
      toast.error('Failed to calculate scores')
    } finally {
      setCalculating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>AI Lead Scoring</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Intelligent lead qualification and prioritization</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2 inline" />
            Refresh
          </button>
          <button
            onClick={handleBulkCalculate}
            disabled={calculating}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {calculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="h-4 w-4 mr-2 inline" />
                Calculate All Scores
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.overview.total_leads}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {dashboardData.overview.scored_leads} scored, {dashboardData.overview.unscored_leads} unscored
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.overview.avg_score.toFixed(1)}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Overall lead quality</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Hot Leads</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardData.score_distribution.hot + dashboardData.score_distribution.very_hot}
                </p>
              </div>
              <Award className="h-8 w-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">High priority prospects</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(dashboardData.conversion_metrics.avg_probability * 100).toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Predicted conversion</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Score Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold">Score Distribution</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Lead quality breakdown</p>
            <div className="space-y-4">
              {Object.entries(dashboardData.score_distribution).map(([grade, count]) => {
                const total = Object.values(dashboardData.score_distribution).reduce((sum: number, val: any) => sum + val, 0)
                const percentage = total > 0 ? ((count as number) / total * 100).toFixed(1) : 0
                return (
                  <div key={grade} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        grade === 'very_hot' ? 'bg-red-500' :
                        grade === 'hot' ? 'bg-orange-500' :
                        grade === 'warm' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{grade.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            grade === 'very_hot' ? 'bg-red-500' :
                            grade === 'hot' ? 'bg-orange-500' :
                            grade === 'warm' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">{count as number}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Component Averages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-semibold">Score Components</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Average scores by category</p>
            <div className="space-y-4">
              {Object.entries(dashboardData.component_averages).map(([component, score]) => (
                <div key={component} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${
                      component === 'behavioral' ? 'bg-blue-100 text-blue-600' :
                      component === 'demographic' ? 'bg-green-100 text-green-600' :
                      component === 'engagement' ? 'bg-purple-100 text-purple-600' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {component === 'behavioral' ? <Activity className="h-3 w-3" /> :
                       component === 'demographic' ? <Users className="h-3 w-3" /> :
                       component === 'engagement' ? <TrendingUp className="h-3 w-3" /> :
                       <Brain className="h-3 w-3" />}
                    </div>
                    <span className="text-sm font-medium capitalize">{component}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          component === 'behavioral' ? 'bg-blue-500' :
                          component === 'demographic' ? 'bg-green-500' :
                          component === 'engagement' ? 'bg-purple-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${score as number}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold w-12 text-right">{(score as number).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Leads */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Award className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Top Scored Leads</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Highest priority prospects for immediate action</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topLeads.map((leadScore) => (
            <div key={leadScore.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{leadScore.lead_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{leadScore.lead_company}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{leadScore.total_score}</div>
                  <div className="text-xs text-gray-500 capitalize">{leadScore.grade.replace('_', ' ')}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Behavioral: {leadScore.behavioral_score}</div>
                <div>Demographic: {leadScore.demographic_score}</div>
                <div>Engagement: {leadScore.engagement_score}</div>
                <div>Predictive: {leadScore.predictive_score}</div>
              </div>
            </div>
          ))}
        </div>
        {topLeads.length === 0 && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No scored leads found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Click "Calculate All Scores" to start AI scoring
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default LeadScoringDashboard