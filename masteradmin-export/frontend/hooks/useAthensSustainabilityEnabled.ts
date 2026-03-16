import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../lib/api'

interface ServiceStatus {
  isEnabled: boolean
  isLoading: boolean
  error: string | null
}

export const useAthensSustainabilityEnabled = (): ServiceStatus => {
  const [status, setStatus] = useState<ServiceStatus>({
    isEnabled: false,
    isLoading: true,
    error: null
  })
  
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    const checkServiceStatus = async () => {
      if (!user || !isAuthenticated) {
        setStatus({
          isEnabled: false,
          isLoading: false,
          error: 'User not authenticated'
        })
        return
      }

      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }))
        
        const response = await apiClient.getCompanyAssignedServices()
        const services = response?.data?.results || response?.data || []
        const hasAthens = services.some((service: any) => service.service_type === 'athens_sustainability' && service.is_active !== false)

        setStatus({
          isEnabled: hasAthens,
          isLoading: false,
          error: hasAthens ? null : 'Athens Sustainability service not enabled'
        })
      } catch (error: any) {
        const isAuthError = error.response?.status === 401
        setStatus({
          isEnabled: false,
          isLoading: false,
          error: isAuthError ? 'Authentication required' : 'Athens Sustainability service not enabled'
        })
      }
    }

    // Add a small delay to prevent rapid API calls during auth state changes
    const timeoutId = setTimeout(checkServiceStatus, 100)
    return () => clearTimeout(timeoutId)
  }, [user, isAuthenticated])

  return status
}
