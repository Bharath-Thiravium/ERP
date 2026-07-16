import React, { useState } from 'react'
import { Save, RotateCcw, AlertTriangle } from 'lucide-react'
import PTWOCRUpload from './PTWOCRUpload'
import apiClient from '../../../../lib/api'
import toast from 'react-hot-toast'

interface PTWFormData {
  permit_number: string
  permit_type: string
  status: string
  project_name: string
  work_location: string
  company_name: string
  contractor_name: string
  work_description: string
  risk_assessment_details: string
  ppe_requirements: string
  safety_precautions: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  supervisor_name: string
  issuer_name: string
  authorized_signatures: string
}

const EMPTY_FORM: PTWFormData = {
  permit_number: '',
  permit_type: 'general',
  status: 'draft',
  project_name: '',
  work_location: '',
  company_name: '',
  contractor_name: '',
  work_description: '',
  risk_assessment_details: '',
  ppe_requirements: '',
  safety_precautions: '',
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  supervisor_name: '',
  issuer_name: '',
  authorized_signatures: '',
}

const PERMIT_TYPES = [
  { value: 'hot_work', label: 'Hot Work' },
  { value: 'cold_work', label: 'Cold Work' },
  { value: 'confined_space', label: 'Confined Space Entry' },
  { value: 'electrical', label: 'Electrical Work' },
  { value: 'height', label: 'Work at Height' },
  { value: 'excavation', label: 'Excavation' },
  { value: 'chemical', label: 'Chemical Handling' },
  { value: 'general', label: 'General Work' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

interface FieldProps {
  label: string
  name: keyof PTWFormData
  value: string
  onChange: (name: keyof PTWFormData, value: string) => void
  type?: string
  isLowConfidence?: boolean
  required?: boolean
  as?: 'input' | 'textarea' | 'select'
  options?: { value: string; label: string }[]
  rows?: number
}

const FormField: React.FC<FieldProps> = ({
  label, name, value, onChange, type = 'text',
  isLowConfidence, required, as = 'input', options, rows = 3
}) => {
  const baseClass = `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
    dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 transition-colors
    ${isLowConfidence
      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      : 'border-gray-300 dark:border-gray-600'}`

  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
        {isLowConfidence && (
          <span className="ml-2 inline-flex items-center gap-1 text-yellow-600 text-xs">
            <AlertTriangle className="w-3 h-3" /> Verify
          </span>
        )}
      </label>
      {as === 'textarea' ? (
        <textarea
          className={baseClass}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          rows={rows}
        />
      ) : as === 'select' ? (
        <select
          className={baseClass}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
        >
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={baseClass}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          required={required}
        />
      )}
    </div>
  )
}

interface Props {
  onSaved?: () => void
}

const PTWForm: React.FC<Props> = ({ onSaved }) => {
  const [formData, setFormData] = useState<PTWFormData>(EMPTY_FORM)
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const handleChange = (name: keyof PTWFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleOCRExtracted = (result: {
    fields: Record<string, string>
    low_confidence_fields: string[]
  }) => {
    // Merge extracted fields into form — only overwrite if value is non-empty
    setFormData((prev) => {
      const updated = { ...prev }
      for (const [key, val] of Object.entries(result.fields)) {
        if (val && key in updated) {
          (updated as any)[key] = val
        }
      }
      return updated
    })
    setLowConfidenceFields(result.low_confidence_fields)
    toast.success('Form auto-populated from document. Please review highlighted fields.')
  }

  const handleReset = () => {
    setFormData(EMPTY_FORM)
    setLowConfidenceFields([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await apiClient.post('/api/ptw/permits/', formData)
      toast.success('Permit To Work saved successfully.')
      onSaved?.()
      handleReset()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save permit.')
    } finally {
      setSaving(false)
    }
  }

  const isLow = (field: string) => lowConfidenceFields.includes(field)

  return (
    <div className="max-w-4xl mx-auto">
      {/* OCR Upload */}
      <PTWOCRUpload onExtracted={handleOCRExtracted} />

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-6">
          Permit To Work Details
        </h2>

        {/* Section: Identification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FormField label="Permit Number" name="permit_number" value={formData.permit_number}
            onChange={handleChange} isLowConfidence={isLow('permit_number')} />
          <FormField label="Permit Type" name="permit_type" value={formData.permit_type}
            onChange={handleChange} as="select" options={PERMIT_TYPES} isLowConfidence={isLow('permit_type')} />
          <FormField label="Status" name="status" value={formData.status}
            onChange={handleChange} as="select" options={STATUS_OPTIONS} />
        </div>

        {/* Section: Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField label="Project Name" name="project_name" value={formData.project_name}
            onChange={handleChange} isLowConfidence={isLow('project_name')} />
          <FormField label="Work Location" name="work_location" value={formData.work_location}
            onChange={handleChange} isLowConfidence={isLow('work_location')} />
          <FormField label="Company Name" name="company_name" value={formData.company_name}
            onChange={handleChange} isLowConfidence={isLow('company_name')} />
          <FormField label="Contractor Name" name="contractor_name" value={formData.contractor_name}
            onChange={handleChange} isLowConfidence={isLow('contractor_name')} />
        </div>

        {/* Section: Validity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <FormField label="Start Date" name="start_date" value={formData.start_date}
            onChange={handleChange} type="date" isLowConfidence={isLow('start_date')} />
          <FormField label="End Date" name="end_date" value={formData.end_date}
            onChange={handleChange} type="date" isLowConfidence={isLow('end_date')} />
          <FormField label="Start Time" name="start_time" value={formData.start_time}
            onChange={handleChange} type="time" isLowConfidence={isLow('start_time')} />
          <FormField label="End Time" name="end_time" value={formData.end_time}
            onChange={handleChange} type="time" isLowConfidence={isLow('end_time')} />
        </div>

        {/* Section: Personnel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <FormField label="Supervisor Name" name="supervisor_name" value={formData.supervisor_name}
            onChange={handleChange} isLowConfidence={isLow('supervisor_name')} />
          <FormField label="Issuer Name" name="issuer_name" value={formData.issuer_name}
            onChange={handleChange} isLowConfidence={isLow('issuer_name')} />
        </div>

        {/* Section: Work Details */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          <FormField label="Work Description" name="work_description" value={formData.work_description}
            onChange={handleChange} as="textarea" rows={3} isLowConfidence={isLow('work_description')} />
          <FormField label="Risk Assessment Details" name="risk_assessment_details"
            value={formData.risk_assessment_details} onChange={handleChange}
            as="textarea" rows={3} isLowConfidence={isLow('risk_assessment_details')} />
          <FormField label="PPE Requirements" name="ppe_requirements" value={formData.ppe_requirements}
            onChange={handleChange} as="textarea" rows={2} isLowConfidence={isLow('ppe_requirements')} />
          <FormField label="Safety Precautions" name="safety_precautions" value={formData.safety_precautions}
            onChange={handleChange} as="textarea" rows={3} isLowConfidence={isLow('safety_precautions')} />
          <FormField label="Authorized Signatures" name="authorized_signatures"
            value={formData.authorized_signatures} onChange={handleChange}
            as="textarea" rows={2} isLowConfidence={isLow('authorized_signatures')} />
        </div>

        {/* Low confidence notice */}
        {lowConfidenceFields.length > 0 && (
          <div className="mb-4 flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Fields highlighted in yellow were extracted with low OCR confidence. Please verify them before submitting.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Permit'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default PTWForm
