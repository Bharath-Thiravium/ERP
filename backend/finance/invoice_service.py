"""
Refactored Invoice Service Module
Handles all invoice creation, shipping address management, and PDF generation
"""

from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from .models import (
    Invoice, InvoiceItem, Customer, CustomerShippingAddress, 
    PurchaseOrder, Quotation, Product, Company
)
from authentication.models import CompanyServiceUser
import logging
from types import SimpleNamespace

logger = logging.getLogger(__name__)


class InvoiceShippingAddressManager:
    """Manages shipping address logic for invoices"""
    
    @staticmethod
    def get_shipping_address_for_invoice(customer, purchase_order=None, quotation=None, shipping_address_id=None):
        """
        Determine the correct shipping address for an invoice
        Priority: shipping_address_id > PO shipping > Quotation shipping > Customer default > Customer billing
        """
        try:
            # 1. If specific shipping address ID provided, use it
            if shipping_address_id:
                try:
                    return CustomerShippingAddress.objects.get(
                        id=shipping_address_id,
                        customer=customer
                    )
                except CustomerShippingAddress.DoesNotExist:
                    logger.warning(f"Shipping address {shipping_address_id} not found for customer {customer.id}")
            
            # 2. If created from PO and PO has shipping address, use it
            if purchase_order and purchase_order.shipping_address:
                return purchase_order.shipping_address
            
            # 3. If created from quotation and quotation has shipping address, use it
            if quotation and quotation.shipping_address:
                return quotation.shipping_address
            
            # 4. Use customer's default shipping address
            default_shipping = customer.shipping_addresses.filter(is_default=True).first()
            if default_shipping:
                return default_shipping
            
            # 5. Use customer's first shipping address
            first_shipping = customer.shipping_addresses.first()
            if first_shipping:
                return first_shipping
            
            # 6. Return None - will fall back to customer's main shipping address
            return None
            
        except Exception as e:
            logger.error(f"Error determining shipping address: {str(e)}")
            return None
    
    @staticmethod
    def get_formatted_shipping_address(invoice):
        """Get formatted shipping address for invoice display with proper priority logic"""
        # Priority 1: Invoice's specific shipping address
        if invoice.shipping_address:
            return {
                'type': 'specific',
                'label': invoice.shipping_address.label,
                'address': invoice.shipping_address.full_address,
                'is_default': invoice.shipping_address.is_default
            }
        
        # Priority 2: PO's shipping address (if invoice created from PO)
        try:
            if invoice.purchase_order and invoice.purchase_order.shipping_address:
                return {
                    'type': 'po_shipping',
                    'label': invoice.purchase_order.shipping_address.label,
                    'address': invoice.purchase_order.shipping_address.full_address,
                    'is_default': invoice.purchase_order.shipping_address.is_default
                }
        except Exception:
            pass
        
        # Priority 3: Quotation's shipping address (if invoice created from quotation)
        try:
            if invoice.quotation and invoice.quotation.shipping_address:
                return {
                    'type': 'quotation_shipping',
                    'label': invoice.quotation.shipping_address.label,
                    'address': invoice.quotation.shipping_address.full_address,
                    'is_default': invoice.quotation.shipping_address.is_default
                }
        except Exception:
            pass
        
        # Priority 4: Fall back to billing address
        return {
            'type': 'billing_fallback',
            'label': 'Billing Address (Default)',
            'address': invoice.customer.full_billing_address,
            'is_default': True
        }


class InvoiceCreationService:
    """Handles invoice creation with proper shipping address management"""
    
    def __init__(self):
        self.shipping_manager = InvoiceShippingAddressManager()
    
    def create_invoice_from_po(self, purchase_order, invoice_data, created_by_user):
        """Create invoice from Purchase Order with proper shipping address handling"""
        try:
            with transaction.atomic():
                # Determine shipping address
                shipping_address = self.shipping_manager.get_shipping_address_for_invoice(
                    customer=purchase_order.customer,
                    purchase_order=purchase_order,
                    shipping_address_id=invoice_data.get('shipping_address_id')
                )
                
                # Get claim information
                claim_percentage = invoice_data.get('claim_percentage', Decimal('100'))
                claim_method = invoice_data.get('claim_type', 'percentage')  # 'percentage' or 'as_per_unit'
                
                # Create invoice
                invoice = Invoice.objects.create(
                    company=purchase_order.company,
                    customer=purchase_order.customer,
                    purchase_order=purchase_order,
                    shipping_address=shipping_address,
                    invoice_date=invoice_data.get('invoice_date', timezone.now().date()),
                    due_date=invoice_data.get('due_date'),
                    reference=invoice_data.get('reference', purchase_order.reference),
                    gst_type=purchase_order.gst_type,
                    customer_gstin=purchase_order.customer_gstin,
                    company_gstin=purchase_order.company_gstin,
                    discount_percentage=invoice_data.get('discount_percentage', purchase_order.discount_percentage),
                    discount_amount=invoice_data.get('discount_amount', purchase_order.discount_amount),
                    shipping_charges=invoice_data.get('shipping_charges', purchase_order.shipping_charges),
                    other_charges=invoice_data.get('other_charges', purchase_order.other_charges),
                    notes=invoice_data.get('notes', purchase_order.notes),
                    terms_and_conditions=invoice_data.get('terms_and_conditions', purchase_order.terms_and_conditions),
                    created_by=created_by_user,
                    claim_percentage=claim_percentage,
                    claim_method=claim_method
                )
                
                # Create invoice items from PO items
                self._create_invoice_items_from_po(invoice, purchase_order, invoice_data)
                
                # Calculate totals
                invoice.calculate_totals()
                
                # Update PO balance tracking
                purchase_order.update_balance_tracking()
                
                logger.info(f"Invoice {invoice.invoice_number} created from PO {purchase_order.internal_po_number}")
                return invoice
                
        except Exception as e:
            logger.error(f"Error creating invoice from PO: {str(e)}")
            raise
    
    def create_invoice_from_quotation(self, quotation, invoice_data, created_by_user):
        """Create invoice from Quotation with proper shipping address handling"""
        try:
            with transaction.atomic():
                # Determine shipping address
                shipping_address = self.shipping_manager.get_shipping_address_for_invoice(
                    customer=quotation.customer,
                    quotation=quotation,
                    shipping_address_id=invoice_data.get('shipping_address_id')
                )
                
                # Create invoice
                invoice = Invoice.objects.create(
                    company=quotation.company,
                    customer=quotation.customer,
                    quotation=quotation,
                    shipping_address=shipping_address,
                    invoice_date=invoice_data.get('invoice_date', timezone.now().date()),
                    due_date=invoice_data.get('due_date'),
                    reference=invoice_data.get('reference', quotation.reference),
                    gst_type=quotation.gst_type,
                    customer_gstin=quotation.customer_gstin,
                    company_gstin=quotation.company_gstin,
                    discount_percentage=invoice_data.get('discount_percentage', quotation.discount_percentage),
                    discount_amount=invoice_data.get('discount_amount', quotation.discount_amount),
                    shipping_charges=invoice_data.get('shipping_charges', quotation.shipping_charges),
                    other_charges=invoice_data.get('other_charges', quotation.other_charges),
                    notes=invoice_data.get('notes', quotation.notes),
                    terms_and_conditions=invoice_data.get('terms_and_conditions', quotation.terms_and_conditions),
                    created_by=created_by_user
                )
                
                # Create invoice items from quotation items
                self._create_invoice_items_from_quotation(invoice, quotation, invoice_data)
                
                # Calculate totals
                invoice.calculate_totals()
                
                # Update quotation balance tracking
                quotation.update_balance_tracking()
                
                logger.info(f"Invoice {invoice.invoice_number} created from quotation {quotation.quotation_number}")
                return invoice
                
        except Exception as e:
            logger.error(f"Error creating invoice from quotation: {str(e)}")
            raise
    
    def create_direct_invoice(self, customer, invoice_data, created_by_user):
        """Create direct invoice with proper shipping address handling"""
        try:
            with transaction.atomic():
                # Determine shipping address
                shipping_address = self.shipping_manager.get_shipping_address_for_invoice(
                    customer=customer,
                    shipping_address_id=invoice_data.get('shipping_address_id')
                )
                
                # Determine GST type
                gst_type = self._determine_gst_type(customer, created_by_user.company)
                
                # Create invoice
                invoice = Invoice.objects.create(
                    company=created_by_user.company,
                    customer=customer,
                    shipping_address=shipping_address,
                    invoice_date=invoice_data.get('invoice_date', timezone.now().date()),
                    due_date=invoice_data.get('due_date'),
                    reference=invoice_data.get('reference', ''),
                    gst_type=gst_type,
                    customer_gstin=customer.gstin or '',
                    company_gstin=getattr(created_by_user.company, 'gst_number', '') or '',
                    discount_percentage=invoice_data.get('discount_percentage', Decimal('0')),
                    discount_amount=invoice_data.get('discount_amount', Decimal('0')),
                    shipping_charges=invoice_data.get('shipping_charges', Decimal('0')),
                    other_charges=invoice_data.get('other_charges', Decimal('0')),
                    notes=invoice_data.get('notes', ''),
                    terms_and_conditions=invoice_data.get('terms_and_conditions', ''),
                    created_by=created_by_user
                )
                
                # Create invoice items
                self._create_invoice_items_direct(invoice, invoice_data.get('items', []))
                
                # Calculate totals
                invoice.calculate_totals()
                
                logger.info(f"Direct invoice {invoice.invoice_number} created for customer {customer.name}")
                return invoice
                
        except Exception as e:
            logger.error(f"Error creating direct invoice: {str(e)}")
            raise
    
    def _create_invoice_items_from_po(self, invoice, purchase_order, invoice_data):
        """Create invoice items from PO items"""
        claim_percentage = invoice_data.get('claim_percentage', Decimal('100'))
        claim_type = invoice_data.get('claim_type', 'percentage')  # 'percentage' or 'as_per_unit'
        
        for po_item in purchase_order.po_items.all():
            # Calculate claimed quantity/amount based on percentage
            claimed_quantity = (po_item.quantity * claim_percentage) / Decimal('100')
            claimed_amount = (po_item.line_total * claim_percentage) / Decimal('100')
            claimed_unit_price = claimed_amount / claimed_quantity if claimed_quantity > 0 else po_item.unit_price
            
            # Determine display value for claimed quantity
            if claim_type == 'percentage':
                claimed_display = f"{claim_percentage}%"
            else:
                claimed_display = f"{claimed_quantity} {po_item.unit}"
            
            InvoiceItem.objects.create(
                invoice=invoice,
                product=po_item.product,
                product_name=po_item.product_name,
                product_code=po_item.product_code,
                description=po_item.description,
                hsn_sac_code=po_item.hsn_sac_code,
                quantity=claimed_quantity,
                unit=po_item.unit,
                unit_price=claimed_unit_price,
                line_total=claimed_amount,
                gst_rate=po_item.gst_rate,
                line_number=po_item.line_number,
                po_item=po_item,
                claimed_quantity_display=claimed_display,
                claim_type=claim_type
            )
    
    def _create_invoice_items_from_quotation(self, invoice, quotation, invoice_data):
        """Create invoice items from quotation items"""
        claim_percentage = invoice_data.get('claim_percentage', Decimal('100'))
        
        for quotation_item in quotation.quotation_items.all():
            # Calculate claimed quantity/amount based on percentage
            claimed_quantity = (quotation_item.quantity * claim_percentage) / Decimal('100')
            claimed_amount = (quotation_item.line_total * claim_percentage) / Decimal('100')
            claimed_unit_price = claimed_amount / claimed_quantity if claimed_quantity > 0 else quotation_item.unit_price
            
            InvoiceItem.objects.create(
                invoice=invoice,
                product=quotation_item.product,
                product_name=quotation_item.product_name,
                product_code=quotation_item.product_code,
                description=quotation_item.description,
                hsn_sac_code=quotation_item.hsn_sac_code,
                quantity=claimed_quantity,
                unit=quotation_item.unit,
                unit_price=claimed_unit_price,
                line_total=claimed_amount,
                gst_rate=quotation_item.gst_rate,
                line_number=quotation_item.line_number
            )
    
    def _create_invoice_items_direct(self, invoice, items_data):
        """Create invoice items for direct invoice"""
        for index, item_data in enumerate(items_data, 1):
            try:
                product = Product.objects.get(id=item_data['product_id'])
                quantity = Decimal(str(item_data['quantity']))
                unit_price = Decimal(str(item_data['unit_price']))
                
                InvoiceItem.objects.create(
                    invoice=invoice,
                    product=product,
                    product_name=product.name,
                    product_code=product.product_code,
                    description=product.description,
                    hsn_sac_code=product.hsn_code.code if product.hsn_code else (product.sac_code.code if product.sac_code else ''),
                    quantity=quantity,
                    unit=product.unit_ref.code if product.unit_ref else product.unit,
                    unit_price=unit_price,
                    line_total=quantity * unit_price,
                    gst_rate=product.gst_rate,
                    line_number=index
                )
            except Product.DoesNotExist:
                logger.error(f"Product {item_data['product_id']} not found")
                raise
    
    def _determine_gst_type(self, customer, company):
        """Determine GST type based on customer and company GSTIN"""
        if customer.gstin and hasattr(company, 'gst_number') and company.gst_number:
            customer_state_code = customer.gstin[:2]
            company_state_code = company.gst_number[:2]
            
            if customer_state_code == company_state_code:
                return 'cgst_sgst'  # Same state - CGST + SGST
            else:
                return 'igst'  # Different state - IGST
        else:
            return 'exempt'  # No GST if either party doesn't have GSTIN


class InvoicePDFService:
    """Enhanced PDF service with proper shipping address handling"""
    
    def __init__(self):
        self.shipping_manager = InvoiceShippingAddressManager()
    
    def prepare_invoice_context(self, invoice, template_code='BKGE'):
        """Prepare context for invoice PDF generation with proper shipping address"""
        try:
            # Get shipping address information
            shipping_info = self.shipping_manager.get_formatted_shipping_address(invoice)
            
            # Prepare context
            context = {
                'invoice': invoice,
                'company': invoice.company,
                'customer': invoice.customer,
                'items': self._get_invoice_items(invoice),
                'invoice_items': self._get_invoice_items(invoice),
                'shipping_info': shipping_info,
                'has_specific_shipping': invoice.shipping_address is not None,
                'company_gstin': getattr(invoice, 'company_gstin', None) or getattr(invoice.company, 'gst_number', ''),
                'logo_path': self._get_logo_path(invoice.company),
                'logo_url': self._get_logo_url(invoice.company),
                'billing_address': {
                    'address': invoice.customer.full_billing_address,
                    'gstin': invoice.customer.gstin,
                    'phone': invoice.customer.phone,
                    'email': invoice.customer.email
                }
            }
            
            # Add calculated fields
            context.update({
                'subtotal_before_discount': invoice.subtotal + invoice.discount_amount if invoice.discount_amount > 0 else invoice.subtotal,
                'has_taxes': invoice.total_tax > 0,
                'has_discount': invoice.discount_amount > 0,
                'has_shipping': invoice.shipping_charges > 0,
                'has_other_charges': invoice.other_charges > 0,
                'reference_details': self._get_reference_details(invoice),
            })
            
            return context
            
        except Exception as e:
            logger.error(f"Error preparing invoice context: {str(e)}")
            raise
    
    def _get_reference_details(self, invoice):
        """Build reference details from linked Quotation, PO, and previous invoices"""
        details = {
            'manual_reference': getattr(invoice, 'reference', '') or '',
            'quotation': None,
            'purchase_order': None,
            'previous_invoices': [],
        }
        try:
            # Access purchase_order safely
            po = None
            try:
                po = invoice.purchase_order
            except Exception:
                po = None

            # Access quotation safely
            qt = None
            try:
                qt = invoice.quotation
            except Exception:
                qt = None

            if qt:
                details['quotation'] = {
                    'number': qt.quotation_number,
                    'date': qt.quotation_date,
                    'valid_until': qt.valid_until,
                    'total_amount': qt.total_amount,
                    'status': qt.status,
                    'reference': qt.reference,
                }
            if po:
                details['purchase_order'] = {
                    'po_number': po.po_number,
                    'internal_po_number': po.internal_po_number,
                    'po_date': po.po_date,
                    'total_amount': po.total_amount,
                    'status': po.status,
                    'remaining_invoice_balance': po.remaining_invoice_balance,
                }
            # Previous invoices from same PO or Quotation (excluding current)
            prev_qs = None
            if po:
                prev_qs = po.invoices.exclude(id=invoice.id).filter(is_rejected=False)
            elif qt:
                prev_qs = qt.invoices.exclude(id=invoice.id).filter(is_rejected=False)
            if prev_qs is not None:
                details['previous_invoices'] = [
                    {
                        'invoice_number': inv.invoice_number,
                        'invoice_date': inv.invoice_date,
                        'total_amount': inv.total_amount,
                        'payment_status': inv.payment_status,
                        'paid_amount': inv.paid_amount,
                        'outstanding_amount': inv.outstanding_amount,
                    }
                    for inv in prev_qs.order_by('invoice_date')
                ]
        except Exception as e:
            logger.error(f"Error building reference_details for invoice {getattr(invoice, 'invoice_number', '?')}: {str(e)}")
        return details

    def _get_logo_path(self, company):
        from finance.logo_utils import get_logo_file_path
        return get_logo_file_path(company)

    def _get_logo_url(self, company):
        from finance.logo_utils import get_absolute_logo_url
        return get_absolute_logo_url(company)

    def _get_invoice_items(self, invoice):
        """Get invoice items with proper ordering, handling both real and mock objects"""
        try:
            items = invoice.invoice_items.all()
            # Check if it's a queryset (real object) or list (mock)
            if hasattr(items, 'order_by'):
                return items.order_by('line_number')
            else:
                # For mock objects, sort by line_number if available
                return sorted(items, key=lambda x: getattr(x, 'line_number', 0))
        except AttributeError:
            # Fallback for mock objects
            return getattr(invoice, 'invoice_items', SimpleNamespace(all=lambda: []))().all()


class InvoiceQueryService:
    """Service for querying invoices with shipping address information"""
    
    @staticmethod
    def get_invoice_with_shipping_details(invoice_id, company):
        """Get invoice with all shipping address details"""
        try:
            invoice = Invoice.objects.select_related(
                'customer', 'shipping_address', 'purchase_order', 'quotation', 'company', 'created_by'
            ).prefetch_related(
                'invoice_items__product',
                'customer__shipping_addresses'
            ).get(id=invoice_id, company=company)
            
            return invoice
            
        except Invoice.DoesNotExist:
            logger.error(f"Invoice {invoice_id} not found for company {company.id}")
            return None
    
    @staticmethod
    def get_invoices_for_company(company):
        """Get all invoices for company with shipping address details"""
        return Invoice.objects.filter(company=company).select_related(
            'customer', 'shipping_address', 'purchase_order', 'quotation', 'created_by'
        ).prefetch_related(
            'invoice_items__product',
            'customer__shipping_addresses'
        ).order_by('-created_at')


# Global service instances
invoice_creation_service = InvoiceCreationService()
invoice_pdf_service = InvoicePDFService()
invoice_query_service = InvoiceQueryService()