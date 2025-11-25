from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from authentication.models import Company
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import (
    CompanyQuotationTemplateSettingsSerializer,
    QuotationTemplatePreviewSerializer
)
from finance.models import Quotation
from finance.quotation_pdf_service import quotation_pdf_service

class QuotationTemplateSettingsView(APIView):
    """Manage quotation template settings for companies"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current template settings"""
        try:
            # Get company from CompanyUser relationship
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'error': 'Authentication required',
                    'message': 'Please log in to access template settings'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
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
            
            serializer = CompanyQuotationTemplateSettingsSerializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Template settings retrieved successfully'
            })
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to retrieve template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Update template settings"""
        try:
            # Get company from CompanyUser relationship
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'error': 'Authentication required',
                    'message': 'Please log in to update template settings'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
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
            
            serializer = CompanyQuotationTemplateSettingsSerializer(
                settings, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': f'Template updated to {settings.get_selected_template_display()}'
                })
            else:
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Invalid template settings'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to update template settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class QuotationTemplatePreviewView(APIView):
    """Generate preview PDFs for template selection"""
    
    permission_classes = [IsAuthenticated]
    
    def get(self, request, template_name):
        """Get HTML preview of template"""
        try:
            if template_name not in ['AS', 'BKGE', 'TC']:
                return Response({
                    'success': False,
                    'error': 'Invalid template name',
                    'message': 'Template must be AS, BKGE, or TC'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get company from CompanyUser relationship
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'error': 'Authentication required',
                    'message': 'Please log in to preview templates'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if not hasattr(request.user, 'company_user'):
                return Response({
                    'success': False,
                    'error': 'User is not associated with any company',
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            company = request.user.company_user.company
            
            # Get sample quotation for preview
            sample_quotation = self._get_sample_quotation(company, template_name)
            if not sample_quotation:
                return Response({
                    'success': False,
                    'error': 'Could not create sample quotation',
                    'message': 'Preview unavailable'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Generate HTML preview
            html_content = quotation_pdf_service.generate_quotation_html(sample_quotation, template_name)
            
            # Return HTML response
            return HttpResponse(html_content, content_type='text/html')
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Generate template preview PDF"""
        try:
            serializer = QuotationTemplatePreviewSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Invalid preview request'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            template_name = serializer.validated_data['template_name']
            # Get company from CompanyUser relationship  
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'error': 'Authentication required',
                    'message': 'Please log in to preview templates'
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            if not hasattr(request.user, 'company_user'):
                return Response({
                    'success': False,
                    'error': 'User is not associated with any company',
                    'message': 'Access denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            company = request.user.company_user.company
            
            # Get a sample quotation for preview (or create mock data)
            sample_quotation = self._get_sample_quotation(company, template_name)
            
            # Temporarily set the template for preview
            original_template = None
            settings = None
            try:
                settings = CompanyQuotationTemplateSettings.objects.get(company=company)
                original_template = settings.selected_template
                settings.selected_template = template_name
                settings.save()
            except CompanyQuotationTemplateSettings.DoesNotExist:
                settings = CompanyQuotationTemplateSettings.objects.create(
                    company=company,
                    selected_template=template_name
                )
            
            # Generate preview PDF
            pdf_buffer = quotation_pdf_service.generate_quotation_pdf(sample_quotation)
            
            # Restore original template
            if original_template:
                settings.selected_template = original_template
                settings.save()
            
            # Return PDF response
            response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="preview_{template_name}_template.pdf"'
            return response
            
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e),
                'message': 'Failed to generate template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_sample_quotation(self, company, template_name):
        """Get or create sample quotation for preview"""
        from finance.models import Customer, Product, QuotationItem
        from decimal import Decimal
        from datetime import date, timedelta
        
        # Try to get an existing quotation
        existing_quotation = Quotation.objects.filter(company=company).first()
        if existing_quotation:
            return existing_quotation
        
        # Create mock data for preview
        try:
            # Create or get sample customer
            customer, created = Customer.objects.get_or_create(
                company=company,
                name="Sample Customer Pvt Ltd",
                defaults={
                    'customer_code': 'SAMPLE001',
                    'email': 'sample@example.com',
                    'phone': '9876543210',
                    'billing_address_line1': 'Sample Address Line 1',
                    'billing_city': 'Sample City',
                    'billing_state': 'Sample State',
                    'billing_pincode': '123456',
                    'gstin': '33SAMPLE123456Z',
                    'customer_type': 'business'
                }
            )
            
            # Create sample quotation
            quotation = Quotation.objects.create(
                company=company,
                customer=customer,
                quotation_number=f'PREVIEW/{template_name}/001',
                quotation_date=date.today(),
                valid_until=date.today() + timedelta(days=30),
                status='draft',
                subtotal=Decimal('10000.00'),
                total_tax=Decimal('1800.00'),
                total_amount=Decimal('11800.00'),
                gst_type='igst',
                notes='This is a sample quotation for template preview',
                terms_and_conditions='Sample terms and conditions for preview purposes'
            )
            
            # Create sample product if needed
            product, created = Product.objects.get_or_create(
                company=company,
                name="Sample Product/Service",
                defaults={
                    'product_code': 'SAMPLE001',
                    'product_type': 'service',
                    'description': 'Sample product/service for quotation preview',
                    'unit': 'Nos',
                    'selling_price': Decimal('10000.00'),
                    'gst_rate': Decimal('18.00')
                }
            )
            
            # Create sample quotation item
            QuotationItem.objects.create(
                quotation=quotation,
                product=product,
                product_name=product.name,
                product_code=product.product_code,
                description=product.description,
                hsn_sac_code='998361',
                quantity=Decimal('1'),
                unit=product.unit,
                unit_price=Decimal('10000.00'),
                line_total=Decimal('10000.00'),
                gst_rate=Decimal('18.00'),
                line_number=1
            )
            
            return quotation
            
        except Exception as e:
            print(f"Error creating sample quotation: {str(e)}")
            # Return existing quotation or None
            return Quotation.objects.filter(company=company).first()

@method_decorator(csrf_exempt, name='dispatch')
class TemplateInfoView(APIView):
    """Get information about available templates"""
    
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get template information and descriptions"""
        templates = [
            {
                'code': 'AS',
                'name': 'AS Template - Clean & Simple',
                'description': 'Clean and simple layout with right-aligned company info and professional styling',
                'features': [
                    'Right-aligned company information',
                    'Large quotation title',
                    'Simple table design',
                    'Professional footer with signature'
                ],
                'best_for': 'Companies preferring minimalist, clean design'
            },
            {
                'code': 'BKGE', 
                'name': 'BKGE Template - Professional',
                'description': 'Modern professional template with centered header and structured table design',
                'features': [
                    'Centered quotation header',
                    'Color-coded table headers',
                    'Structured customer information',
                    'Professional totals section'
                ],
                'best_for': 'Businesses requiring modern, structured presentation'
            },
            {
                'code': 'TC',
                'name': 'TC Template - Detailed Terms',
                'description': 'Detailed template with comprehensive terms and conditions section',
                'features': [
                    'Comprehensive company branding',
                    'Detailed information grid',
                    'Extensive terms and conditions',
                    'Professional signature box'
                ],
                'best_for': 'Contractors and service providers with detailed terms'
            }
        ]
        
        return Response({
            'success': True,
            'data': {
                'quotation_templates': templates,
                'po_templates': templates,  # Same templates for PO
                'proforma_templates': templates,  # Same templates for Proforma
                'invoice_templates': templates,  # Same templates for Invoice
                'total_templates': len(templates)
            },
            'message': 'Template information retrieved successfully'
        })