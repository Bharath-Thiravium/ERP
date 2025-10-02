import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { crmApi } from '../utils/api';

export const useLeads = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => leadsApi.getAll(filters),
  });
};

export const useLead = (id: number) => {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => leadsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useConvertLead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.convertToOpportunity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useContacts = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['contacts', filters],
    queryFn: () => contactsApi.getAll(filters),
  });
};

export const useContact = (id: number) => {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => contactsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contactsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useAccounts = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['accounts', filters],
    queryFn: () => accountsApi.getAll(filters),
  });
};

export const useAccount = (id: number) => {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => accountsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useOpportunities = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => opportunitiesApi.getAll(filters),
  });
};

export const useOpportunity = (id: number) => {
  return useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => opportunitiesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: opportunitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => opportunitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: opportunitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateOpportunityStage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => opportunitiesApi.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useActivities = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['activities', filters],
    queryFn: () => activitiesApi.getAll(filters),
  });
};

export const useActivity = (id: number) => {
  return useQuery({
    queryKey: ['activity', id],
    queryFn: () => activitiesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activitiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => activitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: activitiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCompleteActivity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, outcome }: { id: number; outcome?: string }) => activitiesApi.complete(id, outcome),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useCampaigns = (filters?: CRMFilters) => {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => campaignsApi.getAll(filters),
  });
};

export const useCampaign = (id: number) => {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campaignsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

export const useUpdateCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => campaignsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

export const useDeleteCampaign = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: campaignsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};

// Dashboard Stats Hook
export const useDashboardStats = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-dashboard-stats', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('No session key');
      const response = await crmApi.getDashboardStats(sessionKey);
      return response.data;
    },
    enabled: !!sessionKey,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Recent Activities Hook
export const useRecentActivities = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-recent-activities', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('No session key');
      const response = await crmApi.getRecentActivities(sessionKey);
      return response.data;
    },
    enabled: !!sessionKey,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Sales Funnel Hook
export const useSalesFunnel = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-sales-funnel', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('No session key');
      const response = await crmApi.getSalesFunnel(sessionKey);
      return response.data;
    },
    enabled: !!sessionKey,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Pipeline Hook
export const usePipeline = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-pipeline', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('No session key');
      const response = await crmApi.getOpportunityPipeline(sessionKey);
      return response.data;
    },
    enabled: !!sessionKey,
    staleTime: 5 * 60 * 1000,
  });
};

// Forecast Hook
export const useForecast = () => {
  const { sessionKey } = useServiceUserStore();
  
  return useQuery({
    queryKey: ['crm-forecast', sessionKey],
    queryFn: async () => {
      if (!sessionKey) throw new Error('No session key');
      const response = await crmApi.getOpportunityForecast(sessionKey);
      return response.data;
    },
    enabled: !!sessionKey,
    staleTime: 10 * 60 * 1000,
  });
};