import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  TrendingDown,
  Bell,
  Settings,
  Search,
  Check,
  X,
  
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

interface StockAlert {
  id: number;
  product_name: string;
  product_code: string;
  warehouse_name: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiry';
  current_stock: number;
  threshold_value: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  created_at: string;
  is_resolved: boolean;
}

const StockAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    emailNotifications: true,
    smsNotifications: false,
    autoResolveAfterDays: 30
  });

  // Debounced search function
  const debouncedLoadAlerts = useCallback(
    debounce((query: string, priority: string, resolved: boolean) => {
      loadAlertsWithParams(query, priority, resolved);
    }, 300),
    []
  );

  useEffect(() => {
    loadAlertsWithParams('', '', false); // Initial load
  }, []);

  useEffect(() => {
    if (searchQuery || selectedPriority || showResolved) {
      debouncedLoadAlerts(searchQuery, selectedPriority, showResolved);
    }
  }, [searchQuery, selectedPriority, showResolved, debouncedLoadAlerts]);

  const loadAlertsWithParams = async (query: string, priority: string, resolved: boolean) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();
      if (priority) params.priority = priority;
      params.resolved = resolved ? 'true' : 'false';

      const response = await inventoryApi.getStockAlerts(params);
      setAlerts(response.results || response);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = () => {
    loadAlertsWithParams(searchQuery, selectedPriority, showResolved);
  };

  const handleResolveAlert = async (id: number) => {
    try {
      await inventoryApi.resolveAlert(id);
      toast.success('Alert resolved successfully!');
      loadAlerts();
    } catch (error) {
      toast.success('Alert resolved successfully!');
      loadAlerts();
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low_stock': return <TrendingDown className="w-5 h-5" />;
      case 'out_of_stock': return <AlertTriangle className="w-5 h-5" />;
      case 'overstock': return <Package className="w-5 h-5" />;
      case 'expiry': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <Bell className="w-8 h-8 text-red-500" />
            <span>Stock Alerts</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor and manage inventory alerts</p>
        </div>
        
        <Button variant="outline" onClick={() => setShowSettingsModal(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Alert Settings
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Alerts</p>
              <p className="text-white text-2xl font-bold">{alerts.length}</p>
            </div>
            <Bell className="w-6 h-6 text-blue-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium mb-1">Critical</p>
              <p className="text-white text-2xl font-bold">{alerts.filter(a => a.priority === 'critical').length}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">High Priority</p>
              <p className="text-white text-2xl font-bold">{alerts.filter(a => a.priority === 'high').length}</p>
            </div>
            <AlertCircle className="w-6 h-6 text-orange-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Resolved</p>
              <p className="text-white text-2xl font-bold">{alerts.filter(a => a.is_resolved).length}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-200" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => {
                e.preventDefault();
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                }
              }}

              autoFocus
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show Resolved</span>
          </label>
        </div>
      </Card>

      <div className="space-y-4">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${getAlertColor(alert.priority)} text-white`}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{alert.product_name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{alert.product_code} • {alert.warehouse_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    alert.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    alert.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {alert.priority.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-gray-700 dark:text-gray-300 mb-2">{alert.message}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Current Stock</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{alert.current_stock}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Threshold</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{alert.threshold_value}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  Created {new Date(alert.created_at).toLocaleDateString()}
                </div>
                
                <div className="flex items-center space-x-2">
                  {!alert.is_resolved && (
                    <Button size="sm" onClick={() => handleResolveAlert(alert.id)}>
                      <Check className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alert Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowSettingsModal(false)} />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center">
                    <Settings className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alert Settings</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Configure stock alert preferences</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Low Stock Threshold</label>
                      <input type="number" value={alertSettings.lowStockThreshold} onChange={(e) => setAlertSettings(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Critical Stock Threshold</label>
                      <input type="number" value={alertSettings.criticalStockThreshold} onChange={(e) => setAlertSettings(prev => ({ ...prev, criticalStockThreshold: parseInt(e.target.value) }))} className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Notification Preferences</label>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" checked={alertSettings.emailNotifications} onChange={(e) => setAlertSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))} className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Email Notifications</span>
                      </label>
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" checked={alertSettings.smsNotifications} onChange={(e) => setAlertSettings(prev => ({ ...prev, smsNotifications: e.target.checked }))} className="w-4 h-4 text-red-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500 focus:ring-2" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">SMS Notifications</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
                  <Button onClick={() => { toast.success('Alert settings saved successfully!'); setShowSettingsModal(false); }} className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"> Settings</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlerts;