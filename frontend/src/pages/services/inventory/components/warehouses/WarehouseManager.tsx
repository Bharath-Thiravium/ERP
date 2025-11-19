import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Warehouse,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  MapPin,
  User,
  BarChart3,

  TrendingUp,
  Activity,
  Building,
  Eye
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import type { Warehouse as WarehouseType } from '../../types/inventoryTypes';
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

// Ensure toast.info is available


const WarehouseManager: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    latitude: '',
    longitude: '',
    total_capacity: '1000',
    is_active: true
  });

  // Debounced search function
  const debouncedLoadWarehouses = useCallback(
    debounce((query: string) => {
      loadWarehousesWithParams(query);
    }, 300),
    []
  );

  useEffect(() => {
    loadWarehousesWithParams(''); // Initial load
  }, []);

  useEffect(() => {
    if (searchQuery) {
      debouncedLoadWarehouses(searchQuery);
    }
  }, [searchQuery, debouncedLoadWarehouses]);

  const loadWarehousesWithParams = async (query: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();

      const response = await inventoryApi.getWarehouses(params);
      setWarehouses(response.results || response);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
      toast.error('Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = () => {
    loadWarehousesWithParams(searchQuery);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Warehouse name is required';
    }



    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    }

    if (!formData.total_capacity || parseFloat(formData.total_capacity) <= 0) {
      newErrors.total_capacity = 'Valid total capacity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setModalLoading(true);
    try {
      const warehouseData = {
        ...formData,
        total_capacity: parseFloat(formData.total_capacity),
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      if (selectedWarehouse) {
        await inventoryApi.updateWarehouse(selectedWarehouse.id, {
          ...warehouseData,
          latitude: warehouseData.latitude || undefined,
          longitude: warehouseData.longitude || undefined
        });
        toast.success('Warehouse updated successfully!');
        setShowEditModal(false);
      } else {
        await inventoryApi.createWarehouse({
          ...warehouseData,
          latitude: warehouseData.latitude || undefined,
          longitude: warehouseData.longitude || undefined
        });
        toast.success('Warehouse created successfully!');
        setShowAddModal(false);
      }
      resetForm();
      loadWarehouses();
    } catch (error: any) {
      console.error('Error saving warehouse:', error);
      const message = error.response?.data?.error || 'Failed to save warehouse';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      latitude: '',
      longitude: '',
      total_capacity: '1000',
      is_active: true
    });
    setSelectedWarehouse(null);
    setErrors({});
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address,
      city: warehouse.city,
      state: warehouse.state,
      pincode: warehouse.pincode,
      latitude: warehouse.latitude?.toString() || '',
      longitude: warehouse.longitude?.toString() || '',
      total_capacity: warehouse.total_capacity.toString(),
      is_active: warehouse.is_active
    });
    setShowEditModal(true);
  };

  const handleView = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setShowViewModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await inventoryApi.deleteWarehouse(id);
        toast.success('Warehouse deleted successfully!');
        loadWarehouses();
      } catch (error) {
        console.error('Failed to delete warehouse:', error);
        toast.error('Failed to delete warehouse');
      }
    }
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600 bg-red-50';
    if (utilization >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getUtilizationIcon = (utilization: number) => {
    if (utilization >= 90) return <AlertCircle className="h-4 w-4" />;
    if (utilization >= 70) return <TrendingUp className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <Warehouse className="w-8 h-8 text-indigo-500" />
            <span>Warehouse Management</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your storage facilities and locations</p>
        </div>
        
        <Button 
          className="bg-gradient-to-r from-indigo-500 to-purple-600"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Warehouse
        </Button>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search warehouses..."
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </motion.div>

      {/* Warehouses Grid */}
      <AnimatePresence>
        {warehouses.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          >
            {warehouses.map((warehouse) => (
              <motion.div
                key={warehouse.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="p-6 hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-indigo-600 transition-colors">
                          {warehouse.name}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{warehouse.code}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${getUtilizationColor(warehouse.capacity_utilization)}`}>
                        {getUtilizationIcon(warehouse.capacity_utilization)}
                        <span>{Number(warehouse.capacity_utilization || 0).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="text-gray-600 dark:text-gray-300">
                        <p>{warehouse.address}</p>
                        <p>{warehouse.city}, {warehouse.state} - {warehouse.pincode}</p>
                      </div>
                    </div>
                    {warehouse.manager_name && (
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-300">Manager: {warehouse.manager_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Capacity Metrics */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Capacity Utilization</span>
                      <span className="font-medium text-gray-900 dark:text-white">{Number(warehouse.capacity_utilization || 0).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Number(warehouse.capacity_utilization || 0)}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className={`h-2 rounded-full ${
                          Number(warehouse.capacity_utilization || 0) >= 90 ? 'bg-red-500' :
                          Number(warehouse.capacity_utilization || 0) >= 70 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Used: {Number(warehouse.used_capacity || 0).toFixed(0)}</span>
                      <span>Total: {Number(warehouse.total_capacity || 0).toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
                      <p className="text-indigo-600 font-bold text-lg">{warehouse.products_count}</p>
                      <p className="text-indigo-500 text-xs">Products</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
                      <p className="text-blue-600 font-bold text-lg">{Number(warehouse.total_capacity || 0).toFixed(0)}</p>
                      <p className="text-blue-500 text-xs">Total Capacity</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className={`flex items-center justify-center space-x-2 p-2 rounded-lg border mb-4 ${
                    warehouse.is_active 
                      ? 'text-green-500 bg-green-50 border-green-200' 
                      : 'text-gray-500 bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      warehouse.is_active ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(warehouse)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(warehouse.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleView(warehouse)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Warehouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No warehouses found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first warehouse to start managing inventory locations</p>
            <Button 
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Warehouse
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Warehouse Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowAddModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Warehouse className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Add New Warehouse
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create a new storage facility
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Building className="h-5 w-5 text-indigo-500" />
                        <span>Basic Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Warehouse Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter warehouse name"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Warehouse Code
                          </label>
                          <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Auto-generated with company prefix
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Code will be automatically generated when saved
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Address *
                          </label>
                          <textarea
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            rows={3}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter warehouse address"
                          />
                          {errors.address && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.address}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter city"
                          />
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.city}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter state"
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.state}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Pincode *
                          </label>
                          <input
                            type="text"
                            value={formData.pincode}
                            onChange={(e) => handleInputChange('pincode', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.pincode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter pincode"
                          />
                          {errors.pincode && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.pincode}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Capacity *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.total_capacity}
                            onChange={(e) => handleInputChange('total_capacity', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.total_capacity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="1000"
                          />
                          {errors.total_capacity && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.total_capacity}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* GPS Coordinates */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <MapPin className="h-5 w-5 text-green-500" />
                        <span>GPS Coordinates (Optional)</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Latitude
                          </label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={formData.latitude}
                            onChange={(e) => handleInputChange('latitude', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="12.9716"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Longitude
                          </label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={formData.longitude}
                            onChange={(e) => handleInputChange('longitude', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="77.5946"
                          />
                        </div>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active Warehouse
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAddModal(false)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Warehouse
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Warehouse Modal */}
      <AnimatePresence>
        {showEditModal && selectedWarehouse && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => { setShowEditModal(false); resetForm(); }}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Edit Warehouse
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update warehouse information
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowEditModal(false); resetForm(); }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Building className="h-5 w-5 text-indigo-500" />
                        <span>Basic Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Warehouse Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter warehouse name"
                          />
                          {errors.name && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Warehouse Code
                          </label>
                          <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {selectedWarehouse.code}
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Code cannot be changed after creation
                          </p>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Address *
                          </label>
                          <textarea
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            rows={3}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.address ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter warehouse address"
                          />
                          {errors.address && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.address}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            value={formData.city}
                            onChange={(e) => handleInputChange('city', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.city ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter city"
                          />
                          {errors.city && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.city}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            State *
                          </label>
                          <input
                            type="text"
                            value={formData.state}
                            onChange={(e) => handleInputChange('state', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.state ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter state"
                          />
                          {errors.state && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.state}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Total Capacity *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.total_capacity}
                            onChange={(e) => handleInputChange('total_capacity', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                              errors.total_capacity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="1000"
                          />
                          {errors.total_capacity && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.total_capacity}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.is_active}
                              onChange={(e) => handleInputChange('is_active', e.target.checked)}
                              className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Active Warehouse
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowEditModal(false); resetForm(); }}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Warehouse
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* View Warehouse Modal */}
      <AnimatePresence>
        {showViewModal && selectedWarehouse && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowViewModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Warehouse Details
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedWarehouse.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Warehouse Name
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedWarehouse.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Warehouse Code
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedWarehouse.code}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Address
                      </label>
                      <p className="text-gray-900 dark:text-white">{selectedWarehouse.address}</p>
                      <p className="text-gray-900 dark:text-white">{selectedWarehouse.city}, {selectedWarehouse.state} - {selectedWarehouse.pincode}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Total Capacity
                        </label>
                        <p className="text-2xl font-bold text-blue-600">{Number(selectedWarehouse.total_capacity || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Used Capacity
                        </label>
                        <p className="text-2xl font-bold text-orange-600">{Number(selectedWarehouse.used_capacity || 0).toFixed(0)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Utilization
                        </label>
                        <p className="text-2xl font-bold text-purple-600">{Number(selectedWarehouse.capacity_utilization || 0).toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Products Count
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedWarehouse.products_count}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Manager
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedWarehouse.manager_name || 'Not Assigned'}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedWarehouse.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          selectedWarehouse.is_active ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        {selectedWarehouse.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(selectedWarehouse)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Warehouse
                    </Button>
                    <Button
                      onClick={() => setShowViewModal(false)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WarehouseManager;