import React from 'react'
import { useAuthStore } from '../../store/authStore'
import PasswordChangeModal from './PasswordChangeModal'

interface AuthWrapperProps {
  children: React.ReactNode
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { mustChangePassword, setMustChangePassword } = useAuthStore()

  const handlePasswordChangeSuccess = () => {
    setMustChangePassword(false)
  }

  return (
    <>
      {children}
      <PasswordChangeModal
        isOpen={mustChangePassword}
        onClose={() => {}} // Cannot close when forced
        onSuccess={handlePasswordChangeSuccess}
        isForced={true}
      />
    </>
  )
}

export default AuthWrapper