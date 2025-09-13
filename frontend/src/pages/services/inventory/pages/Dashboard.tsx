import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Package, 
  Warehouse,
  Truck,
  BarChart3,
  AlertTriangle,
  Plus,
  Search,
  Settings,
  Download,
  TrendingUp,
  TrendingDown,
  Box,
  MapPin,
  Scan
} from 'lucide-react'
import { useAuthStore } from '../../../../store/authStore'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'

interface InventoryDashboardProps {
  service: any
}

const InventoryDashboard: React.FC<InventoryDashboardProps> = ({ service }) => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { serviceUser } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Placeholder menu items - you can customize these later
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Product Management', icon: Package },
    { id: 'warehouse', label: 'Warehouse Management', icon: Warehouse },
    { id: 'stock', label: 'Stock Control', icon: Box },
    { id: 'orders', label: 'Purchase Orders', icon: Truck },
    { id: 'locations', label: 'Locations', icon: MapPin },
    { id: 'barcode', label: 'Barcode Scanning', icon: Scan },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +23 new items
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Package className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">34</p>
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center mt-1">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Needs attention
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stock Value</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">$2.4M</p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +8.2% this month
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Warehouse Locations</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">8</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center mt-1">
                  <Warehouse className="h-4 w-4 mr-1" />
                  Multi-location
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Warehouse className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Add Product
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create new inventory item
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Search className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Search Inventory
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Find products quickly
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Truck className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Purchase Order
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create new PO
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            <Scan className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
            <h3 className="font-medium text-gray-900 dark:text-white mb-1">
              Barcode Scan
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Quick stock update
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-6">📦</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Inventory Management System
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Advanced inventory control system with real-time tracking, automated reordering,
            and multi-location support. Ready for your specific configuration.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline">
              Configure Inventory
            </Button>
            <Button>
              View Stock Levels
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPlaceholder = (title: string, description: string, icon: string) => (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
        <Button variant="outline">Coming Soon</Button>
      </CardContent>
    </Card>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'products':
        return renderPlaceholder('Product Management', 'Manage product catalog, categories, and specifications', '📦')
      case 'warehouse':
        return renderPlaceholder('Warehouse Management', 'Control warehouse operations and storage locations', '🏭')
      case 'stock':
        return renderPlaceholder('Stock Control', 'Monitor stock levels, movements, and adjustments', '📊')
      case 'orders':
        return renderPlaceholder('Purchase Orders', 'Create and manage purchase orders with suppliers', '🚚')
      case 'locations':
        return renderPlaceholder('Location Management', 'Manage multiple warehouse and storage locations', '📍')
      case 'barcode':
        return renderPlaceholder('Barcode Scanning', 'Use barcode scanning for quick inventory updates', '📱')
      case 'settings':
        return renderPlaceholder('Inventory Settings', 'Configure inventory module preferences and rules', '⚙️')
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/company/services')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Inventory Management
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {serviceUser?.company_name ? `${serviceUser.company_name} - Advanced inventory control system` : 'Advanced inventory control system'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.company_name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === item.id
                            ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default InventoryDashboard
