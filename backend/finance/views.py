from rest_framework import status, permissions
from django.utils._os import safe_join
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
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
from .models import Customer, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem, ProformaInvoice, ProformaInvoiceItem, Invoice, InvoiceItem, Payment
from .email_utils import send_invoice_email, send_proforma_email, send_quotation_email, send_purchase_order_email
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerCreateSerializer, CustomerUpdateSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    HSNCodeSerializer, SACCodeSerializer,
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
    WorldClassPaymentCreateSerializer, WorldClassPaymentListSerializer
)


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

            return queryset.order_by('-created_at')

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
            # Remove any potentially dangerous characters
            session_key = re.sub(r'[^a-zA-Z0-9_-]', '', str(session_key))
            # Limit length to prevent buffer overflow
            session_key = session_key[:64] if len(session_key) > 64 else session_key
            # Validate format
            if not re.match(r'^[a-zA-Z0-9_-]+$', session_key):
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
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductListCreateView(ListCreateAPIView):
    """List and create products for finance service"""
    authentication_classes = []  # Disable JWT authentication
    permission_classes = [permissions.AllowAny]  # Uses session-based auth
    pagination_class = ProductPagination

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

            return queryset.order_by('-created_at')

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

            # Create product with company and created_by
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            product = serializer.save(
                company=service_user.company,
                created_by=service_user
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

            product_type = request.query_params.get('type', 'product')

            if product_type == 'product':
                # Generate PRD- codes for products
                last_product = Product.objects.filter(
                    company=service_user.company,
                    product_type='product',
                    product_code__startswith='PRD-'
                ).order_by('-id').first()
                if last_product:
                    last_number = int(last_product.product_code.split('-')[-1])
                    next_code = f"PRD-{last_number + 1:06d}"
                else:
                    next_code = "PRD-000001"
            else:
                # Generate SER- codes for services
                last_service = Product.objects.filter(
                    company=service_user.company,
                    product_type='service',
                    product_code__startswith='SER-'
                ).order_by('-id').first()
                if last_service:
                    last_number = int(last_service.product_code.split('-')[-1])
                    next_code = f"SER-{last_number + 1:06d}"
                else:
                    next_code = "SER-000001"

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

            return queryset.order_by('-created_at')

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

            return queryset.order_by('-created_at')

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

            # Update the related quotation status to 'approved'
            if purchase_order.quotation:
                quotation = purchase_order.quotation
                quotation.status = 'approved'
                quotation.save()

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

            # If deletion was successful, revert quotation status to 'sent'
            if response.status_code == 204:  # HTTP 204 No Content (successful deletion)
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

            customer_id = self.request.query_params.get('customer', '')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)

            return queryset.order_by('-created_at')

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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            proforma_invoice = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            # Get updated PO balance data after proforma creation
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
        """Override update to handle session authentication"""
        session_key = self.get_session_key()
        if not session_key:
            return Response(
                {'error': 'Session key required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            ServiceUserSession.objects.get(
                session_key=session_key,
                is_active=True
            )

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
            if payment_status_filter:
                queryset = queryset.filter(payment_status=payment_status_filter)

            customer_id = self.request.query_params.get('customer', '')
            if customer_id:
                queryset = queryset.filter(customer_id=customer_id)

            return queryset.order_by('-created_at')

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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            invoice = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            # Get updated PO balance data after invoice creation
            updated_po_data = None
            if invoice.purchase_order:
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

            return queryset.order_by('-created_at')

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


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def customer_ledger(request):
    """Get customer ledger with transaction history"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

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

        # Build ledger entries from invoices and payments
        entries = []

        # Get invoices for this customer
        invoices = Invoice.objects.filter(
            customer=customer,
            company=service_user.company
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

        # Calculate running balance
        balance = 0
        for entry in entries:
            balance += entry['debit_amount'] - entry['credit_amount']
            entry['balance'] = balance

        # Calculate summary statistics
        total_invoiced = sum(float(inv.total_amount) if str(inv.total_amount).lower() != "nan" else 0.0 for inv in invoices)
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
            'opening_balance': 0,  # Could be calculated from previous periods
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'outstanding_amount': outstanding_amount,
            'credit_limit': credit_limit,
            'entries': entries,
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
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
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .pdf_utils import generate_invoice_pdf, create_pdf_response

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

        # Generate PDF
        pdf_data = generate_invoice_pdf(invoice)

        # Create filename
        filename = f"Invoice_{invoice.invoice_number}.pdf"

        # Return PDF response
        return create_pdf_response(pdf_data, filename)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def generate_proforma_pdf(request, proforma_id):
    """Generate PDF for a proforma invoice"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    try:
        from .pdf_utils import generate_invoice_pdf, create_pdf_response

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

        # Convert proforma to invoice-like object for PDF generation
        # This is a temporary solution - ideally we'd have a separate ProformaPDFGenerator
        class ProformaWrapper:
            def __init__(self, proforma):
                self.invoice_number = proforma.proforma_number
                self.invoice_date = proforma.proforma_date
                self.due_date = proforma.due_date
                self.payment_status = proforma.status
                self.customer_details = proforma.customer_details
                self.company = proforma.company
                self.subtotal = proforma.subtotal
                self.total_tax = proforma.total_tax
                self.total_amount = proforma.total_amount
                self.paid_amount = 0
                self.outstanding_amount = proforma.total_amount

            def invoice_items(self):
                return proforma.proforma_items

        wrapped_proforma = ProformaWrapper(proforma)
        wrapped_proforma.invoice_items = proforma.proforma_items

        # Generate PDF
        pdf_data = generate_invoice_pdf(wrapped_proforma)

        # Create filename
        filename = f"Proforma_{proforma.proforma_number}.pdf"

        # Return PDF response
        return create_pdf_response(pdf_data, filename)

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
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
        return Response({'error': 'Invalid session'}, status=404)
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
        return Response({'error': 'Invalid session'}, status=404)
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
        return Response({'error': 'Invalid session'}, status=404)
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
