/**
 * Template Management Component
 */
import React, { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { Card } from '../../../../components/ui/Card'
import { Badge } from '../../../../components/ui/Badge'
import { 
  FileText, 
  Edit, 
  Trash2, 
  Plus,
  Eye,
  Copy,
  Settings
} from 'lucide-react'

interface Template {
  id: string
  name: string
  template_type: string
  is_default: boolean
  is_active: boolean
  created_at: string
}

interface TemplateManagerProps {
  className?: string
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ className = '' }) => {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)

  // Mock data for demonstration
  useEffect(() => {
    setTemplates([
      {
        id: '1',
        name: 'Standard Invoice Template',
        template_type: 'invoice',
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'Professional Quotation Template',
        template_type: 'quotation',
        is_default: true,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'TDS Certificate Template',
        template_type: 'tds_certificate',
        is_default: false,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ])
  }, [])

  const getTemplateTypeColor = (type: string) => {
    const colors = {
      invoice: 'blue',
      quotation: 'green',
      tds_certificate: 'purple',
      payment_receipt: 'orange'
    }
    return colors[type as keyof typeof colors] || 'gray'
  }

  const getTemplateTypeLabel = (type: string) => {
    const labels = {
      invoice: 'Invoice',
      quotation: 'Quotation',
      tds_certificate: 'TDS Certificate',
      payment_receipt: 'Payment Receipt'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Document Templates</h3>
          <p className="text-gray-600">Manage document templates for invoices, quotations, and certificates</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <Badge color={getTemplateTypeColor(template.template_type)}>
                  {getTemplateTypeLabel(template.template_type)}
                </Badge>
              </div>
              {template.is_default && (
                <Badge color="green" variant="outline">Default</Badge>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-500">
                Created {new Date(template.created_at).toLocaleDateString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Edit className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Copy className="w-4 h-4" />
              </Button>
              {!template.is_default && (
                <Button size="sm" variant="outline">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="payment_receipt">Payment Receipt</option>
              <option value="tds_certificate">TDS Certificate</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button>
              Create Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}