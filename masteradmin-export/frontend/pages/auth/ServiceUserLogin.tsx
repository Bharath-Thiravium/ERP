import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, LogIn, ArrowLeft, Zap } from 'lucide-react'
import { useServiceUserStore } from '../../store/serviceUserStore'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const ServiceUserLogin: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedService = searchParams.get('service')
  const { login, isLoading } = useServiceUserStore()

  const [step, setStep] = useState<'select-service' | 'login'>(preSelectedService ? 'login' : 'select-service')
  const [selectedService, setSelectedService] = useState(preSelectedService || '')
  const [formData, setFormData] = useState({
    unique_service_id: '',
    password: '',
    service_type: preSelectedService || ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [availableServices, setAvailableServices] = useState<any[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)

  const serviceUIMap = {
    finance: { icon: '💰', name: 'Finance', desc: 'Comprehensive financial management system with accounting, budgeting, and reporting capabilities', color: 'bg-emerald-100', iconColor: 'bg-emerald-500' },
    hr: { icon: '👥', name: 'HR', desc: 'Complete human resources management including payroll, recruitment, and employee lifecycle', color: 'bg-blue-100', iconColor: 'bg-blue-500' },
    inventory: { icon: '📦', name: 'Inventory', desc: 'Advanced inventory control with real-time tracking, warehouse management, and stock optimization', color: 'bg-orange-100', iconColor: 'bg-orange-500' },
    crm: { icon: '🤝', name: 'CRM', desc: 'Customer relationship management with sales pipeline, lead tracking, and customer analytics', color: 'bg-purple-100', iconColor: 'bg-purple-500' },
    procurement: { icon: '🛒', name: 'Procurement', desc: 'End-to-end procurement process with vendor management, purchase orders, and contract tracking', color: 'bg-indigo-100', iconColor: 'bg-indigo-500' },
    analytics: { icon: '📊', name: 'Analytics', desc: 'Business intelligence platform with advanced reporting, data visualization, and predictive insights', color: 'bg-pink-100', iconColor: 'bg-pink-500' },
    orders: { icon: '📋', name: 'Orders', desc: 'Complete order management system with processing, fulfillment, and delivery tracking capabilities', color: 'bg-yellow-100', iconColor: 'bg-yellow-500' },
    manufacturing: { icon: '🏭', name: 'Manufacturing', desc: 'Production planning and control with quality management, resource optimization, and workflow automation', color: 'bg-gray-100', iconColor: 'bg-gray-500' },
    quality: { icon: '✅', name: 'Quality', desc: 'Quality assurance and control system with inspection workflows, compliance tracking, and audit management', color: 'bg-green-100', iconColor: 'bg-green-500' },
    maintenance: { icon: '🔧', name: 'Maintenance', desc: 'Asset maintenance management with preventive scheduling, work orders, and equipment lifecycle tracking', color: 'bg-red-100', iconColor: 'bg-red-500' },
    athens_sustainability: { icon: '🌱', name: 'Sustainability', desc: 'Athens Sustainability Management with environmental impact tracking and ESG reporting', color: 'bg-green-100', iconColor: 'bg-green-600' }
  }

  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/auth/services/active/')
        const services = await response.json()
        
        const mappedServices = services.map((service: any) => ({
          id: service.service_type,
          ...serviceUIMap[service.service_type as keyof typeof serviceUIMap] || { icon: '⚙️', name: service.name, desc: service.description, color: 'bg-gray-100', iconColor: 'bg-gray-500' }
        }))
        
        setAvailableServices(mappedServices)
      } catch (error) {
        console.error('Failed to fetch services:', error)
        toast.error('Failed to load services')
      } finally {
        setServicesLoading(false)
      }
    }
    
    fetchServices()
  }, [])

  // Service type configurations for login
  const serviceConfigs = {
    finance: {
      name: 'Finance Management',
      icon: '💰',
      color: 'green',
      description: 'Access financial data, reports, and analytics'
    },
    hr: {
      name: 'Human Resources',
      icon: '👥',
      color: 'blue',
      description: 'Manage employee data and HR processes'
    },
    inventory: {
      name: 'Inventory Management',
      icon: '📦',
      color: 'purple',
      description: 'Track and manage inventory levels'
    },
    orders: {
      name: 'Order Management',
      icon: '🛒',
      color: 'orange',
      description: 'Process and track customer orders'
    },
    analytics: {
      name: 'Analytics & Reporting',
      icon: '📊',
      color: 'indigo',
      description: 'View business insights and reports'
    },
    crm: {
      name: 'Customer Relations',
      icon: '🤝',
      color: 'pink',
      description: 'Manage customer relationships'
    },
    athens_sustainability: {
      name: 'Athens Sustainability Management',
      icon: '🌱',
      color: 'emerald',
      description: 'Environmental impact tracking and sustainability reporting'
    }
  }

  const currentService = serviceConfigs[selectedService as keyof typeof serviceConfigs] || {
    name: 'Service',
    icon: '⚙️',
    color: 'gray',
    description: 'Service access'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.unique_service_id || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    const success = await login(formData)

    if (success) {
      // Navigate to appropriate service dashboard
      switch (formData.service_type) {
        case 'finance':
          navigate('/services/finance/dashboard', { replace: true })
          break
        case 'hr':
          navigate('/services/hr/dashboard', { replace: true })
          break
        case 'inventory':
          navigate('/services/inventory/dashboard', { replace: true })
          break
        case 'crm':
          navigate('/services/crm', { replace: true })
          break
        case 'procurement':
          navigate('/services/procurement/dashboard', { replace: true })
          break
        case 'analytics':
          navigate('/services/analytics/dashboard', { replace: true })
          break
        case 'athens_sustainability':
          // Athens admins use dedicated Athens login
          navigate('/athens-login', { replace: true })
          break
        default:
          navigate('/services/dashboard', { replace: true })
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId)
    setFormData(prev => ({ ...prev, service_type: serviceId }))
    setStep('login')
  }

  const handleBackToServiceSelection = () => {
    setStep('select-service')
    setSelectedService('')
    setFormData(prev => ({ ...prev, service_type: '', unique_service_id: '', password: '' }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {!preSelectedService && (
          <button
            onClick={() => navigate('/')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        {step === 'select-service' ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="p-6 text-center border-b border-gray-100">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h1>
              <p className="text-gray-600">Select the service you want to access</p>
            </div>
            
            <div className="p-6">
              {servicesLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {availableServices.filter(service => service.id !== 'athens_sustainability').map((service: any) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`group relative p-4 rounded-xl border-2 border-transparent transition-all duration-300 hover:scale-105 ${service.color} hover:shadow-lg backdrop-blur-sm`}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                      <div className="relative text-center">
                        <div className={`w-12 h-12 ${service.iconColor} rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-md`}>
                          <span className="text-lg">{service.icon}</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{service.name}</h3>
                        <p className="text-xs text-gray-700 leading-tight">{service.desc}</p>
                      </div>
                    </button>
                  ))}
                  {availableServices.find(service => service.id === 'athens_sustainability') && (
                    <div className="group relative p-4 rounded-xl border-2 border-green-200 bg-green-50">
                      <div className="relative text-center">
                        <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
                          <span className="text-lg">🌱</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">Sustainability</h3>
                        <p className="text-xs text-gray-700 leading-tight mb-2">Use company login for Athens admins</p>
                        <button
                          onClick={() => navigate('/athens-login')}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Athens Login
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Login Form */}
            <div className="lg:col-span-2">
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                <button
                  onClick={handleBackToServiceSelection}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors bg-gray-50 px-3 py-1.5 rounded-lg text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Services</span>
                </button>

                <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${currentService.color}-500 to-${currentService.color}-600 flex items-center justify-center text-2xl shadow-lg mx-auto mb-4`}>
                    {currentService.icon}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{currentService.name}</h1>
                  <p className="text-gray-600">{currentService.description}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Unique Service ID</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        autoComplete="username"
                        value={formData.unique_service_id}
                        onChange={(e) => handleInputChange('unique_service_id', e.target.value)}
                        className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                        placeholder="e.g., COMPANY_username_001"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-1">
                      Use the Unique Service ID provided in your credentials file
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                        placeholder="Enter your password"
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="h-5 w-5" />
                        <span>Sign In to {currentService.name}</span>
                      </div>
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Need help? Contact your administrator or{' '}
                    <button className="text-blue-600 hover:text-blue-500 font-semibold underline">
                      view docs
                    </button>
                  </p>
                </div>
              </div>
            </div>

            {/* Compact Side Preview Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-4 text-white h-full shadow-xl border border-gray-700/50">
                <div className="mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-br from-${currentService.color}-400 to-${currentService.color}-600 rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                    <span className="text-xl">{currentService.icon}</span>
                  </div>
                  <h3 className="font-bold mb-2">{currentService.name}</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">{currentService.description}</p>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-gray-300">Enterprise Security</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span className="text-gray-300">Real-time Analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span className="text-gray-300">Advanced Reporting</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-gray-300">24/7 Support</span>
                  </div>
                </div>

                <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <h4 className="font-semibold text-sm mb-2 text-white">Security Notice</h4>
                  <p className="text-xs text-gray-300 leading-relaxed mb-2">
                    Protected with enterprise-grade encryption and monitoring.
                  </p>
                  <div className="flex items-center gap-2 text-green-400">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium">Secure Connection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ATHENA Enterprise</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ServiceUserLogin
