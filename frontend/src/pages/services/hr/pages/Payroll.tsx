import React, { useState } from 'react'
import PayrollDashboard from '../components/payroll/PayrollDashboard'
import PayrollCycleForm from '../components/payroll/PayrollCycleForm'
import PayslipList from '../components/payroll/PayslipList'


const Payroll: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedCycle, setSelectedCycle] = useState<any>(null)

  const handleCreateCycle = () => {
    setActiveView('create-cycle')
  }

  const handleViewCycle = (cycle: any) => {
    setSelectedCycle(cycle)
    setActiveView('cycle-details')
  }

  const handleViewPayslips = (cycleId: number) => {
    setSelectedCycle({ id: cycleId })
    setActiveView('payslips')
  }

  const handleCycleCreated = () => {
    setActiveView('dashboard')
  }

  const handleCancelCreate = () => {
    setActiveView('dashboard')
  }

  const handleViewPayslip = (payslip: any) => {
    // This is handled by PayslipList component internally
    console.log('View payslip:', payslip)
  }

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'dashboard'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveView('payslips')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'payslips'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          All Payslips
        </button>

        <button
          onClick={() => setActiveView('create-cycle')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'create-cycle'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Create Cycle
        </button>
      </div>

      {/* Content */}
      {activeView === 'dashboard' && (
        <PayrollDashboard
          onCreateCycle={handleCreateCycle}
          onViewCycle={handleViewCycle}
          onViewPayslips={handleViewPayslips}
        />
      )}

      {activeView === 'create-cycle' && (
        <PayrollCycleForm
          onSuccess={handleCycleCreated}
          onCancel={handleCancelCreate}
        />
      )}

      {activeView === 'payslips' && (
        <PayslipList
          cycleId={selectedCycle?.id}
          onViewPayslip={handleViewPayslip}
        />
      )}



      {activeView === 'cycle-details' && selectedCycle && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Payroll Cycle Details: {selectedCycle.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Period</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(selectedCycle.start_date).toLocaleDateString()} - {new Date(selectedCycle.end_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pay Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(selectedCycle.pay_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  selectedCycle.status === 'completed' ? 'bg-green-100 text-green-800' :
                  selectedCycle.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedCycle.status}
                </span>
              </div>
            </div>
          </div>
          
          <PayslipList
            cycleId={selectedCycle.id}
            onViewPayslip={handleViewPayslip}
          />
        </div>
      )}
    </div>
  )
}

export default Payroll