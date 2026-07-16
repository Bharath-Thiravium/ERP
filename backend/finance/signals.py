"""
Finance app signals for maintaining data consistency
"""

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.utils import timezone
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


@receiver(post_delete, sender='finance.Invoice')
def update_po_on_invoice_delete(sender, instance, **kwargs):
    """
    Update Purchase Order claimed amounts when an invoice is deleted
    """
    try:
        # Only process if invoice was linked to a PO
        if not instance.purchase_order:
            return
        
        po = instance.purchase_order
        logger.info(f"Recalculating PO {po.internal_po_number} after invoice {instance.invoice_number} deletion")
        
        # Recalculate proforma claimed amount
        proforma_total = sum(
            pi.subtotal for pi in po.proforma_invoices.all()
        ) or Decimal('0')
        
        # Recalculate invoice claimed amount (excluding the deleted one, which is already removed from queryset)
        invoice_total = sum(
            inv.total_amount for inv in po.invoices.all()
        ) or Decimal('0')
        
        # Update PO fields
        po.proforma_claimed_amount = proforma_total
        po.invoice_claimed_amount = invoice_total
        
        # Recalculate remaining balances
        po.remaining_proforma_balance = po.subtotal - proforma_total
        po.remaining_invoice_balance = po.total_amount - invoice_total
        
        # Update status based on remaining balance
        if po.remaining_invoice_balance <= 0:
            po.invoice_status = 'completed'
        elif invoice_total > 0:
            po.invoice_status = 'partial'
        else:
            po.invoice_status = 'not_started'
        
        # Update proforma status
        if po.remaining_proforma_balance <= 0:
            po.proforma_status = 'completed'
        elif proforma_total > 0:
            po.proforma_status = 'partial'
        else:
            po.proforma_status = 'not_started'
        
        po.save(update_fields=[
            'proforma_claimed_amount', 'invoice_claimed_amount',
            'remaining_proforma_balance', 'remaining_invoice_balance',
            'invoice_status', 'proforma_status'
        ])
        
        logger.info(f"Successfully updated PO {po.internal_po_number}: "
                   f"Invoice claimed: {invoice_total}, Remaining: {po.remaining_invoice_balance}")
        
    except Exception as e:
        logger.error(f"Error updating PO after invoice deletion: {str(e)}")


@receiver(post_delete, sender='finance.ProformaInvoice')
def update_po_on_proforma_delete(sender, instance, **kwargs):
    """
    Update Purchase Order claimed amounts when a proforma invoice is deleted
    """
    try:
        # Only process if proforma was linked to a PO
        if not instance.purchase_order:
            return
        
        po = instance.purchase_order
        logger.info(f"Recalculating PO {po.internal_po_number} after proforma {instance.proforma_number} deletion")
        
        # Recalculate proforma claimed amount (excluding the deleted one)
        proforma_total = sum(
            pi.subtotal for pi in po.proforma_invoices.all()
        ) or Decimal('0')
        
        # Recalculate invoice claimed amount
        invoice_total = sum(
            inv.total_amount for inv in po.invoices.all()
        ) or Decimal('0')
        
        # Update PO fields
        po.proforma_claimed_amount = proforma_total
        po.invoice_claimed_amount = invoice_total
        
        # Recalculate remaining balances
        po.remaining_proforma_balance = po.subtotal - proforma_total
        po.remaining_invoice_balance = po.total_amount - invoice_total
        
        # Update proforma status
        if po.remaining_proforma_balance <= 0:
            po.proforma_status = 'completed'
        elif proforma_total > 0:
            po.proforma_status = 'partial'
        else:
            po.proforma_status = 'not_started'
        
        # Update invoice status
        if po.remaining_invoice_balance <= 0:
            po.invoice_status = 'completed'
        elif invoice_total > 0:
            po.invoice_status = 'partial'
        else:
            po.invoice_status = 'not_started'
        
        po.save(update_fields=[
            'proforma_claimed_amount', 'invoice_claimed_amount',
            'remaining_proforma_balance', 'remaining_invoice_balance',
            'invoice_status', 'proforma_status'
        ])
        
        logger.info(f"Successfully updated PO {po.internal_po_number}: "
                   f"Proforma claimed: {proforma_total}, Remaining: {po.remaining_proforma_balance}")
        
    except Exception as e:
        logger.error(f"Error updating PO after proforma deletion: {str(e)}")


@receiver(post_save, sender='finance.Invoice')
def update_po_on_invoice_save(sender, instance, created, **kwargs):
    """
    Update Purchase Order claimed amounts when an invoice is created or updated
    """
    try:
        # Only process if invoice is linked to a PO
        if not instance.purchase_order:
            return
        
        # Skip if this is being called from within the PO update to avoid recursion
        if hasattr(instance, '_skip_po_update'):
            return
        
        po = instance.purchase_order
        
        # Recalculate invoice claimed amount
        invoice_total = sum(
            inv.total_amount for inv in po.invoices.all()
        ) or Decimal('0')
        
        # Update PO fields
        po.invoice_claimed_amount = invoice_total
        po.remaining_invoice_balance = po.total_amount - invoice_total
        
        # Update invoice status
        if po.remaining_invoice_balance <= 0:
            po.invoice_status = 'completed'
        elif invoice_total > 0:
            po.invoice_status = 'partial'
        else:
            po.invoice_status = 'not_started'
        
        po.save(update_fields=[
            'invoice_claimed_amount', 'remaining_invoice_balance', 'invoice_status'
        ])
        
        if created:
            logger.info(f"Updated PO {po.internal_po_number} after invoice {instance.invoice_number} creation")
        
    except Exception as e:
        logger.error(f"Error updating PO after invoice save: {str(e)}")


@receiver(post_delete, sender='finance.Payment')
def recalculate_invoice_on_payment_delete(sender, instance, **kwargs):
    """
    Recalculate invoice/proforma paid_amount and outstanding_amount after a Payment is deleted.
    This handles both single-instance delete() and queryset bulk delete(), since the
    Payment.delete() override is bypassed by queryset.delete().
    """
    try:
        invoice = instance.invoice
        proforma_invoice = instance.proforma_invoice

        def calc_paid(payments_qs, invoice_obj=None):
            total = Decimal('0')
            for p in payments_qs.filter(status='completed'):
                if getattr(p, 'payment_type', None) == 'tds_only':
                    total += Decimal(str(p.tds_amount or 0))
                    continue
                net = Decimal(str(p.net_amount_received or 0))
                tds = Decimal(str(p.tds_amount or 0))
                if tds > 0:
                    total += net + (tds if p.tds_certificate_received else Decimal('0'))
                else:
                    total += Decimal(str(p.gross_payment_amount or p.amount or 0))
            return total

        if invoice:
            total_paid = calc_paid(invoice.payments, invoice)
            invoice_total = Decimal(str(invoice.total_amount or 0))
            invoice.paid_amount = total_paid
            invoice.outstanding_amount = invoice_total - total_paid
            if invoice.outstanding_amount <= 0:
                invoice.payment_status = 'paid'
            elif total_paid > 0:
                invoice.payment_status = 'partially_paid'
            else:
                invoice.payment_status = 'unpaid'
            if (invoice.payment_status == 'unpaid' and
                    invoice.due_date and invoice.due_date < timezone.now().date()):
                invoice.payment_status = 'overdue'
            last_payment = invoice.payments.filter(status='completed').order_by('-payment_date').first()
            invoice.last_payment_date = last_payment.payment_date if last_payment else None
            invoice.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status', 'last_payment_date'])

        elif proforma_invoice:
            total_paid = calc_paid(proforma_invoice.payments)
            proforma_total = Decimal(str(proforma_invoice.total_amount or 0))
            proforma_invoice.paid_amount = total_paid
            proforma_invoice.outstanding_amount = proforma_total - total_paid
            if abs(proforma_invoice.outstanding_amount) <= Decimal('0.01'):
                proforma_invoice.payment_status = 'paid'
            elif total_paid > 0:
                proforma_invoice.payment_status = 'partially_paid'
            else:
                proforma_invoice.payment_status = 'unpaid'
            last_payment = proforma_invoice.payments.filter(status='completed').order_by('-payment_date').first()
            proforma_invoice.last_payment_date = last_payment.payment_date if last_payment else None
            proforma_invoice.save(update_fields=['paid_amount', 'outstanding_amount', 'payment_status', 'last_payment_date'])

    except Exception as e:
        logger.error(f"Error recalculating invoice after payment deletion: {str(e)}")


@receiver(post_save, sender='finance.ProformaInvoice')
def update_po_on_proforma_save(sender, instance, created, **kwargs):
    """
    Update Purchase Order claimed amounts when a proforma invoice is created or updated
    """
    try:
        # Only process if proforma is linked to a PO
        if not instance.purchase_order:
            return
        
        # Skip if this is being called from within the PO update to avoid recursion
        if hasattr(instance, '_skip_po_update'):
            return
        
        po = instance.purchase_order
        
        # Recalculate proforma claimed amount
        proforma_total = sum(
            pi.subtotal for pi in po.proforma_invoices.all()
        ) or Decimal('0')
        
        # Update PO fields
        po.proforma_claimed_amount = proforma_total
        po.remaining_proforma_balance = po.subtotal - proforma_total
        
        # Update proforma status
        if po.remaining_proforma_balance <= 0:
            po.proforma_status = 'completed'
        elif proforma_total > 0:
            po.proforma_status = 'partial'
        else:
            po.proforma_status = 'not_started'
        
        po.save(update_fields=[
            'proforma_claimed_amount', 'remaining_proforma_balance', 'proforma_status'
        ])
        
        if created:
            logger.info(f"Updated PO {po.internal_po_number} after proforma {instance.proforma_number} creation")
        
    except Exception as e:
        logger.error(f"Error updating PO after proforma save: {str(e)}")
