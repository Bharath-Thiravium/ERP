import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Clock, Users, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'

const RecruitmentAnalytics: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [analytics, setAnalytics] = useState({
    totalApplications: 0,
    averageTimeToHire: 0,
    conversionRate: 0,
    topPerformingJobs: [] as any[],
    applicationsByStatus: {} as Record<string, number>,
    monthlyTrends: [] as any[],
    sourceAnalysis: [] as Array<{source: string, count: unknown}>
  })
  const [loading, setLoading] = useState(false)

  const fetchAnalytics = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const [jobsResponse, appsResponse] = await Promise.all([
        api.get('/api/hr/job-postings/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/job-applications/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      const jobs = jobsResponse.data.results || []
      const applications = appsResponse.data.results || []
      
      // Calculate analytics
      const totalApplications = applications.length
      const selectedApplications = applications.filter((app: any) => app.status === 'selected').length
      const conversionRate = totalApplications > 0 ? (selectedApplications / totalApplications * 100) : 0
      
      // Calculate average time to hire (simplified)
      const completedApplications = applications.filter((app: any) => 
        ['selected', 'rejected'].includes(app.status)
      )
      const averageTimeToHire = completedApplications.length > 0 
        ? Math.round(completedApplications.reduce((sum: number, app: any) => {
            const created = new Date(app.created_at)
            const updated = new Date(app.updated_at)
            return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / completedApplications.length)
        : 0
      
      // Applications by status
      const applicationsByStatus = applications.reduce((acc: any, app: any) => {
        acc[app.status] = (acc[app.status] || 0) + 1
        return acc
      }, {})
      
      // Top performing jobs
      const jobPerformance = jobs.map((job: any) => {
        const jobApplications = applications.filter((app: any) => app.job_posting === job.id)
        const selected = jobApplications.filter((app: any) => app.status === 'selected').length
        return {
          ...job,
          applicationsCount: jobApplications.length,
          selectedCount: selected,
          conversionRate: jobApplications.length > 0 ? (selected / jobApplications.length * 100) : 0
        }
      }).sort((a: any, b: any) => b.conversionRate - a.conversionRate).slice(0, 5)
      
      // Source analysis
      const sourceAnalysis = applications.reduce((acc: any, app: any) => {
        const source = app.application_source || 'direct'
        acc[source] = (acc[source] || 0) + 1
        return acc
      }, {})
      
      setAnalytics({
        totalApplications,
        averageTimeToHire,
        conversionRate,
        topPerformingJobs: jobPerformance,
        applicationsByStatus,
        monthlyTrends: [], // Would need more complex calculation
        sourceAnalysis: Object.entries(sourceAnalysis).map(([source, count]) => ({ source, count }))
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [sessionKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recruitment Analytics</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Applications</p>
                <p className="text-3xl font-bold">{analytics.totalApplications}</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Conversion Rate</p>
                <p className="text-3xl font-bold">{analytics.conversionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Avg Time to Hire</p>
                <p className="text-3xl font-bold">{analytics.averageTimeToHire}</p>
                <p className="text-xs opacity-75">days</p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Active Jobs</p>
                <p className="text-3xl font-bold">{analytics.topPerformingJobs.length}</p>
              </div>
              <BarChart3 className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Status Breakdown */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span>Application Status Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(analytics.applicationsByStatus).map(([status, count]) => (
              <div key={status} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{count as number}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Application Source Analysis */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-purple-500" />
            <span>Application Sources</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {analytics.sourceAnalysis.map((source: any) => (
              <div key={source.source} className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{source.count}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {source.source === 'direct' ? '🌐 Direct' : 
                   source.source === 'whatsapp' ? '💬 WhatsApp' :
                   source.source === 'linkedin' ? '💼 LinkedIn' :
                   source.source === 'gmail' ? '📧 Gmail' :
                   source.source === 'facebook' ? '📘 Facebook' :
                   source.source === 'twitter' ? '🐦 Twitter' :
                   source.source === 'instagram' ? '📷 Instagram' :
                   `📱 ${source.source}`}
                </div>
              </div>
            ))}
            {analytics.sourceAnalysis.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                No source data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Jobs */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span>Top Performing Jobs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topPerformingJobs.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{job.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{job.department_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {job.conversionRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {job.selectedCount}/{job.applicationsCount} hired
                  </div>
                </div>
              </div>
            ))}
            {analytics.topPerformingJobs.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No job performance data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default RecruitmentAnalytics