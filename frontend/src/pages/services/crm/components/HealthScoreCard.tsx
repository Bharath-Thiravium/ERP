import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { AlertTriangle, TrendingUp, Heart } from 'lucide-react'
import { CustomerHealthScore } from '../types'
import { formatDate } from '../../../../lib/utils'

interface HealthScoreCardProps {
  healthScore: CustomerHealthScore
  onClick?: () => void
}

export const HealthScoreCard: React.FC<HealthScoreCardProps> = ({ healthScore, onClick }) => {
  const getHealthColor = (score: number) => {
    if (score >= 81) return 'text-green-500'
    if (score >= 61) return 'text-blue-500'
    if (score >= 41) return 'text-yellow-500'
    if (score >= 21) return 'text-orange-500'
    return 'text-red-500'
  }



  const getStatusIcon = () => {
    if (healthScore.churn_risk > 0.7) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />
    }
    if (healthScore.upsell_opportunity > 0.7) {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    }
    return <Heart className="h-4 w-4 text-blue-500" />
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate">{healthScore.account_name}</CardTitle>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${
            healthScore.health_status === 'excellent' ? 'bg-green-100 text-green-800' :
            healthScore.health_status === 'good' ? 'bg-blue-100 text-blue-800' :
            healthScore.health_status === 'average' ? 'bg-gray-100 text-gray-800' :
            healthScore.health_status === 'poor' ? 'bg-red-100 text-red-800' :
            'bg-red-100 text-red-800'
          }`}>
            {healthScore.health_status_display}
          </span>
          <span className={`text-2xl font-bold ${getHealthColor(healthScore.overall_score)}`}>
            {healthScore.overall_score}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score Components */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Engagement</span>
            <span>{healthScore.engagement_score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${healthScore.engagement_score}%` }}></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Satisfaction</span>
            <span>{healthScore.satisfaction_score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${healthScore.satisfaction_score}%` }}></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Usage</span>
            <span>{healthScore.usage_score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${healthScore.usage_score}%` }}></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Financial</span>
            <span>{healthScore.financial_score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1">
            <div className="bg-blue-600 h-1 rounded-full" style={{ width: `${healthScore.financial_score}%` }}></div>
          </div>
        </div>

        {/* Risk Indicators */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center text-sm">
            <span>Churn Risk</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              healthScore.churn_risk > 0.5 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {(healthScore.churn_risk * 100).toFixed(0)}%
            </span>
          </div>
          {healthScore.upsell_opportunity > 0.5 && (
            <div className="flex justify-between items-center text-sm mt-1">
              <span>Upsell Opportunity</span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                {(healthScore.upsell_opportunity * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {healthScore.recommendations.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600 mb-1">Top Recommendation:</p>
            <p className="text-xs text-gray-800">{healthScore.recommendations[0]}</p>
          </div>
        )}

        <div className="text-xs text-gray-500 pt-2 border-t">
          Last updated: {formatDate(healthScore.last_calculated)}
        </div>
      </CardContent>
    </Card>
  )
}