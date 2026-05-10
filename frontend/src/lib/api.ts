import axios, { AxiosResponse, AxiosError, AxiosInstance } from 'axios'
import toast from 'react-hot-toast'

const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined
  // Use empty string for same-origin requests in production
  if (!envUrl || envUrl === '') {
    return ''
  }
  return envUrl
}

const resolveWsBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_WS_URL as string | undefined
  if (envUrl) {
    if (typeof window !== 'undefined') {
      const isLocalEnv = /localhost|127\.0\.0\.1/.test(envUrl)
      const isLocalHost = /localhost|127\.0\.0\.1/.test(window.location.hostname)
      if (isLocalEnv && !isLocalHost) {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        return `${protocol}://${window.location.host}`
      }
    }
    return envUrl
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${window.location.host}`
  }
  return 'ws://localhost:8000'
}

const API_BASE_URL = resolveApiBaseUrl()
const WS_BASE_URL = resolveWsBaseUrl()

// Helper function to get WebSocket URL
export const getWebSocketUrl = (endpoint: string): string => {
  // Handle both full URLs and relative paths
  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return endpoint
  }
  
  // If endpoint already starts with /ws/, use it as is
  if (endpoint.startsWith('/ws/')) {
    return `${WS_BASE_URL}${endpoint}`
  }
  
  // Otherwise, ensure endpoint starts with / and add /ws prefix
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${WS_BASE_URL}/ws${path}`
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

import tokenManager from './tokenManager'

// Token management
const getToken = (): string | null => {
  return tokenManager.getAccessToken()
}

const getRefreshToken = (): string | null => {
  return tokenManager.getRefreshToken()
}

const setTokens = (accessToken: string, refreshToken: string): void => {
  tokenManager.setTokens(accessToken, refreshToken)
}

const clearTokens = (): void => {
  tokenManager.clearTokens()
}

// Request interceptor to add auth token (exclude login endpoints)
api.interceptors.request.use(
  (config) => {
    // Don't add auth token to login endpoints
    const isLoginEndpoint = config.url?.includes('/login/') ||
                           config.url?.includes('/token/refresh/') ||
                           config.url?.includes('/health/')

    if (!isLoginEndpoint) {
      // Check if this is a service user endpoint (HR, Finance, Inventory, CRM)
      // JWT-authenticated company-dashboard endpoints (use Bearer token, not session_key)
      const jwtCompanyDashboardPaths = [
        '-template-preview/',
        '-template-settings/',
        'template-info/',
        'email-settings/',
        'government-api/',
        'security/',
        'advanced-security/',
        'document-numbering/',
        'overview/',
        'service-utilization/',
        'analytics/',
        'user-activities/',
        'activity-logs/',
        'log-activity/',
        'notifications/',
        'domain/',
      ]
      const isJwtCompanyDashboard = config.url?.includes('/api/company-dashboard/') &&
        jwtCompanyDashboardPaths.some(p => config.url?.includes(p))

      const isServiceUserEndpoint = !isJwtCompanyDashboard && (
                                   config.url?.includes('/api/hr/') ||
                                   config.url?.includes('/api/finance/') ||
                                   config.url?.includes('/api/inventory/') ||
                                   config.url?.includes('/api/crm/') ||
                                   config.url?.includes('/api/reports/') ||
                                   config.url?.includes('/api/company-dashboard/'))
      
      if (isServiceUserEndpoint) {
        // Use session key as query parameter for service user endpoints
        let sessionKey = sessionStorage.getItem('service_session_key')
        
        // If no session key, abort immediately
        if (!sessionKey) {
          return Promise.reject({
            response: {
              status: 401,
              data: { error: 'Session expired. Please login again.' }
            }
          })
        }
        
        // Skip adding session_key to params if Authorization header is already set
        if (!config.headers.Authorization) {
          config.params = config.params || {}
          config.params.session_key = sessionKey
        }
      } else {
        // Use JWT token for regular endpoints (including Athens)
        const token = getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
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

      // Skip token refresh for service user endpoints (HR, Finance, Inventory, CRM, Reports)
      const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                   originalRequest.url?.includes('/api/finance/') ||
                                   originalRequest.url?.includes('/api/inventory/') ||
                                   originalRequest.url?.includes('/api/crm/') ||
                                   originalRequest.url?.includes('/api/reports/') ||
                                   originalRequest.url?.includes('/api/company-dashboard/')
      
      if (isServiceUserEndpoint) {
        // Only redirect if we're actually logged out
        const hasSession = sessionStorage.getItem('service_session_key')
        if (!hasSession) {
          sessionStorage.clear()
          localStorage.removeItem('service-user-storage')
          if (!window.location.pathname.includes('/service-login')) {
            window.location.href = '/service-login'
          }
        }
        return Promise.reject(error)
      }

      // Check if this is an Athens employee management endpoint
      const isAthensEmployeeEndpoint = originalRequest.url?.includes('/api/athens-sust/employees')
      
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, {
            refresh: refreshToken,
          })

          const { access } = response.data
          setTokens(access, refreshToken)

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError: any) {
          // Refresh failed, redirect to login
          clearTokens()
          
          // Force logout from auth store to clear all state
          localStorage.removeItem('auth-storage')
          sessionStorage.clear()

          // Don't show error toast for token refresh failures
          // Only redirect if not already on login page and not during navigation
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/unauthorized')) {
            // For Athens employee endpoints, show a more specific error
            if (isAthensEmployeeEndpoint) {
              toast.error('Authentication expired. Please login again to access employee management.')
            } else {
              toast.error('Session expired. Please login again.')
            }
            // Force a complete page reload to reset all state
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login (but not for service user endpoints)
        const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                     originalRequest.url?.includes('/api/finance/') ||
                                     originalRequest.url?.includes('/api/inventory/') ||
                                     originalRequest.url?.includes('/api/crm/') ||
                                     originalRequest.url?.includes('/api/reports/')
        
        if (!isServiceUserEndpoint && !originalRequest.url?.includes('/validate-token/')) {
          clearTokens()
          sessionStorage.clear()
          localStorage.removeItem('auth-storage')
          
          // Force complete page reload to reset all state
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/unauthorized')) {
            // For Athens employee endpoints, show a more specific error
            if (isAthensEmployeeEndpoint) {
              toast.error('Authentication required. Please login to access employee management.')
            } else {
              toast.error('Session expired. Please login again.')
            }
            window.location.href = '/login'
          }
        }
      }
    }

    // Handle other errors (but not for token validation failures during app init)
    if (!originalRequest.url?.includes('/validate-token/')) {
      const errorData = error.response?.data as any
      
      // Don't show generic error toasts for Athens employee endpoints - let the component handle it
      const isAthensEmployeeEndpoint = originalRequest.url?.includes('/api/athens-sust/employees')
      // Don't show toasts for 403s on company auth endpoints fired before approval
      const isPreApprovalEndpoint = originalRequest.url?.includes('/api/auth/company/assigned-services/') ||
                                    originalRequest.url?.includes('/api/auth/company/service-users/')
      // Don't show toasts for preview endpoints — component handles the error
      const isPreviewEndpoint = originalRequest.url?.includes('-template-preview/')
      
      if (!isAthensEmployeeEndpoint && !isPreApprovalEndpoint && !isPreviewEndpoint) {
        if (errorData?.message) {
          toast.error(errorData.message)
        } else if (errorData?.error) {
          toast.error(errorData.error)
        } else if (error.message && !error.message.includes('401')) {
          toast.error(error.message)
        }
      }
    }

    return Promise.reject(error)
  }
)

// URL validation for SSRF protection
function validateUrl(url: string): boolean {
  // Allow relative URLs when API_BASE_URL is empty
  if (!API_BASE_URL && url.startsWith('/')) {
    return true
  }
  
  try {
    const urlObj = new URL(url, API_BASE_URL || window.location.origin)
    // Only allow same origin requests
    const baseOrigin = API_BASE_URL ? new URL(API_BASE_URL).origin : window.location.origin
    return urlObj.origin === baseOrigin
  } catch {
    return false
  }
}

// API methods
export const apiClient = {
  // Generic methods
  get: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.get(url, config)
  },
  
  post: <T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.post(url, data, config)
  },
  
  put: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.put(url, data)
  },
  
  patch: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.patch(url, data)
  },
  
  delete: <T = any>(url: string, config?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.delete(url, config)
  },

  // Authentication
  masterAdminLogin: (credentials: { email: string; password: string; totp_code?: string; recovery_code?: string }) =>
    api.post('/api/auth/master-admin/login/', credentials),

  companyUserLogin: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/company/login/', credentials),

  // Athens Sustainability Login
  athensLogin: (credentials: { username: string; password: string }) =>
    api.post('/api/athens-sust/auth/login/', credentials),

  changeCompanyUserPassword: (data: { current_password: string; new_password: string; confirm_password: string; force_logout_all?: boolean }) =>
    api.post('/api/company-dashboard/security/password-change/', data),

  uploadCompanyLogo: (formData: FormData) =>
    api.post('/api/auth/company/update-logo/', formData),

  // Company Details
  getCompanyDetails: () =>
    api.get('/api/auth/company/details/'),

  updateCompanyDetails: (data: any) =>
    api.put('/api/auth/company/details/', data),

  refreshToken: (refreshToken: string) =>
    api.post('/api/token/refresh/', { refresh: refreshToken }),

  // Master Admin Profile
  getMasterAdminProfile: () =>
    api.get('/api/auth/master-admin/profile/'),

  updateMasterAdminProfile: (data: any) =>
    api.patch('/api/auth/master-admin/profile/', data),

  changeMasterAdminPassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/master-admin/change-password/', data),

  // Ultra-Secure Master Admin Settings
  getMasterAdminUltraSettings: () =>
    api.get('/api/auth/master-admin/settings/'),

  changeMasterAdminUltraPassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    api.post('/api/auth/master-admin/settings/password/', data),

  getMasterAdminApiKey: () =>
    api.get('/api/auth/master-admin/settings/api-key/'),

  regenerateMasterAdminApiKey: (data: { current_password: string }) =>
    api.post('/api/auth/master-admin/settings/api-key/', data),

  getMasterAdminRecoveryCodes: () =>
    api.get('/api/auth/master-admin/settings/recovery-codes/'),

  regenerateMasterAdminRecoveryCodes: (data: { current_password: string }) =>
    api.post('/api/auth/master-admin/settings/recovery-codes/', data),

  getMasterAdminTwoFactor: () =>
    api.get('/api/auth/master-admin/settings/two-factor/'),

  toggleMasterAdminTwoFactor: (data: { action: 'enable' | 'disable' | 'reset'; current_password: string; totp_code?: string }) =>
    api.post('/api/auth/master-admin/settings/two-factor/', data),

  getMasterAdminSecurityLog: (params?: { days?: number }) =>
    api.get('/api/auth/master-admin/settings/security-log/', { params }),

  getMasterAdminSecurityStatus: () =>
    api.get('/api/auth/master-admin/settings/security-status/'),

  // Services
  getServices: () =>
    api.get('/api/auth/services/'),

  // Services Management (Master Admin)
  getAllServices: () =>
    api.get('/api/auth/master-admin/services/'),

  createService: (data: any) =>
    api.post('/api/auth/master-admin/services/create/', data),

  updateService: (id: number, data: any) =>
    api.put(`/api/auth/master-admin/services/${id}/update/`, data),

  deleteService: (id: number) =>
    api.delete(`/api/auth/master-admin/services/${id}/delete/`),

  toggleServiceStatus: (id: number) =>
    api.post(`/api/auth/master-admin/services/${id}/toggle/`),

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

  resetCompanyPassword: (companyId: number) =>
    api.post(`/api/auth/companies/${companyId}/reset-password/`),

  // Company Operations
  submitDetailedInfo: (companyId: number, data: any) => {
    const config = data instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {}
    return api.patch(`/api/auth/companies/${companyId}/detailed-info/`, data, config)
  },

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
  serviceUserLogin: (credentials: { unique_service_id: string; password: string; service_type: string }) =>
    api.post('/api/auth/service-user/login/', credentials),

  serviceUserLogout: (sessionKey: string) =>
    // Use fetch directly to avoid authentication interceptor issues during logout
    fetch('/api/auth/service-user/logout/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_key: sessionKey })
    }),

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
    api.get('/api/notifications/', { params }),

  getNotification: (id: number) =>
    api.get(`/api/notifications/${id}/`),

  markNotificationsAsRead: (notificationIds: number[]) =>
    api.post('/api/notifications/mark-read/', {
      notification_ids: notificationIds,
    }),

  getNotificationStats: () =>
    api.get('/api/notifications/stats/'),

  createNotification: (data: any) =>
    api.post('/api/notifications/', data),

  // Health check
  healthCheck: () =>
    api.get('/api/health/'),

  // Token validation
  validateToken: () =>
    api.get('/api/auth/validate-token/'),

  // Finance Service APIs
  // Customers
  getFinanceCustomers: (params?: any) =>
    api.get('/api/finance/customers/', { params }),

  createFinanceCustomer: (data: any) =>
    api.post('/api/finance/customers/', data),

  getFinanceCustomer: (id: number, params?: any) =>
    api.get(`/api/finance/customers/${id}/`, { params }),

  updateFinanceCustomer: (id: number, data: any) =>
    api.put(`/api/finance/customers/${id}/`, data),

  deleteFinanceCustomer: (id: number, params?: any) =>
    api.delete(`/api/finance/customers/${id}/`, { params }),

  getCustomerLedger: (params?: any) =>
    api.get('/api/finance/customer-ledger/', { params }),

  downloadCustomerLedgerPDF: (params?: any) =>
    api.get('/api/finance/customer-ledger/pdf/', { params, responseType: 'blob' }),

  getCustomerPendingStatement: (params?: any) =>
    api.get('/api/finance/customer-pending-statement/', { params }),

  downloadCustomerPendingStatementPDF: (params?: any) =>
    api.get('/api/finance/customer-pending-statement/pdf/', { params, responseType: 'blob' }),

  getPOConsolidatedReport: (poId: number, params?: any) =>
    api.get(`/api/finance/purchase-orders/${poId}/consolidated-report/`, { params, responseType: 'blob' }),

  // Products
  getFinanceProducts: (params?: any) =>
    api.get('/api/finance/products/', { params }),

  createFinanceProduct: (data: any) =>
    api.post('/api/finance/products/', data),

  getFinanceProduct: (id: number, params?: any) =>
    api.get(`/api/finance/products/${id}/`, { params }),

  updateFinanceProduct: (id: number, data: any) =>
    api.put(`/api/finance/products/${id}/`, data),

  deleteFinanceProduct: (id: number, params?: any) =>
    api.delete(`/api/finance/products/${id}/`, { params }),

  generateProductCode: (type: string, params?: any) =>
    api.get(`/api/finance/generate-code/?type=${type}`, { params }),

  // Rate limiting helper for bulk operations
  createFinanceProductWithDelay: async (data: any, delay: number = 500) => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return apiClient.createFinanceProduct(data)
  },

  // HSN/SAC Codes
  searchHSNCodes: (params?: any) =>
    api.get('/api/finance/hsn-codes/search/', { params }),

  searchSACCodes: (params?: any) =>
    api.get('/api/finance/sac-codes/search/', { params }),

  createHSNCode: (data: any) =>
    api.post('/api/finance/hsn-codes/create/', data),

  createSACCode: (data: any) =>
    api.post('/api/finance/sac-codes/create/', data),

  // Units
  searchUnits: (params?: any) =>
    api.get('/api/finance/units/', { params }),

  createUnit: (data: any) =>
    api.post('/api/finance/units/', data),

  // Product search (for quotation forms)
  searchFinanceProducts: (params?: any) =>
    api.get('/api/finance/products/search/', { params }),

  // Quotations
  getFinanceQuotations: (params?: any) =>
    api.get('/api/finance/quotations/', { params }),

  createFinanceQuotation: (data: any) =>
    api.post('/api/finance/quotations/', data),

  getFinanceQuotation: (id: number, params?: any) =>
    api.get(`/api/finance/quotations/${id}/`, { params }),

  updateFinanceQuotation: (id: number, data: any) =>
    api.put(`/api/finance/quotations/${id}/`, data),

  deleteFinanceQuotation: (id: number, params?: any) =>
    api.delete(`/api/finance/quotations/${id}/`, { params }),

  copyFinanceQuotation: (id: number, params?: any) =>
    api.post(`/api/finance/quotations/${id}/copy/`, {}, { params }),

  sendQuotationEmail: (id: number, data?: any) =>
    api.post(`/api/finance/quotations/${id}/send_email/`, data),

  // Purchase Orders
  getFinancePurchaseOrders: (params?: any) =>
    api.get('/api/finance/purchase-orders/', { params }),

  createFinancePurchaseOrder: (data: any) =>
    api.post('/api/finance/purchase-orders/', data),

  getFinancePurchaseOrder: (id: number, params?: any) =>
    api.get(`/api/finance/purchase-orders/${id}/`, { params }),

  updateFinancePurchaseOrder: (id: number, data: any) =>
    api.put(`/api/finance/purchase-orders/${id}/`, data),

  deleteFinancePurchaseOrder: (id: number, params?: any) =>
    api.delete(`/api/finance/purchase-orders/${id}/`, { params }),

  // Proforma Invoices
  getFinanceProformaInvoices: (params?: any) =>
    api.get('/api/finance/proforma-invoices/', { params }),

  createFinanceProformaInvoice: (data: any) =>
    api.post('/api/finance/proforma-invoices/', data),

  getFinanceProformaInvoice: (id: number, params?: any) =>
    api.get(`/api/finance/proforma-invoices/${id}/`, { params }),

  updateFinanceProformaInvoice: (id: number, data: any) =>
    api.put(`/api/finance/proforma-invoices/${id}/`, data),

  deleteFinanceProformaInvoice: (id: number, params?: any) =>
    api.delete(`/api/finance/proforma-invoices/${id}/`, { params }),

  generateProformaPDF: (id: number, params?: any) =>
    api.get(`/api/finance/proforma-invoices/${id}/pdf/`, { params }),

  sendProformaEmail: (id: number, data?: any) =>
    api.post(`/api/finance/proforma-invoices/${id}/send_email/`, data),

  sendPurchaseOrderEmail: (id: number, data?: any) =>
    api.post(`/api/finance/purchase-orders/${id}/send_email/`, data),

  // Tax Invoices
  getFinanceInvoices: (params?: any) =>
    api.get('/api/finance/invoices/', { params }),

  createFinanceInvoice: (data: any) =>
    api.post('/api/finance/invoices/', data),

  getFinanceInvoice: (id: number, params?: any) =>
    api.get(`/api/finance/invoices/${id}/`, { params }),

  updateFinanceInvoice: (id: number, data: any) =>
    api.put(`/api/finance/invoices/${id}/`, data),

  deleteFinanceInvoice: (id: number, params?: any) =>
    api.delete(`/api/finance/invoices/${id}/`, { params }),

  generateInvoicePDF: (id: number, params?: any) =>
    api.get(`/api/finance/invoices/${id}/pdf/`, { params }),

  sendInvoiceEmail: (id: number, data?: any) =>
    api.post(`/api/finance/invoices/${id}/send_email/`, data),

  markInvoiceGSTPayment: (id: number, data: { gst_payment_status: string; gst_paid_date?: string; gst_payment_reference?: string }) =>
    api.post(`/api/finance/invoices/${id}/mark_gst_payment/`, data),

  getInvoiceGSTPaymentSummary: (params?: any) =>
    api.get('/api/finance/invoices/gst_payment_summary/', { params }),

  updateInvoicePayment: (id: number, data: any) =>
    api.post(`/api/finance/invoices/${id}/payments/`, data),

  // Payments
  getFinancePayments: (params?: any) =>
    api.get('/api/finance/payments/', { params }),

  createFinancePayment: (data: any) =>
    api.post('/api/finance/payments/', data),

  getFinancePayment: (id: number, params?: any) =>
    api.get(`/api/finance/payments/${id}/`, { params }),

  updateFinancePayment: (id: number, data: any) =>
    api.put(`/api/finance/payments/${id}/`, data),

  deleteFinancePayment: (id: number, params?: any) =>
    api.delete(`/api/finance/payments/${id}/`, { params }),

  getPaymentStats: (params?: any) =>
    api.get('/api/finance/payments/stats/', { params }),

  // HR Service APIs (using correct backend URLs with /api/ prefix)
  // HR Dashboard
  getHRStats: (params?: any) =>
    api.get('/api/hr/dashboard/stats/', { params }),

  getHRAttendanceSummary: (params?: any) =>
    api.get('/api/hr/dashboard/attendance_summary/', { params }),

  // Phase 3: Compliance APIs
  getComplianceDashboard: (params?: any) =>
    api.get('/api/hr/compliance/dashboard/', { params }),

  runComplianceChecks: (params?: any) =>
    api.post('/api/hr/compliance/run_checks/', {}, { params }),

  getComplianceScorecard: (params?: any) =>
    api.get('/api/hr/compliance/scorecard/', { params }),



  // Advanced Reports APIs
  getStatutorySummaryReport: (params?: any) =>
    api.get('/api/hr/advanced-reports/statutory_summary/', { params }),

  getAuditTrailReport: (params?: any) =>
    api.get('/api/hr/advanced-reports/audit_trail/', { params }),

  getComplianceTrends: (params?: any) =>
    api.get('/api/hr/advanced-reports/compliance_trends/', { params }),

  // Automation APIs
  triggerECRGeneration: (params?: any) =>
    api.post('/api/hr/automation/trigger_ecr_generation/', {}, { params }),

  triggerComplianceCheck: (params?: any) =>
    api.post('/api/hr/automation/trigger_compliance_check/', {}, { params }),

  getTaskStatus: (params?: any) =>
    api.get('/api/hr/automation/task_status/', { params }),

  getScheduledTasks: (params?: any) =>
    api.get('/api/hr/automation/scheduled_tasks/', { params }),

  // Integration APIs
  getPortalStatus: (params?: any) =>
    api.get('/api/hr/integration/portal_status/', { params }),

  syncPortal: (data: any) =>
    api.post('/api/hr/integration/sync_portal/', data),

  getSubmissionHistory: (params?: any) =>
    api.get('/api/hr/integration/submission_history/', { params }),

  // Departments
  getHRDepartments: (params?: any) =>
    api.get('/api/hr/departments/', { params }),

  createHRDepartment: (data: any) =>
    api.post('/api/hr/departments/', data),

  getHRDepartment: (id: number) =>
    api.get(`/api/hr/departments/${id}/`),

  updateHRDepartment: (id: number, data: any) =>
    api.put(`/api/hr/departments/${id}/`, data),

  deleteHRDepartment: (id: number) =>
    api.delete(`/api/hr/departments/${id}/`),

  // Designations
  getHRDesignations: (params?: any) =>
    api.get('/api/hr/designations/', { params }),

  createHRDesignation: (data: any) =>
    api.post('/api/hr/designations/', data),

  // Employees
  getHREmployees: (params?: any) =>
    api.get('/api/hr/employees/', { params }),

  createHREmployee: (data: any) =>
    api.post('/api/hr/employees/', data),

  getHREmployee: (id: number, params?: any) =>
    api.get(`/api/hr/employees/${id}/`, { params }),

  updateHREmployee: (id: number, data: any) =>
    api.put(`/api/hr/employees/${id}/`, data),

  deleteHREmployee: (id: number) =>
    api.delete(`/api/hr/employees/${id}/`),

  // Attendance
  getHRAttendance: (params?: any) =>
    api.get('/api/hr/attendance/', { params }),

  markAttendance: (data: any) =>
    api.post('/api/hr/attendance/mark_attendance/', data),

  // Payroll
  getHRPayroll: (params?: any) =>
    api.get('/api/hr/payroll/', { params }),

  processPayroll: (data: any) =>
    api.post('/api/hr/payroll/process_payroll/', data),

  getHRPayrollRecord: (id: number) =>
    api.get(`/api/hr/payroll/${id}/`),

  // Leave Applications
  getHRLeaveApplications: (params?: any) =>
    api.get('/api/hr/leave-applications/', { params }),

  createHRLeaveApplication: (data: any) =>
    api.post('/api/hr/leave-applications/', data),



  // Enhanced HR APIs
  // Live Attendance Dashboard
  getLiveAttendanceDashboard: (params?: any) =>
    api.get('/api/hr/live-attendance/live_dashboard/', { params }),

  mobileCheckin: (data: any) =>
    api.post('/api/hr/live-attendance/mobile_checkin/', data),

  // Biometric Devices
  getBiometricDevices: (params?: any) =>
    api.get('/api/hr/biometric-devices/', { params }),

  createBiometricDevice: (data: any) =>
    api.post('/api/hr/biometric-devices/', data),

  syncBiometricDevice: (id: number) =>
    api.post(`/api/hr/biometric-devices/${id}/sync_attendance/`),

  getBiometricDeviceStatus: (params?: any) =>
    api.get('/api/hr/biometric-devices/device_status/', { params }),

  // Geofence Locations
  getGeofenceLocations: (params?: any) =>
    api.get('/api/hr/geofence-locations/', { params }),

  createGeofenceLocation: (data: any) =>
    api.post('/api/hr/geofence-locations/', data),

  // ESI Contributions
  getESIContributions: (params?: any) =>
    api.get('/api/hr/esi-contributions/', { params }),

  generateESIContributions: (data: any) =>
    api.post('/api/hr/esi-contributions/generate_monthly_contributions/', data),

  // EPFO Contributions
  getEPFOContributions: (params?: any) =>
    api.get('/api/hr/epfo-contributions/', { params }),

  generateEPFOContributions: (data: any) =>
    api.post('/api/hr/epfo-contributions/generate_monthly_contributions/', data),

  // Performance Reviews
  getPerformanceReviews: (params?: any) =>
    api.get('/api/hr/performance-reviews/', { params }),

  createPerformanceReview: (data: any) =>
    api.post('/api/hr/performance-reviews/', data),

  getPerformanceReview: (id: number) =>
    api.get(`/api/hr/performance-reviews/${id}/`),

  updatePerformanceReview: (id: number, data: any) =>
    api.put(`/api/hr/performance-reviews/${id}/`, data),

  // Employee Documents
  getEmployeeDocuments: (params?: any) =>
    api.get('/api/hr/employee-documents/', { params }),

  createEmployeeDocument: (data: any) =>
    api.post('/api/hr/employee-documents/', data),

  verifyEmployeeDocument: (id: number, data: any) =>
    api.post(`/api/hr/employee-documents/${id}/verify_document/`, data),

  // Shifts
  getShifts: (params?: any) =>
    api.get('/api/hr/shifts/', { params }),

  createShift: (data: any) =>
    api.post('/api/hr/shifts/', data),

  // Employee Shifts
  getEmployeeShifts: (params?: any) =>
    api.get('/api/hr/employee-shifts/', { params }),

  createEmployeeShift: (data: any) =>
    api.post('/api/hr/employee-shifts/', data),

  // Overtime Requests
  getOvertimeRequests: (params?: any) =>
    api.get('/api/hr/overtime-requests/', { params }),

  createOvertimeRequest: (data: any) =>
    api.post('/api/hr/overtime-requests/', data),

  approveOvertimeRequest: (id: number, data: any) =>
    api.post(`/api/hr/overtime-requests/${id}/approve/`, data),

  rejectOvertimeRequest: (id: number, data: any) =>
    api.post(`/api/hr/overtime-requests/${id}/reject/`, data),

  // Leave Management APIs
  getLeaveBalances: (params?: any) =>
    api.get('/api/hr/leave-balances/', { params }),

  getLeaveApplications: (params?: any) =>
    api.get('/api/hr/leave-applications/', { params }),

  createLeaveApplication: (data: any) =>
    api.post('/api/hr/leave-applications/', data),

  approveLeaveApplication: (id: number, data?: any) =>
    api.post(`/api/hr/leave-applications/${id}/approve/`, data),

  rejectLeaveApplication: (id: number, data: any) =>
    api.post(`/api/hr/leave-applications/${id}/reject/`, data),

  getHolidays: (params?: any) =>
    api.get('/api/hr/holidays/', { params }),

  createHoliday: (data: any) =>
    api.post('/api/hr/holidays/', data),

  // Banking APIs
  verifyBankAccount: (data: any) =>
    api.post('/api/hr/bank-verification/', data),

  getSalaryPayments: (params?: any) =>
    api.get('/api/hr/salary-payments/', { params }),

  initiateSalaryPayment: (data: any) =>
    api.post('/api/hr/salary-payments/', data),

  // ESI Medical Benefits APIs
  getESIMedicalClaims: (params?: any) =>
    api.get('/api/hr/esi-medical-claims/', { params }),

  createESIMedicalClaim: (data: any) =>
    api.post('/api/hr/esi-medical-claims/', data),

  approveESIMedicalClaim: (id: number, data?: any) =>
    api.post(`/api/hr/esi-medical-claims/${id}/approve/`, data),

  // Statutory Compliance APIs
  getStatutoryDashboard: (params?: any) =>
    api.get('/api/hr/statutory/dashboard/', { params }),

  getStatutorySettings: (params?: any) =>
    api.get('/api/hr/statutory-settings/', { params }),

  updateStatutorySettings: (data: any) =>
    api.post('/api/hr/statutory-settings/', data),

  generatePFECR: (data: any) =>
    api.post('/api/hr/statutory/pf-ecr/', data),

  generateESIReturn: (data: any) =>
    api.post('/api/hr/statutory/esi-return/', data),

  validateCompliance: (data: any) =>
    api.post('/api/hr/statutory/validate-compliance/', data),

  getGovernmentReturns: (params?: any) =>
    api.get('/api/hr/government-returns/', { params }),

  getComplianceAlerts: (params?: any) =>
    api.get('/api/hr/compliance-alerts/', { params }),

  resolveComplianceAlert: (id: number, data?: any) =>
    api.post(`/api/hr/compliance-alerts/${id}/resolve/`, data),

  // HR Analytics
  getAttendanceAnalytics: (params?: any) =>
    api.get('/api/hr/analytics/attendance_analytics/', { params }),

  getPayrollAnalytics: (params?: any) =>
    api.get('/api/hr/dashboard/payroll_analytics/', { params }),

  // Salary Structures
  getSalaryStructures: (params?: any) =>
    api.get('/api/hr/salary-structures/', { params }),

  createSalaryStructure: (data: any) =>
    api.post('/api/hr/salary-structures/', data),

  getSalaryStructure: (id: number, params?: any) =>
    api.get(`/api/hr/salary-structures/${id}/`, { params }),

  updateSalaryStructure: (id: number, data: any) =>
    api.put(`/api/hr/salary-structures/${id}/`, data),

  // Work Schedules
  getWorkSchedules: (params?: any) =>
    api.get('/api/hr/work-schedules/', { params }),

  createWorkSchedule: (data: any) =>
    api.post('/api/hr/work-schedules/', data),

  getWorkSchedule: (id: number, params?: any) =>
    api.get(`/api/hr/work-schedules/${id}/`, { params }),

  updateWorkSchedule: (id: number, data: any) =>
    api.put(`/api/hr/work-schedules/${id}/`, data),

  // Leave Types
  getLeaveTypes: (params?: any) =>
    api.get('/api/hr/leave-types/', { params }),

  createLeaveType: (data: any) =>
    api.post('/api/hr/leave-types/', data),

  // Leave Balance Management
  createLeaveBalance: (data: any) =>
    api.post('/api/hr/leave-balances/', data),

  // Inventory Service APIs
  // Dashboard
  getInventoryDashboard: (params?: any) =>
    api.get('/api/inventory/dashboard/', { params }),

  // Categories
  getInventoryCategories: (params?: any) =>
    api.get('/api/inventory/categories/', { params }),

  createInventoryCategory: (data: any) =>
    api.post('/api/inventory/categories/', data),

  getInventoryCategory: (id: number, params?: any) =>
    api.get(`/api/inventory/categories/${id}/`, { params }),

  updateInventoryCategory: (id: number, data: any) =>
    api.put(`/api/inventory/categories/${id}/`, data),

  deleteInventoryCategory: (id: number, params?: any) =>
    api.delete(`/api/inventory/categories/${id}/`, { params }),

  // Suppliers
  getInventorySuppliers: (params?: any) =>
    api.get('/api/inventory/suppliers/', { params }),

  createInventorySupplier: (data: any) =>
    api.post('/api/inventory/suppliers/', data),

  getInventorySupplier: (id: number, params?: any) =>
    api.get(`/api/inventory/suppliers/${id}/`, { params }),

  updateInventorySupplier: (id: number, data: any) =>
    api.put(`/api/inventory/suppliers/${id}/`, data),

  deleteInventorySupplier: (id: number, params?: any) =>
    api.delete(`/api/inventory/suppliers/${id}/`, { params }),

  // Warehouses
  getInventoryWarehouses: (params?: any) =>
    api.get('/api/inventory/warehouses/', { params }),

  createInventoryWarehouse: (data: any) =>
    api.post('/api/inventory/warehouses/', data),

  getInventoryWarehouse: (id: number, params?: any) =>
    api.get(`/api/inventory/warehouses/${id}/`, { params }),

  updateInventoryWarehouse: (id: number, data: any) =>
    api.put(`/api/inventory/warehouses/${id}/`, data),

  deleteInventoryWarehouse: (id: number, params?: any) =>
    api.delete(`/api/inventory/warehouses/${id}/`, { params }),

  // Products
  getInventoryProducts: (params?: any) =>
    api.get('/api/inventory/products/', { params }),

  createInventoryProduct: (data: any) =>
    api.post('/api/inventory/products/', data),

  getInventoryProduct: (id: number, params?: any) =>
    api.get(`/api/inventory/products/${id}/`, { params }),

  updateInventoryProduct: (id: number, data: any) =>
    api.put(`/api/inventory/products/${id}/`, data),

  deleteInventoryProduct: (id: number, params?: any) =>
    api.delete(`/api/inventory/products/${id}/`, { params }),

  // Stock Movements
  getStockMovements: (params?: any) =>
    api.get('/api/inventory/stock-movements/', { params }),

  createStockMovement: (data: any) =>
    api.post('/api/inventory/stock-movements/', data),

  // Stock Alerts
  getStockAlerts: (params?: any) =>
    api.get('/api/inventory/stock-alerts/', { params }),

  // Dropdown APIs
  getInventoryCategoriesDropdown: (params?: any) =>
    api.get('/api/inventory/api/categories/', { params }),

  getInventorySuppliersDropdown: (params?: any) =>
    api.get('/api/inventory/api/suppliers/', { params }),

  getInventoryWarehousesDropdown: (params?: any) =>
    api.get('/api/inventory/api/warehouses/', { params }),

  // Inventory Reports
  getInventoryLowStockReport: (params?: any) =>
    api.get('/api/inventory/reports/low-stock/', { params }),

  getInventoryStockValuationReport: (params?: any) =>
    api.get('/api/inventory/reports/stock-valuation/', { params }),

  getInventoryABCAnalysisReport: (params?: any) =>
    api.get('/api/inventory/reports/abc-analysis/', { params }),

  // Barcode Generation
  generateInventoryProductBarcode: (productId: number, params?: any) =>
    api.post(`/api/inventory/products/${productId}/generate-barcode/`, {}, { params }),

  // Company Dashboard APIs
  getCompanyDashboardOverview: () =>
    api.get('/api/company-dashboard/overview/'),

  getServiceUtilizationStats: () =>
    api.get('/api/company-dashboard/service-utilization/'),

  getServiceUserActivities: () =>
    api.get('/api/company-dashboard/user-activities/'),

  getCompanyActivityLogs: () =>
    api.get('/api/company-dashboard/activity-logs/'),

  logCompanyActivity: (data: any) =>
    api.post('/api/company-dashboard/log-activity/', data),

  getCompanyNotifications: () =>
    api.get('/api/company-dashboard/notifications/'),

  markCompanyNotificationRead: (notificationId: number) =>
    api.post(`/api/company-dashboard/notifications/${notificationId}/read/`),

  getCompanyAnalyticsDashboard: () =>
    api.get('/api/company-dashboard/analytics/'),

  // Company Email Settings
  getCompanyEmailSettings: () =>
    api.get('/api/company-dashboard/email-settings/'),

  updateCompanyEmailSettings: (data: any) =>
    api.put('/api/company-dashboard/email-settings/', data),

  testCompanyEmailConfiguration: () =>
    api.post('/api/company-dashboard/email-settings/test/'),

  getEmailProviderTemplates: () =>
    api.get('/api/company-dashboard/email-settings/providers/'),

  getEmailUsageStats: () =>
    api.get('/api/company-dashboard/email-settings/usage/'),

  // Company Security Settings
  getCompanySecurityOverview: () =>
    api.get('/api/company-dashboard/security/overview/'),

  // Two-Factor Authentication
  setupCompany2FA: () =>
    api.get('/api/company-dashboard/security/2fa/'),

  verifyCompany2FA: (data: { code: string; secret: string }) =>
    api.post('/api/company-dashboard/security/2fa/', data),

  disableCompany2FA: () =>
    api.delete('/api/company-dashboard/security/2fa/'),

  // Recovery Codes
  getCompanyRecoveryCodes: () =>
    api.get('/api/company-dashboard/security/recovery-codes/'),

  generateCompanyRecoveryCodes: () =>
    api.post('/api/company-dashboard/security/recovery-codes/'),

  // API Keys
  getCompanyApiKeys: () =>
    api.get('/api/company-dashboard/security/api-keys/'),

  createCompanyApiKey: (data: { name: string; permissions: string[]; expires_at?: string }) =>
    api.post('/api/company-dashboard/security/api-keys/', data),

  deleteCompanyApiKey: (keyId: number) =>
    api.delete(`/api/company-dashboard/security/api-keys/${keyId}/`),

  // IP Restrictions
  getCompanyIpRestrictions: () =>
    api.get('/api/company-dashboard/security/ip-restrictions/'),

  addCompanyIpRestriction: (data: { ip_address: string; restriction_type: string; description: string }) =>
    api.post('/api/company-dashboard/security/ip-restrictions/', data),

  removeCompanyIpRestriction: (restrictionId: number) =>
    api.delete(`/api/company-dashboard/security/ip-restrictions/${restrictionId}/`),

  // Sessions
  getCompanySessions: () =>
    api.get('/api/company-dashboard/security/sessions/'),

  terminateCompanySession: (sessionId: number) =>
    api.delete(`/api/company-dashboard/security/sessions/${sessionId}/`),

  terminateAllCompanySessions: () =>
    api.delete('/api/company-dashboard/security/sessions/'),

  // Security Logs
  getCompanySecurityLogs: (params?: { action?: string; success?: boolean; search?: string }) =>
    api.get('/api/company-dashboard/security/audit-logs/', { params }),

  // Enhanced Password Change
  changeCompanyUserPasswordSecure: (data: { current_password: string; new_password: string; confirm_password: string; force_logout_all?: boolean }) =>
    api.post('/api/company-dashboard/security/password-change/', data),

  // Advanced Security APIs (Phase 4)
  getCaptcha: (companyId: number) =>
    api.get('/api/company-dashboard/advanced-security/captcha/', { params: { company_id: companyId } }),

  verifyCaptcha: (data: any) =>
    api.post('/api/company-dashboard/advanced-security/captcha/', data),

  getCompanyDeviceFingerprints: () =>
    api.get('/api/company-dashboard/advanced-security/device-fingerprinting/'),

  registerDeviceFingerprint: (data: any) =>
    api.post('/api/company-dashboard/advanced-security/device-fingerprinting/', data),

  getGeolocationRules: () =>
    api.get('/api/company-dashboard/advanced-security/geolocation-rules/'),

  createGeolocationRule: (data: any) =>
    api.post('/api/company-dashboard/advanced-security/geolocation-rules/', data),

  deleteGeolocationRule: (ruleId: number) =>
    api.delete(`/api/company-dashboard/advanced-security/geolocation-rules/${ruleId}/`),

  getThreatDetections: (params?: any) =>
    api.get('/api/company-dashboard/advanced-security/threat-detection/', { params }),

  createThreatDetection: (data: any) =>
    api.post('/api/company-dashboard/advanced-security/threat-detection/', data),

  getSecurityAlerts: (params?: any) =>
    api.get('/api/company-dashboard/advanced-security/security-alerts/', { params }),

  updateSecurityAlert: (alertId: number, data: any) =>
    api.patch(`/api/company-dashboard/advanced-security/security-alerts/${alertId}/`, data),

  getAdvancedSecuritySettings: () =>
    api.get('/api/company-dashboard/advanced-security/advanced-settings/'),

  updateAdvancedSecuritySettings: (data: any) =>
    api.patch('/api/company-dashboard/advanced-security/advanced-settings/', data),

  getAdvancedSecurityDashboard: () =>
    api.get('/api/company-dashboard/advanced-security/advanced-dashboard/'),

  // CRM Service APIs
  // Dashboard
  getCRMDashboardStats: (params?: any) =>
    api.get('/api/crm/dashboard/', { params }),

  getCRMRecentActivities: (params?: any) =>
    api.get('/api/crm/dashboard/recent_activities/', { params }),

  getCRMSalesFunnel: (params?: any) =>
    api.get('/api/crm/dashboard/sales_funnel/', { params }),

  // Leads
  getCRMLeads: (params?: any) =>
    api.get('/api/crm/leads/', { params }),

  createCRMLead: (data: any) =>
    api.post('/api/crm/leads/', data),

  getCRMLead: (id: number, params?: any) =>
    api.get(`/api/crm/leads/${id}/`, { params }),

  updateCRMLead: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/leads/${id}/`, updateData)
  },

  deleteCRMLead: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/leads/${data.id}/`, { params: data }),

  convertCRMLeadToOpportunity: (data: { id: number; [key: string]: any }) =>
    api.post(`/api/crm/leads/${data.id}/convert_to_opportunity/`, data),

  // Contacts
  getCRMContacts: (params?: any) =>
    api.get('/api/crm/contacts/', { params }),

  createCRMContact: (data: any) =>
    api.post('/api/crm/contacts/', data),

  getCRMContact: (id: number, params?: any) =>
    api.get(`/api/crm/contacts/${id}/`, { params }),

  updateCRMContact: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/contacts/${id}/`, updateData)
  },

  deleteCRMContact: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/contacts/${data.id}/`, { params: data }),

  // Accounts
  getCRMAccounts: (params?: any) =>
    api.get('/api/crm/accounts/', { params }),

  createCRMAccount: (data: any) =>
    api.post('/api/crm/accounts/', data),

  getCRMAccount: (id: number, params?: any) =>
    api.get(`/api/crm/accounts/${id}/`, { params }),

  updateCRMAccount: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/accounts/${id}/`, updateData)
  },

  deleteCRMAccount: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/accounts/${data.id}/`, { params: data }),

  getCRMAccountOpportunities: (data: { account_id: number; [key: string]: any }) =>
    api.get(`/api/crm/accounts/${data.account_id}/opportunities/`, { params: data }),

  getCRMAccountActivities: (data: { account_id: number; [key: string]: any }) =>
    api.get(`/api/crm/accounts/${data.account_id}/activities/`, { params: data }),

  // Opportunities
  getCRMOpportunities: (params?: any) =>
    api.get('/api/crm/opportunities/', { params }),

  createCRMOpportunity: (data: any) =>
    api.post('/api/crm/opportunities/', data),

  getCRMOpportunity: (id: number, params?: any) =>
    api.get(`/api/crm/opportunities/${id}/`, { params }),

  updateCRMOpportunity: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/opportunities/${id}/`, updateData)
  },

  deleteCRMOpportunity: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/opportunities/${data.id}/`, { params: data }),

  updateCRMOpportunityStage: (data: { id: number; stage: string; [key: string]: any }) =>
    api.post(`/api/crm/opportunities/${data.id}/update_stage/`, data),

  getCRMOpportunityPipeline: (params?: any) =>
    api.get('/api/crm/opportunities/pipeline/', { params }),

  getCRMOpportunityForecast: (params?: any) =>
    api.get('/api/crm/opportunities/forecast/', { params }),

  // Activities
  getCRMActivities: (params?: any) =>
    api.get('/api/crm/activities/', { params }),

  createCRMActivity: (data: any) =>
    api.post('/api/crm/activities/', data),

  getCRMActivity: (id: number, params?: any) =>
    api.get(`/api/crm/activities/${id}/`, { params }),

  updateCRMActivity: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/activities/${id}/`, updateData)
  },

  deleteCRMActivity: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/activities/${data.id}/`, { params: data }),

  completeCRMActivity: (data: { id: number; outcome?: string; [key: string]: any }) =>
    api.post(`/api/crm/activities/${data.id}/complete/`, data),

  getCRMTodayActivities: (params?: any) =>
    api.get('/api/crm/activities/today/', { params }),

  getCRMOverdueActivities: (params?: any) =>
    api.get('/api/crm/activities/overdue/', { params }),

  // Campaigns
  getCRMCampaigns: (params?: any) =>
    api.get('/api/crm/campaigns/', { params }),

  createCRMCampaign: (data: any) =>
    api.post('/api/crm/campaigns/', data),

  getCRMCampaign: (id: number, params?: any) =>
    api.get(`/api/crm/campaigns/${id}/`, { params }),

  updateCRMCampaign: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/campaigns/${id}/`, updateData)
  },

  deleteCRMCampaign: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/campaigns/${data.id}/`, { params: data }),

  getCRMCampaignMembers: (data: { campaign_id: number; [key: string]: any }) =>
    api.get(`/api/crm/campaigns/${data.campaign_id}/members/`, { params: data }),

  addCRMCampaignMembers: (data: { campaign_id: number; [key: string]: any }) =>
    api.post(`/api/crm/campaigns/${data.campaign_id}/add_members/`, data),

  // Sales Targets
  getCRMSalesTargets: (params?: any) =>
    api.get('/api/crm/sales-targets/', { params }),

  createCRMSalesTarget: (data: any) =>
    api.post('/api/crm/sales-targets/', data),

  getCRMSalesTarget: (id: number, params?: any) =>
    api.get(`/api/crm/sales-targets/${id}/`, { params }),

  updateCRMSalesTarget: (data: { id: number; [key: string]: any }) => {
    const { id, ...updateData } = data
    return api.put(`/api/crm/sales-targets/${id}/`, updateData)
  },

  deleteCRMSalesTarget: (data: { id: number; [key: string]: any }) =>
    api.delete(`/api/crm/sales-targets/${data.id}/`, { params: data }),

  getCRMCurrentPerformance: (params?: any) =>
    api.get('/api/crm/sales-targets/current_performance/', { params }),

  // Government Portal Integration (Phase 4)
  submitToGovernmentPortal: (data: any) =>
    api.post('/api/hr/government/submit/', data),

  checkSubmissionStatus: (data: any) =>
    api.post('/api/hr/government/check-status/', data),

  generateChallan: (data: any) =>
    api.post('/api/hr/government/generate-challan/', data),

  getGovernmentSubmissionHistory: (params?: any) =>
    api.get('/api/hr/government/submission-history/', { params }),

  getGovernmentChallans: (params?: any) =>
    api.get('/api/hr/government/challans/', { params }),

  getPortalCredentials: (params?: any) =>
    api.get('/api/hr/government/credentials/', { params }),

  updatePortalCredentials: (data: any) =>
    api.post('/api/hr/government/credentials/', data),

  // Phase 3: Enhanced Security APIs
  getSecuritySettings: () =>
    api.get('/api/auth/master-admin/security-settings/'),

  updateSecuritySettings: (data: any) =>
    api.post('/api/auth/master-admin/security-settings/', data),

  getIPRestrictions: () =>
    api.get('/api/auth/master-admin/ip-restrictions/'),

  addIPRestriction: (data: { ip_address: string; description: string }) =>
    api.post('/api/auth/master-admin/ip-restrictions/', data),

  removeIPRestriction: (id: number) =>
    api.delete(`/api/auth/master-admin/ip-restrictions/${id}/`),

  toggleIPRestriction: (id: number, data: { is_active: boolean }) =>
    api.patch(`/api/auth/master-admin/ip-restrictions/${id}/`, data),

  getDeviceFingerprints: () =>
    api.get('/api/auth/master-admin/device-fingerprints/'),

  removeDeviceFingerprint: (deviceId: string) =>
    api.delete(`/api/auth/master-admin/device-fingerprints/${deviceId}/`),

  toggleDeviceTrust: (deviceId: string, data: { is_trusted: boolean }) =>
    api.patch(`/api/auth/master-admin/device-fingerprints/${deviceId}/`, data),

  getLoginNotifications: () =>
    api.get('/api/auth/master-admin/login-notifications/'),

  testLoginNotification: () =>
    api.post('/api/auth/master-admin/login-notifications/test/'),

  getNotificationEmail: () =>
    api.get('/api/auth/master-admin/notification-email/'),

  setNotificationEmail: (data: { notification_email: string }) =>
    api.post('/api/auth/master-admin/notification-email/', data),

  // Master Admin Email Settings
  getMasterAdminEmailSettings: () =>
    api.get('/api/auth/master-admin/email-settings/'),

  updateMasterAdminEmailSettings: (data: any) =>
    api.post('/api/auth/master-admin/email-settings/', data),

  testMasterAdminEmail: (data?: { test_email?: string }) =>
    api.post('/api/auth/master-admin/email-settings/test/', data || {}),

  getMasterAdminEmailProviders: () =>
    api.get('/api/auth/master-admin/email-settings/providers/'),

  getMasterAdminEmailUsage: () =>
    api.get('/api/auth/master-admin/email-settings/usage/'),

  // Document Numbering APIs
  getCurrentFinancialYear: () =>
    api.get('/api/company-dashboard/document-numbering/current-financial-year/'),

  getDocumentNumberingConfigs: (params?: any) =>
    api.get('/api/company-dashboard/document-numbering/configs/', { params }),

  createDocumentNumberingConfig: (data: any) =>
    api.post('/api/company-dashboard/document-numbering/configs/', data),

  getDocumentNumberingConfig: (id: number) =>
    api.get(`/api/company-dashboard/document-numbering/configs/${id}/`),

  updateDocumentNumberingConfig: (id: number, data: any) =>
    api.put(`/api/company-dashboard/document-numbering/configs/${id}/`, data),

  deleteDocumentNumberingConfig: (id: number) =>
    api.delete(`/api/company-dashboard/document-numbering/configs/${id}/`),

  bulkSetupDocumentNumbering: (data: any) =>
    api.post('/api/company-dashboard/document-numbering/bulk-setup/', data),

  generateDocumentNumber: (data: any) =>
    api.post('/api/company-dashboard/document-numbering/generate-number/', data),

  getDocumentNumberingHistory: (params?: any) =>
    api.get('/api/company-dashboard/document-numbering/history/', { params }),

  getNumberingDashboardStats: () =>
    api.get('/api/company-dashboard/document-numbering/dashboard-stats/'),

  getFinancialYearSettings: (params?: any) =>
    api.get('/api/company-dashboard/document-numbering/financial-year-settings/', { params }),

  createFinancialYearSettings: (data: any) =>
    api.post('/api/company-dashboard/document-numbering/financial-year-settings/', data),

  // Template Info (shared across all document types)
  getQuotationTemplateInfo: () =>
    api.get('/api/company-dashboard/template-info/'),

  // Quotation Template APIs
  getQuotationTemplateSettings: () =>
    api.get('/api/company-dashboard/quotation-template-settings/'),

  updateQuotationTemplateSettings: (data: { selected_template: string }) =>
    api.post('/api/company-dashboard/quotation-template-settings/', data),

  previewQuotationTemplate: (templateName: string) =>
    api.get(`/api/company-dashboard/quotation-template-preview/${templateName}/`, { responseType: 'text' }),

  // PO Template APIs
  getPOTemplateSettings: () =>
    api.get('/api/company-dashboard/po-template-settings/'),

  updatePOTemplateSettings: (data: { selected_po_template: string }) =>
    api.post('/api/company-dashboard/po-template-settings/', data),

  previewPOTemplate: (templateName: string) =>
    api.get(`/api/company-dashboard/po-template-preview/${templateName}/`, { responseType: 'text' }),

  generatePurchaseOrderPDF: (id: number, params?: any) =>
    api.get(`/api/finance/purchase-orders/${id}/pdf/`, { params }),

  // Proforma Template APIs
  getProformaTemplateSettings: () =>
    api.get('/api/company-dashboard/proforma-template-settings/'),

  updateProformaTemplateSettings: (data: { selected_proforma_template: string }) =>
    api.post('/api/company-dashboard/proforma-template-settings/', data),

  previewProformaTemplate: (templateName: string) =>
    api.get(`/api/company-dashboard/proforma-template-preview/${templateName}/`, { responseType: 'text' }),

  // Invoice Template APIs
  getInvoiceTemplateSettings: () =>
    api.get('/api/company-dashboard/invoice-template-settings/'),

  updateInvoiceTemplateSettings: (data: { selected_invoice_template: string }) =>
    api.post('/api/company-dashboard/invoice-template-settings/', data),

  previewInvoiceTemplate: (templateName: string) =>
    api.get(`/api/company-dashboard/invoice-template-preview/${templateName}/`, { responseType: 'text' }),

  // Convenience methods for backward compatibility
  getEmployees: (params?: any) => apiClient.getHREmployees(params),
  createEmployee: (data: any) => apiClient.createHREmployee(data),
  getEmployee: (id: number, params?: any) => apiClient.getHREmployee(id, params),
  updateEmployee: (id: number, data: any) => apiClient.updateHREmployee(id, data),
  deleteEmployee: (id: number) => apiClient.deleteHREmployee(id),
  getPayroll: (params?: any) => apiClient.getHRPayroll(params),
}

// Export token management functions and API_BASE_URL
// Export token management functions and API_BASE_URL
export { getToken, getRefreshToken, setTokens, clearTokens, API_BASE_URL }

export default apiClient
