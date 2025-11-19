import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Calculator, AlertTriangle, CheckCircle } from 'lucide-react'

interface TDSSection {
  code: string
  description: string
  rate: number
  threshold: number
}

interface TDSCalculation {
  payment_amount: number
  tds_section: string
  section_description: string
  tds_rate: number
  tds_amount: number
  net_amount: number
  threshold: number
  is_above_threshold: boolean
}

interface TDSCalculatorProps {
  sessionKey: string
}

const TDSCalculator: React.FC<TDSCalculatorProps> = ({ sessionKey }) => {
  const [tdsSections, setTdsSections] = useState<TDSSection[]>([])
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [calculation, setCalculation] = useState<TDSCalculation | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch TDS sections on component mount
  useEffect(() => {
    fetchTdsSections()
  }, [])

  const fetchTdsSections = async () => {
    try {
      const response = await fetch('/api/finance/tds-sections/')
      const data = await response.json()
      setTdsSections(data.tds_sections || [])
    } catch (error) {
      console.error('Error fetching TDS sections:', error)
    }
  }

  const calculateTDS = async () => {
    if (!sessionKey || !selectedSection || paymentAmount <= 0) return

    setLoading(true)
    try {
      const response = await fetch('/api/finance/tds/calculate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_key: sessionKey,
          payment_amount: paymentAmount,
          tds_section: selectedSection
        })
      })
      const data = await response.json()
      if (response.ok) {
        setCalculation(data)
      } else {
        console.error('TDS calculation error:', data.error)
      }
    } catch (error) {
      console.error('Error calculating TDS:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedSectionInfo = () => {
    return tdsSections.find(section => section.code === selectedSection)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            TDS Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Amount (₹)</label>
              <input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter payment amount"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="tdsSection" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TDS Section</label>
              <select 
                id="tdsSection"
                value={selectedSection} 
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select TDS section</option>
                {tdsSections.map(section => (
                  <option key={section.code} value={section.code}>
                    {section.code} - {section.description} ({section.rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Info */}
          {selectedSection && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                {(() => {
                  const sectionInfo = getSelectedSectionInfo()
                  if (!sectionInfo) return null
                  
                  return (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-blue-900">
                        Section {sectionInfo.code}: {sectionInfo.description}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-700">TDS Rate:</span>
                          <span className="ml-2 font-semibold">{sectionInfo.rate}%</span>
                        </div>
                        <div>
                          <span className="text-blue-700">Threshold Limit:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(sectionInfo.threshold)}</span>
                        </div>
                      </div>
                      {paymentAmount > 0 && paymentAmount < sectionInfo.threshold && (
                        <div className="flex items-center gap-2 text-amber-700 bg-amber-100 p-2 rounded">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">
                            Payment amount is below threshold. TDS may not be applicable.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {/* Calculate Button */}
          <Button 
            onClick={calculateTDS} 
            disabled={loading || !selectedSection || paymentAmount <= 0}
            className="w-full"
          >
            {loading ? 'Calculating...' : 'Calculate TDS'}
          </Button>

          {/* Results */}
          {calculation && (
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  TDS Calculation Results
                  {calculation.is_above_threshold ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      TDS Applicable
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Below Threshold
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm text-gray-600">Payment Amount</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatCurrency(calculation.payment_amount)}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-sm text-gray-600">TDS Amount ({calculation.tds_rate}%)</p>
                      <p className="text-xl font-semibold text-red-600">
                        -{formatCurrency(calculation.tds_amount)}
                      </p>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-sm text-gray-600">Net Amount Payable</p>
                      <p className="text-xl font-semibold text-green-600">
                        {formatCurrency(calculation.net_amount)}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-semibold mb-3">Calculation Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Section:</span>
                        <span className="font-medium">{calculation.tds_section}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Description:</span>
                        <span className="font-medium">{calculation.section_description}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Threshold Limit:</span>
                        <span className="font-medium">{formatCurrency(calculation.threshold)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TDS Rate:</span>
                        <span className="font-medium">{calculation.tds_rate}%</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>Gross Amount:</span>
                        <span>{formatCurrency(calculation.payment_amount)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Less: TDS:</span>
                        <span>-{formatCurrency(calculation.tds_amount)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-green-600 text-base pt-2 border-t">
                        <span>Net Payable:</span>
                        <span>{formatCurrency(calculation.net_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {!calculation.is_above_threshold && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                      <div className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">Important Note</span>
                      </div>
                      <p className="text-sm text-amber-700 mt-2">
                        The payment amount is below the threshold limit of {formatCurrency(calculation.threshold)}. 
                        TDS deduction may not be mandatory, but please consult your tax advisor for specific cases.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default TDSCalculator