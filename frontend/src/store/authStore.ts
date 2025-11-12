import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import tokenManager from '../lib/tokenManager'
import { User,  MasterAdminLoginRequest, CompanyUserLoginRequest, SecurityAlert } from '../types'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  firstLoginRequired: boolean
  approvalPending: boolean
  approvalStatus: string | null
  mustChangePassword: boolean
  forcePasswordReset: boolean
  // Phase 2: Security Features
  accountLocked: boolean
  remainingAttempts: number | null
  lockoutExpiresAt: string | null
  passwordExpiresInDays: number | null
  passwordExpiresAt: string | null
  securityAlerts: SecurityAlert[]
  trustedDevice: boolean
  deviceId: string | null

  // Actions
  login: (credentials: MasterAdminLoginRequest | CompanyUserLoginRequest, userType: 'master' | 'company', rememberDevice?: boolean) => Promise<boolean | {requires_2fa: boolean, user_id: number}>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
  setFirstLoginRequired: (required: boolean) => void
  setApprovalPending: (pending: boolean) => void
  setMustChangePassword: (required: boolean) => void
  setForcePasswordReset: (required: boolean) => void
  updateUser: (user: Partial<User>) => void
  clearSecurityAlerts: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      firstLoginRequired: false,
      approvalPending: false,
      approvalStatus: null,
      mustChangePassword: false,
      forcePasswordReset: false,
      // Phase 2: Security Features
      accountLocked: false,
      remainingAttempts: null,
      lockoutExpiresAt: null,
      passwordExpiresInDays: null,
      passwordExpiresAt: null,
      securityAlerts: [],
      trustedDevice: false,
      deviceId: null,

      login: async (credentials, userType) => {
        set({ isLoading: true, error: null })

        try {
          const response = userType === 'master'
            ? await apiClient.masterAdminLogin(credentials)
            : await apiClient.companyUserLogin(credentials)

          const data = response.data
          
          // Update security state from response
          set({
            accountLocked: data.account_locked || false,
            remainingAttempts: data.remaining_attempts || null,
            lockoutExpiresAt: data.lockout_expires_at || null,
            passwordExpiresInDays: data.password_expires_in_days || null,
            passwordExpiresAt: data.password_expires_at || null,
            securityAlerts: data.security_alerts || [],
            trustedDevice: data.trusted_device || false,
            deviceId: data.device_id || null
          })
          
          // Check if account is locked
          if (data.account_locked) {
            set({ isLoading: false, error: 'Account is temporarily locked' })
            return false
          }
          
          // Check if 2FA is required
          if (data.requires_2fa === true || data.requires_2fa === 'true') {
            set({ isLoading: false })
            return {
              requires_2fa: true,
              user_id: data.user_id || data.id
            }
          }

          // Check if we have access token (successful full login)
          if (!data.access) {
            set({ isLoading: false, error: 'Invalid login response' })
            return false
          }

          // Normal login success
          // Store tokens securely
          setTokens(data.access, data.refresh)

          // Store user data in sessionStorage (less persistent than localStorage)
          sessionStorage.setItem('user', JSON.stringify(data.user))

          // Store additional auth states
          sessionStorage.setItem('firstLoginRequired', JSON.stringify(data.first_login_required || false))
          sessionStorage.setItem('approvalPending', JSON.stringify(data.approval_pending || false))
          sessionStorage.setItem('approvalStatus', JSON.stringify(data.approval_status || null))
          sessionStorage.setItem('mustChangePassword', JSON.stringify(data.must_change_password || false))
          sessionStorage.setItem('forcePasswordReset', JSON.stringify(data.force_password_reset || false))

          // Update state synchronously
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
            mustChangePassword: data.must_change_password || false,
            forcePasswordReset: data.force_password_reset || false,
          })

          // Force state persistence immediately
          const currentState = get()
          const stateToStore = {
            state: {
              user: currentState.user,
              isAuthenticated: currentState.isAuthenticated,
              firstLoginRequired: currentState.firstLoginRequired,
              approvalPending: currentState.approvalPending,
              approvalStatus: currentState.approvalStatus,
              mustChangePassword: currentState.mustChangePassword,
              forcePasswordReset: currentState.forcePasswordReset,
            },
            version: 0
          }
          localStorage.setItem('auth-storage', JSON.stringify(stateToStore))
          
          // State is now synchronized immediately without artificial delays

          // Show success message
          toast.success(`Welcome back, ${data.user.email}!`)

          return true
        } catch (error: any) {
          const errorData = error.response?.data || {}
          const errorMessage = errorData.error || errorData.message || 'Login failed. Please try again.'
          
          // Update security state from error response
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            accountLocked: errorData.locked || false,
            remainingAttempts: errorData.attempts_remaining || null,
            lockoutExpiresAt: errorData.locked_until || null
          })

          // Show appropriate error message
          if (errorData.locked) {
            toast.error('Account locked due to too many failed attempts')
          } else if (errorData.attempts_remaining !== undefined) {
            toast.error(`Login failed. ${errorData.attempts_remaining} attempts remaining.`)
          } else {
            toast.error(errorMessage)
          }
          
          return false
        }
      },

      logout: () => {
        // Clear all authentication data
        clearTokens()

        // Reset auth state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          firstLoginRequired: false,
          approvalPending: false,
          approvalStatus: null,
          mustChangePassword: false,
          forcePasswordReset: false,
          // Reset security state
          accountLocked: false,
          remainingAttempts: null,
          lockoutExpiresAt: null,
          passwordExpiresInDays: null,
          passwordExpiresAt: null,
          securityAlerts: [],
          trustedDevice: false,
          deviceId: null,
        })



        // Show success message
        toast.success('Logged out successfully')

        // Clear session storage to ensure clean state
        sessionStorage.clear()
        
        // Don't force redirect here - let the router handle it naturally
        // This preserves browser history and prevents back button issues
      },

      initializeAuth: async () => {
        set({ isLoading: true })
        
        const token = tokenManager.getAccessToken()
        const userStr = sessionStorage.getItem('user')
        const firstLoginStr = sessionStorage.getItem('firstLoginRequired')
        const approvalPendingStr = sessionStorage.getItem('approvalPending')
        const approvalStatusStr = sessionStorage.getItem('approvalStatus')
        const mustChangePasswordStr = sessionStorage.getItem('mustChangePassword')
        const forcePasswordResetStr = sessionStorage.getItem('forcePasswordReset')
        
        // Also check localStorage for persisted state
        let persistedState = null
        try {
          const persistedData = localStorage.getItem('auth-storage')
          if (persistedData) {
            persistedState = JSON.parse(persistedData).state
          }
        } catch (error) {
          console.warn('Failed to parse persisted auth state:', error)
        }

        if (token && (userStr || persistedState?.user)) {
          try {
            // Use session storage first, fallback to persisted state
            const user = userStr ? JSON.parse(userStr) : persistedState?.user
            const firstLoginRequired = firstLoginStr ? JSON.parse(firstLoginStr) : (persistedState?.firstLoginRequired || false)
            const approvalPending = approvalPendingStr ? JSON.parse(approvalPendingStr) : (persistedState?.approvalPending || false)
            const approvalStatus = approvalStatusStr ? JSON.parse(approvalStatusStr) : (persistedState?.approvalStatus || null)
            const mustChangePassword = mustChangePasswordStr ? JSON.parse(mustChangePasswordStr) : (persistedState?.mustChangePassword || false)
            const forcePasswordReset = forcePasswordResetStr ? JSON.parse(forcePasswordResetStr) : (persistedState?.forcePasswordReset || false)
            
            // If we used persisted state, restore to session storage
            if (!userStr && persistedState?.user) {
              sessionStorage.setItem('user', JSON.stringify(user))
              sessionStorage.setItem('firstLoginRequired', JSON.stringify(firstLoginRequired))
              sessionStorage.setItem('approvalPending', JSON.stringify(approvalPending))
              sessionStorage.setItem('approvalStatus', JSON.stringify(approvalStatus))
              sessionStorage.setItem('mustChangePassword', JSON.stringify(mustChangePassword))
              sessionStorage.setItem('forcePasswordReset', JSON.stringify(forcePasswordReset))
            }

            // Set initial state from stored data
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              firstLoginRequired,
              approvalPending,
              approvalStatus,
              mustChangePassword,
              forcePasswordReset,
            })

            // Validate token with backend in background
            try {
              const response = await apiClient.validateToken()
              // Update user data from validation response if available
              const validatedUser = response.data?.user || user
              
              set({
                user: validatedUser,
                isAuthenticated: true,
              })
            } catch (error: any) {
              // Token is invalid, clear everything
              clearTokens()
              sessionStorage.clear()
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                firstLoginRequired: false,
                approvalPending: false,
                approvalStatus: null,
                mustChangePassword: false,
                forcePasswordReset: false,
              })
            }
          } catch (error) {
            // Invalid stored data, clear it
            clearTokens()
            sessionStorage.clear()
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              firstLoginRequired: false,
              approvalPending: false,
              approvalStatus: null,
              mustChangePassword: false,
              forcePasswordReset: false,
            })
          }
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            firstLoginRequired: false,
            approvalPending: false,
            approvalStatus: null,
            mustChangePassword: false,
            forcePasswordReset: false,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setFirstLoginRequired: (required: boolean) => {
        sessionStorage.setItem('firstLoginRequired', JSON.stringify(required))
        set({ firstLoginRequired: required })
      },

      setApprovalPending: (pending: boolean) => {
        sessionStorage.setItem('approvalPending', JSON.stringify(pending))
        set({ approvalPending: pending })
      },

      setMustChangePassword: (required: boolean) => {
        sessionStorage.setItem('mustChangePassword', JSON.stringify(required))
        set({ mustChangePassword: required })
      },

      setForcePasswordReset: (required: boolean) => {
        sessionStorage.setItem('forcePasswordReset', JSON.stringify(required))
        set({ forcePasswordReset: required })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
        }
      },

      clearSecurityAlerts: () => {
        set({ securityAlerts: [] })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        firstLoginRequired: state.firstLoginRequired,
        approvalPending: state.approvalPending,
        approvalStatus: state.approvalStatus,
        mustChangePassword: state.mustChangePassword,
        forcePasswordReset: state.forcePasswordReset,
      }),
    }
  )
)
