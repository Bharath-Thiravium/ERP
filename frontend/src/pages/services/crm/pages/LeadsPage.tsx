import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Eye, Edit, Trash2, Phone, Mail, User, Building, Target } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'
import { LeadModal } from '../components/LeadModal'

interface Lead {
  id: number
  lead_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  company_name: string
  job_title: string
  status: string
  priority: string
  source: string
  estimated_value: number
  expected_close_date: string
  created_at: string
}

export const LeadsPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-green-100 text-green-800' },
    { value: 'proposal', label: 'Proposal Sent', color: 'bg-purple-100 text-purple-800' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { value: 'won', label: 'Won', color: 'bg-green-100 text-green-800' },
    { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' }
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
  ]



  // Fetch leads
  const fetchLeads = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const response = await crmApi.getLeads(sessionKey!)
      setLeads(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching leads:', error)
      toast.error('Failed to fetch leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [sessionKey])

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = `${lead.first_name} ${lead.last_name} ${lead.email} ${lead.company_name}`
      .toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Convert lead to opportunity
  const convertToOpportunity = async (leadId: number) => {
    if (!sessionKey!) return
    
    try {
      await crmApi.convertLeadToOpportunity(sessionKey!, leadId)
      toast.success('Lead converted to opportunity successfully!')
      // Update the lead status in local state
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId 
            ? { ...lead, status: 'won' }
            : lead
        )
      )
    } catch (error: any) {
      console.error('Error converting lead:', error)
      const errorMessage = error.response?.data?.error || 'Failed to convert lead'
      toast.error(errorMessage)
    }
  }

  // Delete lead
  const deleteLead = async (leadId: number) => {
    if (!sessionKey!) return
    
    if (!confirm('Are you sure you want to delete this lead?')) return
    
    try {
      await crmApi.deleteLead(sessionKey!, leadId)
      toast.success('Lead deleted successfully!')
      fetchLeads()
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
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
              Lead Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage and track your sales leads
            </p>
          </div>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => {
          const statusOption = statusOptions.find(s => s.value === lead.status)
          const priorityOption = priorityOptions.find(p => p.value === lead.priority)
          
          return (
            <div key={lead.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-lg transition-all duration-200">
              {/* Lead Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white font-semibold">
                    {lead.first_name.charAt(0)}{lead.last_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {lead.first_name} {lead.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{lead.job_title || 'No title'}</p>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      setSelectedLead(lead)
                      // You can add a view modal here or navigate to details page
                      alert(`Lead Details:\n\nName: ${lead.first_name} ${lead.last_name}\nEmail: ${lead.email}\nPhone: ${lead.phone || 'N/A'}\nCompany: ${lead.company_name || 'N/A'}\nStatus: ${lead.status}\nPriority: ${lead.priority}\nSource: ${lead.source}\nEstimated Value: ₹${lead.estimated_value?.toLocaleString() || 0}\nExpected Close: ${lead.expected_close_date || 'N/A'}`)
                    }}
                    title="View Lead Details"
                  >
                    <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={() => {
                      setSelectedLead(lead)
                      setShowCreateModal(true)
                    }}
                    title="Edit Lead"
                  >
                    <Edit className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => deleteLead(lead.id)}
                    title="Delete Lead"
                  >
                    <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                  </Button>
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{lead.company_name || 'No company'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{lead.phone}</span>
                  </div>
                )}
                {lead.estimated_value && (
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">₹{lead.estimated_value.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Status & Priority */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${statusOption?.color || 'bg-gray-100 text-gray-800'}`}>
                    {statusOption?.label || lead.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${priorityOption?.color || 'bg-gray-100 text-gray-800'}`}>
                    {priorityOption?.label || lead.priority}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 mt-4">
                {lead.status !== 'won' ? (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1"
                    onClick={() => convertToOpportunity(lead.id)}
                  >
                    Convert
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 bg-green-50 text-green-600 border-green-200 cursor-not-allowed"
                    disabled
                  >
                    Converted
                  </Button>
                )}
                <Button 
                  size="sm" 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                  onClick={() => {
                    if (lead.email) {
                      // Use Gmail web interface for better Linux compatibility
                      const subject = encodeURIComponent('Follow up on your inquiry')
                      const body = encodeURIComponent(`Hi ${lead.first_name},\n\nI wanted to follow up on your recent inquiry. Please let me know if you have any questions.\n\nBest regards`)
                      window.open(`https://mail.google.com/mail/?view=cm&to=${lead.email}&su=${subject}&body=${body}`, '_blank')
                    } else if (lead.phone) {
                      // Copy phone number to clipboard and show notification
                      navigator.clipboard.writeText(lead.phone).then(() => {
                        alert(`Phone number copied to clipboard: ${lead.phone}`)
                      }).catch(() => {
                        alert(`Call: ${lead.phone}`)
                      })
                    } else {
                      alert('No contact information available for this lead')
                    }
                  }}
                >
                  Contact
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No leads found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Get started by adding your first lead'}
          </p>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      )}

      {/* Lead Modal */}
      <LeadModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setSelectedLead(null)
        }}
        onSuccess={fetchLeads}
        lead={selectedLead}
      />
    </div>
  )
}