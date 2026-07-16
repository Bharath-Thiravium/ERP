import React from 'react'
import { ShieldCheck } from 'lucide-react'
import PTWForm from './components/PTWForm'

const PTWModule: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Permit To Work
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload a PTW document image to auto-fill the form, or enter details manually
            </p>
          </div>
        </div>

        <PTWForm />
      </div>
    </div>
  )
}

export default PTWModule
