import axios, { AxiosResponse, AxiosError, AxiosInstance } from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
const getToken = (): string | null => {
  return localStorage.getItem('access_token')
}

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token')
}

const setTokens = (accessToken: string, refreshToken: string): void => {
  console.log('🔍 DEBUG: setTokens called', { accessToken: accessToken.substring(0, 20) + '...' })
  localStorage.setItem('access_token', accessToken)
  localStorage.setItem('refresh_token', refreshToken)
  console.log('🔍 DEBUG: Tokens stored in localStorage')
}

const clearTokens = (): void => {
  console.log('🔍 DEBUG: clearTokens called - CLEARING ALL AUTH DATA!')
  console.trace('🔍 DEBUG: clearTokens call stack')
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// Request interceptor to add auth token (exclude login endpoints)
api.interceptors.request.use(
  (config) => {
    // Don't add auth token to login endpoints
    const isLoginEndpoint = config.url?.includes('/login/') ||
                           config.url?.includes('/token/refresh/') ||
                           config.url?.includes('/health/')

    if (!isLoginEndpoint) {
      const token = getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // Handle FormData - remove Content-Type header to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          console.log('🔍 DEBUG: Attempting token refresh...')
          const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          console.log('🔍 DEBUG: Token refresh successful')
          setTokens(access, refreshToken)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError: any) {
          // Refresh failed, redirect to login
          console.log('🔍 DEBUG: Token refresh failed:', refreshError.response?.data)
          clearTokens()

          // Don't show error toast for token refresh failures
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        console.log('🔍 DEBUG: No refresh token available')
        clearTokens()
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    // Handle other errors (but not for token validation failures during app init)
    if (!originalRequest.url?.includes('/validate-token/')) {
      const errorData = error.response?.data as any
      if (errorData?.message) {
        toast.error(errorData.message)
      } else if (errorData?.error) {
        toast.error(errorData.error)
      } else if (error.message && !error.message.includes('401')) {
        toast.error(error.message)
      }
    }

    return Promise.reject(error)
  }
)

// API methods
export const apiClient = {
  // Generic methods
  get: <T = any>(url: string, params?: any): Promise<AxiosResponse<T>> =>
    api.get(url, { params }),
  
  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> =>
    api.post(url, data),
  
  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> =>
    api.put(url, data),
  
  patch: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> =>
    api.patch(url, data),
  
  delete: <T = any>(url: string): Promise<AxiosResponse<T>> =>
    api.delete(url),

  // Authentication
  masterAdminLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/master-admin/login/', credentials),

  companyUserLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/company/login/', credentials),

  changeCompanyUserPassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/company/change-password/', data),

  uploadCompanyLogo: (formData: FormData) =>
    api.post('/api/auth/company/update-logo/', formData),

  refreshToken: (refreshToken: string) =>
    api.post('/api/token/refresh/', { refresh: refreshToken }),

  // Master Admin Profile
  getMasterAdminProfile: () =>
    api.get('/api/auth/master-admin/profile/'),

  updateMasterAdminProfile: (data: any) =>
    api.patch('/api/auth/master-admin/profile/', data),

  changeMasterAdminPassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/master-admin/change-password/', data),

  // Services
  getServices: () =>
    api.get('/api/auth/services/'),

  // Companies (Master Admin)
  getCompanies: (params?: any) =>
    api.get('/api/auth/companies/', { params }),

  createCompany: (data: any) =>
    api.post('/api/auth/companies/', data),

  getCompany: (id: number) =>
    api.get(`/api/auth/companies/${id}/`),

  updateCompany: (id: number, data: any) =>
    api.patch(`/api/auth/companies/${id}/`, data),

  deleteCompany: (id: number) =>
    api.delete(`/api/auth/companies/${id}/`),

  approveCompany: (id: number, action: 'approve' | 'reject') =>
    api.post(`/api/auth/companies/${id}/approve/`, { action }),

  getCompanyServiceCredentials: (companyId: number) =>
    api.get(`/api/auth/companies/${companyId}/service-credentials/`),

  resetCompanyServicePasswords: (companyId: number) =>
    api.post(`/api/auth/companies/${companyId}/service-credentials/`),

  // Company Operations
  submitDetailedInfo: (companyId: number, data: any) =>
    api.patch(`/api/auth/companies/${companyId}/detailed-info/`, data),

  getCompanyServices: () =>
    api.get('/api/auth/company/services/'),

  getCompanyAssignedServices: () =>
    api.get('/api/auth/company/assigned-services/'),

  requestServiceAccess: (serviceIds: number[]) =>
    api.post('/api/auth/company/request-services/', { service_ids: serviceIds }),

  accessService: (serviceId: number, password: string) =>
    api.post(`/api/auth/services/${serviceId}/access/`, { password }),

  changeServicePassword: (serviceId: number, data: any) =>
    api.post(`/api/auth/services/${serviceId}/change-password/`, data),

  // Service Users
  serviceUserLogin: (credentials: { username: string; password: string; service_type: string }) =>
    api.post('/api/auth/service-user/login/', credentials),

  serviceUserLogout: (sessionKey: string) =>
    api.post('/api/auth/service-user/logout/', { session_key: sessionKey }),

  changeServiceUserPassword: (data: { session_key: string; current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/service-user/change-password/', data),

  // Company Service Users (for company admins)
  getCompanyServiceUsers: () =>
    api.get('/api/auth/company/service-users/'),

  createServiceUser: (data: { service_id: number; username: string; email: string; full_name: string; role: string }) =>
    api.post('/api/auth/company/service-users/', data),

  getServiceUser: (id: number) =>
    api.get(`/api/auth/company/service-users/${id}/`),

  updateServiceUser: (id: number, data: any) =>
    api.patch(`/api/auth/company/service-users/${id}/`, data),

  deleteServiceUser: (id: number) =>
    api.delete(`/api/auth/company/service-users/${id}/`),

  // Notifications
  getNotifications: (params?: any) =>
    api.get('/api/notifications/notifications/', { params }),

  getNotification: (id: number) =>
    api.get(`/api/notifications/notifications/${id}/`),

  markNotificationsAsRead: (notificationIds: number[]) =>
    api.post('/api/notifications/notifications/mark-read/', {
      notification_ids: notificationIds,
    }),

  getNotificationStats: () =>
    api.get('/api/notifications/notifications/stats/'),

  createNotification: (data: any) =>
    api.post('/api/notifications/notifications/', data),

  // Health check
  healthCheck: () =>
    api.get('/api/health/'),

  // Token validation
  validateToken: () =>
    api.get('/api/auth/validate-token/'),
}

// Export token management functions
export { getToken, getRefreshToken, setTokens, clearTokens }

export default api
