import React from 'react'
import { X, Edit, Package, Tag, DollarSign, BarChart3, Calendar, User } from 'lucide-react'


interface Product {
  id: number
  product_code: string
  name: string
  product_type: 'product' | 'service'
  description: string
  hsn_code_display: string
  sac_code_display: string
  gst_rate: number
  unit: string
  selling_price: number
  purchase_price: number
  track_inventory: boolean
  current_stock: number
  minimum_stock: number
  is_active: boolean
  created_at: string
  created_by_name: string
}

interface ProductDetailProps {
  product: Product
  onClose: () => void
  onEdit: () => void
}

const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  onClose,
  onEdit
}) => {


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              product.product_type === 'product'
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'bg-green-100 dark:bg-green-900'
            }`}>
              <Package className={`w-6 h-6 ${
                product.product_type === 'product'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-green-600 dark:text-green-400'
              }`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {product.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {product.product_code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Edit Product"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Type */}
          <div className="flex items-center gap-4">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              product.product_type === 'product'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {product.product_type === 'product' ? 'Product' : 'Service'}
            </span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              product.is_active
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {product.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Key Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* HSN/SAC Code */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {product.product_type === 'product' ? 'HSN Code' : 'SAC Code'}
                </h4>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {product.hsn_code_display || product.sac_code_display || 'Not assigned'}
              </p>
            </div>

            {/* GST Rate */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">GST Rate</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {product.gst_rate}%
              </p>
            </div>

            {/* Unit */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <h4 className="font-medium text-gray-900 dark:text-white">Unit</h4>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {product.unit}
              </p>
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Pricing Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-gray-900 dark:text-white">Selling Price</h4>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(product.selling_price)}
                </p>
              </div>

              {product.purchase_price > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-gray-900 dark:text-white">Purchase Price</h4>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(product.purchase_price)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Inventory Information (only for products) */}
          {product.product_type === 'product' && product.track_inventory && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Inventory Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Current Stock
                  </h4>
                  <p className={`text-2xl font-bold ${
                    product.current_stock <= product.minimum_stock
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {product.current_stock} {product.unit}
                  </p>
                  {product.current_stock <= product.minimum_stock && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Below minimum stock level
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Minimum Stock Level
                  </h4>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {product.minimum_stock} {product.unit}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Creation Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Creation Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created On</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(product.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.created_by_name}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-4 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit {product.product_type === 'product' ? 'Product' : 'Service'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail
