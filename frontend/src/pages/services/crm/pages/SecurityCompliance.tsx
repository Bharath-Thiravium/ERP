import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  FileText, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  Search
} from 'lucide-react';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { crmApi } from '../utils/api';
import { ComplianceRuleModal } from '../components/ComplianceRuleModal';
import toast from 'react-hot-toast';

interface SecurityAlert {
  id: number;
  title: string;
  alert_type: string;
  severity: string;
  status: string;
  created_at: string;
  assigned_to_name?: string;
}

interface ComplianceViolation {
  id: number;
  title: string;
  rule_name: string;
  severity: string;
  status: string;
  detected_at: string;
}

interface ComplianceRule {
  id: number;
  name: string;
  rule_type: string;
  description: string;
  status: string;
  created_at: string;
  created_by_name?: string;
}

interface AuditLog {
  id: number;
  action: string;
  model_name: string;
  object_repr: string;
  user_name: string;
  timestamp: string;
}

const SecurityCompliance: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [violations, setViolations] = useState<ComplianceViolation[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('alerts');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);

  useEffect(() => {
    if (sessionKey!) {
      loadData();
    }
  }, [sessionKey]);

  const loadData = async () => {
    if (!sessionKey!) return;
    
    try {
      setLoading(true);
      
      // Use centralized API with proper session key authentication
      const [alertsRes, violationsRes, rulesRes, auditRes, dashboardRes] = await Promise.all([
        crmApi.getSecurityAlerts(sessionKey!).catch(() => ({ data: { results: [] } })),
        crmApi.getComplianceViolations(sessionKey!).catch(() => ({ data: { results: [] } })),
        crmApi.getComplianceRules(sessionKey!).catch(() => ({ data: { results: [] } })),
        crmApi.getAuditLogs(sessionKey!).catch(() => ({ data: { results: [] } })),
        crmApi.getSecurityDashboard(sessionKey!).catch(() => ({ data: { open_alerts: 0, critical_alerts: 0, open_violations: 0, today_logs: 0 } }))
      ]);
      
      setSecurityAlerts(alertsRes.data.results || alertsRes.data || []);
      setViolations(violationsRes.data.results || violationsRes.data || []);
      setComplianceRules(rulesRes.data.results || rulesRes.data || []);
      setAuditLogs(auditRes.data.results || auditRes.data || []);
      setDashboardData(dashboardRes.data || { open_alerts: 0, critical_alerts: 0, open_violations: 0, today_logs: 0 });
    } catch (error) {
      console.error('Error loading security data:', error);
      toast.error('Failed to load security data');
      // Fallback to empty data
      setSecurityAlerts([]);
      setViolations([]);
      setComplianceRules([]);
      setAuditLogs([]);
      setDashboardData({ open_alerts: 0, critical_alerts: 0, open_violations: 0, today_logs: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId: number) => {
    if (!sessionKey!) return;
    
    try {
      await crmApi.resolveSecurityAlert(sessionKey!, alertId);
      toast.success('Alert resolved successfully');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast.error('Failed to resolve alert');
    }
  };

  const handleResolveViolation = async (violationId: number) => {
    if (!sessionKey!) return;
    
    try {
      await crmApi.resolveComplianceViolation(sessionKey!, violationId);
      toast.success('Violation resolved successfully');
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error resolving violation:', error);
      toast.error('Failed to resolve violation');
    }
  };

  const handleAddRule = () => {
    setSelectedRule(null);
    setShowRuleModal(true);
  };

  const handleEditRule = (rule: ComplianceRule) => {
    setSelectedRule(rule);
    setShowRuleModal(true);
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this compliance rule?')) return;
    
    try {
      await crmApi.deleteComplianceRule(sessionKey!, ruleId);
      toast.success('Compliance rule deleted successfully!');
      loadData();
    } catch (error) {
      toast.error('Failed to delete compliance rule');
    }
  };

  const handleToggleRuleStatus = async (rule: ComplianceRule) => {
    try {
      if (rule.status === 'active') {
        await crmApi.deactivateComplianceRule(sessionKey!, rule.id);
        toast.success('Rule deactivated successfully');
      } else {
        await crmApi.activateComplianceRule(sessionKey!, rule.id);
        toast.success('Rule activated successfully');
      }
      loadData();
    } catch (error) {
      toast.error('Failed to update rule status');
    }
  };

  const handleCheckViolations = async (ruleId: number) => {
    try {
      const response = await crmApi.checkRuleViolations(sessionKey!, ruleId);
      toast.success(response.data.message);
      loadData();
    } catch (error) {
      toast.error('Failed to check violations');
    }
  };

  const handleRuleModalSuccess = () => {
    loadData();
    setSelectedRule(null);
  };

  const handleCloseRuleModal = () => {
    setShowRuleModal(false);
    setSelectedRule(null);
  };

  const getSeverityBadge = (severity: string) => {
    const severityConfig = {
      low: { color: 'bg-blue-100 text-blue-800' },
      medium: { color: 'bg-yellow-100 text-yellow-800' },
      high: { color: 'bg-orange-100 text-orange-800' },
      critical: { color: 'bg-red-100 text-red-800' }
    };
    
    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.low;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${config.color}`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      investigating: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      false_positive: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Security & Compliance</h1>
        <button 
          onClick={handleAddRule}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.open_alerts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.critical_alerts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Violations</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.open_violations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Audit Logs</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.today_logs || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'alerts' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Security Alerts
          </button>
          <button 
            onClick={() => setActiveTab('violations')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'violations' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Compliance Violations
          </button>
          <button 
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'rules' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Compliance Rules
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'audit' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Audit Logs
          </button>
        </div>

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Alerts</h3>
              </div>
              <div className="p-6">
              <div className="space-y-4">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{alert.title}</h3>
                        <p className="text-sm text-gray-500">
                          {alert.alert_type.replace('_', ' ')} • {alert.assigned_to_name || 'Unassigned'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getSeverityBadge(alert.severity)}
                      {getStatusBadge(alert.status)}
                      {alert.status === 'open' && (
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolve
                        </button>
                      )}
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {securityAlerts.length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No security alerts</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Violations</h3>
              </div>
              <div className="p-6">
              <div className="space-y-4">
                {violations.map((violation) => (
                  <div key={violation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{violation.title}</h3>
                        <p className="text-sm text-gray-500">Rule: {violation.rule_name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(violation.detected_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {getSeverityBadge(violation.severity)}
                      {getStatusBadge(violation.status)}
                      {violation.status === 'open' && (
                        <button
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          onClick={() => handleResolveViolation(violation.id)}
                        >
                          Resolve
                        </button>
                      )}
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {violations.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No compliance violations</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Rules</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {complianceRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{rule.name}</h3>
                          <p className="text-sm text-gray-500">
                            {rule.rule_type.toUpperCase()} • by {rule.created_by_name || 'System'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(rule.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getStatusBadge(rule.status)}
                        <button
                          onClick={() => handleToggleRuleStatus(rule)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {rule.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => handleCheckViolations(rule.id)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Search className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {complianceRules.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No compliance rules configured</p>
                      <button 
                        onClick={handleAddRule}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Create First Rule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Logs</h3>
              </div>
              <div className="p-6">
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {log.action.charAt(0).toUpperCase() + log.action.slice(1)} {log.model_name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {log.object_repr} • by {log.user_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-8">
                    <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No audit logs</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Rule Modal */}
      <ComplianceRuleModal
        isOpen={showRuleModal}
        onClose={handleCloseRuleModal}
        onSuccess={handleRuleModalSuccess}
        rule={selectedRule}
      />
    </div>
  );
};

export default SecurityCompliance;