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
  login: (credentials: MasterAdminLoginRequest | CompanyUserLoginRequest | { username: string; password: string }, userType: 'master' | 'company' | 'athens', rememberDevice?: boolean) => Promise<boolean | {requires_2fa: boolean, user_id: number}>
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
          let response
          
          if (userType === 'master') {
            response = await apiClient.masterAdminLogin(credentials as MasterAdminLoginRequest)
          } else if (userType === 'athens') {
            // Athens login with username/password
            response = await apiClient.athensLogin(credentials as { username: string; password: string })
          } else {
            // Regular company user login
            response = await apiClient.companyUserLogin(credentials as CompanyUserLoginRequest)
          }

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
          
          // Check if 2FA is required - explicit boolean check
          if (data.requires_2fa === true) {
            set({ isLoading: false })
            // Don't update auth state for 2FA - just return the requirement
            return {
              requires_2fa: true,
              user_id: data.user_id || data.id
            }
          }

          // Check if we have access token (successful full login)
          if (!data.access) {
            set({ isLoading: false, error: 'Invalid login response - no access token' })
            return false
          }

          // Normal login success
          // Store tokens and update state immediately
          setTokens(data.access, data.refresh)
          
          // Handle Athens login response format
          let userData
          if (userType === 'athens') {
            userData = {
              id: data.user_id,
              email: data.email,
              username: data.username,
              full_name: data.full_name,
              role_type: data.role_type,
              project_id: data.project_id,
              project_name: data.project_name,
              must_reset_password: data.must_reset_password
            }
          } else {
            userData = data.user
          }
          
          // Update state synchronously
          const isAthensLogin = userType === 'athens'
          const newState = {
            user: userData,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
            // Only company users should use the password-change modal flow
            mustChangePassword: isAthensLogin ? false : (data.must_change_password || data.must_reset_password || false),
            forcePasswordReset: isAthensLogin ? false : (data.force_password_reset || false),
          }
          
          set(newState)

          // Force immediate session storage update
          sessionStorage.setItem('user', JSON.stringify(userData))
          sessionStorage.setItem('firstLoginRequired', JSON.stringify(newState.firstLoginRequired))
          sessionStorage.setItem('approvalPending', JSON.stringify(newState.approvalPending))
          sessionStorage.setItem('approvalStatus', JSON.stringify(newState.approvalStatus))
          sessionStorage.setItem('mustChangePassword', JSON.stringify(newState.mustChangePassword))
          sessionStorage.setItem('forcePasswordReset', JSON.stringify(newState.forcePasswordReset))

          // Store Athens admin session for Athens flows (password reset + dashboard header)
          if (isAthensLogin) {
            const athensSession = {
              user_id: data.user_id ?? (data.user?.id ?? userData?.id),
              username: data.username ?? (data.user?.username ?? userData?.username),
              email: data.email ?? (data.user?.email ?? userData?.email),
              full_name: data.full_name ?? userData?.full_name,
              role_type: data.role_type ?? userData?.role_type,
              project_id: data.project_id ?? userData?.project_id,
              project_name: data.project_name ?? userData?.project_name,
              must_reset_password: data.must_reset_password || false
            }
            sessionStorage.setItem('athens_admin_session', JSON.stringify(athensSession))
          }
          
          // Force immediate persistence to localStorage
          const stateToStore = {
            state: newState,
            version: 0
          }
          localStorage.setItem('auth-storage', JSON.stringify(stateToStore))

          // Show success message
          toast.success(`Welcome back, ${userData.email || userData.username}!`)

          // Return true for successful login (not 2FA object)
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
        sessionStorage.clear()
        localStorage.removeItem('auth-storage')

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

            // Validate token with backend in background (don't logout on failure)
            try {
              const response = await apiClient.validateToken()
              // Update user data from validation response if available
              const validatedUser = response.data?.user || user
              
              set({
                user: validatedUser,
                isAuthenticated: true,
              })
            } catch (error: any) {
              // Token validation failed, but don't logout - just log the error
              console.warn('Token validation failed:', error.message)
              // Keep existing authentication state
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
