import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  User,
  Lock,
  Server,
  Eye,
  EyeOff,
  LogIn,
  ArrowLeft,
  Shield,
  Building2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useServiceUserStore } from '../../store/serviceUserStore'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const ServiceUserLogin: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preSelectedService = searchParams.get('service')
  const { login, isLoading } = useServiceUserStore()

  const [step, setStep] = useState<'select-service' | 'login'>(preSelectedService ? 'login' : 'select-service')
  const [selectedService, setSelectedService] = useState(preSelectedService || '')
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    service_type: preSelectedService || ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Available services that companies can have
  const availableServices = [
    {
      id: 'finance',
      name: 'Finance Management',
      description: 'Financial planning, budgeting, and accounting',
      icon: '💰',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-700'
    },
    {
      id: 'hr',
      name: 'Human Resources',
      description: 'Employee management and HR operations',
      icon: '👥',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-700'
    },
    {
      id: 'inventory',
      name: 'Inventory Management',
      description: 'Stock control and warehouse management',
      icon: '📦',
      color: 'orange',
      gradient: 'from-orange-500 to-orange-700'
    },
    {
      id: 'crm',
      name: 'Customer Relations',
      description: 'Customer relationship management',
      icon: '🤝',
      color: 'green',
      gradient: 'from-green-500 to-green-700'
    },
    {
      id: 'procurement',
      name: 'Procurement',
      description: 'Purchase orders and supplier management',
      icon: '🛒',
      color: 'indigo',
      gradient: 'from-indigo-500 to-indigo-700'
    },
    {
      id: 'analytics',
      name: 'Business Analytics',
      description: 'Data analysis and business intelligence',
      icon: '📊',
      color: 'pink',
      gradient: 'from-pink-500 to-pink-700'
    }
  ]

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
    }
  }

  const currentService = serviceConfigs[selectedService as keyof typeof serviceConfigs] || serviceConfigs.finance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    const success = await login(formData)

    if (success) {
      // Navigate to appropriate service dashboard
      switch (formData.service_type) {
        case 'finance':
          navigate('/services/finance/dashboard')
          break
        case 'hr':
          navigate('/services/hr/dashboard')
          break
        case 'inventory':
          navigate('/services/inventory/dashboard')
          break
        case 'crm':
          navigate('/services/crm/dashboard')
          break
        case 'procurement':
          navigate('/services/procurement/dashboard')
          break
        case 'analytics':
          navigate('/services/analytics/dashboard')
          break
        default:
          navigate('/services/dashboard')
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
    setFormData(prev => ({ ...prev, service_type: '', username: '', password: '' }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Main</span>
          </Button>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          {step === 'select-service' ? (
            <>
              <CardHeader className="text-center pb-6">
                <div className="mx-auto mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-2xl shadow-lg">
                    🏢
                  </div>
                </div>

                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  Select Your Service
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Choose the service you want to access
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 bg-gradient-to-br ${service.gradient} hover:shadow-lg group`}
                    >
                      <div className="text-center space-y-3">
                        <div className="text-3xl">{service.icon}</div>
                        <div>
                          <h3 className="font-semibold text-white group-hover:text-white/90">
                            {service.name}
                          </h3>
                          <p className="text-xs text-white/80 group-hover:text-white/70">
                            {service.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-6">
                {/* Back Button */}
                <div className="flex justify-start mb-4">
                  <button
                    onClick={handleBackToServiceSelection}
                    className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm">Back to Services</span>
                  </button>
                </div>

                {/* Service Icon */}
                <div className="mx-auto mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br from-${currentService.color}-500 to-${currentService.color}-600 flex items-center justify-center text-2xl shadow-lg`}>
                    {currentService.icon}
                  </div>
                </div>

                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentService.name}
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {currentService.description}
                </CardDescription>
              </CardHeader>
            </>
          )}

          {step === 'login' && (
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service Type Display */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center space-x-2">
                  <Server className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Service: {currentService.name}
                  </span>
                </div>
              </div>

              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-base font-medium"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5 mr-2" />
                    Sign In to {currentService.name}
                  </>
                )}
              </Button>
            </form>

            {/* Security Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  <p className="font-medium mb-1">Security Notice:</p>
                  <p>Your session will be automatically logged for security purposes. Please contact your administrator if you experience any issues.</p>
                </div>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need help? Contact your company administrator or{' '}
                <button className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                  view documentation
                </button>
              </p>
            </div>
            </CardContent>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by ᗩTᕼᙓᑎᗩ'𝔖 Enterprise Solutions
          </p>
        </div>
      </div>
    </div>
  )
}

export default ServiceUserLogin
