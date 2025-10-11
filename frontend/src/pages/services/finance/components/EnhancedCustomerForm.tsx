import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { Label } from '../../../../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/Select'
import { Checkbox } from '../../../../components/ui/Checkbox'
import { Alert, AlertDescription } from '../../../../components/ui/Alert'
import { Badge } from '../../../../components/ui/Badge'
import { governmentApiService } from '../../../../services/governmentApi'
import { CheckCircle, XCircle, Loader2, Shield } from 'lucide-react'

interface Customer {
  id?: number
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
  gstin: string
  pan: string
  is_gst_registered: boolean
  state_code: string
  gst_registration_date: string
}

interface EnhancedCustomerFormProps {
  customer?: Customer
  onSubmit: (customer: Customer) => void
  onCancel: () => void
}

const INDIAN_STATES = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman and Diu' },
  { code: '26', name: 'Dadra and Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman and Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh (New)' }
]

export const EnhancedCustomerForm: React.FC<EnhancedCustomerFormProps> = ({
  customer,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    pan: '',
    is_gst_registered: false,
    state_code: '',
    gst_registration_date: '',
    ...customer
  })

  const [validationStatus, setValidationStatus] = useState<{
    gstin?: { valid: boolean; message: string; details?: any }
    pan?: { valid: boolean; message: string; details?: any }
  }>({})

  const [loading, setLoading] = useState(false)

  // Real-time GSTIN validation
  useEffect(() => {
    if (formData.gstin && formData.gstin.length === 15) {
      governmentApiService.validateGSTINRealTime(formData.gstin, (result) => {
        setValidationStatus(prev => ({
          ...prev,
          gstin: {
            valid: result.valid,
            message: result.valid 
              ? `Valid GSTIN - ${result.business_name}` 
              : result.error || 'Invalid GSTIN',
            details: result
          }
        }))

        // Auto-fill details if validation successful
        if (result.valid) {
          setFormData(prev => ({
            ...prev,
            name: result.business_name || prev.name,
            state_code: result.state_code || prev.state_code,
            gst_registration_date: result.registration_date || prev.gst_registration_date
          }))
        }
      })
    } else if (formData.gstin.length > 0 && formData.gstin.length < 15) {
      setValidationStatus(prev => ({
        ...prev,
        gstin: { valid: false, message: 'GSTIN must be 15 characters' }
      }))
    } else {
      setValidationStatus(prev => ({ ...prev, gstin: undefined }))
    }
  }, [formData.gstin])

  // Real-time PAN validation
  useEffect(() => {
    if (formData.pan && formData.pan.length === 10) {
      governmentApiService.validatePANRealTime(formData.pan, (result) => {
        setValidationStatus(prev => ({
          ...prev,
          pan: {
            valid: result.valid,
            message: result.valid 
              ? `Valid PAN - ${result.name}` 
              : result.error || 'Invalid PAN',
            details: result
          }
        }))
      })
    } else if (formData.pan.length > 0 && formData.pan.length < 10) {
      setValidationStatus(prev => ({
        ...prev,
        pan: { valid: false, message: 'PAN must be 10 characters' }
      }))
    } else {
      setValidationStatus(prev => ({ ...prev, pan: undefined }))
    }
  }, [formData.pan])

  const handleInputChange = (field: keyof Customer, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.email) {
        throw new Error('Name and email are required')
      }

      // Validate GSTIN if GST registered
      if (formData.is_gst_registered && (!formData.gstin || !validationStatus.gstin?.valid)) {
        throw new Error('Valid GSTIN is required for GST registered customers')
      }

      onSubmit(formData)
    } catch (error: any) {
      console.error('Form submission error:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getValidationIcon = (status?: { valid: boolean }) => {
    if (!status) return null
    return status.valid ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {customer ? 'Edit Customer' : 'Add New Customer'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pan">PAN</Label>
              <div className="relative">
                <Input
                  id="pan"
                  value={formData.pan}
                  onChange={(e) => handleInputChange('pan', e.target.value.toUpperCase())}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                />
                <div className="absolute right-2 top-2">
                  {getValidationIcon(validationStatus.pan)}
                </div>
              </div>
              {validationStatus.pan && (
                <Alert>
                  <AlertDescription className={validationStatus.pan.valid ? 'text-green-600' : 'text-red-600'}>
                    {validationStatus.pan.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={formData.state_code} onValueChange={(value) => {
                const selectedState = INDIAN_STATES.find(s => s.code === value)
                handleInputChange('state_code', value)
                handleInputChange('state', selectedState?.name || '')
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map(state => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.code} - {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => handleInputChange('pincode', e.target.value)}
                maxLength={6}
              />
            </div>
          </div>

          {/* GST Information */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_gst_registered"
                checked={formData.is_gst_registered}
                onCheckedChange={(checked) => handleInputChange('is_gst_registered', checked as boolean)}
              />
              <Label htmlFor="is_gst_registered">GST Registered Customer</Label>
            </div>

            {formData.is_gst_registered && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstin">GSTIN *</Label>
                  <div className="relative">
                    <Input
                      id="gstin"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                      maxLength={15}
                      placeholder="22AAAAA0000A1Z5"
                      required={formData.is_gst_registered}
                    />
                    <div className="absolute right-2 top-2">
                      {getValidationIcon(validationStatus.gstin)}
                    </div>
                  </div>
                  {validationStatus.gstin && (
                    <Alert>
                      <AlertDescription className={validationStatus.gstin.valid ? 'text-green-600' : 'text-red-600'}>
                        {validationStatus.gstin.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gst_registration_date">GST Registration Date</Label>
                  <Input
                    id="gst_registration_date"
                    type="date"
                    value={formData.gst_registration_date}
                    onChange={(e) => handleInputChange('gst_registration_date', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation Summary */}
          {(validationStatus.gstin?.valid || validationStatus.pan?.valid) && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Government Validation Status:</p>
                  {validationStatus.gstin?.valid && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default">GSTIN Verified</Badge>
                      <span className="text-sm">{validationStatus.gstin.details?.business_name}</span>
                    </div>
                  )}
                  {validationStatus.pan?.valid && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default">PAN Verified</Badge>
                      <span className="text-sm">{validationStatus.pan.details?.name}</span>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {customer ? 'Update Customer' : 'Add Customer'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}