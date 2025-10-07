import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { 
  FileText, 
  Download, 
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  RefreshCw,
  FileCheck,
  Receipt,
  Award
} from 'lucide-react'

interface Document {
  id: string
  title: string
  type: string
  status: string
  size: string
  created: string
  customer?: string
  amount?: number
  reference?: string
}

interface Template {
  id: string
  name: string
  type: string
  isDefault: boolean
  created: string
}

interface SourceDocument {
  id: string
  number: string
  customer_name: string
  total_amount: number
  date: string
  type: string
}

const DocumentsPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState<'documents' | 'templates'>('documents')
  const [documents, setDocuments] = useState<Document[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedDocumentType, setSelectedDocumentType] = useState('')
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    search: ''
  })

  // Fetch real data from API
  useEffect(() => {
    fetchDocuments()
    fetchSourceDocuments()
    fetchTemplates()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      if (!sessionKey) {
        console.error('No session key found')
        return
      }

      // Fetch real documents from new API
      const response = await fetch(`/api/finance/documents/?session_key=${sessionKey}`)
      if (response.ok) {
        const data = await response.json()
        const formattedDocs = data.documents?.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          type: doc.document_type,
          status: doc.status,
          size: doc.file_size ? formatFileSize(doc.file_size) : 'N/A',
          created: new Date(doc.created_at).toLocaleDateString(),
          customer: doc.customer_name || '',
          amount: doc.amount,
          reference: doc.reference
        })) || []
        setDocuments(formattedDocs)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSourceDocuments = async () => {
    try {
      if (!sessionKey) return

      // Fetch from multiple endpoints to get real data
      const [quotationsRes, invoicesRes, proformasRes, paymentsRes] = await Promise.all([
        fetch(`/api/finance/quotations/`, {
          headers: { 'Authorization': `Bearer ${sessionKey}` }
        }),
        fetch(`/api/finance/invoices/`, {
          headers: { 'Authorization': `Bearer ${sessionKey}` }
        }),
        fetch(`/api/finance/proforma-invoices/`, {
          headers: { 'Authorization': `Bearer ${sessionKey}` }
        }),
        fetch(`/api/finance/payments/`, {
          headers: { 'Authorization': `Bearer ${sessionKey}` }
        })
      ])

      console.log('API Response Status:', {
        quotations: quotationsRes.status,
        invoices: invoicesRes.status,
        proformas: proformasRes.status,
        payments: paymentsRes.status
      })

      const sources: SourceDocument[] = []

      // Process quotations
      if (quotationsRes.ok) {
        const quotationsData = await quotationsRes.json()
        console.log('Quotations data:', quotationsData)
        const quotations = quotationsData.results || quotationsData
        if (Array.isArray(quotations)) {
          quotations.forEach((q: any) => {
            sources.push({
              id: q.id,
              number: q.quotation_number,
              customer_name: q.customer_name || 'Unknown Customer',
              total_amount: parseFloat(q.total_amount) || 0,
              date: q.quotation_date,
              type: 'quotation'
            })
          })
        }
      }

      // Process invoices
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        console.log('Invoices data:', invoicesData)
        const invoices = invoicesData.results || invoicesData
        if (Array.isArray(invoices)) {
          invoices.forEach((inv: any) => {
            sources.push({
              id: inv.id,
              number: inv.invoice_number,
              customer_name: inv.customer_name || 'Unknown Customer',
              total_amount: parseFloat(inv.total_amount) || 0,
              date: inv.invoice_date,
              type: 'invoice'
            })
          })
        }
      }

      // Process proforma invoices
      if (proformasRes.ok) {
        const proformasData = await proformasRes.json()
        console.log('Proformas data:', proformasData)
        const proformas = proformasData.results || proformasData
        if (Array.isArray(proformas)) {
          proformas.forEach((pf: any) => {
            sources.push({
              id: pf.id,
              number: pf.proforma_number,
              customer_name: pf.customer_name || 'Unknown Customer',
              total_amount: parseFloat(pf.total_amount) || 0,
              date: pf.proforma_date,
              type: 'proforma'
            })
          })
        }
      }

      // Process payments
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        console.log('Payments data:', paymentsData)
        const payments = paymentsData.results || paymentsData
        if (Array.isArray(payments)) {
          payments.forEach((pay: any) => {
            sources.push({
              id: pay.id,
              number: pay.payment_number,
              customer_name: pay.customer_name || 'Unknown Customer',
              total_amount: parseFloat(pay.amount) || 0,
              date: pay.payment_date,
              type: 'payment_receipt'
            })
          })
        }
      }

      console.log('Source documents fetched:', sources)
      console.log('Total sources found:', sources.length)
      console.log('By type:', {
        quotations: sources.filter(s => s.type === 'quotation').length,
        invoices: sources.filter(s => s.type === 'invoice').length,
        proformas: sources.filter(s => s.type === 'proforma').length,
        payments: sources.filter(s => s.type === 'payment_receipt').length
      })
      setSourceDocuments(sources)
      
      // Also log individual responses for debugging
      if (!quotationsRes.ok) console.error('Quotations API error:', await quotationsRes.text())
      if (!invoicesRes.ok) console.error('Invoices API error:', await invoicesRes.text())
      if (!proformasRes.ok) console.error('Proformas API error:', await proformasRes.text())
      if (!paymentsRes.ok) console.error('Payments API error:', await paymentsRes.text())
      
    } catch (error) {
      console.error('Error fetching source documents:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      if (!sessionKey) return

      const response = await fetch(`/api/finance/documents/templates/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Templates data:', data)
        const formattedTemplates = data.templates?.map((template: any) => ({
          id: template.id,
          name: template.name,
          type: template.template_type,
          isDefault: template.is_default,
          created: new Date(template.created_at).toLocaleDateString()
        })) || []
        setTemplates(formattedTemplates)
      } else {
        console.error('Templates API error:', response.status)
        // Fallback to default templates
        setTemplates([
          {
            id: '1',
            name: 'Standard Invoice Template',
            type: 'invoice',
            isDefault: true,
            created: '2024-01-01'
          },
          {
            id: '2',
            name: 'Professional Quotation Template',
            type: 'quotation',
            isDefault: true,
            created: '2024-01-01'
          },
          {
            id: '3',
            name: 'Proforma Invoice Template',
            type: 'proforma',
            isDefault: true,
            created: '2024-01-01'
          },
          {
            id: '4',
            name: 'Payment Receipt Template',
            type: 'payment_receipt',
            isDefault: true,
            created: '2024-01-01'
          },
          {
            id: '5',
            name: 'TDS Certificate Template',
            type: 'tds_certificate',
            isDefault: false,
            created: '2024-01-01'
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      // Set fallback templates on error
      setTemplates([
        {
          id: '1',
          name: 'Standard Invoice Template',
          type: 'invoice',
          isDefault: true,
          created: '2024-01-01'
        }
      ])
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleCreateTemplate = async () => {
    try {
      if (!sessionKey) {
        alert('Session expired. Please refresh the page.')
        return
      }

      const formData = new FormData(document.querySelector('#templateForm') as HTMLFormElement)
      const name = formData.get('name') as string
      const templateType = formData.get('template_type') as string
      const description = formData.get('description') as string

      if (!name || !templateType) {
        alert('Please fill in template name and type')
        return
      }

      setLoading(true)
      const response = await fetch('/api/finance/documents/templates/create/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_key: sessionKey,
          name: name,
          template_type: templateType,
          description: description
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert('Template created successfully!')
        setShowTemplateModal(false)
        fetchTemplates() // Refresh templates list
      } else {
        const error = await response.json()
        alert(`Error creating template: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating template:', error)
      alert('Error creating template. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestData = async () => {
    try {
      if (!sessionKey) {
        alert('Session expired. Please refresh the page.')
        return
      }

      setLoading(true)
      const response = await fetch('/api/finance/documents/create-test-data/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_key: sessionKey
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Test data created successfully! ${result.customers_created} customers created.`)
        fetchSourceDocuments()
      } else {
        const error = await response.json()
        alert(`Error creating test data: ${error.error}`)
      }
    } catch (error) {
      console.error('Error creating test data:', error)
      alert('Error creating test data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocument = async () => {
    try {
      if (!sessionKey) {
        alert('Session expired. Please refresh the page.')
        return
      }

      const formData = new FormData(document.querySelector('#generateForm') as HTMLFormElement)
      const documentType = formData.get('document_type') as string
      const sourceId = formData.get('source_id') as string
      const templateId = formData.get('template_id') as string

      if (!documentType || !sourceId) {
        alert('Please select document type and source document')
        return
      }

      setLoading(true)
      const response = await fetch('/api/finance/documents/generate-real/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_key: sessionKey,
          document_type: documentType,
          source_id: sourceId,
          template_id: templateId || null
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Document generated successfully: ${result.title}`)
        setShowGenerateModal(false)
        fetchDocuments() // Refresh the documents list
      } else {
        const error = await response.json()
        alert(`Error generating document: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating document:', error)
      alert('Error generating document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadDocument = async (documentId: string, title: string) => {
    try {
      if (!sessionKey) {
        alert('Session expired. Please refresh the page.')
        return
      }

      const response = await fetch(`/api/finance/documents/${documentId}/download/?session_key=${sessionKey}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = title
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        alert('Error downloading document')
      }
    } catch (error) {
      console.error('Error downloading document:', error)
      alert('Error downloading document. Please try again.')
    }
  }



  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="h-5 w-5 text-blue-500" />
      case 'quotation': return <FileCheck className="h-5 w-5 text-green-500" />
      case 'tds_certificate': return <Award className="h-5 w-5 text-purple-500" />
      case 'payment_receipt': return <Receipt className="h-5 w-5 text-orange-500" />
      default: return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: 'bg-gray-100 text-gray-800',
      generated: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
      signed: 'bg-purple-100 text-purple-800',
      archived: 'bg-yellow-100 text-yellow-800'
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
  }

  const filteredDocuments = documents.filter(doc => {
    if (filters.type && doc.type !== filters.type) return false
    if (filters.status && doc.status !== filters.status) return false
    if (filters.search && !doc.title.toLowerCase().includes(filters.search.toLowerCase()) && 
        !doc.customer?.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-600">Manage your business documents and templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowTemplateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
          <Button onClick={() => setShowGenerateModal(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Document
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'documents'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
        </div>
      </div>

      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-10 w-full p-2 border rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Types</option>
                    <option value="invoice">Invoice</option>
                    <option value="quotation">Quotation</option>
                    <option value="tds_certificate">TDS Certificate</option>
                    <option value="payment_receipt">Payment Receipt</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="generated">Generated</option>
                    <option value="sent">Sent</option>
                    <option value="signed">Signed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      fetchDocuments()
                      fetchSourceDocuments()
                    }}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents List */}
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getDocumentIcon(doc.type)}
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-gray-500">
                          {doc.customer && `${doc.customer} • `}
                          {doc.amount && `₹${doc.amount.toLocaleString()} • `}
                          {doc.size} • {doc.created}
                        </p>
                        {doc.reference && (
                          <p className="text-xs text-gray-400">Ref: {doc.reference}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                      <div className="flex space-x-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => alert('View functionality coming soon')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDownloadDocument(doc.id, doc.title)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => alert('Edit functionality coming soon')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this document?')) {
                              alert('Delete functionality coming soon')
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getDocumentIcon(template.type)}
                      <span className="text-sm font-medium capitalize">{template.type}</span>
                    </div>
                    {template.isDefault && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">Created {template.created}</p>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => alert('Template preview coming soon')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => alert('Template editing coming soon')}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => alert('Template download coming soon')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!template.isDefault && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            alert('Template deletion coming soon')
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generate Document Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Generate Document</h3>
            <form id="generateForm" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <select 
                  name="document_type"
                  className="w-full p-2 border rounded-md"
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  required
                >
                  <option value="">Select document type...</option>
                  <option value="invoice">Invoice</option>
                  <option value="quotation">Quotation</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="payment_receipt">Payment Receipt</option>
                  <option value="tds_certificate">TDS Certificate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Select Source</label>
                <select name="source_id" className="w-full p-2 border rounded-md" required>
                  <option value="">Choose source document...</option>
                  {sourceDocuments
                    .filter(doc => {
                      if (!selectedDocumentType) return false
                      if (selectedDocumentType === 'invoice') return doc.type === 'invoice'
                      if (selectedDocumentType === 'quotation') return doc.type === 'quotation'
                      if (selectedDocumentType === 'proforma') return doc.type === 'proforma'
                      if (selectedDocumentType === 'payment_receipt') return doc.type === 'payment_receipt'
                      return true
                    })
                    .map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.number} - {doc.customer_name} - ₹{doc.total_amount.toLocaleString()}
                      </option>
                    ))
                  }
                </select>
                {selectedDocumentType && sourceDocuments.filter(doc => {
                  if (selectedDocumentType === 'invoice') return doc.type === 'invoice'
                  if (selectedDocumentType === 'quotation') return doc.type === 'quotation'
                  if (selectedDocumentType === 'proforma') return doc.type === 'proforma'
                  if (selectedDocumentType === 'payment_receipt') return doc.type === 'payment_receipt'
                  return true
                }).length === 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-700 mb-2">
                      No {selectedDocumentType} documents found. You need to create some {selectedDocumentType}s first in the respective sections.
                    </p>
                    <div className="text-xs text-yellow-600 mb-2">
                      Go to: {selectedDocumentType === 'invoice' ? 'Invoices' : 
                              selectedDocumentType === 'quotation' ? 'Quotations' : 
                              selectedDocumentType === 'proforma' ? 'Proforma Invoices' : 
                              'Payments'} section to create {selectedDocumentType}s
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          console.log('All source documents:', sourceDocuments)
                          console.log('Filtered for type:', selectedDocumentType, sourceDocuments.filter(doc => {
                            if (selectedDocumentType === 'invoice') return doc.type === 'invoice'
                            if (selectedDocumentType === 'quotation') return doc.type === 'quotation'
                            if (selectedDocumentType === 'proforma') return doc.type === 'proforma'
                            if (selectedDocumentType === 'payment_receipt') return doc.type === 'payment_receipt'
                            return true
                          }))
                        }}
                      >
                        Debug Data
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={fetchSourceDocuments}
                        disabled={loading}
                      >
                        Refresh Data
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Template</label>
                <select name="template_id" className="w-full p-2 border rounded-md">
                  <option value="">Use default template</option>
                  {templates
                    .filter(template => {
                      return !selectedDocumentType || template.type === selectedDocumentType
                    })
                    .map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} {template.isDefault ? '(Default)' : ''}
                      </option>
                    ))
                  }
                </select>
              </div>
            </form>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerateDocument} disabled={loading}>
                {loading ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create Template</h3>
            <form id="templateForm" className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  name="name"
                  type="text"
                  placeholder="Enter template name"
                  className="w-full p-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Template Type</label>
                <select name="template_type" className="w-full p-2 border rounded-md" required>
                  <option value="">Select template type...</option>
                  <option value="invoice">Invoice</option>
                  <option value="quotation">Quotation</option>
                  <option value="proforma">Proforma Invoice</option>
                  <option value="payment_receipt">Payment Receipt</option>
                  <option value="tds_certificate">TDS Certificate</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  name="description"
                  placeholder="Template description..."
                  className="w-full p-2 border rounded-md h-20"
                />
              </div>
            </form>
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={loading}>
                {loading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentsPage