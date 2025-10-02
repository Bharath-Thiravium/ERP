import { useEffect } from 'react'
import { useServiceUserStore } from '../store/serviceUserStore'

export const useSessionValidation = () => {
  const { checkSessionValidity, isAuthenticated } = useServiceUserStore()

  useEffect(() => {
    if (!isAuthenticated) return

    const handleFocus = () => {
      const sessionKey = sessionStorage.getItem('service_session_key')
      if (!sessionKey) {
        window.location.replace('/service-login')
        return
      }
      checkSessionValidity()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, checkSessionValidity])
}