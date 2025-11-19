import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Users,
  Target,
  Zap
} from 'lucide-react'

import toast from 'react-hot-toast'

interface AIFeaturesManagerProps {
  sessionKey: string
}

export const AIFeaturesManager: React.FC<AIFeaturesManagerProps> = ({ sessionKey }) => {
  const [activeTab, setActiveTab] = useState<'payment-prediction' | 'fraud-detection' | 'insights'>('payment-prediction')
  const [loading, setLoading] = useState(false)
  const [predictionData, setPredictionData] = useState<any>(null)
  const [fraudData, setFraudData] = useState<any>(null)
  const [insightsData, setInsightsData] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('')

  useEffect(() => {
    fetchCustomers()
    fetchPaymentInsights()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`/api/finance/customers/?session_key=${sessionKey}`)
      const data = await response.json()
      setCustomers(data.results || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    }
  }

  const predictPaymentLikelihood = async () => {
    if (!selectedCustomer || !invoiceAmount) {
      toast.error('Please select a customer and enter invoice amount')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/finance/ai/predict-payment/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_key: sessionKey,
          customer_id: selectedCustomer,
          invoice_amount: parseFloat(invoiceAmount)
        })
      })
      
      const data = await response.json()
      setPredictionData(data)
      toast.success('Payment prediction generated successfully')
    } catch (error) {
      console.error('Failed to predict payment:', error)
      toast.error('Failed to generate payment prediction')
    } finally {
      setLoading(false)
    }
  }

  const detectFraudAnomalies = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/ai/fraud-detection/?session_key=${sessionKey}`)
      const data = await response.json()
      setFraudData(data)
      toast.success('Fraud detection analysis completed')
    } catch (error) {
      console.error('Failed to detect fraud:', error)
      toast.error('Failed to run fraud detection')
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/finance/ai/payment-insights/?session_key=${sessionKey}`)
      const data = await response.json()
      setInsightsData(data)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderPaymentPrediction = () => (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Payment Likelihood Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Choose a customer...</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.customer_code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Invoice Amount (₹)</label>
              <input
                type="number"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="Enter invoice amount"
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={predictPaymentLikelihood} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Predicting...' : 'Predict Payment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prediction Results */}
      {predictionData && (
        <Card>
          <CardHeader>
            <CardTitle>AI Prediction Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-3xl font-bold ${
                  predictionData.payment_likelihood >= 80 ? 'text-green-600' :
                  predictionData.payment_likelihood >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {predictionData.payment_likelihood}%
                </div>
                <p className="text-sm text-gray-600">Payment Likelihood</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-lg font-semibold text-blue-600">
                  {new Date(predictionData.predicted_payment_date).toLocaleDateString()}
                </div>
                <p className="text-sm text-gray-600">Predicted Payment Date</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  predictionData.risk_level === 'low' ? 'bg-green-100 text-green-800' :
                  predictionData.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {predictionData.risk_level.toUpperCase()} RISK
                </div>
                <p className="text-sm text-gray-600 mt-1">Risk Level</p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {predictionData.confidence}%
                </div>
                <p className="text-sm text-gray-600">Confidence Score</p>
              </div>
            </div>
            
            {/* Factors */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">Key Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {predictionData.factors.map((factor: string, index: number) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Historical Metrics */}
            {predictionData.historical_metrics && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold mb-2">Historical Performance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Payment Rate:</span>
                    <span className="font-medium ml-2">{predictionData.historical_metrics.payment_rate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Delay:</span>
                    <span className="font-medium ml-2">{predictionData.historical_metrics.average_delay_days} days</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Invoices:</span>
                    <span className="font-medium ml-2">{predictionData.historical_metrics.total_invoices}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Paid Invoices:</span>
                    <span className="font-medium ml-2">{predictionData.historical_metrics.paid_invoices}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderFraudDetection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fraud Detection & Anomaly Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={detectFraudAnomalies} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Fraud Detection'}
          </Button>
        </CardContent>
      </Card>

      {fraudData && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-gray-800">{fraudData?.summary?.total_anomalies || 0}</div>
                  <p className="text-sm text-gray-600">Total Anomalies</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{fraudData?.summary?.high_severity || 0}</div>
                  <p className="text-sm text-gray-600">High Severity</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{fraudData?.summary?.medium_severity || 0}</div>
                  <p className="text-sm text-gray-600">Medium Severity</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{fraudData?.summary?.low_severity || 0}</div>
                  <p className="text-sm text-gray-600">Low Severity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anomalies List */}
          <Card>
            <CardHeader>
              <CardTitle>Detected Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {fraudData?.anomalies?.map((anomaly: any, index: number) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    anomaly.severity === 'high' ? 'border-red-200 bg-red-50' :
                    anomaly.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                          anomaly.severity === 'high' ? 'text-red-500' :
                          anomaly.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <h4 className="font-medium">{anomaly.type.replace('_', ' ').toUpperCase()}</h4>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                          {anomaly.reference && (
                            <p className="text-xs text-gray-500 mt-1">Reference: {anomaly.reference}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        anomaly.severity === 'high' ? 'bg-red-100 text-red-800' :
                        anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {anomaly.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  const renderPaymentInsights = () => (
    <div className="space-y-6">
      {insightsData && (
        <>
          {/* Payment Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Payment Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {insightsData?.payment_patterns?.payment_methods && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Payment Methods</h4>
                    <div className="space-y-2">
                      {Object.entries(insightsData?.payment_patterns?.payment_methods || {}).map(([method, data]: [string, any]) => (
                        <div key={method} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="capitalize">{method.replace('_', ' ')}</span>
                          <div className="text-right">
                            <div className="font-medium">{data.count} payments</div>
                            <div className="text-sm text-gray-600">₹{data.avg_amount.toLocaleString()} avg</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Day of Week Patterns</h4>
                    <div className="space-y-2">
                      {Object.entries(insightsData?.payment_patterns?.day_of_week_patterns || {}).map(([day, count]: [string, any]) => (
                        <div key={day} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span>{day}</span>
                          <span className="font-medium">{count} payments</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Risks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Customer Risk Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insightsData?.customer_risks?.map((customer: any, index: number) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    customer.risk_level === 'high' ? 'border-red-200 bg-red-50' :
                    customer.risk_level === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-green-200 bg-green-50'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{customer.customer_name}</h4>
                        <p className="text-sm text-gray-600">Total Business: ₹{customer.total_amount.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Outstanding: ₹{customer.outstanding_amount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          customer.risk_level === 'high' ? 'text-red-600' :
                          customer.risk_level === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {customer.risk_score}%
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          customer.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                          customer.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {customer.risk_level.toUpperCase()} RISK
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insightsData?.recommendations?.map((rec: any, index: number) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-3">
                      <Brain className={`h-5 w-5 mt-0.5 ${
                        rec.priority === 'high' ? 'text-red-500' :
                        rec.priority === 'medium' ? 'text-yellow-500' :
                        'text-blue-500'
                      }`} />
                      <div>
                        <h4 className="font-medium">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                        <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${
                          rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                          rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI-Powered Finance Features
          </h2>
          <p className="text-gray-600">Advanced analytics and predictions for better financial decisions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { id: 'payment-prediction', label: 'Payment Prediction', icon: Target },
            { id: 'fraud-detection', label: 'Fraud Detection', icon: Shield },
            { id: 'insights', label: 'Payment Insights', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'payment-prediction' && renderPaymentPrediction()}
      {activeTab === 'fraud-detection' && renderFraudDetection()}
      {activeTab === 'insights' && renderPaymentInsights()}
    </div>
  )
}