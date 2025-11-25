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

interface POTemplateSettings {
  selected_po_template: string;
}

const POTemplateSettings: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [currentSettings, setCurrentSettings] = useState<POTemplateSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplateInfo();
    fetchCurrentSettings();
  }, []);

  const fetchTemplateInfo = async () => {
    try {
      const response = await apiClient.getQuotationTemplateInfo();
      if (response.data.success && response.data.data?.po_templates) {
        setTemplates(response.data.data.po_templates);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching template info:', error);
      setTemplates([
        {
          code: 'AS',
          name: 'AS Template - Clean & Simple',
          description: 'Clean and simple layout with right-aligned company info and professional styling',
          features: ['Right-aligned company info', 'Large PO title', 'Simple table design', 'Professional footer'],
          best_for: 'Companies preferring minimalist, clean design'
        },
        {
          code: 'BKGE', 
          name: 'BKGE Template - Professional',
          description: 'Modern professional template with centered header and structured table design',
          features: ['Centered PO header', 'Color-coded table headers', 'Structured vendor info', 'Professional totals section'],
          best_for: 'Businesses requiring modern, structured presentation'
        },
        {
          code: 'TC',
          name: 'TC Template - Detailed Terms', 
          description: 'Detailed template with comprehensive terms and conditions section',
          features: ['Comprehensive company branding', 'Detailed information grid', 'Extensive terms and conditions', 'Professional signature box'],
          best_for: 'Contractors and service providers with detailed terms'
        }
      ]);
    }
  };

  const fetchCurrentSettings = async () => {
    try {
      const response = await apiClient.getPOTemplateSettings();
      if (response.data.success && response.data.data) {
        setCurrentSettings(response.data.data);
      } else {
        setCurrentSettings({ selected_po_template: 'AS' });
      }
    } catch (error) {
      console.error('Error fetching PO template settings:', error);
      setCurrentSettings({ selected_po_template: 'AS' });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (templateName: string) => {
    try {
      const response = await apiClient.updatePOTemplateSettings({
        selected_po_template: templateName
      });
      
      if (response.data.success && response.data.data) {
        setCurrentSettings(response.data.data);
        const templateInfo = templates.find(t => t.code === templateName);
        toast.success(`PO template updated to ${templateInfo?.name || templateName}! All new purchase orders will use this template.`);
      } else {
        throw new Error(response.data.message || 'Failed to update PO template');
      }
    } catch (error: any) {
      console.error('Error updating PO template:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error updating PO template';
      toast.error(errorMessage);
    }
  };

  const showPreview = async (templateName: string) => {
    try {
      const response = await apiClient.previewPOTemplate(templateName);
      
      const htmlContent = response.data;
      const newWindow = window.open('', '_blank', 'width=800,height=600');
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
      }
    } catch (error: any) {
      console.error('Error loading PO template preview:', error);
      const errorMessage = error.response?.data?.message || 'Error loading PO template preview';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Purchase Order Templates
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
          Purchase Order PDF Templates
        </CardTitle>
        <p className="text-sm text-gray-600">
          Choose the template style for your purchase order PDFs
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {templates && templates.length > 0 ? templates.map((template) => (
            <div
              key={template.code}
              className={`border rounded-lg p-4 transition-all ${
                currentSettings?.selected_po_template === template.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{template.name}</h3>
                {currentSettings?.selected_po_template === template.code && (
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
                
                {currentSettings?.selected_po_template !== template.code && (
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
              <p className="text-gray-500">No PO templates available</p>
            </div>
          )}
        </div>
        
        {currentSettings && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm">
              <strong>Current PO Template:</strong> {
                templates.find(t => t.code === currentSettings.selected_po_template)?.name || 
                currentSettings.selected_po_template
              }
            </p>
            <p className="text-xs text-gray-600 mt-1">
              All new purchase orders will use this template for PDF generation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default POTemplateSettings;