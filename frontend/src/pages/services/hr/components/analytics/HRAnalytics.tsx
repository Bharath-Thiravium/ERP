import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Target, Brain, AlertTriangle, Award, Calendar } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'

const HRAnalytics: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [analyticsData] = useState({
    retentionRate: 94.2,
    engagementScore: 8.7,
    productivityIndex: 92,
    diversityScore: 78,
    trainingEffectiveness: 85,
    recruitmentEfficiency: 76,
    timeToHire: 18,
    costPerHire: 45000
  })

  const fetchAnalyticsData = async () => {
    if (!sessionKey) return
    
    try {
      // API calls will be implemented when backend is ready
      console.log('Fetching HR analytics data...')
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [sessionKey])

  const getScoreColor = (score: number, threshold: { good: number; average: number }) => {
    if (score >= threshold.good) return 'text-green-600 dark:text-green-400'
    if (score >= threshold.average) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number, threshold: { good: number; average: number }) => {
    if (score >= threshold.good) return 'from-green-500 to-emerald-600'
    if (score >= threshold.average) return 'from-yellow-500 to-orange-600'
    return 'from-red-500 to-pink-600'
  }

  const renderProgressBar = (value: number, max: number = 100, color: string = 'blue') => (
    <div className="flex items-center space-x-3">
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`bg-${color}-500 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${(value / max) * 100}%` }}
        ></div>
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-white min-w-[3rem]">
        {typeof value === 'number' ? value.toFixed(1) : value}%
      </span>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Key HR Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={`bg-gradient-to-r ${getScoreBg(analyticsData.retentionRate, { good: 90, average: 80 })} text-white border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Retention Rate</p>
                <p className="text-3xl font-bold">{analyticsData.retentionRate}%</p>
                <p className="text-xs opacity-75 mt-1">Annual retention</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${getScoreBg(analyticsData.engagementScore * 10, { good: 80, average: 70 })} text-white border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Engagement Score</p>
                <p className="text-3xl font-bold">{analyticsData.engagementScore}/10</p>
                <p className="text-xs opacity-75 mt-1">Employee satisfaction</p>
              </div>
              <Award className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${getScoreBg(analyticsData.productivityIndex, { good: 85, average: 75 })} text-white border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Productivity Index</p>
                <p className="text-3xl font-bold">{analyticsData.productivityIndex}</p>
                <p className="text-xs opacity-75 mt-1">Performance metric</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-r ${getScoreBg(analyticsData.diversityScore, { good: 80, average: 70 })} text-white border-0`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Diversity Score</p>
                <p className="text-3xl font-bold">{analyticsData.diversityScore}%</p>
                <p className="text-xs opacity-75 mt-1">Workplace diversity</p>
              </div>
              <Target className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span>Performance Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee Retention</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.retentionRate, { good: 90, average: 80 })}`}>
                  {analyticsData.retentionRate}%
                </span>
              </div>
              {renderProgressBar(analyticsData.retentionRate, 100, 'green')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Engagement Score</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.engagementScore * 10, { good: 80, average: 70 })}`}>
                  {analyticsData.engagementScore}/10
                </span>
              </div>
              {renderProgressBar(analyticsData.engagementScore * 10, 100, 'blue')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Productivity Index</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.productivityIndex, { good: 85, average: 75 })}`}>
                  {analyticsData.productivityIndex}
                </span>
              </div>
              {renderProgressBar(analyticsData.productivityIndex, 100, 'purple')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Training Effectiveness</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.trainingEffectiveness, { good: 80, average: 70 })}`}>
                  {analyticsData.trainingEffectiveness}%
                </span>
              </div>
              {renderProgressBar(analyticsData.trainingEffectiveness, 100, 'indigo')}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-green-500" />
              <span>Recruitment Analytics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{analyticsData.timeToHire}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Days to hire</p>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{(analyticsData.costPerHire / 1000).toFixed(0)}K</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Cost per hire</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recruitment Efficiency</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.recruitmentEfficiency, { good: 80, average: 70 })}`}>
                  {analyticsData.recruitmentEfficiency}%
                </span>
              </div>
              {renderProgressBar(analyticsData.recruitmentEfficiency, 100, 'green')}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Diversity Score</span>
                <span className={`text-sm font-bold ${getScoreColor(analyticsData.diversityScore, { good: 80, average: 70 })}`}>
                  {analyticsData.diversityScore}%
                </span>
              </div>
              {renderProgressBar(analyticsData.diversityScore, 100, 'purple')}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI-Powered Insights */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <span>AI-Powered HR Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Retention Prediction</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                AI predicts 3 employees at high risk of leaving in the next 6 months. Proactive intervention recommended.
              </p>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Award className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Performance Optimization</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Identified 12 high-potential employees ready for leadership roles. Consider for promotion or special projects.
              </p>
              <Button size="sm" variant="outline">
                Create Plan
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Skill Gap Analysis</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Critical skills gaps identified in AI/ML and cloud technologies. Training programs recommended for 23 employees.
              </p>
              <Button size="sm" variant="outline">
                Plan Training
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Diversity & Inclusion</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Gender diversity in leadership roles is below industry average. Targeted recruitment and development needed.
              </p>
              <Button size="sm" variant="outline">
                Action Plan
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-teal-500 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Compensation Analysis</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Salary benchmarking shows 15% of employees are underpaid compared to market rates. Budget impact: ₹12.5L annually.
              </p>
              <Button size="sm" variant="outline">
                Review Salaries
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-pink-500 rounded-lg">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Team Dynamics</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                AI analysis reveals optimal team compositions. Restructuring 2 teams could improve productivity by 18%.
              </p>
              <Button size="sm" variant="outline">
                Optimize Teams
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Reports */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            <span>Generate Reports</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 h-12">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance Report
            </Button>
            <Button className="bg-gradient-to-r from-green-500 to-emerald-600 h-12">
              <Users className="h-4 w-4 mr-2" />
              Workforce Analytics
            </Button>
            <Button className="bg-gradient-to-r from-purple-500 to-violet-600 h-12">
              <Target className="h-4 w-4 mr-2" />
              Recruitment Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default HRAnalytics