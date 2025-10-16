import React, { useState, useEffect } from 'react';
import { RefreshCw, Plus, Play, Pause, CheckCircle, Calendar } from 'lucide-react';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { DataTable } from '../../../../../components/ui/DataTable';
import { Modal } from '../../../../../components/ui/Modal';
import { inventoryApi } from '../../utils/inventoryApi';
import type { CycleCount, Category, Warehouse } from '../../types/inventoryTypes';
import toast from 'react-hot-toast';

export const CycleCountManager: React.FC = () => {
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [formData, setFormData] = useState({
    count_name: '',
    warehouse: '',
    frequency: 'monthly',
    next_count_date: new Date().toISOString().split('T')[0],
    abc_classes: [] as string[],
    categories: [] as number[]
  });

  useEffect(() => {
    loadCycleCounts();
    loadCategories();
    loadWarehouses();
  }, []);

  const loadCycleCounts = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getCycleCounts();
      setCycleCounts(response.results || []);
    } catch (error: any) {
      toast.error('Failed to load cycle counts');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await inventoryApi.getCategoriesDropdown();
      setCategories(response || []);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const response = await inventoryApi.getWarehousesDropdown();
      setWarehouses(response || []);
    } catch (error: any) {
      console.error('Failed to load warehouses:', error);
    }
  };

  const handleCreateCycleCount = async () => {
    try {
      if (!formData.count_name.trim()) {
        toast.error('Count name is required');
        return;
      }
      
      if (!formData.warehouse) {
        toast.error('Please select a warehouse');
        return;
      }

      await inventoryApi.createCycleCount(formData);
      toast.success('Cycle count scheduled successfully');
      setShowCreateModal(false);
      resetForm();
      loadCycleCounts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create cycle count');
    }
  };

  const handleStartCycleCount = async (countId: number) => {
    try {
      await inventoryApi.startCycleCount(countId);
      toast.success('Cycle count started successfully');
      loadCycleCounts();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start cycle count');
    }
  };

  const resetForm = () => {
    setFormData({
      count_name: '',
      warehouse: '',
      frequency: 'monthly',
      next_count_date: new Date().toISOString().split('T')[0],
      abc_classes: [],
      categories: []
    });
  };

  const handleABCClassChange = (abcClass: string, checked: boolean) => {
    if (checked) {
      setFormData({...formData, abc_classes: [...formData.abc_classes, abcClass]});
    } else {
      setFormData({...formData, abc_classes: formData.abc_classes.filter(c => c !== abcClass)});
    }
  };

  const handleCategoryChange = (categoryId: number, checked: boolean) => {
    if (checked) {
      setFormData({...formData, categories: [...formData.categories, categoryId]});
    } else {
      setFormData({...formData, categories: formData.categories.filter(c => c !== categoryId)});
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'count_name',
      header: 'Count Name',
      render: (count: CycleCount) => (
        <div>
          <div className="font-medium">{count.count_name}</div>
          <div className="text-sm text-gray-500">{count.count_number}</div>
        </div>
      )
    },
    {
      key: 'warehouse_name',
      header: 'Warehouse',
      render: (count: CycleCount) => count.warehouse_name
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: (count: CycleCount) => (
        <span className="capitalize">{count.frequency}</span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (count: CycleCount) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(count.status)}`}>
          {count.status.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'next_count_date',
      header: 'Next Count',
      render: (count: CycleCount) => (
        <span className="text-sm">
          {new Date(count.next_count_date).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'accuracy_percentage',
      header: 'Accuracy',
      render: (count: CycleCount) => (
        <span className={`font-medium ${count.accuracy_percentage >= 95 ? 'text-green-600' : 'text-orange-600'}`}>
          {count.accuracy_percentage.toFixed(1)}%
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (count: CycleCount) => (
        <div className="flex items-center space-x-2">
          {count.status === 'scheduled' && (
            <Button
              size="sm"
              onClick={() => handleStartCycleCount(count.id)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          )}
          {count.status === 'in_progress' && (
            <Button size="sm" variant="outline">
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {count.status === 'completed' && (
            <Button size="sm" variant="outline">
              <CheckCircle className="w-4 h-4 mr-1" />
              View
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cycle Counts</h2>
          <p className="text-gray-600 dark:text-gray-400">Automated inventory counting and accuracy tracking</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Count
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Counts</p>
              <p className="text-2xl font-bold text-gray-900">{cycleCounts.length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-yellow-600">
                {cycleCounts.filter(c => c.status === 'scheduled').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {cycleCounts.filter(c => c.status === 'in_progress').length}
              </p>
            </div>
            <Play className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {cycleCounts.filter(c => c.status === 'completed').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-purple-600">
                {cycleCounts.length > 0 
                  ? (cycleCounts.reduce((sum, c) => sum + c.accuracy_percentage, 0) / cycleCounts.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <DataTable
          data={cycleCounts}
          columns={columns}
          loading={loading}
          emptyMessage="No cycle counts scheduled. Create your first cycle count to get started."
        />
      </Card>

      {/* Create Cycle Count Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Schedule Cycle Count"
        size="lg"
      >
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Count Name *
              </label>
              <input
                type="text"
                value={formData.count_name}
                onChange={(e) => setFormData({...formData, count_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter count name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse *
              </label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({...formData, warehouse: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select warehouse</option>
                {warehouses.map(warehouse => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Count Date
              </label>
              <input
                type="date"
                value={formData.next_count_date}
                onChange={(e) => setFormData({...formData, next_count_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* ABC Classification Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ABC Classification (Optional)
            </label>
            <div className="flex space-x-4">
              {['A', 'B', 'C'].map(abcClass => (
                <label key={abcClass} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.abc_classes.includes(abcClass)}
                    onChange={(e) => handleABCClassChange(abcClass, e.target.checked)}
                    className="mr-2"
                  />
                  Class {abcClass}
                </label>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categories (Optional)
            </label>
            <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {categories.slice(0, 10).map(category => (
                <label key={category.id} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.id)}
                    onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    className="mr-2"
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCycleCount}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Schedule Count
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};