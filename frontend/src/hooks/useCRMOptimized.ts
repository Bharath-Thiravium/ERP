/**
 * Optimized CRM hooks with caching and performance improvements
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { crmApi } from '../pages/services/crm/utils/api'
import { useServiceUserStore } from '../store/serviceUserStore'

// Cache configuration
const CACHE_CONFIG = {
  dashboard: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  leads: { staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 },
  opportunities: { staleTime: 2 * 60 * 1000, gcTime: 5 * 60 * 1000 },
  accounts: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  contacts: { staleTime: 5 * 60 * 1000, gcTime: 10 * 60 * 1000 },
  activities: { staleTime: 1 * 60 * 1000, gcTime: 3 * 60 * 1000 },
}

// Optimized dashboard hook
export const useCRMDashboard = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'dashboard', sessionKey],
    queryFn: () => sessionKey ? crmApi.getDashboardStats(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.dashboard,
    refetchOnWindowFocus: false,
    enabled: !!sessionKey,
  })
}

// Optimized leads hook
export const useLeads = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'leads', sessionKey],
    queryFn: () => sessionKey ? crmApi.getLeads(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.leads,
    enabled: !!sessionKey,
  })
}

// Optimized opportunities hook
export const useOpportunities = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'opportunities', sessionKey],
    queryFn: () => sessionKey ? crmApi.getOpportunities(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.opportunities,
    enabled: !!sessionKey,
  })
}

// Optimized accounts hook
export const useAccounts = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'accounts', sessionKey],
    queryFn: () => sessionKey ? crmApi.getAccounts(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.accounts,
    enabled: !!sessionKey,
  })
}

// Optimized contacts hook
export const useContacts = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'contacts', sessionKey],
    queryFn: () => sessionKey ? crmApi.getContacts(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.contacts,
    enabled: !!sessionKey,
  })
}

// Optimized activities hook
export const useActivities = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'activities', sessionKey],
    queryFn: () => sessionKey ? crmApi.getActivities(sessionKey) : Promise.reject('No session'),
    ...CACHE_CONFIG.activities,
    enabled: !!sessionKey,
  })
}

// Create operations
export const useCreateLead = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (data: any) => sessionKey ? crmApi.createLead(sessionKey, data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useCreateOpportunity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (data: any) => sessionKey ? crmApi.createOpportunity(sessionKey, data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useCreateAccount = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (data: any) => sessionKey ? crmApi.createAccount(sessionKey, data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useCreateContact = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (data: any) => sessionKey ? crmApi.createContact(sessionKey, data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useCreateActivity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (data: any) => sessionKey ? crmApi.createActivity(sessionKey, data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

// Update operations
export const useUpdateLead = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sessionKey ? crmApi.updateLead(sessionKey, parseInt(id), data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useUpdateOpportunity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sessionKey ? crmApi.updateOpportunity(sessionKey, parseInt(id), data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useUpdateAccount = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sessionKey ? crmApi.updateAccount(sessionKey, parseInt(id), data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] })
    },
  })
}

export const useUpdateContact = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sessionKey ? crmApi.updateContact(sessionKey, parseInt(id), data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
    },
  })
}

export const useUpdateActivity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      sessionKey ? crmApi.updateActivity(sessionKey, parseInt(id), data) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] })
    },
  })
}

// Delete operations
export const useDeleteLead = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (id: string) => sessionKey ? crmApi.deleteLead(sessionKey, parseInt(id)) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'leads'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (id: string) => sessionKey ? crmApi.deleteOpportunity(sessionKey, parseInt(id)) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'opportunities'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useDeleteAccount = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (id: string) => sessionKey ? crmApi.deleteAccount(sessionKey, parseInt(id)) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'accounts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useDeleteContact = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (id: string) => sessionKey ? crmApi.deleteContact(sessionKey, parseInt(id)) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'contacts'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

export const useDeleteActivity = () => {
  const queryClient = useQueryClient()
  const { sessionKey } = useServiceUserStore()
  
  return useMutation({
    mutationFn: (id: string) => sessionKey ? crmApi.deleteActivity(sessionKey, parseInt(id)) : Promise.reject('No session'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm', 'activities'] })
      queryClient.invalidateQueries({ queryKey: ['crm', 'dashboard'] })
    },
  })
}

// Additional hooks
export const useRecentActivities = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'recentActivities', sessionKey],
    queryFn: () => sessionKey ? crmApi.getRecentActivities(sessionKey) : Promise.reject('No session'),
    staleTime: 2 * 60 * 1000,
    enabled: !!sessionKey,
  })
}

export const useDashboards = () => {
  const { sessionKey } = useServiceUserStore()
  
  return useQuery({
    queryKey: ['crm', 'dashboards', sessionKey],
    queryFn: () => sessionKey ? crmApi.getDashboards(sessionKey) : Promise.reject('No session'),
    staleTime: 5 * 60 * 1000,
    enabled: !!sessionKey,
  })
}

// AI Analytics hooks
export const useAIAnalytics = () => {
  const { sessionKey } = useServiceUserStore()
  
  const leadScores = useQuery({
    queryKey: ['crm', 'ai', 'leadScores', sessionKey],
    queryFn: () => sessionKey ? crmApi.getLeadScores(sessionKey) : Promise.reject('No session'),
    staleTime: 10 * 60 * 1000,
    enabled: !!sessionKey,
  })
  
  const salesForecast = useQuery({
    queryKey: ['crm', 'ai', 'salesForecast', sessionKey],
    queryFn: () => sessionKey ? crmApi.getSalesForecast(sessionKey) : Promise.reject('No session'),
    staleTime: 10 * 60 * 1000,
    enabled: !!sessionKey,
  })
  
  const conversationAnalysis = useMutation({
    mutationFn: (activityId: string) => 
      sessionKey ? crmApi.analyzeConversation(sessionKey, activityId) : Promise.reject('No session'),
  })
  
  return {
    leadScores,
    salesForecast,
    conversationAnalysis,
  }
}

// Utility hooks
export const useDebounceSearch = (searchTerm: string, delay = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), delay)
    return () => clearTimeout(timer)
  }, [searchTerm, delay])
  
  return debouncedTerm
}

export const useCRMPerformance = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    apiCalls: 0,
  })
  
  const startTimer = useCallback(() => performance.now(), [])
  
  const endTimer = useCallback((startTime: number, metricName: string) => {
    const duration = performance.now() - startTime
    setMetrics(prev => ({ ...prev, [metricName]: duration }))
    if (duration > 1000) {
      console.warn(`Slow CRM operation: ${metricName} took ${duration}ms`)
    }
  }, [])
  
  const incrementApiCalls = useCallback(() => {
    setMetrics(prev => ({ ...prev, apiCalls: prev.apiCalls + 1 }))
  }, [])
  
  return { metrics, startTimer, endTimer, incrementApiCalls }
}

export const useVirtualizedTable = (data: any[], itemHeight = 50) => {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(400)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      data.length
    )
    
    return {
      startIndex,
      endIndex,
      items: data.slice(startIndex, endIndex),
      totalHeight: data.length * itemHeight,
      offsetY: startIndex * itemHeight,
    }
  }, [data, scrollTop, containerHeight, itemHeight])
  
  return { visibleItems, setScrollTop, setContainerHeight }
}

export const useCRMMemoryOptimization = () => {
  const queryClient = useQueryClient()
  
  const clearOldCache = useCallback(() => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000
    queryClient.getQueryCache().getAll().forEach(query => {
      if (query.state.dataUpdatedAt < thirtyMinutesAgo) {
        queryClient.removeQueries({ queryKey: query.queryKey })
      }
    })
  }, [queryClient])
  
  const getMemoryUsage = useCallback(() => {
    const cache = queryClient.getQueryCache()
    return {
      totalQueries: cache.getAll().length,
      activeQueries: cache.getAll().filter(q => q.getObserversCount() > 0).length,
    }
  }, [queryClient])
  
  return { clearOldCache, getMemoryUsage }
}