import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  QrCode,
  Download,
  Upload,
  Brain,
  ShoppingCart,
  X,
  Save,
  AlertCircle,
  Barcode,
  Calculator,
  Warehouse
} from 'lucide-react';
import { inventoryApi } from '../../utils/inventoryApi';
import type { Product, Category, Supplier } from '../../types/inventoryTypes';
import { Card } from '../../../../../components/ui/Card';
import { Button } from '../../../../../components/ui/Button';
import { LoadingSpinner } from '../../../../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// Ensure toast.info is available
// Toast info method extension
const toastInfo = (message: string) => toast(message, { icon: 'ℹ️' });

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

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: number) => void;
  onView: (product: Product) => void;
  onManage: (product: Product) => void;
  onGenerateBarcode: (id: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onDelete, onView, onManage }) => {
  const getStockStatusColor = () => {
    if (product.current_stock <= 0) return 'text-red-500 bg-red-50 border-red-200';
    if (product.is_low_stock) return 'text-orange-500 bg-orange-50 border-orange-200';
    return 'text-green-500 bg-green-50 border-green-200';
  };

  const getStockStatusText = () => {
    if (product.current_stock <= 0) return 'Out of Stock';
    if (product.is_low_stock) return 'Low Stock';
    return 'In Stock';
  };

  const getABCColor = (classification: string) => {
    switch (classification) {
      case 'A': return 'bg-green-100 text-green-700 border-green-200';
      case 'B': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'C': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="group"
    >
      <Card className="p-6 hover:shadow-xl transition-all duration-300 border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors">
                {product.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{product.product_code}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getABCColor(product.abc_classification)}`}>
              {product.abc_classification}
            </span>
            {product.needs_reorder && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="p-1 bg-red-100 rounded-full"
              >
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Product Image */}
        {product.primary_image && (
          <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={product.primary_image}
              alt={product.name}
              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
            <p className="text-blue-600 font-bold text-lg">{product.current_stock || 0}</p>
            <p className="text-blue-500 text-xs">Current Stock</p>
          </div>
          <div className="text-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <p className="text-green-600 font-bold text-lg">₹{product.stock_value ? (product.stock_value / 1000).toFixed(1) : '0.0'}K</p>
            <p className="text-green-500 text-xs">Stock Value</p>
          </div>
        </div>

        {/* Stock Status */}
        <div className={`flex items-center justify-center space-x-2 p-2 rounded-lg border mb-4 ${getStockStatusColor()}`}>
          <div className={`w-2 h-2 rounded-full ${
            product.current_stock <= 0 ? 'bg-red-500' :
            product.is_low_stock ? 'bg-orange-500' : 'bg-green-500'
          }`} />
          <span className="text-sm font-medium">{getStockStatusText()}</span>
        </div>

        {/* Product Details */}
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Category:</span>
            <span className="font-medium text-gray-900 dark:text-white">{product.category_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Selling Price:</span>
            <span className="font-medium text-gray-900 dark:text-white">₹{product.selling_price}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Supplier:</span>
            <span className="font-medium text-gray-900 dark:text-white">{product.supplier_name || 'N/A'}</span>
          </div>
          {product.barcode && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Barcode:</span>
              <span className="font-mono text-xs text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{product.barcode}</span>
            </div>
          )}
        </div>

        {/* AI Insights */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <span className="text-purple-700 font-medium text-sm">AI Insights</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center">
              <p className="font-bold text-purple-600">{product.demand_forecast || '0'}</p>
              <p className="text-purple-500">Forecast</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-purple-600">{product.seasonality_factor ? (product.seasonality_factor * 100).toFixed(0) : '0'}%</p>
              <p className="text-purple-500">Seasonality</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(product)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(product)}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(product.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

          </div>
          
          <Button
            size="sm"
            onClick={() => onManage(product)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            Manage
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [modalLoading, setModalLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Form data for add product
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    product_type: 'finished_good',
    description: '',
    cost_price: '',
    selling_price: '',
    mrp: '',
    hsn_code: '',
    tax_rate: '18',
    tracking_method: 'none',
    min_stock_level: '10',
    max_stock_level: '1000',
    reorder_point: '20',
    reorder_quantity: '100',
    weight: '0',
    primary_supplier: '',
    barcode: '',
    is_active: true
  });

  // Debounced search function
  const debouncedLoadProducts = useCallback(
    debounce((query: string, category: string, type: string, lowStock: boolean) => {
      loadProductsWithParams(query, category, type, lowStock);
    }, 300),
    []
  );

  useEffect(() => {
    loadCategories();
    loadProductsWithParams('', '', '', false); // Initial load
  }, []);

  useEffect(() => {
    if (searchQuery || selectedCategory || selectedType || showLowStock) {
      debouncedLoadProducts(searchQuery, selectedCategory, selectedType, showLowStock);
    }
  }, [searchQuery, selectedCategory, selectedType, showLowStock, debouncedLoadProducts]);

  useEffect(() => {
    if (showAddModal) {
      loadDropdownData();
    }
  }, [showAddModal]);

  const loadProductsWithParams = async (query: string, category: string, type: string, lowStock: boolean) => {
    try {
      setLoading(true);
      const params: any = {};
      if (query.trim()) params.search = query.trim();
      if (category) params.category = category;
      if (type) params.product_type = type;
      if (lowStock) params.low_stock = 'true';

      const response = await inventoryApi.getProducts(params);
      setProducts(response.results || response);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = () => {
    loadProductsWithParams(searchQuery, selectedCategory, selectedType, showLowStock);
  };

  const loadCategories = async () => {
    try {
      const response = await inventoryApi.getCategoriesDropdown();
      setCategories(response);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [categoriesRes, suppliersRes] = await Promise.all([
        inventoryApi.getCategoriesDropdown(),
        inventoryApi.getSuppliersDropdown(),

      ]);
      
      setCategories(categoriesRes);
      setSuppliers(suppliersRes);
      // setWarehouses(warehousesRes);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleEdit = async (product: Product) => {
    setSelectedProduct(product);
    
    // Load dropdown data first
    await loadDropdownData();
    
    // Get the actual product details to populate form
    try {
      const productDetails = await inventoryApi.getProduct(product.id);
      
      setFormData({
        name: productDetails.name || '',
        category: productDetails.category?.toString() || '',
        product_type: productDetails.product_type || 'finished_good',
        description: productDetails.description || '',
        cost_price: productDetails.cost_price?.toString() || '0',
        selling_price: productDetails.selling_price?.toString() || '0',
        mrp: productDetails.mrp?.toString() || '0',
        hsn_code: productDetails.hsn_code || '',
        tax_rate: productDetails.tax_rate?.toString() || '18',
        tracking_method: productDetails.tracking_method || 'none',
        min_stock_level: productDetails.min_stock_level?.toString() || '10',
        max_stock_level: productDetails.max_stock_level?.toString() || '1000',
        reorder_point: productDetails.reorder_point?.toString() || '20',
        reorder_quantity: productDetails.reorder_quantity?.toString() || '100',
        weight: productDetails.weight?.toString() || '0',
        primary_supplier: productDetails.primary_supplier?.toString() || '',
        barcode: productDetails.barcode || '',
        is_active: productDetails.is_active ?? true
      });
    } catch (error) {
      console.error('Failed to load product details:', error);
      toast.error('Failed to load product details');
    }
    
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await inventoryApi.deleteProduct(id);
        toast.success('Product deleted successfully!');
        loadProducts();
      } catch (error) {
        console.error('Failed to delete product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const handleView = (product: Product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const handleManage = (product: Product) => {
    setSelectedProduct(product);
    setShowManageModal(true);
  };

  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceData, setBulkPriceData] = useState({
    price_type: 'cost_price',
    adjustment_type: 'percentage',
    adjustment_value: '0'
  });

  const handleBulkAction = (action: string) => {
    if (action === 'update_prices') {
      setShowBulkPriceModal(true);
    } else if (action === 'generate_barcodes') {
      handleBulkBarcodeGeneration();
    } else {
      toastInfo(`${action} functionality coming soon!`);
    }
  };

  const handleBulkBarcodeGeneration = async () => {
    try {
      setModalLoading(true);
      const productIds = products.map(p => p.id);
      await Promise.all(productIds.map(id => inventoryApi.generateBarcode(id)));
      toast.success('Barcodes generated for all products!');
      loadProducts();
    } catch (error) {
      console.error('Failed to generate barcodes:', error);
      toast.error('Failed to generate barcodes');
    } finally {
      setModalLoading(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    try {
      setModalLoading(true);
      const productIds = products.map(p => p.id);
      await inventoryApi.bulkUpdateProducts(productIds, {



      });
      toast.success('Prices updated successfully!');
      setShowBulkPriceModal(false);
      loadProducts();
    } catch (error) {
      console.error('Failed to update prices:', error);
      toast.error('Failed to update prices');
    } finally {
      setModalLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.cost_price || parseFloat(formData.cost_price) < 0) {
      newErrors.cost_price = 'Valid cost price is required';
    }

    if (!formData.selling_price || parseFloat(formData.selling_price) < 0) {
      newErrors.selling_price = 'Valid selling price is required';
    }

    if (parseFloat(formData.selling_price) < parseFloat(formData.cost_price)) {
      newErrors.selling_price = 'Selling price should be greater than cost price';
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
      const productData = {
        ...formData,
        category: parseInt(formData.category),
        primary_supplier: formData.primary_supplier ? parseInt(formData.primary_supplier) : null,
        cost_price: parseFloat(formData.cost_price),
        selling_price: parseFloat(formData.selling_price),
        mrp: formData.mrp ? parseFloat(formData.mrp) : parseFloat(formData.selling_price),
        tax_rate: parseFloat(formData.tax_rate),
        min_stock_level: parseFloat(formData.min_stock_level),
        max_stock_level: parseFloat(formData.max_stock_level),
        reorder_point: parseFloat(formData.reorder_point),
        reorder_quantity: parseFloat(formData.reorder_quantity),
        weight: parseFloat(formData.weight)
      };

      if (selectedProduct) {
        await inventoryApi.updateProduct(selectedProduct.id, productData as Partial<Product>);
        toast.success('Product updated successfully!');
        setShowEditModal(false);
      } else {
        await inventoryApi.createProduct(productData as Partial<Product>);
        toast.success('Product created successfully!');
        setShowAddModal(false);
      }
      resetForm();
      loadProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      const message = error.response?.data?.error || 'Failed to save product';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      product_type: 'finished_good',
      description: '',
      cost_price: '',
      selling_price: '',
      mrp: '',
      hsn_code: '',
      tax_rate: '18',
      tracking_method: 'none',
      min_stock_level: '10',
      max_stock_level: '1000',
      reorder_point: '20',
      reorder_quantity: '100',
      weight: '0',
      primary_supplier: '',
      barcode: '',
      is_active: true
    });
    setSelectedProduct(null);
    setErrors({});
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateBarcode = () => {
    const barcode = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    handleInputChange('barcode', barcode);
    toast.success('Barcode generated!');
  };

  const handleGenerateProductBarcode = async (productId: number) => {
    try {
      const response = await inventoryApi.generateBarcode(productId);
      toast.success('Barcode generated successfully!');
      
      // Update form data if editing this product
      if (selectedProduct && selectedProduct.id === productId) {
        setFormData(prev => ({ ...prev, barcode: response.barcode }));
      }
      
      loadProducts();
    } catch (error) {
      console.error('Failed to generate barcode:', error);
      toast.error('Failed to generate barcode');
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <Package className="w-8 h-8 text-blue-500" />
            <span>Product Management</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your product catalog with AI insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button 
            className="bg-gradient-to-r from-blue-500 to-purple-600"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </motion.div>

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
              placeholder="Search products..."
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="finished_good">Finished Good</option>
            <option value="raw_material">Raw Material</option>
            <option value="semi_finished">Semi-Finished</option>
            <option value="consumable">Consumable</option>
          </select>
          
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => setShowLowStock(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Low Stock Only</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4"
      >
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {products.length} products found
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('update_prices')}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Bulk Price Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('generate_barcodes')}
            >
              <QrCode className="w-4 h-4 mr-1" />
              Generate Barcodes
            </Button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <Package className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Products Grid */}
      <AnimatePresence>
        {products.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
                onManage={handleManage}
                onGenerateBarcode={handleGenerateProductBarcode}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Get started by adding your first product</p>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-600"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Product
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
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
                className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Add New Product
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Create a new product in your inventory
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
                        <Package className="h-5 w-5 text-blue-500" />
                        <span>Basic Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter product name"
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
                            Category *
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          {errors.category && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.category}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product Type
                          </label>
                          <select
                            value={formData.product_type}
                            onChange={(e) => handleInputChange('product_type', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="finished_good">Finished Good</option>
                            <option value="raw_material">Raw Material</option>
                            <option value="semi_finished">Semi-Finished</option>
                            <option value="consumable">Consumable</option>
                            <option value="service">Service</option>
                            <option value="digital">Digital Product</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Primary Supplier
                          </label>
                          <select
                            value={formData.primary_supplier}
                            onChange={(e) => handleInputChange('primary_supplier', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Supplier (Optional)</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter product description"
                        />
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Calculator className="h-5 w-5 text-green-500" />
                        <span>Pricing Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cost Price *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.cost_price}
                              onChange={(e) => handleInputChange('cost_price', e.target.value)}
                              className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.cost_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.cost_price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.cost_price}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Selling Price *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.selling_price}
                              onChange={(e) => handleInputChange('selling_price', e.target.value)}
                              className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.selling_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.selling_price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.selling_price}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MRP
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.mrp}
                              onChange={(e) => handleInputChange('mrp', e.target.value)}
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            HSN/SAC Code
                          </label>
                          <input
                            type="text"
                            value={formData.hsn_code}
                            onChange={(e) => handleInputChange('hsn_code', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter HSN/SAC code"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.tax_rate}
                            onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Inventory Settings */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Warehouse className="h-5 w-5 text-purple-500" />
                        <span>Inventory Settings</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Min Stock Level
                          </label>
                          <input
                            type="number"
                            value={formData.min_stock_level}
                            onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Max Stock Level
                          </label>
                          <input
                            type="number"
                            value={formData.max_stock_level}
                            onChange={(e) => handleInputChange('max_stock_level', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="1000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reorder Point
                          </label>
                          <input
                            type="number"
                            value={formData.reorder_point}
                            onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reorder Quantity
                          </label>
                          <input
                            type="number"
                            value={formData.reorder_quantity}
                            onChange={(e) => handleInputChange('reorder_quantity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="100"
                          />
                        </div>
                      </div>

                      {/* Barcode Section */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Barcode
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={formData.barcode}
                            onChange={(e) => handleInputChange('barcode', e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter or generate barcode"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateBarcode}
                            className="px-4"
                          >
                            <Barcode className="h-4 w-4" />
                          </Button>
                        </div>
                        {formData.barcode && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm font-mono">
                            Barcode: {formData.barcode}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active Product
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
                          Create Product
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

      {/* Edit Product Modal */}
      <AnimatePresence>
        {showEditModal && selectedProduct && (
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
                className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Edit className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Edit Product
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update product information
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
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Package className="h-5 w-5 text-blue-500" />
                        <span>Basic Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                            placeholder="Enter product name"
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
                            Product Code
                          </label>
                          <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            {selectedProduct.product_code}
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Code cannot be changed after creation
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category *
                          </label>
                          <select
                            value={formData.category}
                            onChange={(e) => handleInputChange('category', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            <option value="">Select Category</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          {errors.category && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.category}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product Type
                          </label>
                          <select
                            value={formData.product_type}
                            onChange={(e) => handleInputChange('product_type', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="finished_good">Finished Good</option>
                            <option value="raw_material">Raw Material</option>
                            <option value="semi_finished">Semi-Finished</option>
                            <option value="consumable">Consumable</option>
                            <option value="service">Service</option>
                            <option value="digital">Digital Product</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Primary Supplier
                          </label>
                          <select
                            value={formData.primary_supplier}
                            onChange={(e) => handleInputChange('primary_supplier', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select Supplier (Optional)</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter product description"
                        />
                      </div>
                    </div>

                    {/* Pricing Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Calculator className="h-5 w-5 text-green-500" />
                        <span>Pricing Information</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cost Price *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.cost_price}
                              onChange={(e) => handleInputChange('cost_price', e.target.value)}
                              className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.cost_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.cost_price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.cost_price}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Selling Price *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.selling_price}
                              onChange={(e) => handleInputChange('selling_price', e.target.value)}
                              className={`w-full pl-8 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.selling_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {errors.selling_price && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-4 w-4" />
                              {errors.selling_price}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            MRP
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-3 text-gray-500">₹</span>
                            <input
                              type="number"
                              step="0.01"
                              value={formData.mrp}
                              onChange={(e) => handleInputChange('mrp', e.target.value)}
                              className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            HSN/SAC Code
                          </label>
                          <input
                            type="text"
                            value={formData.hsn_code}
                            onChange={(e) => handleInputChange('hsn_code', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter HSN/SAC code"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={formData.tax_rate}
                            onChange={(e) => handleInputChange('tax_rate', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="18.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Inventory Settings */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                        <Warehouse className="h-5 w-5 text-purple-500" />
                        <span>Inventory Settings</span>
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Min Stock Level
                          </label>
                          <input
                            type="number"
                            value={formData.min_stock_level}
                            onChange={(e) => handleInputChange('min_stock_level', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="10"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Max Stock Level
                          </label>
                          <input
                            type="number"
                            value={formData.max_stock_level}
                            onChange={(e) => handleInputChange('max_stock_level', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="1000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reorder Point
                          </label>
                          <input
                            type="number"
                            value={formData.reorder_point}
                            onChange={(e) => handleInputChange('reorder_point', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reorder Quantity
                          </label>
                          <input
                            type="number"
                            value={formData.reorder_quantity}
                            onChange={(e) => handleInputChange('reorder_quantity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="100"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Barcode
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={formData.barcode}
                            onChange={(e) => handleInputChange('barcode', e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter or generate barcode"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={generateBarcode}
                            className="px-4"
                          >
                            <Barcode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => handleInputChange('is_active', e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Active Product
                          </span>
                        </label>
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
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Update Product
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

      {/* View Product Modal */}
      <AnimatePresence>
        {showViewModal && selectedProduct && (
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
                className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Product Details
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedProduct.name}
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
                          Product Name
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedProduct.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Product Code
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedProduct.product_code}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Category
                        </label>
                        <p className="text-gray-900 dark:text-white">{selectedProduct.category_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Supplier
                        </label>
                        <p className="text-gray-900 dark:text-white">{selectedProduct.supplier_name || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cost Price
                        </label>
                        <p className="text-2xl font-bold text-red-600">₹{selectedProduct.cost_price}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Selling Price
                        </label>
                        <p className="text-2xl font-bold text-green-600">₹{selectedProduct.selling_price}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Stock
                        </label>
                        <p className="text-2xl font-bold text-blue-600">{selectedProduct.current_stock || 0}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Status
                      </label>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        selectedProduct.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          selectedProduct.is_active ? 'bg-green-500' : 'bg-gray-500'
                        }`} />
                        {selectedProduct.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      variant="outline"
                      onClick={() => handleEdit(selectedProduct)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Product
                    </Button>
                    <Button
                      onClick={() => setShowViewModal(false)}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
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

      {/* Manage Product Modal */}
      <AnimatePresence>
        {showManageModal && selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowManageModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Manage Stock
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedProduct.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowManageModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Stock Management</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Stock management functionality coming soon!</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-blue-600 font-bold text-lg">{selectedProduct.current_stock || 0}</p>
                        <p className="text-blue-500 text-sm">Current Stock</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-green-600 font-bold text-lg">{selectedProduct.min_stock_level || 0}</p>
                        <p className="text-green-500 text-sm">Min Level</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-purple-600 font-bold text-lg">{selectedProduct.reorder_point || 0}</p>
                        <p className="text-purple-500 text-sm">Reorder Point</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => setShowManageModal(false)}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
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

      {/* Bulk Price Update Modal */}
      <AnimatePresence>
        {showBulkPriceModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                onClick={() => setShowBulkPriceModal(false)}
              />
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Bulk Price Update
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Update prices for all products
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBulkPriceModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Price Type
                      </label>
                      <select
                        value={bulkPriceData.price_type}
                        onChange={(e) => setBulkPriceData(prev => ({ ...prev, price_type: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="cost_price">Cost Price</option>
                        <option value="selling_price">Selling Price</option>
                        <option value="mrp">MRP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Adjustment Type
                      </label>
                      <select
                        value={bulkPriceData.adjustment_type}
                        onChange={(e) => setBulkPriceData(prev => ({ ...prev, adjustment_type: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Adjustment Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={bulkPriceData.adjustment_value}
                        onChange={(e) => setBulkPriceData(prev => ({ ...prev, adjustment_value: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter value"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {bulkPriceData.adjustment_type === 'percentage' ? 'Enter percentage (e.g., 10 for 10% increase)' : 'Enter fixed amount to add/subtract'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkPriceModal(false)}
                      disabled={modalLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkPriceUpdate}
                      disabled={modalLoading}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
                    >
                      {modalLoading ? (
                        <>
                          <LoadingSpinner size="sm" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Update Prices
                        </>
                      )}
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

export default ProductList;