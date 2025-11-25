from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from authentication.models import Company
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import CompanyQuotationTemplateSettingsSerializer
from finance.models import Invoice
from finance.invoice_pdf_service import invoice_pdf_service

class InvoiceTemplateSettingsView(APIView):
    """Manage invoice template settings for companies"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current invoice template settings"""
        try:
            if not hasattr(request.user, 'company_user'):
                return Response({
                    'success': False,
                    'error': 'User is not associated with any company',
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            company = request.user.company_user.company
            settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
                company=company,
                defaults={
                    'selected_template': 'AS', 
                    'selected_po_template': 'AS', 
                    'selected_proforma_template': 'AS',
                    'selected_invoice_template': 'AS'
                }
            )
            
            return Response({
                'success': True,
                'data': {
                    'selected_invoice_template': settings.selected_invoice_template,
                    'template_choices': [
                        {'value': choice[0], 'label': choice[1]}
                        for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES
                    ]
                },
                'message': 'Invoice template settings retrieved successfully'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to retrieve invoice template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update invoice template settings"""
        try:
            if not hasattr(request.user, 'company_user'):
                return Response({
                    'success': False,
                    'error': 'User is not associated with any company',
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            company = request.user.company_user.company
            settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
                company=company,
                defaults={
                    'selected_template': 'AS', 
                    'selected_po_template': 'AS', 
                    'selected_proforma_template': 'AS',
                    'selected_invoice_template': 'AS'
                }
            )
            
            selected_invoice_template = request.data.get('selected_invoice_template')
            if selected_invoice_template:
                valid_templates = [choice[0] for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES]
                if selected_invoice_template not in valid_templates:
                    return Response({
                        'success': False,
                        'error': 'Invalid template selection',
                        'message': f'Template must be one of: {", ".join(valid_templates)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                settings.selected_invoice_template = selected_invoice_template
                settings.save()
                
                return Response({
                    'success': True,
                    'data': {
                        'selected_invoice_template': settings.selected_invoice_template,
                        'template_display': dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_invoice_template]
                    },
                    'message': f'Invoice template updated to {dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_invoice_template]}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Missing template selection',
                    'message': 'Please provide selected_invoice_template'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to update invoice template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class InvoiceTemplatePreviewView(APIView):
    """Generate preview for invoice templates"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, template_name):
        """Get HTML preview of invoice template"""
        try:
            if template_name not in ['AS', 'BKGE', 'TC']:
                return Response({
                    'success': False,
                    'error': 'Invalid template name',
                    'message': 'Template must be AS, BKGE, or TC'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not hasattr(request.user, 'company_user'):
                return Response({
                    'success': False,
                    'error': 'User is not associated with any company',
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            company = request.user.company_user.company
            
            # Get sample invoice for preview
            sample_invoice = self._get_sample_invoice(company, template_name)
            if not sample_invoice:
                return Response({
                    'success': False,
                    'error': 'Could not create sample invoice',
                    'message': 'Preview unavailable'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Generate HTML preview
            html_content = invoice_pdf_service.generate_invoice_html(sample_invoice, template_name)
            
            # Return HTML response
            return HttpResponse(html_content, content_type='text/html')
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate invoice template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sample_invoice(self, company, template_name):
        """Get or create sample invoice for preview"""
        from finance.models import Customer, Product, InvoiceItem
        from decimal import Decimal
        from datetime import date, timedelta
        
        # Try to get an existing invoice
        existing_invoice = Invoice.objects.filter(company=company).first()
        if existing_invoice:
            return existing_invoice
        
        # Create mock data for preview
        try:
            # Create or get sample customer
            customer, created = Customer.objects.get_or_create(
                company=company,
                name="Sample Customer Pvt Ltd",
                defaults={
                    'customer_code': 'CUST001',
                    'email': 'customer@example.com',
                    'phone': '9876543210',
                    'billing_address_line1': '123 Business Street',
                    'billing_city': 'Mumbai',
                    'billing_state': 'Maharashtra',
                    'billing_pincode': '400001',
                    'gstin': '27ABCDE1234F1Z5',
                    'customer_type': 'business'
                }
            )
            
            # Create sample invoice
            invoice = Invoice.objects.create(
                company=company,
                customer=customer,
                invoice_number=f'INV-{template_name}-PREVIEW-001',
                invoice_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                subtotal=Decimal('25000.00'),
                total_tax=Decimal('4500.00'),
                total_amount=Decimal('29500.00'),
                notes='This is a sample invoice for template preview.'
            )
            
            return invoice
            
        except Exception as e:
            print(f"Error creating sample invoice: {str(e)}")
            return Invoice.objects.filter(company=company).first()