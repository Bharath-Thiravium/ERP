import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { CheckCircle, XCircle, Shield, FileText, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

interface Customer {
  id: number
  name: string
  gstin: string
  pan_number: string
  email: string
}

export const SimpleGovernmentIntegration: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [gstinInput, setGstinInput] = useState('')
  const [panInput, setPanInput] = useState('')
  const [validationResult, setValidationResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.get('/api/finance/customers/')
      setCustomers(response.data.results || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    setGstinInput(customer.gstin || '')
    setPanInput(customer.pan_number || '')
    setValidationResult('')
  }

  const validateGSTIN = async () => {
    if (!gstinInput || gstinInput.length !== 15) {
      setValidationResult('Invalid GSTIN format')
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.post('/api/finance/gov-api/validate-gstin/', {
        gstin: gstinInput
      })
      setValidationResult('GSTIN validation successful')
      toast.success('GSTIN validated successfully')
    } catch (error) {
      setValidationResult('GSTIN validation failed')
      toast.error('Failed to validate GSTIN')
    } finally {
      setLoading(false)
    }
  }

  const validatePAN = async () => {
    if (!panInput || panInput.length !== 10) {
      setValidationResult('Invalid PAN format')
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.post('/api/finance/gov-api/validate-pan/', {
        pan: panInput
      })
      setValidationResult('PAN validation successful')
      toast.success('PAN validated successfully')
    } catch (error) {
      setValidationResult('PAN validation failed')
      toast.error('Failed to validate PAN')
    } finally {
      setLoading(false)
    }
  }

  const fileGSTR1 = async () => {
    if (!selectedCustomer || !gstinInput) {
      toast.error('Please select a customer with GSTIN and validate it first')
      return
    }
    
    const currentDate = new Date()
    const returnPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    
    setLoading(true)
    try {
      const response = await apiClient.post('/api/finance/gov-api/file-gstr1/', {
        gstin: gstinInput,
        return_period: returnPeriod
      })
      toast.success(`GSTR-1 filed successfully for ${selectedCustomer.name} (GSTIN: ${gstinInput})`)
    } catch (error) {
      toast.error('Failed to file GSTR-1')
    } finally {
      setLoading(false)
    }
  }

  const fileTDSReturn = async () => {
    if (!selectedCustomer || !panInput) {
      toast.error('Please select a customer with PAN and validate it first')
      return
    }
    
    const currentDate = new Date()
    const quarter = `Q${Math.ceil((currentDate.getMonth() + 1) / 3)}`
    const financialYear = `${currentDate.getFullYear()}-${currentDate.getFullYear() + 1}`
    
    setLoading(true)
    try {
      const response = await apiClient.post('/api/finance/gov-api/file-tds-return/', {
        quarter,
        financial_year: financialYear,
        pan: panInput
      })
      toast.success(`TDS return filed successfully for ${selectedCustomer.name} (PAN: ${panInput})`)
    } catch (error) {
      toast.error('Failed to file TDS return')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Government Integration
        </h2>
      </div>

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Customer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <select
              className="w-full p-2 border border-gray-300 rounded-md"
              value={selectedCustomer?.id || ''}
              onChange={(e) => {
                const customer = customers.find(c => c.id === parseInt(e.target.value))
                if (customer) handleCustomerSelect(customer)
              }}
            >
              <option value="">Select a customer...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.email}
                </option>
              ))}
            </select>
            
            {selectedCustomer && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">Selected: {selectedCustomer.name}</p>
                <p className="text-xs text-blue-600">GSTIN: {selectedCustomer.gstin || 'Not provided'}</p>
                <p className="text-xs text-blue-600">PAN: {selectedCustomer.pan_number || 'Not provided'}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Real-time Validation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">GSTIN Validation</label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
                placeholder="Select customer to auto-fill GSTIN"
                value={gstinInput}
                readOnly
              />
              <Button onClick={validateGSTIN} disabled={loading || !gstinInput}>
                {loading ? 'Validating...' : 'Validate'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PAN Validation</label>
            <div className="flex gap-2">
              <input
                className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
                placeholder="Select customer to auto-fill PAN"
                value={panInput}
                readOnly
              />
              <Button onClick={validatePAN} disabled={loading || !panInput}>
                {loading ? 'Validating...' : 'Validate'}
              </Button>
            </div>
          </div>

          {validationResult && (
            <div className={`rounded-lg border p-3 ${
              validationResult.includes('successful') 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm ${
                validationResult.includes('successful') 
                  ? 'text-green-800' 
                  : 'text-red-800'
              }`}>
                {validationResult}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filing Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Government Filing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">GSTR-1 Filing</h3>
              <p className="text-sm text-gray-600 mb-3">
                File monthly GSTR-1 return for selected customer
              </p>
              <Button className="w-full" onClick={fileGSTR1} disabled={loading || !selectedCustomer || !gstinInput}>
                {loading ? 'Filing...' : 'File GSTR-1'}
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">TDS Return Filing</h3>
              <p className="text-sm text-gray-600 mb-3">
                File quarterly TDS return for selected customer
              </p>
              <Button className="w-full" onClick={fileTDSReturn} disabled={loading || !selectedCustomer || !panInput}>
                {loading ? 'Filing...' : 'File TDS Return'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Section */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>GST Compliance</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compliant
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>TDS Compliance</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compliant
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span>E-Invoice Status</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}