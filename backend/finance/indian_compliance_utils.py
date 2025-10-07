"""
Indian Compliance Utility Functions
"""

def get_gst_rate_breakdown(invoices):
    """Get GST rate wise breakdown for invoices"""
    breakdown = {}
    for invoice in invoices:
        rate = invoice.gst_rate or 0
        if rate not in breakdown:
            breakdown[rate] = {
                'taxable_value': 0,
                'tax_amount': 0,
                'invoice_count': 0
            }
        
        breakdown[rate]['taxable_value'] += float(invoice.subtotal)
        breakdown[rate]['tax_amount'] += float((invoice.igst_amount or 0) + (invoice.cgst_amount or 0) + (invoice.sgst_amount or 0))
        breakdown[rate]['invoice_count'] += 1
    
    return breakdown