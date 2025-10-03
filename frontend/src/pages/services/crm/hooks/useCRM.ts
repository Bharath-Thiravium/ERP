import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { crmApi } from '../utils/api';

// Leads Hooks
export const useLeads = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-leads', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getLeads(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateLead = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createLead(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateLead = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateLead(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useDeleteLead = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteLead(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useConvertLead = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.convertLeadToOpportunity(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

// Contacts Hooks
export const useContacts = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-contacts', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getContacts(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateContact = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createContact(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateContact = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateContact(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
    },
  });
};

export const useDeleteContact = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteContact(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

// Accounts Hooks
export const useAccounts = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-accounts', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getAccounts(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateAccount = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createAccount(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateAccount = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateAccount(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteAccount(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

// Opportunities Hooks
export const useOpportunities = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-opportunities', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getOpportunities(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateOpportunity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createOpportunity(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateOpportunity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateOpportunity(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useDeleteOpportunity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteOpportunity(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: number; stage: string }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateOpportunityStage(sessionKey!, id, stage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

// Activities Hooks
export const useActivities = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-activities', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getActivities(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateActivity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createActivity(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useUpdateActivity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateActivity(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
    },
  });
};

export const useDeleteActivity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteActivity(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

export const useCompleteActivity = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, outcome }: { id: number; outcome?: string }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.completeActivity(sessionKey!, id, outcome);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-dashboard-stats'] });
    },
  });
};

// Campaigns Hooks
export const useCampaigns = (filters?: any) => {
  const { sessionKey } = useServiceUserStore();
  return useQuery({
    queryKey: ['crm-campaigns', sessionKey!, filters],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getCampaigns(sessionKey!, filters);
      return response.data;
    },
    enabled: !!sessionKey!,
  });
};

export const useCreateCampaign = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.createCampaign(sessionKey!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
    },
  });
};

export const useUpdateCampaign = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.updateCampaign(sessionKey!, id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
    },
  });
};

export const useDeleteCampaign = () => {
  const { sessionKey } = useServiceUserStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!sessionKey!) throw new Error('No session key');
      return crmApi.deleteCampaign(sessionKey!, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-campaigns'] });
    },
  });
};

// Dashboard Stats Hook
export const useDashboardStats = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-dashboard-stats', sessionKey],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getDashboardStats(sessionKey!);
      return response.data;
    },
    enabled: !!sessionKey!,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Recent Activities Hook
export const useRecentActivities = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-recent-activities', sessionKey],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getRecentActivities(sessionKey!);
      return response.data;
    },
    enabled: !!sessionKey!,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Sales Funnel Hook
export const useSalesFunnel = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-sales-funnel', sessionKey],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getSalesFunnel(sessionKey!);
      return response.data;
    },
    enabled: !!sessionKey!,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Pipeline Hook
export const usePipeline = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-pipeline', sessionKey],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getOpportunityPipeline(sessionKey!);
      return response.data;
    },
    enabled: !!sessionKey!,
    staleTime: 5 * 60 * 1000,
  });
};

// Forecast Hook
export const useForecast = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-forecast', sessionKey],
    queryFn: async () => {
      if (!sessionKey!) throw new Error('No session key');
      const response = await crmApi.getOpportunityForecast(sessionKey!);
      return response.data;
    },
    enabled: !!sessionKey!,
    staleTime: 10 * 60 * 1000,
  });
};