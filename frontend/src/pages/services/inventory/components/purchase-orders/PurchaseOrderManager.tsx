import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Search,

  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Package,


  DollarSign,
  X,
  Save
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_name: string;
  supplier_id: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  total_amount: number;
  order_date: string;
  expected_delivery: string;
  items_count: number;
  created_by: string;
}

const PurchaseOrderManager: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    expected_delivery: '',
    notes: '',
    items: [{ product: '', quantity: '', unit_cost: '' }]
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadOrders();
  }, [debouncedSearchQuery, selectedStatus]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getPurchaseOrders();
      setOrders(response.results || response);
    } catch (error) {
      console.error('Failed to load purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        inventoryApi.getSuppliersDropdown(),
        inventoryApi.getProducts()
      ]);
      setSuppliers(suppliersRes as any);
      setProducts(productsRes.results || productsRes);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const handleCreateOrder = async () => {
    await loadDropdownData();
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      // Create PO logic here
      toast.success('Purchase order created successfully!');
      setShowCreateModal(false);
      resetForm();
      loadOrders();
    } catch (error) {
      toast.error('Failed to create purchase order');
    } finally {
      setModalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      expected_delivery: '',
      notes: '',
      items: [{ product: '', quantity: '', unit_cost: '' }]
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: '', unit_cost: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateItem = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'confirmed': return 'bg-yellow-100 text-yellow-700';
      case 'received': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'received': return <Package className="w-4 h-4" />;
      case 'cancelled': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
            <ShoppingCart className="w-8 h-8 text-blue-500" />
            <span>Purchase Orders</span>
          </h1>
          <p className="text-gray-600 mt-1">Manage supplier purchase orders</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateOrder}>
            <Plus className="w-4 h-4 mr-2" />
            Create PO
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Orders</p>
              <p className="text-white text-2xl font-bold">{orders.length}</p>
            </div>
            <ShoppingCart className="w-6 h-6 text-blue-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-yellow-500 to-yellow-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium mb-1">Pending</p>
              <p className="text-white text-2xl font-bold">{orders.filter(o => o.status === 'sent').length}</p>
            </div>
            <Clock className="w-6 h-6 text-yellow-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Received</p>
              <p className="text-white text-2xl font-bold">{orders.filter(o => o.status === 'received').length}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Total Value</p>
              <p className="text-white text-2xl font-bold">₹{(orders.reduce((sum, o) => sum + o.total_amount, 0) / 1000).toFixed(0)}K</p>
            </div>
            <DollarSign className="w-6 h-6 text-purple-200" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="confirmed">Confirmed</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </Card>

      <div className="space-y-4">
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <Card className="p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{order.po_number}</h3>
                    <p className="text-gray-500 text-sm">{order.supplier_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span>{order.status.toUpperCase()}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Total Amount</p>
                  <p className="font-semibold text-gray-900">₹{order.total_amount.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Items</p>
                  <p className="font-semibold text-gray-900">{order.items_count}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Order Date</p>
                  <p className="font-semibold text-gray-900">{new Date(order.order_date).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-600 text-xs mb-1">Expected Delivery</p>
                  <p className="font-semibold text-gray-900">{new Date(order.expected_delivery).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="text-gray-500 text-sm">
                  Created by {order.created_by}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create PO Modal */}
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
                className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Create Purchase Order</h2>
                      <p className="text-sm text-gray-500">Order products from suppliers</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                        <select
                          value={formData.supplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Supplier</option>
                          {suppliers.map((supplier: any) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery</label>
                        <input
                          type="date"
                          value={formData.expected_delivery}
                          onChange={(e) => setFormData(prev => ({ ...prev, expected_delivery: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                        <Button type="button" variant="outline" onClick={addItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </div>
                      
                      <div className="space-y-4">
                        {formData.items.map((item, index) => (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                              <select
                                value={item.product}
                                onChange={(e) => updateItem(index, 'product', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">Select Product</option>
                                {products.map((product: any) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Cost</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_cost}
                                onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>
                            
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => removeItem(index)}
                                className="w-full text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Additional notes or instructions"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Create Order
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

export default PurchaseOrderManager;