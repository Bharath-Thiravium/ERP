import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { 
  FileText, 
  Download, 
  Filter,
  Search,
  Calendar,
  TrendingUp,
  DollarSign,
  FileCheck,
  Package
} from 'lucide-react'
import api from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

type ReportType = 'quotations' | 'purchase-orders' | 'proforma-invoices' | 'invoices'

interface FilterParams {
  start_date?: string
  end_date?: string
  status?: string[]
  payment_status?: string[]
  customer?: string
  search?: string
}

interface Summary {
  total_count: number
  total_amount: number
  total_paid?: number
  total_outstanding?: number
  status_breakdown?: Record<string, number>
  payment_status_breakdown?: Record<string, number>
}

const Reports: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  
  const [activeReport, setActiveReport] = useState<ReportType>('quotations')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [filters, setFilters] = useState<FilterParams>({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10)
  })
  const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerSearchInput, setCustomerSearchInput] = useState('')
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  const reportConfig = {
    quotations: {
      title: 'Quotations Report',
      icon: FileText,
      endpoint: '/api/reports/quotations/',
      statusField: 'status',
      dateField: 'quotation_date',
      numberField: 'quotation_number',
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'approved', label: 'Approved' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' },
        { value: 'converted', label: 'Converted' }
      ]
    },
    'purchase-orders': {
      title: 'Purchase Orders / Work Orders Report',
      icon: Package,
      endpoint: '/api/reports/purchase-orders/',
      statusField: 'status',
      dateField: 'po_date',
      numberField: 'internal_po_number',
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'partially_completed', label: 'Partially Completed' },
        { value: 'completed', label: 'Completed' }
      ]
    },
    'proforma-invoices': {
      title: 'Proforma Invoices Report',
      icon: FileCheck,
      endpoint: '/api/reports/proforma-invoices/',
      statusField: 'payment_status',
      dateField: 'proforma_date',
      numberField: 'proforma_number',
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partially_paid', label: 'Partially Paid' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' }
      ]
    },
    invoices: {
      title: 'Invoices Report',
      icon: DollarSign,
      endpoint: '/api/reports/invoices/',
      statusField: 'payment_status',
      dateField: 'invoice_date',
      numberField: 'invoice_number',
      statusOptions: [
        { value: '', label: 'All Status' },
        { value: 'unpaid', label: 'Unpaid' },
        { value: 'partially_paid', label: 'Partially Paid' },
        { value: 'paid', label: 'Paid' },
        { value: 'overdue', label: 'Overdue' }
      ]
    }
  }

  const fetchData = async () => {
    const currentSessionKey = sessionKey || sessionStorage.getItem('service_session_key')
    
    if (!currentSessionKey) {
      toast.error('Session expired. Please login again.')
      return
    }

    setLoading(true)
    try {
      const config = reportConfig[activeReport]
      const params = new URLSearchParams()
      
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      
      // Handle multiple status selections
      if (filters.status && filters.status.length > 0) {
        filters.status.forEach(status => {
          if (status) params.append(config.statusField, status)
        })
      }
      
      if (filters.customer) params.append('customer', filters.customer)
      if (filters.search) params.append('search', filters.search)

      const [dataResponse, summaryResponse] = await Promise.all([
        api.get(`${config.endpoint}?${params.toString()}`, {
          headers: { Authorization: `Bearer ${currentSessionKey}` }
        }),
        api.get(`${config.endpoint}summary/?${params.toString()}`, {
          headers: { Authorization: `Bearer ${currentSessionKey}` }
        })
      ])

      setData(dataResponse.data.results || dataResponse.data)
      setSummary(summaryResponse.data)
    } catch (error: any) {
      console.error('Failed to fetch report data:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const currentSessionKey = sessionKey || sessionStorage.getItem('service_session_key')
    if (currentSessionKey) {
      fetchData()
    }
  }, [activeReport, sessionKey])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleFilterChange = (key: keyof FilterParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const fetchCustomerSuggestions = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setCustomerSuggestions([])
      setShowCustomerDropdown(false)
      return
    }

    const currentSessionKey = sessionKey || sessionStorage.getItem('service_session_key')
    if (!currentSessionKey) return

    try {
      const response = await api.get(`/api/finance/customers/?search=${encodeURIComponent(searchTerm)}&page_size=10`, {
        headers: { Authorization: `Bearer ${currentSessionKey}` }
      })
      setCustomerSuggestions(response.data.results || [])
      setShowCustomerDropdown(true)
    } catch (error) {
      console.error('Failed to fetch customer suggestions:', error)
    }
  }

  const handleCustomerSearchChange = (value: string) => {
    setCustomerSearchInput(value)
    setFilters(prev => ({ ...prev, customer: value }))
    fetchCustomerSuggestions(value)
  }

  const selectCustomer = (customer: any) => {
    setCustomerSearchInput(customer.name)
    setFilters(prev => ({ ...prev, customer: customer.name }))
    setShowCustomerDropdown(false)
  }

  const handleStatusToggle = (statusValue: string) => {
    setFilters(prev => {
      const currentStatuses = prev.status || []
      const newStatuses = currentStatuses.includes(statusValue)
        ? currentStatuses.filter(s => s !== statusValue)
        : [...currentStatuses, statusValue]
      return { ...prev, status: newStatuses }
    })
  }

  const handleApplyFilters = () => {
    fetchData()
  }

  const handleClearFilters = () => {
    setFilters({
      start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      end_date: new Date().toISOString().slice(0, 10)
    })
  }

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    try {
      const config = reportConfig[activeReport]
      const headers = ['Number', 'Date', 'Customer', 'Status', 'Amount', 'Paid', 'Outstanding']
      const rows = data.map(item => [
        item[config.numberField],
        item[config.dateField],
        item.customer_name,
        item[config.statusField],
        item.total_amount,
        item.paid_amount || 0,
        item.outstanding_amount || 0
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${activeReport}-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Report exported successfully')
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export report')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const config = reportConfig[activeReport]
  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Report Type Tabs */}
      <div className="border-b border-gray-200 bg-white/50 dark:bg-gray-900/50 rounded-t-xl">
        <div className="flex space-x-8 px-6">
          {(Object.keys(reportConfig) as ReportType[]).map(type => {
            const TabIcon = reportConfig[type].icon
            return (
              <button
                key={type}
                onClick={() => setActiveReport(type)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeReport === type
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {reportConfig[type].title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Count</p>
                  <p className="text-2xl font-bold">{summary.total_count}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_amount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {summary.total_paid !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_paid)}</p>
                  </div>
                  <FileCheck className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          )}

          {summary.total_outstanding !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Outstanding</p>
                    <p className="text-2xl font-bold">{formatCurrency(summary.total_outstanding)}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date</label>
              <input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status (Multiple)</label>
              <div className="border rounded-md p-3 bg-white max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {config.statusOptions
                    .filter(option => option.value !== '')
                    .map(option => (
                      <label key={option.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={(filters.status || []).includes(option.value)}
                          onChange={() => handleStatusToggle(option.value)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                </div>
                {filters.status && filters.status.length > 0 && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, status: [] }))}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Clear all ({filters.status.length} selected)
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-2">Customer</label>
              <input
                type="text"
                placeholder="Search customer..."
                value={customerSearchInput}
                onChange={(e) => handleCustomerSearchChange(e.target.value)}
                onFocus={() => customerSearchInput.length >= 2 && setShowCustomerDropdown(true)}
                className="w-full p-2 border rounded-md"
              />
              {showCustomerDropdown && customerSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {customerSuggestions.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => selectCustomer(customer)}
                      className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-gray-500">{customer.customer_code}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 p-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} disabled={loading}>
              Apply Filters
            </Button>
            <Button onClick={handleClearFilters} variant="outline">
              Clear Filters
            </Button>
            <Button onClick={exportToCSV} variant="outline" disabled={data.length === 0} className="ml-auto">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data found for the selected filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Number</th>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Customer</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Amount</th>
                    {(activeReport === 'proforma-invoices' || activeReport === 'invoices') && (
                      <>
                        <th className="text-right p-3">Paid</th>
                        <th className="text-right p-3">Outstanding</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item[config.numberField]}</td>
                      <td className="p-3">{new Date(item[config.dateField]).toLocaleDateString()}</td>
                      <td className="p-3">{item.customer_name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item[config.statusField] === 'paid' || item[config.statusField] === 'completed' || item[config.statusField] === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : item[config.statusField] === 'unpaid' || item[config.statusField] === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : item[config.statusField] === 'overdue' || item[config.statusField] === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item[config.statusField]}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.total_amount)}</td>
                      {(activeReport === 'proforma-invoices' || activeReport === 'invoices') && (
                        <>
                          <td className="p-3 text-right">{formatCurrency(item.paid_amount || 0)}</td>
                          <td className="p-3 text-right">{formatCurrency(item.outstanding_amount || 0)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Reports
