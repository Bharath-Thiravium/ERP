from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import HttpResponse

from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from .quotation_template_models import CompanyQuotationTemplateSettings
from .quotation_template_serializers import CompanyQuotationTemplateSettingsSerializer
from .template_utils import VALID_TEMPLATES, get_preview_company, build_mock_customer, build_mock_item
from .quotation_template_views import _get_company
from finance.models import PurchaseOrder
from finance.po_pdf_service import po_pdf_service


class POTemplateSettingsView(APIView):
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
            return Response({'success': True, 'data': serializer.data, 'message': 'PO template settings retrieved successfully'})
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to retrieve PO template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                return Response({'success': True, 'data': serializer.data, 'message': f'PO template updated to {dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[updated.selected_po_template]}'})
            return Response({'success': False, 'errors': serializer.errors, 'message': 'Invalid template settings'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to update PO template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class POTemplatePreviewView(APIView):
    authentication_classes = [JWTAuthentication, ServiceUserSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, template_name):
        try:
            if template_name not in VALID_TEMPLATES:
                return Response({'success': False, 'error': 'Invalid template name', 'message': f'Template must be one of: {", ".join(VALID_TEMPLATES)}'}, status=status.HTTP_400_BAD_REQUEST)

            company = get_preview_company(request)
            if not company:
                return Response({'success': False, 'error': 'No company context available', 'message': 'Unable to identify company for preview'}, status=status.HTTP_401_UNAUTHORIZED)

            sample = self._get_sample(company)
            html_content = po_pdf_service.generate_po_html(sample, template_name)
            return HttpResponse(html_content, content_type='text/html')
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to generate PO template preview'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_sample(self, company):
        existing = PurchaseOrder.objects.filter(company=company).order_by('-created_at').first()
        if existing:
            return existing

        from decimal import Decimal
        from datetime import date, timedelta
        from types import SimpleNamespace

        vendor = build_mock_customer()
        vendor.name = 'Sample Vendor Pvt Ltd'
        vendor.display_name = 'Sample Vendor Pvt Ltd'
        vendor.customer_code = 'VEND001'

        item = build_mock_item(
            product_name='Supply of Equipment',
            description='Industrial equipment supply',
            hsn_sac_code='84719000',
            quantity=Decimal('2'),
            unit='Nos',
            unit_price=Decimal('25000.00'),
            line_total=Decimal('50000.00'),
        )

        return SimpleNamespace(
            id=0, company=company, customer=vendor,
            po_number='CLIENT-PO-PREVIEW-001',
            internal_po_number='PO/PREVIEW/001',
            po_date=date.today(),
            delivery_date=date.today() + timedelta(days=30),
            status='draft', gst_type='igst',
            subtotal=Decimal('50000.00'),
            discount_amount=Decimal('0'),
            total_tax=Decimal('9000.00'), total_amount=Decimal('59000.00'),
            notes='Sample purchase order for template preview.',
            terms_and_conditions='Standard terms apply.',
            shipping_address=None,
            company_gstin=getattr(company, 'gst_number', '27AABCU9603R1ZX'),
            po_items=SimpleNamespace(all=lambda: [item]),
        )
