import { useState, useEffect } from 'react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

export const useLeadScoring = () => {
  const { sessionKey } = useServiceUserStore()
  const [leadScores, setLeadScores] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [topLeads, setTopLeads] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [insights, setInsights] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLeadScores = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getLeadScores(sessionKey!, params)
      setLeadScores(response.data.results || response.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lead scores')
      console.error('Failed to fetch lead scores:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateLeadScore = async (leadId: number) => {
    try {
      setCalculating(true)
      const response = await crmApi.calculateLeadScore(sessionKey!, leadId)
      await fetchLeadScores()
      toast.success('Lead score calculated successfully')
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to calculate lead score'
      toast.error(errorMessage)
      throw err
    } finally {
      setCalculating(false)
    }
  }

  const bulkCalculateScores = async (leadIds?: number[]) => {
    try {
      setCalculating(true)
      const response = await crmApi.bulkCalculateScores(sessionKey!, leadIds)
      await fetchLeadScores()
      const successCount = response.data.results.filter((r: any) => r.success).length
      toast.success(`Calculated scores for ${successCount} leads`)
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to calculate scores'
      toast.error(errorMessage)
      throw err
    } finally {
      setCalculating(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await crmApi.getLeadScoringDashboard(sessionKey!)
      setDashboardData(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard data')
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await crmApi.getLeadScoringAnalytics(sessionKey!)
      setAnalytics(response.data)
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err)
    }
  }

  const fetchTopLeads = async (limit = 10) => {
    try {
      const response = await crmApi.getTopScoredLeads(sessionKey!, limit)
      setTopLeads(response.data)
    } catch (err: any) {
      console.error('Failed to fetch top leads:', err)
    }
  }

  const fetchRecommendations = async () => {
    try {
      const response = await crmApi.getLeadRecommendations(sessionKey!)
      setRecommendations(response.data)
    } catch (err: any) {
      console.error('Failed to fetch recommendations:', err)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await crmApi.getLeadScoringInsights(sessionKey!)
      setInsights(response.data)
    } catch (err: any) {
      console.error('Failed to fetch insights:', err)
    }
  }

  const refreshAllData = async () => {
    await Promise.all([
      fetchDashboardData(),
      fetchAnalytics(),
      fetchTopLeads(),
      fetchRecommendations(),
      fetchInsights()
    ])
  }

  useEffect(() => {
    if (sessionKey!) {
      fetchLeadScores()
      refreshAllData()
    }
  }, [sessionKey])

  return {
    leadScores,
    dashboardData,
    analytics,
    topLeads,
    recommendations,
    insights,
    loading,
    calculating,
    error,
    fetchLeadScores,
    calculateLeadScore,
    bulkCalculateScores,
    fetchDashboardData,
    fetchAnalytics,
    fetchTopLeads,
    fetchRecommendations,
    fetchInsights,
    refreshAllData
  }
}