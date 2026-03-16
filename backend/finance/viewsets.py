from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.core.paginator import InvalidPage
from django.db.models import Q, Sum
from django.utils import timezone
from datetime import timedelta
import logging

from common.viewsets import CompanyScopedModelViewSet
from .models import Customer, Product, Quotation, PurchaseOrder, ProformaInvoice, Invoice, Payment, CustomerShippingAddress
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerCreateSerializer, CustomerUpdateSerializer,
    CustomerShippingAddressSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    QuotationListSerializer, QuotationDetailSerializer,
    QuotationCreateSerializer, QuotationUpdateSerializer,
    PurchaseOrderListSerializer, PurchaseOrderDetailSerializer,
    PurchaseOrderCreateSerializer, PurchaseOrderUpdateSerializer,
    ProformaInvoiceListSerializer, ProformaInvoiceDetailSerializer,
    ProformaInvoiceCreateSerializer, ProformaInvoiceUpdateSerializer,
    InvoiceListSerializer, InvoiceDetailSerializer,
    InvoiceCreateSerializer, InvoiceUpdateSerializer,
    PaymentListSerializer, PaymentDetailSerializer,
    PaymentCreateSerializer, PaymentUpdateSerializer,
)

logger = logging.getLogger(__name__)


class FinancePagination(PageNumberPagination):
    """Allow clients to request page sizes and gracefully handle stale page numbers."""
    page_size_query_param = 'page_size'
    max_page_size = 1000

    def paginate_queryset(self, queryset, request, view=None):
        page_size = self.get_page_size(request)
        if not page_size:
            return None

        paginator = self.django_paginator_class(queryset, page_size)
        page_number = self.get_page_number(request, paginator)

        try:
            self.page = paginator.page(page_number)
        except InvalidPage:
            # If no pages exist (empty queryset), return empty page
            if paginator.num_pages == 0:
                self.page = paginator.page(1)
            else:
                # If the client asks for a page that no longer exists, serve the last page
                self.page = paginator.page(paginator.num_pages)

        self.request = request
        if paginator.num_pages > 1 and self.template is not None:
            self.display_page_controls = True

        return list(self.page)


class CustomerViewSet(CompanyScopedModelViewSet):
    """Customer management with centralized tenant enforcement"""
    queryset = Customer.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CustomerUpdateSerializer
        elif self.action == 'retrieve':
            return CustomerDetailSerializer
        return CustomerListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Add search functionality
        search = self.request.query_params.get('search', '').strip()
        if search and len(search) <= 100:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(customer_code__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search) |
                Q(gstin__icontains=search) |
                Q(pan_number__icontains=search)
            )

        # Add filtering
        customer_type = self.request.query_params.get('customer_type', '')
        if customer_type:
            queryset = queryset.filter(customer_type=customer_type)

        is_active = self.request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'], url_path='shipping-addresses/(?P<address_id>[^/.]+)')
    def get_shipping_address(self, request, pk=None, address_id=None):
        """Get a specific shipping address for a customer"""
        customer = self.get_object()  # Uses tenant filtering
        
        try:
            shipping_address = customer.shipping_addresses.get(id=address_id)
            serializer = CustomerShippingAddressSerializer(shipping_address)
            return Response(serializer.data)
        except CustomerShippingAddress.DoesNotExist:
            return Response(
                {'error': 'Shipping address not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class ProductViewSet(CompanyScopedModelViewSet):
    """Product management with centralized tenant enforcement"""
    queryset = Product.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProductUpdateSerializer
        elif self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Add search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(product_code__icontains=search) |
                Q(description__icontains=search) |
                Q(hsn_code__code__icontains=search) |
                Q(sac_code__code__icontains=search) |
                Q(hsn_code__description__icontains=search) |
                Q(sac_code__service_name__icontains=search)
            )

        # Add filtering
        product_type = self.request.query_params.get('product_type', '')
        if product_type:
            queryset = queryset.filter(product_type=product_type)

        is_active = self.request.query_params.get('is_active', '')
        if is_active:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search products for quotation forms"""
        search = request.query_params.get('search', '')
        limit = min(int(request.query_params.get('limit', 100)), 200)
        
        queryset = self.get_queryset().filter(is_active=True)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(product_code__icontains=search) |
                Q(description__icontains=search) |
                Q(hsn_code__code__icontains=search) |
                Q(sac_code__code__icontains=search) |
                Q(hsn_code__description__icontains=search) |
                Q(sac_code__service_name__icontains=search)
            )

        queryset = queryset.order_by('-created_at')[:limit]
        serializer = ProductListSerializer(queryset, many=True)
        return Response({'results': serializer.data})


class QuotationViewSet(CompanyScopedModelViewSet):
    """Quotation management with centralized tenant enforcement"""
    queryset = Quotation.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return QuotationCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return QuotationUpdateSerializer
        elif self.action == 'retrieve':
            return QuotationDetailSerializer
        return QuotationListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'customer', 'created_by'
        ).prefetch_related('quotation_items')
        
        # Add search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(quotation_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(customer__project_area__icontains=search) |
                Q(reference__icontains=search)
            )

        # Add filtering
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for quotation using tenant-safe object access"""
        quotation = self.get_object()  # Uses tenant filtering
        
        # Import here to avoid circular imports
        from .pdf_generators import generate_quotation_pdf_response
        
        try:
            return generate_quotation_pdf_response(quotation, request.service_user.company)
        except Exception as e:
            logger.error(f"PDF generation failed for quotation {quotation.id}: {str(e)}")
            return Response(
                {'error': 'PDF generation failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send quotation email using tenant-safe object access"""
        quotation = self.get_object()  # Uses tenant filtering
        
        # Import here to avoid circular imports
        from .email_handlers import send_quotation_email
        
        try:
            result = send_quotation_email(quotation, request.service_user)
            return Response({'message': 'Email sent successfully', 'result': result})
        except Exception as e:
            logger.error(f"Email sending failed for quotation {quotation.id}: {str(e)}")
            return Response(
                {'error': 'Email sending failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject quotation using tenant-safe object access"""
        quotation = self.get_object()  # Uses tenant filtering
        
        quotation.status = 'rejected'
        quotation.rejected_at = timezone.now()
        quotation.rejected_by = request.service_user
        quotation.save()
        
        serializer = self.get_serializer(quotation)
        return Response(serializer.data)


class PurchaseOrderViewSet(CompanyScopedModelViewSet):
    """Purchase Order management with centralized tenant enforcement"""
    queryset = PurchaseOrder.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PurchaseOrderCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PurchaseOrderUpdateSerializer
        elif self.action == 'retrieve':
            return PurchaseOrderDetailSerializer
        return PurchaseOrderListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'customer', 'quotation', 'created_by'
        ).prefetch_related('po_items')
        
        # Add search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(internal_po_number__icontains=search) |
                Q(po_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(quotation__quotation_number__icontains=search) |
                Q(reference__icontains=search)
            )

        # Add filtering
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        purchase_order = serializer.instance
        
        # Update the related quotation status to 'approved' and mark PO as created
        if purchase_order.quotation:
            quotation = purchase_order.quotation
            quotation.status = 'approved'
            quotation.po_created = True
            quotation.po_created_at = timezone.now()
            quotation.save()

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for purchase order using tenant-safe object access"""
        purchase_order = self.get_object()  # Uses tenant filtering
        
        from .pdf_generators import generate_purchase_order_pdf_response
        
        try:
            return generate_purchase_order_pdf_response(purchase_order, request.service_user.company)
        except Exception as e:
            logger.error(f"PDF generation failed for PO {purchase_order.id}: {str(e)}")
            return Response(
                {'error': 'PDF generation failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send purchase order email using tenant-safe object access"""
        purchase_order = self.get_object()  # Uses tenant filtering
        
        from .email_utils import send_purchase_order_email
        
        recipient_email = request.data.get('email') or purchase_order.customer.email
        message = request.data.get('message', '')
        
        try:
            success, result_message = send_purchase_order_email(purchase_order, recipient_email, message)
            if success:
                purchase_order.status = 'sent'
                purchase_order.save(update_fields=['status'])
                purchase_order.refresh_from_db()
            return Response({'message': result_message, 'success': success, 'status': purchase_order.status})
        except Exception as e:
            logger.error(f"Email sending failed for PO {purchase_order.id}: {str(e)}")
            return Response(
                {'error': 'Email sending failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ProformaInvoiceViewSet(CompanyScopedModelViewSet):
    """Proforma Invoice management with centralized tenant enforcement"""
    queryset = ProformaInvoice.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProformaInvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ProformaInvoiceUpdateSerializer
        elif self.action == 'retrieve':
            return ProformaInvoiceDetailSerializer
        return ProformaInvoiceListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'customer', 'purchase_order', 'created_by'
        ).prefetch_related('proforma_items')
        
        # Add filtering
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        payment_status_filter = self.request.query_params.get('payment_status', '')
        if payment_status_filter:
            queryset = queryset.filter(payment_status=payment_status_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        proforma_invoice = serializer.instance
        
        # Update the related quotation to mark proforma as created
        if proforma_invoice.quotation:
            quotation = proforma_invoice.quotation
            quotation.proforma_created = True
            quotation.invoice_created = True
            quotation.invoice_created_at = timezone.now()
            quotation.save()

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for proforma invoice using tenant-safe object access"""
        proforma = self.get_object()  # Uses tenant filtering
        
        from .pdf_generators import generate_proforma_pdf_response
        
        try:
            return generate_proforma_pdf_response(proforma, request.service_user.company)
        except Exception as e:
            logger.error(f"PDF generation failed for proforma {proforma.id}: {str(e)}")
            return Response(
                {'error': 'PDF generation failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send proforma invoice email using tenant-safe object access"""
        proforma = self.get_object()  # Uses tenant filtering
        
        from .email_utils import send_proforma_email
        
        recipient_email = request.data.get('email') or proforma.customer.email
        message = request.data.get('message', '')
        
        try:
            success, result_message = send_proforma_email(proforma, recipient_email, message)
            if success:
                proforma.status = 'sent'
                proforma.save(update_fields=['status'])
                proforma.refresh_from_db()
            return Response({'message': result_message, 'success': success, 'status': proforma.status})
        except Exception as e:
            logger.error(f"Email sending failed for proforma {proforma.id}: {str(e)}")
            return Response(
                {'error': 'Email sending failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject proforma invoice using tenant-safe object access"""
        proforma = self.get_object()  # Uses tenant filtering
        
        proforma.status = 'rejected'
        proforma.rejected_at = timezone.now()
        proforma.rejected_by = request.service_user
        proforma.save()
        
        serializer = self.get_serializer(proforma)
        return Response(serializer.data)


class InvoiceViewSet(CompanyScopedModelViewSet):
    """Invoice management with centralized tenant enforcement"""
    queryset = Invoice.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return InvoiceUpdateSerializer
        elif self.action == 'retrieve':
            return InvoiceDetailSerializer
        return InvoiceListSerializer
    
    def get_serializer_context(self):
        """Add company to serializer context for direct invoice creation"""
        context = super().get_serializer_context()
        if hasattr(self.request, 'service_user'):
            context['company'] = self.request.service_user.company
        return context

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'customer', 'proforma_invoice', 'created_by'
        ).prefetch_related('invoice_items', 'payments')
        
        # Add search functionality
        search = self.request.query_params.get('search', '').strip()
        if search and len(search) <= 100:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(proforma_invoice__proforma_number__icontains=search) |
                Q(reference__icontains=search)
            )

        # Add filtering
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        payment_status_filter = self.request.query_params.get('payment_status', '')
        if payment_status_filter:
            queryset = queryset.filter(payment_status=payment_status_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        super().perform_create(serializer)
        invoice = serializer.instance
        
        # Update the related quotation to mark invoice as created
        if hasattr(invoice, 'quotation') and invoice.quotation:
            quotation = invoice.quotation
            quotation.invoice_created = True
            quotation.invoice_created_at = timezone.now()
            quotation.save()

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for invoice using tenant-safe object access"""
        invoice = self.get_object()  # Uses tenant filtering
        
        from .pdf_generators import generate_invoice_pdf_response
        
        try:
            return generate_invoice_pdf_response(invoice, request.service_user.company)
        except Exception as e:
            logger.error(f"PDF generation failed for invoice {invoice.id}: {str(e)}")
            return Response(
                {'error': 'PDF generation failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send invoice email using tenant-safe object access"""
        invoice = self.get_object()  # Uses tenant filtering
        
        from .email_utils import send_invoice_email
        
        recipient_email = request.data.get('email') or invoice.customer.email
        message = request.data.get('message', '')
        
        try:
            success, result_message = send_invoice_email(invoice, recipient_email, message)
            if success:
                invoice.status = 'sent'
                invoice.save(update_fields=['status'])
                invoice.refresh_from_db()
            return Response({'message': result_message, 'success': success, 'status': invoice.status})
        except Exception as e:
            logger.error(f"Email sending failed for invoice {invoice.id}: {str(e)}")
            return Response(
                {'error': 'Email sending failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject invoice using tenant-safe object access"""
        invoice = self.get_object()  # Uses tenant filtering
        
        invoice.status = 'rejected'
        invoice.rejected_at = timezone.now()
        invoice.rejected_by = request.service_user
        invoice.save()
        
        serializer = self.get_serializer(invoice)
        return Response(serializer.data)


class PaymentViewSet(CompanyScopedModelViewSet):
    """Payment management with centralized tenant enforcement"""
    queryset = Payment.objects.all()
    pagination_class = FinancePagination
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PaymentCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PaymentUpdateSerializer
        elif self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'customer', 'invoice', 'created_by'
        )
        
        # Add search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(payment_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(invoice__invoice_number__icontains=search) |
                Q(reference_number__icontains=search)
            )

        # Add filtering
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        payment_method_filter = self.request.query_params.get('payment_method', '')
        if payment_method_filter:
            queryset = queryset.filter(payment_method=payment_method_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        invoice_id = self.request.query_params.get('invoice', '')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Override create to handle invoice/proforma filtering"""
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # If invoice is provided, remove proforma_invoice to prevent validation error
        if data.get('invoice'):
            data.pop('proforma_invoice', None)
        # If proforma_invoice is provided, remove invoice to prevent validation error  
        elif data.get('proforma_invoice'):
            data.pop('invoice', None)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return detailed payment data
        detail_serializer = PaymentDetailSerializer(serializer.instance)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get payment statistics for the dashboard"""
        payments = self.get_queryset()

        # Calculate statistics
        total_payments = payments.count()
        total_amount = payments.aggregate(total=Sum('amount'))['total'] or 0

        pending_payments = payments.filter(status='pending')
        pending_count = pending_payments.count()
        pending_amount = pending_payments.aggregate(total=Sum('amount'))['total'] or 0

        completed_payments = payments.filter(status='completed')
        completed_count = completed_payments.count()
        completed_amount = completed_payments.aggregate(total=Sum('amount'))['total'] or 0

        failed_payments = payments.filter(status='failed')
        failed_count = failed_payments.count()
        failed_amount = failed_payments.aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            'total_payments': total_payments,
            'total_amount': float(total_amount) if str(total_amount).lower() != "nan" else 0.0,
            'pending_payments': pending_count,
            'pending_amount': float(pending_amount) if str(pending_amount).lower() != "nan" else 0.0,
            'completed_payments': completed_count,
            'completed_amount': float(completed_amount) if str(completed_amount).lower() != "nan" else 0.0,
            'failed_payments': failed_count,
            'failed_amount': float(failed_amount) if str(failed_amount).lower() != "nan" else 0.0,
        })
