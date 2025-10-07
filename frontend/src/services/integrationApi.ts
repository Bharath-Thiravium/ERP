import api, { apiClient } from '../lib/api';





// Payment Gateway
export interface PaymentGateway {
  id: number;
  gateway_type: string;
  gateway_name: string;
  merchant_id?: string;
  webhook_url?: string;
  auto_gst_payment: boolean;
  auto_tds_payment: boolean;
  payment_threshold: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

// Email Automation
export interface EmailAutomation {
  id: number;
  email_type: string;
  title: string;
  recipient_emails: string[];
  include_company_admin: boolean;
  include_finance_users: boolean;
  frequency: string;
  send_days_before: number;
  send_time: string;
  subject_template: string;
  body_template: string;
  is_active: boolean;
  last_sent?: string;
  next_send?: string;
  created_at: string;
  updated_at: string;
}

// Mobile App Config
export interface MobileAppConfig {
  id: number;
  push_notifications_enabled: boolean;
  gst_filing_alerts: boolean;
  payment_due_alerts: boolean;
  invoice_alerts: boolean;
  offline_mode_enabled: boolean;
  biometric_auth_enabled: boolean;
  quick_invoice_enabled: boolean;
  expense_capture_enabled: boolean;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  wifi_only_sync: boolean;
  session_timeout: number;
  require_pin: boolean;
  created_at: string;
  updated_at: string;
}

// Integration Log
export interface IntegrationLog {
  id: number;
  log_type: string;
  status: string;
  message: string;
  details: any;
  records_processed: number;
  records_success: number;
  records_failed: number;
  processing_time: number;
  created_at: string;
}

export const integrationApi = {
  // Bank Integration (Customer-focused)
  getBankCustomers: (params?: any) =>
    apiClient.get('/api/finance/integration/customers/', { params }),

  verifyCustomerBank: async (data: { customer_id: number }): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/verify-bank/', data);
    return response.data;
  },

  importCustomerStatement: async (data: FormData): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/import-statement/', data);
    return response.data;
  },

  getReconciliationData: (params?: any) =>
    apiClient.get('/api/finance/integration/reconciliation/', { params }),

  // ERP Connectors (New Enhanced System)
  getERPConnectors: (params?: any) =>
    apiClient.get('/api/finance/integration/erp-connectors/', { params }),

  createERPConnector: async (data: any): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/erp-connectors/create/', data);
    return response.data;
  },

  updateERPConnector: async (id: number, data: any): Promise<any> => {
    const response = await apiClient.put(`/api/finance/integration/erp-connectors/${id}/`, data);
    return response.data;
  },

  deleteERPConnector: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/api/finance/integration/erp-connectors/${id}/`);
    return response.data;
  },

  testERPConnection: async (id: number): Promise<any> => {
    const response = await apiClient.post(`/api/finance/integration/erp-connectors/${id}/test/`);
    return response.data;
  },

  syncERPData: async (id: number, syncType?: string): Promise<any> => {
    const response = await apiClient.post(`/api/finance/integration/erp-connectors/${id}/sync/`, {
      sync_type: syncType || 'all'
    });
    return response.data;
  },

  getERPLogs: async (id: number): Promise<any> => {
    const response = await apiClient.get(`/api/finance/integration/erp-connectors/${id}/logs/`);
    return response.data;
  },

  getERPDashboard: async (): Promise<any> => {
    const response = await apiClient.get('/api/finance/integration/erp-connectors/dashboard/');
    return response.data;
  },

  // Enhanced Payment Gateway
  getPaymentGateways: async (params?: any): Promise<{ results: PaymentGateway[] }> => {
    const response = await apiClient.get('/api/finance/integration/payment-gateways/', { params });
    return response.data;
  },

  createPaymentGateway: async (data: Partial<PaymentGateway>): Promise<PaymentGateway> => {
    const response = await apiClient.post('/api/finance/integration/payment-gateways/', data);
    return response.data;
  },

  updatePaymentGateway: async (id: number, data: Partial<PaymentGateway>): Promise<PaymentGateway> => {
    const response = await apiClient.put(`/api/finance/integration/payment-gateways/${id}/`, data);
    return response.data;
  },

  deletePaymentGateway: async (id: number): Promise<any> => {
    const response = await apiClient.delete(`/api/finance/integration/payment-gateways/${id}/`);
    return response.data;
  },

  testPaymentGateway: async (id: number, sessionKey: string): Promise<any> => {
    const response = await apiClient.post(`/api/finance/integration/payment-gateways/${id}/test/`, {
      session_key: sessionKey
    });
    return response.data;
  },

  processInvoicePayment: async (data: {
    gateway_id: number;
    invoice_id: number;
    amount: number;
    payment_method?: string;
    session_key: string;
  }): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/process-payment/', data);
    return response.data;
  },

  generatePaymentLink: async (data: {
    gateway_id: number;
    invoice_id: number;
    amount: number;
    session_key: string;
  }): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/generate-payment-link/', data);
    return response.data;
  },

  getPaymentGatewayDashboard: async (sessionKey: string): Promise<any> => {
    const response = await apiClient.get('/api/finance/integration/payment-gateway-dashboard/', {
      params: { session_key: sessionKey }
    });
    return response.data;
  },

  getInvoicesForPayment: async (sessionKey: string): Promise<any> => {
    const response = await apiClient.get('/api/finance/integration/invoices-for-payment/', {
      params: { session_key: sessionKey }
    });
    return response.data;
  },

  processAutomatedTaxPayment: async (data: {
    payment_gateway_id: number;
    tax_type: string;
    tax_period: string;
    amount: number;
    due_date: string;
  }): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/automated-tax-payment/', data);
    return response.data;
  },

  // Email Automation
  getEmailAutomations: async (params?: any): Promise<{ results: EmailAutomation[] }> => {
    const response = await apiClient.get('/api/finance/integration/email-automations/', { params });
    return response.data;
  },

  createEmailAutomation: async (data: Partial<EmailAutomation>): Promise<EmailAutomation> => {
    const response = await apiClient.post('/api/finance/integration/email-automations/', data);
    return response.data;
  },

  // Mobile App
  getMobileAppConfig: async (): Promise<MobileAppConfig> => {
    const response = await apiClient.get('/api/finance/integration/mobile-config/');
    return response.data;
  },

  updateMobileAppConfig: async (data: Partial<MobileAppConfig>): Promise<MobileAppConfig> => {
    const response = await apiClient.put('/api/finance/integration/mobile-config/', data);
    return response.data;
  },

  syncMobileData: async (lastSyncTime?: string): Promise<any> => {
    const response = await apiClient.post('/api/finance/integration/mobile-sync/', {
      last_sync_time: lastSyncTime
    });
    return response.data;
  },

  // Dashboard
  getIntegrationDashboard: async (params?: any): Promise<any> => {
    const response = await apiClient.get('/api/finance/integration/dashboard/', { params });
    return response.data;
  }
};