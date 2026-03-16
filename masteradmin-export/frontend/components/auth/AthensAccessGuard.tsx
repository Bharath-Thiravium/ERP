import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { useAthensSustainabilityEnabled } from '../../hooks/useAthensSustainabilityEnabled'
import { useAthensAccessState } from '../../hooks/useAthensAccessState'

interface AthensAccessGuardProps {
  children: React.ReactNode
}

const STAGE_ROUTES: Record<string, string> = {
  must_reset_password: '/company/athens/password-reset',
  must_complete_profile: '/company/athens/profile',
  pending_approval: '/company/athens/pending-approval',
  approved_but_induction_pending: '/company/athens/induction'
}

const AthensAccessGuard: React.FC<AthensAccessGuardProps> = ({ children }) => {
  const { user } = useAuthStore()
  const { isEnabled, isLoading: isServiceLoading } = useAthensSustainabilityEnabled()
  const { data: accessState, isLoading } = useAthensAccessState(isEnabled)

  if (!user || !user.is_company_user || !isEnabled) {
    return <>{children}</>
  }

  if (isServiceLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking access state..." />
      </div>
    )
  }

  const stage = accessState?.stage
  const requiredRoute = stage ? STAGE_ROUTES[stage] : undefined

  if (requiredRoute && window.location.pathname !== requiredRoute) {
    return <Navigate to={requiredRoute} replace />
  }

  return <>{children}</>
}

export default AthensAccessGuard
