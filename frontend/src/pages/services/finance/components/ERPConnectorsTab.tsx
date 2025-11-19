import React, { useState, useEffect } from 'react';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { apiClient } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { 
  Plus, TestTube, Eye, Edit, Trash2, 
  CheckCircle, XCircle, Clock, AlertCircle, Database,
  RefreshCw, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ERPConnector {
  id: number;
  erp_type: string;
  erp_name: string;
  server_url: string;
  database_name: string;
  username: string;
  sync_direction: string;
  sync_customers: boolean;
  sync_products: boolean;
  sync_invoices: boolean;
  sync_payments: boolean;
  auto_sync_enabled: boolean;
  sync_frequency: string;
  last_sync_date: string | null;
  is_active: boolean;
  connection_status: string;
  created_at: string;
  updated_at: string;
}

interface SyncLog {
  id: number;
  status: string;
  message: string;
  records_processed: number;
  created_at: string;
}

const ERPConnectorsTab: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [connectors, setConnectors] = useState<ERPConnector[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ERPConnector | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [formData, setFormData] = useState({
    erp_type: 'tally',
    erp_name: '',
    server_url: '',
    database_name: '',
    username: '',
    password: '',
    sync_direction: 'import',
    sync_customers: true,
    sync_products: true,
    sync_invoices: true,
    sync_payments: true,
    auto_sync_enabled: false,
    sync_frequency: 'daily',
    is_active: true
  });

  useEffect(() => {
    loadConnectors();
    loadDashboard();
  }, []);

  const loadConnectors = async () => {
    if (!sessionKey) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get('/api/finance/integration/erp-connectors/');
      setConnectors(response.data.results);
    } catch (error: any) {
      toast.error('Failed to load ERP connectors');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.get('/api/finance/integration/erp-connectors/dashboard/');
      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Failed to load dashboard data');
    }
  };

  const handleCreateConnector = async () => {
    if (!sessionKey) return;
    
    try {
      const credentials = formData.password ? { password: formData.password } : {};
      const payload: any = {
        ...formData,
        credentials
      };
      delete payload.password;

      await apiClient.post('/api/finance/integration/erp-connectors/create/', payload);
      toast.success('ERP connector created successfully');
      setShowCreateModal(false);
      resetForm();
      loadConnectors();
      loadDashboard();
    } catch (error: any) {
      toast.error('Failed to create ERP connector');
    }
  };

  const handleUpdateConnector = async () => {
    if (!sessionKey || !selectedConnector) return;
    
    try {
      const credentials = formData.password ? { password: formData.password } : {};
      const payload: any = {
        ...formData,
        credentials
      };
      delete payload.password;

      await apiClient.put(`/api/finance/integration/erp-connectors/${selectedConnector.id}/`, payload);
      toast.success('ERP connector updated successfully');
      setShowEditModal(false);
      resetForm();
      loadConnectors();
    } catch (error: any) {
      toast.error('Failed to update ERP connector');
    }
  };

  const handleDeleteConnector = async (connector: ERPConnector) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this ERP connector?')) return;
    
    try {
      await apiClient.delete(`/api/finance/integration/erp-connectors/${connector.id}/`);
      toast.success('ERP connector deleted successfully');
      loadConnectors();
      loadDashboard();
    } catch (error: any) {
      toast.error('Failed to delete ERP connector');
    }
  };

  const handleTestConnection = async (connector: ERPConnector) => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.post(`/api/finance/integration/erp-connectors/${connector.id}/test/`);
      if (response.data.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${response.data.message}`);
      }
      loadConnectors();
    } catch (error: any) {
      toast.error('Connection test failed');
    }
  };

  const handleSyncData = async (connector: ERPConnector, syncType: string = 'all') => {
    if (!sessionKey) return;
    
    try {
      await apiClient.post(`/api/finance/integration/erp-connectors/${connector.id}/sync/`, {
        sync_type: syncType
      });
      toast.success('Data synchronization completed successfully');
      loadConnectors();
    } catch (error: any) {
      toast.error('Data synchronization failed');
    }
  };

  const handleViewLogs = async (connector: ERPConnector) => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.get(`/api/finance/integration/erp-connectors/${connector.id}/logs/`);
      setSyncLogs(response.data.logs);
      setSelectedConnector(connector);
      setShowLogsModal(true);
    } catch (error: any) {
      toast.error('Failed to load sync logs');
    }
  };

  const openEditModal = (connector: ERPConnector) => {
    setSelectedConnector(connector);
    setFormData({
      erp_type: connector.erp_type,
      erp_name: connector.erp_name,
      server_url: connector.server_url,
      database_name: connector.database_name,
      username: connector.username,
      password: '',
      sync_direction: connector.sync_direction,
      sync_customers: connector.sync_customers,
      sync_products: connector.sync_products,
      sync_invoices: connector.sync_invoices,
      sync_payments: connector.sync_payments,
      auto_sync_enabled: connector.auto_sync_enabled,
      sync_frequency: connector.sync_frequency,
      is_active: connector.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      erp_type: 'tally',
      erp_name: '',
      server_url: '',
      database_name: '',
      username: '',
      password: '',
      sync_direction: 'import',
      sync_customers: true,
      sync_products: true,
      sync_invoices: true,
      sync_payments: true,
      auto_sync_enabled: false,
      sync_frequency: 'daily',
      is_active: true
    });
    setSelectedConnector(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Connected</Badge>;
      case 'error':
        return <Badge variant="error"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'testing':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Testing</Badge>;
      default:
        return <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" />Disconnected</Badge>;
    }
  };

  const getERPTypeIcon = (type: string) => {
    switch (type) {
      case 'sap':
        return '🏢';
      case 'oracle':
        return '🔶';
      case 'tally':
        return '📊';
      case 'quickbooks':
        return '💼';
      default:
        return '🔗';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ERP Connectors</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add ERP Connector
        </Button>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.total_integrations}</div>
                <div className="text-sm text-gray-600">Total Connectors</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.connected_integrations}</div>
                <div className="text-sm text-gray-600">Connected</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.active_integrations}</div>
                <div className="text-sm text-gray-600">Active</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.auto_sync_enabled}</div>
                <div className="text-sm text-gray-600">Auto Sync</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ERP Connectors List */}
      {connectors.length === 0 ? (
        <Card className="p-8 text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No ERP connectors configured</p>
          <p className="text-sm text-gray-400 mb-4">
            Connect your ERP system to sync customers, products, invoices, and payments
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First ERP Connector
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connectors.map((connector) => (
            <Card key={connector.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getERPTypeIcon(connector.erp_type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{connector.erp_name}</h3>
                      <p className="text-sm text-gray-600">{connector.erp_type.toUpperCase()}</p>
                    </div>
                    {getStatusBadge(connector.connection_status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Server:</span>
                      <p className="font-medium">{connector.server_url || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Database:</span>
                      <p className="font-medium">{connector.database_name || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Sync Direction:</span>
                      <p className="font-medium capitalize">{connector.sync_direction}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <p className="font-medium capitalize">{connector.sync_frequency}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    {connector.sync_customers && <Badge variant="outline">Customers</Badge>}
                    {connector.sync_products && <Badge variant="outline">Products</Badge>}
                    {connector.sync_invoices && <Badge variant="outline">Invoices</Badge>}
                    {connector.sync_payments && <Badge variant="outline">Payments</Badge>}
                  </div>
                  
                  {connector.last_sync_date && (
                    <p className="text-xs text-gray-500">
                      Last sync: {new Date(connector.last_sync_date).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestConnection(connector)}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  
                  <Button
                    size="sm"
                    onClick={() => handleSyncData(connector)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Sync
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewLogs(connector)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Logs
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(connector)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteConnector(connector)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={showEditModal ? 'Edit ERP Connector' : 'Add ERP Connector'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ERP Type</label>
              <select
                value={formData.erp_type}
                onChange={(e) => setFormData({...formData, erp_type: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={showEditModal}
              >
                <option value="tally">Tally</option>
                <option value="sap">SAP</option>
                <option value="oracle">Oracle</option>
                <option value="quickbooks">QuickBooks</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Connector Name</label>
              <input
                type="text"
                value={formData.erp_name}
                onChange={(e) => setFormData({...formData, erp_name: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="e.g., Tally Production Server"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Server URL</label>
              <input
                type="text"
                value={formData.server_url}
                onChange={(e) => setFormData({...formData, server_url: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="http://server:port"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Database/Company</label>
              <input
                type="text"
                value={formData.database_name}
                onChange={(e) => setFormData({...formData, database_name: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Database or Company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder={showEditModal ? "Leave blank to keep current" : ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sync Direction</label>
              <select
                value={formData.sync_direction}
                onChange={(e) => setFormData({...formData, sync_direction: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="import">Import Only</option>
                <option value="export">Export Only</option>
                <option value="bidirectional">Bidirectional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sync Frequency</label>
              <select
                value={formData.sync_frequency}
                onChange={(e) => setFormData({...formData, sync_frequency: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Data Types to Sync</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sync_customers}
                  onChange={(e) => setFormData({...formData, sync_customers: e.target.checked})}
                  className="mr-2"
                />
                Customers
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sync_products}
                  onChange={(e) => setFormData({...formData, sync_products: e.target.checked})}
                  className="mr-2"
                />
                Products
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sync_invoices}
                  onChange={(e) => setFormData({...formData, sync_invoices: e.target.checked})}
                  className="mr-2"
                />
                Invoices
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sync_payments}
                  onChange={(e) => setFormData({...formData, sync_payments: e.target.checked})}
                  className="mr-2"
                />
                Payments
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_sync_enabled}
                onChange={(e) => setFormData({...formData, auto_sync_enabled: e.target.checked})}
                className="mr-2"
              />
              Enable Auto Sync
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="mr-2"
              />
              Active
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={showEditModal ? handleUpdateConnector : handleCreateConnector}
            >
              {showEditModal ? 'Update' : 'Create'} Connector
            </Button>
          </div>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        title={`Sync Logs - ${selectedConnector?.erp_name}`}
        size="lg"
      >
        <div className="space-y-4">
          {syncLogs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sync logs available</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncLogs.map((log) => (
                <div key={log.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                      {log.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{log.message}</p>
                  {log.records_processed > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Records processed: {log.records_processed}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ERPConnectorsTab;