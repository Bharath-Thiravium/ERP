import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Eye, Check, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../../lib/api';

interface TemplateInfo {
  code: string;
  name: string;
  description: string;
  features: string[];
  best_for?: string;
}

interface TemplateSettings {
  selected_template: string;
  selected_po_template: string;
  selected_proforma_template: string;
  selected_invoice_template: string;
}

const QuotationTemplateSettings: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [currentSettings, setCurrentSettings] = useState<TemplateSettings | null>(null);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fetchTemplateInfo();
    fetchCurrentSettings();
  }, []);

  const fetchTemplateInfo = async () => {
    try {
      const response = await apiClient.getQuotationTemplateInfo();
      if (response.data.success && response.data.data?.quotation_templates) {
        setTemplates(response.data.data.quotation_templates);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching template info:', error);
      // Set default templates if API fails - NOW WITH REFACTORED DESCRIPTIONS
      setTemplates([
        {
          code: 'AS',
          name: 'Clean & Simple Template',
          description: 'Clean 3-column header with logo panel, essential fields, single signature. Best for everyday use.',
          features: ['Logo panel', 'Bill To / Ship To', 'GST breakdown', 'Single signature', 'Professional borders'],
          best_for: 'Small and medium businesses'
        },
        {
          code: 'BKGE', 
          name: 'Professional Template',
          description: 'Teal-accented header, compliance fields (Place of Supply, Reverse Charge), Amount in Words, Payment Terms table, 2 signatures. Best for growing businesses and client-facing documents.',
          features: ['Teal gradient header', 'Compliance fields', 'Place of Supply', 'Reverse Charge', 'Amount in Words', 'Payment Terms table', '2 signatures'],
          best_for: 'Growing businesses and client-facing documents'
        },
        {
          code: 'TC',
          name: 'Detailed Terms Template', 
          description: 'Premium gold/charcoal header, per-line GST columns, HSN/SAC-wise tax summary, bank details, declaration, 3 signatures.',
          features: ['Premium header', 'Per-line GST columns', 'HSN/SAC organization', 'Bank details', 'Declaration section', '3 signatures'],
          best_for: 'Premium and enterprise customers'
        }
      ]);
    }
  };

  const fetchCurrentSettings = async () => {
    try {
      const response = await apiClient.getQuotationTemplateSettings();
      if (response.data.success && response.data.data) {
        setCurrentSettings(response.data.data);
      } else {
        // Set default settings if none exist
        setCurrentSettings({ selected_template: 'AS' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Set default settings on error
      setCurrentSettings({ selected_template: 'AS' });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateName: string) => {
    try {
      const response = await apiClient.updateQuotationTemplateSettings({
        selected_template: templateName
      });
      
      if (response.data.success && response.data.data) {
        setCurrentSettings(response.data.data);
        const templateInfo = templates.find(t => t.code === templateName);
        toast.success(`Template updated to ${templateInfo?.name || templateName}! All new quotations will use this template.`);
      } else {
        throw new Error(response.data.message || 'Failed to update template');
      }
    } catch (error: any) {
      console.error('Error updating template:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error updating template';
      toast.error(errorMessage);
    }
  };

  const showPreview = async (templateName: string) => {
    try {
      const response = await apiClient.previewQuotationTemplate(templateName);
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (!newWindow) window.location.href = url;
    } catch (error: any) {
      toast.error('Error loading preview. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Quotation Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Quotation PDF Templates
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose the template style for your quotation PDFs
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {templates && templates.length > 0 ? templates.map((template) => (
            <div
              key={template.code}
              className={`border rounded-lg p-4 transition-all ${
                currentSettings?.selected_template === template.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{template.name}</h3>
                {currentSettings?.selected_template === template.code && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {template.description}
              </p>
              
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Features:</p>
                <div className="flex flex-wrap gap-1">
                  {template.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {template.best_for && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-1">Best for:</p>
                  <p className="text-xs text-gray-600">{template.best_for}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showPreview(template.code)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                
                {currentSettings?.selected_template !== template.code && (
                  <Button
                    size="sm"
                    onClick={() => updateTemplate(template.code)}
                    className="flex-1"
                  >
                    Select
                  </Button>
                )}
              </div>
            </div>
          )) : (
            <div className="col-span-3 text-center py-8">
              <p className="text-gray-500">No templates available</p>
            </div>
          )}
        </div>
        
        {currentSettings && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <strong>Current Template:</strong> {
                templates.find(t => t.code === currentSettings.selected_template)?.name || 
                currentSettings.selected_template
              }
            </p>
            <p className="text-xs text-gray-600 mt-1">
              All new quotations will use this template for PDF generation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuotationTemplateSettings;
