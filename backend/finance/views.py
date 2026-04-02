from rest_framework import status, permissions
from django.utils._os import safe_join
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView, ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Sum
from django.db import models, transaction, IntegrityError
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import logging

# Set up logging
logger = logging.getLogger(__name__)
from authentication.models import ServiceUserSession, CompanyServiceUser
from .models import Customer, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem, ProformaInvoice, ProformaInvoiceItem, Invoice, InvoiceItem, Payment, NumberingRule, NumberingCounter, FINANCE_NUMBERING_MODULE_CHOICES, CustomerShippingAddress, TDSDeposit
from .unit_models import Unit
from .email_utils import send_invoice_email, send_proforma_email, send_quotation_email, send_purchase_order_email
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerCreateSerializer, CustomerUpdateSerializer,
    CustomerShippingAddressSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    HSNCodeSerializer, SACCodeSerializer,
    HSNCodeCreateSerializer, SACCodeCreateSerializer,
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
    WorldClassPaymentCreateSerializer, WorldClassPaymentListSerializer,
    TDSPaymentSerializer,
    TDSDepositSerializer
)
from .serializers import NumberingRuleSerializer, FINANCE_DEFAULT_TEMPLATES
from .report_generators import TDSReportGenerator
from finance.numbering import _scope_key


# Allowed ordering fields per model (whitelist to prevent arbitrary field injection)
_ORDERING_FIELDS = {
    'customer':  {'name': 'name', 'created_at': 'created_at', 'customer_code': 'customer_code'},
    'product':   {'name': 'name', 'created_at': 'created_at', 'selling_price': 'selling_price'},
    'quotation': {'quotation_date': 'quotation_date', 'created_at': 'created_at', 'total_amount': 'total_amount', 'customer_name': 'customer__name', 'quotation_number': 'quotation_number'},
    'po':        {'po_date': 'po_date', 'created_at': 'created_at', 'total_amount': 'total_amount', 'customer_name': 'customer__name', 'internal_po_number': 'internal_po_number'},
    'proforma':  {'proforma_date': 'proforma_date', 'created_at': 'created_at', 'total_amount': 'total_amount', 'customer_name': 'customer__name', 'proforma_number': 'proforma_number', 'payment_status': 'payment_status'},
    'invoice':   {'invoice_date': 'invoice_date', 'created_at': 'created_at', 'total_amount': 'total_amount', 'customer_name': 'customer__name', 'invoice_number': 'invoice_number', 'payment_status': 'payment_status'},
    'payment':   {'payment_date': 'payment_date', 'created_at': 'created_at', 'amount': 'amount', 'payment_number': 'payment_number'},
}

def _apply_ordering(queryset, request, model_key, default='-created_at'):
    ordering = request.query_params.get('ordering', '').strip()
    if not ordering:
        return queryset.order_by(default)
    desc = ordering.startswith('-')
    field_key = ordering.lstrip('-')
    allowed = _ORDERING_FIELDS.get(model_key, {})
    db_field = allowed.get(field_key)
    if not db_field:
        return queryset.order_by(default)
    return queryset.order_by(f'-{db_field}' if desc else db_field)


class CustomerPagination(PageNumberPagination):
    """Custom pagination for customers"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class CustomerListCreateView(ListCreateAPIView):
    """List and create customers for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = CustomerPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomerCreateSerializer
        return CustomerListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Customer.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return customers for this company only
            queryset = Customer.objects.filter(company=service_user.company)

            # Add search functionality with comprehensive security validation
            search = self.request.query_params.get('search', '').strip()
            if search and len(search) <= 100:  # Limit search length
                # Use security validator for comprehensive sanitization
                from .security_validators import FinanceSecurityValidator
                search = FinanceSecurityValidator.sanitize_search_input(search)
                if search:  # Only proceed if search term is valid after sanitization
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

            return _apply_ordering(queryset, self.request, 'customer')

        except ServiceUserSession.DoesNotExist:
            return Customer.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        import re
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        
        # Validate session key format to prevent path traversal and injection
        if session_key:
            # Remove any potentially dangerous characters (allow alphanumeric, underscore, hyphen, and colon)
            session_key = re.sub(r'[^a-zA-Z0-9_:-]', '', str(session_key))
            # Limit length to prevent buffer overflow
            session_key = session_key[:64] if len(session_key) > 64 else session_key
            # Validate format (allow colon for session key format)
            if not re.match(r'^[a-zA-Z0-9_:-]+$', session_key):
                return None
        return session_key

    def perform_create(self, serializer):
        """Create customer with company and service user context"""
        session_key = self.get_session_key()
        if not session_key:
            raise PermissionError("Session key required")

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Use database transaction to ensure atomicity
            with transaction.atomic():
                try:
                    customer = serializer.save(
                        company=service_user.company,
                        created_by=service_user
                    )
                    logger.info(f"Customer created successfully: {customer.customer_code} for company {service_user.company.name}")
                except Exception as e:
                    logger.error(f"Error creating customer for company {service_user.company.name}: {str(e)}")
                    raise e

        except ServiceUserSession.DoesNotExist:
            logger.error(f"Invalid session key: {session_key}")
            raise PermissionError("Invalid session")

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication with better error handling"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            
            # Log the creation attempt
            logger.info(f"Creating customer for company: {session.service_user.company.name}")
            
            # Proceed with normal creation
            try:
                response = super().create(request, *args, **kwargs)
                logger.info(f"Customer creation successful for company: {session.service_user.company.name}")
                return response
            except ValidationError as e:
                # Handle Django REST framework validation errors
                logger.error(f"Customer validation failed for company {session.service_user.company.name}: {str(e)}")
                return Response(
                    e.detail if hasattr(e, 'detail') else {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except IntegrityError as e:
                # Handle database integrity errors (unique constraints, etc.)
                logger.error(f"Customer creation integrity error for company {session.service_user.company.name}: {str(e)}")
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
                else:
                    return Response(
                        {'error': 'Database error occurred. Please check your input and try again.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                logger.error(f"Customer creation failed for company {session.service_user.company.name}: {str(e)}")
                logger.error(f"Request data: {request.data}")
                
                # Check for specific common errors
                error_msg = str(e).lower()
                if 'required' in error_msg:
                    return Response(
                        {'error': 'Required fields are missing. Please fill all mandatory fields.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif 'invalid' in error_msg:
                    return Response(
                        {'error': 'Invalid data format. Please check your input values.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    return Response(
                        {
                            'error': 'Customer creation failed',
                            'message': 'An unexpected error occurred. Please try again or contact support.',
                            'details': str(e) if settings.DEBUG else None
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal listing
            return super().list(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class CustomerDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete customer for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CustomerUpdateSerializer
        return CustomerDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Customer.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return customers for this company only
            return Customer.objects.filter(company=service_user.company)

        except ServiceUserSession.DoesNotExist:
            return Customer.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal retrieval
            return super().retrieve(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal update
            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal deletion
            return super().destroy(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ProductPagination(PageNumberPagination):
    """Custom pagination for products"""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 500


class ProductListCreateView(ListCreateAPIView):
    """List and create products for finance service with rate limiting"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = ProductPagination
    
    # Rate limiting for bulk operations
    _last_request_time = {}
    _request_count = {}

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateSerializer
        return ProductListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Product.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return products for this company only
            queryset = Product.objects.filter(company=service_user.company)

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

            return _apply_ordering(queryset, self.request, 'product')

        except ServiceUserSession.DoesNotExist:
            return Product.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication and GST rate manual overrides"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Create product with company and created_by
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Check if GST rate is being manually set (different from HSN/SAC auto-rate)
            gst_rate = request.data.get('gst_rate', 0)
            hsn_code_id = request.data.get('hsn_code')
            sac_code_id = request.data.get('sac_code')
            product_type = request.data.get('product_type', 'product')
            
            manual_gst_override = False
            if gst_rate and (hsn_code_id or sac_code_id):
                try:
                    if product_type == 'product' and hsn_code_id:
                        hsn_code = HSNCode.objects.get(id=hsn_code_id)
                        if float(gst_rate) != float(hsn_code.gst_rate):
                            manual_gst_override = True
                    elif product_type == 'service' and sac_code_id:
                        sac_code = SACCode.objects.get(id=sac_code_id)
                        if float(gst_rate) != float(sac_code.gst_rate):
                            manual_gst_override = True
                except (HSNCode.DoesNotExist, SACCode.DoesNotExist, ValueError):
                    pass

            try:
                # Set manual override flag BEFORE saving to prevent GST rate overwrite
                if manual_gst_override:
                    # Create product instance without triggering save
                    product = Product(
                        company=service_user.company,
                        created_by=service_user,
                        **{k: v for k, v in serializer.validated_data.items()}
                    )
                    product._manual_gst_override = True
                    product.save()
                else:
                    product = serializer.save(
                        company=service_user.company,
                        created_by=service_user
                    )
            except IntegrityError:
                return Response(
                    {'error': 'Product code already exists for this company. Please use a different code or edit the existing product.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Return detailed product data
            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal listing
            return super().list(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ProductDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete product for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProductUpdateSerializer
        return ProductDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Product.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return products for this company only
            return Product.objects.filter(company=service_user.company)

        except ServiceUserSession.DoesNotExist:
            return Product.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal retrieval
            return super().retrieve(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication and GST rate manual overrides"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            
            # Get the product instance to check for manual GST override
            product = self.get_object()
            
            # Check if GST rate is being manually overridden
            new_gst_rate = request.data.get('gst_rate')
            if new_gst_rate is not None:
                expected_gst_rate = None
                if product.product_type == 'product' and product.hsn_code:
                    expected_gst_rate = product.hsn_code.gst_rate
                elif product.product_type == 'service' and product.sac_code:
                    expected_gst_rate = product.sac_code.gst_rate
                
                # If new GST rate differs from expected auto-rate, mark as manual override
                if expected_gst_rate is not None and float(new_gst_rate) != float(expected_gst_rate):
                    product._manual_gst_override = True
            
            # Proceed with normal update
            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal deletion
            return super().destroy(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class HSNCodeSearchView(APIView):
    """Search HSN codes for products"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Search HSN codes by code or description"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

            search = request.query_params.get('search', '')
            # Validate and sanitize limit parameter
            try:
                limit = int(request.query_params.get('limit', 20))
                limit = max(1, min(limit, 100))  # Ensure limit is between 1 and 100
            except (ValueError, TypeError):
                limit = 20

            queryset = HSNCode.objects.all()

            if search:
                queryset = queryset.filter(
                    Q(code__icontains=search) |
                    Q(description__icontains=search)
                )

            # Limit results for performance
            queryset = queryset[:limit]

            serializer = HSNCodeSerializer(queryset, many=True)
            return Response({'results': serializer.data})

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class SACCodeSearchView(APIView):
    """Search SAC codes for services"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Search SAC codes by code, service name, or description"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

            search = request.query_params.get('search', '')
            # Validate and sanitize limit parameter
            try:
                limit = int(request.query_params.get('limit', 20))
                limit = max(1, min(limit, 100))  # Ensure limit is between 1 and 100
            except (ValueError, TypeError):
                limit = 20

            queryset = SACCode.objects.all()

            if search:
                queryset = queryset.filter(
                    Q(code__icontains=search) |
                    Q(service_name__icontains=search) |
                    Q(description__icontains=search)
                )

            # Limit results for performance
            queryset = queryset[:limit]

            serializer = SACCodeSerializer(queryset, many=True)
            return Response({'results': serializer.data})

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class HSNCodeCreateView(APIView):
    """Create new HSN codes manually"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Create a new HSN code"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.data.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

            serializer = HSNCodeCreateSerializer(data=request.data)
            if serializer.is_valid():
                hsn_code = serializer.save()
                response_serializer = HSNCodeSerializer(hsn_code)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class SACCodeCreateView(APIView):
    """Create new SAC codes manually"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        """Create a new SAC code"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.data.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

            serializer = SACCodeCreateSerializer(data=request.data)
            if serializer.is_valid():
                sac_code = serializer.save()
                response_serializer = SACCodeSerializer(sac_code)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ProductSearchView(APIView):
    """Search products for quotation forms - without pagination"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Search products by name, code, or description"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            search = request.query_params.get('search', '')
            # Validate and sanitize limit parameter
            try:
                limit = int(request.query_params.get('limit', 100))
                limit = max(1, min(limit, 200))  # Ensure limit is between 1 and 200
            except (ValueError, TypeError):
                limit = 100

            # Get products for this company only
            queryset = Product.objects.filter(
                company=service_user.company
            )

            # Add filtering for is_active (consistent with ProductListCreateView)
            is_active = request.query_params.get('is_active', '')
            if is_active:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            else:
                # Default to showing only active products if no filter is specified
                queryset = queryset.filter(is_active=True)

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

            # Limit results for performance but show all company products
            queryset = queryset.order_by('-created_at')[:limit]

            serializer = ProductListSerializer(queryset, many=True)
            return Response({'results': serializer.data})

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class GenerateProductCodeView(APIView):
    """Generate next available product/service code"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """Generate next product/service code"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user
            company = service_user.company

            product_type = request.query_params.get('type', 'product')
            company_prefix = getattr(company, 'company_prefix', 'COMP')

            if product_type == 'product':
                # Generate company prefix + PROD codes for products
                last_product = Product.objects.filter(
                    company=company,
                    product_type='product'
                ).order_by('-id').first()
                if last_product and last_product.product_code:
                    # Extract number from existing code
                    import re
                    match = re.search(r'(\d+)$', last_product.product_code)
                    if match:
                        last_number = int(match.group(1))
                        next_code = f"{company_prefix}PROD{last_number + 1:02d}"
                    else:
                        next_code = f"{company_prefix}PROD01"
                else:
                    next_code = f"{company_prefix}PROD01"
            else:
                # Generate company prefix + SER codes for services
                last_service = Product.objects.filter(
                    company=company,
                    product_type='service'
                ).order_by('-id').first()
                if last_service and last_service.product_code:
                    # Extract number from existing code
                    import re
                    match = re.search(r'(\d+)$', last_service.product_code)
                    if match:
                        last_number = int(match.group(1))
                        next_code = f"{company_prefix}SER{last_number + 1:02d}"
                    else:
                        next_code = f"{company_prefix}SER01"
                else:
                    next_code = f"{company_prefix}SER01"

            return Response({'code': next_code})

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class QuotationPagination(PageNumberPagination):
    """Custom pagination for quotations"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class QuotationListCreateView(ListCreateAPIView):
    """List and create quotations for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = QuotationPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return QuotationCreateSerializer
        return QuotationListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Quotation.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return quotations for this company only with prefetched related data
            queryset = Quotation.objects.filter(company=service_user.company).select_related(
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

            return _apply_ordering(queryset, self.request, 'quotation')

        except ServiceUserSession.DoesNotExist:
            return Quotation.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Create quotation with company and created_by
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            quotation = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            # Return detailed quotation data
            detail_serializer = QuotationDetailSerializer(quotation)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal listing
            return super().list(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class QuotationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete quotation for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return QuotationUpdateSerializer
        return QuotationDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Quotation.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return quotations for this company only
            return Quotation.objects.filter(company=service_user.company)

        except ServiceUserSession.DoesNotExist:
            return Quotation.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal retrieval
            return super().retrieve(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication and revision tracking"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Get the quotation instance
            quotation = self.get_object()

            # Handle revision tracking
            if request.data.get('is_revised') and not quotation.is_revised:
                # This is the first revision
                request.data['revision_count'] = quotation.revision_count + 1
                request.data['revised_at'] = timezone.now()
                request.data['revised_by'] = service_user.id

            # Proceed with normal update
            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal deletion
            return super().destroy(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class QuotationCopyView(APIView):
    """Copy an existing quotation with new number, date, and validity"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_session_key(self):
        """Get session key from Authorization header"""
        return self.request.headers.get('Authorization', '').replace('Bearer ', '')

    def post(self, request, pk):
        """Copy quotation with new number, date, and validity"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Get the original quotation
            try:
                original_quotation = Quotation.objects.get(
                    id=pk,
                    company=service_user.company
                )
            except Quotation.DoesNotExist:
                return Response(
                    {'error': 'Quotation not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Create new quotation with copied data
            new_quotation = Quotation.objects.create(
                company=service_user.company,
                created_by=service_user,
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
                status='draft'  # New quotation starts as draft
            )

            # Copy quotation items
            original_items = original_quotation.quotation_items.all()
            for index, item in enumerate(original_items, 1):
                # Create new item (save method will calculate line_total and other fields)
                new_item = QuotationItem(
                    quotation=new_quotation,
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    line_number=index
                )
                # Save with skip_totals_calculation to avoid recalculating totals for each item
                new_item.save(skip_totals_calculation=True)

            # Calculate totals once after all items are created
            new_quotation.calculate_totals()

            # Return the new quotation details
            serializer = QuotationDetailSerializer(new_quotation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class PurchaseOrderPagination(PageNumberPagination):
    """Custom pagination for purchase orders"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class PurchaseOrderListCreateView(ListCreateAPIView):
    """List and create purchase orders for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = PurchaseOrderPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PurchaseOrderCreateSerializer
        return PurchaseOrderListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseOrder.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return purchase orders for this company only with prefetched related data
            queryset = PurchaseOrder.objects.filter(company=service_user.company).select_related(
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

            return _apply_ordering(queryset, self.request, 'po')

        except ServiceUserSession.DoesNotExist:
            return PurchaseOrder.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Create purchase order with company and created_by
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            purchase_order = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            # Update the related quotation status to 'approved' and mark PO as created (only if PO was created from quotation)
            if purchase_order.quotation:
                quotation = purchase_order.quotation
                quotation.status = 'approved'
                quotation.po_created = True
                quotation.po_created_at = timezone.now()
                quotation.save()
                
                # Set PO status to active when created from quotation
                purchase_order.status = 'active'
                purchase_order.save(update_fields=['status'])

            # Return detailed purchase order data
            detail_serializer = PurchaseOrderDetailSerializer(purchase_order)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class PurchaseOrderDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete purchase order for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PurchaseOrderUpdateSerializer
        return PurchaseOrderDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseOrder.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return purchase orders for this company only
            return PurchaseOrder.objects.filter(company=service_user.company)

        except ServiceUserSession.DoesNotExist:
            return PurchaseOrder.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'POST']:
            session_key = self.request.data.get('session_key')
        return session_key

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal update
            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication and revert quotation status"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

            # Get the PO instance before deletion to access the quotation
            purchase_order = self.get_object()
            quotation = purchase_order.quotation

            # Delete the purchase order
            response = super().destroy(request, *args, **kwargs)

            # If deletion was successful and quotation exists, revert quotation status to 'sent'
            if response.status_code == 204 and quotation:  # HTTP 204 No Content (successful deletion)
                quotation.status = 'sent'
                quotation.save()

            return response

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ProformaInvoicePagination(PageNumberPagination):
    """Custom pagination for proforma invoices"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProformaInvoiceListCreateView(ListCreateAPIView):
    """List and create proforma invoices for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = ProformaInvoicePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProformaInvoiceCreateSerializer
        return ProformaInvoiceListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return ProformaInvoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return proforma invoices for this company only with prefetched related data
            queryset = ProformaInvoice.objects.filter(
                company=service_user.company
            ).select_related(
                'customer', 'purchase_order', 'created_by'
            ).prefetch_related(
                'proforma_items'
            )

            # Add filtering
            status_filter = self.request.query_params.get('status', '')
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            payment_status_filter = self.request.query_params.get('payment_status', '')
            if payment_status_filter == 'unpaid_or_partial':
                queryset = queryset.filter(payment_status__in=['unpaid', 'partially_paid'])
            elif payment_status_filter:
                queryset = queryset.filter(payment_status=payment_status_filter)

            customer_id = self.request.query_params.get('customer', '')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)

            return _apply_ordering(queryset, self.request, 'proforma')

        except ServiceUserSession.DoesNotExist:
            return ProformaInvoice.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication and return updated PO balance"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Create proforma invoice with company and created_by
            serializer = self.get_serializer(data=request.data, context={'company': service_user.company})
            serializer.is_valid(raise_exception=True)

            proforma_invoice = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            # Update the related quotation to mark proforma as created (if proforma was created directly from quotation)
            if proforma_invoice.quotation:
                quotation = proforma_invoice.quotation
                quotation.proforma_created = True
                quotation.invoice_created = True  # Proforma is also a type of invoice
                quotation.invoice_created_at = timezone.now()
                quotation.save()

            # Get updated PO balance data after proforma creation (only if PO exists)
            updated_po_data = None
            if proforma_invoice.purchase_order:
                po_serializer = PurchaseOrderListSerializer(proforma_invoice.purchase_order)
                updated_po_data = po_serializer.data

            # Return detailed proforma invoice data with updated PO balance
            detail_serializer = ProformaInvoiceDetailSerializer(proforma_invoice)
            response_data = detail_serializer.data
            if updated_po_data:
                response_data['updated_purchase_order'] = updated_po_data
            
            return Response(response_data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class ProformaInvoiceDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete proforma invoice for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ProformaInvoiceUpdateSerializer
        return ProformaInvoiceDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return ProformaInvoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return proforma invoices for this company only
            return ProformaInvoice.objects.filter(
                company=service_user.company
            ).select_related(
                'customer', 'purchase_order', 'shipping_address', 'created_by'
            ).prefetch_related(
                'proforma_items__product',
                'customer__shipping_addresses'
            )

        except ServiceUserSession.DoesNotExist:
            return ProformaInvoice.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication and revision tracking"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Get the proforma invoice instance
            proforma = self.get_object()

            # Handle revision tracking
            if request.data.get('is_revised') and not proforma.is_revised:
                # Update the proforma instance directly
                proforma.revision_count = proforma.revision_count + 1
                proforma.revised_at = timezone.now()
                proforma.revised_by = service_user
                proforma.is_revised = True
                proforma.save(update_fields=['revision_count', 'revised_at', 'revised_by', 'is_revised'])

            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication and reset claim_type if needed"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            
            # Get the proforma and its PO before deletion
            proforma = self.get_object()
            purchase_order = proforma.purchase_order
            
            # Proceed with normal deletion
            response = super().destroy(request, *args, **kwargs)
            
            # If deletion was successful and PO exists, check if we need to reset claim_type
            if response.status_code == 204 and purchase_order:
                # Check if this PO has any remaining invoices (both proforma and tax)
                has_proforma = purchase_order.proforma_invoices.exists()
                has_tax_invoice = purchase_order.invoices.exists()
                
                # If no invoices remain, reset claim_type to null
                if not has_proforma and not has_tax_invoice:
                    purchase_order.claim_type = None
                    purchase_order.save(update_fields=['claim_type'])
            
            return response

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


# Invoice Views
class InvoicePagination(PageNumberPagination):
    """Custom pagination for invoices"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class InvoiceListCreateView(ListCreateAPIView):
    """List and create invoices for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = InvoicePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InvoiceCreateSerializer
        return InvoiceListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Invoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return invoices for this company only with prefetched related data
            queryset = Invoice.objects.filter(
                company=service_user.company
            ).select_related(
                'customer', 'proforma_invoice', 'created_by'
            ).prefetch_related(
                'invoice_items', 'payments'
            )

            # Add search functionality with sanitization
            search = self.request.query_params.get('search', '').strip()
            if search and len(search) <= 100:  # Limit search length
                # Escape special characters to prevent SQL injection
                from django.db.models import Q
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
            if payment_status_filter == 'unpaid_or_partial':
                queryset = queryset.filter(payment_status__in=['unpaid', 'partially_paid'])
            elif payment_status_filter:
                queryset = queryset.filter(payment_status=payment_status_filter)

            customer_id = self.request.query_params.get('customer', '')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)

            return _apply_ordering(queryset, self.request, 'invoice')

        except ServiceUserSession.DoesNotExist:
            return Invoice.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication and return updated PO balance"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Create invoice with company and created_by
            serializer = self.get_serializer(data=request.data, context={'company': service_user.company})
            serializer.is_valid(raise_exception=True)

            invoice = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            # Update the related quotation to mark invoice as created (if invoice was created directly from quotation)
            if hasattr(invoice, 'quotation') and invoice.quotation:
                quotation = invoice.quotation
                quotation.invoice_created = True
                quotation.invoice_created_at = timezone.now()
                quotation.save()

            # Get updated PO balance data after invoice creation (only if PO exists)
            updated_po_data = None
            if hasattr(invoice, 'purchase_order') and invoice.purchase_order:
                po_serializer = PurchaseOrderListSerializer(invoice.purchase_order)
                updated_po_data = po_serializer.data

            # Return detailed invoice data with updated PO balance
            detail_serializer = InvoiceDetailSerializer(invoice)
            response_data = detail_serializer.data
            if updated_po_data:
                response_data['updated_purchase_order'] = updated_po_data
            
            return Response(response_data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal listing
            return super().list(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class InvoiceDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete invoice for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return InvoiceUpdateSerializer
        return InvoiceDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Invoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return invoices for this company only
            return Invoice.objects.filter(
                company=service_user.company
            ).select_related(
                'customer', 'proforma_invoice', 'shipping_address', 'created_by'
            ).prefetch_related(
                'invoice_items__product',
                'payments',
                'customer__shipping_addresses'
            )

        except ServiceUserSession.DoesNotExist:
            return Invoice.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal retrieval
            return super().retrieve(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication and revision tracking"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Get the invoice instance
            invoice = self.get_object()

            # Handle revision tracking
            if request.data.get('is_revised') and not invoice.is_revised:
                # Update the invoice instance directly
                invoice.revision_count = invoice.revision_count + 1
                invoice.revised_at = timezone.now()
                invoice.revised_by = service_user
                invoice.is_revised = True
                invoice.save(update_fields=['revision_count', 'revised_at', 'revised_by', 'is_revised'])

            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication and reset claim_type if needed"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            
            # Get the invoice and its PO before deletion
            invoice = self.get_object()
            purchase_order = invoice.purchase_order if hasattr(invoice, 'purchase_order') else None
            
            # Proceed with normal deletion
            response = super().destroy(request, *args, **kwargs)
            
            # If deletion was successful and PO exists, check if we need to reset claim_type
            if response.status_code == 204 and purchase_order:
                # Check if this PO has any remaining invoices (both proforma and tax)
                has_proforma = purchase_order.proforma_invoices.exists()
                has_tax_invoice = purchase_order.invoices.exists()
                
                # If no invoices remain, reset claim_type to null
                if not has_proforma and not has_tax_invoice:
                    purchase_order.claim_type = None
                    purchase_order.save(update_fields=['claim_type'])
            
            return response

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


# Payment Views
class PaymentPagination(PageNumberPagination):
    """Custom pagination for payments"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class PaymentListCreateView(ListCreateAPIView):
    """List and create payments for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = PaymentPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PaymentCreateSerializer
        return PaymentListSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Payment.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return payments for this company only with prefetched related data
            queryset = Payment.objects.filter(
                company=service_user.company
            ).select_related(
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

            return _apply_ordering(queryset, self.request, 'payment')

        except ServiceUserSession.DoesNotExist:
            return Payment.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        """Override create to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Filter request data to prevent invalid field combinations
            data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
            
            # If invoice is provided, remove proforma_invoice to prevent validation error
            if data.get('invoice'):
                data.pop('proforma_invoice', None)
            # If proforma_invoice is provided, remove invoice to prevent validation error  
            elif data.get('proforma_invoice'):
                data.pop('invoice', None)

            # Create payment with company and created_by
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)

            payment = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            # Return detailed payment data
            detail_serializer = PaymentDetailSerializer(payment)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def list(self, request, *args, **kwargs):
        """Override list to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal listing
            return super().list(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


class PaymentDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete payment for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return PaymentUpdateSerializer
        return PaymentDetailSerializer

    def get_queryset(self):
        # Get service user from session
        session_key = self.get_session_key()
        if not session_key:
            return Payment.objects.none()

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            service_user = session.service_user

            # Return payments for this company only
            return Payment.objects.filter(
                company=service_user.company
            ).select_related(
                'customer', 'invoice', 'created_by'
            )

        except ServiceUserSession.DoesNotExist:
            return Payment.objects.none()

    def get_session_key(self):
        """Get session key from Authorization header or query params"""
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal retrieval
            return super().retrieve(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def update(self, request, *args, **kwargs):
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal update
            return super().update(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )

    def destroy(self, request, *args, **kwargs):
        """Override destroy to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            session = ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )
            # Proceed with normal deletion
            return super().destroy(request, *args, **kwargs)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def payment_stats(request):
    """Get payment statistics for the dashboard"""
    # Get session key from Authorization header or query params
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user
        payments = Payment.objects.filter(company=service_user.company)

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

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Service user not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


def _customer_ledger_impl(request):
    """Get customer ledger with transaction history"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=401)

    customer_id = request.query_params.get('customer_id')
    if not customer_id:
        return Response({'error': 'Customer ID required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user

        # Get customer
        customer = Customer.objects.get(
            id=customer_id,
            company=service_user.company
        )

        # Get date range filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Calculate period opening balance first
        period_opening_balance = customer.opening_balance or 0
        if start_date and customer.opening_balance_date:
            from datetime import datetime
            start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
            if customer.opening_balance_date < start_dt:
                # Calculate transactions between opening balance date and start_date
                period_invoices = Invoice.objects.filter(
                    customer=customer,
                    company=service_user.company,
                    is_rejected=False,
                    invoice_date__gte=customer.opening_balance_date,
                    invoice_date__lt=start_date
                )
                period_payments = Payment.objects.filter(
                    customer=customer,
                    company=service_user.company,
                    payment_date__gte=customer.opening_balance_date,
                    payment_date__lt=start_date
                )
                period_invoiced = sum(float(inv.total_amount) if str(inv.total_amount).lower() != "nan" else 0.0 for inv in period_invoices)
                period_paid = sum(float(pay.amount) if str(pay.amount).lower() != "nan" else 0.0 for pay in period_payments if pay.status == 'completed')
                period_opening_balance = customer.opening_balance + period_invoiced - period_paid

        # Build ledger entries from invoices and payments
        entries = []

        # Add opening balance entry if it exists and is within date range
        if customer.opening_balance and customer.opening_balance != 0:
            opening_date = customer.opening_balance_date or customer.created_at.date()
            
            # Check if opening balance should be included based on date filter
            include_opening = True
            if start_date:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                if opening_date < start_dt:
                    include_opening = False
            
            if include_opening:
                entries.append({
                    'id': 'opening_balance',
                    'date': opening_date.isoformat(),
                    'document_type': 'Opening Balance',
                    'document_number': 'OB-001',
                    'description': 'Opening balance brought forward',
                    'debit_amount': float(customer.opening_balance) if customer.opening_balance > 0 else 0,
                    'credit_amount': float(abs(customer.opening_balance)) if customer.opening_balance < 0 else 0,
                    'balance': 0,  # Will be calculated later
                    'status': 'active',
                })

        # Get invoices for this customer (exclude rejected)
        invoices = Invoice.objects.filter(
            customer=customer,
            company=service_user.company,
            is_rejected=False
        )

        if start_date:
            invoices = invoices.filter(invoice_date__gte=start_date)
        if end_date:
            invoices = invoices.filter(invoice_date__lte=end_date)

        # Add invoice entries (debit entries)
        for invoice in invoices:
            entries.append({
                'id': f'invoice_{invoice.id}',
                'date': invoice.invoice_date.isoformat(),
                'document_type': 'Invoice',
                'document_number': invoice.invoice_number,
                'description': f'Invoice for services/products',
                'debit_amount': float(invoice.total_amount) if str(invoice.total_amount).lower() != "nan" else 0.0,
                'credit_amount': 0,
                'balance': 0,  # Will be calculated later
                'status': invoice.payment_status,
            })

        # Get proforma invoices for this customer (exclude rejected)
        proforma_invoices = ProformaInvoice.objects.filter(
            customer=customer,
            company=service_user.company,
            is_rejected=False
        )

        if start_date:
            proforma_invoices = proforma_invoices.filter(proforma_date__gte=start_date)
        if end_date:
            proforma_invoices = proforma_invoices.filter(proforma_date__lte=end_date)

        # Add proforma invoice entries (debit entries)
        for proforma in proforma_invoices:
            entries.append({
                'id': f'proforma_{proforma.id}',
                'date': proforma.proforma_date.isoformat(),
                'document_type': 'Proforma Invoice',
                'document_number': proforma.proforma_number,
                'description': f'Proforma Invoice for services/products',
                'debit_amount': float(proforma.total_amount) if str(proforma.total_amount).lower() != "nan" else 0.0,
                'credit_amount': 0,
                'balance': 0,  # Will be calculated later
                'status': proforma.status,
            })

        # Get payments for this customer
        payments = Payment.objects.filter(
            customer=customer,
            company=service_user.company
        )

        if start_date:
            payments = payments.filter(payment_date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__lte=end_date)

        # Add payment entries (credit entries)
        for payment in payments:
            entries.append({
                'id': f'payment_{payment.id}',
                'date': payment.payment_date.isoformat(),
                'document_type': 'Payment',
                'document_number': payment.payment_number,
                'description': f'Payment received - {payment.payment_method}',
                'debit_amount': 0,
                'credit_amount': float(payment.amount) if str(payment.amount).lower() != "nan" else 0.0,
                'balance': 0,  # Will be calculated later
                'status': payment.status,
            })

        # Sort entries by date
        entries.sort(key=lambda x: x['date'])

        # Calculate running balance starting with opening balance
        balance = float(period_opening_balance) if period_opening_balance else 0
        
        # If opening balance entry exists, set its balance
        if entries and entries[0]['id'] == 'opening_balance':
            entries[0]['balance'] = balance
            # Start from second entry for remaining calculations
            start_index = 1
        else:
            start_index = 0
        
        # Calculate running balance for remaining entries
        for entry in entries[start_index:]:
            balance += entry['debit_amount'] - entry['credit_amount']
            entry['balance'] = balance

        # Calculate summary statistics
        total_invoiced = sum(float(inv.total_amount) if str(inv.total_amount).lower() != "nan" else 0.0 for inv in invoices)
        total_proforma = sum(float(pi.total_amount) if str(pi.total_amount).lower() != "nan" else 0.0 for pi in proforma_invoices)
        total_invoiced += total_proforma
        total_paid = sum(float(pay.amount) if str(pay.amount).lower() != "nan" else 0.0 for pay in payments if pay.status == 'completed')
        outstanding_amount = total_invoiced - total_paid

        # Get customer credit limit (default to 100000 if not set)
        credit_limit = getattr(customer, 'credit_limit', 100000)



        return Response({
            'customer': {
                'id': customer.id,
                'name': customer.name,
                'customer_code': customer.customer_code,
                'email': customer.email,
                'phone': customer.phone,
            },
            'opening_balance': float(period_opening_balance),
            'opening_balance_date': customer.opening_balance_date.isoformat() if customer.opening_balance_date else None,
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'outstanding_amount': outstanding_amount,
            'credit_limit': credit_limit,
            'entries': entries,
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def generate_invoice_pdf(request, invoice_id):
    """Generate PDF for an invoice"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .email_utils import generate_invoice_pdf_content
        from django.http import HttpResponse

        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user

        # Get invoice
        invoice = Invoice.objects.select_related('customer', 'company').prefetch_related('invoice_items').get(
            id=invoice_id,
            company=service_user.company
        )

        # Generate PDF using same function as email (with logo and from address)
        pdf_buffer = generate_invoice_pdf_content(invoice)

        # Create filename
        filename = f"Invoice_{invoice.invoice_number}.pdf"

        # Return PDF response
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def generate_quotation_pdf(request, quotation_id):
    """Generate PDF for a quotation"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .email_utils import generate_quotation_pdf_content
        from django.http import HttpResponse

        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user

        # Get quotation
        quotation = Quotation.objects.select_related('customer', 'company').prefetch_related('quotation_items').get(
            id=quotation_id,
            company=service_user.company
        )

        # Generate PDF using the same function as email (which has logo and from address)
        pdf_buffer = generate_quotation_pdf_content(quotation)

        # Create filename
        filename = f"Quotation_{quotation.quotation_number}.pdf"

        # Return PDF response
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except Quotation.DoesNotExist:
        return Response({'error': 'Quotation not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


def generate_purchase_order_pdf(request, purchase_order_id):
    """Generate PDF for a purchase order"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .po_pdf_service import po_pdf_service
        from django.http import HttpResponse

        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user

        # Get purchase order
        purchase_order = PurchaseOrder.objects.select_related('customer', 'company').prefetch_related('po_items').get(
            id=purchase_order_id,
            company=service_user.company
        )

        # Generate PDF using PO PDF service
        pdf_content = po_pdf_service.generate_po_pdf(purchase_order)

        # Create filename
        filename = f"PurchaseOrder_{purchase_order.internal_po_number}.pdf"

        # Return PDF response
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Purchase order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


def generate_proforma_pdf(request, proforma_id):
    """Generate PDF for a proforma invoice using template selection"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .proforma_pdf_service import proforma_pdf_service
        from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
        from django.http import HttpResponse

        session = ServiceUserSession.objects.get(
            session_key=session_key,
            is_active=True
        )
        service_user = session.service_user

        # Get proforma invoice
        proforma = ProformaInvoice.objects.select_related('customer', 'company').prefetch_related('proforma_items').get(
            id=proforma_id,
            company=service_user.company
        )

        # Get company's selected proforma template
        try:
            template_settings = CompanyQuotationTemplateSettings.objects.get(company=service_user.company)
            template_code = template_settings.selected_proforma_template
        except CompanyQuotationTemplateSettings.DoesNotExist:
            template_code = 'AS'  # Default template

        # Generate PDF using proforma PDF service with selected template
        pdf_content = proforma_pdf_service.generate_proforma_pdf(proforma, template_code)

        # Create filename
        filename = f"Proforma_{proforma.proforma_number}.pdf"

        # Return PDF response
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except ProformaInvoice.DoesNotExist:
        return Response({'error': 'Proforma invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# World-Class Payment Management Views
class WorldClassPaymentListCreateView(ListCreateAPIView):
    """World-Class Payment Management - List and create payments with invoice linking"""
    serializer_class = WorldClassPaymentListSerializer
    pagination_class = CustomerPagination

    def get_queryset(self):
        """Get payments for the company with advanced filtering"""
        session_key = self.request.query_params.get('session_key')
        if not session_key:
            return Payment.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company

            queryset = Payment.objects.filter(company=company).select_related(
                'customer', 'purchase_order', 'invoice', 'proforma_invoice', 'created_by'
            )

            # Advanced filtering
            customer_id = self.request.query_params.get('customer_id')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)

            po_id = self.request.query_params.get('purchase_order_id')
            if po_id:
                queryset = queryset.filter(purchase_order_id=po_id)

            payment_method = self.request.query_params.get('payment_method')
            if payment_method:
                queryset = queryset.filter(payment_method=payment_method)

            status = self.request.query_params.get('status')
            if status:
                queryset = queryset.filter(status=status)

            # Date range filtering
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date:
                queryset = queryset.filter(payment_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(payment_date__lte=end_date)

            return queryset

        except ServiceUserSession.DoesNotExist:
            return Payment.objects.none()

    def get_serializer_class(self):
        """Use different serializers for list and create"""
        if self.request.method == 'POST':
            return WorldClassPaymentCreateSerializer
        return WorldClassPaymentListSerializer

    def perform_create(self, serializer):
        """Create payment with company and user context"""
        session_key = self.request.data.get('session_key')
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(
                company=session.service_user.company,
                created_by=session.service_user
            )
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def purchase_order_payment_details(request, po_id):
    """World-Class Payment Details for Purchase Order - Bill-wise payment tracking with TDS"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get Purchase Order
        po = PurchaseOrder.objects.get(id=po_id, company=service_user.company)

        # Get all proforma invoices for this PO with their payments
        proforma_invoices = []
        for pf in po.proforma_invoices.all():
            payments = []
            for payment in pf.payments.filter(status='completed').order_by('-payment_date'):
                payments.append({
                    'payment_number': payment.payment_number,
                    'payment_date': payment.payment_date.strftime('%Y-%m-%d'),
                    'amount': float(payment.amount) if str(payment.amount).lower() != "nan" else 0.0,
                    'net_amount_received': float(payment.net_amount_received) if str(payment.net_amount_received).lower() != "nan" else 0.0,
                    'tds_amount': float(payment.tds_amount) if str(payment.tds_amount).lower() != "nan" else 0.0,
                    'tds_percentage': float(payment.tds_percentage) if str(payment.tds_percentage).lower() != "nan" else 0.0,
                    'tds_section': payment.tds_section,
                    'is_tds_received': payment.is_tds_received,
                    'payment_method': payment.payment_method,
                    'reference_number': payment.reference_number,
                })

            proforma_invoices.append({
                'id': pf.id,
                'proforma_number': pf.proforma_number,
                'proforma_date': pf.proforma_date.strftime('%Y-%m-%d'),
                'total_amount': float(pf.total_amount) if str(pf.total_amount).lower() != "nan" else 0.0,
                'paid_amount': float(pf.paid_amount) if str(pf.paid_amount).lower() != "nan" else 0.0,
                'outstanding_amount': float(pf.outstanding_amount) if str(pf.outstanding_amount).lower() != "nan" else 0.0,
                'payment_status': pf.payment_status,
                'payments': payments,
                'total_tds_deducted': sum(p['tds_amount'] for p in payments),
                'total_net_received': sum(p['net_amount_received'] for p in payments),
            })

        # Get all tax invoices for this PO with their payments
        tax_invoices = []
        for inv in po.invoices.all():
            payments = []
            for payment in inv.payments.filter(status='completed').order_by('-payment_date'):
                payments.append({
                    'payment_number': payment.payment_number,
                    'payment_date': payment.payment_date.strftime('%Y-%m-%d'),
                    'amount': float(payment.amount) if str(payment.amount).lower() != "nan" else 0.0,
                    'net_amount_received': float(payment.net_amount_received) if str(payment.net_amount_received).lower() != "nan" else 0.0,
                    'tds_amount': float(payment.tds_amount) if str(payment.tds_amount).lower() != "nan" else 0.0,
                    'tds_percentage': float(payment.tds_percentage) if str(payment.tds_percentage).lower() != "nan" else 0.0,
                    'tds_section': payment.tds_section,
                    'is_tds_received': payment.is_tds_received,
                    'payment_method': payment.payment_method,
                    'reference_number': payment.reference_number,
                })

            tax_invoices.append({
                'id': inv.id,
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date.strftime('%Y-%m-%d'),
                'total_amount': float(inv.total_amount) if str(inv.total_amount).lower() != "nan" else 0.0,
                'paid_amount': float(inv.paid_amount) if str(inv.paid_amount).lower() != "nan" else 0.0,
                'outstanding_amount': float(inv.outstanding_amount) if str(inv.outstanding_amount).lower() != "nan" else 0.0,
                'payment_status': inv.payment_status,
                'payments': payments,
                'total_tds_deducted': sum(p['tds_amount'] for p in payments),
                'total_net_received': sum(p['net_amount_received'] for p in payments),
            })

        # Calculate summary
        total_bills_amount = sum(pf['total_amount'] for pf in proforma_invoices) + sum(inv['total_amount'] for inv in tax_invoices)
        total_payments_received = sum(pf['paid_amount'] for pf in proforma_invoices) + sum(inv['paid_amount'] for inv in tax_invoices)
        total_outstanding = sum(pf['outstanding_amount'] for pf in proforma_invoices) + sum(inv['outstanding_amount'] for inv in tax_invoices)
        total_tds_deducted = sum(pf['total_tds_deducted'] for pf in proforma_invoices) + sum(inv['total_tds_deducted'] for inv in tax_invoices)
        total_net_received = sum(pf['total_net_received'] for pf in proforma_invoices) + sum(inv['total_net_received'] for inv in tax_invoices)

        return Response({
            'po_details': {
                'internal_po_number': po.internal_po_number,
                'po_number': po.po_number,
                'customer_name': po.customer.name,
                'total_po_amount': float(po.total_amount) if str(po.total_amount).lower() != "nan" else 0.0,
            },
            'proforma_invoices': proforma_invoices,
            'tax_invoices': tax_invoices,
            'payment_summary': {
                'total_bills_amount': total_bills_amount,
                'total_payments_received': total_payments_received,
                'total_outstanding': total_outstanding,
                'total_tds_deducted': total_tds_deducted,
                'total_net_received': total_net_received,
                'collection_efficiency': (total_payments_received / total_bills_amount * 100) if total_bills_amount > 0 else 0,
            }
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Purchase Order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def world_class_payment_summary(request):
    """World-Class Payment Summary - Advanced analytics and insights"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company

        # Get date range (default to current month)
        from datetime import datetime, date
        today = date.today()
        start_date = request.query_params.get('start_date', f"{today.year}-{today.month:02d}-01")
        end_date = request.query_params.get('end_date', str(today))

        payments = Payment.objects.filter(
            company=company,
            payment_date__range=[start_date, end_date],
            status='completed'
        )

        # Calculate summary statistics
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
        payment_count = payments.count()

        # Payment method breakdown
        payment_methods = payments.values('payment_method').annotate(
            total=Sum('amount'),
            count=models.Count('id')
        ).order_by('-total')

        # Customer-wise payments
        customer_payments = payments.values(
            'customer__name', 'customer__customer_code'
        ).annotate(
            total=Sum('amount'),
            count=models.Count('id')
        ).order_by('-total')[:10]

        # Invoice type breakdown
        tax_invoice_payments = payments.filter(invoice__isnull=False).aggregate(
            total=Sum('amount'), count=models.Count('id')
        )
        proforma_payments = payments.filter(proforma_invoice__isnull=False).aggregate(
            total=Sum('amount'), count=models.Count('id')
        )

        # Outstanding amounts
        outstanding_invoices = Invoice.objects.filter(
            company=company,
            outstanding_amount__gt=0
        ).aggregate(total=Sum('outstanding_amount'))['total'] or 0

        outstanding_proformas = ProformaInvoice.objects.filter(
            company=company,
            outstanding_amount__gt=0
        ).aggregate(total=Sum('outstanding_amount'))['total'] or 0

        return Response({
            'summary': {
                'total_payments': total_payments,
                'payment_count': payment_count,
                'average_payment': total_payments / payment_count if payment_count > 0 else 0,
                'outstanding_invoices': outstanding_invoices,
                'outstanding_proformas': outstanding_proformas,
                'total_outstanding': outstanding_invoices + outstanding_proformas
            },
            'payment_methods': payment_methods,
            'top_customers': customer_payments,
            'invoice_types': {
                'tax_invoices': tax_invoice_payments,
                'proforma_invoices': proforma_payments
            },
            'date_range': {
                'start_date': start_date,
                'end_date': end_date
            }
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def world_class_po_payment_dashboard(request, po_id):
    """World-Class PO Payment Dashboard - Complete payment tracking for a specific PO"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company

        # Get the PO
        po = PurchaseOrder.objects.get(id=po_id, company=company)

        # Get world-class payment summary
        payment_summary = po.get_world_class_payment_summary()

        # Get detailed proforma invoices with payments
        proformas = []
        for pf in po.proforma_invoices.all():
            proforma_payments = []
            for payment in pf.payments.all():
                proforma_payments.append({
                    'payment_number': payment.payment_number,
                    'payment_date': payment.payment_date,
                    'amount': payment.amount,
                    'payment_method': payment.payment_method,
                    'reference_number': payment.reference_number,
                    'status': payment.status
                })

            proformas.append({
                'proforma_number': pf.proforma_number,
                'proforma_date': pf.proforma_date,
                'total_amount': pf.total_amount,
                'paid_amount': pf.paid_amount,
                'outstanding_amount': pf.outstanding_amount,
                'payment_status': pf.payment_status,
                'payments': proforma_payments
            })

        # Get detailed tax invoices with payments
        invoices = []
        for inv in po.invoices.all():
            invoice_payments = []
            for payment in inv.payments.all():
                invoice_payments.append({
                    'payment_number': payment.payment_number,
                    'payment_date': payment.payment_date,
                    'amount': payment.amount,
                    'payment_method': payment.payment_method,
                    'reference_number': payment.reference_number,
                    'status': payment.status
                })

            invoices.append({
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date,
                'invoice_type': inv.invoice_type,
                'total_amount': inv.total_amount,
                'paid_amount': inv.paid_amount,
                'outstanding_amount': inv.outstanding_amount,
                'payment_status': inv.payment_status,
                'payments': invoice_payments
            })

        return Response({
            'po_details': {
                'internal_po_number': po.internal_po_number,
                'po_date': po.po_date,
                'customer_name': po.customer.name,
                'total_amount': po.total_amount,
                'subtotal': po.subtotal,
                'total_tax': po.total_tax,
                'claim_type': po.claim_type
            },
            'payment_summary': payment_summary,
            'proforma_invoices': proformas,
            'tax_invoices': invoices,
            'world_class_insights': {
                'total_invoices_created': len(proformas) + len(invoices),
                'advance_payment_percentage': float((payment_summary['proforma_payments'] / po.subtotal) * 100) if po.subtotal > 0 else 0.0,
                'tax_payment_percentage': float((payment_summary['invoice_payments'] / po.total_tax) * 100) if po.total_tax > 0 else 0.0,
                'overall_completion': payment_summary['payment_completion_percentage'],
                'next_action': 'Create more invoices' if payment_summary['total_outstanding'] > 0 else 'PO fully paid'
            }
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Purchase order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def sophisticated_po_claiming_status(request, po_id):
    """World-Class Sophisticated PO Claiming Status - Shows cross-impact calculations"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company

        # Get the PO
        po = PurchaseOrder.objects.get(id=po_id, company=company)

        # Update balance tracking to ensure accuracy
        po.update_balance_tracking()

        # Get sophisticated claiming status
        claiming_status = po.get_sophisticated_claiming_status()

        # Get detailed invoice breakdown
        proforma_invoices = []
        for pf in po.proforma_invoices.all():
            proforma_invoices.append({
                'proforma_number': pf.proforma_number,
                'proforma_date': pf.proforma_date,
                'subtotal': pf.subtotal,
                'total_amount': pf.total_amount,
                'percentage_of_original': float((pf.subtotal / po.subtotal) * 100) if po.subtotal > 0 else 0.0,
                'payment_status': pf.payment_status,
                'paid_amount': pf.paid_amount,
                'outstanding_amount': pf.outstanding_amount
            })

        tax_invoices = []
        for inv in po.invoices.all():
            tax_invoices.append({
                'invoice_number': inv.invoice_number,
                'invoice_date': inv.invoice_date,
                'subtotal': inv.subtotal,
                'total_amount': inv.total_amount,
                'percentage_of_original': float((inv.total_amount / po.total_amount) * 100) if po.total_amount > 0 else 0.0,
                'payment_status': inv.payment_status,
                'paid_amount': inv.paid_amount,
                'outstanding_amount': inv.outstanding_amount
            })

        # Calculate receivable amounts
        total_generated_bills = sum(pf['total_amount'] for pf in proforma_invoices) + sum(inv['total_amount'] for inv in tax_invoices)
        total_received_payments = sum(pf['paid_amount'] for pf in proforma_invoices) + sum(inv['paid_amount'] for inv in tax_invoices)
        total_receivable = total_generated_bills - total_received_payments

        return Response({
            'po_details': {
                'internal_po_number': po.internal_po_number,
                'po_date': po.po_date,
                'customer_name': po.customer.name,
                'claim_type': po.claim_type
            },
            'sophisticated_claiming_status': claiming_status,
            'proforma_invoices': proforma_invoices,
            'tax_invoices': tax_invoices,
            'financial_summary': {
                'total_generated_bills': total_generated_bills,
                'total_received_payments': total_received_payments,
                'total_receivable_amount': total_receivable,
                'receivable_percentage': float((total_receivable / total_generated_bills) * 100) if total_generated_bills > 0 else 0.0
            },
            'world_class_insights': {
                'proforma_vs_tax_invoice_ratio': f"{len(proforma_invoices)}:{len(tax_invoices)}",
                'claiming_efficiency': claiming_status['po_completion_percentage'],
                'payment_efficiency': float((total_received_payments / total_generated_bills) * 100) if total_generated_bills > 0 else 0.0,
                'next_recommended_action': _get_next_action_recommendation(claiming_status, total_receivable)
            }
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session', 'detail': 'Authentication credentials were not provided.'}, status=401)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Purchase order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

def _get_next_action_recommendation(claiming_status, total_receivable):
    """Get intelligent recommendation for next action"""
    if claiming_status['is_po_completed']:
        if total_receivable > 0:
            return "PO completed - Focus on collecting outstanding payments"
        else:
            return "PO fully completed and paid - Excellent!"
    elif claiming_status['available_tax_invoice_percentage'] > 0:
        return f"Create tax invoice for remaining {claiming_status['available_tax_invoice_percentage']:.1f}%"
    elif claiming_status['available_proforma_percentage'] > 0:
        return f"Create proforma invoice for remaining {claiming_status['available_proforma_percentage']:.1f}%"
    else:
        return "All claiming completed - Focus on payments"


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def send_invoice_email_view(request, invoice_id):
    """Send invoice via email"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    recipient_email = request.data.get('email')
    if not recipient_email:
        return Response({'error': 'Recipient email required'}, status=400)

    message = request.data.get('message', '')

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get invoice
        invoice = Invoice.objects.select_related('customer', 'company').prefetch_related('invoice_items').get(
            id=invoice_id,
            company=service_user.company
        )

        # Send email
        success, result_message = send_invoice_email(invoice, recipient_email, message)
        
        if success:
            # Update invoice status to 'sent'
            invoice.status = 'sent'
            invoice.save()
            return Response({'message': result_message})
        else:
            return Response({'error': result_message}, status=500)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def send_quotation_email_view(request, quotation_id):
    """Send quotation via email"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    recipient_email = request.data.get('email')
    if not recipient_email:
        return Response({'error': 'Recipient email required'}, status=400)

    message = request.data.get('message', '')

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get quotation
        quotation = Quotation.objects.select_related('customer', 'company').prefetch_related('quotation_items').get(
            id=quotation_id,
            company=service_user.company
        )

        # Send email
        success, result_message = send_quotation_email(quotation, recipient_email, message)
        
        if success:
            # Update quotation status to 'sent'
            quotation.status = 'sent'
            quotation.save()
            return Response({'message': result_message})
        else:
            return Response({'error': result_message}, status=500)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Quotation.DoesNotExist:
        return Response({'error': 'Quotation not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def send_proforma_email_view(request, proforma_id):
    """Send proforma invoice via email"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    recipient_email = request.data.get('email')
    if not recipient_email:
        return Response({'error': 'Recipient email required'}, status=400)

    message = request.data.get('message', '')

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get proforma invoice
        proforma = ProformaInvoice.objects.select_related('customer', 'company').prefetch_related('proforma_items').get(
            id=proforma_id,
            company=service_user.company
        )

        # Send email
        success, result_message = send_proforma_email(proforma, recipient_email, message)
        
        if success:
            # Update proforma status to 'sent'
            proforma.status = 'sent'
            proforma.save()
            return Response({'message': result_message})
        else:
            return Response({'error': result_message}, status=500)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except ProformaInvoice.DoesNotExist:
        return Response({'error': 'Proforma invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def send_purchase_order_email_view(request, purchase_order_id):
    """Send purchase order via email"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    recipient_email = request.data.get('email')
    if not recipient_email:
        return Response({'error': 'Recipient email required'}, status=400)

    message = request.data.get('message', '')

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get purchase order
        purchase_order = PurchaseOrder.objects.select_related('customer', 'company').prefetch_related('po_items').get(
            id=purchase_order_id,
            company=service_user.company
        )

        # Send email
        success, result_message = send_purchase_order_email(purchase_order, recipient_email, message)
        
        if success:
            return Response({'message': result_message})
        else:
            return Response({'error': result_message}, status=500)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except PurchaseOrder.DoesNotExist:
        return Response({'error': 'Purchase order not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def reject_proforma_invoice(request, proforma_id):
    """Reject a proforma invoice with reason"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    rejection_reason = request.data.get('rejection_reason')
    if not rejection_reason or not rejection_reason.strip():
        return Response({'error': 'Rejection reason is required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get proforma invoice
        proforma = ProformaInvoice.objects.get(
            id=proforma_id,
            company=service_user.company
        )

        # Check if it can be rejected
        if not proforma.can_be_rejected:
            return Response({'error': 'This proforma invoice cannot be rejected'}, status=400)

        # Reject the proforma invoice
        proforma.reject_proforma(rejection_reason.strip(), service_user)
        
        return Response({
            'message': 'Proforma invoice rejected successfully',
            'proforma_number': proforma.proforma_number,
            'rejection_reason': rejection_reason.strip()
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except ProformaInvoice.DoesNotExist:
        return Response({'error': 'Proforma invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def reject_invoice(request, invoice_id):
    """Reject a tax invoice with reason"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    rejection_reason = request.data.get('rejection_reason')
    if not rejection_reason or not rejection_reason.strip():
        return Response({'error': 'Rejection reason is required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get invoice
        invoice = Invoice.objects.get(
            id=invoice_id,
            company=service_user.company
        )

        # Check if it can be rejected
        if not invoice.can_be_rejected:
            return Response({'error': 'This invoice cannot be rejected'}, status=400)

        # Reject the invoice
        invoice.reject_invoice(rejection_reason.strip(), service_user)
        
        return Response({
            'message': 'Invoice rejected successfully',
            'invoice_number': invoice.invoice_number,
            'rejection_reason': rejection_reason.strip()
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def reject_quotation(request, quotation_id):
    """Reject a quotation with reason"""
    session_key = request.data.get('session_key') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    rejection_reason = request.data.get('rejection_reason')
    if not rejection_reason or not rejection_reason.strip():
        return Response({'error': 'Rejection reason is required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get quotation
        quotation = Quotation.objects.get(
            id=quotation_id,
            company=service_user.company
        )

        # Check if it can be rejected
        if not quotation.can_be_rejected:
            return Response({'error': 'This quotation cannot be rejected'}, status=400)

        # Reject the quotation
        quotation.reject_quotation(rejection_reason.strip(), service_user)
        
        return Response({
            'message': 'Quotation rejected successfully',
            'quotation_number': quotation.quotation_number,
            'rejection_reason': rejection_reason.strip()
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
    except Quotation.DoesNotExist:
        return Response({'error': 'Quotation not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ---------------------------------------------------------------------------
# Finance numbering rule management (Company Dashboard)
# ---------------------------------------------------------------------------
class FinanceNumberingRuleView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_company(self, request):
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'company_user'):
            return user.company_user.company
        return None

    def get(self, request):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Company context required'}, status=status.HTTP_403_FORBIDDEN)

        data = []
        for module, _label in FINANCE_NUMBERING_MODULE_CHOICES:
            defaults = FINANCE_DEFAULT_TEMPLATES.get(module, {})
            defaults = {
                'template': defaults.get('template', '{PREFIX}-{YY}-{SEQ}'),
                'prefix': defaults.get('prefix', ''),
                'separator': defaults.get('separator', '-'),
                'padding': defaults.get('padding', 6),
                'reset_scope': defaults.get('reset_scope', 'yearly'),
                'start_from': defaults.get('start_from', 1),
                'allow_manual_override': defaults.get('allow_manual_override', False),
            }
            rule, _ = NumberingRule.objects.get_or_create(
                company=company,
                module=module,
                defaults=defaults
            )
            data.append(NumberingRuleSerializer(rule).data)
        return Response(data)

    def patch(self, request, module):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Company context required'}, status=status.HTTP_403_FORBIDDEN)

        if module not in dict(FINANCE_NUMBERING_MODULE_CHOICES):
            return Response({'error': 'Invalid module'}, status=status.HTTP_400_BAD_REQUEST)

        defaults = FINANCE_DEFAULT_TEMPLATES.get(module, {})
        defaults = {
            'template': defaults.get('template', '{PREFIX}-{YY}-{SEQ}'),
            'prefix': defaults.get('prefix', ''),
            'separator': defaults.get('separator', '-'),
            'padding': defaults.get('padding', 6),
            'reset_scope': defaults.get('reset_scope', 'yearly'),
            'start_from': defaults.get('start_from', 1),
            'allow_manual_override': defaults.get('allow_manual_override', False),
        }
        rule, _ = NumberingRule.objects.get_or_create(
            company=company,
            module=module,
            defaults=defaults
        )

        serializer = NumberingRuleSerializer(rule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Validate start_from if provided
        if 'start_from' in request.data:
            start_from = request.data['start_from']
            if start_from < 1:
                return Response({'error': 'start_from must be at least 1'}, status=status.HTTP_400_BAD_REQUEST)
            if start_from > 999999:
                return Response({'error': 'start_from cannot exceed 999999'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        return Response(serializer.data)


class FinanceNumberingPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _get_company(self, request):
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'company_user'):
            return user.company_user.company
        return None

    def post(self, request, module):
        company = self._get_company(request)
        if not company:
            return Response({'error': 'Company context required'}, status=status.HTTP_403_FORBIDDEN)

        if module not in dict(FINANCE_NUMBERING_MODULE_CHOICES):
            return Response({'error': 'Invalid module'}, status=status.HTTP_400_BAD_REQUEST)

        defaults = FINANCE_DEFAULT_TEMPLATES.get(module, {})
        defaults = {
            'template': defaults.get('template', '{PREFIX}-{YY}-{SEQ}'),
            'prefix': defaults.get('prefix', ''),
            'separator': defaults.get('separator', '-'),
            'padding': defaults.get('padding', 6),
            'reset_scope': defaults.get('reset_scope', 'yearly'),
            'start_from': defaults.get('start_from', 1),
            'allow_manual_override': defaults.get('allow_manual_override', False),
        }
        rule, _ = NumberingRule.objects.get_or_create(
            company=company,
            module=module,
            defaults=defaults
        )

        dt = timezone.now()
        scope_key = _scope_key(rule.reset_scope, dt)
        counter = NumberingCounter.objects.filter(
            company=company, module=module, scope_key=scope_key
        ).first()
        seq = counter.next_value if counter else rule.start_from
        tokens = {
            'PREFIX': rule.prefix or '',
            'SEP': rule.separator or '',
            'YY': dt.strftime('%y'),
            'YYYY': dt.strftime('%Y'),
            'MM': dt.strftime('%m'),
            'SEQ': str(seq).zfill(rule.padding),
        }
        preview = rule.template.format(**tokens)
        return Response({'preview': preview})

class CustomerShippingAddressDetailView(APIView):
    """Retrieve customer shipping address details"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, address_id):
        """Get shipping address details"""
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.query_params.get('session_key')

        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            # Get shipping address for this company only
            shipping_address = CustomerShippingAddress.objects.get(
                id=address_id,
                customer__company=service_user.company
            )

            serializer = CustomerShippingAddressSerializer(shipping_address)
            return Response(serializer.data)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except CustomerShippingAddress.DoesNotExist:
            return Response({'error': 'Shipping address not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -----------------------------------------------------------------------------
# Customer Ledger (compat endpoint)
# -----------------------------------------------------------------------------
# NOTE: Legacy endpoint kept for backward compatibility with clients/tests.
# It must preserve session_key-based auth used across finance frontend calls.
@api_view(["GET"])
@authentication_classes([])
@permission_classes([])
def customer_ledger(request):
    """
    Legacy customer-ledger endpoint.
    Delegates to the existing ledger implementation that validates service sessions.
    """
    return _customer_ledger_impl(request)


class TDSDepositListCreateView(ListCreateAPIView):
    """List and create split TDS deposits for a payment."""
    serializer_class = TDSDepositSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _get_service_user(self):
        session_key = (
            self.request.headers.get('Authorization', '').replace('Bearer ', '')
            or self.request.query_params.get('session_key')
            or self.request.data.get('session_key')
        )
        if not session_key:
            return None
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session.service_user
        except ServiceUserSession.DoesNotExist:
            return None

    def get_queryset(self):
        service_user = self._get_service_user()
        if not service_user:
            return TDSDeposit.objects.none()
        payment_id = self.kwargs['payment_id']
        return TDSDeposit.objects.filter(
            company=service_user.company,
            payment_id=payment_id
        )

    def perform_create(self, serializer):
        service_user = self._get_service_user()
        if not service_user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Invalid session')
        payment_id = self.kwargs['payment_id']
        payment = Payment.objects.get(pk=payment_id, company=service_user.company)
        serializer.save(company=service_user.company, payment=payment)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        service_user = self._get_service_user()
        if service_user:
            try:
                payment_id = self.kwargs['payment_id']
                context['payment'] = Payment.objects.get(pk=payment_id, company=service_user.company)
            except Payment.DoesNotExist:
                pass
        return context


class TDSPaymentsListView(ListAPIView):
    """TDS Payments List - Quarter-wise grouping for Form 26Q"""
    serializer_class = TDSPaymentSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = None  # Manual pagination via limit/offset

    def _get_service_user(self):
        session_key = (
            self.request.headers.get('Authorization', '').replace('Bearer ', '')
            or self.request.query_params.get('session_key')
        )
        if not session_key:
            return None
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session.service_user
        except ServiceUserSession.DoesNotExist:
            return None

    def get_queryset(self):
        service_user = self._get_service_user()
        if not service_user:
            return Payment.objects.none()

        # Filter TDS payments: completed + tds_amount > 0
        queryset = Payment.objects.filter(
            company=service_user.company,
            status='completed',
            tds_amount__gt=0
        ).select_related(
            'customer', 'invoice', 'proforma_invoice', 'created_by'
        ).order_by('-payment_date')

        # Quarter filter
        quarter = self.request.query_params.get('quarter')
        if quarter and quarter in ['Q1', 'Q2', 'Q3', 'Q4']:
            from dateutil.relativedelta import relativedelta
            import calendar
            
            today = timezone.now().date()
            fy_start = today.replace(month=4, day=1) if today.month >= 4 else (today.replace(year=today.year-1, month=4, day=1))
            
            quarter_ranges = {
                'Q1': (fy_start, fy_start + relativedelta(months=3)),
                'Q2': (fy_start + relativedelta(months=3), fy_start + relativedelta(months=6)),
                'Q3': (fy_start + relativedelta(months=6), fy_start + relativedelta(months=9)),
                'Q4': (fy_start + relativedelta(months=9), (fy_start + relativedelta(years=1)).replace(month=4, day=1))
            }
            
            start_date, end_date = quarter_ranges[quarter]
            queryset = queryset.filter(payment_date__range=[start_date, end_date])

        # Customer filter
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)

        # TDS Section filter  
        tds_section = self.request.query_params.get('tds_section')
        if tds_section:
            queryset = queryset.filter(tds_section=tds_section)

        # Form16A pending filter
        pending_16a = self.request.query_params.get('form16a_pending')
        if pending_16a == 'true':
            queryset = queryset.filter(tds_certificate_issued=False)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # Get stats from a lightweight count query before slicing
        from django.db.models import Sum, Count, Q as DQ
        agg = queryset.aggregate(
            total_tds=Sum('tds_amount'),
            count=Count('id'),
            pending_16a=Count('id', filter=DQ(tds_certificate_issued=False)),
            ca_pending=Count('id', filter=~DQ(ca_submission_status='submitted')),
        )
        # Apply manual pagination
        limit = min(int(request.query_params.get('limit', 25)), 100)
        page = max(int(request.query_params.get('page', 1)), 1)
        offset = (page - 1) * limit
        page_qs = queryset[offset:offset + limit]
        serializer = self.get_serializer(page_qs, many=True)
        return Response({
            'results': serializer.data,
            'count': agg['count'] or 0,
            'total_tds': float(agg['total_tds'] or 0),
            'pending_16a': agg['pending_16a'] or 0,
            'ca_pending': agg['ca_pending'] or 0,
        })


class TDSExportCSVView(ListAPIView):
    """Export TDS Report CSV for CA submission - Uses TDSReportGenerator"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    renderer_classes = []  # We'll handle response manually

    def _get_service_user(self):
        session_key = (
            self.request.headers.get('Authorization', '').replace('Bearer ', '')
            or self.request.query_params.get('session_key')
        )
        if not session_key:
            return None
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session.service_user
        except ServiceUserSession.DoesNotExist:
            return None

    def _export(self, quarter, financial_year, service_user):
        from django.http import HttpResponse
        try:
            report_generator = TDSReportGenerator(company=service_user.company)
            csv_data = report_generator.generate_quarterly_tds_report(
                quarter=quarter,
                financial_year=financial_year
            )
            response = HttpResponse(csv_data, content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="TDS_Report_{financial_year}_{quarter}.csv"'
            return response
        except Exception as e:
            return Response({'error': f'TDS report generation failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get(self, request):
        service_user = self._get_service_user()
        if not service_user:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        quarter = request.query_params.get('quarter')
        financial_year = request.query_params.get('financial_year')
        if not quarter or not financial_year:
            return Response({'error': 'quarter and financial_year required'}, status=status.HTTP_400_BAD_REQUEST)
        return self._export(quarter, financial_year, service_user)

    def post(self, request):
        service_user = self._get_service_user()
        if not service_user:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

        # Required params
        quarter = request.data.get('quarter')  # Q1, Q2, Q3, Q4
        financial_year = request.data.get('financial_year')  # 2024-25
        
        if not quarter or not financial_year:
            return Response(
                {'error': 'quarter (Q1-Q4) and financial_year (YYYY-YY) required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return self._export(quarter, financial_year, service_user)


class TDSDepositDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, delete a single TDS deposit."""
    serializer_class = TDSDepositSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _get_service_user(self):
        session_key = (
            self.request.headers.get('Authorization', '').replace('Bearer ', '')
            or self.request.query_params.get('session_key')
            or self.request.data.get('session_key')
        )
        if not session_key:
            return None
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session.service_user
        except ServiceUserSession.DoesNotExist:
            return None

    def get_queryset(self):
        service_user = self._get_service_user()
        if not service_user:
            return TDSDeposit.objects.none()
        return TDSDeposit.objects.filter(company=service_user.company)

    def perform_update(self, serializer):
        deposit = serializer.save()
        # Sync certificate_received back to the parent Payment
        payment = deposit.payment
        all_deposits = payment.tds_deposits.all()
        if all_deposits.exists():
            payment.tds_certificate_received = all_deposits.filter(certificate_received=True).exists()
        else:
            payment.tds_certificate_received = deposit.certificate_received
        payment.save(update_fields=['tds_certificate_received'])


class MarkTDSCertReceivedView(APIView):
    """PATCH /api/finance/payment-tds/{id}/mark-cert-received/ — toggle tds_certificate_received on a Payment directly."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def _get_service_user(self):
        session_key = (
            self.request.headers.get('Authorization', '').replace('Bearer ', '')
            or self.request.query_params.get('session_key')
            or self.request.data.get('session_key')
        )
        if not session_key:
            return None
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return session.service_user
        except ServiceUserSession.DoesNotExist:
            return None

    def patch(self, request, payment_id):
        service_user = self._get_service_user()
        if not service_user:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            payment = Payment.objects.get(pk=payment_id, company=service_user.company)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
        received = request.data.get('certificate_received', True)
        payment.tds_certificate_received = bool(received)
        payment.save(update_fields=['tds_certificate_received'])
        return Response({'id': payment.id, 'tds_certificate_received': payment.tds_certificate_received})


# ─── Customer Pending Payment Statement ───────────────────────────────────────

@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def customer_pending_statement(request):
    """
    Pending payment statement per invoice.

    For each invoice we distinguish:
      pending_from_payment  = outstanding that is genuinely unpaid by customer
      pending_from_tds      = outstanding that is TDS already deducted by customer
                              (customer deducted it, needs to deposit to govt)
      tds_on_outstanding    = TDS expected on the remaining genuine payment outstanding
                              (only when include_tds=true and invoice.tds_applicable)
      net_payable           = pending_from_payment + tds_on_outstanding
    """
    session_key = (
        request.headers.get('Authorization', '').replace('Bearer ', '')
        or request.query_params.get('session_key')
    )
    if not session_key:
        return Response({'error': 'Session key required'}, status=401)

    customer_id = request.query_params.get('customer_id')
    if not customer_id:
        return Response({'error': 'customer_id required'}, status=400)

    include_tds = request.query_params.get('include_tds', 'true').lower() == 'true'
    fmt = request.query_params.get('format', 'json')

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        customer = Customer.objects.get(id=customer_id, company=company)
    except (ServiceUserSession.DoesNotExist, Customer.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)

    # Include paid invoices where TDS was deducted but not yet deposited
    # (outstanding = tds_deducted means customer paid net, TDS pending with govt)
    pending_invoices = Invoice.objects.filter(
        customer=customer,
        company=company,
        is_rejected=False,
        payment_status__in=['unpaid', 'partially_paid', 'paid', 'overdue']
    ).prefetch_related('payments').order_by('invoice_date')

    # Filter to only those with actual outstanding or TDS pending
    pending_invoices = [
        inv for inv in pending_invoices
        if float(inv.outstanding_amount or 0) > 0
    ]

    rows = []
    total_pending_payment = 0
    total_pending_tds = 0
    total_tds_on_outstanding = 0
    total_net_payable = 0

    for inv in pending_invoices:
        invoice_amount = float(inv.total_amount or 0)
        paid_amount    = float(inv.paid_amount or 0)
        outstanding    = float(inv.outstanding_amount or max(invoice_amount - paid_amount, 0))

        # Sum TDS already deducted across all completed payments for this invoice
        tds_already_deducted = sum(
            float(p.tds_amount or 0)
            for p in inv.payments.filter(status='completed')
            if p.tds_applicable and float(p.tds_amount or 0) > 0
        )

        # Determine how much of the outstanding is TDS vs genuine unpaid
        # If outstanding <= tds_already_deducted: entire outstanding is TDS withheld
        # If outstanding > tds_already_deducted: part is TDS, rest is genuine unpaid
        pending_from_tds = min(round(tds_already_deducted, 2), round(outstanding, 2))
        pending_from_payment = round(max(outstanding - pending_from_tds, 0), 2)

        # TDS expected on the remaining genuine payment outstanding
        tds_on_outstanding = 0.0
        tds_rate = float(inv.tds_rate or 0)
        tds_section = inv.tds_section or ''
        if include_tds and inv.tds_applicable and pending_from_payment > 0 and tds_rate > 0:
            tds_on_outstanding = round(pending_from_payment * tds_rate / 100, 2)

        # Net payable = genuine pending payment + TDS on that outstanding
        net_payable = round(pending_from_payment + tds_on_outstanding, 2)

        total_pending_payment += pending_from_payment
        total_pending_tds += pending_from_tds
        total_tds_on_outstanding += tds_on_outstanding
        total_net_payable += net_payable

        rows.append({
            'invoice_id':            inv.id,
            'invoice_number':        inv.invoice_number,
            'invoice_date':          inv.invoice_date.isoformat(),
            'due_date':              inv.due_date.isoformat() if inv.due_date else None,
            'invoice_amount':        invoice_amount,
            'paid_amount':           paid_amount,
            'outstanding_amount':    round(outstanding, 2),
            # Split outstanding into TDS vs genuine payment
            'pending_from_payment':  pending_from_payment,
            'pending_from_tds':      pending_from_tds,
            # TDS info
            'tds_applicable':        inv.tds_applicable,
            'tds_section':           tds_section,
            'tds_rate':              tds_rate,
            'tds_already_deducted':  round(tds_already_deducted, 2),
            'tds_on_outstanding':    tds_on_outstanding,
            'net_payable':           net_payable,
            'payment_status':        inv.payment_status,
            'days_overdue': (
                (timezone.now().date() - inv.due_date).days
                if inv.due_date and inv.due_date < timezone.now().date() else 0
            ),
        })

    summary = {
        'customer': {
            'id':            customer.id,
            'name':          customer.name,
            'customer_code': customer.customer_code,
            'email':         customer.email,
            'phone':         customer.phone,
            'gstin':         getattr(customer, 'gstin', '') or '',
            'pan_number':    getattr(customer, 'pan_number', '') or '',
        },
        'company': {
            'name':    company.name,
            'address': getattr(company, 'address', '') or '',
            'phone':   getattr(company, 'phone', '') or '',
            'email':   company.email,
            'gstin':   getattr(company, 'gst_number', '') or '',
        },
        'include_tds':              include_tds,
        'total_pending_payment':    round(total_pending_payment, 2),
        'total_pending_tds':        round(total_pending_tds, 2),
        'total_tds_on_outstanding': round(total_tds_on_outstanding, 2),
        'total_net_payable':        round(total_net_payable, 2),
        'pending_count':            len(rows),
        'statement_date':           timezone.now().date().isoformat(),
        'invoices':                 rows,
    }

    if fmt == 'pdf':
        return _generate_pending_statement_pdf(summary, company)

    return Response(summary)


def _generate_pending_statement_pdf(data, company):
    """Generate PDF for pending payment statement using WeasyPrint."""
    from django.template.loader import render_to_string
    from django.http import HttpResponse
    import weasyprint

    html = _build_pending_statement_html(data, company)
    try:
        pdf = weasyprint.HTML(string=html).write_pdf()
        customer_name = data['customer']['name'].replace(' ', '_')
        filename = f"Pending_Statement_{customer_name}_{data['statement_date']}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        logger.error(f"Pending statement PDF error: {e}")
        return Response({'error': str(e)}, status=500)


def _build_pending_statement_html(data, company):
    """Build HTML for pending payment statement."""
    from django.utils.html import escape
    c = data['customer']
    co = data['company']
    rows_html = ''
    for inv in data['invoices']:
        overdue_style = 'color:#dc2626;font-weight:600' if inv['days_overdue'] > 0 else ''
        tds_cell = f"₹{inv['tds_amount']:,.2f}<br><small style='color:#6b7280'>{inv['tds_section']} @ {inv['tds_rate']}%</small>" if inv['tds_amount'] else '—'
        rows_html += f"""
        <tr>
          <td>{escape(inv['invoice_number'])}</td>
          <td>{inv['invoice_date']}</td>
          <td>{inv['due_date'] or '—'}</td>
          <td style='text-align:right'>₹{inv['invoice_amount']:,.2f}</td>
          <td style='text-align:right'>₹{inv['paid_amount']:,.2f}</td>
          <td style='text-align:right'>₹{inv['outstanding_amount']:,.2f}</td>
          <td style='text-align:right'>{tds_cell}</td>
          <td style='text-align:right;font-weight:700'>₹{inv['net_payable']:,.2f}</td>
          <td style='text-align:center;{overdue_style}'>{'Overdue ' + str(inv['days_overdue']) + 'd' if inv['days_overdue'] > 0 else inv['payment_status'].replace('_',' ').title()}</td>
        </tr>"""

    tds_header = '<th>TDS Deducted</th>' if data['include_tds'] else ''
    tds_summary = f"<tr><td colspan='2'><strong>TDS Deducted</strong></td><td style='text-align:right;color:#7c3aed'>₹{data['total_tds_deducted']:,.2f}</td></tr>" if data['include_tds'] else ''

    return f"""<!DOCTYPE html>
<html><head><meta charset='UTF-8'>
<style>
  @page{{size:A4;margin:15mm}}
  body{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#1e293b}}
  .header{{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1e40af}}
  .company-name{{font-size:18px;font-weight:700;color:#1e40af;text-transform:uppercase}}
  .title{{font-size:16px;font-weight:700;color:#1e293b;margin:16px 0 4px}}
  .subtitle{{font-size:11px;color:#64748b}}
  .info-grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}}
  .info-box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px}}
  .info-label{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:4px}}
  table{{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:10px}}
  th{{background:#1e40af;color:#fff;padding:7px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.4px}}
  td{{padding:6px 8px;border-bottom:1px solid #e2e8f0}}
  tr:nth-child(even) td{{background:#f8fafc}}
  .summary-table{{width:280px;margin-left:auto;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}}
  .summary-table td{{padding:7px 12px;border-bottom:1px solid #e2e8f0}}
  .summary-table tr:last-child td{{background:#1e40af;color:#fff;font-weight:700;font-size:12px;border:none}}
  .footer{{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}}
</style></head><body>
<div class='header'>
  <div>
    <div class='company-name'>{escape(co['name'])}</div>
    <div style='font-size:10px;color:#64748b;margin-top:4px'>{escape(co['address'])}</div>
    <div style='font-size:10px;color:#64748b'>GSTIN: {escape(co['gstin'])}</div>
  </div>
  <div style='text-align:right'>
    <div class='title'>Pending Payment Statement</div>
    <div class='subtitle'>Statement Date: {data['statement_date']}</div>
    <div class='subtitle'>{'TDS Included' if data['include_tds'] else 'Excluding TDS'}</div>
  </div>
</div>
<div class='info-grid'>
  <div class='info-box'>
    <div class='info-label'>Bill To</div>
    <div style='font-weight:700;font-size:13px'>{escape(c['name'])}</div>
    <div style='color:#64748b'>{escape(c['customer_code'])}</div>
    <div style='color:#64748b'>{escape(c['email'])}</div>
    <div style='color:#64748b'>{escape(c['phone'])}</div>
    {'<div style="color:#64748b">GSTIN: ' + escape(c['gstin']) + '</div>' if c['gstin'] else ''}
  </div>
  <div class='info-box'>
    <div class='info-label'>Summary</div>
    <div>Total Pending Invoices: <strong>{data['pending_count']}</strong></div>
    <div>Total Outstanding: <strong style='color:#dc2626'>₹{data['total_outstanding']:,.2f}</strong></div>
    <div>Net Payable: <strong style='color:#1e40af'>₹{data['net_payable']:,.2f}</strong></div>
  </div>
</div>
<table>
  <thead><tr>
    <th>Invoice No.</th><th>Invoice Date</th><th>Due Date</th>
    <th style='text-align:right'>Invoice Amt</th>
    <th style='text-align:right'>Paid</th>
    <th style='text-align:right'>Outstanding</th>
    {tds_header}
    <th style='text-align:right'>Net Payable</th>
    <th style='text-align:center'>Status</th>
  </tr></thead>
  <tbody>{rows_html}</tbody>
</table>
<table class='summary-table'>
  <tr><td colspan='2'><strong>Total Invoice Amount</strong></td><td style='text-align:right'>₹{data['total_invoice_amount']:,.2f}</td></tr>
  <tr><td colspan='2'><strong>Total Paid</strong></td><td style='text-align:right;color:#16a34a'>₹{data['total_paid']:,.2f}</td></tr>
  <tr><td colspan='2'><strong>Total Outstanding</strong></td><td style='text-align:right;color:#dc2626'>₹{data['total_outstanding']:,.2f}</td></tr>
  {tds_summary}
  <tr><td colspan='2'>Net Payable</td><td style='text-align:right'>₹{data['net_payable']:,.2f}</td></tr>
</table>
<div class='footer'>This is a computer-generated statement. Please contact us for any discrepancies. | {escape(co['name'])} | {escape(co['email'])}</div>
</body></html>"""


# ─── PO / WO Consolidated Report ──────────────────────────────────────────────

@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def po_consolidated_report(request, po_id):
    """
    Generate a consolidated PDF report for a PO/WO including:
    overview, items, claiming status, related invoices, financial summary.
    """
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '') or request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=401)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        po = PurchaseOrder.objects.get(id=po_id, company=company)
    except (ServiceUserSession.DoesNotExist, PurchaseOrder.DoesNotExist):
        return Response({'error': 'Not found'}, status=404)

    # Gather related invoices
    proformas = ProformaInvoice.objects.filter(company=company, purchase_order=po)
    invoices = Invoice.objects.filter(company=company, purchase_order=po, is_rejected=False)

    total_amount = float(po.total_amount or 0)
    proforma_claimed = float(po.proforma_claimed_amount or 0)
    invoice_claimed = float(po.invoice_claimed_amount or 0)
    total_claimed = proforma_claimed + invoice_claimed
    balance = total_amount - total_claimed
    claimed_pct = (total_claimed / total_amount * 100) if total_amount else 0

    html = _build_po_report_html(po, company, proformas, invoices, {
        'total_amount': total_amount,
        'proforma_claimed': proforma_claimed,
        'invoice_claimed': invoice_claimed,
        'total_claimed': total_claimed,
        'balance': balance,
        'claimed_pct': claimed_pct,
    })

    try:
        import weasyprint
        from django.http import HttpResponse
        pdf = weasyprint.HTML(string=html).write_pdf()
        filename = f"PO_Report_{po.internal_po_number}_{timezone.now().date()}.pdf"
        response = HttpResponse(pdf, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except Exception as e:
        logger.error(f"PO consolidated report PDF error: {e}")
        return Response({'error': str(e)}, status=500)


def _shipping_address_section(po):
    """Build shipping address HTML section for PO report."""
    from django.utils.html import escape
    addr = po.shipping_address
    if not addr:
        return ''
    parts = filter(None, [
        addr.address_line1,
        addr.address_line2,
        f"{addr.city}, {addr.state} {addr.pincode}".strip(', '),
        addr.country,
    ])
    address_text = '<br>'.join(escape(p) for p in parts if p and p.strip())
    label = escape(addr.label or 'Shipping Address')
    return f"""<div class='section'>
  <div class='section-title'>Shipping Address</div>
  <div class='card' style='border-left:3px solid #f97316'>
    <div style='font-size:10px;font-weight:700;color:#f97316;margin-bottom:4px'>{label}</div>
    <div style='line-height:1.6'>{address_text}</div>
  </div>
</div>"""


def _build_po_report_html(po, company, proformas, invoices, claiming):
    from django.utils.html import escape
    from decimal import Decimal

    # Pre-compute item claimed amounts from tax invoices + proforma invoices
    item_claimed_map = {}  # product_id -> active claimed amount
    for invoice in po.invoices.filter(is_rejected=False):
        for inv_item in invoice.invoice_items.all():
            pid = inv_item.product_id
            item_claimed_map[pid] = item_claimed_map.get(pid, Decimal('0')) + inv_item.line_total
    for proforma in po.proforma_invoices.filter(is_rejected=False):
        for pf_item in proforma.proforma_items.all():
            pid = pf_item.product_id
            item_claimed_map[pid] = item_claimed_map.get(pid, Decimal('0')) + pf_item.line_total

    # Items rows
    items_html = ''
    for item in po.po_items.all():
        line_total = Decimal(str(item.line_total or 0))
        claimed_amt = float(item_claimed_map.get(item.product_id, Decimal('0')))
        balance_amt = float(max(line_total - Decimal(str(claimed_amt)), Decimal('0')))
        claimed_pct = float(min((Decimal(str(claimed_amt)) / line_total) * 100, Decimal('100'))) if line_total else 0.0
        balance_pct = max(100.0 - claimed_pct, 0.0)
        items_html += f"""<tr>
          <td>{escape(item.product_name)}</td>
          <td style='text-align:center'>{item.quantity} {item.unit or ''}</td>
          <td style='text-align:right'>₹{float(item.unit_price):,.2f}</td>
          <td style='text-align:right'>₹{float(line_total):,.2f}</td>
          <td style='text-align:center'>{item.gst_rate}%</td>
          <td style='text-align:right;color:#16a34a'>₹{claimed_amt:,.2f}<br><span style='font-size:9px'>({claimed_pct:.1f}%)</span></td>
          <td style='text-align:right;color:#d97706'>₹{balance_amt:,.2f}<br><span style='font-size:9px'>({balance_pct:.1f}%)</span></td>
        </tr>"""

    # Related invoices rows
    inv_rows = ''
    for pf in proformas:
        inv_rows += f"""<tr>
          <td><span style='background:#ede9fe;color:#7c3aed;padding:2px 6px;border-radius:4px;font-size:9px'>Proforma</span></td>
          <td>{escape(pf.proforma_number)}</td>
          <td>{pf.proforma_date}</td>
          <td style='text-align:right'>₹{float(pf.total_amount):,.2f}</td>
          <td style='text-align:center'>{pf.status or '—'}</td>
        </tr>"""
    for inv in invoices:
        status_color = '#16a34a' if inv.payment_status == 'paid' else '#d97706' if inv.payment_status == 'partially_paid' else '#dc2626'
        inv_rows += f"""<tr>
          <td><span style='background:#fff7ed;color:#c2410c;padding:2px 6px;border-radius:4px;font-size:9px'>Tax Invoice</span></td>
          <td>{escape(inv.invoice_number)}</td>
          <td>{inv.invoice_date}</td>
          <td style='text-align:right'>₹{float(inv.total_amount):,.2f}</td>
          <td style='text-align:center;color:{status_color};font-weight:600'>{inv.payment_status.replace('_',' ').title()}</td>
        </tr>"""

    bar_width = min(claiming['claimed_pct'], 100)

    return f"""<!DOCTYPE html>
<html><head><meta charset='UTF-8'>
<style>
  @page{{size:A4;margin:15mm}}
  body{{font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#1e293b}}
  .header{{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #1e40af;margin-bottom:18px}}
  .co-name{{font-size:17px;font-weight:700;color:#1e40af;text-transform:uppercase}}
  .doc-title{{font-size:15px;font-weight:700;color:#1e293b}}
  .section{{margin-bottom:18px}}
  .section-title{{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#1e40af;border-bottom:1.5px solid #bfdbfe;padding-bottom:4px;margin-bottom:10px}}
  .grid-2{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}
  .grid-4{{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}}
  .card{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px}}
  .card-label{{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#94a3b8;margin-bottom:3px}}
  .card-value{{font-size:14px;font-weight:700;color:#1e293b}}
  table{{width:100%;border-collapse:collapse;font-size:10px;margin-bottom:4px}}
  th{{background:#1e40af;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.3px}}
  td{{padding:5px 8px;border-bottom:1px solid #e2e8f0}}
  tr:nth-child(even) td{{background:#f8fafc}}
  .progress-bar{{background:#e2e8f0;border-radius:4px;height:10px;overflow:hidden;margin:6px 0}}
  .progress-fill{{background:linear-gradient(90deg,#1e40af,#3b82f6);height:100%;border-radius:4px}}
  .footer{{margin-top:20px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}}
  .badge{{display:inline-block;padding:2px 8px;border-radius:4px;font-size:9px;font-weight:600}}
  .badge-approved{{background:#dcfce7;color:#166534}}
  .badge-pending{{background:#fef9c3;color:#854d0e}}
  .badge-draft{{background:#f1f5f9;color:#475569}}
</style></head><body>

<div class='header'>
  <div>
    <div class='co-name'>{escape(company.name)}</div>
    <div style='font-size:10px;color:#64748b;margin-top:3px'>{escape(getattr(company,'address','') or '')}</div>
    <div style='font-size:10px;color:#64748b'>GSTIN: {escape(getattr(company,'gst_number','') or '')}</div>
  </div>
  <div style='text-align:right'>
    <div class='doc-title'>PO Consolidated Report</div>
    <div style='font-size:11px;color:#64748b;margin-top:3px'>{escape(po.internal_po_number)}</div>
    <div style='font-size:10px;color:#94a3b8'>Generated: {timezone.now().date()}</div>
  </div>
</div>

<div class='section'>
  <div class='section-title'>Purchase Order Overview</div>
  <div class='grid-2'>
    <div class='card'><div class='card-label'>Internal PO Number</div><div class='card-value' style='font-size:13px'>{escape(po.internal_po_number)}</div></div>
    <div class='card'><div class='card-label'>Client PO Number</div><div class='card-value' style='font-size:13px'>{escape(po.po_number or '—')}</div></div>
    <div class='card'><div class='card-label'>PO Date</div><div class='card-value' style='font-size:12px'>{po.po_date}</div></div>
    <div class='card'><div class='card-label'>Status</div>
      <span class='badge badge-{"approved" if po.status == "approved" else "pending" if po.status == "pending" else "draft"}'>{(po.status or '').upper()}</span>
    </div>
    <div class='card'><div class='card-label'>Customer</div><div class='card-value' style='font-size:12px'>{escape(po.customer.name)}</div></div>
    <div class='card'><div class='card-label'>GST Type</div><div class='card-value' style='font-size:12px'>{(po.gst_type or '').upper()}</div></div>
  </div>
</div>

{_shipping_address_section(po)}

<div class='section'>
  <div class='section-title'>Financial Summary</div>
  <div class='grid-4'>
    <div class='card'><div class='card-label'>PO Value</div><div class='card-value'>₹{claiming['total_amount']:,.2f}</div></div>
    <div class='card'><div class='card-label'>Total Claimed</div><div class='card-value' style='color:#1e40af'>₹{claiming['total_claimed']:,.2f}</div></div>
    <div class='card'><div class='card-label'>Balance</div><div class='card-value' style='color:#d97706'>₹{claiming['balance']:,.2f}</div></div>
    <div class='card'><div class='card-label'>Claimed %</div><div class='card-value' style='color:#16a34a'>{claiming['claimed_pct']:.1f}%</div></div>
  </div>
  <div style='margin-top:10px'>
    <div style='display:flex;justify-content:space-between;font-size:10px;color:#64748b;margin-bottom:3px'>
      <span>Claiming Progress</span><span>{claiming['claimed_pct']:.1f}% Complete</span>
    </div>
    <div class='progress-bar'><div class='progress-fill' style='width:{bar_width}%'></div></div>
    <div style='display:flex;justify-content:space-between;font-size:9px;color:#94a3b8'>
      <span>₹0</span><span>₹{claiming['total_amount']:,.2f}</span>
    </div>
  </div>
  <div style='margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:10px'>
    <div class='card'><div class='card-label'>Subtotal</div><div style='font-weight:600'>₹{float(po.subtotal or 0):,.2f}</div></div>
    <div class='card'><div class='card-label'>Total Tax</div><div style='font-weight:600;color:#d97706'>₹{float(po.total_tax or 0):,.2f}</div></div>
    <div class='card'><div class='card-label'>CGST</div><div style='font-weight:600'>₹{float(getattr(po,'cgst_amount',0) or 0):,.2f}</div></div>
    <div class='card'><div class='card-label'>SGST</div><div style='font-weight:600'>₹{float(getattr(po,'sgst_amount',0) or 0):,.2f}</div></div>
    <div class='card'><div class='card-label'>IGST</div><div style='font-weight:600'>₹{float(getattr(po,'igst_amount',0) or 0):,.2f}</div></div>
    <div class='card'><div class='card-label'>Discount</div><div style='font-weight:600;color:#dc2626'>₹{float(po.discount_amount or 0):,.2f}</div></div>
  </div>
</div>

<div class='section'>
  <div class='section-title'>Line Items ({po.po_items.count()})</div>
  <table>
    <thead><tr>
      <th>Description</th><th style='text-align:center'>Qty</th>
      <th style='text-align:right'>Unit Price</th><th style='text-align:right'>Line Total</th>
      <th style='text-align:center'>GST</th>
      <th style='text-align:right'>Claimed</th><th style='text-align:right'>Balance</th>
    </tr></thead>
    <tbody>{items_html}</tbody>
  </table>
</div>

<div class='section'>
  <div class='section-title'>Related Invoices ({proformas.count() + invoices.count()})</div>
  {'<table><thead><tr><th>Type</th><th>Number</th><th>Date</th><th style="text-align:right">Amount</th><th style="text-align:center">Status</th></tr></thead><tbody>' + inv_rows + '</tbody></table>' if inv_rows else '<p style="color:#94a3b8;font-style:italic">No related invoices found.</p>'}
</div>

{'<div class="section"><div class="section-title">Notes</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:10px;color:#374151">' + escape(po.notes) + '</div></div>' if po.notes else ''}
{'<div class="section"><div class="section-title">Terms & Conditions</div><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-size:10px;color:#374151">' + escape(po.terms_and_conditions) + '</div></div>' if po.terms_and_conditions else ''}

<div class='footer'>
  Confidential — {escape(company.name)} | {escape(getattr(company,'email',''))} | Generated on {timezone.now().date()} | Computer-generated report
</div>
</body></html>"""
