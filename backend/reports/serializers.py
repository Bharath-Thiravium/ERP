from rest_framework import serializers
from finance.models import Quotation, PurchaseOrder, ProformaInvoice, Invoice


class QuotationReportSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    
    class Meta:
        model = Quotation
        fields = [
            'id', 'quotation_number', 'quotation_date', 'valid_until',
            'customer_name', 'customer_code', 'status', 'subtotal',
            'total_tax', 'total_amount', 'reference', 'gst_type',
            'created_at', 'updated_at'
        ]


class PurchaseOrderReportSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'internal_po_number', 'po_number', 'po_date',
            'customer_name', 'customer_code', 'status', 'subtotal',
            'total_tax', 'total_amount', 'reference', 'gst_type',
            'proforma_status', 'invoice_status', 'created_at', 'updated_at'
        ]


class ProformaInvoiceReportSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    po_number = serializers.CharField(source='purchase_order.internal_po_number', read_only=True, allow_null=True)
    
    class Meta:
        model = ProformaInvoice
        fields = [
            'id', 'proforma_number', 'proforma_date', 'due_date',
            'customer_name', 'customer_code', 'po_number', 'payment_status',
            'subtotal', 'total_tax', 'total_amount', 'paid_amount',
            'outstanding_amount', 'reference', 'gst_type', 'is_rejected',
            'created_at', 'updated_at'
        ]


class InvoiceReportSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_code = serializers.CharField(source='customer.customer_code', read_only=True)
    po_number = serializers.CharField(source='purchase_order.internal_po_number', read_only=True, allow_null=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'due_date',
            'customer_name', 'customer_code', 'po_number', 'payment_status',
            'subtotal', 'total_tax', 'total_amount', 'paid_amount',
            'outstanding_amount', 'reference', 'gst_type', 'is_rejected',
            'invoice_type', 'created_at', 'updated_at'
        ]
