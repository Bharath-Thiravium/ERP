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
    return apiClient.getCRMLeads({ session_key: sessionKey, ...params })
  },

  createLead: async (sessionKey: string, data: any) => {
    return apiClient.createCRMLead({ session_key: sessionKey, ...data })
  },

  updateLead: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMLead({ session_key: sessionKey, id, ...data })
  },

  deleteLead: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMLead({ session_key: sessionKey, id })
  },

  convertLeadToOpportunity: async (sessionKey: string, id: number) => {
    return apiClient.convertCRMLeadToOpportunity({ session_key: sessionKey, id })
  },

  // Contacts
  getContacts: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMContacts({ session_key: sessionKey, ...params })
  },

  createContact: async (sessionKey: string, data: any) => {
    return apiClient.createCRMContact({ session_key: sessionKey, ...data })
  },

  updateContact: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMContact({ session_key: sessionKey, id, ...data })
  },

  deleteContact: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMContact({ session_key: sessionKey, id })
  },

  // Accounts
  getAccounts: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMAccounts({ session_key: sessionKey, ...params })
  },

  createAccount: async (sessionKey: string, data: any) => {
    return apiClient.createCRMAccount({ session_key: sessionKey, ...data })
  },

  updateAccount: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMAccount({ session_key: sessionKey, id, ...data })
  },

  deleteAccount: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMAccount({ session_key: sessionKey, id })
  },

  getAccountOpportunities: async (sessionKey: string, accountId: number) => {
    return apiClient.getCRMAccountOpportunities({ session_key: sessionKey, account_id: accountId })
  },

  getAccountActivities: async (sessionKey: string, accountId: number) => {
    return apiClient.getCRMAccountActivities({ session_key: sessionKey, account_id: accountId })
  },

  // Opportunities
  getOpportunities: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMOpportunities({ session_key: sessionKey, ...params })
  },

  createOpportunity: async (sessionKey: string, data: any) => {
    return apiClient.createCRMOpportunity({ session_key: sessionKey, ...data })
  },

  updateOpportunity: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMOpportunity({ session_key: sessionKey, id, ...data })
  },

  deleteOpportunity: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMOpportunity({ session_key: sessionKey, id })
  },

  updateOpportunityStage: async (sessionKey: string, id: number, stage: string) => {
    return apiClient.updateCRMOpportunityStage({ session_key: sessionKey, id, stage })
  },

  getOpportunityPipeline: async (sessionKey: string) => {
    return apiClient.getCRMOpportunityPipeline({ session_key: sessionKey })
  },

  getOpportunityForecast: async (sessionKey: string) => {
    return apiClient.getCRMOpportunityForecast({ session_key: sessionKey })
  },

  // Activities
  getActivities: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMActivities({ session_key: sessionKey, ...params })
  },

  createActivity: async (sessionKey: string, data: any) => {
    return apiClient.createCRMActivity({ session_key: sessionKey, ...data })
  },

  updateActivity: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMActivity({ session_key: sessionKey, id, ...data })
  },

  deleteActivity: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMActivity({ session_key: sessionKey, id })
  },

  completeActivity: async (sessionKey: string, id: number, outcome?: string) => {
    return apiClient.completeCRMActivity({ session_key: sessionKey, id, outcome })
  },

  getTodayActivities: async (sessionKey: string) => {
    return apiClient.getCRMTodayActivities({ session_key: sessionKey })
  },

  getOverdueActivities: async (sessionKey: string) => {
    return apiClient.getCRMOverdueActivities({ session_key: sessionKey })
  },

  // Campaigns
  getCampaigns: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMCampaigns({ session_key: sessionKey, ...params })
  },

  createCampaign: async (sessionKey: string, data: any) => {
    return apiClient.createCRMCampaign({ session_key: sessionKey, ...data })
  },

  updateCampaign: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMCampaign({ session_key: sessionKey, id, ...data })
  },

  deleteCampaign: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMCampaign({ session_key: sessionKey, id })
  },

  getCampaignMembers: async (sessionKey: string, campaignId: number) => {
    return apiClient.getCRMCampaignMembers({ session_key: sessionKey, campaign_id: campaignId })
  },

  addCampaignMembers: async (sessionKey: string, campaignId: number, data: { lead_ids?: number[], contact_ids?: number[] }) => {
    return apiClient.addCRMCampaignMembers({ session_key: sessionKey, campaign_id: campaignId, ...data })
  },

  // Sales Targets
  getSalesTargets: async (sessionKey: string, params?: any) => {
    return apiClient.getCRMSalesTargets({ session_key: sessionKey, ...params })
  },

  createSalesTarget: async (sessionKey: string, data: any) => {
    return apiClient.createCRMSalesTarget({ session_key: sessionKey, ...data })
  },

  updateSalesTarget: async (sessionKey: string, id: number, data: any) => {
    return apiClient.updateCRMSalesTarget({ session_key: sessionKey, id, ...data })
  },

  deleteSalesTarget: async (sessionKey: string, id: number) => {
    return apiClient.deleteCRMSalesTarget({ session_key: sessionKey, id })
  },

  getCurrentPerformance: async (sessionKey: string) => {
    return apiClient.getCRMCurrentPerformance({ session_key: sessionKey })
  }
}