from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from authentication.models import Company
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import CompanyQuotationTemplateSettingsSerializer
from finance.models import ProformaInvoice
from finance.proforma_pdf_service import proforma_pdf_service

class ProformaTemplateSettingsView(APIView):
    """Manage proforma template settings for companies"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current proforma template settings"""
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
                defaults={'selected_template': 'AS', 'selected_po_template': 'AS', 'selected_proforma_template': 'AS'}
            )
            
            return Response({
                'success': True,
                'data': {
                    'selected_proforma_template': settings.selected_proforma_template,
                    'template_choices': [
                        {'value': choice[0], 'label': choice[1]}
                        for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES
                    ]
                },
                'message': 'Proforma template settings retrieved successfully'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to retrieve proforma template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update proforma template settings"""
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
                defaults={'selected_template': 'AS', 'selected_po_template': 'AS', 'selected_proforma_template': 'AS'}
            )
            
            selected_proforma_template = request.data.get('selected_proforma_template')
            if selected_proforma_template:
                valid_templates = [choice[0] for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES]
                if selected_proforma_template not in valid_templates:
                    return Response({
                        'success': False,
                        'error': 'Invalid template selection',
                        'message': f'Template must be one of: {", ".join(valid_templates)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                settings.selected_proforma_template = selected_proforma_template
                settings.save()
                
                return Response({
                    'success': True,
                    'data': {
                        'selected_proforma_template': settings.selected_proforma_template,
                        'template_display': dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_proforma_template]
                    },
                    'message': f'Proforma template updated to {dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_proforma_template]}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Missing template selection',
                    'message': 'Please provide selected_proforma_template'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to update proforma template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ProformaTemplatePreviewView(APIView):
    """Generate preview for proforma templates"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, template_name):
        """Get HTML preview of proforma template"""
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
            
            # Get sample proforma for preview
            sample_proforma = self._get_sample_proforma(company, template_name)
            if not sample_proforma:
                return Response({
                    'success': False,
                    'error': 'Could not create sample proforma',
                    'message': 'Preview unavailable'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Generate HTML preview
            html_content = proforma_pdf_service.preview_proforma_template(sample_proforma, template_name)
            
            # Return HTML response
            return HttpResponse(html_content, content_type='text/html')
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate proforma template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sample_proforma(self, company, template_name):
        """Get or create sample proforma for preview"""
        from finance.models import Customer, Product, ProformaInvoiceItem
        from decimal import Decimal
        from datetime import date, timedelta
        
        # Try to get an existing proforma
        existing_proforma = ProformaInvoice.objects.filter(company=company).first()
        if existing_proforma:
            return existing_proforma
        
        # Create mock data for preview
        try:
            # Create or get sample customer
            customer, created = Customer.objects.get_or_create(
                company=company,
                name="Sample Customer Pvt Ltd",
                defaults={
                    'customer_code': 'CUST001',
                    'customer_type': 'business',
                    'display_name': 'Sample Customer Pvt Ltd',
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
            
            # Create sample proforma
            proforma = ProformaInvoice.objects.create(
                company=company,
                customer=customer,
                proforma_number=f'PI-{template_name}-PREVIEW-001',
                proforma_date=date.today(),
                due_date=date.today() + timedelta(days=30),
                subtotal=Decimal('25000.00'),
                total_tax=Decimal('0.00'),
                total_amount=Decimal('25000.00'),
                notes='This is a sample proforma invoice for template preview.'
            )
            
            # Create sample proforma items
            ProformaInvoiceItem.objects.create(
                proforma_invoice=proforma,
                product=Product.objects.filter(company=company).first() or Product.objects.create(
                    company=company,
                    product_code='SAMPLE001',
                    name='Sample Product 1',
                    description='Professional consulting services',
                    product_type='service',
                    selling_price=Decimal('1500.00'),
                    gst_rate=Decimal('18.00')
                ),
                line_number=1,
                product_name='Sample Product 1',
                description='Professional consulting services',
                quantity=Decimal('10.00'),
                unit='Hours',
                unit_price=Decimal('1500.00'),
                line_total=Decimal('15000.00'),
                hsn_sac_code='998314',
                gst_rate=Decimal('18.00')
            )
            
            ProformaInvoiceItem.objects.create(
                proforma_invoice=proforma,
                product=Product.objects.filter(company=company).first() or Product.objects.create(
                    company=company,
                    product_code='SAMPLE002',
                    name='Sample Product 2',
                    description='Software development services',
                    product_type='service',
                    selling_price=Decimal('2000.00'),
                    gst_rate=Decimal('18.00')
                ),
                line_number=2,
                product_name='Sample Product 2',
                description='Software development services',
                quantity=Decimal('5.00'),
                unit='Days',
                unit_price=Decimal('2000.00'),
                line_total=Decimal('10000.00'),
                hsn_sac_code='998313',
                gst_rate=Decimal('18.00')
            )
            
            return proforma
            
        except Exception as e:
            print(f"Error creating sample proforma: {str(e)}")
            return ProformaInvoice.objects.filter(company=company).first()

