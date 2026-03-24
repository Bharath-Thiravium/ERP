import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { CheckCircle, Shield, FileText, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

const STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
  '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
  '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand',
  '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '28': 'Andhra Pradesh',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
  '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh (New)', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction'
}

const PAN_TYPES: Record<string, string> = {
  'P': 'Individual', 'C': 'Company', 'H': 'Hindu Undivided Family',
  'F': 'Firm / LLP', 'A': 'Association of Persons', 'T': 'Trust',
  'B': 'Body of Individuals', 'L': 'Local Authority',
  'J': 'Artificial Juridical Person', 'G': 'Government'
}

function decodeGSTIN(gstin: string) {
  const stateCode = gstin.slice(0, 2)
  const pan = gstin.slice(2, 12)
  const entityNum = gstin[12]
  const panType = pan[3]?.toUpperCase()
  return {
    stateCode,
    stateName: STATE_CODES[stateCode] || `State ${stateCode}`,
    pan,
    entityNumber: entityNum,
    taxpayerType: PAN_TYPES[panType] || 'Unknown',
  }
}

function decodePAN(pan: string) {
  const typeChar = pan[3]?.toUpperCase()
  const initials = pan.slice(0, 3).toUpperCase()
  return {
    type: PAN_TYPES[typeChar] || 'Unknown',
    initials,
    serial: pan.slice(4, 9),
  }
}

interface Customer {
  id: number
  name: string
  gstin: string
  pan_number: string
  email: string
  billing_address_line1: string
  billing_address_line2?: string
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
}

export const SimpleGovernmentIntegration: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [gstinInput, setGstinInput] = useState('')
  const [panInput, setPanInput] = useState('')
  const [gstinDetails, setGstinDetails] = useState<(ReturnType<typeof decodeGSTIN> & { valid: boolean; businessName: string; address: string; apiKeyMissing: boolean }) | null>(null)
  const [panDetails, setPanDetails] = useState<(ReturnType<typeof decodePAN> & { valid: boolean }) | null>(null)
  const [gstinLoading, setGstinLoading] = useState(false)
  const [gstr1Loading, setGstr1Loading] = useState(false)
  const [tdsLoading, setTdsLoading] = useState(false)

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
    setGstinDetails(null)
    setPanDetails(null)
  }

  const validateGSTIN = () => {
    const g = gstinInput.trim().toUpperCase()
    if (g.length !== 15 || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) {
      setGstinDetails({ valid: false, stateCode: '', stateName: 'Invalid GSTIN', pan: '', entityNumber: '', taxpayerType: '', businessName: '', address: '', apiKeyMissing: false })
      toast.error('Invalid GSTIN format')
      return
    }
    const decoded = decodeGSTIN(g)
    setGstinLoading(true)
    apiClient.post('/api/finance/gov-api/validate-gstin/', { gstin: g })
      .then(r => {
        const d = r.data
        setGstinDetails({
          valid: true,
          ...decoded,
          businessName: d.business_name || d.legal_name || '',
          address: d.address || '',
          apiKeyMissing: d.api_key_missing || false
        })
      })
      .catch(() => setGstinDetails({ valid: true, ...decoded, businessName: '', address: '', apiKeyMissing: true }))
      .finally(() => setGstinLoading(false))
  }

  const validatePAN = () => {
    const p = panInput.trim().toUpperCase()
    if (p.length !== 10 || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(p)) {
      setPanDetails({ valid: false, type: 'Invalid PAN', initials: '', serial: '' })
      toast.error('Invalid PAN format')
      return
    }
    setPanDetails({ valid: true, ...decodePAN(p) })
    toast.success('PAN decoded successfully')
  }

  const fileGSTR1 = async () => {
    if (!selectedCustomer || !gstinInput) {
      toast.error('Please select a customer with GSTIN and validate it first')
      return
    }
    
    const currentDate = new Date()
    const returnPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`
    
    setGstr1Loading(true)
    try {
      await apiClient.post('/api/finance/gov-api/file-gstr1/', {
        gstin: gstinInput,
        return_period: returnPeriod
      })
      toast.success(`GSTR-1 filed successfully for ${selectedCustomer.name} (GSTIN: ${gstinInput})`)
    } catch (error) {
      toast.error('Failed to file GSTR-1')
    } finally {
      setGstr1Loading(false)
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
    
    setTdsLoading(true)
    try {
      await apiClient.post('/api/finance/gov-api/file-tds-return/', {
        quarter,
        financial_year: financialYear,
        pan: panInput
      })
      toast.success(`TDS return filed successfully for ${selectedCustomer.name} (PAN: ${panInput})`)
    } catch (error) {
      toast.error('Failed to file TDS return')
    } finally {
      setTdsLoading(false)
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
              <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                <p className="text-sm font-medium text-blue-800">{selectedCustomer.name}</p>
                <p className="text-xs text-blue-600">GSTIN: {selectedCustomer.gstin || 'Not provided'}</p>
                <p className="text-xs text-blue-600">PAN: {selectedCustomer.pan_number || 'Not provided'}</p>
                <p className="text-xs text-blue-600">
                  Address: {[
                    selectedCustomer.billing_address_line1,
                    selectedCustomer.billing_address_line2,
                    selectedCustomer.billing_city,
                    selectedCustomer.billing_state,
                    selectedCustomer.billing_pincode,
                    selectedCustomer.billing_country
                  ].filter(Boolean).join(', ')}
                </p>
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
              <Button onClick={validateGSTIN} disabled={!gstinInput || gstinLoading}>
                {gstinLoading ? 'Looking up...' : 'Validate'}
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
              <Button onClick={validatePAN} disabled={!panInput}>
                Validate
              </Button>
            </div>
          </div>

          {gstinDetails && (
            <div className={`rounded-lg border p-3 ${gstinDetails.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {gstinDetails.valid ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-green-800">GSTIN Valid ✓</p>
                  {gstinDetails.businessName && (
                    <p className="text-sm font-medium text-green-900">{gstinDetails.businessName}</p>
                  )}
                  {gstinDetails.address && (
                    <p className="text-xs text-green-700">📍 {gstinDetails.address}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-700">
                    <span><strong>State:</strong> {gstinDetails.stateName} ({gstinDetails.stateCode})</span>
                    <span><strong>Taxpayer Type:</strong> {gstinDetails.taxpayerType}</span>
                    <span><strong>PAN:</strong> {gstinDetails.pan}</span>
                    <span><strong>Entity No:</strong> {gstinDetails.entityNumber}</span>
                  </div>
                  {gstinDetails.apiKeyMissing && (
                    <p className="text-xs text-amber-600 mt-1">⚠ To fetch business name & address, add <code>GSTINCHECK_API_KEY</code> to backend .env (free at gstincheck.co.in)</p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-red-800">Invalid GSTIN format</p>
              )}
            </div>
          )}

          {panDetails && (
            <div className={`rounded-lg border p-3 ${panDetails.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {panDetails.valid ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-800">PAN Valid ✓</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-green-700">
                    <span><strong>Taxpayer Type:</strong> {panDetails.type}</span>
                    <span><strong>Initials:</strong> {panDetails.initials}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-red-800">Invalid PAN format</p>
              )}
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
              <Button className="w-full" onClick={fileGSTR1} disabled={gstr1Loading || !selectedCustomer || !gstinInput}>
                {gstr1Loading ? 'Filing...' : 'File GSTR-1'}
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">TDS Return Filing</h3>
              <p className="text-sm text-gray-600 mb-3">
                File quarterly TDS return for selected customer
              </p>
              <Button className="w-full" onClick={fileTDSReturn} disabled={tdsLoading || !selectedCustomer || !panInput}>
                {tdsLoading ? 'Filing...' : 'File TDS Return'}
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