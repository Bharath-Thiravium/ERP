import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import { User, LoginResponse, MasterAdminLoginRequest, CompanyUserLoginRequest } from '../types'
import toast from 'react-hot-toast'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  firstLoginRequired: boolean
  approvalPending: boolean
  approvalStatus: string | null

  // Actions
  login: (credentials: MasterAdminLoginRequest | CompanyUserLoginRequest, userType: 'master' | 'company') => Promise<boolean>
  logout: () => void
  initializeAuth: () => void
  clearError: () => void
  setFirstLoginRequired: (required: boolean) => void
  setApprovalPending: (pending: boolean) => void
  updateUser: (user: Partial<User>) => void
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

      login: async (credentials, userType) => {
        console.log('🔍 DEBUG: Login function called', { credentials: { email: credentials.email, password: '***' }, userType })
        set({ isLoading: true, error: null })

        try {
          console.log('🔍 DEBUG: Making API call...')
          const response = userType === 'master'
            ? await apiClient.masterAdminLogin(credentials)
            : await apiClient.companyUserLogin(credentials)

          console.log('🔍 DEBUG: API response received', { status: response.status, data: response.data })
          const data: LoginResponse = response.data

          // Store tokens
          console.log('🔍 DEBUG: Storing tokens and user data')
          setTokens(data.access, data.refresh)

          // Store user data
          localStorage.setItem('user', JSON.stringify(data.user))

          // Store additional auth states
          localStorage.setItem('firstLoginRequired', JSON.stringify(data.first_login_required || false))
          localStorage.setItem('approvalPending', JSON.stringify(data.approval_pending || false))
          localStorage.setItem('approvalStatus', JSON.stringify(data.approval_status || null))

          console.log('🔍 DEBUG: All data stored in localStorage')

          // Update state
          console.log('🔍 DEBUG: Setting auth state to authenticated')
          console.log('🔍 DEBUG: Response data:', data)
          console.log('🔍 DEBUG: first_login_required:', data.first_login_required)
          console.log('🔍 DEBUG: approval_pending:', data.approval_pending)

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
          })
          console.log('🔍 DEBUG: Auth state updated successfully')
          console.log('🔍 DEBUG: Final auth state:', {
            isAuthenticated: true,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            user: data.user
          })

          // Show success message
          console.log('🔍 DEBUG: Login successful, showing toast')
          toast.success(`Welcome back, ${data.user.email}!`)

          console.log('🔍 DEBUG: Returning true from login function')
          return true
        } catch (error: any) {
          console.log('🔍 DEBUG: Login error caught', error)
          console.log('🔍 DEBUG: Error response', error.response)
          const errorMessage = error.response?.data?.error ||
                              error.response?.data?.message ||
                              'Login failed. Please try again.'
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null 
          })

          console.log('🔍 DEBUG: Showing error toast', errorMessage)
          toast.error(errorMessage)
          console.log('🔍 DEBUG: Returning false from login function')
          return false
        }
      },

      logout: () => {
        console.log('🔍 DEBUG: LOGOUT FUNCTION CALLED!')
        console.trace('🔍 DEBUG: logout call stack')

        // Clear all authentication data
        clearTokens()
        localStorage.removeItem('firstLoginRequired')
        localStorage.removeItem('approvalPending')
        localStorage.removeItem('approvalStatus')

        // Reset auth state
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          firstLoginRequired: false,
          approvalPending: false,
          approvalStatus: null,
        })

        // Show success message
        toast.success('Logged out successfully')

        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      },

      initializeAuth: async () => {
        console.log('🔍 DEBUG: initializeAuth called')
        const token = localStorage.getItem('access_token')
        const userStr = localStorage.getItem('user')
        const firstLoginStr = localStorage.getItem('firstLoginRequired')
        const approvalPendingStr = localStorage.getItem('approvalPending')
        const approvalStatusStr = localStorage.getItem('approvalStatus')

        console.log('🔍 DEBUG: localStorage data', {
          hasToken: !!token,
          hasUser: !!userStr,
          token: token?.substring(0, 20) + '...'
        })

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            const firstLoginRequired = firstLoginStr ? JSON.parse(firstLoginStr) : false
            const approvalPending = approvalPendingStr ? JSON.parse(approvalPendingStr) : false
            const approvalStatus = approvalStatusStr ? JSON.parse(approvalStatusStr) : null

            // Validate token with backend
            try {
              console.log('🔍 DEBUG: Validating token with backend...')
              const response = await apiClient.validateToken()
              console.log('🔍 DEBUG: Token validation successful', response.data)

              // Update user data from validation response if available
              const validatedUser = response.data?.user || user

              set({
                user: validatedUser,
                isAuthenticated: true,
                isLoading: false,
                firstLoginRequired,
                approvalPending,
                approvalStatus,
              })
              console.log('🔍 DEBUG: Auth state set successfully')
            } catch (error: any) {
              // Token is invalid, clear everything
              console.log('🔍 DEBUG: Token validation failed', error.response?.status, error.response?.data)
              console.log('🔍 DEBUG: CLEARING AUTH STATE DUE TO TOKEN VALIDATION FAILURE')
              clearTokens()
              localStorage.removeItem('firstLoginRequired')
              localStorage.removeItem('approvalPending')
              localStorage.removeItem('approvalStatus')
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                firstLoginRequired: false,
                approvalPending: false,
                approvalStatus: null,
              })
              console.log('🔍 DEBUG: Auth state cleared due to token validation failure')
            }
          } catch (error) {
            // Invalid stored data, clear it
            clearTokens()
            localStorage.removeItem('firstLoginRequired')
            localStorage.removeItem('approvalPending')
            localStorage.removeItem('approvalStatus')
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              firstLoginRequired: false,
              approvalPending: false,
              approvalStatus: null,
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
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setFirstLoginRequired: (required: boolean) => {
        localStorage.setItem('firstLoginRequired', JSON.stringify(required))
        set({ firstLoginRequired: required })
      },

      setApprovalPending: (pending: boolean) => {
        localStorage.setItem('approvalPending', JSON.stringify(pending))
        set({ approvalPending: pending })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
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
      }),
    }
  )
)
