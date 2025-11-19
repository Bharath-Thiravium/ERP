import React, { useState, useEffect } from 'react'
import { Plus, Search, Building, Mail, Phone, Globe, Edit, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import { AccountModal } from '../components/AccountModal'
import toast from 'react-hot-toast'

interface Account {
  id: number
  account_id: string
  name: string
  account_type: string
  industry: string
  email?: string
  phone?: string
  website?: string
  is_active: boolean
  created_at: string
  opportunities_count?: number
}

export const AccountsPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)

  const fetchAccounts = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const response = await crmApi.getAccounts(sessionKey!)
      setAccounts(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast.error('Failed to fetch accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, [sessionKey])

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getAccountTypeColor = (type: string) => {
    const colors = {
      prospect: 'bg-blue-100 text-blue-800',
      customer: 'bg-green-100 text-green-800',
      partner: 'bg-purple-100 text-purple-800',
      vendor: 'bg-orange-100 text-orange-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleCreateAccount = () => {
    setSelectedAccount(null)
    setShowModal(true)
  }

  const handleEditAccount = (account: Account) => {
    setSelectedAccount(account)
    setShowModal(true)
  }

  const handleDeleteAccount = async (id: number) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this account?')) return
    
    try {
      await crmApi.deleteAccount(sessionKey!, id)
      toast.success('Account deleted successfully!')
      fetchAccounts()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Account Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your business accounts
            </p>
          </div>
          <Button 
            onClick={handleCreateAccount}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAccounts.map((account) => (
          <div key={account.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-green-500 to-blue-600 flex items-center justify-center">
                  <Building className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {account.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{account.industry}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getAccountTypeColor(account.account_type)}`}>
                  {account.account_type}
                </span>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => handleEditAccount(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-600"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {account.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{account.email}</span>
                </div>
              )}
              {account.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{account.phone}</span>
                </div>
              )}
              {account.website && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{account.website}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {account.opportunities_count || 0} opportunities
              </span>
              <span className="text-xs text-gray-500">
                {new Date(account.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No accounts found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first account'}
          </p>
        </div>
      )}

      <AccountModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedAccount(null)
        }}
        onSuccess={fetchAccounts}
        account={selectedAccount}
      />
    </div>
  )
}