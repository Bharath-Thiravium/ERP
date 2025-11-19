import React from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'

interface EmailTemplatePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  template: any
}

export const EmailTemplatePreviewModal: React.FC<EmailTemplatePreviewModalProps> = ({ 
  isOpen, 
  onClose, 
  template 
}) => {
  if (!isOpen || !template) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Template Preview: {template.name}
            </h2>
            <p className="text-sm text-gray-600">
              {template.template_type_display} • Subject: {template.subject}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">HTML Preview</h3>
            <div 
              className="bg-white border rounded-lg p-4 min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: template.html_content }}
            />
          </div>

          {template.text_content && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Plain Text Version</h3>
              <div className="bg-white border rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
                {template.text_content}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}