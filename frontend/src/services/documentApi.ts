/**
 * Document Management API Service
 */
import { apiClient as api } from '../lib/api'

export interface Document {
  id: string
  title: string
  document_type: string
  status: string
  file_size: number
  mime_type: string
  created_at: string
  file_url?: string
  is_digitally_signed: boolean
  einvoice_irn?: string
}

export interface BulkOperation {
  operation_id: string
  status: string
  total_items: number
  success_count: number
  error_count: number
  errors: string[]
}

export interface EInvoiceResult {
  document_id: string
  irn: string
  ack_no: string
  ack_date: string
  qr_code_data?: string
}

class DocumentApiService {
  /**
   * Generate document from template
   */
  async generateDocument(data: {
    document_type: string
    object_id: string
    template_id?: string
  }): Promise<{ document_id: string; title: string; file_url?: string; status: string }> {
    const response = await api.post('/api/finance/documents/generate/', data)
    return response.data
  }

  /**
   * Generate E-Invoice
   */
  async generateEInvoice(invoiceId: string): Promise<EInvoiceResult> {
    const response = await api.post('/api/finance/documents/einvoice/generate/', {
      invoice_id: invoiceId
    })
    return response.data
  }

  /**
   * List documents
   */
  async listDocuments(filters?: {
    type?: string
    status?: string
  }): Promise<{ documents: Document[] }> {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.status) params.append('status', filters.status)
    
    const response = await api.get(`/api/finance/documents/list/?${params.toString()}`)
    return response.data
  }

  /**
   * Bulk generate documents
   */
  async bulkGenerateDocuments(data: {
    operation_type: string
    object_ids: string[]
  }): Promise<BulkOperation> {
    const response = await api.post('/api/finance/documents/bulk-generate/', data)
    return response.data
  }

  /**
   * Download document
   */
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await api.get(`/api/finance/documents/${documentId}/download/`, {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * Get download URL for document
   */
  getDownloadUrl(documentId: string): string {
    const sessionKey = localStorage.getItem('finance_session_key')
    return `${api.defaults.baseURL}/api/finance/documents/${documentId}/download/?session_key=${sessionKey}`
  }
}

export const documentApi = new DocumentApiService()