import { useEffect } from 'react'
import { useServiceUserStore } from '../store/serviceUserStore'

export const useSessionValidation = () => {
  const { isAuthenticated, sessionKey } = useServiceUserStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Minimal session validation - only restore session key if missing
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Only restore session key, don't validate aggressively
        setTimeout(() => {
          const storageSessionKey = sessionStorage.getItem('service_session_key')
          const storeSessionKey = useServiceUserStore.getState().sessionKey
          
          if (!storageSessionKey && storeSessionKey) {
            sessionStorage.setItem('service_session_key', storeSessionKey)
            console.log('🔧 Session key restored on visibility change')
          }
          // Removed aggressive session validation that was causing logouts
        }, 2000) // Longer delay to prevent interference with navigation
      }
    }

    // Only add visibility listener - no focus listener to prevent navigation issues
    if (sessionKey) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, sessionKey]) // Removed checkSessionValidity from dependencies
}