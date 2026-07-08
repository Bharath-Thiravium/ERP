import React, { useEffect, useMemo, useState } from 'react'
import { Download, FileSignature, Plus, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

interface Quote {
  id: number
  quote_number: string
  title: string
  account_name?: string
  contact_name?: string
  status: string
  valid_until: string
  total_amount: string | number
  created_at: string
}

interface Account {
  id: number
  name: string
}

interface Contact {
  id: number
  first_name: string
  last_name: string
}

const defaultForm = {
  account_id: '',
  contact_id: '',
  title: '',
  valid_until: '',
  description: '',
  item_name: '',
  item_description: '',
  product_code: '',
  quantity: '1',
  unit_price: '',
  tax_rate: '18',
  discount_percentage: '0',
  notes: '',
  terms_conditions: ''
}

export const QuotesPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(defaultForm)

  const totalValue = useMemo(() => {
    return quotes.reduce((sum, quote) => sum + Number(quote.total_amount || 0), 0)
  }, [quotes])

  const formTotals = useMemo(() => {
    const quantity = Number(form.quantity || 0)
    const unitPrice = Number(form.unit_price || 0)
    const subtotal = quantity * unitPrice
    const discountPercentage = Number(form.discount_percentage || 0)
    const discountAmount = subtotal * (discountPercentage / 100)
    const taxableAmount = Math.max(0, subtotal - discountAmount)
    const gstAmount = taxableAmount * (Number(form.tax_rate || 0) / 100)
    return {
      subtotal,
      discountAmount,
      gstAmount,
      total: taxableAmount + gstAmount
    }
  }, [form.quantity, form.unit_price, form.discount_percentage, form.tax_rate])

  const fetchData = async () => {
    if (!sessionKey) return
    try {
      setLoading(true)
      const [quotesResponse, accountsResponse, contactsResponse] = await Promise.all([
        crmApi.getQuotes(sessionKey),
        crmApi.getAccounts(sessionKey),
        crmApi.getContacts(sessionKey)
      ])
      setQuotes(quotesResponse.data.results || quotesResponse.data || [])
      setAccounts(accountsResponse.data.results || accountsResponse.data || [])
      setContacts(contactsResponse.data.results || contactsResponse.data || [])
    } catch (error) {
      console.error('Error fetching quotes:', error)
      toast.error('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [sessionKey])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sessionKey) return

    try {
      setSaving(true)
      await crmApi.createQuote(sessionKey, {
        account_id: Number(form.account_id),
        contact_id: form.contact_id ? Number(form.contact_id) : null,
        title: form.title,
        valid_until: form.valid_until,
        description: form.description,
        tax_rate: Number(form.tax_rate || 0),
        discount_percentage: Number(form.discount_percentage || 0),
        notes: form.notes,
        terms_conditions: form.terms_conditions,
        items: [
          {
            name: form.item_name,
            description: form.item_description,
            product_code: form.product_code,
            quantity: Number(form.quantity || 1),
            unit_price: Number(form.unit_price || 0)
          }
        ]
      })
      toast.success('Quote created successfully')
      setForm(defaultForm)
      setShowForm(false)
      fetchData()
    } catch (error: any) {
      console.error('Error creating quote:', error)
      toast.error(error?.response?.data?.error || 'Failed to create quote')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async (quote: Quote) => {
    if (!sessionKey) return
    try {
      await crmApi.sendQuote(sessionKey, quote.id)
      toast.success('Quote marked as sent')
      fetchData()
    } catch (error) {
      console.error('Error sending quote:', error)
      toast.error('Failed to send quote')
    }
  }

  const handleDownload = async (quote: Quote) => {
    if (!sessionKey) return
    try {
      const response = await crmApi.downloadQuotePdf(sessionKey, quote.id)
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${quote.quote_number || 'quote'}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading quote:', error)
      toast.error('Failed to download PDF')
    }
  }

  const statusClass = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      sent: 'bg-blue-100 text-blue-700',
      accepted: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-yellow-100 text-yellow-700',
      converted: 'bg-purple-100 text-purple-700'
    }
    return colors[status] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-6 backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-2xl font-bold text-transparent">
              Quote Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create CRM quotes, send them to customers, and download PDF copies.
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-orange-500 to-red-600">
            <Plus className="mr-2 h-4 w-4" />
            Add Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-5 dark:border-gray-700/50 dark:bg-gray-900/80">
          <p className="text-sm text-gray-500">Total Quotes</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{quotes.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-5 dark:border-gray-700/50 dark:bg-gray-900/80">
          <p className="text-sm text-gray-500">Sent Quotes</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            {quotes.filter((quote) => quote.status === 'sent').length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200/50 bg-white/80 p-5 dark:border-gray-700/50 dark:bg-gray-900/80">
          <p className="text-sm text-gray-500">Pipeline Value</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">₹{totalValue.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200/50 bg-white/80 dark:border-gray-700/50 dark:bg-gray-900/80">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Quote</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Valid Until</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {quotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{quote.title}</div>
                    <div className="text-sm text-gray-500">{quote.quote_number}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {quote.account_name || '-'}
                    {quote.contact_name && <div className="text-xs text-gray-500">{quote.contact_name}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(quote.status)}`}>
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(quote.valid_until).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    ₹{Number(quote.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleSend(quote)} title="Send quote">
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDownload(quote)} title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotes.length === 0 && (
          <div className="py-12 text-center">
            <FileSignature className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">No quotes created yet.</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Quote</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Account</span>
                <select
                  required
                  value={form.account_id}
                  onChange={(event) => setForm({ ...form, account_id: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact</span>
                <select
                  value={form.contact_id}
                  onChange={(event) => setForm({ ...form, contact_id: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Optional</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</span>
                <input
                  required
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid Until</span>
                <input
                  required
                  type="date"
                  value={form.valid_until}
                  onChange={(event) => setForm({ ...form, valid_until: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Item</span>
                <input
                  required
                  value={form.item_name}
                  onChange={(event) => setForm({ ...form, item_name: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Product / HSN Code</span>
                <input
                  value={form.product_code}
                  onChange={(event) => setForm({ ...form, product_code: event.target.value })}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Item Description</span>
                <textarea
                  value={form.item_description}
                  onChange={(event) => setForm({ ...form, item_description: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  rows={2}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(event) => setForm({ ...form, unit_price: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GST Rate (%)</span>
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.tax_rate}
                  onChange={(event) => setForm({ ...form, tax_rate: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Discount (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.discount_percentage}
                  onChange={(event) => setForm({ ...form, discount_percentage: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Terms & Conditions</span>
                <textarea
                  value={form.terms_conditions}
                  onChange={(event) => setForm({ ...form, terms_conditions: event.target.value })}
                  placeholder="Payment terms, validity, delivery notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  rows={3}
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  rows={2}
                />
              </label>
            </div>

            <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm dark:border-orange-900/50 dark:bg-orange-950/20">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Subtotal</p>
                  <p className="font-semibold text-gray-900 dark:text-white">₹{formTotals.subtotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Discount</p>
                  <p className="font-semibold text-gray-900 dark:text-white">₹{formTotals.discountAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">GST</p>
                  <p className="font-semibold text-gray-900 dark:text-white">₹{formTotals.gstAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Grand Total</p>
                  <p className="font-bold text-orange-600">₹{formTotals.total.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-orange-500 to-red-600">
                {saving ? 'Saving...' : 'Create Quote'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
