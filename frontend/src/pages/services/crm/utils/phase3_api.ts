import { apiClient } from '../../../../lib/api'

export const phase3Api = {
  // Phase 3: Marketing Automation APIs
  getEmailTemplates: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/email-templates/', { params: { session_key: sessionKey!, ...params } })
  },

  createEmailTemplate: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/email-templates/', { session_key: sessionKey!, ...data })
  },

  updateEmailTemplate: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/email-templates/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteEmailTemplate: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/email-templates/${id}/`)
  },

  getMarketingCampaigns: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/marketing-campaigns/', { params: { session_key: sessionKey!, ...params } })
  },

  createMarketingCampaign: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/marketing-campaigns/', { session_key: sessionKey!, ...data })
  },

  updateMarketingCampaign: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/marketing-campaigns/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteMarketingCampaign: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/marketing-campaigns/${id}/`)
  },

  launchMarketingCampaign: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/marketing-campaigns/${id}/launch/`, { session_key: sessionKey })
  },

  pauseMarketingCampaign: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/marketing-campaigns/${id}/pause/`, { session_key: sessionKey })
  },

  getCampaignAnalytics: async (sessionKey: string, id: number) => {
    return apiClient.get(`/api/crm/marketing-campaigns/${id}/analytics/`, { params: { session_key: sessionKey } })
  },

  getEmailSends: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/email-sends/', { params: { session_key: sessionKey!, ...params } })
  },

  getAutomationWorkflows: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/automation-workflows/', { params: { session_key: sessionKey!, ...params } })
  },

  createAutomationWorkflow: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/automation-workflows/', { session_key: sessionKey!, ...data })
  },

  updateAutomationWorkflow: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/automation-workflows/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteAutomationWorkflow: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/automation-workflows/${id}/`)
  },

  activateWorkflow: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/automation-workflows/${id}/activate/`, { session_key: sessionKey })
  },

  pauseWorkflow: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/automation-workflows/${id}/pause/`, { session_key: sessionKey })
  },

  getWorkflowPerformance: async (sessionKey: string, id: number) => {
    return apiClient.get(`/api/crm/automation-workflows/${id}/performance/`, { params: { session_key: sessionKey } })
  },

  // Phase 3: Advanced Reporting APIs
  getReportTemplates: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/report-templates/', { params: { session_key: sessionKey!, ...params } })
  },

  createReportTemplate: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/report-templates/', { session_key: sessionKey!, ...data })
  },

  updateReportTemplate: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/report-templates/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteReportTemplate: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/report-templates/${id}/`)
  },

  generateReport: async (sessionKey: string, id: number) => {
    return apiClient.get(`/api/crm/report-templates/${id}/generate/`, { params: { session_key: sessionKey } })
  },

  getDashboards: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/dashboards/', { params: { session_key: sessionKey!, ...params } })
  },

  createDashboard: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/dashboards/', { session_key: sessionKey!, ...data })
  },

  updateDashboard: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/dashboards/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteDashboard: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/dashboards/${id}/`)
  },

  getDashboardData: async (sessionKey: string, id: number) => {
    return apiClient.get(`/api/crm/dashboards/${id}/data/`, { params: { session_key: sessionKey } })
  },

  getReportSchedules: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/report-schedules/', { params: { session_key: sessionKey!, ...params } })
  },

  createReportSchedule: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/report-schedules/', { session_key: sessionKey!, ...data })
  },

  runScheduledReport: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/report-schedules/${id}/run_now/`, { session_key: sessionKey })
  },

  getBusinessInsights: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/business-intelligence/', { params: { session_key: sessionKey!, ...params } })
  },

  generateBusinessInsights: async (sessionKey: string) => {
    return apiClient.post('/api/crm/business-intelligence/generate_insights/', { session_key: sessionKey })
  },

  acknowledgeInsight: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/business-intelligence/${id}/acknowledge/`, { session_key: sessionKey })
  },

  getDashboardInsights: async (sessionKey: string) => {
    return apiClient.get('/api/crm/business-intelligence/dashboard_insights/', { params: { session_key: sessionKey } })
  }
}