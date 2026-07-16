"""
Gstr1DataRepository — all database access for GSTR-1 export.
All queries are company-scoped and parameterized.
"""
from decimal import Decimal
from django.core.exceptions import FieldDoesNotExist
from django.db.models import Prefetch, Q
from .models import Invoice, InvoiceItem, Customer


class Gstr1DataRepository:

    @staticmethod
    def _get_exclusion_filter_kwargs():
        """Return the GSTR-1 exclusion filter only when the field exists on the model."""
        try:
            Invoice._meta.get_field('gstr1_excluded')
        except FieldDoesNotExist:
            return {}
        return {'gstr1_excluded': False}

    @staticmethod
    def get_invoices(company, from_date, to_date, include_cancelled=False):
        """
        Return tax invoices, credit notes, and debit notes for the period.
        Excludes: drafts, proforma, purchase invoices, gstr1_excluded.
        """
        filter_kwargs = {
            'company': company,
            'invoice_date__gte': from_date,
            'invoice_date__lte': to_date,
            'invoice_type__in': ['tax_invoice', 'credit_note', 'debit_note'],
        }
        filter_kwargs.update(Gstr1DataRepository._get_exclusion_filter_kwargs())

        qs = (
            Invoice.objects
            .filter(**filter_kwargs)
            .select_related('customer', 'customer__company')
            .prefetch_related(
                Prefetch(
                    'invoice_items',
                    queryset=InvoiceItem.objects.select_related('product__hsn_code', 'product__sac_code'),
                )
            )
        )
        if not include_cancelled:
            qs = qs.filter(is_rejected=False)
        return qs.order_by('invoice_date', 'invoice_number')

    @staticmethod
    def get_company(company_id):
        from authentication.models import Company
        return Company.objects.get(pk=company_id)

    @staticmethod
    def get_invoice_series_summary(company, from_date, to_date):
        """
        Return document series data for the docs sheet.
        Groups by invoice_type and derives series prefix.
        """
        from django.db.models import Min, Max, Count
        rows = (
            Invoice.objects
            .filter(
                company=company,
                invoice_date__gte=from_date,
                invoice_date__lte=to_date,
                invoice_type__in=['tax_invoice', 'credit_note', 'debit_note'],
            )
            .values('invoice_type')
            .annotate(
                total=Count('id'),
                cancelled=Count('id', filter=Q(is_rejected=True)),
                first_num=Min('invoice_number'),
                last_num=Max('invoice_number'),
            )
        )
        return list(rows)
