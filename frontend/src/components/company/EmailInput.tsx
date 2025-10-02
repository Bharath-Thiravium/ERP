import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Mail, Globe } from 'lucide-react'
import { apiClient } from '../../lib/api'

interface EmailInputProps {
  value: string
  username: string
  onChange: (email: string) => void
}

const EmailInput: React.FC<EmailInputProps> = ({ value, username, onChange }) => {
  const [localEmail, setLocalEmail] = useState(value)
  const [showDomainSuggestion, setShowDomainSuggestion] = useState(false)

  // Fetch company domain
  const { data: domainData } = useQuery({
    queryKey: ['company-domain'],
    queryFn: () => apiClient.get('/api/company-dashboard/domain/'),
  })

  const companyDomain = domainData?.data?.domain_name

  useEffect(() => {
    setLocalEmail(value)
  }, [value])

  useEffect(() => {
    // Auto-suggest domain format when username changes
    if (username && companyDomain && !localEmail.includes('@')) {
      setShowDomainSuggestion(true)
    } else {
      setShowDomainSuggestion(false)
    }
  }, [username, companyDomain, localEmail])

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setLocalEmail(newEmail)
    onChange(newEmail)
  }

  const handleDomainSuggestionClick = () => {
    if (username && companyDomain) {
      const suggestedEmail = `${username}@${companyDomain}`
      setLocalEmail(suggestedEmail)
      onChange(suggestedEmail)
      setShowDomainSuggestion(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="email"
          value={localEmail}
          onChange={handleEmailChange}
          className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          placeholder={companyDomain ? `user@${companyDomain}` : "user@company.com"}
        />
        <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>

      {/* Domain suggestion */}
      {showDomainSuggestion && companyDomain && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Suggested: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{username}@{companyDomain}</code>
              </span>
            </div>
            <button
              type="button"
              onClick={handleDomainSuggestionClick}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
            >
              Use This
            </button>
          </div>
        </div>
      )}

      {/* Domain info */}
      {companyDomain && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <Globe className="inline h-3 w-3 mr-1" />
          Company domain: {companyDomain}
        </div>
      )}
    </div>
  )
}

export default EmailInput