import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'

import { 
  Heart, 
 
  Users, 
  AlertTriangle, 
  Target, 

  Plus,
  Calculator,
  Eye
} from 'lucide-react'
import { crmApi } from '../utils/api'
import { 
  CustomerHealthScore, 
  CustomerSegment, 
  CustomerInteraction,
  HealthDashboard,
  InteractionSummary,
  AnalyticsDashboard
} from '../types'
import { formatCurrency, formatDate } from '../../../../lib/utils'
import { HealthScoreCard } from '../components/HealthScoreCard'
import { InteractionModal } from '../components/InteractionModal'
import { SegmentModal } from '../components/SegmentModal'
import { InteractionDetailModal } from '../components/InteractionDetailModal'
import { SegmentDetailModal } from '../components/SegmentDetailModal'

interface CustomerAnalyticsProps {
  sessionKey: string
}

export const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = ({ sessionKey }) => {
  const [healthScores, setHealthScores] = useState<CustomerHealthScore[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [interactions, setInteractions] = useState<CustomerInteraction[]>([])
  const [healthDashboard, setHealthDashboard] = useState<HealthDashboard | null>(null)
  const [interactionSummary, setInteractionSummary] = useState<InteractionSummary | null>(null)
  const [analyticsDashboard, setAnalyticsDashboard] = useState<AnalyticsDashboard | null>(null)
  const [atRiskAccounts, setAtRiskAccounts] = useState<CustomerHealthScore[]>([])
  const [loading, setLoading] = useState(true)
  const [showInteractionModal, setShowInteractionModal] = useState(false)
  const [showSegmentModal, setShowSegmentModal] = useState(false)
  const [showInteractionDetailModal, setShowInteractionDetailModal] = useState(false)
  const [showSegmentDetailModal, setShowSegmentDetailModal] = useState(false)
  const [, setSelectedHealthScore] = useState<CustomerHealthScore | null>(null)
  const [selectedSegment, setSelectedSegment] = useState<CustomerSegment | null>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<CustomerInteraction | null>(null)
  const [filterSegment, setFilterSegment] = useState<string>('all')

  useEffect(() => {
    loadAnalyticsData()
  }, [sessionKey])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const [
        healthScoresRes,
        segmentsRes,
        interactionsRes,
        healthDashboardRes,
        interactionSummaryRes,
        analyticsDashboardRes,
        atRiskRes
      ] = await Promise.all([
        crmApi.getCustomerHealthScores(sessionKey!),
        crmApi.getCustomerSegments(sessionKey!),
        crmApi.getCustomerInteractions(sessionKey!, { limit: 50 }),
        crmApi.getHealthDashboard(sessionKey!),
        crmApi.getInteractionSummary(sessionKey!),
        crmApi.getAnalyticsDashboard(sessionKey!),
        crmApi.getAtRiskAccounts(sessionKey!)
      ])
      
      setHealthScores(healthScoresRes.data.results || healthScoresRes.data)
      setSegments(segmentsRes.data.results || segmentsRes.data)
      setInteractions(interactionsRes.data.results || interactionsRes.data)
      setHealthDashboard(healthDashboardRes.data)
      setInteractionSummary(interactionSummaryRes.data)
      setAnalyticsDashboard(analyticsDashboardRes.data)
      setAtRiskAccounts(atRiskRes.data.results || atRiskRes.data)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCalculateHealthScores = async () => {
    try {
      await crmApi.calculateHealthScores(sessionKey!)
      loadAnalyticsData()
    } catch (error) {
      console.error('Error calculating health scores:', error)
    }
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-500'
      case 'good': return 'bg-blue-500'
      case 'average': return 'bg-yellow-500'
      case 'poor': return 'bg-orange-500'
      case 'critical': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excellent'
      case 'good': return 'Good'
      case 'average': return 'Average'
      case 'poor': return 'Poor'
      case 'critical': return 'Critical'
      default: return 'Unknown'
    }
  }

  const filteredHealthScores = filterSegment === 'all' 
    ? healthScores 
    : healthScores.filter(score => score.health_status === filterSegment)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Analytics</h1>
          <p className="text-gray-600">Monitor customer health and relationship insights</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSegmentModal(true)} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            New Segment
          </Button>
          <Button onClick={handleCalculateHealthScores} variant="outline">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate Scores
          </Button>
          <Button onClick={() => setShowInteractionModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Log Interaction
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold">{healthDashboard?.total_accounts || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Health Score</p>
                <p className="text-2xl font-bold">{healthDashboard?.avg_health_score.toFixed(0) || 0}</p>
              </div>
              <Heart className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">At Risk</p>
                <p className="text-2xl font-bold">{healthDashboard?.high_risk_accounts || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Upsell Opportunities</p>
                <p className="text-2xl font-bold">{healthDashboard?.upsell_opportunities || 0}</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button className="border-orange-500 text-orange-600 whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
              Health Scores
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Customer Health Scores</h3>
            <select 
              value={filterSegment} 
              onChange={(e) => setFilterSegment(e.target.value)}
              className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Accounts</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="average">Average</option>
              <option value="poor">Poor</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Health Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Health Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {healthDashboard?.health_distribution.map((item) => (
                  <div key={item.health_status} className="text-center">
                    <div className={`w-full h-20 rounded-lg ${getHealthStatusColor(item.health_status)} flex items-center justify-center text-white font-bold text-xl`}>
                      {item.count}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 capitalize">
                      {getHealthStatusText(item.health_status)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Health Scores List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHealthScores.map((healthScore) => (
              <HealthScoreCard
                key={healthScore.id}
                healthScore={healthScore}
                onClick={() => setSelectedHealthScore(healthScore)}
              />
            ))}
          </div>

          {/* At Risk Accounts */}
          {atRiskAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  At Risk Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {atRiskAccounts.slice(0, 5).map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{account.account_name}</h4>
                        <p className="text-sm text-gray-600">
                          Health Score: {account.overall_score}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800">
                          {(account.churn_risk * 100).toFixed(0)}% Churn Risk
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          Last calculated: {formatDate(account.last_calculated)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Interactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Interaction Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Interactions</span>
                  <span className="font-medium">{interactionSummary?.total_interactions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Recent (30 days)</span>
                  <span className="font-medium">{interactionSummary?.recent_interactions || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg per Account</span>
                  <span className="font-medium">{interactionSummary?.avg_interactions_per_account || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Interaction Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {interactionSummary?.interactions_by_type.map((type) => (
                    <div key={type.interaction_type} className="flex justify-between items-center">
                      <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{type.interaction_type.replace('_', ' ')}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{type.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Interactions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Recent Interactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {interactions.length > 0 ? interactions.slice(0, 10).map((interaction) => (
                  <div key={interaction.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">{interaction.subject}</h4>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {interaction.interaction_type_display}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {interaction.account_name} • {interaction.contact_name}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(interaction.interaction_date)}
                      </p>
                      {interaction.duration_minutes && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {interaction.duration_minutes} min
                        </p>
                      )}
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 h-6"
                          onClick={() => {
                            setSelectedInteraction(interaction)
                            setShowInteractionModal(true)
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs px-2 py-1 h-6"
                          onClick={() => {
                            setSelectedInteraction(interaction)
                            setShowInteractionDetailModal(true)
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No interactions found. Click "Log Interaction" to add one.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Segments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((segment) => (
              <Card key={segment.id} className="cursor-pointer hover:shadow-md transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg text-gray-900 dark:text-white">{segment.name}</CardTitle>
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{segment.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Accounts</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">{segment.account_count}</span>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedSegment(segment)
                        setShowSegmentDetailModal(true)
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-4" style={{ display: 'none' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {analyticsDashboard?.key_metrics.conversion_rate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Conversion Rate</span>
                    <span className="font-medium">
                      {analyticsDashboard.key_metrics.conversion_rate.current_value.toFixed(1)}%
                    </span>
                  </div>
                )}
                {analyticsDashboard?.key_metrics.avg_deal_size && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Deal Size</span>
                    <span className="font-medium">
                      {formatCurrency(analyticsDashboard.key_metrics.avg_deal_size.current_value)}
                    </span>
                  </div>
                )}
                {analyticsDashboard?.key_metrics.win_rate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Win Rate</span>
                    <span className="font-medium">
                      {analyticsDashboard.key_metrics.win_rate.current_value.toFixed(1)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Customer Retention</span>
                    <span>94%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Engagement Score</span>
                    <span>82%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Satisfaction Rate</span>
                    <span>88%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '88%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showInteractionModal && (
        <InteractionModal
          isOpen={showInteractionModal}
          onClose={() => setShowInteractionModal(false)}
          onSave={loadAnalyticsData}
          sessionKey={sessionKey}
        />
      )}

      {showSegmentModal && (
        <SegmentModal
          isOpen={showSegmentModal}
          onClose={() => setShowSegmentModal(false)}
          onSave={loadAnalyticsData}
          sessionKey={sessionKey}
          segment={selectedSegment}
        />
      )}

      {showInteractionDetailModal && (
        <InteractionDetailModal
          isOpen={showInteractionDetailModal}
          onClose={() => setShowInteractionDetailModal(false)}
          interaction={selectedInteraction}
        />
      )}

      {showSegmentDetailModal && (
        <SegmentDetailModal
          isOpen={showSegmentDetailModal}
          onClose={() => setShowSegmentDetailModal(false)}
          segment={selectedSegment}
        />
      )}
    </div>
  )
}