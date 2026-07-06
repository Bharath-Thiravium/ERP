import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Hash, Settings, Eye, AlertCircle, RefreshCw, 
  FileText, Calendar, Zap,
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
  const validServices = ['finance', 'hr', 'inventory', 'crm']
  
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
  const [documentConfigurations, setDocumentConfigurations] = useState<Record<string, any>>({})
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
      if (currentConfigs.data.services.length > 0) {
        const loadedDocumentConfigurations: Record<string, any> = {}

        currentConfigs.data.services.forEach((service: any) => {
          service.configurations.forEach((config: any) => {
            loadedDocumentConfigurations[`${service.service_type}.${config.document_type}`] = {
              enabled: config.is_active,
              prefix: config.prefix,
              starting_number: config.starting_number,
              number_padding: config.number_padding,
              allow_manual_override: config.allow_manual_override,
              custom_pattern: config.custom_pattern,
              include_company_prefix: config.include_company_prefix,
              year_format: config.year_format,
              separator: config.separator,
            }
          })
        })
        setDocumentConfigurations(loadedDocumentConfigurations)
        
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

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['document-numbering-history'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/history/?page_size=20'),
    enabled: activeTab === 'history'
  })

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['document-numbering-stats'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/dashboard-stats/'),
    enabled: activeTab === 'history'
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
  const companyPrefix = systemStatus?.data?.company_prefix || 'COMP'

  const handleServiceToggle = (serviceType: string) => {
    // Only allow valid services
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

  const getDocumentConfigKey = (serviceType: string, docType: string) => `${serviceType}.${docType}`

  const getDocumentConfig = (serviceType: string, docType: string) => {
    return documentConfigurations[getDocumentConfigKey(serviceType, docType)] || {}
  }

  const isDocumentEnabled = (serviceType: string, docType: string) => {
    const config = getDocumentConfig(serviceType, docType)
    return config.enabled !== false
  }

  const handleDocumentConfigChange = (serviceType: string, docType: string, key: string, value: any) => {
    const configKey = getDocumentConfigKey(serviceType, docType)
    setDocumentConfigurations(prev => ({
      ...prev,
      [configKey]: {
        ...(prev[configKey] || {}),
        [key]: value
      }
    }))
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
    setDocumentConfigurations({})
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

    let pattern = globalSettings.custom_pattern || ''
    if (pattern && globalSettings.include_company_prefix && !pattern.includes('{COMPANY}')) {
      // Add company prefix to custom pattern if not present
      pattern = `{COMPANY}{SEP}${pattern}`
    }

    const getYearString = () => {
      const years = financialYear.split('-')
      if (globalSettings.year_format === 'YY') {
        return years[1] || ''
      }
      if (globalSettings.year_format === 'YYYY') {
        return years[0] || ''
      }
      if (globalSettings.year_format === 'FY') {
        return financialYear
      }
      if (globalSettings.year_format === 'FY_SHORT') {
        return years.length === 2 ? `${years[0].slice(-2)}-${years[1]}` : financialYear
      }
      return ''
    }

    const buildNumber = (counter: number) => {
      const number = String(counter).padStart(globalSettings.number_padding || 3, '0')
      if (pattern) {
        const replacements: Record<string, string> = {
          '{PREFIX}': 'DOC',
          '{COMPANY}': companyPrefix,
          '{YEAR}': getYearString(),
          '{FY}': financialYear,
          '{FY_SHORT}': (() => {
            const years = financialYear.split('-')
            return years.length === 2 ? `${years[0].slice(-2)}-${years[1]}` : financialYear
          })(),
          '{NUMBER}': number,
          '{SEP}': globalSettings.separator || '-',
        }
        return Object.entries(replacements).reduce(
          (value, [placeholder, replacement]) => value.replaceAll(placeholder, replacement),
          pattern
        )
      }

      const parts = []
      if (globalSettings.include_company_prefix) {
        parts.push(companyPrefix)
      }
      parts.push('DOC')
      const yearString = getYearString()
      if (yearString) {
        parts.push(yearString)
      }
      parts.push(number)
      return parts.join(globalSettings.separator || '-')
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

    setPatternPreview({
      previews: [1, 2, 3, 4, 5].map(buildNumber),
      configuration: previewData
    })
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

    const effectiveDocumentConfigurations = { ...documentConfigurations }
    services
      .filter((service: ServiceData) => selectedServices.includes(service.service))
      .forEach((service: ServiceData) => {
        service.document_types.forEach((docType) => {
          const configKey = getDocumentConfigKey(service.service, docType.type)
          if (!effectiveDocumentConfigurations[configKey]) {
            effectiveDocumentConfigurations[configKey] = { enabled: true }
          }
        })
      })

    const setupData = {
      financial_year: financialYear,
      start_date: startDate,
      end_date: endDate,
      services: selectedServices,
      global_settings: globalSettings,
      service_configurations: serviceConfigurations,
      document_configurations: effectiveDocumentConfigurations
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
      { name: 'Standard', pattern: '{PREFIX}{SEP}{YEAR}{SEP}{NUMBER}', example: 'INV-25-001' },
      { name: 'With Company', pattern: '{COMPANY}{SEP}{PREFIX}{SEP}{YEAR}{SEP}{NUMBER}', example: 'ACME-INV-25-001' },
      { name: 'Financial Year', pattern: '{PREFIX}{SEP}{FY}{SEP}{NUMBER}', example: 'INV-2024-25-001' },
      { name: 'Short FY', pattern: '{PREFIX}{SEP}{FY_SHORT}{SEP}{NUMBER}', example: 'INV-24-25-001' },
      { name: 'No Year', pattern: '{PREFIX}{SEP}{NUMBER}', example: 'INV-001' },
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
                Available placeholders: {'{PREFIX}'}, {'{COMPANY}'}, {'{YEAR}'}, {'{FY}'}, {'{FY_SHORT}'}, {'{NUMBER}'}, {'{SEP}'}
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
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium text-sm">Document Types</h5>
                              <div className="flex items-center space-x-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => service.document_types.forEach((docType) => handleDocumentConfigChange(service.service, docType.type, 'enabled', true))}
                                  className="text-blue-600 hover:underline"
                                >
                                  Select all
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => service.document_types.forEach((docType) => handleDocumentConfigChange(service.service, docType.type, 'enabled', false))}
                                  className="text-blue-600 hover:underline"
                                >
                                  Clear all
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {service.document_types.map((docType) => {
                                const docConfig = getDocumentConfig(service.service, docType.type)
                                const enabled = isDocumentEnabled(service.service, docType.type)
                                return (
                                  <div
                                    key={docType.type}
                                    className={`p-3 border rounded-lg text-sm ${enabled ? 'bg-white' : 'bg-gray-50 opacity-70'}`}
                                  >
                                    <label className="flex items-start space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={enabled}
                                        onChange={(e) => handleDocumentConfigChange(service.service, docType.type, 'enabled', e.target.checked)}
                                        className="text-blue-600 mt-1"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium">{docType.name}</div>
                                        <div className="text-gray-500">Default prefix: {docType.default_prefix}</div>
                                      </div>
                                    </label>
                                    {enabled && (
                                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Prefix override
                                          </label>
                                          <input
                                            type="text"
                                            value={docConfig.prefix ?? docType.default_prefix}
                                            onChange={(e) => handleDocumentConfigChange(service.service, docType.type, 'prefix', e.target.value.toUpperCase())}
                                            className="w-full px-2 py-1 border rounded font-mono text-xs"
                                            maxLength={20}
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Start from
                                          </label>
                                          <input
                                            type="number"
                                            min="1"
                                            value={docConfig.starting_number ?? globalSettings.starting_number}
                                            onChange={(e) => handleDocumentConfigChange(service.service, docType.type, 'starting_number', parseInt(e.target.value, 10) || 1)}
                                            className="w-full px-2 py-1 border rounded font-mono text-xs"
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              Disabled document types will not be created. Existing active configs will be marked inactive, not deleted.
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
          {statsLoading || historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Financial Year</div>
                    <div className="text-xl font-semibold">{statsData?.data?.current_financial_year || financialYear}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Active Configs</div>
                    <div className="text-xl font-semibold">{statsData?.data?.total_configurations || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Active Services</div>
                    <div className="text-xl font-semibold">{statsData?.data?.active_services || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-gray-500">Manual Overrides</div>
                    <div className="text-xl font-semibold">{statsData?.data?.total_manual_overrides || 0}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Number History</CardTitle>
                  <CardDescription>
                    Latest generated document numbers and manual overrides
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyData?.data?.results?.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Document Type</th>
                            <th className="text-left py-2">Number</th>
                            <th className="text-left py-2">Created By</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-left py-2">Created At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.data.results.map((item: any) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-2">{item.document_type_display || item.document_type}</td>
                              <td className="py-2 font-mono">{item.document_number}</td>
                              <td className="py-2">{item.created_by_name || '-'}</td>
                              <td className="py-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${item.is_manual_override ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                  {item.is_manual_override ? 'Manual' : 'Auto'}
                                </span>
                              </td>
                              <td className="py-2">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      No document numbers generated yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EnhancedDocumentNumbering
