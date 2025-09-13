import React from 'react'
import ProformaInvoiceList from '../components/ProformaInvoiceList'

interface ProformaInvoicesProps {
  sessionKey: string
}

const ProformaInvoices: React.FC<ProformaInvoicesProps> = ({ sessionKey }) => {
  return (
    <div className="space-y-6">
      <ProformaInvoiceList sessionKey={sessionKey} />
    </div>
  )
}

export default ProformaInvoices
