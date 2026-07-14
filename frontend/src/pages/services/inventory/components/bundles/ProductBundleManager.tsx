import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Plus, Edit, Trash2, Eye, X } from 'lucide-react';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { DataTable } from '../../../../../components/ui/DataTable';
import { Modal } from '../../../../../components/ui/Modal';
import { inventoryApi } from '../../utils/inventoryApi';
import type { ProductBundle, Product } from '../../types/inventoryTypes';
import toast from 'react-hot-toast';

export const ProductBundleManager: React.FC = () => {
  const [bundles, setBundles] = useState<ProductBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    bundle_name: '',
    description: '',
    bundle_price: 0,
    discount_percentage: 0,
    bundle_items: [] as any[]
  });
  const [selectedProducts, setSelectedProducts] = useState<any[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ProductBundle | null>(null);

  useEffect(() => {
    loadBundles();
    loadProducts();
  }, []);

  const loadBundles = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getProductBundles();
      setBundles(response.results || response || []);
    } catch (error: any) {
      toast.error('Failed to load product bundles');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await inventoryApi.getProducts();
      const productList = response.results || response || [];
      setProducts(productList);
      return productList;
    } catch (error: any) {
      console.error('Failed to load products:', error);
      return [];
    }
  };

  const handleCreateBundle = async () => {
    try {
      if (!formData.bundle_name.trim()) {
        toast.error('Bundle name is required');
        return;
      }
      
      if (selectedProducts.length === 0) {
        toast.error('Please add at least one product to the bundle');
        return;
      }

      const bundleData = {
        ...formData,
        bundle_items: selectedProducts.map(p => ({
          product: p.product.id,
          quantity: p.quantity,
          unit_price_override: p.unit_price_override || null
        }))
      };

      await inventoryApi.createProductBundle(bundleData);
      toast.success('Product bundle created successfully');
      setShowCreateModal(false);
      resetForm();
      loadBundles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create bundle');
    }
  };

  const resetForm = () => {
    setFormData({
      bundle_name: '',
      description: '',
      bundle_price: 0,
      discount_percentage: 0,
      bundle_items: []
    });
    setSelectedProducts([]);
  };

  const handleViewBundle = (bundle: ProductBundle) => {
    setSelectedBundle(bundle);
    setShowViewModal(true);
  };

  const handleEditBundle = async (bundle: ProductBundle) => {
    setSelectedBundle(bundle);
    const productList = await loadProducts();
    const bundleProducts = (bundle.bundle_items || []).map((item: any) => {
      const product = productList.find((p: Product) => p.id === item.product);
      return {
        product: product || {
          id: item.product,
          name: item.product_name,
          product_code: '',
          cost_price: 0,
          selling_price: item.effective_price || 0
        },
        quantity: Number(item.quantity) || 1,
        unit_price_override: item.unit_price_override || null
      };
    });
    setFormData({
      bundle_name: bundle.bundle_name,
      description: bundle.description || '',
      bundle_price: bundle.bundle_price || 0,
      discount_percentage: bundle.discount_percentage || 0,
      bundle_items: bundle.bundle_items || []
    });
    setSelectedProducts(bundleProducts);
    setShowEditModal(true);
  };

  const handleDeleteBundle = async (bundleId: number) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return;
    
    try {
      await inventoryApi.deleteProductBundle(bundleId);
      toast.success('Bundle deleted successfully!');
      loadBundles();
    } catch (error) {
      toast.error('Failed to delete bundle');
    }
  };

  const handleUpdateBundle = async () => {
    if (!selectedBundle) return;
    
    try {
      if (!formData.bundle_name.trim()) {
        toast.error('Bundle name is required');
        return;
      }

      if (selectedProducts.length === 0) {
        toast.error('Please add at least one product to the bundle');
        return;
      }

      const bundleData = {
        ...formData,
        bundle_items: selectedProducts.map(p => ({
          product: p.product.id,
          quantity: p.quantity,
          unit_price_override: p.unit_price_override || null
        }))
      };

      await inventoryApi.updateProductBundle(selectedBundle.id, bundleData);
      toast.success('Bundle updated successfully!');
      setShowEditModal(false);
      setSelectedBundle(null);
      resetForm();
      loadBundles();
    } catch (error) {
      toast.error('Failed to update bundle');
    }
  };

  const addProductToBundle = (product: Product) => {
    if (selectedProducts.find(p => p.product.id === product.id)) {
      toast.error('Product already added to bundle');
      return;
    }
    
    setSelectedProducts([...selectedProducts, {
      product,
      quantity: 1,
      unit_price_override: null
    }]);
  };

  const removeProductFromBundle = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.product.id !== productId));
  };

  const updateProductQuantity = (productId: number, quantity: number) => {
    setSelectedProducts(selectedProducts.map(p => 
      p.product.id === productId ? { ...p, quantity: Math.max(1, quantity) } : p
    ));
  };

  const updateProductOverride = (productId: number, value: string) => {
    const parsed = value === '' ? null : parseFloat(value);
    setSelectedProducts(selectedProducts.map(p =>
      p.product.id === productId ? { ...p, unit_price_override: Number.isFinite(parsed) ? parsed : null } : p
    ));
  };

  const selectedCost = selectedProducts.reduce((sum, item) => {
    return sum + (Number(item.product.cost_price || 0) * Number(item.quantity || 0));
  }, 0);

  const selectedSellingValue = selectedProducts.reduce((sum, item) => {
    const price = item.unit_price_override ?? item.product.selling_price ?? 0;
    return sum + (Number(price) * Number(item.quantity || 0));
  }, 0);

  const columns = [
    {
      key: 'bundle_name',
      header: 'Bundle Name',
      render: (bundle: ProductBundle) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{bundle.bundle_name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{bundle.bundle_code}</div>
        </div>
      )
    },
    {
      key: 'bundle_price',
      header: 'Price',
      render: (bundle: ProductBundle) => (
        <div className="text-right">
          <div className="font-medium text-gray-900 dark:text-white">₹{bundle.bundle_price?.toLocaleString() || 0}</div>
          {bundle.discount_percentage > 0 && (
            <div className="text-sm text-green-600">{bundle.discount_percentage}% discount</div>
          )}
        </div>
      )
    },
    {
      key: 'items_count',
      header: 'Items',
      render: (bundle: ProductBundle) => (
        <span className="font-medium text-gray-900 dark:text-white">{bundle.bundle_items?.length || 0} items</span>
      )
    },
    {
      key: 'profit_margin',
      header: 'Margin',
      render: (bundle: ProductBundle) => (
        <span className={`font-medium ${(bundle.profit_margin || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {(bundle.profit_margin || 0).toFixed(1)}%
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (bundle: ProductBundle) => (
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={() => handleViewBundle(bundle)}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleEditBundle(bundle)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDeleteBundle(bundle.id)} className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Product Bundles</h2>
          <p className="text-gray-600 dark:text-gray-400">Create and manage product bundles and kits</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bundles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{bundles.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bundles</p>
              <p className="text-2xl font-bold text-green-600">
                {bundles.filter(b => b.is_active).length}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{bundles.reduce((sum, b) => sum + (b.bundle_price || 0), 0).toLocaleString()}
              </p>
            </div>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Margin</p>
              <p className="text-2xl font-bold text-orange-600">
                {bundles.length > 0 
                  ? (bundles.reduce((sum, b) => sum + (b.profit_margin || 0), 0) / bundles.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <Package className="w-8 h-8 text-orange-600" />
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <DataTable
          data={bundles}
          columns={columns}
          loading={loading}
          emptyMessage="No product bundles found. Create your first bundle to get started."
        />
      </Card>

      {/* Create Bundle Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create Product Bundle"
        size="lg"
      >
        <div className="space-y-6">
          {/* Bundle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bundle Name *
              </label>
              <input
                type="text"
                value={formData.bundle_name}
                onChange={(e) => setFormData({...formData, bundle_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter bundle name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bundle Price
              </label>
              <input
                type="number"
                value={formData.bundle_price}
                onChange={(e) => setFormData({...formData, bundle_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
              />
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              Items selling value: ₹{selectedSellingValue.toLocaleString()}<br />
              Items cost: ₹{selectedCost.toLocaleString()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Bundle description"
            />
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Products to Bundle
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto bg-white dark:bg-gray-700">
              {products.slice(0, 10).map(product => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-600 last:border-b-0">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{product.product_code}</div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addProductToBundle(product)}
                    disabled={selectedProducts.find(p => p.product.id === product.id)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Products */}
          {selectedProducts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bundle Items ({selectedProducts.length})
              </label>
              <div className="space-y-2">
                {selectedProducts.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">{item.product.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.product.product_code}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        Qty
                      </div>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateProductQuantity(item.product.id, parseFloat(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        min="1"
                      />
                      <input
                        type="number"
                        value={item.unit_price_override ?? ''}
                        onChange={(e) => updateProductOverride(item.product.id, e.target.value)}
                        className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Override ₹"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeProductFromBundle(item.product.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              onClick={handleCreateBundle}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Create Bundle
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Bundle Modal */}
      <AnimatePresence>
        {showViewModal && selectedBundle && (
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
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bundle Details</h2>
                  <button onClick={() => setShowViewModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-gray-900 dark:text-white"><strong>Bundle Name:</strong> {selectedBundle.bundle_name}</div>
                    <div className="text-gray-900 dark:text-white"><strong>Bundle Code:</strong> {selectedBundle.bundle_code}</div>
                    <div className="text-gray-900 dark:text-white"><strong>Price:</strong> ₹{selectedBundle.bundle_price?.toLocaleString() || 0}</div>
                    <div className="text-gray-900 dark:text-white"><strong>Discount:</strong> {selectedBundle.discount_percentage || 0}%</div>
                    <div className="text-gray-900 dark:text-white"><strong>Items:</strong> {selectedBundle.bundle_items?.length || 0}</div>
                    <div className="text-gray-900 dark:text-white"><strong>Profit Margin:</strong> {(selectedBundle.profit_margin || 0).toFixed(1)}%</div>
                  </div>
                  {selectedBundle.description && (
                    <div className="text-gray-900 dark:text-white"><strong>Description:</strong> {selectedBundle.description}</div>
                  )}
                  {selectedBundle.bundle_items?.length > 0 && (
                    <div>
                      <strong className="text-gray-900 dark:text-white">Bundle Items</strong>
                      <div className="mt-2 space-y-2">
                        {selectedBundle.bundle_items.map((item: any) => (
                          <div key={item.id || item.product} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-700">
                            <span className="text-gray-900 dark:text-white">{item.product_name}</span>
                            <span className="text-gray-600 dark:text-gray-300">
                              Qty {item.quantity} • ₹{Number(item.line_total || 0).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Bundle Modal */}
      <AnimatePresence>
        {showEditModal && selectedBundle && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowEditModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Bundle</h2>
                  <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bundle Name *
                      </label>
                      <input
                        type="text"
                        value={formData.bundle_name}
                        onChange={(e) => setFormData({...formData, bundle_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bundle Price
                      </label>
                      <input
                        type="number"
                        value={formData.bundle_price}
                        onChange={(e) => setFormData({...formData, bundle_price: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      Items selling value: ₹{selectedSellingValue.toLocaleString()}<br />
                      Items cost: ₹{selectedCost.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bundle Items ({selectedProducts.length})
                    </label>
                    <div className="space-y-2">
                      {selectedProducts.map(item => (
                        <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{item.product.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{item.product.product_code}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateProductQuantity(item.product.id, parseFloat(e.target.value) || 1)}
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              min="1"
                            />
                            <input
                              type="number"
                              value={item.unit_price_override ?? ''}
                              onChange={(e) => updateProductOverride(item.product.id, e.target.value)}
                              className="w-28 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              placeholder="Override ₹"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeProductFromBundle(item.product.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Add More Products
                    </label>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
                      {products
                        .filter(product => !selectedProducts.find(item => item.product.id === product.id))
                        .slice(0, 10)
                        .map(product => (
                          <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-600 last:border-b-0">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{product.product_code}</div>
                            </div>
                            <Button size="sm" onClick={() => addProductToBundle(product)}>
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedBundle(null);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpdateBundle}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Update Bundle
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
