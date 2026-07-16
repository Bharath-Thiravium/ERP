"""
GSTR-1 Export Controller — Django REST views.
Endpoints:
  POST /api/finance/gstr1/validate/   → run validation, return issues
  POST /api/finance/gstr1/reconcile/  → return reconciliation summary
  POST /api/finance/gstr1/export/     → generate and download Excel
  GET  /api/finance/gstr1/validation-report/ → download validation issues as Excel
"""
import io
import logging
from datetime import datetime, date

from django.http import HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status

from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated
from authentication.models import ServiceUserSession

from .gstr1_constants import MONTH_ABBR, MONTH_NAMES
from .gstr1_repository import Gstr1DataRepository
from .gstr1_export_service import Gstr1ExportService
from .gstr1_validation import Gstr1ValidationService
from .gstr1_reconciliation import Gstr1ReconciliationService
from .gstr1_excel_writer import Gstr1ExcelWriter
from .gstr1_audit import Gstr1AuditService

logger = logging.getLogger(__name__)

ALLOWED_ROLES = {'admin', 'manager'}


def _get_session(request):
    key = (
        request.data.get('session_key')
        or request.query_params.get('session_key')
        or request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    )
    if not key:
        return None, None
    try:
        session = ServiceUserSession.objects.select_related('service_user__company').get(
            session_key=key, is_active=True
        )
        return session, session.service_user
    except ServiceUserSession.DoesNotExist:
        return None, None


def _parse_dates(data):
    """Parse and validate from_date / to_date from request data."""
    from_str = data.get('from_date', '')
    to_str = data.get('to_date', '')
    try:
        from_date = datetime.strptime(from_str, '%Y-%m-%d').date()
        to_date = datetime.strptime(to_str, '%Y-%m-%d').date()
    except (ValueError, TypeError):
        raise ValueError('from_date and to_date are required in YYYY-MM-DD format.')
    if from_date > to_date:
        raise ValueError('from_date must be before to_date.')
    return from_date, to_date


def _build_filename(gstin, return_month, financial_year):
    """GSTR1_<GSTIN>_<MONYYYY>.xlsx"""
    fy_start = financial_year.split('-')[0] if '-' in financial_year else financial_year
    month_num = MONTH_NAMES.get(return_month.upper(), 0)
    year = int(fy_start) if month_num >= 4 else int(fy_start) + 1
    mon_abbr = MONTH_ABBR.get(month_num, return_month[:3].upper())
    return f'GSTR1_{gstin}_{mon_abbr}{year}.xlsx'


# ── Validate ─────────────────────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def gstr1_validate(request):
    session, service_user = _get_session(request)
    if not service_user:
        return Response({'error': 'Invalid or missing session.'}, status=401)
    if service_user.role not in ALLOWED_ROLES:
        return Response({'error': 'Insufficient permissions.'}, status=403)

    try:
        from_date, to_date = _parse_dates(request.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    company = service_user.company
    include_cancelled = request.data.get('include_cancelled', False)

    invoices = list(Gstr1DataRepository.get_invoices(company, from_date, to_date, include_cancelled))
    company_gstin = (getattr(company, 'gst_number', '') or '').strip()
    company_state = company_gstin[:2] if len(company_gstin) >= 2 else ''

    result = Gstr1ValidationService().validate_all(invoices, company_gstin, company_state)
    return Response(result.to_dict())


# ── Reconcile ────────────────────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def gstr1_reconcile(request):
    session, service_user = _get_session(request)
    if not service_user:
        return Response({'error': 'Invalid or missing session.'}, status=401)
    if service_user.role not in ALLOWED_ROLES:
        return Response({'error': 'Insufficient permissions.'}, status=403)

    try:
        from_date, to_date = _parse_dates(request.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    company = service_user.company
    include_cancelled = request.data.get('include_cancelled', False)

    svc = Gstr1ExportService(company, from_date, to_date, include_cancelled)
    b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs = svc.build_all_sheets()
    summary = Gstr1ReconciliationService().build(b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs)
    return Response(summary)


# ── Export ───────────────────────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def gstr1_export(request):
    session, service_user = _get_session(request)
    if not service_user:
        return Response({'error': 'Invalid or missing session.'}, status=401)
    if service_user.role not in ALLOWED_ROLES:
        return Response({'error': 'Insufficient permissions.'}, status=403)

    try:
        from_date, to_date = _parse_dates(request.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    return_month = (request.data.get('return_month') or '').strip()
    financial_year = (request.data.get('financial_year') or '').strip()
    include_cancelled = request.data.get('include_cancelled', False)

    if not return_month or not financial_year:
        return Response({'error': 'return_month and financial_year are required.'}, status=400)

    company = service_user.company
    company_gstin = (getattr(company, 'gst_number', '') or '').strip()

    if not company_gstin or len(company_gstin) != 15:
        return Response({'error': 'Company GSTIN is missing or invalid. Update company profile.'}, status=400)

    company_state = company_gstin[:2]

    # Validate first
    invoices = list(Gstr1DataRepository.get_invoices(company, from_date, to_date, include_cancelled))
    val_result = Gstr1ValidationService().validate_all(invoices, company_gstin, company_state)

    if val_result.has_blocking:
        Gstr1AuditService.log(
            company, service_user, from_date, to_date,
            return_month, financial_year, 'N/A',
            validation_status='failed', export_status='blocked',
            error_message=f'{len(val_result.blocking)} blocking errors',
        )
        return Response({
            'error': 'Export blocked due to validation errors.',
            'validation': val_result.to_dict(),
        }, status=422)

    # Build sheet data
    svc = Gstr1ExportService(company, from_date, to_date, include_cancelled)
    b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs = svc.build_all_sheets()

    # Write Excel
    try:
        buf = Gstr1ExcelWriter().write(b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs)
    except Exception as exc:
        logger.exception('GSTR-1 Excel write failed')
        Gstr1AuditService.log(
            company, service_user, from_date, to_date,
            return_month, financial_year, 'N/A',
            export_status='failed', error_message=str(exc),
        )
        return Response({'error': f'Excel generation failed: {exc}'}, status=500)

    file_name = _build_filename(company_gstin, return_month, financial_year)

    Gstr1AuditService.log(
        company, service_user, from_date, to_date,
        return_month, financial_year, file_name,
        b2b_count=len(b2b), b2cs_count=len(b2cs),
        cdnr_count=len(cdnr), cdnra_count=len(cdnra),
        hsn_b2b_count=len(hsn_b2b), hsn_b2c_count=len(hsn_b2c),
        docs_count=len(docs),
        validation_status='passed' if not val_result.warnings else 'warnings',
        export_status='success',
    )

    response = HttpResponse(
        buf.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{file_name}"'
    response['X-GSTR1-Filename'] = file_name
    return response


# ── Validation report download ────────────────────────────────────────────────

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def gstr1_validation_report(request):
    """Download validation issues as Excel."""
    session, service_user = _get_session(request)
    if not service_user:
        return Response({'error': 'Invalid or missing session.'}, status=401)

    try:
        from_date, to_date = _parse_dates(request.data)
    except ValueError as e:
        return Response({'error': str(e)}, status=400)

    company = service_user.company
    company_gstin = (getattr(company, 'gst_number', '') or '').strip()
    company_state = company_gstin[:2] if len(company_gstin) >= 2 else ''
    include_cancelled = request.data.get('include_cancelled', False)

    invoices = list(Gstr1DataRepository.get_invoices(company, from_date, to_date, include_cancelled))
    result = Gstr1ValidationService().validate_all(invoices, company_gstin, company_state)

    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = 'Validation Report'
    headers = ['Document Number', 'Document Date', 'Customer', 'GSTIN',
               'Validation Field', 'Current Value', 'Error Message', 'Suggested Action', 'Severity']
    ws.append(headers)

    for issue in result.blocking:
        ws.append([
            issue.document_number, issue.document_date, issue.customer, issue.gstin,
            issue.validation_field, issue.current_value, issue.error_message,
            issue.suggested_action, 'BLOCKING',
        ])
    for issue in result.warnings:
        ws.append([
            issue.document_number, issue.document_date, issue.customer, issue.gstin,
            issue.validation_field, issue.current_value, issue.error_message,
            issue.suggested_action, 'WARNING',
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    response = HttpResponse(
        buf.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = 'attachment; filename="GSTR1_Validation_Report.xlsx"'
    return response
