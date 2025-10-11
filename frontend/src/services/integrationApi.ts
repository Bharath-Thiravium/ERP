import { apiClient } from '../lib/api'

export interface PaymentGateway {
  id: number
  name: string
  type: string
  isActive: boolean
}

export interface EmailAutomation {
  id: number
  name: string
  type: string
  isActive: boolean
}

export interface MobileAppConfig {
  id: number
  name: string
  version: string
  isActive: boolean
  push_notifications_enabled?: boolean
  gst_filing_alerts?: boolean
  payment_due_alerts?: boolean
  offline_mode_enabled?: boolean
  biometric_auth_enabled?: boolean
  quick_invoice_enabled?: boolean
}

export const integrationApi = {
  getPaymentGateways: async () => {
    const response = await apiClient.get('/api/finance/integration/payment-gateways/')
    return response.data
  },

  getEmailAutomations: async () => {
    const response = await apiClient.get('/api/finance/integration/email-automations/')
    return response.data
  },

  getMobileAppConfigs: async () => {
    const response = await apiClient.get('/api/finance/integration/mobile-configs/')
    return response.data
  },

  getMobileAppConfig: async () => {
    const response = await apiClient.get('/api/finance/integration/mobile-config/')
    return response.data
  },

  getIntegrationDashboard: async () => {
    const response = await apiClient.get('/api/finance/integration/dashboard/')
    return response.data
  }
}