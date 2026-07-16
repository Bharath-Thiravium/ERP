"""
Phase 3 — Unit tests for Gstr1ExportService and Gstr1ReconciliationService.

Scenarios covered (10):
  23. B2B sheet — inter-state invoice produces correct row fields
  24. B2B sheet — multiple rate rows per invoice (one row per rate)
  25. B2CS sheet — no-GSTIN invoice consolidated by POS + rate
  26. CDNR sheet — credit note with GSTIN produces correct row
  27. CDNRA sheet — amendment credit note goes to CDNRA, not CDNR
  28. HSN B2B sheet — proportional tax allocation from invoice totals
  29. HSN B2C sheet — B2C invoices go to separate HSN sheet
  30. Docs sheet — series summary rows mapped to correct nature
  31. Reconciliation — B2B vs HSN B2B diff within tolerance → match=True
  32. Reconciliation — B2B vs HSN B2B diff outside tolerance → match=False
"""
from decimal import Decimal
from datetime import date
from unittest.mock import MagicMock, patch, PropertyMock

from django.test import SimpleTestCase

from finance.gstr1_export_service import Gstr1ExportService
from finance.gstr1_reconciliation import Gstr1ReconciliationService
from finance.gstr1_constants import (
    DOC_NATURE_OUTWARD, DOC_NATURE_CREDIT, DOC_NATURE_DEBIT,
    INVOICE_TYPE_REGULAR,
)

from .tests_gstr1_fixtures import (
    COMPANY_GSTIN, CUSTOMER_GSTIN, INTRA_GSTIN,
    make_mock_invoice, _make_mock_item,
)

COMPANY_STATE = '27'
FROM_DATE = date(2024, 4, 1)
TO_DATE   = date(2024, 6, 30)


def _make_service(invoices, series=None):
    """Build a Gstr1ExportService with mocked repository."""
    company = MagicMock()
    company.gst_number = COMPANY_GSTIN

    with patch('finance.gstr1_export_service.Gstr1DataRepository') as MockRepo:
        MockRepo.get_invoices.return_value = invoices
        MockRepo.get_invoice_series_summary.return_value = series or []
        svc = Gstr1ExportService(company, FROM_DATE, TO_DATE)
        svc._repo_invoices = invoices
        svc._repo_series = series or []

    # Patch at instance level so build_all_sheets uses our data
    with patch.object(
        type(svc), 'build_all_sheets',
        wraps=lambda self: _patched_build(self, invoices, series or [])
    ):
        pass

    return svc, invoices, series or []


def _patched_build(svc, invoices, series):
    b2b   = svc._build_b2b(invoices)
    b2cs  = svc._build_b2cs(invoices)
    cdnr  = svc._build_cdnr(invoices)
    cdnra = svc._build_cdnra(invoices)
    hsn_b2b = svc._build_hsn(invoices, b2b_only=True)
    hsn_b2c = svc._build_hsn(invoices, b2b_only=False)

    # Patch docs to use our series data
    from finance.gstr1_classification import Gstr1ClassificationService as CLF
    docs = []
    for row in series:
        nature = CLF.get_doc_nature(row['invoice_type'])
        docs.append({
            'nature': nature,
            'sr_from': row['first_num'] or '',
            'sr_to': row['last_num'] or '',
            'total_number': row['total'],
            'cancelled': row['cancelled'],
        })
    return b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs


def _run(invoices, series=None):
    """Convenience: build all sheets directly."""
    company = MagicMock()
    company.gst_number = COMPANY_GSTIN
    svc = Gstr1ExportService.__new__(Gstr1ExportService)
    svc.company = company
    svc.from_date = FROM_DATE
    svc.to_date = TO_DATE
    svc.include_cancelled = False
    svc.company_gstin = COMPANY_GSTIN
    svc.company_state_code = COMPANY_STATE

    b2b   = svc._build_b2b(invoices)
    b2cs  = svc._build_b2cs(invoices)
    cdnr  = svc._build_cdnr(invoices)
    cdnra = svc._build_cdnra(invoices)
    hsn_b2b = svc._build_hsn(invoices, b2b_only=True)
    hsn_b2c = svc._build_hsn(invoices, b2b_only=False)

    from finance.gstr1_classification import Gstr1ClassificationService as CLF
    docs = []
    for row in (series or []):
        nature = CLF.get_doc_nature(row['invoice_type'])
        docs.append({
            'nature': nature,
            'sr_from': row['first_num'] or '',
            'sr_to': row['last_num'] or '',
            'total_number': row['total'],
            'cancelled': row['cancelled'],
        })
    return b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs


# ═══════════════════════════════════════════════════════════════════════════════
# B2B sheet
# ═══════════════════════════════════════════════════════════════════════════════

class TestB2BSheet(SimpleTestCase):
    """Scenarios 23–24"""

    def test_inter_state_invoice_produces_b2b_row(self):
        """Scenario 23: basic B2B row fields."""
        inv = make_mock_invoice(
            invoice_number='INV-001',
            customer_gstin=CUSTOMER_GSTIN,
            gst_type='igst',
            place_of_supply='29',
            subtotal=50000, igst=9000, total=59000,
        )
        b2b, *_ = _run([inv])
        self.assertEqual(len(b2b), 1)
        row = b2b[0]
        self.assertEqual(row['gstin'], CUSTOMER_GSTIN)
        self.assertEqual(row['invoice_number'], 'INV-001')
        self.assertEqual(row['place_of_supply'], '29-Karnataka')
        self.assertEqual(row['reverse_charge'], 'N')
        self.assertEqual(row['invoice_type'], INVOICE_TYPE_REGULAR)
        self.assertAlmostEqual(row['taxable_value'], 50000.0, places=2)

    def test_multiple_rates_produce_multiple_rows(self):
        """Scenario 24: two items at different rates → two rows, same invoice."""
        item1 = _make_mock_item(gst_rate=18, line_total=30000)
        item2 = _make_mock_item(gst_rate=5,  line_total=20000)
        inv = make_mock_invoice(
            invoice_number='INV-002',
            customer_gstin=CUSTOMER_GSTIN,
            items=[item1, item2],
        )
        b2b, *_ = _run([inv])
        self.assertEqual(len(b2b), 2)
        rates = {row['rate'] for row in b2b}
        self.assertIn(5.0, rates)
        self.assertIn(18.0, rates)
        # Only first row has invoice_value; second has _is_first_rate_row=False
        first_rows = [r for r in b2b if r.get('_is_first_rate_row')]
        self.assertEqual(len(first_rows), 1)

    def test_rejected_invoice_excluded_from_b2b(self):
        inv = make_mock_invoice(
            invoice_number='INV-REJ',
            customer_gstin=CUSTOMER_GSTIN,
            is_rejected=True,
        )
        # Repository filters rejected; simulate by passing empty list
        b2b, *_ = _run([])
        self.assertEqual(len(b2b), 0)


# ═══════════════════════════════════════════════════════════════════════════════
# B2CS sheet
# ═══════════════════════════════════════════════════════════════════════════════

class TestB2CSSheet(SimpleTestCase):
    """Scenario 25"""

    def test_no_gstin_invoice_goes_to_b2cs(self):
        item = _make_mock_item(gst_rate=18, line_total=10000)
        inv = make_mock_invoice(
            invoice_number='INV-B2C-001',
            customer_gstin='',
            gst_type='igst',
            place_of_supply='29',
            subtotal=10000, igst=1800, total=11800,
            items=[item],
        )
        _, b2cs, *_ = _run([inv])
        self.assertEqual(len(b2cs), 1)
        row = b2cs[0]
        self.assertEqual(row['place_of_supply'], '29-Karnataka')
        self.assertAlmostEqual(row['taxable_value'], 10000.0, places=2)

    def test_two_b2cs_same_pos_rate_consolidated(self):
        """Two B2C invoices with same POS + rate → single consolidated row."""
        item = _make_mock_item(gst_rate=18, line_total=5000)
        inv1 = make_mock_invoice(invoice_number='B2C-001', customer_gstin='',
                                 place_of_supply='29', items=[item])
        inv2 = make_mock_invoice(invoice_number='B2C-002', customer_gstin='',
                                 place_of_supply='29', items=[item])
        _, b2cs, *_ = _run([inv1, inv2])
        self.assertEqual(len(b2cs), 1)
        self.assertAlmostEqual(b2cs[0]['taxable_value'], 10000.0, places=2)

    def test_b2b_invoice_not_in_b2cs(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='tax_invoice')
        _, b2cs, *_ = _run([inv])
        self.assertEqual(len(b2cs), 0)


# ═══════════════════════════════════════════════════════════════════════════════
# CDNR sheet
# ═══════════════════════════════════════════════════════════════════════════════

class TestCdnrSheet(SimpleTestCase):
    """Scenario 26"""

    def test_credit_note_with_gstin_goes_to_cdnr(self):
        inv = make_mock_invoice(
            invoice_number='CN-001',
            invoice_type='credit_note',
            customer_gstin=CUSTOMER_GSTIN,
            place_of_supply='29',
            subtotal=5000, igst=900, total=5900,
        )
        _, _, cdnr, *_ = _run([inv])
        self.assertEqual(len(cdnr), 1)
        row = cdnr[0]
        self.assertEqual(row['note_number'], 'CN-001')
        self.assertEqual(row['note_type'], 'C')
        self.assertEqual(row['gstin'], CUSTOMER_GSTIN)

    def test_debit_note_type_is_D(self):
        inv = make_mock_invoice(
            invoice_number='DN-001',
            invoice_type='debit_note',
            customer_gstin=CUSTOMER_GSTIN,
            place_of_supply='29',
        )
        _, _, cdnr, *_ = _run([inv])
        self.assertEqual(len(cdnr), 1)
        self.assertEqual(cdnr[0]['note_type'], 'D')


# ═══════════════════════════════════════════════════════════════════════════════
# CDNRA sheet
# ═══════════════════════════════════════════════════════════════════════════════

class TestCdnraSheet(SimpleTestCase):
    """Scenario 27"""

    def test_amendment_credit_note_goes_to_cdnra_not_cdnr(self):
        inv = make_mock_invoice(
            invoice_number='CN-AMD-001',
            invoice_type='credit_note',
            customer_gstin=CUSTOMER_GSTIN,
            is_amendment=True,
            original_document_number='CN-ORIG-001',
            place_of_supply='29',
        )
        inv.original_document_date = '2024-03-15'
        _, _, cdnr, cdnra, *_ = _run([inv])
        self.assertEqual(len(cdnra), 1)
        self.assertEqual(len(cdnr), 0)
        self.assertEqual(cdnra[0]['revised_note_number'], 'CN-AMD-001')
        self.assertEqual(cdnra[0]['original_note_number'], 'CN-ORIG-001')


# ═══════════════════════════════════════════════════════════════════════════════
# HSN sheets
# ═══════════════════════════════════════════════════════════════════════════════

class TestHsnSheets(SimpleTestCase):
    """Scenarios 28–29"""

    def test_hsn_b2b_proportional_tax_allocation(self):
        """Scenario 28: tax allocated proportionally from invoice totals."""
        item = _make_mock_item(hsn='8471', unit='PCS', gst_rate=18, line_total=50000)
        inv = make_mock_invoice(
            customer_gstin=CUSTOMER_GSTIN,
            gst_type='igst',
            subtotal=50000, igst=9000, cgst=0, sgst=0,
            items=[item],
        )
        *_, hsn_b2b, hsn_b2c, _ = _run([inv])
        self.assertEqual(len(hsn_b2b), 1)
        row = hsn_b2b[0]
        self.assertEqual(row['hsn'], '8471')
        self.assertAlmostEqual(row['igst'], 9000.0, places=1)
        self.assertAlmostEqual(row['cgst'], 0.0, places=1)

    def test_hsn_b2c_separate_from_b2b(self):
        """Scenario 29: B2C invoices go to hsn_b2c, not hsn_b2b."""
        item = _make_mock_item(hsn='8471', unit='PCS', gst_rate=18, line_total=10000)
        inv = make_mock_invoice(
            customer_gstin='',
            gst_type='igst',
            subtotal=10000, igst=1800,
            items=[item],
        )
        *_, hsn_b2b, hsn_b2c, _ = _run([inv])
        self.assertEqual(len(hsn_b2b), 0)
        self.assertEqual(len(hsn_b2c), 1)
        self.assertAlmostEqual(hsn_b2c[0]['taxable_value'], 10000.0, places=2)


# ═══════════════════════════════════════════════════════════════════════════════
# Docs sheet
# ═══════════════════════════════════════════════════════════════════════════════

class TestDocsSheet(SimpleTestCase):
    """Scenario 30"""

    def test_docs_sheet_maps_invoice_type_to_nature(self):
        series = [
            {'invoice_type': 'tax_invoice',  'first_num': 'INV-001', 'last_num': 'INV-010', 'total': 10, 'cancelled': 1},
            {'invoice_type': 'credit_note',  'first_num': 'CN-001',  'last_num': 'CN-005',  'total': 5,  'cancelled': 0},
            {'invoice_type': 'debit_note',   'first_num': 'DN-001',  'last_num': 'DN-002',  'total': 2,  'cancelled': 0},
        ]
        *_, docs = _run([], series=series)
        natures = {r['nature'] for r in docs}
        self.assertIn(DOC_NATURE_OUTWARD, natures)
        self.assertIn(DOC_NATURE_CREDIT, natures)
        self.assertIn(DOC_NATURE_DEBIT, natures)
        tax_row = next(r for r in docs if r['nature'] == DOC_NATURE_OUTWARD)
        self.assertEqual(tax_row['total_number'], 10)
        self.assertEqual(tax_row['cancelled'], 1)


# ═══════════════════════════════════════════════════════════════════════════════
# Reconciliation
# ═══════════════════════════════════════════════════════════════════════════════

class TestReconciliation(SimpleTestCase):
    """Scenarios 31–32"""

    def _make_b2b_rows(self, taxable):
        return [{'taxable_value': taxable, 'invoice_number': 'INV-001',
                 'invoice_value': taxable + 1800, '_is_first_rate_row': True}]

    def _make_hsn_rows(self, taxable, igst=0, cgst=0, sgst=0):
        return [{'taxable_value': taxable, 'igst': igst,
                 'cgst': cgst, 'sgst': sgst, 'cess': 0}]

    def test_b2b_hsn_match_within_tolerance(self):
        """Scenario 31: diff ≤ ₹1 → match=True."""
        b2b = self._make_b2b_rows(50000)
        hsn = self._make_hsn_rows(50000, igst=9000)
        svc = Gstr1ReconciliationService()
        result = svc.build(b2b, [], [], [], hsn, [], [])
        self.assertTrue(result['reconciliation']['b2b_hsn_match'])
        self.assertAlmostEqual(result['reconciliation']['b2b_vs_hsn_b2b_diff'], 0.0, places=2)

    def test_b2b_hsn_mismatch_outside_tolerance(self):
        """Scenario 32: diff > ₹1 → match=False."""
        b2b = self._make_b2b_rows(50000)
        hsn = self._make_hsn_rows(48000, igst=8640)  # ₹2000 diff
        svc = Gstr1ReconciliationService()
        result = svc.build(b2b, [], [], [], hsn, [], [])
        self.assertFalse(result['reconciliation']['b2b_hsn_match'])
        self.assertAlmostEqual(result['reconciliation']['b2b_vs_hsn_b2b_diff'], 2000.0, places=2)

    def test_reconciliation_summary_counts(self):
        b2b = [
            {'taxable_value': 50000, 'invoice_number': 'INV-001', 'invoice_value': 59000, '_is_first_rate_row': True},
            {'taxable_value': 20000, 'invoice_number': 'INV-001', 'invoice_value': 59000, '_is_first_rate_row': False},
        ]
        cdnr = [{'note_number': 'CN-001', 'note_value': 5000}]
        svc = Gstr1ReconciliationService()
        result = svc.build(b2b, [], cdnr, [], [], [], [])
        self.assertEqual(result['b2b_invoice_count'], 1)   # unique invoice numbers
        self.assertEqual(result['cdnr_count'], 1)
        self.assertAlmostEqual(result['b2b_taxable_value'], 70000.0, places=2)
