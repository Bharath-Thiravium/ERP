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

      // Skip token refresh for service user endpoints (HR, Finance)
      const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                   originalRequest.url?.includes('/api/finance/')
      
      if (isServiceUserEndpoint) {
        // For service user endpoints, don't try JWT refresh, just return the error
        return Promise.reject(error)
      }

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
        // No refresh token, redirect to login (but not for service user endpoints)
        const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                     originalRequest.url?.includes('/api/finance/')
        
        if (!isServiceUserEndpoint) {
          console.log('🔍 DEBUG: No refresh token available')
          clearTokens()
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
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

  // HSN/SAC Codes
  searchHSNCodes: (params?: any) =>
    api.get('/api/finance/hsn-codes/search/', { params }),

  searchSACCodes: (params?: any) =>
    api.get('/api/finance/sac-codes/search/', { params }),

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
    api.post(`/api/finance/proforma-invoices/${id}/send-email/`, data),

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
    api.post(`/api/finance/invoices/${id}/send-email/`, data),

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

  getHREmployee: (id: number) =>
    api.get(`/api/hr/employees/${id}/`),

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

  approveLeaveApplication: (id: number) =>
    api.post(`/api/hr/leave-applications/${id}/approve/`),

  rejectLeaveApplication: (id: number, data: any) =>
    api.post(`/api/hr/leave-applications/${id}/reject/`, data),
}

// Export token management functions
export { getToken, getRefreshToken, setTokens, clearTokens }

export default api
