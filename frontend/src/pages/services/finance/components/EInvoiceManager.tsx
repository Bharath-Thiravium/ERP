/**
 * E-Invoice Management Component
 */
import React, { useState, useEffect } from 'react'
// import { documentApi, EInvoiceResult } from '../../../../services/documentApi'
import { financeApi } from '../../../../services/financeApi'
import { DataTable } from '../../../../components/ui/DataTable'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { Badge } from '../../../../components/ui/Badge'
import { Card } from '../../../../components/ui/Card'
import { 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Download,
  QrCode,
  FileText,
  RefreshCw,
  Eye
} from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  customer?: {
    name: string
    gstin?: string
  }
  total_amount: number
  invoice_date: string
  payment_status: string
  einvoice_status?: string
  einvoice_irn?: string
}

interface EInvoiceManagerProps {
  className?: string
}

export const EInvoiceManager: React.FC<EInvoiceManagerProps> = ({ className = '' }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedEInvoice] = useState<any | null>(null)
  const [bulkGenerating, setBulkGenerating] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      const response = await financeApi.getInvoices({ page: 1, page_size: 100 })
      setInvoices(response.results)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateEInvoice = async (invoiceId: string) => {
    try {
      setLoading(true)
      // TODO: Implement E-Invoice generation API
      console.log('Generate E-Invoice for:', invoiceId)
      alert('E-Invoice generation will be implemented')
    } catch (error) {
      console.error('Failed to generate E-Invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkGenerate = async () => {
    try {
      setBulkGenerating(true)
      // TODO: Implement bulk E-Invoice generation API
      console.log('Bulk E-Invoice generation for:', selectedInvoices)
      alert('Bulk E-Invoice generation will be implemented')
      setSelectedInvoices([])
      loadInvoices()
      
    } catch (error) {
      console.error('Failed to bulk generate E-Invoices:', error)
    } finally {
      setBulkGenerating(false)
    }
  }

  const getEInvoiceStatus = (invoice: Invoice) => {
    if (invoice.einvoice_irn) {
      return <Badge color="green">Generated</Badge>
    } else if (invoice.customer?.gstin) {
      return <Badge color="yellow">Pending</Badge>
    } else {
      return <Badge color="gray">Not Required</Badge>
    }
  }

  const canGenerateEInvoice = (invoice: Invoice): boolean => {
    return !!(invoice.customer?.gstin && !invoice.einvoice_irn && invoice.total_amount >= 50000)
  }

  const columns = [
    {
      key: 'invoice_number',
      header: 'Invoice Number',
      render: (invoice: Invoice) => (
        <div>
          <div className="font-medium">{invoice.invoice_number}</div>
          <div className="text-xs text-gray-500">
            {new Date(invoice.invoice_date).toLocaleDateString()}
          </div>
        </div>
      )
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (invoice: Invoice) => (
        <div>
          <div className="font-medium">{invoice.customer?.name || 'N/A'}</div>
          {invoice.customer?.gstin && (
            <div className="text-xs text-gray-500">GSTIN: {invoice.customer.gstin}</div>
          )}
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (invoice: Invoice) => (
        <div className="text-right">
          <div className="font-medium">₹{invoice.total_amount.toLocaleString()}</div>
          <div className="text-xs text-gray-500 capitalize">{invoice.payment_status}</div>
        </div>
      )
    },
    {
      key: 'einvoice_status',
      header: 'E-Invoice Status',
      render: (invoice: Invoice) => getEInvoiceStatus(invoice)
    },
    {
      key: 'irn',
      header: 'IRN',
      render: (invoice: Invoice) => (
        <div className="text-xs font-mono">
          {invoice.einvoice_irn ? (
            <span className="text-green-600">{invoice.einvoice_irn.substring(0, 20)}...</span>
          ) : (
            <span className="text-gray-400">Not Generated</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice: Invoice) => (
        <div className="flex items-center gap-2">
          {canGenerateEInvoice(invoice) && (
            <Button
              size="sm"
              onClick={() => handleGenerateEInvoice(invoice.id)}
              disabled={loading}
            >
              <Zap className="w-4 h-4 mr-1" />
              Generate
            </Button>
          )}
          {invoice.einvoice_irn && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Show QR code or download
                console.log('View E-Invoice details')
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  const eligibleInvoices = invoices.filter(canGenerateEInvoice)
  const generatedCount = invoices.filter(inv => inv.einvoice_irn).length

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">E-Invoice Management</h2>
          <p className="text-gray-600">Generate and manage government E-Invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleBulkGenerate}
            disabled={selectedInvoices.length === 0 || bulkGenerating}
          >
            <Zap className="w-4 h-4 mr-2" />
            Bulk Generate ({selectedInvoices.length})
          </Button>
          <Button variant="outline" onClick={loadInvoices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">E-Invoices Generated</p>
              <p className="text-2xl font-bold text-green-600">{generatedCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Eligible for E-Invoice</p>
              <p className="text-2xl font-bold text-yellow-600">{eligibleInvoices.length}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {invoices.length > 0 ? Math.round((generatedCount / invoices.length) * 100) : 0}%
              </p>
            </div>
            <Zap className="w-8 h-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* E-Invoice Requirements Info */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">E-Invoice Requirements</h3>
            <p className="text-sm text-blue-800 mt-1">
              E-Invoice is mandatory for B2B transactions above ₹50,000 with GST-registered customers.
              Ensure customer GSTIN is valid before generating E-Invoice.
            </p>
          </div>
        </div>
      </Card>

      {/* Invoices Table */}
      <DataTable
        data={invoices}
        columns={columns}
        loading={loading}
        emptyMessage="No invoices found"
        selectable
        selectedRows={selectedInvoices}
        onSelectionChange={setSelectedInvoices}
        rowSelectable={(invoice) => canGenerateEInvoice(invoice)}
      />

      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="E-Invoice Generated Successfully"
      >
        {selectedEInvoice && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">E-Invoice Generated</h3>
              <p className="text-gray-600">Your E-Invoice has been successfully generated and registered with the government.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">IRN:</span>
                <span className="font-mono text-sm">{selectedEInvoice.irn}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Acknowledgment No:</span>
                <span className="font-mono text-sm">{selectedEInvoice.ack_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Date:</span>
                <span>{selectedEInvoice.ack_date}</span>
              </div>
            </div>

            {selectedEInvoice.qr_code_data && (
              <div className="text-center">
                <div className="inline-block p-4 bg-white border rounded-lg">
                  <QrCode className="w-32 h-32 mx-auto" />
                  <p className="text-xs text-gray-500 mt-2">QR Code for verification</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowQRModal(false)}>
                Close
              </Button>
              <Button onClick={() => {
                // Download E-Invoice
                console.log('Download E-Invoice')
              }}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}