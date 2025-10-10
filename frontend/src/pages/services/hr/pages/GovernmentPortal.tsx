import React, { useState } from 'react'
import GovernmentPortalIntegration from '../components/government/GovernmentPortalIntegration'

const GovernmentPortal: React.FC = () => {
  const [activeView] = useState('portal')

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
        >
          Portal Integration
        </button>
      </div>

      {/* Content */}
      {activeView === 'portal' && <GovernmentPortalIntegration />}
    </div>
  )
}

export default GovernmentPortal
