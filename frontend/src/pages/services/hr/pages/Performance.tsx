import React, { useState, useEffect } from 'react'
import { Award, Star, TrendingUp, Users, Target, Plus } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { PerformanceReviewModal } from '../components/performance/PerformanceReviewModal'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface PerformanceDashboard {
  overview: {
    total_reviews: number
    pending_reviews: number
    completed_reviews: number
  }
  average_ratings: {
    avg_overall: number
    avg_quality: number
    avg_productivity: number
    avg_collaboration: number
  }
  top_performers: Array<{
    employee_name: string
    employee_id: string
    department: string
    overall_rating: number
    review_period: string
  }>
  department_performance: Array<{
    employee__department__name: string
    avg_rating: number
    review_count: number
  }>
  recent_reviews: Array<{
    employee_name: string
    reviewer_name: string
    overall_rating: number
    status: string
    created_at: string
  }>
}

const Performance: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [dashboardData, setDashboardData] = useState<PerformanceDashboard | null>(null)
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedReview, setSelectedReview] = useState<any>(null)

  useEffect(() => {
    fetchDashboardData()
    if (activeTab === 'reviews') {
      fetchAllReviews()
    } else if (activeTab === 'analytics') {
      fetchAnalyticsData()
    }
  }, [sessionKey, activeTab])

  const fetchDashboardData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/performance/dashboard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const fetchAllReviews = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/performance/get_all_reviews/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setAllReviews(response.data.reviews || [])
    } catch (error) {
      console.error('Error fetching reviews:', error)
      toast.error('Failed to load reviews')
    }
  }

  const fetchAnalyticsData = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/performance/analytics/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setAnalyticsData(response.data)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400'
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const handleNewReview = () => {
    setSelectedReview(null)
    setShowReviewModal(true)
  }


  const handleReviewModalSuccess = () => {
    fetchDashboardData()
    if (activeTab === 'reviews') {
      fetchAllReviews()
    } else if (activeTab === 'analytics') {
      fetchAnalyticsData()
    }
    setSelectedReview(null)
  }

  const handleCloseReviewModal = () => {
    setShowReviewModal(false)
    setSelectedReview(null)
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-current text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-current text-yellow-400 opacity-50" />)
    }

    const remainingStars = 5 - Math.ceil(rating)
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300 dark:text-gray-600" />)
    }

    return stars
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Performance Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Track, evaluate, and improve employee performance
              </p>
            </div>
          </div>
          <Button 
            onClick={handleNewReview}
            className="bg-gradient-to-r from-purple-500 to-violet-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'reviews'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Reviews
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Analytics
        </button>
      </div>

      {dashboardData && (
        <>
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Total Reviews</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.total_reviews}</p>
                      <p className="text-xs opacity-75">All time</p>
                    </div>
                    <Award className="h-8 w-8 opacity-80" />
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Pending Reviews</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.pending_reviews}</p>
                      <p className="text-xs opacity-75">Need attention</p>
                    </div>
                    <Target className="h-8 w-8 opacity-80" />
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Completed</p>
                      <p className="text-3xl font-bold">{dashboardData.overview.completed_reviews}</p>
                      <p className="text-xs opacity-75">Approved reviews</p>
                    </div>
                    <Users className="h-8 w-8 opacity-80" />
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-90">Avg Rating</p>
                      <p className="text-3xl font-bold">{(dashboardData.average_ratings.avg_overall || 0).toFixed(1)}</p>
                      <p className="text-xs opacity-75">Out of 5.0</p>
                    </div>
                    <TrendingUp className="h-8 w-8 opacity-80" />
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Average Ratings Breakdown */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Rating</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">{renderStars(dashboardData.average_ratings.avg_overall || 0)}</div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(dashboardData.average_ratings.avg_overall || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quality Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">{renderStars(dashboardData.average_ratings.avg_quality || 0)}</div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(dashboardData.average_ratings.avg_quality || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Productivity</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">{renderStars(dashboardData.average_ratings.avg_productivity || 0)}</div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(dashboardData.average_ratings.avg_productivity || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Collaboration</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex">{renderStars(dashboardData.average_ratings.avg_collaboration || 0)}</div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {(dashboardData.average_ratings.avg_collaboration || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.top_performers.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.top_performers.slice(0, 5).map((performer, index) => (
                          <div key={performer.employee_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{performer.employee_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{performer.department}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1">
                                <div className="flex">{renderStars(performer.overall_rating)}</div>
                              </div>
                              <p className={`font-bold ${getRatingColor(performer.overall_rating)}`}>
                                {performer.overall_rating.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No performance reviews yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Department Performance & Recent Reviews */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Performance */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle>Department Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.department_performance.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.department_performance.map((dept) => (
                          <div key={dept.employee__department__name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{dept.employee__department__name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{dept.review_count} reviews</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1">
                                <div className="flex">{renderStars(dept.avg_rating)}</div>
                              </div>
                              <p className={`font-bold ${getRatingColor(dept.avg_rating)}`}>
                                {dept.avg_rating.toFixed(1)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No department data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Reviews */}
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle>Recent Reviews</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardData.recent_reviews.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.recent_reviews.map((review, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{review.employee_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">by {review.reviewer_name}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(review.status)}`}>
                                  {review.status}
                                </span>
                                <span className={`font-bold ${getRatingColor(review.overall_rating)}`}>
                                  {review.overall_rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No recent reviews</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Performance Reviews ({allReviews.length})</CardTitle>
                    <Button 
                      onClick={handleNewReview}
                      className="bg-gradient-to-r from-purple-500 to-violet-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Review
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {allReviews.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Employee</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Reviewer</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Period</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Rating</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allReviews.map((review) => (
                            <tr key={review.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-4 px-4">
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{review.employee_name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">{review.employee_id}</p>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-gray-900 dark:text-white">{review.reviewer_name}</td>
                              <td className="py-4 px-4 text-gray-900 dark:text-white">{review.review_period}</td>
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-2">
                                  <div className="flex">{renderStars(review.overall_rating)}</div>
                                  <span className={`font-bold ${getRatingColor(review.overall_rating)}`}>
                                    {review.overall_rating.toFixed(1)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(review.status)}`}>
                                  {review.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-gray-900 dark:text-white">
                                {new Date(review.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Reviews Yet</h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Create your first performance review</p>
                      <Button 
                        onClick={handleNewReview}
                        className="bg-gradient-to-r from-purple-500 to-violet-600"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsData ? (
                <>
                  {/* Rating Distribution */}
                  <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                    <CardHeader>
                      <CardTitle>Rating Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analyticsData.rating_distribution?.length > 0 ? (
                        <div className="space-y-3">
                          {analyticsData.rating_distribution.map((item: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-900 dark:text-white">{item.rating_range}</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">{item.count} reviews</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No rating data available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Goal Achievement */}
                  <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                    <CardHeader>
                      <CardTitle>Goal Achievement Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {analyticsData.goal_achievement?.avg_goal_achievement?.toFixed(1) || '0.0'}%
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Average Achievement</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {analyticsData.goal_achievement?.high_achievers || 0}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">High Achievers (90%+)</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {analyticsData.goal_achievement?.low_achievers || 0}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Need Improvement (&lt;50%)</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Performance Trends */}
                  {analyticsData.performance_trends?.length > 0 && (
                    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                      <CardHeader>
                        <CardTitle>Performance Trends</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {analyticsData.performance_trends.map((trend: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <span className="text-gray-900 dark:text-white">
                                {new Date(trend.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </span>
                              <div className="flex items-center space-x-4">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {trend.review_count} reviews
                                </span>
                                <span className={`font-bold ${getRatingColor(trend.avg_rating)}`}>
                                  {trend.avg_rating?.toFixed(1) || '0.0'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
                  <CardHeader>
                    <CardTitle>Performance Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Analytics Data</h3>
                      <p className="text-gray-500 dark:text-gray-400">Create some performance reviews to see analytics</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* Performance Review Modal */}
      <PerformanceReviewModal
        isOpen={showReviewModal}
        onClose={handleCloseReviewModal}
        onSuccess={handleReviewModalSuccess}
        review={selectedReview}
      />
    </div>
  )
}

export default Performance