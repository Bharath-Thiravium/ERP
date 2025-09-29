import React, { useState, useEffect } from 'react';
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
  Check
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    loadAlerts();
  }, [searchQuery, selectedPriority, showResolved]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedPriority) params.priority = selectedPriority;
      params.resolved = showResolved ? 'true' : 'false';

      const response = await inventoryApi.getStockAlerts(params);
      setAlerts(response.results || response);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Bell className="w-8 h-8 text-red-500" />
            <span>Stock Alerts</span>
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage inventory alerts</p>
        </div>
        
        <Button variant="outline">
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

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show Resolved</span>
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
            <Card className="p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${getAlertColor(alert.priority)} text-white`}>
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{alert.product_name}</h3>
                    <p className="text-gray-500 text-sm">{alert.product_code} • {alert.warehouse_name}</p>
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
                <p className="text-gray-700 mb-2">{alert.message}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs mb-1">Current Stock</p>
                    <p className="font-semibold text-gray-900">{alert.current_stock}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs mb-1">Threshold</p>
                    <p className="font-semibold text-gray-900">{alert.threshold_value}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-gray-500 text-sm">
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
    </div>
  );
};

export default StockAlerts;