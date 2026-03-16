from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Sum
from django.db import transaction, IntegrityError
from django.utils import timezone
from datetime import timedelta
import logging

from common.viewsets import CompanyScopedModelViewSet
from .models import Customer, Product, HSNCode, SACCode, Quotation, QuotationItem
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerCreateSerializer, CustomerUpdateSerializer,
    ProductListSerializer, ProductDetailSerializer,
    ProductCreateSerializer, ProductUpdateSerializer,
    HSNCodeSerializer, SACCodeSerializer,
    QuotationListSerializer, QuotationDetailSerializer,
    QuotationCreateSerializer, QuotationUpdateSerializer,
)

logger = logging.getLogger(__name__)


class CustomerPagination(PageNumberPagination):
    """Custom pagination for customers"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class CustomerViewSet(CompanyScopedModelViewSet):
    """Customer management with centralized tenant enforcement"""
    pagination_class = CustomerPagination
    
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
    
    def create(self, request, *args, **kwargs):
        """Override create to handle better error handling"""
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"Customer creation successful for company: {self.get_company().name}")
            return response
        except ValidationError as e:
            logger.error(f"Customer validation failed for company {self.get_company().name}: {str(e)}")
            return Response(
                e.detail if hasattr(e, 'detail') else {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError as e:
            logger.error(f"Customer creation integrity error for company {self.get_company().name}: {str(e)}")
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
            logger.error(f"Customer creation failed for company {self.get_company().name}: {str(e)}")
            return Response(
                {
                    'error': 'Customer creation failed',
                    'message': 'An unexpected error occurred. Please try again or contact support.',
                },
                status=status.HTTP_400_BAD_REQUEST
            )


class ProductPagination(PageNumberPagination):
    """Custom pagination for products"""
    page_size = 100
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProductViewSet(CompanyScopedModelViewSet):
    """Product management with centralized tenant enforcement"""
    pagination_class = ProductPagination
    
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
    
    def create(self, request, *args, **kwargs):
        """Override create to handle GST rate manual overrides"""
        try:
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

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            # Set manual override flag BEFORE saving to prevent GST rate overwrite
            if manual_gst_override:
                # Create product instance without triggering save
                product = Product(
                    company=self.get_company(),
                    created_by=self.request.service_user,
                    **{k: v for k, v in serializer.validated_data.items()}
                )
                product._manual_gst_override = True
                product.save()
            else:
                product = serializer.save(
                    company=self.get_company(),
                    created_by=self.request.service_user
                )

            # Return detailed product data
            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except IntegrityError:
            return Response(
                {'error': 'Product code already exists for this company. Please use a different code or edit the existing product.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class QuotationPagination(PageNumberPagination):
    """Custom pagination for quotations"""
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class QuotationViewSet(CompanyScopedModelViewSet):
    """Quotation management with centralized tenant enforcement"""
    pagination_class = QuotationPagination
    
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
    
    def perform_update(self, serializer):
        """Handle revision tracking"""
        instance = self.get_object()
        
        # Handle revision tracking
        if self.request.data.get('is_revised') and not instance.is_revised:
            # This is the first revision
            serializer.validated_data['revision_count'] = instance.revision_count + 1
            serializer.validated_data['revised_at'] = timezone.now()
            serializer.validated_data['revised_by'] = self.request.service_user
        
        super().perform_update(serializer)
    
    @action(detail=True, methods=['post'])
    def copy(self, request, pk=None):
        """Copy an existing quotation with new number, date, and validity"""
        original_quotation = self.get_object()  # This ensures company scoping
        
        # Create new quotation with copied data
        new_quotation = Quotation.objects.create(
            company=self.get_company(),
            created_by=self.request.service_user,
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


# Keep existing API views that don't fit the ViewSet pattern
@api_view(['GET'])
def hsn_code_search(request):
    """Search HSN codes for products"""
    # This would use the new authentication but doesn't need ViewSet
    from authentication.authentication import ServiceUserSessionAuthentication
    from authentication.permissions import IsServiceUserAuthenticated
    
    # Manual authentication check for function-based views
    auth = ServiceUserSessionAuthentication()
    try:
        user, auth_token = auth.authenticate(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
    except:
        return Response({'error': 'Invalid authentication'}, status=status.HTTP_401_UNAUTHORIZED)
    
    search = request.query_params.get('search', '')
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