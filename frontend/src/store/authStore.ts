import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient, setTokens, clearTokens } from '../lib/api'
import tokenManager from '../lib/tokenManager'
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
        set({ isLoading: true, error: null })

        try {
          const response = userType === 'master'
            ? await apiClient.masterAdminLogin(credentials)
            : await apiClient.companyUserLogin(credentials)

          const data: LoginResponse = response.data

          // Store tokens securely
          setTokens(data.access, data.refresh)

          // Store user data in sessionStorage (less persistent than localStorage)
          sessionStorage.setItem('user', JSON.stringify(data.user))

          // Store additional auth states
          sessionStorage.setItem('firstLoginRequired', JSON.stringify(data.first_login_required || false))
          sessionStorage.setItem('approvalPending', JSON.stringify(data.approval_pending || false))
          sessionStorage.setItem('approvalStatus', JSON.stringify(data.approval_status || null))

          // Update state
          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            firstLoginRequired: data.first_login_required || false,
            approvalPending: data.approval_pending || false,
            approvalStatus: data.approval_status || null,
          })

          // Show success message
          toast.success(`Welcome back, ${data.user.email}!`)

          return true
        } catch (error: any) {
          const errorMessage = error.response?.data?.error ||
                              error.response?.data?.message ||
                              'Login failed. Please try again.'
          
          set({ 
            isLoading: false, 
            error: errorMessage,
            isAuthenticated: false,
            user: null 
          })

          toast.error(errorMessage)
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
        })

        // Clear browser history to prevent back button access
        if (window.history.length > 1) {
          window.history.replaceState(null, '', '/login')
        }

        // Show success message
        toast.success('Logged out successfully')

        // Redirect to login page if not already there
        if (!window.location.pathname.includes('/login')) {
          window.location.replace('/login')
        }
      },

      initializeAuth: async () => {
        const token = tokenManager.getAccessToken()
        const userStr = sessionStorage.getItem('user')
        const firstLoginStr = sessionStorage.getItem('firstLoginRequired')
        const approvalPendingStr = sessionStorage.getItem('approvalPending')
        const approvalStatusStr = sessionStorage.getItem('approvalStatus')

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            const firstLoginRequired = firstLoginStr ? JSON.parse(firstLoginStr) : false
            const approvalPending = approvalPendingStr ? JSON.parse(approvalPendingStr) : false
            const approvalStatus = approvalStatusStr ? JSON.parse(approvalStatusStr) : null

            // Validate token with backend
            try {
              const response = await apiClient.validateToken()

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
            } catch (error: any) {
              // Token is invalid, clear everything
              clearTokens()
              set({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                firstLoginRequired: false,
                approvalPending: false,
                approvalStatus: null,
              })
            }
          } catch (error) {
            // Invalid stored data, clear it
            clearTokens()
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
        sessionStorage.setItem('firstLoginRequired', JSON.stringify(required))
        set({ firstLoginRequired: required })
      },

      setApprovalPending: (pending: boolean) => {
        sessionStorage.setItem('approvalPending', JSON.stringify(pending))
        set({ approvalPending: pending })
      },

      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = { ...currentUser, ...userData }
          set({ user: updatedUser })
          sessionStorage.setItem('user', JSON.stringify(updatedUser))
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
