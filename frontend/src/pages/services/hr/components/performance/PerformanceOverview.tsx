import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Target, Award, AlertTriangle, Star, Calendar } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
// import { PerformanceReview } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'

const PerformanceOverview: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [performanceData] = useState({
    avgRating: 4.2,
    totalReviews: 156,
    pendingReviews: 23,
    highPerformers: 34,
    improvementNeeded: 8,
    goalAchievement: 87
  })
  // const [recentReviews] = useState<PerformanceReview[]>([])
  // const [loading] = useState(true)

  const fetchPerformanceData = async () => {
    if (!sessionKey) return
    
    try {
      // setLoading(true)
      // API calls will be implemented when backend is ready
      console.log('Fetching performance data...')
      // setRecentReviews([])
    } catch (error) {
      console.error('Error fetching performance data:', error)
    } finally {
      // setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [sessionKey])

  // const getPerformanceColor = (rating: number) => {
  //   if (rating >= 4.5) return 'text-green-600 dark:text-green-400'
  //   if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400'
  //   if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400'
  //   return 'text-red-600 dark:text-red-400'
  // }

  // const getPerformanceBadge = (rating: number) => {
  //   if (rating >= 4.5) return { label: 'Excellent', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
  //   if (rating >= 3.5) return { label: 'Good', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' }
  //   if (rating >= 2.5) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' }
  //   return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
  // }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : i < rating
            ? 'text-yellow-400 fill-current opacity-50'
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ))
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Average Rating</p>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-3xl font-bold">{performanceData.avgRating}</p>
                  <div className="flex items-center space-x-1">
                    {renderStars(performanceData.avgRating)}
                  </div>
                </div>
                <p className="text-xs opacity-75 mt-1">Company-wide</p>
              </div>
              <BarChart3 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">High Performers</p>
                <p className="text-3xl font-bold">{performanceData.highPerformers}</p>
                <p className="text-xs opacity-75 mt-1">Top 20% employees</p>
              </div>
              <Award className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Goal Achievement</p>
                <p className="text-3xl font-bold">{performanceData.goalAchievement}%</p>
                <p className="text-xs opacity-75 mt-1">Average completion</p>
              </div>
              <Target className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Distribution */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>Performance Distribution</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                <Award className="h-8 w-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.highPerformers}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Excellent (4.5+)</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">52</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Good (3.5-4.4)</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">28</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Average (2.5-3.4)</p>
            </div>
            
            <div className="text-center">
              <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.improvementNeeded}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Needs Improvement</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Reviews */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span>Pending Reviews ({performanceData.pendingReviews})</span>
            </CardTitle>
            <Button className="bg-gradient-to-r from-purple-500 to-violet-600">
              <BarChart3 className="h-4 w-4 mr-2" />
              Schedule Reviews
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {performanceData.pendingReviews === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">All reviews up to date</h3>
              <p className="text-gray-500 dark:text-gray-400">Great job! No pending performance reviews.</p>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Action Required</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {performanceData.pendingReviews} performance reviews are overdue and need immediate attention.
                  </p>
                </div>
              </div>
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600">
                View Pending Reviews
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Performance Insights */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <span>AI Performance Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Performance Trend</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Overall performance has improved by 12% this quarter. Engineering and Sales teams show highest growth.
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">87%</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Award className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Top Performers</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                AI identifies 34 employees as high performers. Consider them for leadership roles and special projects.
              </p>
              <Button size="sm" variant="outline">
                View Details
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-500 rounded-lg">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Goal Alignment</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                87% of employees have clear, measurable goals aligned with company objectives. Focus on remaining 13%.
              </p>
              <Button size="sm" variant="outline">
                Set Goals
              </Button>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">At-Risk Employees</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                8 employees show declining performance trends. Immediate intervention recommended to prevent turnover.
              </p>
              <Button size="sm" variant="outline">
                Create Action Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PerformanceOverview