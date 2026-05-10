import React, { useState } from 'react'
import ProformaInvoiceList from '../components/ProformaInvoiceList'
import FinanceCard from '../components/FinanceCard'
import FinancialYearFilter from '../components/FinancialYearFilter'
import { getCurrentFY } from '../../../../utils/financialYearUtils'

interface ProformaInvoicesProps {
  sessionKey: string
}

const ProformaInvoices: React.FC<ProformaInvoicesProps> = ({ sessionKey }) => {
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY())

  return (
    <div className="space-y-6">
      <FinanceCard>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Proforma Invoices
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your proforma invoices
            </p>
          </div>
          <FinancialYearFilter
            selectedYear={selectedFY}
            onYearChange={setSelectedFY}
          />
        </div>
      </FinanceCard>
      <ProformaInvoiceList sessionKey={sessionKey} selectedFY={selectedFY} />
    </div>
  )
}

export default ProformaInvoices
