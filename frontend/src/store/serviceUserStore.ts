import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '../lib/api'
import toast from 'react-hot-toast'

interface ServiceUser {
  id: number
  unique_service_id: string
  email: string
  full_name: string
  role: string
  service_name: string
  service_type: string
  company_id: number
  company_name: string
  must_change_password: boolean
  is_password_expired: boolean
}

interface ServiceUserState {
  serviceUser: ServiceUser | null
  sessionKey: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  sessionExpiry: number | null
  lastActivity: number | null

  // Actions
  login: (credentials: { unique_service_id: string; password: string; service_type: string }) => Promise<boolean>
  logout: () => Promise<void>
  refreshSession: () => Promise<boolean>
  updateLastActivity: () => void
  changePassword: (data: { current_password: string; new_password: string; confirm_password: string }) => Promise<boolean>
  clearError: () => void
  checkSessionValidity: () => boolean
  startSessionMonitoring: () => void
  stopSessionMonitoring: () => void
}

export const useServiceUserStore = create<ServiceUserState>()(
  persist(
    (set, get) => ({
      serviceUser: null,
      sessionKey: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiry: null,
      lastActivity: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })

        try {
          const response = await apiClient.serviceUserLogin(credentials)
          const { session_key, user } = response.data

          // Calculate session expiry (8 hours from now)
          const sessionExpiry = Date.now() + (8 * 60 * 60 * 1000)
          const lastActivity = Date.now()

          // Store session key in sessionStorage for API interceptor
          sessionStorage.setItem('service_session_key', session_key)
          
          set({
            serviceUser: user,
            sessionKey: session_key,
            isAuthenticated: true,
            isLoading: false,
            sessionExpiry,
            lastActivity,
            error: null
          })

          // Set up session monitoring (disabled for now)
          // get().startSessionMonitoring()

          // Replace browser history to prevent back navigation to login
          if (window.history.length > 1) {
            window.history.replaceState(null, '', window.location.pathname)
          }

          return true
        } catch (error: any) {
          const errorMessage = error.response?.data?.error ||
                              error.response?.data?.message ||
                              'Login failed. Please try again.'
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            serviceUser: null,
            sessionKey: null
          })

          return false
        }
      },

      logout: async () => {
        const { sessionKey } = get()
        
        if (sessionKey) {
          try {
            await apiClient.serviceUserLogout(sessionKey)
          } catch (error) {
            console.error('Logout error:', error)
          }
        }

        // Clear session key from sessionStorage
        sessionStorage.removeItem('service_session_key')
        
        set({
          serviceUser: null,
          sessionKey: null,
          isAuthenticated: false,
          sessionExpiry: null,
          lastActivity: null,
          error: null
        })

        // Clear session monitoring
        get().stopSessionMonitoring()

        // Clear browser history to prevent back button access
        if (window.history.length > 1) {
          window.history.replaceState(null, '', '/service-login')
        }

        // Redirect to service login
        window.location.replace('/service-login')
      },

      refreshSession: async () => {
        const { sessionKey, serviceUser } = get()
        
        if (!sessionKey || !serviceUser) {
          return false
        }

        try {
          // In a real app, you would call a refresh endpoint
          // For now, we'll just extend the session
          const sessionExpiry = Date.now() + (8 * 60 * 60 * 1000)
          
          set({ sessionExpiry, lastActivity: Date.now() })
          return true
        } catch (error) {
          console.error('Session refresh failed:', error)
          await get().logout()
          return false
        }
      },

      updateLastActivity: () => {
        set({ lastActivity: Date.now() })
      },

      changePassword: async (data) => {
        const { sessionKey } = get()
        
        if (!sessionKey) {
          set({ error: 'No active session' })
          return false
        }

        set({ isLoading: true, error: null })

        try {
          await apiClient.changeServiceUserPassword({
            session_key: sessionKey,
            ...data
          })

          // Update user state to reflect password change
          set(state => ({
            serviceUser: state.serviceUser ? {
              ...state.serviceUser,
              must_change_password: false
            } : null,
            isLoading: false
          }))

          toast.success('Password changed successfully!')
          return true
        } catch (error: any) {
          const errorMessage = error.response?.data?.error ||
                              error.response?.data?.message ||
                              'Failed to change password'
          
          set({ error: errorMessage, isLoading: false })
          toast.error(errorMessage)
          return false
        }
      },

      clearError: () => {
        set({ error: null })
      },

      checkSessionValidity: () => {
        const { sessionExpiry, isAuthenticated, sessionKey: storeSessionKey } = get()
        
        // Check if session key exists in sessionStorage
        const sessionKey = sessionStorage.getItem('service_session_key')
        
        // If no session key in storage but we have one in store, restore it
        if (!sessionKey && storeSessionKey) {
          sessionStorage.setItem('service_session_key', storeSessionKey)
          return true
        }
        
        // Only logout if we have no session key anywhere AND we're authenticated
        if (!sessionKey && !storeSessionKey && isAuthenticated) {
          console.warn('No session key found, logging out')
          get().logout()
          return false
        }
        
        // If not authenticated, don't validate
        if (!isAuthenticated) {
          return false
        }
        
        // If no expiry set, assume valid (for backward compatibility)
        if (!sessionExpiry) {
          return true
        }

        const now = Date.now()
        const isValid = now < sessionExpiry

        if (!isValid) {
          console.warn('Session expired, logging out')
          get().logout()
          toast.error('Session expired. Please log in again.')
        }

        return isValid
      },

      // Session monitoring methods (not persisted)
      startSessionMonitoring: () => {
        // Completely disabled to prevent navigation issues
        console.log('Session monitoring disabled to prevent navigation logout issues')
      },

      stopSessionMonitoring: () => {
        if ((window as any).sessionMonitorInterval) {
          clearInterval((window as any).sessionMonitorInterval)
          delete (window as any).sessionMonitorInterval
        }

        if ((window as any).inactivityMonitorInterval) {
          clearInterval((window as any).inactivityMonitorInterval)
          delete (window as any).inactivityMonitorInterval
        }
      }
    }),
    {
      name: 'service-user-storage',
      partialize: (state) => ({
        serviceUser: state.serviceUser,
        sessionKey: state.sessionKey,
        isAuthenticated: state.isAuthenticated,
        sessionExpiry: state.sessionExpiry,
        lastActivity: state.lastActivity
      })
    }
  )
)

// Activity tracking hook
export const useActivityTracker = () => {
  const updateLastActivity = useServiceUserStore(state => state.updateLastActivity)

  React.useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    const handleActivity = () => {
      updateLastActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [updateLastActivity])
}

// Session validity checker hook (disabled to prevent auto-logout)
export const useSessionChecker = () => {
  // Disabled to prevent automatic session validation that causes logout
  // const checkSessionValidity = useServiceUserStore(state => state.checkSessionValidity)
  // React.useEffect(() => {
  //   checkSessionValidity()
  //   const handleFocus = () => {
  //     checkSessionValidity()
  //   }
  //   window.addEventListener('focus', handleFocus)
  //   return () => window.removeEventListener('focus', handleFocus)
  // }, [checkSessionValidity])
}
