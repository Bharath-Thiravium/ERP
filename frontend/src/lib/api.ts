import axios, { AxiosResponse, AxiosError, AxiosInstance } from 'axios'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
      // Check if this is a service user endpoint (HR, Finance, Inventory)
      const isServiceUserEndpoint = config.url?.includes('/api/hr/') ||
                                   config.url?.includes('/api/finance/') ||
                                   config.url?.includes('/api/inventory/')
      
      if (isServiceUserEndpoint) {
        // Use session key as query parameter for service user endpoints
        const sessionKey = localStorage.getItem('service_session_key')
        if (sessionKey) {
          config.params = config.params || {}
          config.params.session_key = sessionKey
        }
      } else {
        // Use JWT token for regular endpoints
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

      // Skip token refresh for service user endpoints (HR, Finance, Inventory)
      const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                   originalRequest.url?.includes('/api/finance/') ||
                                   originalRequest.url?.includes('/api/inventory/')
      
      if (isServiceUserEndpoint) {
        // For service user endpoints, don't try JWT refresh, just return the error
        return Promise.reject(error)
      }

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

          // Don't show error toast for token refresh failures
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login (but not for service user endpoints)
        const isServiceUserEndpoint = originalRequest.url?.includes('/api/hr/') ||
                                     originalRequest.url?.includes('/api/finance/') ||
                                     originalRequest.url?.includes('/api/inventory/')
        
        if (!isServiceUserEndpoint) {
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

// URL validation for SSRF protection
function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, API_BASE_URL)
    // Only allow same origin requests
    return urlObj.origin === new URL(API_BASE_URL).origin
  } catch {
    return false
  }
}

// API methods
export const apiClient = {
  // Generic methods
  get: <T = any>(url: string, params?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.get(url, { params })
  },
  
  post: <T = any>(url: string, data?: any): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.post(url, data)
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
  
  delete: <T = any>(url: string): Promise<AxiosResponse<T>> => {
    if (!validateUrl(url)) {
      throw new Error('Invalid URL: SSRF protection')
    }
    return api.delete(url)
  },

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

  toggleMasterAdminTwoFactor: (data: { action: 'enable' | 'disable'; current_password: string; totp_code?: string }) =>
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

  sendQuotationEmail: (id: number, data?: any) =>
    api.post(`/api/finance/quotations/${id}/send-email/`, data),

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

  approveLeaveApplication: (id: number) =>
    api.post(`/api/hr/leave-applications/${id}/approve/`),

  rejectLeaveApplication: (id: number, data: any) =>
    api.post(`/api/hr/leave-applications/${id}/reject/`, data),

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

  // Leave Balances
  getLeaveBalances: (params?: any) =>
    api.get('/api/hr/leave-balances/', { params }),

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

  // Convenience methods for backward compatibility
  getEmployees: (params?: any) => apiClient.getHREmployees(params),
  createEmployee: (data: any) => apiClient.createHREmployee(data),
  getEmployee: (id: number, params?: any) => apiClient.getHREmployee(id, params),
  updateEmployee: (id: number, data: any) => apiClient.updateHREmployee(id, data),
  deleteEmployee: (id: number) => apiClient.deleteHREmployee(id),
  getPayroll: (params?: any) => apiClient.getHRPayroll(params),
}

// Export token management functions and API_BASE_URL
export { getToken, getRefreshToken, setTokens, clearTokens, API_BASE_URL }

export default api
