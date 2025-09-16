import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  PlayCircle,
  Mail
} from 'lucide-react'
// import ProformaInvoiceForm from './ProformaInvoiceForm' // Removed - using simplified forms
import ProformaInvoiceView from './ProformaInvoiceView'
import UpdatePaymentModal from './UpdatePaymentModal'

interface ProformaInvoice {
  id: number
  proforma_number: string
  proforma_date: string
  due_date: string
  customer_name: string
  customer_code: string
  customer_project_area: string
  po_number: string
  status: string
  gst_type: string
  subtotal: string | number
  total_tax: string | number
  total_amount: string | number
  item_count: number
  proforma_items: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
  }>
  created_at: string
  created_by_name: string
}

interface ProformaInvoiceListProps {
  sessionKey: string
}

const ProformaInvoiceList: React.FC<ProformaInvoiceListProps> = ({ sessionKey }) => {
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [selectedProformaInvoice, setSelectedProformaInvoice] = useState<ProformaInvoice | null>(null)

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent to Customer' },
    { value: 'approved', label: 'Approved by Customer' },
    { value: 'converted', label: 'Converted to Invoice' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4 text-gray-500" />
      case 'sent': return <FileText className="w-4 h-4 text-blue-500" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'converted': return <CheckCircle className="w-4 h-4 text-purple-500" />
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'converted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const fetchProformaInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        session_key: sessionKey
      })

      if (statusFilter) params.append('status', statusFilter)

      console.log('Fetching proforma invoices with params:', params.toString()) // Debug log
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/proforma-invoices/?${params}`)
      console.log('Proforma Invoice API Response:', response.data) // Debug log

      const invoices = response.data.results || []
      setProformaInvoices(invoices)
      setTotalPages(Math.ceil(response.data.count / 5))

      if (invoices.length === 0 && currentPage === 1) {
        console.log('No proforma invoices found') // Debug log
      }
    } catch (error) {
      console.error('Error fetching proforma invoices:', error)
      if (error.response?.status === 401) {
        toast.error('Session expired. Please refresh the page.')
      } else {
        toast.error('Failed to fetch proforma invoices. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProformaInvoices()
  }, [currentPage, statusFilter, sessionKey])

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedForPayment, setSelectedForPayment] = useState<ProformaInvoice | null>(null)
  
  const handleUpdatePayment = (proformaInvoice: ProformaInvoice) => {
    setSelectedForPayment(proformaInvoice)
    setShowPaymentModal(true)
  }

  const handleView = (proformaInvoice: ProformaInvoice) => {
    setSelectedProformaInvoice(proformaInvoice)
    setShowForm(true)
  }
  
  const handleEdit = (proformaInvoice: ProformaInvoice) => {
    setSelectedProformaInvoice(proformaInvoice)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this proforma invoice?')) return

    try {
      await axios.delete(`http://127.0.0.1:8000/api/finance/proforma-invoices/${id}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      toast.success('Proforma invoice deleted successfully!')
      fetchProformaInvoices()
    } catch (error) {
      console.error('Error deleting proforma invoice:', error)
      toast.error('Failed to delete proforma invoice')
    }
  }

  const handleDownloadPDF = async (id: number, proformaNumber: string) => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/proforma-invoices/${id}/pdf/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` },
        responseType: 'blob'
      })

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Proforma_${proformaNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const handleSendEmail = async (id: number, proformaNumber: string) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/finance/proforma-invoices/${id}/send-email/`, {}, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      toast.success(`Proforma ${proformaNumber} sent via email successfully!`)
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Failed to send email')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedProformaInvoice(null)
    fetchProformaInvoices()
  }

  const filteredProformaInvoices = proformaInvoices.filter(proforma =>
    proforma.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proforma.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proforma.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Invoices</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your proforma invoices</p>
        </div>
        <button
          onClick={() => toast.info('Create proforma invoices via Purchase Orders → Raise Invoice')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Proforma Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search proforma invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Proforma Invoice List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredProformaInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No proforma invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400">Create your first proforma invoice to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Proforma Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProformaInvoices.map((proforma) => (
                  <tr key={proforma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <div 
                            onClick={() => handleView(proforma)}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            {proforma.proforma_number}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {proforma.item_count} item{proforma.item_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {proforma.customer_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {proforma.customer_code} • {proforma.customer_project_area}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {proforma.po_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{parseFloat(proforma.total_amount?.toString() || '0').toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proforma.status)}`}>
                        {getStatusIcon(proforma.status)}
                        <span className="ml-1 capitalize">{proforma.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(proforma.proforma_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleUpdatePayment(proforma)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Update Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleView(proforma)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(proforma)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSendEmail(proforma.id, proforma.proforma_number)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Send Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(proforma.id, proforma.proforma_number)}
                          className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(proforma.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Proforma Invoice View Modal */}
      {showForm && selectedProformaInvoice && (
        <ProformaInvoiceView
          proformaInvoice={selectedProformaInvoice}
          onClose={() => {
            setShowForm(false)
            setSelectedProformaInvoice(null)
          }}
        />
      )}

      {/* Update Payment Modal */}
      {showPaymentModal && selectedForPayment && (
        <UpdatePaymentModal
          invoice={{
            id: selectedForPayment.id,
            invoice_number: selectedForPayment.proforma_number,
            total_amount: selectedForPayment.subtotal?.toString() || '0',
            outstanding_amount: selectedForPayment.subtotal?.toString() || '0'
          }}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedForPayment(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedForPayment(null)
            fetchProformaInvoices()
          }}
          sessionKey={sessionKey}
        />
      )}
    </div>
  )
}

export default ProformaInvoiceList
