/**
 * Phase 3: AI Analytics Dashboard Component
 * Displays AI-powered insights, forecasts, and analytics
 */

import React, { useState } from 'react'
import { 
  Brain, 
  Users, 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Lightbulb,
  Zap,
  Eye,
  RefreshCw
} from 'lucide-react'
import { useAIAnalytics } from '../../../../hooks/useCRMOptimized'

interface AIInsight {
  type: 'opportunity' | 'risk' | 'recommendation'
  title: string
  description: string
  action: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

const AIAnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  
  const { leadScores, salesForecast, conversationAnalysis } = useAIAnalytics()
  const isLoading = leadScores.isLoading || salesForecast.isLoading
  const error = leadScores.error || salesForecast.error

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      leadScores.refetch(),
      salesForecast.refetch()
    ])
    setRefreshing(false)
  }

  const insights: AIInsight[] = [
    {
      type: 'opportunity',
      title: 'High-Value Lead Identified',
      description: 'TechCorp Inc. shows strong buying signals with a potential deal value of $150K',
      action: 'Schedule demo call within 48 hours',
      priority: 'high'
    },
    {
      type: 'risk',
      title: 'Customer Health Alert',
      description: 'Innovation Labs account showing decreased engagement (-40% last 30 days)',
      action: 'Immediate outreach recommended',
      priority: 'critical'
    },
    {
      type: 'recommendation',
      title: 'Optimize Lead Scoring',
      description: 'Current model accuracy: 78%. Suggested improvements could increase to 85%',
      action: 'Review and update scoring criteria',
      priority: 'medium'
    }
  ]

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'high': return <Zap className="h-4 w-4" />
      case 'medium': return <Eye className="h-4 w-4" />
      case 'low': return <Lightbulb className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 animate-pulse text-blue-500" />
          <span>Loading AI Analytics...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-4 p-4 border border-red-200 rounded-lg bg-red-50">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-red-700">Failed to load AI analytics. Please try again.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-500" />
          <h1 className="text-2xl font-bold">AI Analytics Dashboard</h1>
        </div>
        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Real-time Insights Alert */}
      {insights.length > 0 && (
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <span className="text-blue-700">
              <strong>AI Insight:</strong> {insights[0]?.title || 'Analytics ready'}
            </span>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Brain },
            { id: 'leads', label: 'Lead Intelligence', icon: Users },
            { id: 'forecast', label: 'Sales Forecast', icon: DollarSign },
            { id: 'conversations', label: 'Conversations', icon: MessageSquare }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Insights */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold">AI Insights</h3>
            </div>
            <div className="grid gap-4">
              {insights.length > 0 ? insights.map((insight, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0">
                    {getPriorityIcon(insight.priority)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        insight.priority === 'critical' ? 'bg-red-100 text-red-800' :
                        insight.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                        insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {insight.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <p className="text-sm font-medium text-blue-600">{insight.action}</p>
                  </div>
                </div>
              )) : (
                <p className="text-gray-500 text-center py-4">No insights available at the moment.</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Total Leads</p>
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-xs text-green-600">+12% this month</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Pipeline Value</p>
                  <p className="text-2xl font-bold">$2.4M</p>
                  <p className="text-xs text-green-600">+8% growth</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-600">Conversations</p>
                  <p className="text-2xl font-bold">210</p>
                  <p className="text-xs text-purple-600">68% positive</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">AI Insights</p>
                  <p className="text-2xl font-bold">15</p>
                  <p className="text-xs text-orange-600">3 critical</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Team Performance</h3>
            <div className="space-y-4">
              {[
                { name: 'Sarah Johnson', leads: 45, converted: 12, revenue: '$340K', rate: '26.7%' },
                { name: 'Mike Chen', leads: 38, converted: 9, revenue: '$280K', rate: '23.7%' },
                { name: 'Emily Davis', leads: 42, converted: 8, revenue: '$250K', rate: '19.0%' },
                { name: 'John Smith', leads: 35, converted: 7, revenue: '$210K', rate: '20.0%' }
              ].map((member, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.leads} leads assigned</p>
                  </div>
                  <div className="flex space-x-6 text-center">
                    <div>
                      <p className="font-bold text-green-600">{member.converted}</p>
                      <p className="text-xs text-gray-500">Converted</p>
                    </div>
                    <div>
                      <p className="font-bold text-blue-600">{member.revenue}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                    <div>
                      <p className="font-bold text-purple-600">{member.rate}</p>
                      <p className="text-xs text-gray-500">Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="space-y-6">
          {/* Lead Quality Trends */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Lead Intelligence Dashboard</h3>
            {leadScores.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Total Leads</h4>
                    <p className="text-2xl font-bold text-blue-600">1,247</p>
                    <p className="text-sm text-blue-600">+12% from last month</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">High Quality Leads</h4>
                    <p className="text-2xl font-bold text-green-600">342</p>
                    <p className="text-sm text-green-600">Score &gt; 80</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-yellow-900">Conversion Rate</h4>
                    <p className="text-2xl font-bold text-yellow-600">24.3%</p>
                    <p className="text-sm text-yellow-600">+3.2% improvement</p>
                  </div>
                </div>
                
                {/* Top Leads */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Top Scoring Leads</h4>
                  <div className="space-y-2">
                    {[
                      { name: 'John Smith', company: 'TechCorp Inc.', score: 95, grade: 'A+' },
                      { name: 'Sarah Johnson', company: 'Innovation Labs', score: 89, grade: 'A' },
                      { name: 'Mike Chen', company: 'Digital Solutions', score: 84, grade: 'A-' }
                    ].map((lead, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{lead.name}</p>
                          <p className="text-sm text-gray-600">{lead.company}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{lead.score}</p>
                          <span className={`px-2 py-1 text-xs rounded ${
                            lead.grade.startsWith('A') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {lead.grade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading lead intelligence data...</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Sales Forecast Overview */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Sales Forecast Analysis</h3>
            {salesForecast.data ? (
              <div className="space-y-6">
                {/* Forecast Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-medium text-purple-900">Pipeline Value</h4>
                    <p className="text-2xl font-bold text-purple-600">$2.4M</p>
                    <p className="text-sm text-purple-600">Total opportunities</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900">Weighted Forecast</h4>
                    <p className="text-2xl font-bold text-green-600">$1.8M</p>
                    <p className="text-sm text-green-600">90-day projection</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">AI Adjusted</h4>
                    <p className="text-2xl font-bold text-blue-600">$1.6M</p>
                    <p className="text-sm text-blue-600">85% confidence</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-900">Deals Closing</h4>
                    <p className="text-2xl font-bold text-orange-600">23</p>
                    <p className="text-sm text-orange-600">Next 30 days</p>
                  </div>
                </div>

                {/* Pipeline Health */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Pipeline Health by Stage</h4>
                  <div className="space-y-3">
                    {[
                      { stage: 'Qualified', count: 45, value: '$890K', color: 'bg-blue-500' },
                      { stage: 'Proposal', count: 28, value: '$650K', color: 'bg-yellow-500' },
                      { stage: 'Negotiation', count: 15, value: '$420K', color: 'bg-orange-500' },
                      { stage: 'Closing', count: 8, value: '$280K', color: 'bg-green-500' }
                    ].map((stage, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                          <span className="font-medium">{stage.stage}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{stage.value}</p>
                          <p className="text-sm text-gray-600">{stage.count} deals</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Loading sales forecast data...</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div className="space-y-6">
          {/* Conversation Intelligence */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Conversation Intelligence</h3>
            
            {/* Sentiment Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Positive Sentiment</h4>
                <p className="text-2xl font-bold text-green-600">68%</p>
                <p className="text-sm text-green-600">142 conversations</p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-medium text-yellow-900">Neutral Sentiment</h4>
                <p className="text-2xl font-bold text-yellow-600">24%</p>
                <p className="text-sm text-yellow-600">51 conversations</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-medium text-red-900">Negative Sentiment</h4>
                <p className="text-2xl font-bold text-red-600">8%</p>
                <p className="text-sm text-red-600">17 conversations</p>
              </div>
            </div>

            {/* Buying Signals */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Recent Buying Signals Detected</h4>
              <div className="space-y-2">
                {[
                  { signal: 'Budget Discussion', count: 12, priority: 'high' },
                  { signal: 'Timeline Mentioned', count: 8, priority: 'medium' },
                  { signal: 'Decision Maker Involved', count: 5, priority: 'high' },
                  { signal: 'Competitor Comparison', count: 3, priority: 'medium' }
                ].map((signal, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        signal.priority === 'high' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="font-medium">{signal.signal}</span>
                    </div>
                    <span className="text-sm text-gray-600">{signal.count} detected</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Analysis Tool */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Analyze New Conversation</h4>
              <p className="text-gray-600 mb-4">Upload or analyze recent conversations for AI-powered insights.</p>
              <button
                onClick={() => conversationAnalysis.mutate('sample-activity-id')}
                disabled={conversationAnalysis.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {conversationAnalysis.isPending ? 'Analyzing...' : 'Analyze Conversation'}
              </button>
              {conversationAnalysis.isSuccess && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700">✓ Conversation analyzed successfully!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIAnalyticsDashboard