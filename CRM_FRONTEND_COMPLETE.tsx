// ============================================================================
// CRM FRONTEND COMPLETE IMPLEMENTATION
// ============================================================================

// ============================================================================
// frontend/src/pages/services/crm/types/index.ts
// ============================================================================

export interface Lead {
  id: number;
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  job_title?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: 'website' | 'referral' | 'social_media' | 'email_campaign' | 'cold_call' | 'trade_show' | 'advertisement' | 'other';
  estimated_value?: number;
  expected_close_date?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  last_contacted?: string;
  description?: string;
  tags: string[];
}

export interface Contact {
  id: number;
  contact_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  tags: string[];
  is_active: boolean;
  full_name?: string;
}

export interface Account {
  id: number;
  account_id: string;
  name: string;
  account_type: 'prospect' | 'customer' | 'partner' | 'vendor';
  industry: 'technology' | 'healthcare' | 'finance' | 'manufacturing' | 'retail' | 'education' | 'government' | 'other';
  website?: string;
  phone?: string;
  email?: string;
  annual_revenue?: number;
  employee_count?: number;
  billing_address?: string;
  shipping_address?: string;
  primary_contact?: number;
  primary_contact_name?: string;
  account_manager?: number;
  account_manager_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  is_active: boolean;
  opportunities_count?: number;
}

export interface Opportunity {
  id: number;
  opportunity_id: string;
  name: string;
  account: number;
  account_name?: string;
  contact?: number;
  contact_name?: string;
  stage: 'prospecting' | 'qualification' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  stage_display?: string;
  amount: number;
  probability: number;
  expected_close_date: string;
  owner: number;
  owner_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_date?: string;
  description?: string;
  next_step?: string;
  tags: string[];
  weighted_amount?: number;
}

export interface Activity {
  id: number;
  activity_id: string;
  subject: string;
  activity_type: 'call' | 'email' | 'meeting' | 'task' | 'note' | 'demo' | 'proposal';
  activity_type_display?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  status_display?: string;
  lead?: number;
  lead_name?: string;
  contact?: number;
  contact_name?: string;
  account?: number;
  account_name?: string;
  opportunity?: number;
  opportunity_name?: string;
  due_date: string;
  duration_minutes: number;
  assigned_to: number;
  assigned_to_name?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  description?: string;
  outcome?: string;
}

export interface Campaign {
  id: number;
  campaign_id: string;
  name: string;
  campaign_type: 'email' | 'social' | 'webinar' | 'event' | 'advertisement' | 'direct_mail' | 'telemarketing';
  campaign_type_display?: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';
  status_display?: string;
  start_date: string;
  end_date: string;
  budget?: number;
  target_audience?: string;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  leads_generated: number;
  opportunities_created: number;
  revenue_generated: number;
  description?: string;
  tags: string[];
  members_count?: number;
}

export interface SalesTarget {
  id: number;
  user: number;
  user_name?: string;
  period: 'monthly' | 'quarterly' | 'yearly';
  period_display?: string;
  year: number;
  month?: number;
  quarter?: number;
  target_amount: number;
  achieved_amount: number;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  achievement_percentage?: number;
}

export interface DashboardStats {
  total_leads: number;
  total_opportunities: number;
  total_accounts: number;
  total_contacts: number;
  pipeline_value: number;
  won_opportunities: number;
  activities_today: number;
  overdue_activities: number;
}

export interface LeadsByStatus {
  status: string;
  count: number;
}

export interface OpportunitiesByStage {
  stage: string;
  count: number;
  total_value: number;
}

export interface CRMFilters {
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  assigned_to?: string;
  account_type?: string;
  industry?: string;
  stage?: string;
  probability?: string;
  activity_type?: string;
  campaign_type?: string;
  period?: string;
  year?: string;
  is_active?: boolean;
}

// ============================================================================
// frontend/src/pages/services/crm/utils/api.ts
// ============================================================================

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
    return apiClient.createCRMLead(data)
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

// ============================================================================
// frontend/src/pages/services/crm/hooks/useCRM.ts
// ============================================================================

import { useState, useEffect } from 'react'
import { crmApi } from '../utils/api'
import { Lead, Contact, Account, Opportunity, Activity, Campaign, SalesTarget, DashboardStats } from '../types'

export const useCRM = (sessionKey: string) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  
  // Data states
  const [leads, setLeads] = useState<Lead[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>([])

  const handleError = (error: any) => {
    console.error('CRM API Error:', error)
    setError(error.message || 'An error occurred')
  }

  // Dashboard methods
  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await crmApi.getDashboardStats(sessionKey)
      setDashboardStats(response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Lead methods
  const fetchLeads = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getLeads(sessionKey, params)
      setLeads(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createLead = async (data: Partial<Lead>) => {
    try {
      setLoading(true)
      const response = await crmApi.createLead(sessionKey, data)
      setLeads(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateLead = async (id: number, data: Partial<Lead>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateLead(sessionKey, id, data)
      setLeads(prev => prev.map(lead => lead.id === id ? response.data : lead))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteLead = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteLead(sessionKey, id)
      setLeads(prev => prev.filter(lead => lead.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const convertLeadToOpportunity = async (id: number) => {
    try {
      setLoading(true)
      const response = await crmApi.convertLeadToOpportunity(sessionKey, id)
      // Update lead status
      setLeads(prev => prev.map(lead => 
        lead.id === id ? { ...lead, status: 'won' as const } : lead
      ))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Contact methods
  const fetchContacts = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getContacts(sessionKey, params)
      setContacts(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createContact = async (data: Partial<Contact>) => {
    try {
      setLoading(true)
      const response = await crmApi.createContact(sessionKey, data)
      setContacts(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateContact = async (id: number, data: Partial<Contact>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateContact(sessionKey, id, data)
      setContacts(prev => prev.map(contact => contact.id === id ? response.data : contact))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteContact = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteContact(sessionKey, id)
      setContacts(prev => prev.filter(contact => contact.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Account methods
  const fetchAccounts = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getAccounts(sessionKey, params)
      setAccounts(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async (data: Partial<Account>) => {
    try {
      setLoading(true)
      const response = await crmApi.createAccount(sessionKey, data)
      setAccounts(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateAccount = async (id: number, data: Partial<Account>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateAccount(sessionKey, id, data)
      setAccounts(prev => prev.map(account => account.id === id ? response.data : account))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteAccount = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteAccount(sessionKey, id)
      setAccounts(prev => prev.filter(account => account.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Opportunity methods
  const fetchOpportunities = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getOpportunities(sessionKey, params)
      setOpportunities(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createOpportunity = async (data: Partial<Opportunity>) => {
    try {
      setLoading(true)
      const response = await crmApi.createOpportunity(sessionKey, data)
      setOpportunities(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateOpportunity = async (id: number, data: Partial<Opportunity>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateOpportunity(sessionKey, id, data)
      setOpportunities(prev => prev.map(opp => opp.id === id ? response.data : opp))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteOpportunity = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteOpportunity(sessionKey, id)
      setOpportunities(prev => prev.filter(opp => opp.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateOpportunityStage = async (id: number, stage: string) => {
    try {
      setLoading(true)
      const response = await crmApi.updateOpportunityStage(sessionKey, id, stage)
      setOpportunities(prev => prev.map(opp => opp.id === id ? response.data : opp))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Activity methods
  const fetchActivities = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getActivities(sessionKey, params)
      setActivities(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createActivity = async (data: Partial<Activity>) => {
    try {
      setLoading(true)
      const response = await crmApi.createActivity(sessionKey, data)
      setActivities(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateActivity = async (id: number, data: Partial<Activity>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateActivity(sessionKey, id, data)
      setActivities(prev => prev.map(activity => activity.id === id ? response.data : activity))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteActivity = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteActivity(sessionKey, id)
      setActivities(prev => prev.filter(activity => activity.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const completeActivity = async (id: number, outcome?: string) => {
    try {
      setLoading(true)
      const response = await crmApi.completeActivity(sessionKey, id, outcome)
      setActivities(prev => prev.map(activity => activity.id === id ? response.data : activity))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Campaign methods
  const fetchCampaigns = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getCampaigns(sessionKey, params)
      setCampaigns(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async (data: Partial<Campaign>) => {
    try {
      setLoading(true)
      const response = await crmApi.createCampaign(sessionKey, data)
      setCampaigns(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateCampaign = async (id: number, data: Partial<Campaign>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateCampaign(sessionKey, id, data)
      setCampaigns(prev => prev.map(campaign => campaign.id === id ? response.data : campaign))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteCampaign = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteCampaign(sessionKey, id)
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Sales Target methods
  const fetchSalesTargets = async (params?: any) => {
    try {
      setLoading(true)
      const response = await crmApi.getSalesTargets(sessionKey, params)
      setSalesTargets(response.data.results || response.data)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  const createSalesTarget = async (data: Partial<SalesTarget>) => {
    try {
      setLoading(true)
      const response = await crmApi.createSalesTarget(sessionKey, data)
      setSalesTargets(prev => [response.data, ...prev])
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const updateSalesTarget = async (id: number, data: Partial<SalesTarget>) => {
    try {
      setLoading(true)
      const response = await crmApi.updateSalesTarget(sessionKey, id, data)
      setSalesTargets(prev => prev.map(target => target.id === id ? response.data : target))
      return response.data
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const deleteSalesTarget = async (id: number) => {
    try {
      setLoading(true)
      await crmApi.deleteSalesTarget(sessionKey, id)
      setSalesTargets(prev => prev.filter(target => target.id !== id))
    } catch (error) {
      handleError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    // State
    loading,
    error,
    dashboardStats,
    leads,
    contacts,
    accounts,
    opportunities,
    activities,
    campaigns,
    salesTargets,

    // Dashboard methods
    fetchDashboardStats,

    // Lead methods
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    convertLeadToOpportunity,

    // Contact methods
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,

    // Account methods
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,

    // Opportunity methods
    fetchOpportunities,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
    updateOpportunityStage,

    // Activity methods
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    completeActivity,

    // Campaign methods
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,

    // Sales Target methods
    fetchSalesTargets,
    createSalesTarget,
    updateSalesTarget,
    deleteSalesTarget,

    // Utility methods
    setError
  }
}

// ============================================================================
// frontend/src/pages/services/crm/components/CRMDashboard.tsx
// ============================================================================

import React, { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { Button } from '../../../../components/ui/button'
import { 
  Users, 
  Target, 
  Building, 
  Phone, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertTriangle 
} from 'lucide-react'
import { useCRM } from '../hooks/useCRM'
import { DashboardStats } from '../types'

interface CRMDashboardProps {
  sessionKey: string
}

export const CRMDashboard: React.FC<CRMDashboardProps> = ({ sessionKey }) => {
  const { dashboardStats, fetchDashboardStats, loading } = useCRM(sessionKey)

  useEffect(() => {
    fetchDashboardStats()
  }, [sessionKey])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!dashboardStats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    )
  }

  const stats = [
    {
      title: 'Total Leads',
      value: dashboardStats.total_leads,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Opportunities',
      value: dashboardStats.total_opportunities,
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Accounts',
      value: dashboardStats.total_accounts,
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Contacts',
      value: dashboardStats.total_contacts,
      icon: Phone,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    },
    {
      title: 'Pipeline Value',
      value: `$${dashboardStats.pipeline_value.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Won Opportunities',
      value: dashboardStats.won_opportunities,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      title: 'Today\'s Activities',
      value: dashboardStats.activities_today,
      icon: Calendar,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100'
    },
    {
      title: 'Overdue Activities',
      value: dashboardStats.overdue_activities,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">CRM Dashboard</h2>
        <Button onClick={fetchDashboardStats} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {dashboardStats.overdue_activities > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700">
              You have {dashboardStats.overdue_activities} overdue activities that need attention.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================================================
// frontend/src/pages/services/crm/components/CRMNavigation.tsx
// ============================================================================

import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  Phone, 
  Building, 
  Target, 
  Calendar, 
  Megaphone,
  TrendingUp
} from 'lucide-react'

interface CRMNavigationProps {
  basePath: string
}

export const CRMNavigation: React.FC<CRMNavigationProps> = ({ basePath }) => {
  const navItems = [
    {
      name: 'Overview',
      path: '',
      icon: LayoutDashboard
    },
    {
      name: 'Leads',
      path: '/leads',
      icon: Users
    },
    {
      name: 'Contacts',
      path: '/contacts',
      icon: Phone
    },
    {
      name: 'Accounts',
      path: '/accounts',
      icon: Building
    },
    {
      name: 'Opportunities',
      path: '/opportunities',
      icon: Target
    },
    {
      name: 'Activities',
      path: '/activities',
      icon: Calendar
    },
    {
      name: 'Campaigns',
      path: '/campaigns',
      icon: Megaphone
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: TrendingUp
    }
  ]

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.name}
            to={`${basePath}${item.path}`}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        )
      })}
    </nav>
  )
}

// ============================================================================
// frontend/src/pages/services/crm/components/LeadModal.tsx
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/ui/dialog'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Label } from '../../../../components/ui/label'
import { Textarea } from '../../../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select'
import { Lead } from '../types'

interface LeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Partial<Lead>) => Promise<void>
  lead?: Lead | null
  loading?: boolean
}

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  lead,
  loading = false
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    status: 'new',
    priority: 'medium',
    source: 'website',
    estimated_value: undefined,
    expected_close_date: '',
    description: ''
  })

  useEffect(() => {
    if (lead) {
      setFormData({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone || '',
        company_name: lead.company_name || '',
        job_title: lead.job_title || '',
        status: lead.status,
        priority: lead.priority,
        source: lead.source,
        estimated_value: lead.estimated_value,
        expected_close_date: lead.expected_close_date || '',
        description: lead.description || ''
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company_name: '',
        job_title: '',
        status: 'new',
        priority: 'medium',
        source: 'website',
        estimated_value: undefined,
        expected_close_date: '',
        description: ''
      })
    }
  }, [lead, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving lead:', error)
    }
  }

  const handleChange = (field: keyof Lead, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{lead ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleChange('job_title', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={formData.source} onValueChange={(value) => handleChange('source', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="email_campaign">Email Campaign</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="trade_show">Trade Show</SelectItem>
                  <SelectItem value="advertisement">Advertisement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="estimated_value">Estimated Value</Label>
              <Input
                id="estimated_value"
                type="number"
                step="0.01"
                value={formData.estimated_value || ''}
                onChange={(e) => handleChange('estimated_value', e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => handleChange('expected_close_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// frontend/src/pages/services/crm/pages/LeadsPage.tsx
// ============================================================================

import React, { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/button'
import { Input } from '../../../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import { Badge } from '../../../../components/ui/badge'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Target,
  Phone,
  Mail
} from 'lucide-react'
import { useCRM } from '../hooks/useCRM'
import { LeadModal } from '../components/LeadModal'
import { Lead } from '../types'

interface LeadsPageProps {
  sessionKey: string
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ sessionKey }) => {
  const {
    leads,
    loading,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    convertLeadToOpportunity
  } = useCRM(sessionKey)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchLeads()
  }, [sessionKey])

  const handleCreateLead = () => {
    setSelectedLead(null)
    setIsModalOpen(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setIsModalOpen(true)
  }

  const handleSaveLead = async (data: Partial<Lead>) => {
    if (selectedLead) {
      await updateLead(selectedLead.id, data)
    } else {
      await createLead(data)
    }
  }

  const handleDeleteLead = async (id: number) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await deleteLead(id)
    }
  }

  const handleConvertLead = async (id: number) => {
    if (confirm('Convert this lead to an opportunity?')) {
      try {
        await convertLeadToOpportunity(id)
        alert('Lead converted successfully!')
      } catch (error) {
        alert('Failed to convert lead')
      }
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = searchTerm === '' || 
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.company_name && lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === '' || lead.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
        <Button onClick={handleCreateLead} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <Card key={lead.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {lead.first_name} {lead.last_name}
                  </CardTitle>
                  {lead.company_name && (
                    <p className="text-sm text-gray-600 mt-1">{lead.company_name}</p>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{lead.phone}</span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Badge className={getPriorityColor(lead.priority)}>
                  {lead.priority}
                </Badge>
                {lead.estimated_value && (
                  <span className="text-sm font-medium text-green-600">
                    ${lead.estimated_value.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditLead(lead)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConvertLead(lead.id)}
                    disabled={lead.status === 'won' || lead.status === 'lost'}
                  >
                    <Target className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteLead(lead.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first lead.
          </p>
          <div className="mt-6">
            <Button onClick={handleCreateLead} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </div>
        </div>
      )}

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveLead}
        lead={selectedLead}
        loading={loading}
      />
    </div>
  )
}

// ============================================================================
// frontend/src/pages/services/crm/index.tsx
// ============================================================================

import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useServiceUserStore } from '../../../store/serviceUserStore'
import { CRMNavigation } from './components/CRMNavigation'
import { CRMDashboard } from './components/CRMDashboard'
import { LeadsPage } from './pages/LeadsPage'
import { ContactsPage } from './pages/ContactsPage'
import { AccountsPage } from './pages/AccountsPage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { ActivitiesPage } from './pages/ActivitiesPage'
import { CampaignsPage } from './pages/CampaignsPage'

const CRMService: React.FC = () => {
  const { sessionKey } = useServiceUserStore()

  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please log in to access CRM service</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">CRM Management</h1>
          <p className="text-sm text-gray-600 mt-1">ExampleTech Solutions</p>
        </div>
        <div className="px-4 pb-6">
          <CRMNavigation basePath="/services/crm" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <Routes>
            <Route path="/" element={<CRMDashboard sessionKey={sessionKey} />} />
            <Route path="/leads" element={<LeadsPage sessionKey={sessionKey} />} />
            <Route path="/contacts" element={<ContactsPage sessionKey={sessionKey} />} />
            <Route path="/accounts" element={<AccountsPage sessionKey={sessionKey} />} />
            <Route path="/opportunities" element={<OpportunitiesPage sessionKey={sessionKey} />} />
            <Route path="/activities" element={<ActivitiesPage sessionKey={sessionKey} />} />
            <Route path="/campaigns" element={<CampaignsPage sessionKey={sessionKey} />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default CRMService