import React from 'react'
import { TrendingUp, Brain, Users, Activity, Target, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'

interface LeadScoreCardProps {
  leadScore: any
  onViewDetails?: () => void
}

export const LeadScoreCard: React.FC<LeadScoreCardProps> = ({ leadScore, onViewDetails }) => {
  const getGradeColor = (grade: string) => {
    const colors = {
      very_hot: 'from-red-500 to-orange-500',
      hot: 'from-orange-500 to-yellow-500',
      warm: 'from-yellow-500 to-green-500',
      cold: 'from-blue-500 to-gray-500'
    }
    return colors[grade as keyof typeof colors] || colors.cold
  }

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'very_hot': return '🔥'
      case 'hot': return '🌡️'
      case 'warm': return '☀️'
      case 'cold': return '❄️'
      default: return '📊'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-600'
    if (score >= 50) return 'text-orange-600'
    if (score >= 25) return 'text-yellow-600'
    return 'text-blue-600'
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all duration-200 cursor-pointer" onClick={onViewDetails}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${getGradeColor(leadScore.grade)} flex items-center justify-center text-white font-bold text-lg`}>
              {getGradeIcon(leadScore.grade)}
            </div>
            <div>
              <CardTitle className="text-lg">{leadScore.lead_name}</CardTitle>
              <CardDescription>{leadScore.lead_company || leadScore.lead_email}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(leadScore.total_score)}`}>
              {leadScore.total_score}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {leadScore.grade.replace('_', ' ')}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-blue-500" />
            <div>
              <div className="text-sm font-medium">Behavioral</div>
              <div className="text-lg font-bold text-blue-600">{leadScore.behavioral_score}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">Demographic</div>
              <div className="text-lg font-bold text-green-600">{leadScore.demographic_score}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-purple-500" />
            <div>
              <div className="text-sm font-medium">Engagement</div>
              <div className="text-lg font-bold text-purple-600">{leadScore.engagement_score}</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-sm font-medium">Predictive</div>
              <div className="text-lg font-bold text-orange-600">{leadScore.predictive_score}</div>
            </div>
          </div>
        </div>

        {/* Conversion Probability */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-indigo-500" />
              <span className="text-sm font-medium">Conversion Probability</span>
            </div>
            <span className="text-lg font-bold text-indigo-600">
              {(leadScore.conversion_probability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${leadScore.conversion_probability * 100}%` }}
            ></div>
          </div>
        </div>

        {/* AI Recommendations */}
        {leadScore.recommended_actions && leadScore.recommended_actions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI Recommendations</span>
            </div>
            <div className="space-y-1">
              {leadScore.recommended_actions.slice(0, 2).map((action: string, index: number) => (
                <div key={index} className="text-sm text-blue-600 dark:text-blue-400">
                  {action}
                </div>
              ))}
              {leadScore.recommended_actions.length > 2 && (
                <div className="text-xs text-blue-500 dark:text-blue-400">
                  +{leadScore.recommended_actions.length - 2} more recommendations
                </div>
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last calculated: {new Date(leadScore.last_calculated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  )
}