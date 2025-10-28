import React, { useState, useEffect } from 'react'
import { BarChart3, Users, Target, Building, Phone, Calendar, TrendingUp, DollarSign, Activity, AlertCircle, PieChart } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

export const CRMDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [, setSalesFunnel] = useState<any[]>([])
  const [leadsByStatus, setLeadsByStatus] = useState<any[]>([])
  const [opportunitiesByStage, setOpportunitiesByStage] = useState<any[]>([])

  useEffect(() => {
    if (sessionKey!) {
      fetchDashboardData()
    }
  }, [sessionKey])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsRes, activitiesRes, funnelRes] = await Promise.all([
        crmApi.getDashboardStats(sessionKey!),
        crmApi.getRecentActivities(sessionKey!),
        crmApi.getSalesFunnel(sessionKey!)
      ])
      
      setStats(statsRes.data)
      setRecentActivities(activitiesRes.data)
      setSalesFunnel(funnelRes.data)

      // Fetch additional data
      try {
        const leadsRes = await crmApi.getLeads(sessionKey!)
        const oppsRes = await crmApi.getOpportunities(sessionKey!)
        
        // Process leads by status
        const leads = leadsRes.data.results || leadsRes.data
        const leadStatusCounts = leads.reduce((acc: any, lead: any) => {
          acc[lead.status] = (acc[lead.status] || 0) + 1
          return acc
        }, {})
        setLeadsByStatus(Object.entries(leadStatusCounts).map(([status, count]) => ({ status, count })))

        // Process opportunities by stage
        const opportunities = oppsRes.data.results || oppsRes.data
        const oppStageCounts = opportunities.reduce((acc: any, opp: any) => {
          acc[opp.stage] = (acc[opp.stage] || 0) + 1
          return acc
        }, {})
        setOpportunitiesByStage(Object.entries(oppStageCounts).map(([stage, count]) => ({ stage, count })))
      } catch (error) {
        console.error('Error fetching additional data:', error)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: 'bg-blue-500',
      contacted: 'bg-yellow-500',
      qualified: 'bg-green-500',
      proposal: 'bg-purple-500',
      negotiation: 'bg-orange-500',
      won: 'bg-green-600',
      lost: 'bg-red-500',
      prospecting: 'bg-blue-500',
      qualification: 'bg-yellow-500',
      needs_analysis: 'bg-purple-500',
      closed_won: 'bg-green-600',
      closed_lost: 'bg-red-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to CRM Module</h1>
        <p className="text-orange-100">Track your sales performance and manage customer relationships effectively</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.total_leads || 0}</div>
            <p className="text-xs text-muted-foreground">Active prospects in pipeline</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opportunities</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.total_opportunities || 0}</div>
            <p className="text-xs text-muted-foreground">Active sales opportunities</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">₹{stats?.pipeline_value?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Total potential revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.won_opportunities || 0}</div>
            <p className="text-xs text-muted-foreground">Successfully closed deals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-blue-500" />
              <span>Leads by Status</span>
            </CardTitle>
            <CardDescription>Distribution of lead statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leadsByStatus.map((item, index) => {
                const total = leadsByStatus.reduce((sum, lead) => sum + (lead.count as number), 0)
                const percentage = total > 0 ? ((item.count as number) / total * 100).toFixed(1) : 0
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                      <span className="text-sm font-medium capitalize">{item.status.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                )
              })}
              {leadsByStatus.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No leads data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Opportunities by Stage */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span>Opportunities by Stage</span>
            </CardTitle>
            <CardDescription>Sales pipeline progression</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunitiesByStage.map((item, index) => {
                const total = opportunitiesByStage.reduce((sum, opp) => sum + (opp.count as number), 0)
                const percentage = total > 0 ? ((item.count as number) / total * 100).toFixed(1) : 0
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(item.stage)}`}></div>
                      <span className="text-sm font-medium capitalize">{item.stage.replace('_', ' ')}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getStatusColor(item.stage)}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                )
              })}
              {opportunitiesByStage.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No opportunities data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <span>Recent Activities</span>
            </CardTitle>
            <CardDescription>Latest CRM activities and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.slice(0, 6).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="h-2 w-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.subject}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        {activity.activity_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500">No recent activities</p>
                  <p className="text-xs text-gray-400">Activities will appear here as you use the CRM</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-green-500" />
                <span>Accounts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.total_accounts || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total accounts managed</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-purple-500" />
                <span>Contacts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats?.total_contacts || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active contacts</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-red-500" />
                <span>Today's Tasks</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.activities_today || 0}</div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Activities scheduled</p>
              {stats?.overdue_activities > 0 && (
                <div className="flex items-center space-x-1 mt-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{stats.overdue_activities} overdue</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}