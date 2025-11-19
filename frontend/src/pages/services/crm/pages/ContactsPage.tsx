import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Phone, Mail, User, Building } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import { ContactModal } from '../components/ContactModal'
import toast from 'react-hot-toast'

interface Contact {
  id: number
  contact_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  mobile?: string
  job_title?: string
  department?: string
  is_active: boolean
  created_at: string
}

export const ContactsPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const fetchContacts = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const response = await crmApi.getContacts(sessionKey!)
      setContacts(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast.error('Failed to fetch contacts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [sessionKey])

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name} ${contact.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreateContact = () => {
    setSelectedContact(null)
    setShowModal(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setShowModal(true)
  }

  const handleDeleteContact = async (id: number) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this contact?')) return
    
    try {
      await crmApi.deleteContact(sessionKey!, id)
      toast.success('Contact deleted successfully!')
      fetchContacts()
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast.error('Failed to delete contact')
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
              Contact Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your business contacts
            </p>
          </div>
          <Button 
            onClick={handleCreateContact}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContacts.map((contact) => (
          <div key={contact.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {contact.first_name} {contact.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{contact.job_title || 'No title'}</p>
                </div>
              </div>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleEditContact(contact)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-red-600"
                  onClick={() => handleDeleteContact(contact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-300">{contact.email}</span>
              </div>
              {contact.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{contact.phone}</span>
                </div>
              )}
              {contact.department && (
                <div className="flex items-center space-x-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{contact.department}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className={`px-2 py-1 text-xs rounded-full ${contact.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {contact.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(contact.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No contacts found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first contact'}
          </p>
        </div>
      )}

      <ContactModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedContact(null)
        }}
        onSuccess={fetchContacts}
        contact={selectedContact}
      />
    </div>
  )
}