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
from finance.models import Invoice
from finance.invoice_pdf_service import invoice_pdf_service


class InvoiceTemplateSettingsView(APIView):
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
            return Response({'success': True, 'data': serializer.data, 'message': 'Invoice template settings retrieved successfully'})
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to retrieve invoice template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            company = _get_company(request)
            if not company:
                return Response({'success': False, 'error': 'No company found'}, status=status.HTTP_403_FORBIDDEN)
            
            logger.info(f"Updating invoice template for company: {company.name} (ID: {company.id})")
            logger.info(f"Request data: {request.data}")
            
            settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
                company=company,
                defaults={f: 'AS' for f in ['selected_template', 'selected_po_template', 'selected_proforma_template', 'selected_invoice_template']}
            )
            
            logger.info(f"Settings {'created' if created else 'found'} for company {company.name}")
            logger.info(f"Current invoice template: {settings.selected_invoice_template}")
            
            serializer = CompanyQuotationTemplateSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                updated = serializer.instance
                logger.info(f"Successfully updated invoice template to: {updated.selected_invoice_template}")
                return Response({'success': True, 'data': serializer.data, 'message': f'Invoice template updated to {dict(CompanyQuotationTemplateSettings.TEMPLATE_CHOICES)[updated.selected_invoice_template]}'})
            
            logger.error(f"Validation errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'message': 'Invalid template settings'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            import traceback
            logger = logging.getLogger(__name__)
            logger.error(f"Error updating invoice template: {str(e)}")
            logger.error(traceback.format_exc())
            return Response({'success': False, 'error': str(e), 'message': 'Failed to update invoice template settings'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvoiceTemplatePreviewView(APIView):
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
            html_content = invoice_pdf_service.generate_invoice_html(sample, template_name)
            return HttpResponse(html_content, content_type='text/html')
        except Exception as e:
            return Response({'success': False, 'error': str(e), 'message': 'Failed to generate invoice template preview'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_sample(self, company):
        existing = Invoice.objects.filter(company=company).order_by('-created_at').first()
        if existing:
            return existing

        from decimal import Decimal
        from datetime import date, timedelta
        from types import SimpleNamespace

        customer = build_mock_customer()
        item = build_mock_item()

        return SimpleNamespace(
            id=0, company=company, customer=customer,
            invoice_number='INV/PREVIEW/001',
            invoice_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            payment_status='unpaid', gst_type='igst',
            subtotal=Decimal('10000.00'),
            discount_percentage=Decimal('0'), discount_amount=Decimal('0'),
            shipping_charges=Decimal('0'), other_charges=Decimal('0'),
            total_tax=Decimal('1800.00'), total_amount=Decimal('11800.00'),
            paid_amount=Decimal('0'), outstanding_amount=Decimal('11800.00'),
            notes='This is a sample invoice for template preview.',
            terms_and_conditions='Standard terms and conditions apply.',
            place_of_supply='Maharashtra',
            reverse_charge_applicable=False, tds_applicable=False,
            shipping_address=None,
            company_gstin=getattr(company, 'gst_number', '27AABCU9603R1ZX'),
            invoice_items=SimpleNamespace(all=lambda: [item]),
        )
