import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Package,
  
  
  


  BarChart3,
  Settings,
  Bell,
  Zap,
  AlertTriangle,

  TrendingUp,
  Star,
  Activity,
  Tag,
  Users,
  Warehouse,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
  Shield,
  
  RefreshCw,
  ChevronRight,
  Building,
  User
} from 'lucide-react';
// import { useAuthStore } from '../../../../store/authStore';
import { useThemeStore } from '../../../../store/themeStore';
import api, { apiClient } from '../../../../lib/api';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import ProductList from '../components/products/ProductList';
import CategoryManager from '../components/categories/CategoryManager';
import SupplierManager from '../components/suppliers/SupplierManager';
import WarehouseManager from '../components/warehouses/WarehouseManager';
import StockMovementTracker from '../components/stock/StockMovementTracker';
import StockAlerts from '../components/alerts/StockAlerts';
import PurchaseOrderManager from '../components/purchase-orders/PurchaseOrderManager';
import InventoryAudits from '../components/audits/InventoryAudits';
import InventoryAnalytics from '../components/analytics/InventoryAnalytics';
import { AgingAnalysis } from '../components/analytics/AgingAnalysis';
import { ProductBundleManager } from '../components/bundles/ProductBundleManager';
import { CycleCountManager } from '../components/cycle-counts/CycleCountManager';
import { inventoryApi } from '../utils/inventoryApi';
import type { InventoryDashboardStats } from '../types/inventoryTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';

import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore();

  const [activeTab, setActiveTab] = useState('overview');

  const [isLoading, setIsLoading] = useState(true);
  const [companyData, setCompanyData] = useState<any>(null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [dashboardData, setDashboardData] = useState<InventoryDashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey;
      console.log('🔍 DEBUG: fetchCompanyData called');
      console.log('🔍 DEBUG: serviceUser?.company_id:', serviceUser?.company_id);
      console.log('🔍 DEBUG: sessionKey from store:', !!currentSessionKey);

      if (serviceUser?.company_id && currentSessionKey) {
        console.log('🔍 DEBUG: Making API call with sessionKey:', currentSessionKey.substring(0, 10) + '...');

        const response = await api.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: {
            'Authorization': `Bearer ${currentSessionKey}`
          },
          params: {
            session_key: currentSessionKey
          }
        });
        console.log('🔍 DEBUG: API call successful, logo data:', response.data);
        console.log('🔍 DEBUG: Logo URL from response:', response.data.logo);
        setCompanyData(response.data);
      } else {
        console.log('🔍 DEBUG: Missing required data for API call');
      }
    } catch (error: any) {
      console.error('🔍 DEBUG: Error fetching company logo:', error);
      console.error('🔍 DEBUG: Error response:', error.response?.data);
    }
  };

  // Fetch inventory dashboard data
  const fetchDashboardData = async () => {
    if (!sessionKey) return;

    try {
      setDashboardLoading(true);
      const data = await inventoryApi.getDashboardStats();
      setDashboardData(data);
    } catch (err: any) {
      setDashboardError(err.message || 'Failed to load dashboard data');
    } finally {
      setDashboardLoading(false);
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
    { id: 'movements', label: 'Stock Movements', icon: Activity },
    { id: 'alerts', label: 'Stock Alerts', icon: Bell },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: Star },
    { id: 'audits', label: 'Inventory Audits', icon: Shield },
    { id: 'bundles', label: 'Product Bundles', icon: Package },
    { id: 'cycle-counts', label: 'Cycle Counts', icon: RefreshCw },
    { id: 'aging-analysis', label: 'Aging Analysis', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: Zap },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    if (serviceUser?.company_name) {
      setCompanyData({
        id: serviceUser.company_id,
        name: serviceUser.company_name,
        logo: null
      });

      if (sessionKey) {
        fetchCompanyData();
      } else {
        setTimeout(() => {
          const currentSessionKey = useServiceUserStore.getState().sessionKey;
          if (currentSessionKey) {
            fetchCompanyData();
          }
        }, 1000);
      }
    }

    return () => clearTimeout(timer);
  }, [serviceUser?.company_id, sessionKey]);

  // Fetch dashboard data when sessionKey is available
  useEffect(() => {
    if (sessionKey) {
      fetchDashboardData();
    }
  }, [sessionKey]);

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (!sessionKey) {
        toast.error('Session expired. Please login again.');
        return;
      }

      await apiClient.changeServiceUserPassword({
        session_key: sessionKey,
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      });

      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Render Settings Page
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Inventory Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your inventory service preferences and security settings
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-green-500" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>
            Your service user account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {serviceUser?.unique_service_id || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {companyData?.name || serviceUser?.company_name || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                Inventory Management
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                Inventory User
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render Overview Dashboard (inline like HR/Finance)
  const renderOverview = () => {
    if (dashboardLoading) {
      return (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (dashboardError) {
      return (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{dashboardError}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!dashboardData) return null;

    const { inventory_stats, recent_movements, ai_insights } = dashboardData;

    return (
      <div className="space-y-8">
        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Products Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Package className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Total</div>
                  <div className="text-2xl font-bold">{inventory_stats.total_products}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">Products</span>
                <span className="ml-2 opacity-70">• {inventory_stats.total_categories} categories</span>
              </div>
            </div>
          </div>

          {/* Stock Value Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl shadow-green-500/25">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Total Value</div>
                  <div className="text-2xl font-bold">₹{(inventory_stats.total_stock_value / 100000).toFixed(1)}L</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">Stock Value</span>
                <span className="ml-2 opacity-70">• {inventory_stats.total_warehouses} warehouses</span>
              </div>
            </div>
          </div>

          {/* Low Stock Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl shadow-orange-500/25">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Low Stock</div>
                  <div className="text-2xl font-bold">{inventory_stats.low_stock_products}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">Items</span>
                <span className="ml-2 opacity-70">• {inventory_stats.out_of_stock_products} out of stock</span>
              </div>
            </div>
          </div>

          {/* Suppliers Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl shadow-purple-500/25">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Active</div>
                  <div className="text-2xl font-bold">{inventory_stats.total_suppliers}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">Suppliers</span>
                <span className="ml-2 opacity-70">• {inventory_stats.pending_alerts} alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex items-center space-x-3 mb-4">
            <Zap className="w-6 h-6" />
            <h2 className="text-xl font-bold">AI Insights</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{ai_insights.reorder_suggestions}</div>
              <div className="text-purple-200">Reorder Suggestions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2">{ai_insights.inventory_turnover}%</div>
              <div className="text-purple-200">Inventory Turnover</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold mb-2 capitalize">{ai_insights.demand_trend}</div>
              <div className="text-purple-200">Demand Trend</div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Stock Movements</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Latest inventory activities</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('movements')}
              className="px-3 py-2 text-sm bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded cursor-pointer"
            >
              <Activity className="h-4 w-4 mr-2 inline" />
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recent_movements.slice(0, 5).map((movement: any) => (
              <div key={movement.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-xl ${
                    movement.movement_type === 'in'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
                  }`}>
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{movement.product_name}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{movement.warehouse_name}</p>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        movement.movement_type === 'in' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {movement.movement_type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {movement.movement_type === 'out' ? '-' : '+'}{movement.quantity}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(movement.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'products':
        return <ProductList />;
      case 'categories':
        return <CategoryManager />;
      case 'suppliers':
        return <SupplierManager />;
      case 'warehouses':
        return <WarehouseManager />;
      case 'movements':
        return <StockMovementTracker />;
      case 'alerts':
        return <StockAlerts />;
      case 'purchase-orders':
        return <PurchaseOrderManager />;
      case 'audits':
        return <InventoryAudits />;
      case 'bundles':
        return <ProductBundleManager />;
      case 'cycle-counts':
        return <CycleCountManager />;
      case 'aging-analysis':
        return <AgingAnalysis />;
      case 'analytics':
        return <InventoryAnalytics onNavigate={setActiveTab} />;
      case 'settings':
        return renderSettings();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Sidebar */}
      <aside id="sidebar" className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50">
        {/* Sidebar Header with Company Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
              {companyData?.logo ? (
                <img
                  src={companyData.logo}
                  alt={`${companyData.name} logo`}
                  className="h-full w-full object-cover"
                  onLoad={() => console.log('🔍 DEBUG: Logo loaded successfully:', companyData.logo)}
                  onError={(e) => console.error('🔍 DEBUG: Logo failed to load:', e, companyData.logo)}
                />
              ) : (
                <Building className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Inventory Management
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {companyData?.name || serviceUser?.company_name || 'Company'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {serviceUser?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {serviceUser?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {serviceUser?.role || 'Inventory User'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={serviceUserLogout}
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/company/services')}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Inventory Module
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-9 w-9 p-0"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
