import React, { useState, useEffect } from 'react'
import { X, FileText, User, Calendar, MapPin, Package, IndianRupee, Receipt, TrendingUp, AlertCircle, CheckCircle, BarChart3, DollarSign, Download, Share2 } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { Tabs, TabsList, TabsTrigger } from '../../../../components/ui/Tabs'
import toast from 'react-hot-toast'

interface PODetailsModalProps {
  poId: number
  onClose: () => void
  sessionKey: string
}

const PODetailsModal: React.FC<PODetailsModalProps> = ({ poId, onClose, sessionKey }) => {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [poData, setPOData] = useState<any>(null)
  const [relatedInvoices, setRelatedInvoices] = useState<any[]>([])
  const [claimingData, setClaimingData] = useState<any>(null)
  const [itemWiseTracking, setItemWiseTracking] = useState<any>({})
  const [downloadingReport, setDownloadingReport] = useState(false)

  useEffect(() => {
    fetchPODetails()
  }, [poId])

  const fetchPODetails = async () => {
    try {
      setLoading(true)
      
      const response = await apiClient.getFinancePurchaseOrder(poId, { session_key: sessionKey })
      const data = response.data
      setPOData(data)
      
      const totalAmount = parseFloat(data.total_amount || '0')
      const proformaClaimedAmount = parseFloat(data.proforma_claimed_amount || '0')
      const invoiceClaimedAmount = parseFloat(data.invoice_claimed_amount || '0')
      const totalClaimed = proformaClaimedAmount + invoiceClaimedAmount
      const balanceRemaining = totalAmount - totalClaimed
      const claimedPercentage = totalAmount > 0 ? (totalClaimed / totalAmount) * 100 : 0
      
      setClaimingData({
        totalAmount,
        proformaClaimedAmount,
        invoiceClaimedAmount,
        totalClaimed,
        balanceRemaining,
        claimedPercentage
      })

      // Build item-wise tracking directly from response data (not from stale poData state)
      if (data.po_items?.length > 0) {
        const itemTracking: any = {}
        data.po_items.forEach((poItem: any) => {
          const lineTotal = parseFloat(poItem.line_total || '0')
          const claimedAmount = parseFloat(poItem.claimed_amount ?? 0)
          const rejectedAmount = parseFloat(poItem.rejected_claimed_amount ?? 0)
          const claimableAmount = parseFloat(poItem.claimable_amount ?? 0)
          const claimedPct = parseFloat(poItem.claimed_percentage ?? 0)
          itemTracking[poItem.id] = {
            productName: poItem.product_name,
            totalAmount: lineTotal,
            claimedAmount,
            balanceAmount: claimableAmount,
            rejectedAmount,
            claimedPercentage: claimedPct,
            balancePercentage: Math.max(0, 100 - claimedPct)
          }
        })
        setItemWiseTracking(itemTracking)
      }
      
      await fetchRelatedInvoices()
      
    } catch (error: any) {
      console.error('Error fetching PO details:', error)
      toast.error('Failed to fetch PO details')
    } finally {
      setLoading(false)
    }
  }
  
  const downloadConsolidatedReport = async () => {
    try {
      setDownloadingReport(true)
      const response = await apiClient.getPOConsolidatedReport(poId, { session_key: sessionKey })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `PO_Report_${poData?.internal_po_number || poId}_${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report downloaded successfully')
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setDownloadingReport(false)
    }
  }

  const shareReport = async () => {
    try {
      setDownloadingReport(true)
      const response = await apiClient.getPOConsolidatedReport(poId, { session_key: sessionKey })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const file = new File([blob], `PO_Report_${poData?.internal_po_number || poId}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `PO Report - ${poData?.internal_po_number}` })
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Report downloaded (sharing not supported on this browser)')
      }
    } catch {
      toast.error('Failed to share report')
    } finally {
      setDownloadingReport(false)
    }
  }

  const fetchRelatedInvoices = async () => {
    try {
      const [proformaResponse, invoiceResponse] = await Promise.all([
        apiClient.getFinanceProformaInvoices({ session_key: sessionKey, purchase_order_id: poId, page_size: 100 }),
        apiClient.getFinanceInvoices({ session_key: sessionKey, purchase_order_id: poId, page_size: 100 })
      ])

      const proformas = (proformaResponse.data.results || []).map((inv: any) => ({
        ...inv,
        type: 'proforma',
        invoice_number: inv.proforma_number,
        invoice_date: inv.proforma_date
      }))

      const taxInvoices = (invoiceResponse.data.results || []).map((inv: any) => ({
        ...inv,
        type: 'tax'
      }))

      setRelatedInvoices(
        [...proformas, ...taxInvoices].sort((a, b) =>
          new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
        )
      )
    } catch (error) {
      console.error('Error fetching related invoices:', error)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-300">Loading PO details...</p>
        </div>
      </div>
    )
  }

  if (!poData) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl">
          <p className="text-center text-red-600">Failed to load PO details</p>
          <button 
            onClick={onClose} 
            className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg mx-auto block transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Purchase Order Details
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {poData?.internal_po_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadConsolidatedReport}
              disabled={downloadingReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingReport ? 'Generating...' : 'Download Report'}
            </button>
            <button
              onClick={shareReport}
              disabled={downloadingReport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-6">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex space-x-1 py-0 border-b-0 bg-transparent">
              <TabsTrigger 
                value="overview"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="items"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                <Package className="w-4 h-4 mr-2" />
                Items
              </TabsTrigger>
              <TabsTrigger 
                value="invoices"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                <Receipt className="w-4 h-4 mr-2" />
                Related Invoices
              </TabsTrigger>
              <TabsTrigger 
                value="customer"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                <User className="w-4 h-4 mr-2" />
                Customer
              </TabsTrigger>
              <TabsTrigger 
                value="financial"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                <IndianRupee className="w-4 h-4 mr-2" />
                Financial
              </TabsTrigger>
              <TabsTrigger 
                value="claiming"
                className="!px-4 !py-3 text-sm font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Claiming Status
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Internal PO Number</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.internal_po_number}</p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Client PO Number</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.po_number || 'Not provided'}</p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PO Date</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {poData && new Date(poData.po_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                      poData?.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      poData?.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {poData?.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GST Type</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.gst_type?.toUpperCase()}</p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created By</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.created_by_name}</p>
                  </div>
                  {poData?.shipping_address_details && (
                    <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30 md:col-span-3">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Shipping Address
                      </label>
                      <p className="font-semibold text-gray-900 dark:text-white mt-1">
                        {poData.shipping_address_details.label && <span className="text-orange-600 dark:text-orange-400 mr-2">[{poData.shipping_address_details.label}]</span>}
                        {poData.shipping_address_details.address_line1}
                        {poData.shipping_address_details.address_line2 && `, ${poData.shipping_address_details.address_line2}`}
                        {', '}{poData.shipping_address_details.city}, {poData.shipping_address_details.state} {poData.shipping_address_details.pincode}
                        {', '}{poData.shipping_address_details.country}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              {claimingData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-blue-200 dark:border-blue-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-blue-600 dark:text-blue-400">Total PO Value</label>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mt-1">
                      ₹{claimingData.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-green-600 dark:text-green-400">Balance Remaining</label>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mt-1">
                      ₹{claimingData.balanceRemaining.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{(100 - claimingData.claimedPercentage).toFixed(1)}% unclaimed</p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-orange-200 dark:border-orange-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-orange-600 dark:text-orange-400">Claimed Percentage</label>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mt-1">
                      {claimingData.claimedPercentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className={`rounded-2xl backdrop-blur-xl shadow-xl p-4 ${
                    claimingData.claimedPercentage >= 100 
                      ? 'bg-white/80 dark:bg-gray-900/80 border border-green-200 dark:border-green-700/50'
                      : 'bg-white/80 dark:bg-gray-900/80 border border-gray-300 dark:border-gray-700/50'
                  }`}>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Claimable Status</label>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mt-1">
                      {claimingData.claimedPercentage >= 100 ? '✓ Complete' : 'In Progress'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ITEMS TAB */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">PO Items ({poData?.po_items?.length || 0})</h3>
              <div className="space-y-4">
                {poData?.po_items?.map((item: any) => {
                  const itemTracking = itemWiseTracking[item.id]
                  return (
                    <div key={item.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl">
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{item.product_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                          <p className="text-xs text-gray-400 mt-1">HSN/SAC: {item.hsn_sac_code}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-2xl text-gray-900 dark:text-white">
                            ₹{parseFloat(item.line_total).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Total Amount</p>
                        </div>
                      </div>

                      {/* Item Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Quantity</label>
                          <p className="font-semibold text-gray-900 dark:text-white mt-1">{item.quantity} {item.unit}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Unit Price</label>
                          <p className="font-semibold text-gray-900 dark:text-white mt-1">₹{parseFloat(item.unit_price).toLocaleString()}</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">GST Rate</label>
                          <p className="font-semibold text-gray-900 dark:text-white mt-1">{item.gst_rate}%</p>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Tax Amount</label>
                          <p className="font-semibold text-orange-600 mt-1">₹{(parseFloat(item.line_total) * parseFloat(item.gst_rate) / 100).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Claimed & Balance Tracking */}
                      {itemTracking && (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h5 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                            <TrendingUp className="w-4 h-4 mr-2 text-blue-600" />
                            Claiming Status
                          </h5>
                          
                          {/* Three Column Layout for Claimed, Balance, and Rejected */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Claimed Amount Card */}
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                              <label className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">Claimed Amount</label>
                              <p className="font-bold text-lg text-green-700 dark:text-green-300 mt-2">
                                ₹{itemTracking.claimedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </p>
                              <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-green-600 dark:text-green-400">Claimed</span>
                                  <span className="text-sm font-bold text-green-700 dark:text-green-300">
                                    {itemTracking.claimedPercentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(itemTracking.claimedPercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Balance Amount Card */}
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                              <label className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">Balance Amount</label>
                              <p className="font-bold text-lg text-orange-700 dark:text-orange-300 mt-2">
                                ₹{itemTracking.balanceAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </p>
                              <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-orange-600 dark:text-orange-400">Remaining</span>
                                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                                    {itemTracking.balancePercentage.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(itemTracking.balancePercentage, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>

                            {/* Rejected Amount Card */}
                            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800/30">
                              <label className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Rejected Claimed</label>
                              <p className="font-bold text-lg text-red-700 dark:text-red-300 mt-2">
                                ₹{itemTracking.rejectedAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                              </p>
                              <div className="mt-3">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-red-600 dark:text-red-400">Freed Back</span>
                                  <span className="text-sm font-bold text-red-700 dark:text-red-300">
                                    {itemTracking.totalAmount > 0 
                                      ? ((itemTracking.rejectedAmount / itemTracking.totalAmount) * 100).toFixed(1)
                                      : '0'
                                    }%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-300 dark:bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                    style={{ 
                                      width: `${Math.min(
                                        itemTracking.totalAmount > 0 
                                          ? (itemTracking.rejectedAmount / itemTracking.totalAmount) * 100
                                          : 0, 
                                        100
                                      )}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Combined Progress Bar */}
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Overall Progress</p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 flex overflow-hidden">
                              <div
                                className="bg-green-500 transition-all duration-500"
                                style={{ width: `${Math.min(itemTracking.claimedPercentage, 100)}%` }}
                              ></div>
                              <div
                                className="bg-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(itemTracking.balancePercentage, 100)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                              <span>₹0</span>
                              <span>₹{itemTracking.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* INVOICES TAB */}
          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Related Invoices ({relatedInvoices.length})</h3>
                
                {relatedInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No related invoices found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relatedInvoices.map((invoice) => (
                      <div key={`${invoice.type}-${invoice.id}`} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-4">
                        <div className="flex justify-between items-start flex-col sm:flex-row gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                invoice.type === 'proforma' 
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              }`}>
                                {invoice.type === 'proforma' ? 'Proforma' : 'Tax Invoice'}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                invoice.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                invoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                invoice.is_rejected ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {invoice.is_rejected ? 'Rejected' : invoice.status?.replace('_', ' ').toUpperCase() || 'Draft'}
                              </span>
                            </div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {invoice.invoice_number}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                            </p>
                            {invoice.due_date && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Due: {new Date(invoice.due_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right sm:text-right w-full sm:w-auto">
                            <p className="font-bold text-lg text-gray-900 dark:text-white">
                              ₹{parseFloat(invoice.total_amount).toLocaleString()}
                            </p>
                            <div className="space-y-1 mt-2">
                              {invoice.paid_amount && parseFloat(invoice.paid_amount) > 0 && (
                                <p className="text-sm text-green-600">
                                  Paid: ₹{parseFloat(invoice.paid_amount).toLocaleString()}
                                </p>
                              )}
                              {invoice.balance_amount && parseFloat(invoice.balance_amount) > 0 && (
                                <p className="text-sm text-red-600">
                                  Balance: ₹{parseFloat(invoice.balance_amount).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CUSTOMER TAB */}
          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-green-600" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Name</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.name}</p>
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Code</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.customer_code}</p>
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.email}</p>
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.phone}</p>
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GSTIN</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.gstin || 'Not provided'}</p>
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PAN Number</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">{poData?.customer_details?.pan_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-purple-600" />
                  Billing Address
                </h3>
                <div className="bg-purple-50/50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-200 dark:border-purple-800/30">
                  <p className="text-gray-900 dark:text-white">
                    {poData?.customer_details?.billing_address_line1}
                    {poData?.customer_details?.billing_address_line2 && (
                      <><br />{poData.customer_details.billing_address_line2}</>
                    )}
                    <br />
                    {poData?.customer_details?.billing_city}, {poData?.customer_details?.billing_state} {poData?.customer_details?.billing_pincode}
                    <br />
                    {poData?.customer_details?.billing_country}
                  </p>
                </div>
              </div>

              {/* Shipping Address */}
              {poData?.shipping_address_details && (
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                    Shipping Address
                  </h3>
                  <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                    <p className="text-gray-900 dark:text-white">
                      {poData.shipping_address_details.address_line1}
                      {poData.shipping_address_details.address_line2 && (
                        <><br />{poData.shipping_address_details.address_line2}</>
                      )}
                      <br />
                      {poData.shipping_address_details.city}, {poData.shipping_address_details.state} {poData.shipping_address_details.pincode}
                      <br />
                      {poData.shipping_address_details.country}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FINANCIAL TAB */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <IndianRupee className="w-5 h-5 mr-2 text-indigo-600" />
                  Financial Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-200 dark:border-blue-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</label>
                    <p className="font-bold text-xl text-gray-900 dark:text-white mt-1">
                      ₹{parseFloat(poData?.subtotal || '0').toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tax</label>
                    <p className="font-bold text-xl text-orange-600 mt-1">
                      ₹{parseFloat(poData?.total_tax || '0').toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Discount</label>
                    <p className="font-bold text-xl text-red-600 mt-1">
                      ₹{parseFloat(poData?.discount_amount || '0').toLocaleString()}
                    </p>
                    {parseFloat(poData?.discount_percentage || '0') > 0 && (
                      <p className="text-xs text-gray-500 mt-1">({poData.discount_percentage}%)</p>
                    )}
                  </div>
                  <div className="bg-green-50/50 dark:bg-green-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800/30">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Amount</label>
                    <p className="font-bold text-2xl text-green-600 mt-1">
                      ₹{parseFloat(poData?.total_amount || '0').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Tax Breakdown</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center">
                    <label className="text-xs font-medium text-blue-600 dark:text-blue-400">CGST</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                      ₹{parseFloat(poData?.cgst_amount || '0').toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center">
                    <label className="text-xs font-medium text-blue-600 dark:text-blue-400">SGST</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                      ₹{parseFloat(poData?.sgst_amount || '0').toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200 dark:border-blue-800/30 text-center">
                    <label className="text-xs font-medium text-blue-600 dark:text-blue-400">IGST</label>
                    <p className="font-semibold text-gray-900 dark:text-white mt-1">
                      ₹{parseFloat(poData?.igst_amount || '0').toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLAIMING STATUS TAB */}
          {activeTab === 'claiming' && claimingData && (
            <div className="space-y-6">
              {/* Claiming Progress */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-emerald-600" />
                  Claiming Progress
                </h3>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Progress</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {claimingData.claimedPercentage.toFixed(1)}% Complete
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        claimingData.claimedPercentage >= 100 ? 'bg-green-500' :
                        claimingData.claimedPercentage >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(claimingData.claimedPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>₹0</span>
                    <span>₹{claimingData.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Claiming Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-blue-200 dark:border-blue-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-blue-600 dark:text-blue-400">Total PO Value</label>
                    <p className="font-bold text-lg text-gray-900 dark:text-white mt-1">
                      ₹{claimingData.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-purple-200 dark:border-purple-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-purple-600 dark:text-purple-400">Proforma Claimed</label>
                    <p className="font-bold text-lg text-purple-600 mt-1">
                      ₹{claimingData.proformaClaimedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-orange-200 dark:border-orange-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-orange-600 dark:text-orange-400">Invoice Claimed</label>
                    <p className="font-bold text-lg text-orange-600 mt-1">
                      ₹{claimingData.invoiceClaimedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-green-200 dark:border-green-700/50 shadow-xl p-4">
                    <label className="text-xs font-medium text-green-600 dark:text-green-400">Balance Remaining</label>
                    <p className="font-bold text-lg text-green-600 mt-1">
                      ₹{claimingData.balanceRemaining.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(100 - claimingData.claimedPercentage).toFixed(1)}% remaining
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl flex items-center justify-center p-6">
                {claimingData.claimedPercentage >= 100 ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="w-6 h-6 mr-2" />
                    <span className="font-semibold">PO Fully Claimed - Ready for Completion</span>
                  </div>
                ) : claimingData.claimedPercentage > 0 ? (
                  <div className="flex items-center text-yellow-600">
                    <AlertCircle className="w-6 h-6 mr-2" />
                    <span className="font-semibold">PO Partially Claimed - In Progress</span>
                  </div>
                ) : (
                  <div className="flex items-center text-blue-600">
                    <Receipt className="w-6 h-6 mr-2" />
                    <span className="font-semibold">PO Ready for Invoicing</span>
                  </div>
                )}
              </div>

              {/* Balance Claimable Info */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-blue-200 dark:border-blue-700/50 shadow-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-600" />
                  Balance Claimable Information
                </h3>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <strong>Claimable Percentage:</strong> {(100 - claimingData.claimedPercentage).toFixed(1)}% of the total PO value
                  </p>
                  <p>
                    <strong>Maximum Claimable Amount:</strong> ₹{claimingData.balanceRemaining.toLocaleString()}
                  </p>
                  <p>
                    <strong>Claimed So Far:</strong> {claimingData.claimedPercentage.toFixed(1)}% (₹{claimingData.totalClaimed.toLocaleString()})
                  </p>
                  <p className="text-xs opacity-75 mt-4">
                    This balance represents the portion of the PO that is still available for claiming through Proforma Invoices or Tax Invoices.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PODetailsModal