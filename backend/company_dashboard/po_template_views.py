from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from authentication.models import Company
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import CompanyQuotationTemplateSettingsSerializer
from finance.models import PurchaseOrder
from finance.po_pdf_service import po_pdf_service

class POTemplateSettingsView(APIView):
    """Manage PO template settings for companies"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current PO template settings"""
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
                defaults={'selected_template': 'AS', 'selected_po_template': 'AS'}
            )
            
            return Response({
                'success': True,
                'data': {
                    'selected_po_template': settings.selected_po_template,
                    'template_choices': [
                        {'value': choice[0], 'label': choice[1]}
                        for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES
                    ]
                },
                'message': 'PO template settings retrieved successfully'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to retrieve PO template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update PO template settings"""
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
                defaults={'selected_template': 'AS', 'selected_po_template': 'AS'}
            )
            
            selected_po_template = request.data.get('selected_po_template')
            if selected_po_template:
                valid_templates = [choice[0] for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES]
                if selected_po_template not in valid_templates:
                    return Response({
                        'success': False,
                        'error': 'Invalid template selection',
                        'message': f'Template must be one of: {", ".join(valid_templates)}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                settings.selected_po_template = selected_po_template
                settings.save()
                
                return Response({
                    'success': True,
                    'data': {
                        'selected_po_template': settings.selected_po_template,
                        'template_display': dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_po_template]
                    },
                    'message': f'PO template updated to {dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[settings.selected_po_template]}'
                })
            else:
                return Response({
                    'success': False,
                    'error': 'Missing template selection',
                    'message': 'Please provide selected_po_template'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to update PO template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class POTemplatePreviewView(APIView):
    """Generate preview for PO templates"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, template_name):
        """Get HTML preview of PO template"""
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
            
            # Get sample PO for preview
            sample_po = self._get_sample_po(company, template_name)
            if not sample_po:
                return Response({
                    'success': False,
                    'error': 'Could not create sample PO',
                    'message': 'Preview unavailable'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Generate HTML preview
            html_content = po_pdf_service.generate_po_html(sample_po, template_name)
            
            # Return HTML response
            return HttpResponse(html_content, content_type='text/html')
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate PO template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sample_po(self, company, template_name):
        """Get or create sample PO for preview"""
        from finance.models import Customer, Product, PurchaseOrderItem
        from decimal import Decimal
        from datetime import date, timedelta
        
        # Try to get an existing PO
        existing_po = PurchaseOrder.objects.filter(company=company).first()
        if existing_po:
            return existing_po
        
        # Create mock data for preview
        try:
            # Create or get sample customer
            customer, created = Customer.objects.get_or_create(
                company=company,
                name="Sample Vendor Pvt Ltd",
                defaults={
                    'customer_code': 'VENDOR001',
                    'email': 'vendor@example.com',
                    'phone': '9876543210',
                    'billing_address_line1': 'Sample Vendor Address',
                    'billing_city': 'Sample City',
                    'billing_state': 'Sample State',
                    'billing_pincode': '123456',
                    'gstin': '33VENDOR123456Z',
                    'customer_type': 'business'
                }
            )
            
            # Create sample PO
            po = PurchaseOrder.objects.create(
                company=company,
                customer=customer,
                po_number=f'CLIENT-PO-{template_name}-001',
                internal_po_number=f'PO/PREVIEW/{template_name}/001',
                po_date=date.today(),
                status='draft',
                subtotal=Decimal('50000.00'),
                total_tax=Decimal('9000.00'),
                total_amount=Decimal('59000.00'),
                notes='This is a sample purchase order for template preview'
            )
            
            # Create sample product if needed
            product, created = Product.objects.get_or_create(
                company=company,
                name="Sample Product/Service",
                defaults={
                    'product_code': 'SAMPLE001',
                    'product_type': 'service',
                    'description': 'Sample product/service for PO preview',
                    'unit': 'Nos',
                    'selling_price': Decimal('50000.00'),
                    'gst_rate': Decimal('18.00')
                }
            )
            
            # Create sample PO item
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                product=product,
                product_name=product.name,
                product_code=product.product_code,
                description=product.description,
                hsn_sac_code='998361',
                quantity=Decimal('1'),
                unit=product.unit,
                unit_price=Decimal('50000.00'),
                line_total=Decimal('50000.00'),
                gst_rate=Decimal('18.00')
            )
            
            return po
            
        except Exception as e:
            print(f"Error creating sample PO: {str(e)}")
            return PurchaseOrder.objects.filter(company=company).first()