import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Calculator, CheckCircle, AlertCircle } from 'lucide-react'

interface LineItem {
  product_name: string
  line_total: number
  gst_rate: number
  cgst_amount?: number
  sgst_amount?: number
  igst_amount?: number
}

interface GSTCalculation {
  gst_type: 'igst' | 'cgst_sgst' | 'exempt'
  place_of_supply: string
  line_items: LineItem[]
  totals: {
    total_cgst: number
    total_sgst: number
    total_igst: number
    total_tax: number
  }
}

interface IndianState {
  code: string
  name: string
}

interface GSTCalculatorProps {
  sessionKey: string
}

const GSTCalculator: React.FC<GSTCalculatorProps> = ({ sessionKey }) => {
  const [states, setStates] = useState<IndianState[]>([])
  const [companyStateCode, setCompanyStateCode] = useState('27') // Default to Maharashtra
  const [customerGstin, setCustomerGstin] = useState('')
  const [customerStateCode, setCustomerStateCode] = useState('')
  const [gstinValid, setGstinValid] = useState<boolean | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { product_name: 'Sample Product', line_total: 1000, gst_rate: 18 }
  ])
  const [calculation, setCalculation] = useState<GSTCalculation | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch Indian states on component mount
  useEffect(() => {
    fetchIndianStates()
  }, [])

  // Validate GSTIN when it changes
  useEffect(() => {
    if (customerGstin.length === 15) {
      validateGstin(customerGstin)
    } else {
      setGstinValid(null)
      setCustomerStateCode('')
    }
  }, [customerGstin])

  const fetchIndianStates = async () => {
    try {
      const response = await fetch('/api/finance/indian-states/')
      const data = await response.json()
      setStates(data.states || [])
    } catch (error) {
      console.error('Error fetching states:', error)
    }
  }

  const validateGstin = async (gstin: string) => {
    try {
      const response = await fetch('/api/finance/gst/validate-gstin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gstin })
      })
      const data = await response.json()
      setGstinValid(data.is_valid)
      if (data.is_valid && data.state_code) {
        setCustomerStateCode(data.state_code)
      }
    } catch (error) {
      console.error('Error validating GSTIN:', error)
      setGstinValid(false)
    }
  }

  const calculateGST = async () => {
    if (!sessionKey) return

    setLoading(true)
    try {
      const response = await fetch('/api/finance/gst/calculate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_key: sessionKey,
          company_state_code: companyStateCode,
          customer_gstin: customerGstin,
          customer_state_code: customerStateCode,
          line_items: lineItems
        })
      })
      const data = await response.json()
      if (response.ok) {
        setCalculation(data)
      } else {
        console.error('GST calculation error:', data.error)
      }
    } catch (error) {
      console.error('Error calculating GST:', error)
    } finally {
      setLoading(false)
    }
  }

  const addLineItem = () => {
    setLineItems([...lineItems, { product_name: '', line_total: 0, gst_rate: 18 }])
  }

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const getGSTTypeDisplay = (gstType: string) => {
    switch (gstType) {
      case 'igst':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">IGST (Inter-State)</span>
      case 'cgst_sgst':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">CGST + SGST (Intra-State)</span>
      case 'exempt':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">GST Exempt</span>
      default:
        return null
    }
  }

  const getStateName = (code: string) => {
    const state = states.find(s => s.code === code)
    return state ? state.name : code
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            GST Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company & Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="companyState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company State</label>
              <select 
                id="companyState"
                value={companyStateCode} 
                onChange={(e) => setCompanyStateCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select company state</option>
                {states.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.code} - {state.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="customerGstin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer GSTIN</label>
              <div className="relative">
                <input
                  id="customerGstin"
                  type="text"
                  value={customerGstin}
                  onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                  placeholder="Enter 15-digit GSTIN"
                  maxLength={15}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {gstinValid !== null && (
                  <div className="absolute right-2 top-2">
                    {gstinValid ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {customerStateCode && (
                <p className="text-sm text-gray-600 mt-1">
                  Customer State: {getStateName(customerStateCode)}
                </p>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Line Items</label>
              <Button onClick={addLineItem} size="sm" variant="outline">
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center p-3 border rounded-lg">
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="Product name"
                      value={item.product_name}
                      onChange={(e) => updateLineItem(index, 'product_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="Line total"
                      value={item.line_total}
                      onChange={(e) => updateLineItem(index, 'line_total', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="GST %"
                      value={item.gst_rate}
                      onChange={(e) => updateLineItem(index, 'gst_rate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-gray-600">
                      Tax: ₹{((item.line_total * item.gst_rate) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-1">
                    {lineItems.length > 1 && (
                      <Button
                        onClick={() => removeLineItem(index)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Calculate Button */}
          <Button onClick={calculateGST} disabled={loading} className="w-full">
            {loading ? 'Calculating...' : 'Calculate GST'}
          </Button>

          {/* Results */}
          {calculation && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  GST Calculation Results
                  {getGSTTypeDisplay(calculation.gst_type)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">
                      Place of Supply: {getStateName(calculation.place_of_supply)}
                    </p>
                  </div>

                  {/* Tax Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {calculation.gst_type === 'cgst_sgst' ? (
                      <>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">CGST</p>
                          <p className="text-lg font-semibold">₹{calculation.totals.total_cgst.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">SGST</p>
                          <p className="text-lg font-semibold">₹{calculation.totals.total_sgst.toFixed(2)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 bg-white rounded-lg">
                        <p className="text-sm text-gray-600">IGST</p>
                        <p className="text-lg font-semibold">₹{calculation.totals.total_igst.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total Tax</p>
                      <p className="text-lg font-semibold text-blue-600">₹{calculation.totals.total_tax.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default GSTCalculator