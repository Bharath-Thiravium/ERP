import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'
import { Modal } from '../../../../components/ui/Modal'

interface ReportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  report?: any
}

export const ReportTemplateModal: React.FC<ReportTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  report 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    report_type: 'sales_performance',
    chart_type: 'bar',
    description: '',
    data_source: 'deals',
    is_active: true
  })

  const reportTypes = [
    { value: 'sales_performance', label: 'Sales Performance' },
    { value: 'lead_analysis', label: 'Lead Analysis' },
    { value: 'pipeline_forecast', label: 'Pipeline Forecast' },
    { value: 'customer_health', label: 'Customer Health' },
    { value: 'marketing_roi', label: 'Marketing ROI' },
    { value: 'activity_summary', label: 'Activity Summary' },
    { value: 'custom', label: 'Custom Report' }
  ]

  const chartTypes = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'table', label: 'Table' },
    { value: 'metric', label: 'Metric Card' },
    { value: 'funnel', label: 'Funnel Chart' }
  ]

  React.useEffect(() => {
    if (report) {
      setFormData({
        name: report.name || '',
        report_type: report.report_type || 'sales_performance',
        chart_type: report.chart_type || 'bar',
        description: report.description || '',
        data_source: report.data_source || 'deals',
        is_active: report.is_active !== undefined ? report.is_active : true
      })
    } else {
      setFormData({
        name: '',
        report_type: 'sales_performance',
        chart_type: 'bar',
        description: '',
        data_source: 'deals',
        is_active: true
      })
    }
  }, [report, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      if (report) {
        await crmApi.updateReportTemplate(sessionKey, report.id, formData)
        toast.success('Report template updated successfully!')
      } else {
        await crmApi.createReportTemplate(sessionKey, formData)
        toast.success('Report template created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save report template')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      className="max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
      bodyClassName="p-0"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {report ? 'Edit Report Template' : 'Create New Report Template'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Report Type
              </label>
              <select
                value={formData.report_type}
                onChange={(e) => setFormData(prev => ({ ...prev, report_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {reportTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Chart Type
              </label>
              <select
                value={formData.chart_type}
                onChange={(e) => setFormData(prev => ({ ...prev, chart_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {chartTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Source
              </label>
              <input
                type="text"
                value={formData.data_source}
                onChange={(e) => setFormData(prev => ({ ...prev, data_source: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g., deals, leads, accounts"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe what this report shows and its purpose..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Active Report Template
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {loading ? 'Saving...' : (report ? 'Update Report' : 'Create Report')}
            </Button>
          </div>
      </form>
    </Modal>
  )
}
