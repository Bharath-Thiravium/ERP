import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Hash, Settings, Eye, AlertCircle, RefreshCw, 
  FileText, Calendar, Zap, RotateCcw,
  ChevronDown, ChevronRight, X
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import toast from 'react-hot-toast'

interface ServiceDocumentType {
  type: string
  name: string
  default_prefix: string
}

interface ServiceData {
  service: string
  service_name: string
  document_types: ServiceDocumentType[]
}



interface PatternPreview {
  previews: string[]
  configuration: any
}

const EnhancedDocumentNumbering: React.FC = () => {
  const queryClient = useQueryClient()
  
  // State management
  const [activeTab, setActiveTab] = useState<'setup' | 'configure' | 'history'>('setup')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [expandedServices, setExpandedServices] = useState<string[]>([])
  const [globalSettings, setGlobalSettings] = useState({
    year_format: 'YY',
    separator: '-',
    starting_number: 1,
    number_padding: 3,
    allow_manual_override: false,
    include_company_prefix: false,
    custom_pattern: ''
  })
  
  // Load saved settings and check for existing configurations
  useEffect(() => {
    const savedSettings = localStorage.getItem('document-numbering-global-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setGlobalSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.warn('Failed to parse saved settings:', error)
        localStorage.removeItem('document-numbering-global-settings')
      }
    }
    
    const savedServices = localStorage.getItem('document-numbering-selected-services')
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices)
        // Filter out invalid services
        const validServices = ['finance', 'hr', 'inventory', 'crm']
        const filteredServices = parsed.filter((service: string) => validServices.includes(service))
        setSelectedServices(filteredServices)
        if (filteredServices.length !== parsed.length) {
          localStorage.setItem('document-numbering-selected-services', JSON.stringify(filteredServices))
        }
      } catch (error) {
        console.warn('Failed to parse saved services:', error)
        localStorage.removeItem('document-numbering-selected-services')
      }
    }
  }, [])
  
  const [serviceConfigurations] = useState<Record<string, any>>({})
  const [documentConfigurations] = useState<Record<string, any>>({})
  const [patternPreview, setPatternPreview] = useState<PatternPreview | null>(null)
  const [financialYear, setFinancialYear] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Fetch service document types
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['service-document-types'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/service-document-types/')
  })

  // Fetch current configurations
  const { data: currentConfigs, isLoading: configsLoading } = useQuery({
    queryKey: ['current-document-configurations'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/current-configurations/')
  })
  
  // Load existing configurations and update UI state
  useEffect(() => {
    if (currentConfigs?.data?.services) {
      const configuredServices = currentConfigs.data.services.map((s: any) => s.service_type)
      if (configuredServices.length > 0) {
        // Filter out invalid services
        const validServices = ['finance', 'hr', 'inventory', 'crm']
        const filteredServices = configuredServices.filter((service: string) => validServices.includes(service))
        
        setSelectedServices(filteredServices)
        localStorage.setItem('document-numbering-selected-services', JSON.stringify(filteredServices))
        
        // Check if any configuration has company prefix enabled
        const hasCompanyPrefix = currentConfigs.data.services.some((service: any) => 
          service.configurations.some((config: any) => config.include_company_prefix)
        )
        
        if (hasCompanyPrefix) {
          setGlobalSettings(prev => {
            const newSettings = { ...prev, include_company_prefix: true }
            localStorage.setItem('document-numbering-global-settings', JSON.stringify(newSettings))
            return newSettings
          })
        }
      }
    }
  }, [currentConfigs])
  
  useEffect(() => {
    localStorage.setItem('document-numbering-global-settings', JSON.stringify(globalSettings))
  }, [globalSettings])

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ['document-numbering-status'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/system-status/')
  })

  // Initialize financial year
  useEffect(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const isAfterApril = today.getMonth() >= 3 // April is month 3 (0-indexed)
    
    if (isAfterApril) {
      setFinancialYear(`${currentYear}-${String(currentYear + 1).slice(-2)}`)
      setStartDate(`${currentYear}-04-01`)
      setEndDate(`${currentYear + 1}-03-31`)
    } else {
      setFinancialYear(`${currentYear - 1}-${String(currentYear).slice(-2)}`)
      setStartDate(`${currentYear - 1}-04-01`)
      setEndDate(`${currentYear}-03-31`)
    }
  }, [])

  // Service-wise bulk setup mutation
  const setupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/company-dashboard/document-numbering/service-wise-setup/', data),
    onSuccess: (response) => {
      toast.success(`Successfully configured ${response.data.created_count + response.data.updated_count} document types`)
      queryClient.invalidateQueries({ queryKey: ['current-document-configurations'] })
      queryClient.invalidateQueries({ queryKey: ['document-numbering-status'] })
      
      // Switch to configurations tab to show results
      setActiveTab('configure')
      
      // Keep settings in localStorage for future use
      localStorage.setItem('document-numbering-global-settings', JSON.stringify(globalSettings))
      localStorage.setItem('document-numbering-selected-services', JSON.stringify(selectedServices))
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to setup document numbering')
    }
  })

  // Pattern preview mutation
  const previewMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/company-dashboard/document-numbering/preview-pattern/', data),
    onSuccess: (response) => {
      setPatternPreview(response.data)
    },
    onError: () => {
      toast.error('Failed to generate preview')
    }
  })

  // Toggle system mutation
  const toggleSystemMutation = useMutation({
    mutationFn: (action: 'enable' | 'disable') => 
      apiClient.post('/api/company-dashboard/document-numbering/toggle-system/', { action }),
    onSuccess: (response) => {
      toast.success(response.data.message)
      queryClient.invalidateQueries({ queryKey: ['document-numbering-status'] })
    },
    onError: () => {
      toast.error('Failed to toggle system')
    }
  })

  // Reset counters mutation
  const resetCountersMutation = useMutation({
    mutationFn: () => apiClient.post('/api/company-dashboard/document-numbering/reset-all-counters/'),
    onSuccess: (response) => {
      toast.success(`Reset ${response.data.reset_count} counters successfully!`)
      queryClient.invalidateQueries({ queryKey: ['current-document-configurations'] })
      
      // Clear any invalid services from localStorage
      const validServices = ['finance', 'hr', 'inventory', 'crm']
      const savedServices = localStorage.getItem('document-numbering-selected-services')
      if (savedServices) {
        try {
          const parsed = JSON.parse(savedServices)
          const filteredServices = parsed.filter((service: string) => validServices.includes(service))
          localStorage.setItem('document-numbering-selected-services', JSON.stringify(filteredServices))
          setSelectedServices(filteredServices)
        } catch (error) {
          localStorage.removeItem('document-numbering-selected-services')
          setSelectedServices([])
        }
      }
    },
    onError: () => {
      toast.error('Failed to reset counters')
    }
  })

  // Fix company prefix mutation
  const fixCompanyPrefixMutation = useMutation({
    mutationFn: () => apiClient.post('/api/company-dashboard/document-numbering/fix-company-prefix/'),
    onSuccess: (response) => {
      toast.success(`Fixed ${response.data.updated_count} configurations to include company prefix!`)
      queryClient.invalidateQueries({ queryKey: ['current-document-configurations'] })
      
      // Update global settings to reflect the change
      setGlobalSettings(prev => {
        const newSettings = { ...prev, include_company_prefix: true }
        localStorage.setItem('document-numbering-global-settings', JSON.stringify(newSettings))
        return newSettings
      })
      
      // Clear any invalid services from localStorage
      const validServices = ['finance', 'hr', 'inventory', 'crm']
      const savedServices = localStorage.getItem('document-numbering-selected-services')
      if (savedServices) {
        try {
          const parsed = JSON.parse(savedServices)
          const filteredServices = parsed.filter((service: string) => validServices.includes(service))
          localStorage.setItem('document-numbering-selected-services', JSON.stringify(filteredServices))
          setSelectedServices(filteredServices)
        } catch (error) {
          localStorage.removeItem('document-numbering-selected-services')
          setSelectedServices([])
        }
      }
      
      // Switch to configurations tab to show updated results
      setActiveTab('configure')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to fix company prefix')
    }
  })

  const services = servicesData?.data?.services || []
  const configs = currentConfigs?.data || {}
  const isSystemEnabled = systemStatus?.data?.use_document_numbering || false

  const handleServiceToggle = (serviceType: string) => {
    // Only allow valid services
    const validServices = ['finance', 'hr', 'inventory', 'crm']
    if (!validServices.includes(serviceType)) {
      toast.error(`Service ${serviceType} is not supported for document numbering`)
      return
    }
    
    setSelectedServices(prev => {
      const newServices = prev.includes(serviceType) 
        ? prev.filter(s => s !== serviceType)
        : [...prev, serviceType]
      
      // Save to localStorage
      localStorage.setItem('document-numbering-selected-services', JSON.stringify(newServices))
      return newServices
    })
  }

  const handleServiceExpand = (serviceType: string) => {
    setExpandedServices(prev => 
      prev.includes(serviceType)
        ? prev.filter(s => s !== serviceType)
        : [...prev, serviceType]
    )
  }

  const handleGlobalSettingChange = (key: string, value: any) => {
    setGlobalSettings(prev => {
      const newSettings = { ...prev, [key]: value }
      // Save to localStorage immediately
      localStorage.setItem('document-numbering-global-settings', JSON.stringify(newSettings))
      return newSettings
    })
  }
  
  const clearConfiguration = () => {
    localStorage.removeItem('document-numbering-global-settings')
    localStorage.removeItem('document-numbering-selected-services')
    setSelectedServices([])
    setGlobalSettings({
      year_format: 'YY',
      separator: '-',
      starting_number: 1,
      number_padding: 3,
      allow_manual_override: false,
      include_company_prefix: false,
      custom_pattern: ''
    })
    toast.success('Configuration cleared')
  }
  
  // Clear invalid data on mount
  useEffect(() => {
    const validServices = ['finance', 'hr', 'inventory', 'crm']
    const savedServices = localStorage.getItem('document-numbering-selected-services')
    if (savedServices) {
      try {
        const parsed = JSON.parse(savedServices)
        const hasInvalidServices = parsed.some((service: string) => !validServices.includes(service))
        if (hasInvalidServices) {
          console.log('Clearing invalid services from localStorage:', parsed)
          const filteredServices = parsed.filter((service: string) => validServices.includes(service))
          localStorage.setItem('document-numbering-selected-services', JSON.stringify(filteredServices))
          setSelectedServices(filteredServices)
          toast.success('Removed invalid services from configuration')
        }
      } catch (error) {
        console.error('Error parsing saved services:', error)
        localStorage.removeItem('document-numbering-selected-services')
        setSelectedServices([])
      }
    }
  }, [])
  
  // Add debug logging for selectedServices changes
  useEffect(() => {
    console.log('Selected services changed:', selectedServices)
  }, [selectedServices])



  const generatePreview = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service to preview')
      return
    }

    let pattern = globalSettings.custom_pattern
    if (!pattern) {
      if (globalSettings.include_company_prefix) {
        pattern = '{COMPANY}-{PREFIX}-{YEAR}-{NUMBER}'
      } else {
        pattern = '{PREFIX}-{YEAR}-{NUMBER}'
      }
    } else if (globalSettings.include_company_prefix && !pattern.includes('{COMPANY}')) {
      // Add company prefix to custom pattern if not present
      pattern = `{COMPANY}-${pattern}`
    }

    const previewData = {
      prefix: 'DOC',
      custom_pattern: pattern,
      include_company_prefix: globalSettings.include_company_prefix,
      year_format: globalSettings.year_format,
      separator: globalSettings.separator,
      number_padding: globalSettings.number_padding,
      financial_year: financialYear
    }

    previewMutation.mutate(previewData)
  }

  const handleBulkSetup = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service')
      return
    }

    // Validate services before sending
    const validServices = ['finance', 'hr', 'inventory', 'crm']
    const invalidServices = selectedServices.filter(service => !validServices.includes(service))
    
    if (invalidServices.length > 0) {
      console.error('Invalid services detected:', invalidServices)
      toast.error(`Invalid services detected: ${invalidServices.join(', ')}. Please clear configuration and try again.`)
      return
    }

    // Ensure global settings are properly saved before setup
    localStorage.setItem('document-numbering-global-settings', JSON.stringify(globalSettings))
    localStorage.setItem('document-numbering-selected-services', JSON.stringify(selectedServices))

    const setupData = {
      financial_year: financialYear,
      start_date: startDate,
      end_date: endDate,
      services: selectedServices,
      global_settings: globalSettings,
      service_configurations: serviceConfigurations,
      document_configurations: documentConfigurations
    }

    console.log('Sending setup data:', setupData)
    setupMutation.mutate(setupData)
  }

  const PatternBuilder = ({ config, onChange }: { config: any, onChange: (key: string, value: any) => void }) => {
    const [patternType, setPatternType] = useState<'simple' | 'custom'>(
      config.custom_pattern && config.custom_pattern.trim() !== '' ? 'custom' : 'simple'
    )
    
    // Update pattern type when config changes
    useEffect(() => {
      setPatternType(config.custom_pattern && config.custom_pattern.trim() !== '' ? 'custom' : 'simple')
    }, [config.custom_pattern])

    const patternTemplates = [
      { name: 'Standard', pattern: '{PREFIX}-{YEAR}-{NUMBER}', example: 'INV-25-001' },
      { name: 'With Company', pattern: '{COMPANY}-{PREFIX}-{YEAR}-{NUMBER}', example: 'ACME-INV-25-001' },
      { name: 'Full Year', pattern: '{PREFIX}-{YYYY}-{NUMBER}', example: 'INV-2025-001' },
      { name: 'Financial Year', pattern: '{PREFIX}-{FY}-{NUMBER}', example: 'INV-2024-25-001' },
      { name: 'No Year', pattern: '{PREFIX}-{NUMBER}', example: 'INV-001' },
    ]

    const handlePatternTypeChange = (type: 'simple' | 'custom') => {
      setPatternType(type)
      if (type === 'simple') {
        onChange('custom_pattern', '')
      } else if (type === 'custom' && !config.custom_pattern) {
        // Set a default custom pattern when switching to custom
        onChange('custom_pattern', '{PREFIX}-{YEAR}-{NUMBER}')
      }
    }

    const handleCustomPatternChange = (value: string) => {
      onChange('custom_pattern', value)
      if (value && value.trim() !== '' && patternType !== 'custom') {
        setPatternType('custom')
      } else if (!value || value.trim() === '') {
        setPatternType('simple')
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={patternType === 'simple'}
              onChange={() => handlePatternTypeChange('simple')}
              className="text-blue-600"
            />
            <span>Simple Configuration</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              checked={patternType === 'custom'}
              onChange={() => handlePatternTypeChange('custom')}
              className="text-blue-600"
            />
            <span>Custom Pattern</span>
          </label>
        </div>

        {patternType === 'simple' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Year Format</label>
              <select
                value={config.year_format || 'YY'}
                onChange={(e) => onChange('year_format', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="YY">2-digit (25)</option>
                <option value="YYYY">4-digit (2025)</option>
                <option value="FY">Financial Year (2024-25)</option>
                <option value="FY_SHORT">Short FY (24-25)</option>
                <option value="NONE">No Year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Separator</label>
              <input
                type="text"
                value={config.separator || '-'}
                onChange={(e) => onChange('separator', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                maxLength={5}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pattern Templates</label>
              <div className="grid grid-cols-1 gap-2">
                {patternTemplates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleCustomPatternChange(template.pattern)}
                    className="text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-500">{template.pattern}</div>
                    <div className="text-xs text-blue-600">Example: {template.example}</div>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Custom Pattern</label>
              <input
                type="text"
                value={config.custom_pattern || ''}
                onChange={(e) => handleCustomPatternChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg font-mono"
                placeholder="{PREFIX}-{YEAR}-{NUMBER}"
              />
              <div className="text-xs text-gray-500 mt-1">
                Available placeholders: {'{PREFIX}'}, {'{COMPANY}'}, {'{YEAR}'}, {'{FY}'}, {'{NUMBER}'}, {'{SEP}'}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Hash className="h-6 w-6 text-blue-600" />
            <span>Enhanced Document Numbering</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Configure comprehensive document numbering across all services
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isSystemEnabled 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {isSystemEnabled ? 'Enabled' : 'Disabled'}
          </div>
          
          {isSystemEnabled && (
            <>
              <Button
                onClick={() => {
                  if (confirm('Fix existing configurations to include company prefix? This will update all document types to include EXMTS prefix.')) {
                    fixCompanyPrefixMutation.mutate()
                  }
                }}
                variant="outline"
                disabled={fixCompanyPrefixMutation.isPending}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                {fixCompanyPrefixMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Fix Company Prefix
              </Button>
              <Button
                onClick={() => {
                  if (confirm('Are you sure you want to reset all document counters? This will make all new documents start from 001.')) {
                    resetCountersMutation.mutate()
                  }
                }}
                variant="outline"
                disabled={resetCountersMutation.isPending}
                className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900/20"
              >
                {resetCountersMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Reset Counters
              </Button>
            </>
          )}
          
          <Button
            onClick={() => toggleSystemMutation.mutate(isSystemEnabled ? 'disable' : 'enable')}
            variant={isSystemEnabled ? 'outline' : 'primary'}
            disabled={toggleSystemMutation.isPending}
          >
            {toggleSystemMutation.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isSystemEnabled ? 'Disable System' : 'Enable System'}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      {!isSystemEnabled && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                Document Numbering System Disabled
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                The system is currently using the legacy company prefix system. Enable the enhanced system to access advanced features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'setup', label: 'Service Setup', icon: Settings },
            { id: 'configure', label: 'Current Configurations', icon: FileText },
            { id: 'history', label: 'History & Analytics', icon: Calendar }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Financial Year Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Financial Year Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Financial Year</label>
                  <input
                    type="text"
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="2024-25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Global Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Global Settings</CardTitle>
              <CardDescription>
                These settings will be applied to all selected document types unless overridden
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PatternBuilder 
                config={globalSettings} 
                onChange={handleGlobalSettingChange}
              />
              
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Starting Number</label>
                  <input
                    type="number"
                    value={globalSettings.starting_number}
                    onChange={(e) => handleGlobalSettingChange('starting_number', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Number Padding</label>
                  <input
                    type="number"
                    value={globalSettings.number_padding}
                    onChange={(e) => handleGlobalSettingChange('number_padding', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.include_company_prefix}
                    onChange={(e) => handleGlobalSettingChange('include_company_prefix', e.target.checked)}
                    className="text-blue-600"
                  />
                  <span>Include Company Prefix</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={globalSettings.allow_manual_override}
                    onChange={(e) => handleGlobalSettingChange('allow_manual_override', e.target.checked)}
                    className="text-blue-600"
                  />
                  <span>Allow Manual Override</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Service Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Service Configuration</CardTitle>
              <CardDescription>
                Select services and configure document types for each service
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((service: ServiceData) => (
                    <div key={service.service} className="border rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.service)}
                              onChange={() => handleServiceToggle(service.service)}
                              className="text-blue-600"
                            />
                            <div>
                              <h4 className="font-medium">{service.service_name}</h4>
                              <p className="text-sm text-gray-500">
                                {service.document_types.length} document types
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleServiceExpand(service.service)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedServices.includes(service.service) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        {expandedServices.includes(service.service) && (
                          <div className="mt-4 space-y-3">
                            <h5 className="font-medium text-sm">Document Types:</h5>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {service.document_types.map((docType) => (
                                <div key={docType.type} className="p-2 bg-gray-50 rounded text-sm">
                                  <div className="font-medium">{docType.name}</div>
                                  <div className="text-gray-500">Default: {docType.default_prefix}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pattern Preview */}
          {patternPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Pattern Preview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Sample Numbers:</h4>
                    <div className="flex flex-wrap gap-2">
                      {patternPreview.previews.map((preview, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-mono text-sm"
                        >
                          {preview}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setup Actions */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={clearConfiguration}
              className="border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Configuration
            </Button>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={generatePreview}
                disabled={selectedServices.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Pattern
              </Button>
              <Button
                onClick={handleBulkSetup}
                disabled={selectedServices.length === 0 || setupMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {setupMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4 mr-2" />
                )}
                Setup Numbering System
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'configure' && (
        <div className="space-y-6">
          {configsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {configs.services?.map((service: any) => (
                <Card key={service.service_type}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{service.service_name}</span>
                      <span className="text-sm font-normal text-gray-500">
                        {service.configurations.length} configurations
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Document Type</th>
                            <th className="text-left py-2">Prefix</th>
                            <th className="text-left py-2">Pattern</th>
                            <th className="text-left py-2">Next Number</th>
                            <th className="text-left py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {service.configurations.map((config: any) => (
                            <tr key={config.id} className="border-b">
                              <td className="py-2 font-medium">{config.document_type_display}</td>
                              <td className="py-2 font-mono">{config.prefix}</td>
                              <td className="py-2 font-mono text-xs">
                                {config.custom_pattern || 'Default Pattern'}
                              </td>
                              <td className="py-2">
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-mono text-xs">
                                  {config.next_number_preview}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  config.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {config.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Document numbering history and analytics will be available in the next update.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default EnhancedDocumentNumbering