import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Package,

  Calendar,

  TrendingUp,

  BarChart3,

  Download,
  Plus,
  Search,
  RefreshCw,




  X,
  Save
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import type { StockMovement } from '../../types/inventoryTypes';
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

interface MovementCardProps {
  movement: StockMovement;
  index: number;
}

const MovementCard: React.FC<MovementCardProps> = ({ movement, index }) => {
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
      case 'purchase':
      case 'return':
        return <ArrowUpRight className="w-5 h-5" />;
      case 'out':
      case 'sale':
      case 'damage':
        return <ArrowDownRight className="w-5 h-5" />;
      case 'transfer':
        return <RefreshCw className="w-5 h-5" />;
      case 'adjustment':
        return <BarChart3 className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
      case 'purchase':
      case 'return':
        return 'from-green-500 to-green-600 text-white';
      case 'out':
      case 'sale':
      case 'damage':
        return 'from-red-500 to-red-600 text-white';
      case 'transfer':
        return 'from-blue-500 to-blue-600 text-white';
      case 'adjustment':
        return 'from-yellow-500 to-yellow-600 text-white';
      default:
        return 'from-gray-500 to-gray-600 text-white';
    }
  };

  const getQuantityDisplay = (type: string, quantity: number) => {
    const isIncoming = ['in', 'purchase', 'return', 'production'].includes(type);
    return `${isIncoming ? '+' : '-'}${quantity}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group"
    >
      <Card className="p-6 hover:shadow-lg transition-all duration-300 border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl bg-gradient-to-r ${getMovementColor(movement.movement_type)}`}>
              {getMovementIcon(movement.movement_type)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">
                {movement.product_name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{movement.warehouse_name}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              ['in', 'purchase', 'return', 'production'].includes(movement.movement_type)
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {getQuantityDisplay(movement.movement_type, movement.quantity)}
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm capitalize">
              {movement.movement_type.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Movement Details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">Before</p>
            <p className="font-semibold text-gray-900 dark:text-white">{movement.quantity_before}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-1">After</p>
            <p className="font-semibold text-gray-900 dark:text-white">{movement.quantity_after}</p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 mb-4 text-sm">
          {movement.reference_number && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Reference:</span>
              <span className="font-medium text-gray-900 dark:text-white">{movement.reference_number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Unit Cost:</span>
            <span className="font-medium text-gray-900 dark:text-white">₹{movement.unit_cost}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
            <span className="font-medium text-gray-900 dark:text-white">₹{(movement.quantity * movement.unit_cost).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">By:</span>
            <span className="font-medium text-gray-900 dark:text-white">{movement.created_by_name}</span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
            <Calendar className="w-4 h-4" />
            <span>{new Date(movement.created_at).toLocaleString()}</span>
          </div>
          
          {movement.batch_number && (
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
              <Package className="w-4 h-4" />
              <span>Batch: {movement.batch_number}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {movement.notes && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-blue-700 text-sm">{movement.notes}</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const StockMovementTracker: React.FC = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [dateRange, setDateRange] = useState('7'); // days
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    product: '',
    warehouse: '',
    destination_warehouse: '',
    movement_type: 'in',
    quantity: '',
    unit_cost: '',
    reference_number: '',
    batch_number: '',
    expiry_date: '',
    adjustment_reason: '',
    damage_reason: '',
    notes: ''
  });

  // Debounced search function
  const debouncedLoadMovements = useCallback(
    debounce((query: string, type: string, warehouse: string, range: string) => {
      loadMovementsWithParams(query, type, warehouse, range);
    }, 300),
    []
  );

  useEffect(() => {
    loadMovementsWithParams('', '', '', '7'); // Initial load
  }, []);

  useEffect(() => {
    if (searchQuery || selectedType || selectedWarehouse || dateRange !== '7') {
      debouncedLoadMovements(searchQuery, selectedType, selectedWarehouse, dateRange);
    }
  }, [searchQuery, selectedType, selectedWarehouse, dateRange, debouncedLoadMovements]);

  const loadMovementsWithParams = async (query: string, type: string, warehouse: string, range: string) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();
      if (type) params.movement_type = type;
      if (warehouse) params.warehouse = warehouse;
      if (range) {
        const date = new Date();
        date.setDate(date.getDate() - parseInt(range));
        params.created_at__gte = date.toISOString().split('T')[0];
      }

      const response = await inventoryApi.getStockMovements(params);
      setMovements(response.results || response);
    } catch (error) {
      console.error('Failed to load stock movements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = () => {
    loadMovementsWithParams(searchQuery, selectedType, selectedWarehouse, dateRange);
  };

  const handleCreateMovement = async () => {
    await loadDropdownData();
    setShowCreateModal(true);
  };

  const loadDropdownData = async () => {
    try {
      const [productsRes, warehousesRes] = await Promise.all([
        inventoryApi.getProducts(),
        inventoryApi.getWarehouses()
      ]);
      setProducts(productsRes.results || productsRes);
      setWarehouses(warehousesRes.results || warehousesRes);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const movementData = {
        ...formData,
        product: parseInt(formData.product),
        warehouse: parseInt(formData.warehouse),
        quantity: parseFloat(formData.quantity),
        unit_cost: parseFloat(formData.unit_cost)
      };
      
      await inventoryApi.createStockMovement(movementData as any);
      toast.success('Stock movement recorded successfully!');
      setShowCreateModal(false);
      resetForm();
      loadMovements();
    } catch (error) {
      console.error('Failed to create movement:', error);
      toast.error('Failed to record stock movement');
    } finally {
      setModalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      product: '',
      warehouse: '',
      destination_warehouse: '',
      movement_type: 'in',
      quantity: '',
      unit_cost: '',
      reference_number: '',
      batch_number: '',
      expiry_date: '',
      adjustment_reason: '',
      damage_reason: '',
      notes: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    console.log('Export movements');
  };

  const getMovementStats = () => {
    const totalIn = movements
      .filter(m => ['in', 'purchase', 'return', 'production'].includes(m.movement_type))
      .reduce((sum, m) => sum + m.quantity, 0);
    
    const totalOut = movements
      .filter(m => ['out', 'sale', 'damage'].includes(m.movement_type))
      .reduce((sum, m) => sum + m.quantity, 0);
    
    const totalValue = movements.reduce((sum, m) => sum + (m.quantity * m.unit_cost), 0);
    
    return { totalIn, totalOut, totalValue, netMovement: totalIn - totalOut };
  };

  const stats = getMovementStats();

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
            <Activity className="w-8 h-8 text-blue-500" />
            <span>Stock Movement Tracker</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time inventory movement monitoring</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-500 to-purple-600"
            onClick={handleCreateMovement}
          >
            <Plus className="w-4 h-4 mr-2" />
            Record Movement
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Stock In</p>
                <p className="text-white text-2xl font-bold">{stats.totalIn.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <ArrowUpRight className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 border-0 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium mb-1">Stock Out</p>
                <p className="text-white text-2xl font-bold">{stats.totalOut.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <ArrowDownRight className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Net Movement</p>
                <p className="text-white text-2xl font-bold">
                  {stats.netMovement > 0 ? '+' : ''}{stats.netMovement.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Value</p>
                <p className="text-white text-2xl font-bold">₹{(stats.totalValue / 1000).toFixed(1)}K</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search movements..."
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Movement Types</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
            <option value="transfer">Transfer</option>
            <option value="adjustment">Adjustment</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="return">Return</option>
            <option value="damage">Damage/Loss</option>
          </select>
          
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Warehouses</option>
            {/* Warehouses will be loaded dynamically */}
          </select>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="">All Time</option>
          </select>
        </div>
      </motion.div>

      {/* Movements List */}
      <AnimatePresence>
        {movements.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {movements.map((movement, index) => (
              <MovementCard
                key={movement.id}
                movement={movement}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No movements found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">No stock movements match your current filters</p>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600"
              onClick={handleCreateMovement}
            >
              <Plus className="w-4 h-4 mr-2" />
              Record First Movement
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Movement Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowCreateModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Stock Movement</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Add or remove inventory</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-6">
                    {/* Movement Type Selection */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Movement Type *</label>
                      <select
                        value={formData.movement_type}
                        onChange={(e) => handleInputChange('movement_type', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="in">Stock In - Initial inventory entry</option>
                        <option value="out">Stock Out - General removal</option>
                        <option value="purchase">Purchase - From supplier</option>
                        <option value="sale">Sale - To customer</option>
                        <option value="return">Return - Customer/Supplier return</option>
                        <option value="transfer">Transfer - Between warehouses</option>
                        <option value="adjustment">Adjustment - Stock correction</option>
                        <option value="damage">Damage/Loss - Damaged items</option>
                        <option value="production">Production - Manufacturing output</option>
                      </select>
                    </div>

                    {/* Basic Fields - Always Required */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product *</label>
                        <select
                          value={formData.product}
                          onChange={(e) => handleInputChange('product', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map((product: any) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.product_code})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Warehouse - Conditional for Transfer */}
                      {formData.movement_type === 'transfer' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Warehouse *</label>
                            <select
                              value={formData.warehouse}
                              onChange={(e) => handleInputChange('warehouse', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              <option value="">Select Source Warehouse</option>
                              {warehouses.map((warehouse: any) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Warehouse *</label>
                            <select
                              value={formData.destination_warehouse}
                              onChange={(e) => handleInputChange('destination_warehouse', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              required
                            >
                              <option value="">Select Destination Warehouse</option>
                              {warehouses.map((warehouse: any) => (
                                <option key={warehouse.id} value={warehouse.id}>
                                  {warehouse.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warehouse *</label>
                          <select
                            value={formData.warehouse}
                            onChange={(e) => handleInputChange('warehouse', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select Warehouse</option>
                            {warehouses.map((warehouse: any) => (
                              <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Quantity - Label changes for adjustment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {formData.movement_type === 'adjustment' ? 'Quantity Difference *' : 'Quantity *'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.quantity}
                          onChange={(e) => handleInputChange('quantity', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={formData.movement_type === 'adjustment' ? '+/- quantity' : 'Enter quantity'}
                          required
                        />
                      </div>

                      {/* Unit Cost - Not required for adjustments */}
                      {formData.movement_type !== 'adjustment' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit Cost *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.unit_cost}
                              onChange={(e) => handleInputChange('unit_cost', e.target.value)}
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Movement Type Specific Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      {/* Purchase - PO Number */}
                      {formData.movement_type === 'purchase' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PO Number</label>
                          <input
                            type="text"
                            value={formData.reference_number}
                            onChange={(e) => handleInputChange('reference_number', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Purchase order number"
                          />
                        </div>
                      )}

                      {/* Sale - Invoice Number */}
                      {formData.movement_type === 'sale' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
                          <input
                            type="text"
                            value={formData.reference_number}
                            onChange={(e) => handleInputChange('reference_number', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Invoice number"
                          />
                        </div>
                      )}

                      {/* Return - Original Reference */}
                      {formData.movement_type === 'return' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Original Reference</label>
                          <input
                            type="text"
                            value={formData.reference_number}
                            onChange={(e) => handleInputChange('reference_number', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Original invoice/PO number"
                          />
                        </div>
                      )}

                      {/* Adjustment - Reason */}
                      {formData.movement_type === 'adjustment' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Reason *</label>
                          <select
                            value={formData.adjustment_reason}
                            onChange={(e) => handleInputChange('adjustment_reason', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select Reason</option>
                            <option value="cycle_count">Cycle Count</option>
                            <option value="physical_audit">Physical Audit</option>
                            <option value="system_error">System Error</option>
                            <option value="damaged_found">Damaged Items Found</option>
                            <option value="expired_items">Expired Items</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}

                      {/* Damage - Damage Reason */}
                      {formData.movement_type === 'damage' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Damage Reason *</label>
                          <select
                            value={formData.damage_reason}
                            onChange={(e) => handleInputChange('damage_reason', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select Reason</option>
                            <option value="physical_damage">Physical Damage</option>
                            <option value="expired">Expired</option>
                            <option value="theft">Theft</option>
                            <option value="lost">Lost</option>
                            <option value="quality_issue">Quality Issue</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}

                      {/* Production - Work Order */}
                      {formData.movement_type === 'production' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work Order Number</label>
                          <input
                            type="text"
                            value={formData.reference_number}
                            onChange={(e) => handleInputChange('reference_number', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Work order number"
                          />
                        </div>
                      )}

                      {/* Batch Number - Only for incoming stock */}
                      {['purchase', 'in', 'return', 'production'].includes(formData.movement_type) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Batch Number</label>
                          <input
                            type="text"
                            value={formData.batch_number}
                            onChange={(e) => handleInputChange('batch_number', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Batch/Lot number"
                          />
                        </div>
                      )}

                      {/* Expiry Date - Only for incoming stock */}
                      {['purchase', 'in', 'return', 'production'].includes(formData.movement_type) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                          <input
                            type="date"
                            value={formData.expiry_date}
                            onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes or comments"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Recording...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Record Movement
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
    </div>
  );
};

export default StockMovementTracker;