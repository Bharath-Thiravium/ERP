"""
Phase 2 — Unit tests for Gstr1ClassificationService and Gstr1ValidationService.

Scenarios covered (12):
  1.  is_b2b — valid 15-char GSTIN + tax_invoice
  2.  is_b2b — empty GSTIN → False
  3.  is_b2cs — no GSTIN + tax_invoice → True
  4.  is_cdnr — GSTIN + credit_note → True
  5.  is_cdnra — amendment flag + original_document_number → True
  6.  resolve_pos — from place_of_supply field
  7.  resolve_pos — fallback to customer GSTIN prefix
  8.  resolve_pos — invalid code raises ValueError
  9.  get_invoice_type — intra-state IGST → INVOICE_TYPE_INTRA_IGST
  10. get_invoice_type — inter-state → Regular B2B
  11. map_uqc — known unit maps correctly
  12. map_uqc — unknown unit raises ValueError
  13. get_reverse_charge — True/False flag
  14. get_doc_nature — all three invoice types
  15. validate_all — missing company GSTIN → blocking error
  16. validate_all — invoice number > 16 chars → blocking error
  17. validate_all — duplicate invoice number → blocking error
  18. validate_all — invalid GSTIN format → blocking error
  19. validate_all — IGST invoice with CGST/SGST amounts → warning
  20. validate_all — invoice total mismatch → warning
  21. validate_all — missing HSN on item → blocking error
  22. validate_all — invalid GST rate → warning
"""
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from finance.gstr1_classification import Gstr1ClassificationService
from finance.gstr1_constants import (
    INVOICE_TYPE_REGULAR, INVOICE_TYPE_INTRA_IGST,
    DOC_NATURE_OUTWARD, DOC_NATURE_CREDIT, DOC_NATURE_DEBIT,
)
from finance.gstr1_validation import Gstr1ValidationService

from .tests_gstr1_fixtures import (
    COMPANY_GSTIN, CUSTOMER_GSTIN, INTRA_GSTIN,
    make_mock_invoice, _make_mock_item,
)

CLF = Gstr1ClassificationService
COMPANY_STATE = '27'


# ═══════════════════════════════════════════════════════════════════════════════
# Classification tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestIsB2B(SimpleTestCase):
    """Scenarios 1–2"""

    def test_valid_gstin_tax_invoice_is_b2b(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='tax_invoice')
        self.assertTrue(CLF.is_b2b(inv))

    def test_empty_gstin_not_b2b(self):
        inv = make_mock_invoice(customer_gstin='', invoice_type='tax_invoice')
        self.assertFalse(CLF.is_b2b(inv))

    def test_credit_note_not_b2b(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='credit_note')
        self.assertFalse(CLF.is_b2b(inv))


class TestIsB2CS(SimpleTestCase):
    """Scenario 3"""

    def test_no_gstin_tax_invoice_is_b2cs(self):
        inv = make_mock_invoice(customer_gstin='', invoice_type='tax_invoice')
        self.assertTrue(CLF.is_b2cs(inv))

    def test_gstin_present_not_b2cs(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='tax_invoice')
        self.assertFalse(CLF.is_b2cs(inv))


class TestIsCdnr(SimpleTestCase):
    """Scenario 4"""

    def test_gstin_credit_note_is_cdnr(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='credit_note')
        self.assertTrue(CLF.is_cdnr(inv))

    def test_gstin_debit_note_is_cdnr(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN, invoice_type='debit_note')
        self.assertTrue(CLF.is_cdnr(inv))

    def test_no_gstin_not_cdnr(self):
        inv = make_mock_invoice(customer_gstin='', invoice_type='credit_note')
        self.assertFalse(CLF.is_cdnr(inv))


class TestIsCdnra(SimpleTestCase):
    """Scenario 5"""

    def test_amendment_with_original_number_is_cdnra(self):
        inv = make_mock_invoice(
            customer_gstin=CUSTOMER_GSTIN,
            invoice_type='credit_note',
            is_amendment=True,
            original_document_number='INV-001',
        )
        self.assertTrue(CLF.is_cdnra(inv))

    def test_amendment_without_original_number_not_cdnra(self):
        inv = make_mock_invoice(
            customer_gstin=CUSTOMER_GSTIN,
            invoice_type='credit_note',
            is_amendment=True,
            original_document_number='',
        )
        self.assertFalse(CLF.is_cdnra(inv))

    def test_not_amendment_not_cdnra(self):
        inv = make_mock_invoice(
            customer_gstin=CUSTOMER_GSTIN,
            invoice_type='credit_note',
            is_amendment=False,
            original_document_number='INV-001',
        )
        self.assertFalse(CLF.is_cdnra(inv))


class TestResolvePos(SimpleTestCase):
    """Scenarios 6–8"""

    def test_pos_from_place_of_supply_field(self):
        inv = make_mock_invoice(place_of_supply='29')
        result = CLF.resolve_pos(inv, COMPANY_STATE)
        self.assertEqual(result, '29-Karnataka')

    def test_pos_fallback_to_customer_gstin_prefix(self):
        inv = make_mock_invoice(place_of_supply='', customer_gstin=CUSTOMER_GSTIN)
        result = CLF.resolve_pos(inv, COMPANY_STATE)
        self.assertEqual(result, '29-Karnataka')

    def test_pos_fallback_to_customer_state_code(self):
        inv = make_mock_invoice(place_of_supply='', customer_gstin='')
        inv.customer.state_code = '33'
        inv.customer.billing_state = ''
        result = CLF.resolve_pos(inv, COMPANY_STATE)
        self.assertEqual(result, '33-Tamil Nadu')

    def test_invalid_pos_raises_value_error(self):
        inv = make_mock_invoice(place_of_supply='99', customer_gstin='')
        inv.customer.state_code = ''
        inv.customer.billing_state = ''
        with self.assertRaises(ValueError):
            CLF.resolve_pos(inv, COMPANY_STATE)


class TestGetInvoiceType(SimpleTestCase):
    """Scenarios 9–10"""

    def test_intra_state_igst_returns_intra_igst_type(self):
        inv = make_mock_invoice(
            customer_gstin=INTRA_GSTIN,  # same state 27
            gst_type='igst',
            gst_supply_type='',
        )
        result = CLF.get_invoice_type(inv, COMPANY_STATE)
        self.assertEqual(result, INVOICE_TYPE_INTRA_IGST)

    def test_inter_state_returns_regular(self):
        inv = make_mock_invoice(
            customer_gstin=CUSTOMER_GSTIN,  # state 29
            gst_type='igst',
            gst_supply_type='',
        )
        result = CLF.get_invoice_type(inv, COMPANY_STATE)
        self.assertEqual(result, INVOICE_TYPE_REGULAR)

    def test_explicit_supply_type_overrides_derivation(self):
        inv = make_mock_invoice(gst_supply_type='SEZ supplies with payment')
        result = CLF.get_invoice_type(inv, COMPANY_STATE)
        self.assertEqual(result, 'SEZ supplies with payment')


class TestMapUqc(SimpleTestCase):
    """Scenarios 11–12"""

    def test_known_unit_maps_correctly(self):
        self.assertEqual(CLF.map_uqc('PCS'), 'PCS-PIECES')
        self.assertEqual(CLF.map_uqc('KGS'), 'KGS-KILOGRAMS')
        self.assertEqual(CLF.map_uqc('NOS'), 'NOS-NUMBERS')
        self.assertEqual(CLF.map_uqc('LTR'), 'LTR-LITRES')

    def test_case_insensitive_mapping(self):
        self.assertEqual(CLF.map_uqc('pcs'), 'PCS-PIECES')
        self.assertEqual(CLF.map_uqc('Kg'), 'KGS-KILOGRAMS')

    def test_service_unit_maps_to_oth(self):
        self.assertEqual(CLF.map_uqc('HRS'), 'OTH-OTHERS')
        self.assertEqual(CLF.map_uqc('SRV'), 'OTH-OTHERS')

    def test_unknown_unit_raises_value_error(self):
        with self.assertRaises(ValueError):
            CLF.map_uqc('XYZUNKNOWN')


class TestGetReverseCharge(SimpleTestCase):
    """Scenario 13"""

    def test_reverse_charge_true(self):
        inv = make_mock_invoice(reverse_charge=True)
        self.assertEqual(CLF.get_reverse_charge(inv), 'Y')

    def test_reverse_charge_false(self):
        inv = make_mock_invoice(reverse_charge=False)
        self.assertEqual(CLF.get_reverse_charge(inv), 'N')


class TestGetDocNature(SimpleTestCase):
    """Scenario 14"""

    def test_tax_invoice_nature(self):
        self.assertEqual(CLF.get_doc_nature('tax_invoice'), DOC_NATURE_OUTWARD)

    def test_credit_note_nature(self):
        self.assertEqual(CLF.get_doc_nature('credit_note'), DOC_NATURE_CREDIT)

    def test_debit_note_nature(self):
        self.assertEqual(CLF.get_doc_nature('debit_note'), DOC_NATURE_DEBIT)


# ═══════════════════════════════════════════════════════════════════════════════
# Validation tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidationMissingCompanyGstin(SimpleTestCase):
    """Scenario 15"""

    def test_missing_company_gstin_is_blocking(self):
        svc = Gstr1ValidationService()
        result = svc.validate_all([], '', '27')
        self.assertTrue(result.has_blocking)
        self.assertEqual(result.blocking[0].validation_field, 'Company GSTIN')

    def test_short_company_gstin_is_blocking(self):
        svc = Gstr1ValidationService()
        result = svc.validate_all([], '27AABCU', '27')
        self.assertTrue(result.has_blocking)


class TestValidationInvoiceNumber(SimpleTestCase):
    """Scenario 16"""

    def test_invoice_number_over_16_chars_is_blocking(self):
        inv = make_mock_invoice(invoice_number='INV-2024-TOOLONGNUM')  # 19 chars
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertIn('Invoice Number', fields)

    def test_invoice_number_exactly_16_chars_ok(self):
        inv = make_mock_invoice(invoice_number='INV-2024-0000001')  # 16 chars
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertNotIn('Invoice Number', fields)


class TestValidationDuplicate(SimpleTestCase):
    """Scenario 17"""

    def test_duplicate_invoice_number_is_blocking(self):
        inv1 = make_mock_invoice(invoice_number='INV-001')
        inv2 = make_mock_invoice(invoice_number='INV-001')
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv1, inv2], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertIn('Duplicate Invoice', fields)


class TestValidationGstinFormat(SimpleTestCase):
    """Scenario 18"""

    def test_invalid_gstin_format_is_blocking(self):
        inv = make_mock_invoice(customer_gstin='INVALIDGSTIN123')
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertIn('Customer GSTIN', fields)

    def test_valid_gstin_format_no_error(self):
        inv = make_mock_invoice(customer_gstin=CUSTOMER_GSTIN)
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertNotIn('Customer GSTIN', fields)


class TestValidationTaxCombination(SimpleTestCase):
    """Scenario 19"""

    def test_igst_invoice_with_cgst_sgst_is_warning(self):
        inv = make_mock_invoice(
            gst_type='igst',
            igst=Decimal('9000'), cgst=Decimal('4500'), sgst=Decimal('4500'),
        )
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertIn('Tax Combination', fields)

    def test_cgst_sgst_invoice_with_igst_is_warning(self):
        inv = make_mock_invoice(
            gst_type='cgst_sgst',
            igst=Decimal('9000'), cgst=Decimal('0'), sgst=Decimal('0'),
        )
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertIn('Tax Combination', fields)


class TestValidationTotalMismatch(SimpleTestCase):
    """Scenario 20"""

    def test_total_mismatch_beyond_tolerance_is_warning(self):
        # subtotal=50000, igst=9000, total should be 59000 but we set 60000
        inv = make_mock_invoice(subtotal=50000, igst=9000, total=60000)
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertIn('Invoice Total Mismatch', fields)

    def test_total_within_tolerance_no_warning(self):
        inv = make_mock_invoice(subtotal=50000, igst=9000, total=59000)
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertNotIn('Invoice Total Mismatch', fields)


class TestValidationMissingHsn(SimpleTestCase):
    """Scenario 21"""

    def test_missing_hsn_on_item_is_blocking(self):
        item = _make_mock_item(hsn='')
        inv = make_mock_invoice(items=[item])
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertIn('HSN/SAC', fields)

    def test_present_hsn_no_error(self):
        item = _make_mock_item(hsn='8471')
        inv = make_mock_invoice(items=[item])
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.blocking]
        self.assertNotIn('HSN/SAC', fields)


class TestValidationGstRate(SimpleTestCase):
    """Scenario 22"""

    def test_invalid_gst_rate_is_warning(self):
        item = _make_mock_item(gst_rate=17)  # 17% is not a valid GST rate
        inv = make_mock_invoice(items=[item])
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertIn('GST Rate', fields)

    def test_valid_gst_rate_no_warning(self):
        item = _make_mock_item(gst_rate=18)
        inv = make_mock_invoice(items=[item])
        svc = Gstr1ValidationService()
        result = svc.validate_all([inv], COMPANY_GSTIN, '27')
        fields = [i.validation_field for i in result.warnings]
        self.assertNotIn('GST Rate', fields)
