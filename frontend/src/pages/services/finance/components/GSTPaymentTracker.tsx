import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../../../lib/api'
import { RefreshCw, CheckCircle, Clock, XCircle, Filter } from 'lucide-react'
import toast from 'react-hot-toast'

interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string
  customer_name: string
  total_tax: string
  cgst_amount: string
  sgst_amount: string
  igst_amount: string
  gst_type: string
  gst_payment_status: 'pending' | 'paid' | 'not_applicable'
  gst_paid_date: string | null
  gst_payment_reference: string
  payment_status: string
  total_amount: string
  is_rejected: boolean
}

interface MarkModalState {
  invoiceId: number
  status: 'pending' | 'paid' | 'not_applicable'
  paidDate: string
  reference: string
}

const fmt = (n: number | string | null | undefined) => {
  const val = Number(n)
  if (isNaN(val)) return '₹0'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
}

const GST_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-800', icon: Clock },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  not_applicable: { label: 'N/A', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export const GSTPaymentTracker: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [markModal, setMarkModal] = useState<MarkModalState | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const res = await apiClient.getFinanceInvoices({ page_size: 500 })
      const all = (res.data.results || []).filter((inv: Invoice) => !inv.is_rejected && inv.gst_type !== 'exempt')
      setInvoices(all)
    } catch {
      toast.error('Failed to load GST payment data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRefresh = () => { setRefreshing(true); fetchData() }

  const openMarkModal = (invoice: Invoice) => {
    setMarkModal(prev => prev?.invoiceId === invoice.id ? null : {
      invoiceId: invoice.id,
      status: invoice.gst_payment_status === 'pending' ? 'paid' : invoice.gst_payment_status,
      paidDate: invoice.gst_paid_date || new Date().toISOString().split('T')[0],
      reference: invoice.gst_payment_reference || '',
    })
  }

  const handleSave = async () => {
    if (!markModal) return
    setSaving(true)
    const invoice = invoices.find(i => i.id === markModal.invoiceId)!
    try {
      await apiClient.markInvoiceGSTPayment(markModal.invoiceId, {
        gst_payment_status: markModal.status,
        gst_paid_date: markModal.status === 'paid' ? markModal.paidDate : undefined,
        gst_payment_reference: markModal.reference,
      })
      toast.success(`GST marked as ${markModal.status} for ${invoice.invoice_number}`)
      setMarkModal(null)
      fetchData()
    } catch {
      toast.error('Failed to update GST payment status')
    } finally {
      setSaving(false)
    }
  }

  const filtered = filterStatus === 'all' ? invoices : invoices.filter(inv => inv.gst_payment_status === filterStatus)

  const pendingInvoices = invoices.filter(i => i.gst_payment_status === 'pending')
  const paidInvoices = invoices.filter(i => i.gst_payment_status === 'paid')
  const sum = (arr: Invoice[], field: keyof Invoice) => arr.reduce((acc, i) => acc + Number(i[field] || 0), 0)
  const totalCGST = sum(invoices, 'cgst_amount')
  const totalSGST = sum(invoices, 'sgst_amount')
  const totalIGST = sum(invoices, 'igst_amount')

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-600 font-medium">GST Pending</p>
          <p className="text-xl font-bold text-amber-700">{fmt(sum(pendingInvoices, 'total_tax'))}</p>
          <p className="text-xs text-amber-500">{pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">GST Paid</p>
          <p className="text-xl font-bold text-green-700">{fmt(sum(paidInvoices, 'total_tax'))}</p>
          <p className="text-xs text-green-500">{paidInvoices.length} invoice{paidInvoices.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total CGST+SGST</p>
          <p className="text-xl font-bold text-blue-700">{fmt(totalCGST + totalSGST)}</p>
          <p className="text-xs text-blue-500">Intra-state</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Total IGST</p>
          <p className="text-xl font-bold text-purple-700">{fmt(totalIGST)}</p>
          <p className="text-xs text-purple-500">Inter-state</p>
        </div>
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {(['all', 'pending', 'paid', 'not_applicable'] as const).map(s => {
            const count = s === 'all' ? invoices.length : invoices.filter(i => i.gst_payment_status === s).length
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'all' ? 'All' : s === 'not_applicable' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            )
          })}
        <button onClick={handleRefresh} className="ml-auto p-1.5 rounded hover:bg-gray-100">
          <RefreshCw className={`h-4 w-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Invoice Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Invoice</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Customer</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Date</th>
              <th className="text-right px-4 py-2 font-medium text-gray-600">GST Amount</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">GST Status</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Paid Date</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Reference</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-400">No invoices found</td></tr>
            ) : filtered.map(inv => {
              const cfg = GST_STATUS_CONFIG[inv.gst_payment_status] || GST_STATUS_CONFIG.pending
              const Icon = cfg.icon
              const isExpanded = markModal?.invoiceId === inv.id
              return (
                <React.Fragment key={inv.id}>
                  <tr className={`hover:bg-gray-50 ${isExpanded ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-2 font-medium text-blue-600">{inv.invoice_number}</td>
                    <td className="px-4 py-2 text-gray-700">{inv.customer_name}</td>
                    <td className="px-4 py-2 text-gray-500">{inv.invoice_date}</td>
                    <td className="px-4 py-2 text-right font-medium">
                      <div>{fmt(inv.total_tax)}</div>
                      {inv.gst_type === 'cgst_sgst' ? (
                        <div className="text-xs text-gray-400">C:{fmt(inv.cgst_amount)} S:{fmt(inv.sgst_amount)}</div>
                      ) : (
                        <div className="text-xs text-gray-400">IGST:{fmt(inv.igst_amount)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${inv.gst_type === 'cgst_sgst' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {inv.gst_type === 'cgst_sgst' ? 'CGST+SGST' : 'IGST'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon className="h-3 w-3" />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{inv.gst_paid_date || '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{inv.gst_payment_reference || '—'}</td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => openMarkModal(inv)}
                        className={`px-2 py-1 text-xs rounded font-medium transition-colors ${
                          isExpanded ? 'bg-gray-200 text-gray-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {isExpanded ? 'Close' : 'Update'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && markModal && (
                    <tr className="bg-blue-50 border-t border-blue-100">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">GST Payment Status</label>
                            <div className="flex gap-2">
                              {(['pending', 'paid', 'not_applicable'] as const).map(s => (
                                <button
                                  key={s}
                                  onClick={() => setMarkModal(m => m ? { ...m, status: s } : m)}
                                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                                    markModal.status === s
                                      ? s === 'paid' ? 'bg-green-600 text-white border-green-600'
                                        : s === 'pending' ? 'bg-amber-500 text-white border-amber-500'
                                        : 'bg-gray-500 text-white border-gray-500'
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {s === 'not_applicable' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                          {markModal.status === 'paid' && (
                            <>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Payment Date</label>
                                <input
                                  type="date"
                                  value={markModal.paidDate}
                                  onChange={e => setMarkModal(m => m ? { ...m, paidDate: e.target.value } : m)}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-600">Challan / Reference No.</label>
                                <input
                                  type="text"
                                  placeholder="e.g. CIN123456789"
                                  value={markModal.reference}
                                  onChange={e => setMarkModal(m => m ? { ...m, reference: e.target.value } : m)}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs w-48"
                                />
                              </div>
                            </>
                          )}
                          <div className="flex gap-2 ml-auto">
                            <button
                              onClick={() => setMarkModal(null)}
                              className="py-1.5 px-4 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="py-1.5 px-4 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

    </div>
  )
}
