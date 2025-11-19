import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { governmentApiService, type ComplianceStatus } from '../../../../services/governmentApi'
import { CheckCircle, XCircle, Clock, FileText, Shield, AlertTriangle, Download, Send } from 'lucide-react'

export const GovernmentIntegration: React.FC = () => {
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [gstinInput, setGstinInput] = useState('')
  const [panInput, setPanInput] = useState('')
  const [validationResults, setValidationResults] = useState<any>({})
  const [filingResults, setFilingResults] = useState<any>({})

  useEffect(() => {
    loadComplianceStatus()
  }, [])

  const loadComplianceStatus = async () => {
    setLoading(true)
    try {
      const status = await governmentApiService.getComplianceStatus()
      setComplianceStatus(status)
    } catch (error) {
      console.error('Failed to load compliance status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGSTINValidation = async () => {
    if (!gstinInput) return
    
    setLoading(true)
    try {
      const result = await governmentApiService.validateGSTIN(gstinInput)
      setValidationResults((prev: any) => ({ ...prev, gstin: result }))
    } catch (error) {
      console.error('GSTIN validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePANValidation = async () => {
    if (!panInput) return
    
    setLoading(true)
    try {
      const result = await governmentApiService.validatePAN(panInput)
      setValidationResults((prev: any) => ({ ...prev, pan: result }))
    } catch (error) {
      console.error('PAN validation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGSTR1Filing = async () => {
    setLoading(true)
    try {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const result = await governmentApiService.fileGSTR1(gstinInput, currentMonth)
      setFilingResults((prev: any) => ({ ...prev, gstr1: result }))
    } catch (error) {
      console.error('GSTR-1 filing failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTDSFiling = async () => {
    setLoading(true)
    try {
      const currentQuarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}`
      const financialYear = `${new Date().getFullYear()}-${(new Date().getFullYear() + 1).toString().slice(-2)}`
      const result = await governmentApiService.fileTDSReturn(currentQuarter, financialYear)
      setFilingResults((prev: any) => ({ ...prev, tds: result }))
    } catch (error) {
      console.error('TDS filing failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: 'compliant' | 'pending') => {
    return status === 'compliant' ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <AlertTriangle className="h-5 w-5 text-yellow-500" />
  }

  const getStatusBadge = (status: 'compliant' | 'pending') => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        status === 'compliant' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {status === 'compliant' ? 'Compliant' : 'Pending'}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Government Integration</h2>
        <Button onClick={loadComplianceStatus} disabled={loading}>
          <Shield className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Compliance Overview */}
      {complianceStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(complianceStatus.overall_status)}
              Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">GST Compliance</p>
                  <p className="text-sm text-gray-600">
                    {complianceStatus.gst_compliance.pending_filings} pending filings
                  </p>
                </div>
                {getStatusBadge(complianceStatus.gst_compliance.status)}
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">TDS Compliance</p>
                  <p className="text-sm text-gray-600">
                    {complianceStatus.tds_compliance.pending_certificates} pending certificates
                  </p>
                </div>
                {getStatusBadge(complianceStatus.tds_compliance.status)}
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">E-Invoice</p>
                  <p className="text-sm text-gray-600">
                    {complianceStatus.einvoice_compliance.pending_irn} pending IRN
                  </p>
                </div>
                {getStatusBadge(complianceStatus.einvoice_compliance.status)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="w-full">
        <div className="flex border-b border-gray-200 mb-6">
          <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            Validation
          </button>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* GSTIN Validation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">GSTIN Validation</label>
                <div className="flex gap-2">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter 15-digit GSTIN"
                    value={gstinInput}
                    onChange={(e) => setGstinInput(e.target.value)}
                    maxLength={15}
                  />
                  <Button onClick={handleGSTINValidation} disabled={loading || gstinInput.length !== 15}>
                    Validate
                  </Button>
                </div>
                {validationResults.gstin && (
                  <div className="rounded-lg border p-3">
                    {validationResults.gstin.valid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Valid GSTIN - {validationResults.gstin.business_name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {validationResults.gstin.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PAN Validation */}
              <div className="space-y-2">
                <label className="text-sm font-medium">PAN Validation</label>
                <div className="flex gap-2">
                  <input
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter 10-digit PAN"
                    value={panInput}
                    onChange={(e) => setPanInput(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                  <Button onClick={handlePANValidation} disabled={loading || panInput.length !== 10}>
                    Validate
                  </Button>
                </div>
                {validationResults.pan && (
                  <div className="rounded-lg border p-3">
                    {validationResults.pan.valid ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Valid PAN - {validationResults.pan.name}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {validationResults.pan.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Government Filing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GSTR-1 Filing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  File monthly GSTR-1 return with government portal
                </p>
                <Button onClick={handleGSTR1Filing} disabled={loading} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  File GSTR-1
                </Button>
                {filingResults.gstr1 && (
                  <div className="rounded-lg border p-3">
                    {filingResults.gstr1.success ? (
                      <div className="text-green-600">
                        ✓ Filed successfully - Ref: {filingResults.gstr1.reference_id}
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ✗ Filing failed: {filingResults.gstr1.error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  TDS Return Filing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  File quarterly TDS return with income tax portal
                </p>
                <Button onClick={handleTDSFiling} disabled={loading} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  File TDS Return
                </Button>
                {filingResults.tds && (
                  <div className="rounded-lg border p-3">
                    {filingResults.tds.success ? (
                      <div className="text-green-600">
                        ✓ Filed successfully - Token: {filingResults.tds.token_no}
                      </div>
                    ) : (
                      <div className="text-red-600">
                        ✗ Filing failed: {filingResults.tds.error}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">E-Invoice Generation</h3>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                E-Invoice Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-3">
                <p className="text-sm text-gray-600">
                  E-Invoice generation is automatically handled when creating invoices above ₹5 lakhs.
                  IRN and QR codes are generated in real-time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-4 mt-6">
          <h3 className="text-lg font-semibold">Filing Calendar</h3>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Filing Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {governmentApiService.getUpcomingFilings(30).map((filing, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{filing.type}</p>
                      <p className="text-sm text-gray-600">{filing.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Due: {filing.due_date.toLocaleDateString()}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        filing.due_date.getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 
                          ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {Math.ceil((filing.due_date.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))} days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}