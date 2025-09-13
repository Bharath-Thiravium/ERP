import React from 'react'

interface QuotationItem {
  id: number
  product_name: string
  product_code: string
  description: string
  hsn_sac_code: string
  quantity: string
  unit: string
  unit_price: string
  line_total: string
  gst_rate: string
}

interface Customer {
  id: number
  customer_code: string
  name: string
  email: string
  phone: string
  gstin: string
  pan_number: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
}

interface ShippingAddress {
  id: number
  label: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  country: string
}

interface QuotationDetail {
  id: number
  quotation_number: string
  quotation_date: string
  valid_until: string
  reference: string
  status: string
  gst_type: string
  customer_gstin: string
  company_gstin: string
  subtotal: string
  total_tax: string
  total_amount: string
  cgst_amount: string
  sgst_amount: string
  igst_amount: string
  discount_percentage: string
  discount_amount: string
  shipping_charges: string
  other_charges: string
  notes: string
  terms_and_conditions: string
  created_at: string
  created_by_name: string
  customer_details: Customer
  shipping_address_details: ShippingAddress | null
  quotation_items: QuotationItem[]
}

interface PrintableQuotationProps {
  quotation: QuotationDetail
}

const PrintableQuotation: React.FC<PrintableQuotationProps> = ({ quotation }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount))
  }

  return (
    <div className="printable-quotation bg-white text-black p-8 max-w-4xl mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-6 mb-8">
        <div className="flex-1">
          <div className="w-24 h-24 bg-gray-200 border-2 border-gray-400 flex items-center justify-center text-xs text-gray-600 mb-2">
            LOGO
          </div>
          <div className="text-sm font-semibold">Your Company Name</div>
        </div>
        <div className="text-center flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QUOTATION</h1>
          <div className="text-lg text-gray-700">
            <div className="font-semibold">{quotation.quotation_number}</div>
            <div className="text-sm mt-1">Date: {formatDate(quotation.quotation_date)}</div>
          </div>
        </div>
        <div className="flex-1 text-right text-sm">
          <div className="font-semibold mb-1">Valid Until:</div>
          <div>{formatDate(quotation.valid_until)}</div>
          <div className="mt-2">
            <span className="inline-block px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-medium capitalize">
              {quotation.status}
            </span>
          </div>
        </div>
      </div>

      {/* Company and Customer Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* From */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">From:</h3>
          <div className="text-sm">
            <div className="font-semibold text-base mb-2">Your Company Name</div>
            <div>123 Business Street</div>
            <div>City, State 12345</div>
            <div>Phone: +91 12345 67890</div>
            <div>Email: info@company.com</div>
            {quotation.company_gstin && <div>GSTIN: {quotation.company_gstin}</div>}
          </div>
        </div>

        {/* To */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-300 pb-1">To:</h3>
          <div className="text-sm">
            <div className="font-semibold text-base mb-2">{quotation.customer_details.name}</div>
            <div>{quotation.customer_details.customer_code}</div>
            <div>{quotation.customer_details.billing_address_line1}</div>
            {quotation.customer_details.billing_address_line2 && (
              <div>{quotation.customer_details.billing_address_line2}</div>
            )}
            <div>{quotation.customer_details.billing_city}, {quotation.customer_details.billing_state} {quotation.customer_details.billing_pincode}</div>
            <div>{quotation.customer_details.billing_country}</div>
            {quotation.customer_details.phone && <div>Phone: {quotation.customer_details.phone}</div>}
            {quotation.customer_details.email && <div>Email: {quotation.customer_details.email}</div>}
            {quotation.customer_details.gstin && <div>GSTIN: {quotation.customer_details.gstin}</div>}
          </div>
        </div>
      </div>



      {/* Items Table */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
        <table className="w-full border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-3 py-2 text-left">S.No</th>
              <th className="border border-gray-400 px-3 py-2 text-left">Product</th>
              <th className="border border-gray-400 px-3 py-2 text-left">HSN/SAC</th>
              <th className="border border-gray-400 px-3 py-2 text-center">Qty</th>
              <th className="border border-gray-400 px-3 py-2 text-right">Unit Price</th>
              <th className="border border-gray-400 px-3 py-2 text-center">GST %</th>
              <th className="border border-gray-400 px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.quotation_items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-gray-400 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 px-3 py-2">
                  <div className="font-medium">{item.product_name}</div>
                  <div className="text-xs text-gray-600">{item.product_code}</div>
                  {item.description && (
                    <div className="text-xs text-gray-600 mt-1">{item.description}</div>
                  )}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-center">{item.hsn_sac_code}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{item.quantity} {item.unit}</td>
                <td className="border border-gray-400 px-3 py-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="border border-gray-400 px-3 py-2 text-center">{parseFloat(item.gst_rate).toFixed(2)}%</td>
                <td className="border border-gray-400 px-3 py-2 text-right font-medium">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-8">
        <div className="w-80">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-right pr-4">Subtotal:</td>
                <td className="py-1 text-right font-medium">{formatCurrency(quotation.subtotal)}</td>
              </tr>
              
              {parseFloat(quotation.discount_amount) > 0 && (
                <tr className="text-red-600">
                  <td className="py-1 text-right pr-4">
                    Discount {parseFloat(quotation.discount_percentage) > 0 && `(${parseFloat(quotation.discount_percentage).toFixed(2)}%)`}:
                  </td>
                  <td className="py-1 text-right">-{formatCurrency(quotation.discount_amount)}</td>
                </tr>
              )}

              {parseFloat(quotation.shipping_charges) > 0 && (
                <tr>
                  <td className="py-1 text-right pr-4">Shipping Charges:</td>
                  <td className="py-1 text-right">{formatCurrency(quotation.shipping_charges)}</td>
                </tr>
              )}

              {parseFloat(quotation.other_charges) > 0 && (
                <tr>
                  <td className="py-1 text-right pr-4">Other Charges:</td>
                  <td className="py-1 text-right">{formatCurrency(quotation.other_charges)}</td>
                </tr>
              )}

              {quotation.gst_type === 'intra_state' ? (
                <>
                  {parseFloat(quotation.cgst_amount) > 0 && (
                    <tr>
                      <td className="py-1 text-right pr-4">CGST:</td>
                      <td className="py-1 text-right">{formatCurrency(quotation.cgst_amount)}</td>
                    </tr>
                  )}
                  {parseFloat(quotation.sgst_amount) > 0 && (
                    <tr>
                      <td className="py-1 text-right pr-4">SGST:</td>
                      <td className="py-1 text-right">{formatCurrency(quotation.sgst_amount)}</td>
                    </tr>
                  )}
                </>
              ) : (
                parseFloat(quotation.igst_amount) > 0 && (
                  <tr>
                    <td className="py-1 text-right pr-4">IGST:</td>
                    <td className="py-1 text-right">{formatCurrency(quotation.igst_amount)}</td>
                  </tr>
                )
              )}

              <tr className="border-t-2 border-gray-800">
                <td className="py-2 text-right pr-4 font-bold text-lg">Total Amount:</td>
                <td className="py-2 text-right font-bold text-lg">{formatCurrency(quotation.total_amount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Terms and Conditions */}
      {quotation.terms_and_conditions && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Terms and Conditions</h3>
          <div className="text-sm whitespace-pre-wrap border border-gray-300 p-4 bg-gray-50">
            {quotation.terms_and_conditions}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 border-t border-gray-300 pt-4">
        <div>This is a computer-generated quotation and does not require a signature.</div>
        <div className="mt-2">
          Created by: {quotation.created_by_name} | Created on: {formatDate(quotation.created_at)}
        </div>
      </div>
    </div>
  )
}

export default PrintableQuotation
