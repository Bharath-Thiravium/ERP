"""
Gstr1AuditService — records every export attempt in finance_gstr1_export_logs.
"""
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


class Gstr1AuditService:

    @staticmethod
    def log(company, service_user, from_date, to_date,
            return_month, financial_year, file_name,
            b2b_count=0, b2cs_count=0, cdnr_count=0, cdnra_count=0,
            hsn_b2b_count=0, hsn_b2c_count=0, docs_count=0,
            validation_status='passed', export_status='success', error_message=''):
        try:
            from .models import Gstr1ExportLog
            Gstr1ExportLog.objects.create(
                company_id=company.id,
                company_gstin=getattr(company, 'gst_number', '') or '',
                return_month=return_month,
                financial_year=financial_year,
                from_date=from_date,
                to_date=to_date,
                exported_by_id=service_user.id,
                exported_by_name=service_user.full_name or service_user.username,
                file_name=file_name,
                b2b_count=b2b_count,
                b2cs_count=b2cs_count,
                cdnr_count=cdnr_count,
                cdnra_count=cdnra_count,
                hsn_b2b_count=hsn_b2b_count,
                hsn_b2c_count=hsn_b2c_count,
                docs_count=docs_count,
                validation_status=validation_status,
                export_status=export_status,
                error_message=error_message,
            )
        except Exception as exc:
            logger.error('GSTR-1 audit log failed: %s', exc)
