import React, { useState, useEffect } from 'react'
import { Package, Wrench, DollarSign } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import ProductList from '../components/ProductList'
import ProductForm from '../components/ProductForm'
import ProductDetail from '../components/ProductDetail'
import MetricCard from '../components/MetricCard'

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

  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [refreshList, setRefreshList] = useState(0)
  const [metrics, setMetrics] = useState({
    total: 0,
    products: 0,
    services: 0,
    avgSellingPrice: 0
  })

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

  // Fetch product metrics
  const fetchMetrics = async () => {
    try {
      const sessionKey = useServiceUserStore.getState().sessionKey
      if (!sessionKey) return

      const response = await apiClient.getFinanceProducts({ session_key: sessionKey, page_size: 1000 })
      const products = response.data.results || []
      
      const total = products.length
      const productCount = products.filter((p: any) => p.product_type === 'product').length
      const services = products.filter((p: any) => p.product_type === 'service').length
      const avgSellingPrice = total > 0 ? products.reduce((sum: number, p: any) => sum + (p.selling_price || 0), 0) / total : 0
      
      setMetrics({ total, products: productCount, services, avgSellingPrice })
    } catch (error) {
      console.error('Error fetching product metrics:', error)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [refreshList])

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Products & Services
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your products and services with HSN/SAC codes and pricing
        </p>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Items"
          value={metrics.total}
          subtitle={`${metrics.total} products & services`}
          icon={Package}
          color="blue"
        />
        <MetricCard
          title="Products"
          value={metrics.products}
          subtitle={`${metrics.products} physical products`}
          icon={Package}
          color="green"
        />
        <MetricCard
          title="Services"
          value={metrics.services}
          subtitle={`${metrics.services} service offerings`}
          icon={Wrench}
          color="purple"
        />
        <MetricCard
          title="Avg Selling Price"
          value={`₹${metrics.avgSellingPrice.toLocaleString()}`}
          subtitle="Average price per item"
          icon={DollarSign}
          color="orange"
        />
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
