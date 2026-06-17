from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import HttpResponse

from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import CompanyQuotationTemplateSettingsSerializer
from .template_utils import VALID_TEMPLATES, TEMPLATE_INFO, get_preview_company, build_mock_customer, build_mock_item
from finance.models import Quotation
from finance.quotation_pdf_service import quotation_pdf_service


def _get_company(request):
    if hasattr(request, 'service_user') and request.service_user:
        return request.service_user.company
    if hasattr(request.user, 'company_user'):
        return request.user.company_user.company
    return None


class QuotationTemplateSettingsView(APIView):
    authentication_classes = [JWTAuthentication, ServiceUserSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            company = _get_company(request)
            if not company:
                return Response({'success': False, 'error': 'No company found'}, status=status.HTTP_403_FORBIDDEN)
            settings, _ = CompanyQuotationTemplateSettings.objects.get_or_create(
                company=company,
                defaults={f: 'AS' for f in ['selected_template', 'selected_po_template', 'selected_proforma_template', 'selected_invoice_template']}
            )
            serializer = CompanyQuotationTemplateSettingsSerializer(settings)
            return Response({'success': True, 'data': serializer.data, 'message': 'Template settings retrieved successfully'})
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to retrieve template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            company = _get_company(request)
            if not company:
                return Response({'success': False, 'error': 'No company found'}, status=status.HTTP_403_FORBIDDEN)
            settings, _ = CompanyQuotationTemplateSettings.objects.get_or_create(
                company=company,
                defaults={f: 'AS' for f in ['selected_template', 'selected_po_template', 'selected_proforma_template', 'selected_invoice_template']}
            )
            serializer = CompanyQuotationTemplateSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                updated = serializer.instance
                return Response({'success': True, 'data': serializer.data, 'message': f'Template updated to {updated.get_selected_template_display()}'})
            return Response({'success': False, 'errors': serializer.errors, 'message': 'Invalid template settings'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to update template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class QuotationTemplatePreviewView(APIView):
    authentication_classes = [JWTAuthentication, ServiceUserSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, template_name):
        try:
            if template_name not in VALID_TEMPLATES:
                return Response({'success': False, 'error': 'Invalid template name', 'message': f'Template must be one of: {", ".join(VALID_TEMPLATES)}'}, status=status.HTTP_400_BAD_REQUEST)

            company = get_preview_company(request)
            if not company:
                return Response({'success': False, 'error': 'No company context available', 'message': 'Unable to identify company for preview'}, status=status.HTTP_401_UNAUTHORIZED)

            # Always use fresh mock sample for preview (don't use existing DB quotation)
            sample = self._get_sample(company)
            # Force preview template (don't use company's saved template)
            html_content = quotation_pdf_service.generate_quotation_html(sample, template_name=template_name)
            return HttpResponse(html_content, content_type='text/html')
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to generate template preview'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_sample(self, company):
        """Create fresh mock quotation with complete data for preview"""
        from decimal import Decimal
        from datetime import date, timedelta
        from types import SimpleNamespace

        # Build complete customer with all details
        customer = build_mock_customer()
        customer.name = 'Sample Client Pvt Ltd'
        customer.display_name = 'Sample Client Pvt Ltd'
        customer.customer_code = 'CUST001'
        customer.gstin = '27AABCU9603R1ZX'
        customer.billing_address_line1 = '456 Corporate Avenue'
        customer.billing_address_line2 = 'Business Park'
        customer.billing_city = 'Bangalore'
        customer.billing_state = 'KA'
        customer.billing_pincode = '560001'
        customer.phone = '+91-80-5555-1234'
        customer.email = 'client@example.com'

        # Build complete item with all details
        item = build_mock_item(
            product_name='Consulting Services',
            description='Business consulting and advisory services',
            hsn_sac_code='998361',
            quantity=Decimal('5'),
            unit='Days',
            unit_price=Decimal('2000.00'),
            line_total=Decimal('10000.00'),
        )
        item.gst_rate = Decimal('18')
        item.line_number = 1

        return SimpleNamespace(
            id=0,
            company=company,
            customer=customer,
            quotation_number='QT/PREVIEW/001',
            quotation_date=date.today(),
            valid_until=date.today() + timedelta(days=30),
            status='draft',
            gst_type='igst',
            subtotal=Decimal('10000.00'),
            discount_percentage=Decimal('0'),
            discount_amount=Decimal('0'),
            shipping_charges=Decimal('0'),
            other_charges=Decimal('0'),
            cgst_amount=Decimal('900.00'),
            sgst_amount=Decimal('900.00'),
            igst_amount=Decimal('1800.00'),
            total_tax=Decimal('1800.00'),
            total_amount=Decimal('11800.00'),
            notes='Sample quotation for template preview.',
            terms_and_conditions='Standard terms and conditions apply. Valid for 30 days.',
            created_by_name='Preview',
            company_gstin=getattr(company, 'gst_number', '27AABCU9603R1ZX'),
            quotation_items=SimpleNamespace(all=lambda: [item]),
        )


class TemplateInfoView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            'success': True,
            'data': {
                'templates': TEMPLATE_INFO,
                'quotation_templates': TEMPLATE_INFO,
                'po_templates': TEMPLATE_INFO,
                'proforma_templates': TEMPLATE_INFO,
                'invoice_templates': TEMPLATE_INFO,
                'total_templates': len(TEMPLATE_INFO),
            },
            'message': 'Template information retrieved successfully',
        })
