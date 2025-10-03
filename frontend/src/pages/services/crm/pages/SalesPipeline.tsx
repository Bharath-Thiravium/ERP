import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Plus, TrendingUp, Target, DollarSign, Calendar } from 'lucide-react'
import { crmApi } from '../utils/api'
import { PipelineOverview, Deal, VelocityMetrics, SalesQuota } from '../types'
import { formatCurrency, formatDate } from '../../../../lib/utils'
import { DealModal } from '../components/DealModal'
import { QuotaModal } from '../components/QuotaModal'

interface SalesPipelineProps {
  sessionKey: string
}

export const SalesPipeline: React.FC<SalesPipelineProps> = ({ sessionKey }) => {
  const [pipelineData, setPipelineData] = useState<PipelineOverview[]>([])
  const [velocityMetrics, setVelocityMetrics] = useState<VelocityMetrics | null>(null)
  const [quotas, setQuotas] = useState<SalesQuota[]>([])
  const [loading, setLoading] = useState(true)
  const [showDealModal, setShowDealModal] = useState(false)
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [activeTab, setActiveTab] = useState('pipeline')

  useEffect(() => {
    loadPipelineData()
  }, [sessionKey])

  const loadPipelineData = async () => {
    try {
      setLoading(true)
      const [pipelineRes, velocityRes, quotasRes] = await Promise.all([
        crmApi.getPipelineOverview(sessionKey!),
        crmApi.getVelocityMetrics(sessionKey!),
        crmApi.getPerformanceDashboard(sessionKey!)
      ])
      
      setPipelineData(pipelineRes.data)
      setVelocityMetrics(velocityRes.data)
      setQuotas(quotasRes.data.monthly_performance || [])
    } catch (error) {
      console.error('Error loading pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }



  const getStageColor = (index: number) => {
    const colors = ['bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500']
    return colors[index % colors.length]
  }

  const totalPipelineValue = pipelineData.reduce((sum, stage) => sum + stage.total_value, 0)
  const totalWeightedValue = pipelineData.reduce((sum, stage) => sum + stage.weighted_value, 0)

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
          <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
          <p className="text-gray-600">Manage deals and track sales performance</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowQuotaModal(true)} variant="outline">
            <Target className="h-4 w-4 mr-2" />
            Set Quota
          </Button>
          <Button onClick={() => setShowDealModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pipeline Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weighted Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalWeightedValue)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold">{velocityMetrics?.win_rate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Cycle</p>
                <p className="text-2xl font-bold">{velocityMetrics?.avg_sales_cycle.toFixed(0)} days</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pipeline'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pipeline View
            </button>
            <button 
              onClick={() => setActiveTab('performance')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Performance
            </button>
            <button 
              onClick={() => setActiveTab('quotas')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'quotas'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Quotas
            </button>
          </nav>
        </div>

        {activeTab === 'pipeline' && (
          <div className="space-y-4">
            {/* Pipeline Stages */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {pipelineData.map((stageData, index) => (
                <Card key={stageData.stage.id} className="h-fit">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {stageData.stage.name}
                      </CardTitle>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageColor(index)} text-white`}>
                        {stageData.deals_count}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        Total: {formatCurrency(stageData.total_value)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Weighted: {formatCurrency(stageData.weighted_value)}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {stageData.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedDeal(deal)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-sm truncate">{deal.name}</h4>
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                              {deal.probability}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">{deal.account_name}</p>
                          <p className="text-sm font-medium">{formatCurrency(deal.value)}</p>
                          <p className="text-xs text-gray-500">
                            Close: {formatDate(deal.expected_close_date)}
                          </p>
                          {deal.days_in_stage && deal.days_in_stage > 30 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 mt-1">
                              {deal.days_in_stage} days in stage
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sales Velocity Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Sales Cycle</span>
                    <span className="font-medium">{velocityMetrics?.avg_sales_cycle.toFixed(0)} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Win Rate</span>
                    <span className="font-medium">{velocityMetrics?.win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Deal Size</span>
                    <span className="font-medium">{formatCurrency(velocityMetrics?.avg_deal_size || 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pipeline Coverage</span>
                      <span>3.2x</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Forecast Accuracy</span>
                      <span>78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Stage Progression</span>
                      <span>Good</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'quotas' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quotas.map((quota) => (
                <Card key={quota.user}>
                  <CardHeader>
                    <CardTitle className="text-lg">{quota.user}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Quota Achievement</span>
                        <span>{(quota.percentage || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(quota.percentage || 0, 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Achieved</span>
                        <span>{formatCurrency(quota.achieved || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Target</span>
                        <span>{formatCurrency(quota.quota || 0)}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Deals Closed</span>
                        <span>{quota.deals_achieved}/{quota.deals_target}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showDealModal && (
        <DealModal
          isOpen={showDealModal}
          onClose={() => {
            setShowDealModal(false)
            setSelectedDeal(null)
          }}
          onSave={loadPipelineData}
          sessionKey={sessionKey}
          deal={selectedDeal}
        />
      )}

      {showQuotaModal && (
        <QuotaModal
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
          onSave={loadPipelineData}
          sessionKey={sessionKey}
        />
      )}
    </div>
  )
}