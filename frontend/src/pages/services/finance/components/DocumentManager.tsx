/**
 * Document Management Component
 */
import React, { useState, useEffect } from 'react'
import { documentApi, Document, BulkOperation } from '../../../../services/documentApi'
import { financeApi } from '../../../../services/financeApi'
import { DataTable } from '../../../../components/ui/DataTable'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { Select } from '../../../../components/ui/Select'
import { Checkbox } from '../../../../components/ui/Checkbox'
import { Badge } from '../../../../components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs'
import { TemplateManager } from './TemplateManager'
import { 
  FileText, 
  Download, 
  FileCheck, 
  Zap, 
  Upload,
  Eye,
  Trash2,
  RefreshCw,
  Settings
} from 'lucide-react'

interface DocumentManagerProps {
  className?: string
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({ className = '' }) => {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    status: ''
  })
  const [sessionKey, setSessionKey] = useState('')

  useEffect(() => {
    const key = localStorage.getItem('finance_session_key') || ''
    setSessionKey(key)
  }, [])

  // Generate document modal state
  const [generateForm, setGenerateForm] = useState({
    document_type: 'invoice',
    object_id: '',
    template_id: ''
  })

  // Bulk operation state
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null)
  const [availableObjects, setAvailableObjects] = useState<any[]>([])

  useEffect(() => {
    loadDocuments()
  }, [filters])

  const loadDocuments = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      // Mock data for demonstration since backend might not be fully implemented
      const mockDocuments: Document[] = [
        {
          id: '1',
          title: 'INV-2024-000001.pdf',
          document_type: 'invoice',
          status: 'generated',
          file_size: 245760,
          mime_type: 'application/pdf',
          created_at: new Date().toISOString(),
          is_digitally_signed: false
        },
        {
          id: '2',
          title: 'QUO-2024-000001.pdf',
          document_type: 'quotation',
          status: 'sent',
          file_size: 189440,
          mime_type: 'application/pdf',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          is_digitally_signed: true
        },
        {
          id: '3',
          title: 'E-INV-2024-000001.pdf',
          document_type: 'einvoice',
          status: 'signed',
          file_size: 298752,
          mime_type: 'application/pdf',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          is_digitally_signed: true,
          einvoice_irn: '01AMBPG7773M002-INV001-2024'
        }
      ]
      
      // Apply filters
      let filteredDocs = mockDocuments
      if (filters.type) {
        filteredDocs = filteredDocs.filter(doc => doc.document_type === filters.type)
      }
      if (filters.status) {
        filteredDocs = filteredDocs.filter(doc => doc.status === filters.status)
      }
      
      setDocuments(filteredDocs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableObjects = async (type: string) => {
    try {
      // Mock data for demonstration
      if (type === 'invoice') {
        setAvailableObjects([
          { id: '1', invoice_number: 'INV-2024-000001', customer: { name: 'ABC Corp' } },
          { id: '2', invoice_number: 'INV-2024-000002', customer: { name: 'XYZ Ltd' } }
        ])
      } else if (type === 'quotation') {
        setAvailableObjects([
          { id: '1', quotation_number: 'QUO-2024-000001', customer: { name: 'ABC Corp' } },
          { id: '2', quotation_number: 'QUO-2024-000002', customer: { name: 'XYZ Ltd' } }
        ])
      } else if (type === 'payment_receipt') {
        setAvailableObjects([
          { id: '1', payment_number: 'PAY-2024-000001', customer: { name: 'ABC Corp' } },
          { id: '2', payment_number: 'PAY-2024-000002', customer: { name: 'XYZ Ltd' } }
        ])
      }
    } catch (error) {
      console.error('Failed to load objects:', error)
    }
  }

  const handleGenerateDocument = async () => {
    try {
      setLoading(true)
      await documentApi.generateDocument(generateForm)
      setShowGenerateModal(false)
      setGenerateForm({ document_type: 'invoice', object_id: '', template_id: '' })
      loadDocuments()
    } catch (error) {
      console.error('Failed to generate document:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateEInvoice = async (invoiceId: string) => {
    try {
      setLoading(true)
      const result = await documentApi.generateEInvoice(invoiceId)
      console.log('E-Invoice generated:', result)
      loadDocuments()
    } catch (error) {
      console.error('Failed to generate E-Invoice:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkGenerate = async () => {
    try {
      setLoading(true)
      const result = await documentApi.bulkGenerateDocuments({
        operation_type: 'generate_invoices',
        object_ids: selectedDocuments
      })
      setBulkOperation(result)
      setShowBulkModal(false)
      loadDocuments()
    } catch (error) {
      console.error('Failed to bulk generate:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (documentId: string, title: string) => {
    try {
      const blob = await documentApi.downloadDocument(documentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'gray', label: 'Draft' },
      generated: { color: 'blue', label: 'Generated' },
      signed: { color: 'green', label: 'Signed' },
      sent: { color: 'purple', label: 'Sent' },
      archived: { color: 'yellow', label: 'Archived' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Badge color={config.color}>{config.label}</Badge>
  }

  const getDocumentTypeIcon = (type: string) => {
    const icons = {
      invoice: <FileText className="w-4 h-4" />,
      quotation: <FileCheck className="w-4 h-4" />,
      einvoice: <Zap className="w-4 h-4" />
    }
    return icons[type as keyof typeof icons] || <FileText className="w-4 h-4" />
  }

  const columns = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={selectedDocuments.length === documents.length && documents.length > 0}
          onChange={(checked) => {
            if (checked) {
              setSelectedDocuments(documents.map(d => d.id))
            } else {
              setSelectedDocuments([])
            }
          }}
        />
      ),
      render: (document: Document) => (
        <Checkbox
          checked={selectedDocuments.includes(document.id)}
          onChange={(checked) => {
            if (checked) {
              setSelectedDocuments([...selectedDocuments, document.id])
            } else {
              setSelectedDocuments(selectedDocuments.filter(id => id !== document.id))
            }
          }}
        />
      )
    },
    {
      key: 'type',
      header: 'Type',
      render: (document: Document) => (
        <div className="flex items-center gap-2">
          {getDocumentTypeIcon(document.document_type)}
          <span className="capitalize">{document.document_type}</span>
        </div>
      )
    },
    {
      key: 'title',
      header: 'Title',
      render: (document: Document) => (
        <div>
          <div className="font-medium">{document.title}</div>
          {document.einvoice_irn && (
            <div className="text-xs text-gray-500">IRN: {document.einvoice_irn}</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (document: Document) => getStatusBadge(document.status)
    },
    {
      key: 'size',
      header: 'Size',
      render: (document: Document) => (
        <span className="text-sm text-gray-600">
          {(document.file_size / 1024).toFixed(1)} KB
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (document: Document) => (
        <span className="text-sm text-gray-600">
          {new Date(document.created_at).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (document: Document) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDownload(document.id, document.title)}
          >
            <Download className="w-4 h-4" />
          </Button>
          {document.document_type === 'invoice' && !document.einvoice_irn && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleGenerateEInvoice(document.id)}
            >
              <Zap className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  return (
    <div className={`space-y-6 ${className}`}>
      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="documents" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-600">Manage invoices, quotations, and E-Invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            disabled={selectedDocuments.length === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Generate ({selectedDocuments.length})
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Generate Document
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <Select
          value={filters.type}
          onChange={(value) => setFilters({ ...filters, type: value })}
          placeholder="All Types"
        >
          <option value="">All Types</option>
          <option value="invoice">Invoice</option>
          <option value="quotation">Quotation</option>
          <option value="einvoice">E-Invoice</option>
          <option value="payment_receipt">Payment Receipt</option>
        </Select>
        
        <Select
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
          placeholder="All Status"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="signed">Signed</option>
          <option value="sent">Sent</option>
          <option value="archived">Archived</option>
        </Select>

        <Button variant="outline" onClick={loadDocuments}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Documents Table */}
      <DataTable
        data={documents}
        columns={columns}
        loading={loading}
        emptyMessage="No documents found"
      />

      {/* Generate Document Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Document"
      >
        <div className="space-y-4">
          <Select
            label="Document Type"
            value={generateForm.document_type}
            onChange={(value) => {
              setGenerateForm({ ...generateForm, document_type: value })
              loadAvailableObjects(value)
            }}
          >
            <option value="invoice">Invoice</option>
            <option value="quotation">Quotation</option>
            <option value="payment_receipt">Payment Receipt</option>
          </Select>

          <Select
            label="Select Object"
            value={generateForm.object_id}
            onChange={(value) => setGenerateForm({ ...generateForm, object_id: value })}
          >
            <option value="">Select {generateForm.document_type}</option>
            {availableObjects.map((obj) => (
              <option key={obj.id} value={obj.id}>
                {obj.invoice_number || obj.quotation_number || obj.payment_number} - {obj.customer?.name}
              </option>
            ))}
          </Select>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleGenerateDocument}
              disabled={!generateForm.object_id || loading}
            >
              Generate Document
            </Button>
          </div>
        </div>
      </Modal>

        {/* Bulk Operation Results */}
        {bulkOperation && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900">Bulk Operation Results</h3>
            <div className="mt-2 text-sm text-blue-800">
              <p>Total: {bulkOperation.total_items}</p>
              <p>Success: {bulkOperation.success_count}</p>
              <p>Errors: {bulkOperation.error_count}</p>
              {bulkOperation.errors.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Errors:</p>
                  <ul className="list-disc list-inside">
                    {bulkOperation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        </TabsContent>
        
        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}