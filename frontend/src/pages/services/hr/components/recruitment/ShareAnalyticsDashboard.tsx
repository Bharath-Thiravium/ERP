import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Share2, Eye, MousePointer, Target, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const ShareAnalyticsDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(30)
  // Removed unused selectedJob state
  const [jobPerformance, setJobPerformance] = useState<any>(null)

  useEffect(() => {
    if (sessionKey) {
      fetchDashboardData()
    }
  }, [sessionKey, selectedPeriod])

  const fetchDashboardData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/share-analytics/dashboard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          days: selectedPeriod
        }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const fetchJobPerformance = async (jobId: string) => {
    if (!sessionKey || !jobId) return
    
    try {
      const response = await api.get('/api/hr/share-analytics/job-performance/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          job_id: jobId
        }
      })
      setJobPerformance(response.data)
    } catch (error) {
      console.error('Error fetching job performance:', error)
      toast.error('Failed to load job performance data')
    }
  }

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      whatsapp: '💬',
      linkedin: '💼',
      gmail: '📧',
      outlook: '📨',
      email: '✉️',
      facebook: '📘',
      twitter: '🐦',
      instagram: '📸',
      telegram: '✈️',
      copy_link: '🔗'
    }
    return icons[platform] || '📤'
  }

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      whatsapp: 'bg-green-500',
      linkedin: 'bg-blue-600',
      gmail: 'bg-red-500',
      outlook: 'bg-blue-500',
      email: 'bg-gray-600',
      facebook: 'bg-blue-600',
      twitter: 'bg-black',
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      telegram: 'bg-blue-500',
      copy_link: 'bg-gray-500'
    }
    return colors[platform] || 'bg-gray-400'
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No sharing data yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Start sharing job postings to see analytics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Share Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Track your job sharing performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Shares</p>
                <p className="text-3xl font-bold">{dashboardData.total_shares}</p>
              </div>
              <Share2 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Clicks</p>
                <p className="text-3xl font-bold">
                  {dashboardData.platform_stats.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0)}
                </p>
              </div>
              <MousePointer className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-violet-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Applications</p>
                <p className="text-3xl font-bold">
                  {dashboardData.platform_stats.reduce((sum: number, p: any) => sum + (p.applications || 0), 0)}
                </p>
              </div>
              <Target className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Conversion Rate</p>
                <p className="text-3xl font-bold">
                  {dashboardData.platform_stats.length > 0 ? 
                    Math.round(
                      (dashboardData.platform_stats.reduce((sum: number, p: any) => sum + (p.applications || 0), 0) /
                       Math.max(dashboardData.platform_stats.reduce((sum: number, p: any) => sum + (p.clicks || 0), 0), 1)) * 100
                    ) : 0
                  }%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.platform_stats.map((platform: any) => (
              <div key={platform.platform} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getPlatformColor(platform.platform)} rounded-lg flex items-center justify-center text-white text-lg`}>
                    {getPlatformIcon(platform.platform)}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{platform.platform.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">{platform.count} shares</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{platform.clicks || 0}</p>
                    <p className="text-gray-500">Clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{platform.applications || 0}</p>
                    <p className="text-gray-500">Applications</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">
                      {platform.clicks > 0 ? Math.round((platform.applications || 0) / platform.clicks * 100) : 0}%
                    </p>
                    <p className="text-gray-500">Conversion</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Jobs */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.top_jobs.map((job: any) => (
                <div key={job.job_posting__id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{job.job_posting__title}</p>
                    <p className="text-xs text-gray-500">{job.shares} shares • {job.applications || 0} applications</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchJobPerformance(job.job_posting__id)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Sharers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sharers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.top_sharers.map((sharer: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {sharer.shared_by__full_name?.charAt(0) || sharer.shared_by__username?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sharer.shared_by__full_name || sharer.shared_by__username}</p>
                      <p className="text-xs text-gray-500">{sharer.shares} shares</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{sharer.shares}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Share Trends ({dashboardData.date_range})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between space-x-1">
            {dashboardData.daily_trends.map((day: any, index: number) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="w-full bg-blue-500 rounded-t-sm min-h-[4px] transition-all hover:bg-blue-600"
                  style={{ 
                    height: `${Math.max((day.shares / Math.max(...dashboardData.daily_trends.map((d: any) => d.shares), 1)) * 200, 4)}px` 
                  }}
                  title={`${day.shares} shares on ${new Date(day.date).toLocaleDateString()}`}
                ></div>
                <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Job Performance Detail Modal */}
      {jobPerformance && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Job Performance: {jobPerformance.job_title}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setJobPerformance(null)}>
                ×
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{jobPerformance.total_shares}</p>
                  <p className="text-sm text-gray-600">Total Shares</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{jobPerformance.total_clicks}</p>
                  <p className="text-sm text-gray-600">Total Clicks</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{jobPerformance.total_applications}</p>
                  <p className="text-sm text-gray-600">Applications</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Platform Performance</h3>
                {jobPerformance.platform_performance.map((platform: any) => (
                  <div key={platform.platform} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 ${getPlatformColor(platform.platform)} rounded-lg flex items-center justify-center text-white text-sm`}>
                        {getPlatformIcon(platform.platform)}
                      </div>
                      <span className="font-medium capitalize">{platform.platform.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{platform.shares}</p>
                        <p className="text-gray-500">Shares</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{platform.clicks || 0}</p>
                        <p className="text-gray-500">Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{platform.applications || 0}</p>
                        <p className="text-gray-500">Apps</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{Math.round(platform.conversion_rate || 0)}%</p>
                        <p className="text-gray-500">Conv.</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShareAnalyticsDashboard