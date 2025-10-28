import React, { useState, useEffect } from 'react'
import { Plus, Search, Target, DollarSign, Calendar, Edit, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import { OpportunityModal } from '../components/OpportunityModal'
import toast from 'react-hot-toast'

interface Opportunity {
  id: number
  opportunity_id: string
  name: string
  account_name?: string
  stage: string
  amount: number
  probability: number
  expected_close_date: string
  created_at: string
  weighted_amount?: number
}

export const OpportunitiesPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)

  const fetchOpportunities = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const response = await crmApi.getOpportunities(sessionKey!)
      setOpportunities(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching opportunities:', error)
      toast.error('Failed to fetch opportunities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [sessionKey])

  const filteredOpportunities = opportunities.filter(opp =>
    opp.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStageColor = (stage: string) => {
    const colors = {
      prospecting: 'bg-blue-100 text-blue-800',
      qualification: 'bg-yellow-100 text-yellow-800',
      needs_analysis: 'bg-purple-100 text-purple-800',
      proposal: 'bg-orange-100 text-orange-800',
      negotiation: 'bg-red-100 text-red-800',
      closed_won: 'bg-green-100 text-green-800',
      closed_lost: 'bg-gray-100 text-gray-800'
    }
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleCreateOpportunity = () => {
    setSelectedOpportunity(null)
    setShowModal(true)
  }

  const handleEditOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity)
    setShowModal(true)
  }

  const handleDeleteOpportunity = async (id: number) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this opportunity?')) return
    
    try {
      await crmApi.deleteOpportunity(sessionKey!, id)
      toast.success('Opportunity deleted successfully!')
      fetchOpportunities()
    } catch (error) {
      console.error('Error deleting opportunity:', error)
      toast.error('Failed to delete opportunity')
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
              Sales Pipeline
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your sales opportunities
            </p>
          </div>
          <Button 
            onClick={handleCreateOpportunity}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOpportunities.map((opportunity) => (
          <div key={opportunity.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-lg transition-all duration-200">
            {/* Header with Avatar and Actions */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {opportunity.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{opportunity.account_name || 'No Account'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleEditOpportunity(opportunity)}
                  title="Edit Opportunity"
                >
                  <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => handleDeleteOpportunity(opportunity.id)}
                  title="Delete Opportunity"
                >
                  <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                </Button>
              </div>
            </div>

            {/* Stage Badge */}
            <div className="mb-4">
              <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStageColor(opportunity.stage)}`}>
                {opportunity.stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>

            {/* Opportunity Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{opportunity.amount.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {opportunity.probability}% probability
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Expected: {new Date(opportunity.expected_close_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-green-600">
                    Weighted: ₹{opportunity.weighted_amount?.toLocaleString() || '0'}
                  </span>
                  <span className="text-xs text-gray-500">
                    Created: {new Date(opportunity.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">
                    ID: {opportunity.opportunity_id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No opportunities found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first opportunity'}
          </p>
        </div>
      )}

      <OpportunityModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedOpportunity(null)
        }}
        onSuccess={fetchOpportunities}
        opportunity={selectedOpportunity}
      />
    </div>
  )
}