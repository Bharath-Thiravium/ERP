import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Building2, 
  Edit, 
  Save, 
  X, 
  FileText,
  User,
  Calendar,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import toast from 'react-hot-toast'

const CompanyDetailsPage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const queryClient = useQueryClient()

  // Fetch company details
  const { data: companyDetails, isLoading, error } = useQuery({
    queryKey: ['company-details'],
    queryFn: () => apiClient.getCompanyDetails(),
  })

  const company = companyDetails?.data

  // Update company details mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateCompanyDetails(data),
    onSuccess: () => {
      toast.success('Company details updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-details'] })
      setIsEditing(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update company details')
    }
  })

  const handleEdit = () => {
    setFormData({
      phone: company?.phone || '',
      address: company?.address || '',
      business_type: company?.business_type || '',
      industry: company?.industry || '',
      employee_count: company?.employee_count || '',
      annual_revenue: company?.annual_revenue || '',
      website: company?.website || '',
      gst_number: company?.gst_number || '',
      pan_number: company?.pan_number || '',
      registration_number: company?.registration_number || '',
      contact_person_name: company?.contact_person_name || '',
      contact_person_title: company?.contact_person_title || '',
      contact_person_email: company?.contact_person_email || '',
      contact_person_phone: company?.contact_person_phone || '',
      description: company?.description || '',
      domain_name: company?.domain_name || '',
    })
    setIsEditing(true)
  }

  const handleSave = () => {
    updateMutation.mutate(formData)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setFormData({})
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to load company details
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please try refreshing the page
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600">
                {company?.logo ? (
                  <img
                    src={company.logo}
                    alt={`${company.name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Company Details
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  View and manage your company information
                </p>
              </div>
            </div>
            
            {!isEditing ? (
              <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            ) : (
              <div className="flex space-x-3">
                <Button 
                  onClick={handleSave} 
                  disabled={updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleCancel} 
                  variant="outline"
                  disabled={updateMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Company Status */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            {company?.approval_status === 'approved' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-700 dark:text-green-400 font-medium">
                  Company Approved & Active
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-700 dark:text-yellow-400 font-medium">
                  Status: {company?.approval_status || 'Pending'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {company?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Company name cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white">
                  {company?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Primary email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter company address"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.address || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                {isEditing ? (
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="https://example.com"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.website ? (
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Business Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Type
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.business_type}
                    onChange={(e) => handleInputChange('business_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Private Limited, Partnership"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.business_type || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Industry
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Technology, Manufacturing"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.industry || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee Count
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    value={formData.employee_count}
                    onChange={(e) => handleInputChange('employee_count', parseInt(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Number of employees"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.employee_count || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Annual Revenue
                </label>
                {isEditing ? (
                  <input
                    type="number"
                    step="0.01"
                    value={formData.annual_revenue}
                    onChange={(e) => handleInputChange('annual_revenue', parseFloat(e.target.value) || '')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Annual revenue in INR"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.annual_revenue ? `₹${company.annual_revenue.toLocaleString()}` : 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief description of your company"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.description || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Legal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  GST Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.gst_number}
                    onChange={(e) => handleInputChange('gst_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="GST Registration Number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.gst_number || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PAN Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.pan_number}
                    onChange={(e) => handleInputChange('pan_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="PAN Card Number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.pan_number || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Registration Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={(e) => handleInputChange('registration_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Company Registration Number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.registration_number || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Domain Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.domain_name}
                    onChange={(e) => handleInputChange('domain_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="company.com"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.domain_name || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Contact Person</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contact_person_name}
                    onChange={(e) => handleInputChange('contact_person_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Contact person name"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.contact_person_name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title/Position
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.contact_person_title}
                    onChange={(e) => handleInputChange('contact_person_title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., CEO, Manager"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.contact_person_title || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.contact_person_email}
                    onChange={(e) => handleInputChange('contact_person_email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="contact@company.com"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.contact_person_email || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.contact_person_phone}
                    onChange={(e) => handleInputChange('contact_person_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Contact person phone"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {company?.contact_person_phone || 'Not provided'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Timeline */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Company Timeline</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Company Created
                </label>
                <p className="text-gray-900 dark:text-white">
                  {company?.created_at ? new Date(company.created_at).toLocaleDateString() : 'Not available'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-white">
                  {company?.updated_at ? new Date(company.updated_at).toLocaleDateString() : 'Not available'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CompanyDetailsPage