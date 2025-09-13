from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import action
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from authentication.models import ServiceUserSession, CompanyServiceUser
from .models import Customer, Product, HSNCode, SACCode, Quotation, QuotationItem, PurchaseOrder, PurchaseOrderItem
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerCreateSerializer, CustomerUpdateSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    HSNCodeSerializer, SACCodeSerializer,
    QuotationListSerializer, QuotationDetailSerializer,
    QuotationCreateSerializer, QuotationUpdateSerializer,
    PurchaseOrderListSerializer, PurchaseOrderDetailSerializer,
    PurchaseOrderCreateSerializer, PurchaseOrderUpdateSerializer
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

            # Add search functionality
            search = self.request.query_params.get('search', '')
            if search:
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
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
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

            serializer.save(
                company=service_user.company,
                created_by=service_user
            )

        except ServiceUserSession.DoesNotExist:
            raise PermissionError("Invalid session")

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
            # Proceed with normal creation
            return super().create(request, *args, **kwargs)

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
            limit = int(request.query_params.get('limit', 20))

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
            limit = int(request.query_params.get('limit', 20))

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
        """Get session key from Authorization header"""
        return self.request.headers.get('Authorization', '').replace('Bearer ', '')

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
