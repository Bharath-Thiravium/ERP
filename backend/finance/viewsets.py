from rest_framework import status
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.paginator import InvalidPage
from django.db import IntegrityError
from django.db.models import Q, Sum
from django.conf import settings
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

    def create(self, request, *args, **kwargs):
        """Override create with comprehensive error handling"""
        try:
            return super().create(request, *args, **kwargs)
        except (ValidationError, DjangoValidationError) as e:
            logger.warning(f"Customer creation validation failed: {e}")
            errors = getattr(e, 'detail', None) or getattr(e, 'message_dict', None) or {'error': str(e)}
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError as e:
            logger.warning(f"Customer creation integrity failed: {e}")
            error_msg = str(e).lower()
            if 'unique' in error_msg or 'duplicate' in error_msg:
                if 'customer_code' in error_msg:
                    return Response(
                        {'customer_code': ['Customer code already exists. Please try again.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'email' in error_msg:
                    return Response(
                        {'email': ['A customer with this email already exists.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'gstin' in error_msg:
                    return Response(
                        {'gstin': ['A customer with this GSTIN already exists.']},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {'error': 'A customer with similar details already exists.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            return Response(
                {'error': 'Database integrity error. Please check your input.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.exception("Customer creation failed in CustomerViewSet")
            return Response(
                {
                    'error': 'Customer creation failed',
                    'message': str(e) if settings.DEBUG else 'An unexpected error occurred. Please try again.'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

        # Financial Year Filter - Only apply for list action
        if self.action == 'list':
            financial_year = self.request.query_params.get('financial_year', '')
            if financial_year == 'all':
                # Explicitly show all years
                pass
            elif financial_year:
                # Filter by specific FY
                from .financial_year_utils import apply_financial_year_filter
                queryset = apply_financial_year_filter(queryset, 'quotation_date', financial_year)
            else:
                # Default: Show current FY only for list view
                from .financial_year_utils import get_current_financial_year, apply_financial_year_filter
                current_fy = get_current_financial_year()
                queryset = apply_financial_year_filter(queryset, 'quotation_date', current_fy)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate PDF for quotation - supports ?inline=true&template=AS preview/download"""
        quotation = self.get_object()
        
        # Unified response from utils - supports inline/attachment + template param
        from .utils import generate_quotation_pdf_response
        template = request.query_params.get('template', None)
        inline = request.query_params.get('inline', '').lower() == 'true'
        
        try:
            return generate_quotation_pdf_response(
                quotation, 
                inline=inline, 
                template=template
            )
        except Exception as e:
            logger.error(f"PDF generation failed for quotation {quotation.id}: {str(e)}")
            return Response(
                {'error': f'PDF generation failed: {str(e)}'}, 
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
        quotation = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=400)
        if not quotation.can_be_rejected:
            return Response({'error': 'This quotation cannot be rejected'}, status=400)
        quotation.reject_quotation(rejection_reason, request.service_user)
        return Response({'message': 'Quotation rejected successfully', 'quotation_number': quotation.quotation_number})
    
    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None):
        """Copy/duplicate an existing quotation with new number, date, and validity"""
        from .models import QuotationItem
        
        original_quotation = self.get_object()
        
        try:
            # Create new quotation with copied data
            new_quotation = Quotation.objects.create(
                company=request.service_user.company,
                created_by=request.service_user,
                customer=original_quotation.customer,
                quotation_date=timezone.now().date(),
                valid_until=timezone.now().date() + timedelta(days=30),
                reference=original_quotation.reference,
                shipping_address=original_quotation.shipping_address,
                discount_percentage=original_quotation.discount_percentage,
                discount_amount=original_quotation.discount_amount,
                shipping_charges=original_quotation.shipping_charges,
                other_charges=original_quotation.other_charges,
                notes=original_quotation.notes,
                terms_and_conditions=original_quotation.terms_and_conditions,
                status='draft'
            )

            # Copy quotation items
            original_items = original_quotation.quotation_items.all()
            for index, item in enumerate(original_items, 1):
                new_item = QuotationItem(
                    quotation=new_quotation,
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_number=index
                )
                new_item.save(skip_totals_calculation=True)

            # Calculate totals once after all items are created
            new_quotation.calculate_totals()

            # Return the new quotation details
            serializer = QuotationDetailSerializer(new_quotation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Quotation copy failed for quotation {original_quotation.id}: {str(e)}")
            return Response(
                {'error': f'Failed to copy quotation: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
            'customer', 'quotation', 'created_by', 'shipping_address'
        ).prefetch_related(
            'po_items__product',
            'invoices__invoice_items',
            'proforma_invoices__proforma_items',
        )
        
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

        # Financial Year Filter - Only apply for list action, not retrieve
        if self.action == 'list':
            financial_year = self.request.query_params.get('financial_year', '')
            if financial_year == 'all':
                # Explicitly show all years
                pass
            elif financial_year:
                # Filter by specific FY
                from .financial_year_utils import apply_financial_year_filter
                queryset = apply_financial_year_filter(queryset, 'po_date', financial_year)
            else:
                # Default: Show current FY only for list view
                from .financial_year_utils import get_current_financial_year, apply_financial_year_filter
                current_fy = get_current_financial_year()
                queryset = apply_financial_year_filter(queryset, 'po_date', current_fy)

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

    @action(detail=False, methods=['post'])
    def sync_statuses(self, request):
        """Recalculate and sync all PO statuses based on actual invoice data"""
        from decimal import Decimal
        pos = self.get_queryset().prefetch_related('invoices', 'proforma_invoices')
        fixed = 0
        for po in pos:
            old_status = po.status
            # Fix POs manually set to completed with no invoices
            if po.status == 'completed' and not po.invoices.filter(is_rejected=False).exists():
                po.remaining_proforma_balance = po.subtotal
                po.remaining_invoice_balance = po.total_amount
                po.save(update_fields=['remaining_proforma_balance', 'remaining_invoice_balance'])
            po.update_balance_tracking()
            po.refresh_from_db()
            if po.status != old_status:
                fixed += 1
        return Response({'synced': pos.count(), 'status_changed': fixed})

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

        purchase_order_id = self.request.query_params.get('purchase_order_id', '')
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)

        # Financial Year Filter - Only apply for list action
        if self.action == 'list':
            financial_year = self.request.query_params.get('financial_year', '')
            if financial_year == 'all':
                # Explicitly show all years
                pass
            elif financial_year:
                # Filter by specific FY
                from .financial_year_utils import apply_financial_year_filter
                queryset = apply_financial_year_filter(queryset, 'proforma_date', financial_year)
            else:
                # Default: Show current FY only for list view
                from .financial_year_utils import get_current_financial_year, apply_financial_year_filter
                current_fy = get_current_financial_year()
                queryset = apply_financial_year_filter(queryset, 'proforma_date', current_fy)

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
        proforma = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=400)
        if not proforma.can_be_rejected:
            return Response({'error': 'This proforma invoice cannot be rejected'}, status=400)
        proforma.reject_proforma(rejection_reason, request.service_user)
        return Response({'message': 'Proforma invoice rejected successfully', 'proforma_number': proforma.proforma_number})


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
            'customer', 'proforma_invoice', 'created_by',
            'purchase_order', 'purchase_order__shipping_address',
            'quotation', 'shipping_address'
        ).prefetch_related('invoice_items', 'payments', 'customer__shipping_addresses')
        
        # Add search functionality
        search = self.request.query_params.get('search', '').strip()
        if search and len(search) <= 100:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(customer__name__icontains=search) |
                Q(customer__customer_code__icontains=search) |
                Q(proforma_invoice__proforma_number__icontains=search) |
                Q(reference__icontains=search) |
                Q(purchase_order__po_number__icontains=search) |
                Q(purchase_order__internal_po_number__icontains=search)
            )

        # Add filtering
        payment_status_filter = self.request.query_params.get('payment_status', '')
        if payment_status_filter == 'unpaid_or_partial':
            queryset = queryset.filter(payment_status__in=['unpaid', 'partially_paid', 'overdue'])
        elif payment_status_filter == 'overdue':
            queryset = queryset.filter(
                payment_status__in=['unpaid', 'partially_paid', 'overdue'],
                due_date__lt=timezone.now().date()
            )
        elif payment_status_filter == 'unpaid':
            # 'unpaid' includes overdue invoices — overdue = unpaid past due date
            queryset = queryset.filter(payment_status__in=['unpaid', 'overdue'])
        elif payment_status_filter:
            queryset = queryset.filter(payment_status=payment_status_filter)

        customer_id = self.request.query_params.get('customer', '')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        purchase_order_id = self.request.query_params.get('purchase_order_id', '')
        if purchase_order_id:
            queryset = queryset.filter(purchase_order_id=purchase_order_id)

        # Financial Year Filter - Only apply for list and stats actions
        if self.action in ['list', 'stats']:
            financial_year = self.request.query_params.get('financial_year', '')
            if financial_year == 'all':
                # Explicitly show all years
                pass
            elif financial_year:
                # Filter by specific FY
                from .financial_year_utils import apply_financial_year_filter
                queryset = apply_financial_year_filter(queryset, 'invoice_date', financial_year)
            else:
                # Default: Show current FY only for list view
                from .financial_year_utils import get_current_financial_year, apply_financial_year_filter
                current_fy = get_current_financial_year()
                queryset = apply_financial_year_filter(queryset, 'invoice_date', current_fy)

        allowed_ordering = {"invoice_date", "-invoice_date", "created_at", "-created_at", "total_amount", "-total_amount", "outstanding_amount", "-outstanding_amount", "payment_status", "-payment_status"}
        ordering = self.request.query_params.get("ordering", "-created_at")
        if ordering not in allowed_ordering:
            ordering = "-created_at"
        return queryset.order_by(ordering)

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
        invoice = self.get_object()
        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response({'error': 'Rejection reason is required'}, status=400)
        if not invoice.can_be_rejected:
            return Response({'error': 'This invoice cannot be rejected'}, status=400)
        invoice.reject_invoice(rejection_reason, request.service_user)
        return Response({'message': 'Invoice rejected successfully', 'invoice_number': invoice.invoice_number})

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """Mark work as completed — does not affect payment status"""
        invoice = self.get_object()
        if invoice.is_rejected:
            return Response({'error': 'Rejected invoices cannot be marked as completed'}, status=400)
        if invoice.is_work_completed:
            return Response({'error': 'Work is already marked as completed'}, status=400)
        invoice.is_work_completed = True
        invoice.save(update_fields=['is_work_completed'])
        return Response({'message': 'Work marked as completed', 'invoice_number': invoice.invoice_number})

    @action(detail=True, methods=['patch'], url_path='tds-config')
    def tds_config(self, request, pk=None):
        """Set or update invoice-level TDS configuration (one-time declaration, editable)."""
        invoice = self.get_object()
        tds_applicable = request.data.get('tds_applicable')
        tds_section = request.data.get('tds_section', '').strip()
        tds_rate = request.data.get('tds_rate', 0)
        try:
            tds_rate = float(tds_rate)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid tds_rate'}, status=400)
        invoice.tds_applicable = bool(tds_applicable)
        invoice.tds_section = tds_section if invoice.tds_applicable else ''
        invoice.tds_rate = tds_rate if invoice.tds_applicable else 0
        invoice.save(update_fields=['tds_applicable', 'tds_section', 'tds_rate'])
        return Response({
            'tds_applicable': invoice.tds_applicable,
            'tds_section': invoice.tds_section,
            'tds_rate': str(invoice.tds_rate),
        })

    @action(detail=True, methods=['post'])
    def mark_gst_payment(self, request, pk=None):
        """Mark GST payment status for an invoice"""
        invoice = self.get_object()
        if invoice.is_rejected:
            return Response({'error': 'Cannot update GST status on rejected invoice'}, status=400)

        gst_status = request.data.get('gst_payment_status')
        if gst_status not in ('pending', 'paid', 'not_applicable'):
            return Response({'error': 'Invalid gst_payment_status. Use: pending, paid, not_applicable'}, status=400)

        invoice.gst_payment_status = gst_status
        invoice.gst_paid_date = request.data.get('gst_paid_date') or None
        invoice.gst_payment_reference = request.data.get('gst_payment_reference', '').strip()
        invoice.save(update_fields=['gst_payment_status', 'gst_paid_date', 'gst_payment_reference'])
        return Response({
            'message': f'GST payment status updated to {gst_status}',
            'invoice_number': invoice.invoice_number,
            'gst_payment_status': invoice.gst_payment_status,
            'gst_paid_date': invoice.gst_paid_date,
            'gst_payment_reference': invoice.gst_payment_reference,
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Accurate server-side invoice stats using DB aggregates"""
        from django.db.models import Sum, Count, Q
        from django.utils import timezone as tz

        qs = self.get_queryset().filter(is_rejected=False)

        today = tz.now().date()
        current_month = today.month
        current_year = today.year

        agg = qs.aggregate(
            total_count=Count('id'),
            total_amount=Sum('total_amount'),
            paid_amount=Sum('paid_amount'),
            outstanding_amount=Sum('outstanding_amount'),
            this_month=Count('id', filter=Q(
                invoice_date__month=current_month,
                invoice_date__year=current_year
            )),
            overdue_count=Count('id', filter=Q(
                payment_status__in=['unpaid', 'partially_paid', 'overdue'],
                due_date__lt=today
            )),
        )

        return Response({
            'total_invoices': agg['total_count'] or 0,
            'total_amount': float(agg['total_amount'] or 0),
            'paid_amount': float(agg['paid_amount'] or 0),
            'outstanding_amount': float(agg['outstanding_amount'] or 0),
            'this_month_invoices': agg['this_month'] or 0,
            'overdue_invoices': agg['overdue_count'] or 0,
        })

    @action(detail=False, methods=['get'])
    def gst_payment_summary(self, request):
        """Summary of GST payment status across all invoices"""
        qs = self.get_queryset().exclude(is_rejected=True).exclude(gst_type='exempt')
        from django.db.models import Sum, Count
        summary = qs.values('gst_payment_status').annotate(
            count=Count('id'),
            total_gst=Sum('total_tax')
        )
        result = {s['gst_payment_status']: {'count': s['count'], 'total_gst': float(s['total_gst'] or 0)} for s in summary}
        totals = qs.aggregate(total_gst=Sum('total_tax'), total_cgst=Sum('cgst_amount'), total_sgst=Sum('sgst_amount'), total_igst=Sum('igst_amount'))
        return Response({
            'by_status': result,
            'totals': {k: float(v or 0) for k, v in totals.items()}
        })


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
        
        # Exclude TDS-only payments from main payment list UNLESS filtering by specific invoice
        invoice_id = self.request.query_params.get('invoice', '')
        proforma_id = self.request.query_params.get('proforma_invoice', '')
        
        if not invoice_id and not proforma_id:
            # Main payment list - exclude TDS-only payments
            queryset = queryset.exclude(payment_type='tds_only')
        
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

        # Financial Year Filter - Default to current FY
        financial_year = self.request.query_params.get('financial_year', '')
        if financial_year == 'all':
            # Explicitly show all years
            pass
        elif financial_year:
            # Filter by specific FY
            from .financial_year_utils import apply_financial_year_filter
            queryset = apply_financial_year_filter(queryset, 'payment_date', financial_year)
        else:
            # Default: Show current FY only
            from .financial_year_utils import get_current_financial_year, apply_financial_year_filter
            current_fy = get_current_financial_year()
            queryset = apply_financial_year_filter(queryset, 'payment_date', current_fy)

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
