import { apiClient } from '../../../../lib/api'

export const crmApi = {
  // Dashboard
  getDashboardStats: async (sessionKey: string) => {
    return apiClient.getCRMDashboardStats({ session_key: sessionKey })
  },

  getRecentActivities: async (sessionKey: string) => {
    return apiClient.getCRMRecentActivities({ session_key: sessionKey })
  },

  getSalesFunnel: async (sessionKey: string) => {
    return apiClient.getCRMSalesFunnel({ session_key: sessionKey })
  },

  // Leads
  getLeads: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMLeads({ session_key: sessionKey!, ...params })
  },

  createLead: async (sessionKey: string, data: any) => {
    return apiClient.createCRMLead({ session_key: sessionKey!, ...data })
  },

  updateLead: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMLead({ session_key: sessionKey!, id, ...data })
  },

  deleteLead: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMLead({ session_key: sessionKey!, id })
  },

  convertLeadToOpportunity: async (sessionKey: string, id: number) => {
    return apiClient.convertCRMLeadToOpportunity({ session_key: sessionKey!, id })
  },

  // Contacts
  getContacts: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMContacts({ session_key: sessionKey!, ...params })
  },

  createContact: async (sessionKey: string, data: any) => {
    return apiClient.createCRMContact({ session_key: sessionKey!, ...data })
  },

  updateContact: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMContact({ session_key: sessionKey!, id, ...data })
  },

  deleteContact: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMContact({ session_key: sessionKey!, id })
  },

  // Accounts
  getAccounts: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMAccounts({ session_key: sessionKey!, ...params })
  },

  createAccount: async (sessionKey: string, data: any) => {
    return apiClient.createCRMAccount({ session_key: sessionKey!, ...data })
  },

  updateAccount: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMAccount({ session_key: sessionKey!, id, ...data })
  },

  deleteAccount: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMAccount({ session_key: sessionKey!, id })
  },

  getAccountOpportunities: async (sessionKey: string, accountId: number) => {
    return apiClient.getCRMAccountOpportunities({ session_key: sessionKey!, account_id: accountId })
  },

  getAccountActivities: async (sessionKey: string, accountId: number) => {
    return apiClient.getCRMAccountActivities({ session_key: sessionKey!, account_id: accountId })
  },

  // Opportunities
  getOpportunities: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMOpportunities({ session_key: sessionKey!, ...params })
  },

  createOpportunity: async (sessionKey: string, data: any) => {
    return apiClient.createCRMOpportunity({ session_key: sessionKey!, ...data })
  },

  updateOpportunity: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMOpportunity({ session_key: sessionKey!, id, ...data })
  },

  deleteOpportunity: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMOpportunity({ session_key: sessionKey!, id })
  },

  updateOpportunityStage: async (sessionKey: string, id: number, stage: string) => {
    return apiClient.updateCRMOpportunityStage({ session_key: sessionKey!, id, stage })
  },

  getOpportunityPipeline: async (sessionKey: string) => {
    return apiClient.getCRMOpportunityPipeline({ session_key: sessionKey })
  },

  getOpportunityForecast: async (sessionKey: string) => {
    return apiClient.getCRMOpportunityForecast({ session_key: sessionKey })
  },

  // Activities
  getActivities: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMActivities({ session_key: sessionKey!, ...params })
  },

  createActivity: async (sessionKey: string, data: any) => {
    return apiClient.createCRMActivity({ session_key: sessionKey!, ...data })
  },

  updateActivity: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMActivity({ session_key: sessionKey!, id, ...data })
  },

  deleteActivity: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMActivity({ session_key: sessionKey!, id })
  },

  completeActivity: async (sessionKey: string, id: number, outcome?: string) => {
    return apiClient.completeCRMActivity({ session_key: sessionKey!, id, outcome })
  },

  getTodayActivities: async (sessionKey: string) => {
    return apiClient.getCRMTodayActivities({ session_key: sessionKey })
  },

  getOverdueActivities: async (sessionKey: string) => {
    return apiClient.getCRMOverdueActivities({ session_key: sessionKey })
  },

  // Campaigns
  getCampaigns: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMCampaigns({ session_key: sessionKey!, ...params })
  },

  createCampaign: async (sessionKey: string, data: any) => {
    return apiClient.createCRMCampaign({ session_key: sessionKey!, ...data })
  },

  updateCampaign: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMCampaign({ session_key: sessionKey!, id, ...data })
  },

  deleteCampaign: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMCampaign({ session_key: sessionKey!, id })
  },

  getCampaignMembers: async (sessionKey: string, campaignId: number) => {
    return apiClient.getCRMCampaignMembers({ session_key: sessionKey!, campaign_id: campaignId })
  },

  addCampaignMembers: async (sessionKey: string, campaignId: number, data: { lead_ids?: number[], contact_ids?: number[] }) => {
    return apiClient.addCRMCampaignMembers({ session_key: sessionKey!, campaign_id: campaignId, ...data })
  },

  // Sales Targets
  getSalesTargets: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMSalesTargets({ session_key: sessionKey!, ...params })
  },

  createSalesTarget: async (sessionKey: string, data: any) => {
    return apiClient.createCRMSalesTarget({ session_key: sessionKey!, ...data })
  },

  updateSalesTarget: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMSalesTarget({ session_key: sessionKey!, id, ...data })
  },

  deleteSalesTarget: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMSalesTarget({ session_key: sessionKey!, id })
  },

  getCurrentPerformance: async (sessionKey: string) => {
    return apiClient.getCRMCurrentPerformance({ session_key: sessionKey })
  },

  // Customer Support APIs
  getTickets: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/tickets/', { params: { session_key: sessionKey!, ...params } })
  },

  createTicket: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/tickets/', { session_key: sessionKey!, ...data })
  },

  updateTicket: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/tickets/${id}/`, { session_key: sessionKey!, ...data })
  },

  assignTicket: async (sessionKey: string, id: number, agentId: number) => {
    return apiClient.post(`/api/crm/tickets/${id}/assign/`, { session_key: sessionKey!, agent_id: agentId })
  },

  respondToTicket: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/tickets/${id}/respond/`, { session_key: sessionKey })
  },

  resolveTicket: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/tickets/${id}/resolve/`, { session_key: sessionKey })
  },

  rateTicket: async (sessionKey: string, id: number, rating: number, comment?: string) => {
    return apiClient.post(`/api/crm/tickets/${id}/rate/`, { session_key: sessionKey!, rating, comment })
  },

  getOverdueTickets: async (sessionKey: string) => {
    return apiClient.get('/api/crm/tickets/overdue/', { params: { session_key: sessionKey } })
  },

  getSLADashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/tickets/sla_dashboard/', { params: { session_key: sessionKey } })
  },

  getTicketCategories: async (sessionKey: string) => {
    return apiClient.get('/api/crm/ticket-categories/', { params: { session_key: sessionKey } })
  },

  createTicketCategory: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/ticket-categories/', { session_key: sessionKey!, ...data })
  },

  getSLAs: async (sessionKey: string) => {
    return apiClient.get('/api/crm/sla/', { params: { session_key: sessionKey } })
  },

  createSLA: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/sla/', { session_key: sessionKey!, ...data })
  },

  getKnowledgeBase: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/knowledge-base/', { params: { session_key: sessionKey!, ...params } })
  },

  createKnowledgeArticle: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/knowledge-base/', { session_key: sessionKey!, ...data })
  },

  searchKnowledgeBase: async (sessionKey: string, query: string) => {
    return apiClient.get('/api/crm/knowledge-base/search/', { params: { session_key: sessionKey!, q: query } })
  },

  markArticleHelpful: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/knowledge-base/${id}/mark_helpful/`, { session_key: sessionKey })
  },

  // AI Lead Scoring APIs
  getLeadScores: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/lead-scores/', { params: { session_key: sessionKey!, ...params } })
  },

  calculateLeadScore: async (sessionKey: string, leadId: number) => {
    return apiClient.post('/api/crm/lead-scores/calculate_score/', { session_key: sessionKey!, lead_id: leadId })
  },

  bulkCalculateScores: async (sessionKey: string, leadIds?: number[]) => {
    return apiClient.post('/api/crm/lead-scores/bulk_calculate/', { session_key: sessionKey!, lead_ids: leadIds })
  },

  getLeadScoringAnalytics: async (sessionKey: string) => {
    return apiClient.get('/api/crm/lead-scores/analytics/', { params: { session_key: sessionKey } })
  },

  getTopScoredLeads: async (sessionKey: string, limit = 10) => {
    return apiClient.get('/api/crm/lead-scores/top_leads/', { params: { session_key: sessionKey!, limit } })
  },

  getLeadRecommendations: async (sessionKey: string) => {
    return apiClient.get('/api/crm/lead-scores/recommendations/', { params: { session_key: sessionKey } })
  },

  getLeadScoringDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/lead-scoring-dashboard/', { params: { session_key: sessionKey } })
  },

  getLeadScoringInsights: async (sessionKey: string) => {
    return apiClient.get('/api/crm/lead-scoring-dashboard/insights/', { params: { session_key: sessionKey } })
  },

  getScoringCriteria: async (sessionKey: string) => {
    return apiClient.get('/api/crm/scoring-criteria/', { params: { session_key: sessionKey } })
  },

  createScoringCriteria: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/scoring-criteria/', { session_key: sessionKey!, ...data })
  },

  // Phase 2: Advanced Sales Pipeline Management APIs
  getPipelineStages: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/pipeline-stages/', { params: { session_key: sessionKey!, ...params } })
  },

  createPipelineStage: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/pipeline-stages/', { session_key: sessionKey!, ...data })
  },

  updatePipelineStage: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/pipeline-stages/${id}/`, { session_key: sessionKey!, ...data })
  },

  deletePipelineStage: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/pipeline-stages/${id}/`)
  },

  getDeals: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/deals/', { params: { session_key: sessionKey!, ...params } })
  },

  createDeal: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/deals/', { session_key: sessionKey!, ...data })
  },

  updateDeal: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/deals/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteDeal: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/deals/${id}/`)
  },

  getPipelineOverview: async (sessionKey: string) => {
    return apiClient.get('/api/crm/deals/pipeline_overview/', { params: { session_key: sessionKey } })
  },

  moveDealStage: async (sessionKey: string, id: number, stageId: number, notes?: string) => {
    return apiClient.post(`/api/crm/deals/${id}/move_stage/`, { session_key: sessionKey!, stage_id: stageId, notes })
  },

  getVelocityMetrics: async (sessionKey: string) => {
    return apiClient.get('/api/crm/deals/velocity_metrics/', { params: { session_key: sessionKey } })
  },

  getDealStageHistory: async (sessionKey: string, dealId?: number) => {
    const params: any = { session_key: sessionKey }
    if (dealId) params.deal = dealId
    return apiClient.get('/api/crm/deal-stage-history/', { params })
  },

  getSalesQuotas: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/sales-quotas/', { params: { session_key: sessionKey!, ...params } })
  },

  createSalesQuota: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/sales-quotas/', { session_key: sessionKey!, ...data })
  },

  updateSalesQuota: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/sales-quotas/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteSalesQuota: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/sales-quotas/${id}/`)
  },

  getPerformanceDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/sales-quotas/performance_dashboard/', { params: { session_key: sessionKey } })
  },

  // Phase 2: Customer Relationship Analytics APIs
  getCustomerInteractions: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/customer-interactions/', { params: { session_key: sessionKey!, ...params } })
  },

  createCustomerInteraction: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/customer-interactions/', { session_key: sessionKey!, ...data })
  },

  updateCustomerInteraction: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/customer-interactions/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteCustomerInteraction: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/customer-interactions/${id}/`)
  },

  getInteractionTimeline: async (sessionKey: string, accountId?: number, contactId?: number) => {
    const params: any = { session_key: sessionKey }
    if (accountId) params.account_id = accountId
    if (contactId) params.contact_id = contactId
    return apiClient.get('/api/crm/customer-interactions/interaction_timeline/', { params })
  },

  getInteractionSummary: async (sessionKey: string) => {
    return apiClient.get('/api/crm/customer-interactions/interaction_summary/', { params: { session_key: sessionKey } })
  },

  getCustomerHealthScores: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/customer-health-scores/', { params: { session_key: sessionKey!, ...params } })
  },

  calculateHealthScores: async (sessionKey: string, accountIds?: number[]) => {
    return apiClient.post('/api/crm/customer-health-scores/calculate_scores/', { session_key: sessionKey!, account_ids: accountIds })
  },

  getHealthDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/customer-health-scores/health_dashboard/', { params: { session_key: sessionKey } })
  },

  getAtRiskAccounts: async (sessionKey: string) => {
    return apiClient.get('/api/crm/customer-health-scores/at_risk_accounts/', { params: { session_key: sessionKey } })
  },

  getCustomerSegments: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/customer-segments/', { params: { session_key: sessionKey!, ...params } })
  },

  createCustomerSegment: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/customer-segments/', { session_key: sessionKey!, ...data })
  },

  updateCustomerSegment: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/customer-segments/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteCustomerSegment: async (_sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/customer-segments/${id}/`)
  },

  addAccountsToSegment: async (sessionKey: string, segmentId: number, accountIds: number[]) => {
    return apiClient.post(`/api/crm/customer-segments/${segmentId}/add_accounts/`, { session_key: sessionKey!, account_ids: accountIds })
  },

  getSegmentAccounts: async (sessionKey: string, segmentId: number) => {
    return apiClient.get(`/api/crm/customer-segments/${segmentId}/accounts/`, { params: { session_key: sessionKey } })
  },

  getSalesAnalytics: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/sales-analytics/', { params: { session_key: sessionKey!, ...params } })
  },

  calculateMetrics: async (sessionKey: string, period: string, date: string) => {
    return apiClient.post('/api/crm/sales-analytics/calculate_metrics/', { session_key: sessionKey!, period, date })
  },

  getAnalyticsDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/sales-analytics/analytics_dashboard/', { params: { session_key: sessionKey } })
  },

  // Additional methods for updated pages
  calculateLeadScores: async (sessionKey: string) => {
    return apiClient.post('/api/crm/lead-scores/calculate_all/', { session_key: sessionKey })
  },

  getReports: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/reports/', { params: { session_key: sessionKey!, ...params } })
  },

  createReportTemplate: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/reports/', { session_key: sessionKey!, ...data })
  },

  updateReportTemplate: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/reports/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteReportTemplate: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/reports/${id}/`, { data: { session_key: sessionKey } })
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

  deleteDashboard: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/dashboards/${id}/`, { data: { session_key: sessionKey } })
  },

  getBusinessInsights: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/business-insights/', { params: { session_key: sessionKey!, ...params } })
  },

  generateReport: async (sessionKey: string, reportId: number) => {
    return apiClient.get(`/api/crm/reports/${reportId}/generate/`, { params: { session_key: sessionKey } })
  },

  exportReport: async (sessionKey: string, reportId: number, format: string = 'pdf') => {
    return apiClient.post(`/api/crm/reports/${reportId}/export/`, { session_key: sessionKey, format })
  },

  generateBusinessInsights: async (sessionKey: string) => {
    return apiClient.post('/api/crm/business-insights/generate_insights/', { session_key: sessionKey })
  },

  acknowledgeInsight: async (sessionKey: string, insightId: number) => {
    return apiClient.post(`/api/crm/business-insights/${insightId}/acknowledge/`, { session_key: sessionKey })
  },

  // Marketing Automation methods
  getEmailTemplates: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/email-templates/', { params: { session_key: sessionKey!, ...params } })
  },

  createEmailTemplate: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/email-templates/', { session_key: sessionKey!, ...data })
  },

  updateEmailTemplate: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/email-templates/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteEmailTemplate: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/email-templates/${id}/`, { data: { session_key: sessionKey } })
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

  deleteMarketingCampaign: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/marketing-campaigns/${id}/`, { data: { session_key: sessionKey } })
  },

  launchMarketingCampaign: async (sessionKey: string, campaignId: number) => {
    return apiClient.post(`/api/crm/marketing-campaigns/${campaignId}/launch/`, { session_key: sessionKey })
  },

  pauseMarketingCampaign: async (sessionKey: string, campaignId: number) => {
    return apiClient.post(`/api/crm/marketing-campaigns/${campaignId}/pause/`, { session_key: sessionKey })
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

  deleteAutomationWorkflow: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/automation-workflows/${id}/`, { data: { session_key: sessionKey } })
  },

  // Security & Compliance APIs
  getSecurityAlerts: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/security-alerts/', { params: { session_key: sessionKey!, ...params } })
  },

  getComplianceViolations: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/compliance-violations/', { params: { session_key: sessionKey!, ...params } })
  },

  getAuditLogs: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/audit-logs/', { params: { session_key: sessionKey!, ...params } })
  },

  getSecurityDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/security-alerts/dashboard/', { params: { session_key: sessionKey } })
  },

  resolveSecurityAlert: async (sessionKey: string, alertId: number) => {
    return apiClient.post(`/api/crm/security-alerts/${alertId}/resolve/`, { session_key: sessionKey })
  },

  resolveComplianceViolation: async (sessionKey: string, violationId: number, data?: any) => {
    return apiClient.post(`/api/crm/compliance-violations/${violationId}/resolve/`, { session_key: sessionKey, ...data })
  },

  // Integration Management APIs
  getIntegrations: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/integrations/', { params: { session_key: sessionKey!, ...params } })
  },

  getMobileDevices: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/mobile-devices/', { params: { session_key: sessionKey!, ...params } })
  },

  getIntegrationDashboard: async (sessionKey: string) => {
    return apiClient.get('/api/crm/integrations/dashboard/', { params: { session_key: sessionKey } })
  },

  testIntegrationConnection: async (sessionKey: string, integrationId: number) => {
    return apiClient.post(`/api/crm/integrations/${integrationId}/test_connection/`, { session_key: sessionKey })
  },

  syncIntegrationData: async (sessionKey: string, integrationId: number) => {
    return apiClient.post(`/api/crm/integrations/${integrationId}/sync_data/`, { session_key: sessionKey })
  },

  blockMobileDevice: async (sessionKey: string, deviceId: number) => {
    return apiClient.post(`/api/crm/mobile-devices/${deviceId}/block_device/`, { session_key: sessionKey })
  },

  // Integration CRUD operations
  createIntegration: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/integrations/', { session_key: sessionKey, ...data })
  },

  updateIntegration: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/integrations/${id}/`, { session_key: sessionKey, ...data })
  },

  deleteIntegration: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/integrations/${id}/`, { data: { session_key: sessionKey } })
  },

  // Compliance Rules APIs
  getComplianceRules: async (sessionKey: string, params?: any) => {
    return apiClient.get('/api/crm/compliance-rules/', { params: { session_key: sessionKey!, ...params } })
  },

  createComplianceRule: async (sessionKey: string, data: any) => {
    return apiClient.post('/api/crm/compliance-rules/', { session_key: sessionKey!, ...data })
  },

  updateComplianceRule: async (sessionKey: string, id: number, data: any) => {
    return apiClient.put(`/api/crm/compliance-rules/${id}/`, { session_key: sessionKey!, ...data })
  },

  deleteComplianceRule: async (sessionKey: string, id: number) => {
    return apiClient.delete(`/api/crm/compliance-rules/${id}/`, { data: { session_key: sessionKey } })
  },

  activateComplianceRule: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/compliance-rules/${id}/activate/`, { session_key: sessionKey })
  },

  deactivateComplianceRule: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/compliance-rules/${id}/deactivate/`, { session_key: sessionKey })
  },

  checkRuleViolations: async (sessionKey: string, id: number) => {
    return apiClient.post(`/api/crm/compliance-rules/${id}/check_violations/`, { session_key: sessionKey })
  },

  // Phase 3: AI Analytics APIs
  getAIInsights: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/ai_insights/', { params: { session_key: sessionKey } })
  },

  getLeadIntelligence: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/lead_intelligence/', { params: { session_key: sessionKey } })
  },

  getSalesForecast: async (sessionKey: string, periodDays = 90) => {
    return apiClient.get('/api/crm/dashboard/sales_forecast/', { params: { session_key: sessionKey, period_days: periodDays } })
  },

  getCustomerHealth: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/customer_health/', { params: { session_key: sessionKey } })
  },

  getConversationIntelligence: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/conversation_intelligence/', { params: { session_key: sessionKey } })
  },

  getPerformanceAnalytics: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/performance_analytics/', { params: { session_key: sessionKey } })
  },

  getWeeklyReport: async (sessionKey: string) => {
    return apiClient.get('/api/crm/dashboard/weekly_report/', { params: { session_key: sessionKey } })
  },



  getSmartLeadPrioritization: async (sessionKey: string) => {
    return apiClient.get('/api/crm/leads/smart_prioritization/', { params: { session_key: sessionKey } })
  },

  analyzeConversation: async (sessionKey: string, activityId: string) => {
    return apiClient.post(`/api/crm/activities/${activityId}/analyze_conversation/`, { session_key: sessionKey })
  }
}