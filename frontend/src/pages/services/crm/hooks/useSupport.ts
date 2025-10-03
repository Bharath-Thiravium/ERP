import { useState, useEffect } from 'react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

export const useSupport = () => {
  const { sessionKey } = useServiceUserStore()
  const [tickets, setTickets] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [slas] = useState<any[]>([])
  const [knowledgeBase, setKnowledgeBase] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTickets = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getTickets(sessionKey!, params)
      setTickets(response.data.results || response.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets')
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }

  const createTicket = async (data: any) => {
    try {
      const response = await crmApi.createTicket(sessionKey!, data)
      await fetchTickets()
      toast.success('Ticket created successfully')
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to create ticket'
      toast.error(errorMessage)
      throw err
    }
  }

  const updateTicket = async (id: number, data: any) => {
    try {
      const response = await crmApi.updateTicket(sessionKey!, id, data)
      await fetchTickets()
      toast.success('Ticket updated successfully')
      return response.data
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update ticket'
      toast.error(errorMessage)
      throw err
    }
  }

  const assignTicket = async (id: number, agentId: number) => {
    try {
      await crmApi.assignTicket(sessionKey!, id, agentId)
      await fetchTickets()
      toast.success('Ticket assigned successfully')
    } catch (err: any) {
      toast.error('Failed to assign ticket')
      throw err
    }
  }

  const resolveTicket = async (id: number) => {
    try {
      await crmApi.resolveTicket(sessionKey!, id)
      await fetchTickets()
      toast.success('Ticket resolved successfully')
    } catch (err: any) {
      toast.error('Failed to resolve ticket')
      throw err
    }
  }

  const fetchStats = async () => {
    try {
      const response = await crmApi.getSLADashboard(sessionKey!)
      setStats(response.data)
    } catch (err: any) {
      console.error('Failed to fetch support stats:', err)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await crmApi.getTicketCategories(sessionKey!)
      setCategories(response.data.results || response.data || [])
    } catch (err: any) {
      console.error('Failed to fetch categories:', err)
    }
  }

  const fetchKnowledgeBase = async (params?: any) => {
    try {
      const response = await crmApi.getKnowledgeBase(sessionKey!, params)
      setKnowledgeBase(response.data.results || response.data || [])
    } catch (err: any) {
      console.error('Failed to fetch knowledge base:', err)
    }
  }

  const searchKnowledgeBase = async (query: string) => {
    try {
      const response = await crmApi.searchKnowledgeBase(sessionKey!, query)
      return response.data
    } catch (err: any) {
      toast.error('Search failed')
      return []
    }
  }

  useEffect(() => {
    if (sessionKey!) {
      fetchTickets()
      fetchStats()
      fetchCategories()
      fetchKnowledgeBase()
    }
  }, [sessionKey])

  return {
    tickets,
    categories,
    slas,
    knowledgeBase,
    stats,
    loading,
    error,
    fetchTickets,
    createTicket,
    updateTicket,
    assignTicket,
    resolveTicket,
    fetchStats,
    fetchCategories,
    fetchKnowledgeBase,
    searchKnowledgeBase
  }
}