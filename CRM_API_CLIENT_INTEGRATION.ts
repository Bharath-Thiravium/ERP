// ============================================================================
// CRM API CLIENT INTEGRATION
// ============================================================================

// ============================================================================
// frontend/src/lib/api.ts - CRM API Methods Integration
// ============================================================================

// Add these methods to the existing apiClient object in frontend/src/lib/api.ts

export const crmApiMethods = {
  // Dashboard APIs
  getCRMDashboardStats: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/dashboard/', { params })
  },

  getCRMRecentActivities: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/dashboard/recent_activities/', { params })
  },

  getCRMSalesFunnel: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/dashboard/sales_funnel/', { params })
  },

  // Lead APIs
  getCRMLeads: async (params: any) => {
    return apiClient.get('/api/crm/leads/', { params })
  },

  createCRMLead: async (data: any) => {
    return apiClient.post('/api/crm/leads/', data)
  },

  getCRMLead: async (params: { session_key: string; id: number }) => {
    const { session_key, id, ...otherParams } = params
    return apiClient.get(`/api/crm/leads/${id}/`, { 
      params: { session_key, ...otherParams } 
    })
  },

  updateCRMLead: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/leads/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMLead: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/leads/${id}/`, {
      params: { session_key }
    })
  },

  convertCRMLeadToOpportunity: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.post(`/api/crm/leads/${id}/convert_to_opportunity/`, {}, {
      params: { session_key }
    })
  },

  getCRMLeadsByStatus: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/leads/by_status/', { params })
  },

  // Contact APIs
  getCRMContacts: async (params: any) => {
    return apiClient.get('/api/crm/contacts/', { params })
  },

  createCRMContact: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/contacts/', data, {
      params: { session_key }
    })
  },

  getCRMContact: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/contacts/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMContact: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/contacts/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMContact: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/contacts/${id}/`, {
      params: { session_key }
    })
  },

  // Account APIs
  getCRMAccounts: async (params: any) => {
    return apiClient.get('/api/crm/accounts/', { params })
  },

  createCRMAccount: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/accounts/', data, {
      params: { session_key }
    })
  },

  getCRMAccount: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/accounts/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMAccount: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/accounts/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMAccount: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/accounts/${id}/`, {
      params: { session_key }
    })
  },

  getCRMAccountOpportunities: async (params: { session_key: string; account_id: number }) => {
    const { session_key, account_id } = params
    return apiClient.get(`/api/crm/accounts/${account_id}/opportunities/`, {
      params: { session_key }
    })
  },

  getCRMAccountActivities: async (params: { session_key: string; account_id: number }) => {
    const { session_key, account_id } = params
    return apiClient.get(`/api/crm/accounts/${account_id}/activities/`, {
      params: { session_key }
    })
  },

  // Opportunity APIs
  getCRMOpportunities: async (params: any) => {
    return apiClient.get('/api/crm/opportunities/', { params })
  },

  createCRMOpportunity: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/opportunities/', data, {
      params: { session_key }
    })
  },

  getCRMOpportunity: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/opportunities/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMOpportunity: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/opportunities/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMOpportunity: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/opportunities/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMOpportunityStage: async (params: { session_key: string; id: number; stage: string }) => {
    const { session_key, id, stage } = params
    return apiClient.post(`/api/crm/opportunities/${id}/update_stage/`, { stage }, {
      params: { session_key }
    })
  },

  getCRMOpportunityPipeline: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/opportunities/pipeline/', { params })
  },

  getCRMOpportunityForecast: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/opportunities/forecast/', { params })
  },

  // Activity APIs
  getCRMActivities: async (params: any) => {
    return apiClient.get('/api/crm/activities/', { params })
  },

  createCRMActivity: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/activities/', data, {
      params: { session_key }
    })
  },

  getCRMActivity: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/activities/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMActivity: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/activities/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMActivity: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/activities/${id}/`, {
      params: { session_key }
    })
  },

  completeCRMActivity: async (params: { session_key: string; id: number; outcome?: string }) => {
    const { session_key, id, outcome } = params
    return apiClient.post(`/api/crm/activities/${id}/complete/`, { outcome }, {
      params: { session_key }
    })
  },

  getCRMTodayActivities: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/activities/today/', { params })
  },

  getCRMOverdueActivities: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/activities/overdue/', { params })
  },

  // Campaign APIs
  getCRMCampaigns: async (params: any) => {
    return apiClient.get('/api/crm/campaigns/', { params })
  },

  createCRMCampaign: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/campaigns/', data, {
      params: { session_key }
    })
  },

  getCRMCampaign: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/campaigns/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMCampaign: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/campaigns/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMCampaign: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/campaigns/${id}/`, {
      params: { session_key }
    })
  },

  getCRMCampaignMembers: async (params: { session_key: string; campaign_id: number }) => {
    const { session_key, campaign_id } = params
    return apiClient.get(`/api/crm/campaigns/${campaign_id}/members/`, {
      params: { session_key }
    })
  },

  addCRMCampaignMembers: async (params: { 
    session_key: string; 
    campaign_id: number; 
    lead_ids?: number[]; 
    contact_ids?: number[] 
  }) => {
    const { session_key, campaign_id, lead_ids, contact_ids } = params
    return apiClient.post(`/api/crm/campaigns/${campaign_id}/add_members/`, {
      lead_ids,
      contact_ids
    }, {
      params: { session_key }
    })
  },

  // Sales Target APIs
  getCRMSalesTargets: async (params: any) => {
    return apiClient.get('/api/crm/sales-targets/', { params })
  },

  createCRMSalesTarget: async (params: { session_key: string; [key: string]: any }) => {
    const { session_key, ...data } = params
    return apiClient.post('/api/crm/sales-targets/', data, {
      params: { session_key }
    })
  },

  getCRMSalesTarget: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.get(`/api/crm/sales-targets/${id}/`, {
      params: { session_key }
    })
  },

  updateCRMSalesTarget: async (params: { session_key: string; id: number; [key: string]: any }) => {
    const { session_key, id, ...data } = params
    return apiClient.put(`/api/crm/sales-targets/${id}/`, data, {
      params: { session_key }
    })
  },

  deleteCRMSalesTarget: async (params: { session_key: string; id: number }) => {
    const { session_key, id } = params
    return apiClient.delete(`/api/crm/sales-targets/${id}/`, {
      params: { session_key }
    })
  },

  getCRMCurrentPerformance: async (params: { session_key: string }) => {
    return apiClient.get('/api/crm/sales-targets/current_performance/', { params })
  }
}

// ============================================================================
// Integration Instructions
// ============================================================================

/*
To integrate these CRM API methods into your existing apiClient:

1. Open frontend/src/lib/api.ts
2. Add the crmApiMethods to your existing apiClient object:

export const apiClient = {
  // ... existing methods ...
  
  // CRM API Methods
  ...crmApiMethods,
  
  // ... other service methods ...
}

3. Make sure your axios interceptor is properly configured to handle session_key:

// Request interceptor to add session_key to headers
apiClient.interceptors.request.use(
  (config) => {
    const sessionKey = getSessionKey() // Your session key getter
    if (sessionKey) {
      config.headers.Authorization = `Bearer ${sessionKey}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

4. Error handling interceptor:

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      // Redirect to login or refresh session
    }
    return Promise.reject(error)
  }
)
*/

// ============================================================================
// Backend URL Configuration
// ============================================================================

/*
Make sure your backend URLs are properly configured in backend/sap_backend/urls.py:

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/crm/', include('crm.urls')),  # Add this line
    # ... other URL patterns
]
*/

// ============================================================================
// Environment Configuration
// ============================================================================

/*
Frontend environment configuration (.env):

VITE_API_BASE_URL=http://localhost:8000
VITE_CRM_SERVICE_ENABLED=true

Backend environment configuration (.env):

# CRM Service Configuration
CRM_ENABLED=True
CRM_EMAIL_INTEGRATION=True
CRM_CALENDAR_INTEGRATION=True
CRM_NOTIFICATION_ENABLED=True

# Email Configuration for CRM
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
*/

// ============================================================================
// Database Migration Commands
// ============================================================================

/*
Run these commands to set up the CRM database:

# Create migrations
python manage.py makemigrations crm

# Apply migrations
python manage.py migrate crm

# Create superuser (if needed)
python manage.py createsuperuser

# Collect static files (for production)
python manage.py collectstatic --noinput
*/

// ============================================================================
// Testing the CRM API
// ============================================================================

/*
You can test the CRM API endpoints using curl or Postman:

# Get dashboard stats
curl -X GET "http://localhost:8000/api/crm/dashboard/" \
  -H "Authorization: Bearer YOUR_SESSION_KEY"

# Create a lead
curl -X POST "http://localhost:8000/api/crm/leads/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_KEY" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john.doe@example.com",
    "company_name": "Example Corp",
    "status": "new",
    "priority": "medium",
    "source": "website"
  }'

# Get all leads
curl -X GET "http://localhost:8000/api/crm/leads/" \
  -H "Authorization: Bearer YOUR_SESSION_KEY"

# Update a lead
curl -X PUT "http://localhost:8000/api/crm/leads/1/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_KEY" \
  -d '{
    "status": "contacted",
    "priority": "high"
  }'

# Convert lead to opportunity
curl -X POST "http://localhost:8000/api/crm/leads/1/convert_to_opportunity/" \
  -H "Authorization: Bearer YOUR_SESSION_KEY"
*/