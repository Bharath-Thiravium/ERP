import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    loadBundles();
    loadProducts();
  }, []);

  const loadBundles = async () => {
    try {
      setLoading(true);
      const response = await inventoryApi.getProductBundles();
      setBundles(response.results || []);
    } catch (error: any) {
      toast.error('Failed to load product bundles');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await inventoryApi.getProducts();
      setProducts(response.results || []);
    } catch (error: any) {
      console.error('Failed to load products:', error);
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
      p.product.id === productId ? { ...p, quantity } : p
    ));
  };

  const columns = [
    {
      key: 'bundle_name',
      header: 'Bundle Name',
      render: (bundle: ProductBundle) => (
        <div>
          <div className="font-medium">{bundle.bundle_name}</div>
          <div className="text-sm text-gray-500">{bundle.bundle_code}</div>
        </div>
      )
    },
    {
      key: 'bundle_price',
      header: 'Price',
      render: (bundle: ProductBundle) => (
        <div className="text-right">
          <div className="font-medium">₹{bundle.bundle_price?.toLocaleString() || 0}</div>
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
        <span className="font-medium">{bundle.bundle_items?.length || 0} items</span>
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
      render: () => (
        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
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
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Bundle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Bundles</p>
              <p className="text-2xl font-bold text-gray-900">{bundles.length}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Bundles</p>
              <p className="text-2xl font-bold text-green-600">
                {bundles.filter(b => b.is_active).length}
              </p>
            </div>
            <Package className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-purple-600">
                ₹{bundles.reduce((sum, b) => sum + (b.bundle_price || 0), 0).toLocaleString()}
              </p>
            </div>
            <Package className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Margin</p>
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

      <Card className="p-6">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Name *
              </label>
              <input
                type="text"
                value={formData.bundle_name}
                onChange={(e) => setFormData({...formData, bundle_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter bundle name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Price
              </label>
              <input
                type="number"
                value={formData.bundle_price}
                onChange={(e) => setFormData({...formData, bundle_price: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Bundle description"
            />
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Products to Bundle
            </label>
            <div className="border border-gray-300 rounded-lg p-4 max-h-60 overflow-y-auto">
              {products.slice(0, 10).map(product => (
                <div key={product.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.product_code}</div>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bundle Items ({selectedProducts.length})
              </label>
              <div className="space-y-2">
                {selectedProducts.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.product.name}</div>
                      <div className="text-sm text-gray-500">{item.product.product_code}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateProductQuantity(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        min="1"
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
    </div>
  );
};