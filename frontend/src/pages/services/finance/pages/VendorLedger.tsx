import React, { useState, useEffect } from 'react'
import { Search, Calendar, Download, FileText, CreditCard, TrendingUp, TrendingDown, User, Building } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface Vendor {
  id: number
  vendor_code: string
  name: string
  email: string
  phone: string
}

interface LedgerEntry {
  id: string
  date: string
  document_type: string
  document_number: string
  our_reference: string
  description: string
  debit_amount: number
  credit_amount: number
  balance: number
  status: string
  tds_amount?: number
  net_amount?: number
}

interface VendorLedgerData {
  vendor: Vendor
  total_invoiced: number
  total_paid: number
  total_tds_deducted: number
  outstanding_amount: number
  credit_limit: number
  entries: LedgerEntry[]
}

const VendorLedger: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [selectedVendor, setSelectedVendor] = useState<string>('')
  const [ledgerData, setLedgerData] = useState<VendorLedgerData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch vendors
  const fetchVendors = async () => {
    if (!sessionKey) return

    try {
      const response = await api.get('/api/finance/vendors/dropdown/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setVendors(response.data || [])
    } catch (error: any) {
      console.error('Error fetching vendors:', error)
      toast.error('Failed to fetch vendors')
    }
  }

  // Fetch vendor ledger
  const fetchVendorLedger = async () => {
    if (!sessionKey || !selectedVendor) return

    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        vendor_id: selectedVendor
      })
      
      if (startDate) params.append('start_date', startDate)
      if (endDate) params.append('end_date', endDate)

      const response = await api.get(`/api/finance/vendor-ledger/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setLedgerData(response.data)
    } catch (error: any) {
      console.error('Error fetching vendor ledger:', error)
      toast.error('Failed to fetch vendor ledger')
      setLedgerData(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
  }, [sessionKey])

  useEffect(() => {
    if (selectedVendor) {
      fetchVendorLedger()
    }
  }, [selectedVendor, startDate, endDate])

  // Filter ledger entries
  const filteredEntries = ledgerData?.entries.filter(entry =>
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.our_reference.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Export ledger
  const handleExport = () => {
    if (!ledgerData) return
    
    // Create CSV content
    const headers = ['Date', 'Document Type', 'Document Number', 'Our Reference', 'Description', 'Debit Amount', 'Credit Amount', 'Balance', 'Status']
    const csvContent = [
      headers.join(','),
      ...filteredEntries.map(entry => [
        entry.date,
        entry.document_type,
        entry.document_number,
        entry.our_reference,
        `"${entry.description}"`,
        entry.debit_amount,
        entry.credit_amount,
        entry.balance,
        entry.status
      ].join(','))
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vendor-ledger-${ledgerData.vendor.name}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
    
    toast.success('Ledger exported successfully')
  }

  // Get entry type color
  const getEntryTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'vendor invoice': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'payment': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'partially_paid': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Ledger</h1>
          <p className="text-gray-600 dark:text-gray-400">View transaction history with vendors</p>
        </div>
        {ledgerData && (
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Vendor *
              </label>
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose a vendor</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name} ({vendor.vendor_code})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Transactions
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Summary */}
      {ledgerData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vendor Info */}
          <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{ledgerData.vendor.name}</h3>
                  <p className="text-sm opacity-80">{ledgerData.vendor.vendor_code}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1">
                {ledgerData.vendor.email && (
                  <p className="text-sm opacity-80">{ledgerData.vendor.email}</p>
                )}
                {ledgerData.vendor.phone && (
                  <p className="text-sm opacity-80">{ledgerData.vendor.phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Total Invoiced */}
          <Card className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Invoiced</p>
                  <p className="text-2xl font-bold">₹{ledgerData.total_invoiced.toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 opacity-80" />
              </div>
            </CardContent>
          </Card>

          {/* Total Paid */}
          <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total Paid</p>
                  <p className="text-2xl font-bold">₹{ledgerData.total_paid.toLocaleString()}</p>
                </div>
                <TrendingDown className="h-8 w-8 opacity-80" />
              </div>
              {ledgerData.total_tds_deducted > 0 && (
                <div className="mt-2">
                  <p className="text-xs opacity-80">TDS Deducted: ₹{ledgerData.total_tds_deducted.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Outstanding */}
          <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Outstanding</p>
                  <p className="text-2xl font-bold">₹{ledgerData.outstanding_amount.toLocaleString()}</p>
                </div>
                <FileText className="h-8 w-8 opacity-80" />
              </div>
              <div className="mt-2">
                <p className="text-xs opacity-80">Credit Limit: ₹{ledgerData.credit_limit.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ledger Entries */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </CardContent>
        </Card>
      ) : ledgerData ? (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredEntries.length} transaction{filteredEntries.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredEntries.length > 0 ? (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-2 rounded-lg ${entry.document_type === 'Vendor Invoice' ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}>
                        {entry.document_type === 'Vendor Invoice' ? (
                          <FileText className={`h-5 w-5 ${entry.document_type === 'Vendor Invoice' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                        ) : (
                          <CreditCard className={`h-5 w-5 ${entry.document_type === 'Vendor Invoice' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{entry.description}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEntryTypeColor(entry.document_type)}`}>
                            {entry.document_type}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                            {entry.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(entry.date).toLocaleDateString()}
                          </span>
                          <span>Doc: {entry.document_number}</span>
                          {entry.our_reference && <span>Ref: {entry.our_reference}</span>}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-6">
                        {entry.debit_amount > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Debit</p>
                            <p className="font-semibold text-red-600 dark:text-red-400">
                              ₹{entry.debit_amount.toLocaleString()}
                            </p>
                          </div>
                        )}
                        
                        {entry.credit_amount > 0 && (
                          <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Credit</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              ₹{entry.credit_amount.toLocaleString()}
                            </p>
                            {entry.tds_amount && entry.tds_amount > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                TDS: ₹{entry.tds_amount.toLocaleString()}
                              </p>
                            )}
                          </div>
                        )}
                        
                        <div className="text-right min-w-[100px]">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Balance</p>
                          <p className={`font-bold ${entry.balance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            ₹{Math.abs(entry.balance).toLocaleString()}
                            {entry.balance >= 0 ? ' Dr' : ' Cr'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Try adjusting your search criteria' : 'No transactions available for the selected period'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : selectedVendor ? (
        <Card>
          <CardContent className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Unable to load ledger data for the selected vendor
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a vendor</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Choose a vendor from the dropdown above to view their ledger
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default VendorLedger