import React from 'react'
import { useAuthStore } from '../../store/authStore'
import PasswordChangeModal from './PasswordChangeModal'

interface AuthWrapperProps {
  children: React.ReactNode
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { mustChangePassword, forcePasswordReset, setMustChangePassword, setForcePasswordReset } = useAuthStore()

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false)
    setForcePasswordReset(false)
  }

  // Show password change modal for either scenario
  const shouldShowPasswordModal = mustChangePassword || forcePasswordReset

  return (
    <>
      {children}
      <PasswordChangeModal
        isOpen={shouldShowPasswordModal}
        onClose={() => {}} // Cannot close when forced
        onSuccess={handlePasswordChangeSuccess}
        isForced={true}
        title={forcePasswordReset ? 'Password Reset Required' : 'Password Change Required'}
        message={forcePasswordReset 
          ? 'Your password has been reset by an administrator. Please set a new password to continue.'
          : 'You must change your password to continue using the system.'
        }
      />
    </>
  )
}

export default AuthWrapper