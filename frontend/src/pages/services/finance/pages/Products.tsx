import React, { useState } from 'react'
import { useThemeStore } from '../../../../store/themeStore'
import ProductList from '../components/ProductList'
import ProductForm from '../components/ProductForm'
import ProductDetail from '../components/ProductDetail'

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

const Products: React.FC = () => {
  const { theme } = useThemeStore()
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [refreshList, setRefreshList] = useState(0)

  const handleAddProduct = () => {
    setSelectedProduct(null)
    setIsEditing(false)
    setShowForm(true)
  }

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product)
    setShowDetail(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedProduct(null)
    setIsEditing(false)
  }

  const handleCloseDetail = () => {
    setShowDetail(false)
    setSelectedProduct(null)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedProduct(null)
    setIsEditing(false)
    // Refresh ProductList by incrementing the key
    setRefreshList(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Products & Services
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your products and services with HSN/SAC codes and pricing
          </p>
        </div>
      </div>

      {/* Product List */}
      <ProductList
        key={refreshList} // Force re-render when refreshList changes
        onAddProduct={handleAddProduct}
        onEditProduct={handleEditProduct}
        onViewProduct={handleViewProduct}
      />

      {/* Product Form Modal */}
      {showForm && (
        <ProductForm
          product={selectedProduct}
          isEditing={isEditing}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Product Detail Modal */}
      {showDetail && selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          onClose={handleCloseDetail}
          onEdit={() => {
            setShowDetail(false)
            handleEditProduct(selectedProduct)
          }}
        />
      )}
    </div>
  )
}

export default Products
