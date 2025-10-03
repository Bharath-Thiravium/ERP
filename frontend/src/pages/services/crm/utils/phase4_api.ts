// Phase 4: Integration & Mobile Optimization + Advanced Security & Compliance API
import api from '../../../../lib/api';

// Integration Management API
export const integrationAPI = {
  // Third-Party Integrations
  getIntegrations: () => api.get('/crm/integrations/'),
  createIntegration: (data: any) => api.post('/crm/integrations/', data),
  updateIntegration: (id: number, data: any) => api.put(`/crm/integrations/${id}/`, data),
  deleteIntegration: (id: number) => api.delete(`/crm/integrations/${id}/`),
  testConnection: (id: number) => api.post(`/crm/integrations/${id}/test_connection/`),
  syncData: (id: number) => api.post(`/crm/integrations/${id}/sync_data/`),
  getIntegrationDashboard: () => api.get('/crm/integrations/dashboard/'),

  // Integration Logs
  getIntegrationLogs: () => api.get('/crm/integration-logs/'),

  // Mobile Devices
  getMobileDevices: () => api.get('/crm/mobile-devices/'),
  registerDevice: (data: any) => api.post('/crm/mobile-devices/', data),
  updateDevice: (id: number, data: any) => api.put(`/crm/mobile-devices/${id}/`, data),
  blockDevice: (id: number) => api.post(`/crm/mobile-devices/${id}/block_device/`),
  unblockDevice: (id: number) => api.post(`/crm/mobile-devices/${id}/unblock_device/`),
  getMobileDeviceDashboard: () => api.get('/crm/mobile-devices/dashboard/'),

  // Mobile Sync
  getMobileSyncs: () => api.get('/crm/mobile-sync/'),
  triggerSync: () => api.post('/crm/mobile-sync/trigger_sync/'),
  getMobileSyncDashboard: () => api.get('/crm/mobile-sync/dashboard/'),
};

// Security & Compliance API
export const securityAPI = {
  // Audit Logs
  getAuditLogs: () => api.get('/crm/audit-logs/'),
  getAuditDashboard: () => api.get('/crm/audit-logs/dashboard/'),

  // Compliance Rules
  getComplianceRules: () => api.get('/crm/compliance-rules/'),
  createComplianceRule: (data: any) => api.post('/crm/compliance-rules/', data),
  updateComplianceRule: (id: number, data: any) => api.put(`/crm/compliance-rules/${id}/`, data),
  deleteComplianceRule: (id: number) => api.delete(`/crm/compliance-rules/${id}/`),
  activateRule: (id: number) => api.post(`/crm/compliance-rules/${id}/activate/`),
  deactivateRule: (id: number) => api.post(`/crm/compliance-rules/${id}/deactivate/`),
  checkViolations: (id: number) => api.post(`/crm/compliance-rules/${id}/check_violations/`),

  // Compliance Violations
  getComplianceViolations: () => api.get('/crm/compliance-violations/'),
  resolveComplianceViolation: (id: number, data: any) => api.post(`/crm/compliance-violations/${id}/resolve/`, data),
  markFalsePositive: (id: number, data: any) => api.post(`/crm/compliance-violations/${id}/mark_false_positive/`, data),
  getViolationsDashboard: () => api.get('/crm/compliance-violations/dashboard/'),

  // Data Retention Policies
  getRetentionPolicies: () => api.get('/crm/retention-policies/'),
  createRetentionPolicy: (data: any) => api.post('/crm/retention-policies/', data),
  updateRetentionPolicy: (id: number, data: any) => api.put(`/crm/retention-policies/${id}/`, data),
  deleteRetentionPolicy: (id: number) => api.delete(`/crm/retention-policies/${id}/`),
  executePolicy: (id: number) => api.post(`/crm/retention-policies/${id}/execute_policy/`),
  getRetentionDashboard: () => api.get('/crm/retention-policies/dashboard/'),

  // Security Alerts
  getSecurityAlerts: () => api.get('/crm/security-alerts/'),
  createSecurityAlert: (data: any) => api.post('/crm/security-alerts/', data),
  assignSecurityAlert: (id: number, data: any) => api.post(`/crm/security-alerts/${id}/assign/`, data),
  resolveSecurityAlert: (id: number, data: any) => api.post(`/crm/security-alerts/${id}/resolve/`, data),
  getSecurityDashboard: () => api.get('/crm/security-alerts/dashboard/'),

  // API Usage Logs
  getAPIUsageLogs: () => api.get('/crm/api-usage-logs/'),
  getAPIUsageDashboard: () => api.get('/crm/api-usage-logs/dashboard/'),
};

// Phase 4 Combined Dashboard API
export const phase4API = {
  getDashboard: async () => {
    try {
      const [integrationDash, securityDash, auditDash, apiUsageDash] = await Promise.all([
        integrationAPI.getIntegrationDashboard(),
        securityAPI.getSecurityDashboard(),
        securityAPI.getAuditDashboard(),
        securityAPI.getAPIUsageDashboard()
      ]);

      return {
        integration: integrationDash.data,
        security: securityDash.data,
        audit: auditDash.data,
        apiUsage: apiUsageDash.data
      };
    } catch (error) {
      console.error('Error fetching Phase 4 dashboard data:', error);
      throw error;
    }
  },

  getSystemHealth: async () => {
    try {
      const dashboard = await phase4API.getDashboard();
      
      // Calculate system health score based on various metrics
      const healthScore = {
        integration: {
          score: dashboard.integration.active_integrations / Math.max(dashboard.integration.total_integrations, 1) * 100,
          status: dashboard.integration.error_integrations === 0 ? 'healthy' : 'warning'
        },
        security: {
          score: dashboard.security.critical_alerts === 0 ? 100 : Math.max(0, 100 - dashboard.security.critical_alerts * 10),
          status: dashboard.security.critical_alerts === 0 ? 'healthy' : 'critical'
        },
        compliance: {
          score: dashboard.security.open_violations === 0 ? 100 : Math.max(0, 100 - dashboard.security.open_violations * 5),
          status: dashboard.security.open_violations === 0 ? 'healthy' : 'warning'
        },
        overall: 0
      };

      // Calculate overall health score
      healthScore.overall = (healthScore.integration.score + healthScore.security.score + healthScore.compliance.score) / 3;

      return healthScore;
    } catch (error) {
      console.error('Error calculating system health:', error);
      throw error;
    }
  }
};