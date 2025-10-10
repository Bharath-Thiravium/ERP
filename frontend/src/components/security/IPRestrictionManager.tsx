import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Globe, Shield, Clock, CheckCircle, XCircle } from 'lucide-react'
import { IPRestriction } from '../../types'

const ipSchema = z.object({
  ip_address: z.string().regex(
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    'Please enter a valid IP address'
  ),
  description: z.string().min(1, 'Description is required').max(100, 'Description too long')
})

type IPFormData = z.infer<typeof ipSchema>

interface IPRestrictionManagerProps {
  restrictions: IPRestriction[]
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  onAddIP: (data: { ip_address: string; description: string }) => Promise<void>
  onRemoveIP: (id: number) => Promise<void>
  onToggleIP: (id: number, active: boolean) => Promise<void>
  isLoading?: boolean
}

const IPRestrictionManager: React.FC<IPRestrictionManagerProps> = ({
  restrictions,
  isEnabled,
  onToggleEnabled,
  onAddIP,
  onRemoveIP,
  onToggleIP,
  isLoading = false
}) => {
  const [showAddForm, setShowAddForm] = useState(false)

  const { register, handleSubmit, formState: { errors }, reset } = useForm<IPFormData>({
    resolver: zodResolver(ipSchema)
  })

  const onSubmit = async (data: IPFormData) => {
    await onAddIP(data)
    reset()
    setShowAddForm(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <Globe className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">IP Address Restrictions</h3>
              <p className="text-gray-600 dark:text-gray-400">Control which IP addresses can access the system</p>
            </div>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${
              isEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-0.5'
              } mt-0.5`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {isEnabled && (
          <>
            <div className="mb-6 p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-yellow-700 dark:text-yellow-300 text-sm">
                  <p className="font-semibold mb-1">Security Notice</p>
                  <p>Only the specified IP addresses will be able to access this system. Make sure to add your current IP to avoid being locked out.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Allowed IP Addresses</h4>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg"
              >
                <Plus className="h-4 w-4" />
                <span>Add IP</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleSubmit(onSubmit)} className="mb-6 p-6 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      IP Address
                    </label>
                    <input
                      {...register('ip_address')}
                      type="text"
                      placeholder="192.168.1.100"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300"
                    />
                    {errors.ip_address && (
                      <p className="text-red-500 text-xs mt-2">{errors.ip_address.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Description
                    </label>
                    <input
                      {...register('description')}
                      type="text"
                      placeholder="Office Network"
                      className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300"
                    />
                    {errors.description && (
                      <p className="text-red-500 text-xs mt-2">{errors.description.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-6">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg font-semibold"
                  >
                    Add IP Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {restrictions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">No IP restrictions configured</h4>
                  <p className="text-sm">Add IP addresses to restrict access to your system</p>
                </div>
              ) : (
                restrictions.map((restriction) => (
                  <div
                    key={restriction.id}
                    className="flex items-center justify-between p-6 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${
                        restriction.is_active 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        {restriction.is_active ? (
                          <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{restriction.ip_address}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{restriction.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Added {formatDate(restriction.created_at)}</span>
                          </span>
                          {restriction.last_used && (
                            <span>Last used {formatDate(restriction.last_used)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => onToggleIP(restriction.id, !restriction.is_active)}
                        disabled={isLoading}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                          restriction.is_active
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                        }`}
                      >
                        {restriction.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => onRemoveIP(restriction.id)}
                        disabled={isLoading}
                        className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default IPRestrictionManager