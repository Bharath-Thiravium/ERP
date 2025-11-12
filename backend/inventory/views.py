from rest_framework import viewsets, status, permissions
from django.utils._os import safe_join
from django.utils.html import escape
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
import re
import os
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q, Count, Sum, Avg, F
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from authentication.models import ServiceUserSession
from django.contrib.auth.hashers import make_password
from .security_validators import InventorySecurityValidator
from decimal import Decimal
import logging
import os
from django.conf import settings
from .models import (
    Category, Supplier, Warehouse, Product, ProductVariant, ProductBundle, ProductBundleItem,
    StockLevel, StockMovement, StockAlert, InventoryAudit, InventoryAuditItem,
    PurchaseOrder, PurchaseOrderItem, CycleCount, CycleCountItem
)
from .file_handlers import InventoryFileHandler
from .aging_analyzer import InventoryAgingAnalyzer
from .serializers import (
    CategorySerializer, SupplierSerializer, WarehouseSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductCreateSerializer,
    StockLevelSerializer, StockMovementSerializer, StockAlertSerializer,
    InventoryAuditSerializer, InventoryDashboardSerializer
)


class InventoryPagination(PageNumberPagination):
    """Custom pagination for inventory views"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class InventoryDashboardViewSet(viewsets.ViewSet):
    """Inventory Dashboard with AI insights"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]  # Session-based auth implemented in methods

    def list(self, request):
        """Get inventory dashboard data with AI insights"""
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

            # Basic Statistics with error handling
            try:
                total_products = Product.objects.filter(company=company, is_active=True).count()
                total_categories = Category.objects.filter(company=company, is_active=True).count()
                total_suppliers = Supplier.objects.filter(company=company, is_active=True).count()
                total_warehouses = Warehouse.objects.filter(company=company, is_active=True).count()
            except Exception as e:
                logging.error(f"Error fetching basic statistics: {e}")
                total_products = total_categories = total_suppliers = total_warehouses = 0

            # Stock Value Calculation with error handling
            try:
                products = Product.objects.filter(company=company, is_active=True)
                total_stock_value = sum(product.stock_value for product in products)
            except Exception as e:
                logging.error(f"Error calculating stock value: {e}")
                total_stock_value = 0
                products = Product.objects.none()

            # Low Stock & Out of Stock with error handling
            try:
                low_stock_products = sum(1 for product in products if product.is_low_stock())
                out_of_stock_products = sum(1 for product in products if product.current_stock <= 0)
            except Exception as e:
                logging.error(f"Error calculating stock levels: {e}")
                low_stock_products = out_of_stock_products = 0

            # Pending Alerts
            pending_alerts = StockAlert.objects.filter(
                company=company,
                is_resolved=False
            ).count()

            # Recent Stock Movements
            recent_movements = StockMovement.objects.filter(
                product__company=company
            ).select_related('product', 'warehouse').order_by('-created_at')[:10]

            movements_data = []
            for movement in recent_movements:
                movements_data.append({
                    'id': movement.id,
                    'product_name': movement.product.name,
                    'warehouse_name': movement.warehouse.name,
                    'movement_type': movement.movement_type,
                    'quantity': float(movement.quantity),
                    'created_at': movement.created_at.isoformat()
                })

            # Top Products by Stock Value
            top_products = []
            for product in products.order_by('-cost_price')[:10]:
                top_products.append({
                    'id': product.id,
                    'name': product.name,
                    'product_code': product.product_code,
                    'current_stock': float(product.current_stock),
                    'stock_value': float(product.stock_value),
                    'abc_classification': product.abc_classification
                })

            # Warehouse Utilization
            warehouses = Warehouse.objects.filter(company=company, is_active=True)
            warehouse_utilization = []
            for warehouse in warehouses:
                warehouse_utilization.append({
                    'id': warehouse.id,
                    'name': warehouse.name,
                    'utilization': float(warehouse.capacity_utilization),
                    'total_capacity': float(warehouse.total_capacity),
                    'used_capacity': float(warehouse.used_capacity)
                })

            dashboard_data = {
                'company': {
                    'name': company.name,
                    'logo': company.logo.url if company.logo else None,
                },
                'user': {
                    'username': service_user.username,
                    'email': service_user.email,
                },
                'inventory_stats': {
                    'total_products': total_products,
                    'total_categories': total_categories,
                    'total_suppliers': total_suppliers,
                    'total_warehouses': total_warehouses,
                    'total_stock_value': total_stock_value,
                    'low_stock_products': low_stock_products,
                    'out_of_stock_products': out_of_stock_products,
                    'pending_alerts': pending_alerts,
                },
                'recent_movements': movements_data,
                'top_products': top_products,
                'warehouse_utilization': warehouse_utilization,
                'ai_insights': {
                    'reorder_suggestions': low_stock_products,
                    'demand_trend': 'stable',
                    'inventory_turnover': 0,  # Calculate from actual data
                    'optimization_score': 0   # Calculate from actual data
                }
            }

            return Response(dashboard_data)

        except ServiceUserSession.DoesNotExist:
            return Response(
                {'error': 'Invalid session'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            logging.error(f"Unexpected error in dashboard: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CategoryListCreateView(ListCreateAPIView):
    """List and create categories"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Category.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Category.objects.filter(company=company, is_active=True)
            
            # Search functionality with input sanitization
            search = self.request.query_params.get('search', '')
            if search:
                # Sanitize search input
                search = escape(search.strip()[:100])  # Limit length and escape HTML
                if search:  # Only search if there's content after sanitization
                    queryset = queryset.filter(
                        Q(name__icontains=search) |
                        Q(code__icontains=search) |
                        Q(description__icontains=search)
                    )
            
            return queryset.order_by('name')
            
        except ServiceUserSession.DoesNotExist:
            return Category.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CategoryDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete category"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = CategorySerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Category.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Category.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Category.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


class SupplierListCreateView(ListCreateAPIView):
    """List and create suppliers"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = SupplierSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Supplier.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Supplier.objects.filter(company=company, is_active=True)
            
            # Search functionality with input sanitization
            search = self.request.query_params.get('search', '')
            if search:
                # Sanitize search input
                search = escape(search.strip()[:100])  # Limit length and escape HTML
                if search:  # Only search if there's content after sanitization
                    queryset = queryset.filter(
                        Q(name__icontains=search) |
                        Q(supplier_code__icontains=search) |
                        Q(email__icontains=search) |
                        Q(phone__icontains=search)
                    )
            
            return queryset.order_by('name')
            
        except ServiceUserSession.DoesNotExist:
            return Supplier.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=service_user.company, created_by=service_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class SupplierDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete supplier"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = SupplierSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Supplier.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Supplier.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Supplier.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


class WarehouseListCreateView(ListCreateAPIView):
    """List and create warehouses"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = WarehouseSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Warehouse.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Warehouse.objects.filter(company=company, is_active=True)
            
            # Search functionality with input sanitization
            search = self.request.query_params.get('search', '')
            if search:
                # Sanitize search input
                search = escape(search.strip()[:100])  # Limit length and escape HTML
                if search:  # Only search if there's content after sanitization
                    queryset = queryset.filter(
                        Q(name__icontains=search) |
                        Q(code__icontains=search) |
                        Q(city__icontains=search)
                    )
            
            return queryset.order_by('name')
            
        except ServiceUserSession.DoesNotExist:
            return Warehouse.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=service_user.company)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class WarehouseDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete warehouse"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = WarehouseSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Warehouse.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Warehouse.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Warehouse.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


class ProductBarcodeGenerateView(APIView):
    """Generate barcode for product"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key

    def post(self, request, pk):
        """Generate barcode for product"""
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            # Validate pk parameter
            try:
                pk = int(pk)
            except (ValueError, TypeError):
                return Response({'error': 'Invalid product ID'}, status=status.HTTP_400_BAD_REQUEST)
            
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            # Ensure user can only access products from their company
            product = Product.objects.get(
                pk=pk, 
                company=session.service_user.company,
                is_active=True
            )
            
            import secrets
            import string
            
            # Generate a cryptographically secure barcode
            barcode = ''.join(secrets.choice(string.digits) for _ in range(12))
            
            # Validate barcode before saving
            try:
                validated_barcode = InventorySecurityValidator.validate_barcode(barcode)
                product.barcode = validated_barcode
                product.save()
            except ValidationError as e:
                return Response({
                    'success': False,
                    'error': f'Barcode validation failed: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'success': True,
                'barcode': validated_barcode,
                'message': 'Barcode generated successfully'
            })
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
        except Product.DoesNotExist:
            return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(f"Error generating barcode for product {pk}: {e}")
            return Response({
                'success': False,
                'error': 'Internal server error'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ProductListCreateView(ListCreateAPIView):
    """List and create products"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = InventoryPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateSerializer
        return ProductListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Product.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Product.objects.filter(company=company, is_active=True).select_related(
                'category', 'primary_supplier'
            )
            
            # Search functionality with input sanitization
            search = self.request.query_params.get('search', '')
            if search:
                # Sanitize search input
                search = escape(search.strip()[:100])  # Limit length and escape HTML
                if search:  # Only search if there's content after sanitization
                    queryset = queryset.filter(
                        Q(name__icontains=search) |
                        Q(product_code__icontains=search) |
                        Q(sku__icontains=search) |
                        Q(barcode__icontains=search)
                    )
            
            # Filtering with validation
            category_id = self.request.query_params.get('category')
            if category_id:
                try:
                    category_id = int(category_id)
                    queryset = queryset.filter(category_id=category_id)
                except (ValueError, TypeError):
                    pass  # Ignore invalid category_id
                
            product_type = self.request.query_params.get('product_type')
            if product_type:
                # Validate product_type against allowed choices
                allowed_types = ['finished_good', 'raw_material', 'semi_finished', 'consumable', 'service', 'digital']
                if product_type in allowed_types:
                    queryset = queryset.filter(product_type=product_type)
                
            low_stock = self.request.query_params.get('low_stock')
            if low_stock == 'true':
                # This would need to be optimized with database queries
                queryset = [p for p in queryset if p.is_low_stock()]
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return Product.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            product = serializer.save(
                company=service_user.company,
                created_by=service_user
            )

            detail_serializer = ProductDetailSerializer(product)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class ProductDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete product"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ProductDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Product.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Product.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Product.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key


class StockMovementListCreateView(ListCreateAPIView):
    """List and create stock movements"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = StockMovementSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return StockMovement.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = StockMovement.objects.filter(
                product__company=company
            ).select_related('product', 'warehouse', 'created_by')
            
            # Filtering with validation
            product_id = self.request.query_params.get('product')
            if product_id:
                try:
                    product_id = int(product_id)
                    queryset = queryset.filter(product_id=product_id)
                except (ValueError, TypeError):
                    pass  # Ignore invalid product_id
                
            warehouse_id = self.request.query_params.get('warehouse')
            if warehouse_id:
                try:
                    warehouse_id = int(warehouse_id)
                    queryset = queryset.filter(warehouse_id=warehouse_id)
                except (ValueError, TypeError):
                    pass  # Ignore invalid warehouse_id
                
            movement_type = self.request.query_params.get('movement_type')
            if movement_type:
                # Validate movement_type against allowed choices
                allowed_types = ['in', 'out', 'purchase', 'sale', 'return', 'transfer', 'adjustment', 'damage', 'production']
                if movement_type in allowed_types:
                    queryset = queryset.filter(movement_type=movement_type)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return StockMovement.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            with transaction.atomic():
                # Create stock movement
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                # Get or create stock level
                product_id = serializer.validated_data['product'].id
                warehouse_id = serializer.validated_data['warehouse'].id
                
                stock_level, created = StockLevel.objects.get_or_create(
                    product_id=product_id,
                    warehouse_id=warehouse_id,
                    defaults={'quantity_available': 0}
                )
                
                # Update stock level based on movement type
                movement_type = serializer.validated_data['movement_type']
                quantity = serializer.validated_data['quantity']
                
                quantity_before = stock_level.quantity_available
                
                if movement_type in ['in', 'purchase', 'return', 'production']:
                    stock_level.quantity_available += quantity
                elif movement_type in ['out', 'sale', 'damage']:
                    stock_level.quantity_available -= quantity
                elif movement_type == 'adjustment':
                    # For adjustments, quantity can be positive or negative
                    stock_level.quantity_available += quantity
                
                quantity_after = stock_level.quantity_available
                stock_level.updated_by = service_user
                stock_level.save()
                
                # Save movement with before/after quantities
                movement = serializer.save(
                    quantity_before=quantity_before,
                    quantity_after=quantity_after,
                    created_by=service_user
                )
                
                # Update product cost price using weighted average for incoming stock
                if movement_type in ['in', 'purchase', 'return', 'production']:
                    product = serializer.validated_data['product']
                    current_stock = product.current_stock
                    current_cost = product.cost_price
                    new_unit_cost = serializer.validated_data['unit_cost']
                    new_quantity = serializer.validated_data['quantity']
                    
                    # Calculate weighted average cost
                    if current_stock > 0:
                        total_value = (current_stock * current_cost) + (new_quantity * new_unit_cost)
                        total_quantity = current_stock + new_quantity
                        new_average_cost = total_value / total_quantity
                    else:
                        new_average_cost = new_unit_cost
                    
                    # Update product cost price
                    product.cost_price = new_average_cost
                    product.save()
                
                # Generate stock alerts based on new stock levels
                product = serializer.validated_data['product']
                warehouse = serializer.validated_data['warehouse']
                current_stock = product.current_stock
                
                # Check for low stock alert
                if current_stock <= product.min_stock_level and current_stock > 0:
                    StockAlert.objects.get_or_create(
                        company=service_user.company,
                        product=product,
                        warehouse=warehouse,
                        alert_type='low_stock',
                        is_resolved=False,
                        defaults={
                            'priority': 'high' if current_stock <= product.reorder_point else 'medium',
                            'message': f'Stock level ({current_stock}) is below minimum threshold ({product.min_stock_level})',
                            'current_stock': current_stock,
                            'suggested_action': f'Reorder {product.reorder_quantity} units immediately'
                        }
                    )
                
                # Check for out of stock alert
                elif current_stock <= 0:
                    StockAlert.objects.get_or_create(
                        company=service_user.company,
                        product=product,
                        warehouse=warehouse,
                        alert_type='out_of_stock',
                        is_resolved=False,
                        defaults={
                            'priority': 'critical',
                            'message': f'Product is completely out of stock',
                            'current_stock': current_stock,
                            'suggested_action': f'Emergency reorder of {product.reorder_quantity} units required'
                        }
                    )
                
                # Resolve existing alerts if stock is now above minimum
                elif current_stock > product.min_stock_level:
                    StockAlert.objects.filter(
                        company=service_user.company,
                        product=product,
                        warehouse=warehouse,
                        alert_type__in=['low_stock', 'out_of_stock'],
                        is_resolved=False
                    ).update(
                        is_resolved=True,
                        resolved_at=timezone.now(),
                        resolved_by=service_user
                    )
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class StockAlertListView(ListCreateAPIView):
    """List stock alerts"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = StockAlertSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return StockAlert.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = StockAlert.objects.filter(company=company).select_related(
                'product', 'warehouse', 'resolved_by'
            )
            
            # Filtering
            is_resolved = self.request.query_params.get('resolved')
            if is_resolved == 'false':
                queryset = queryset.filter(is_resolved=False)
            elif is_resolved == 'true':
                queryset = queryset.filter(is_resolved=True)
                
            priority = self.request.query_params.get('priority')
            if priority:
                queryset = queryset.filter(priority=priority)
                
            alert_type = self.request.query_params.get('alert_type')
            if alert_type:
                queryset = queryset.filter(alert_type=alert_type)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return StockAlert.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_categories(request):
    """Get all categories for dropdown"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        categories = Category.objects.filter(
            company=session.service_user.company,
            is_active=True
        ).order_by('name')
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_suppliers(request):
    """Get all suppliers for dropdown"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        suppliers = Supplier.objects.filter(
            company=session.service_user.company,
            is_active=True
        ).order_by('name')
        serializer = SupplierSerializer(suppliers, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_warehouses(request):
    """Get all warehouses for dropdown"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        warehouses = Warehouse.objects.filter(
            company=session.service_user.company,
            is_active=True
        ).order_by('name')
        serializer = WarehouseSerializer(warehouses, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def low_stock_report(request):
    """Get low stock report"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        products = Product.objects.filter(company=company, is_active=True)
        low_stock_products = []
        
        for product in products:
            if product.is_low_stock():
                low_stock_products.append({
                    'id': product.id,
                    'name': product.name,
                    'product_code': product.product_code,
                    'current_stock': float(product.current_stock),
                    'min_stock_level': float(product.min_stock_level),
                    'reorder_point': float(product.reorder_point),
                    'category': product.category.name,
                    'supplier': product.primary_supplier.name if product.primary_supplier else None,
                    'stock_value': float(product.stock_value),
                    'needs_reorder': product.needs_reorder()
                })
        
        return Response({
            'total_products': len(low_stock_products),
            'products': low_stock_products,
            'generated_at': timezone.now().isoformat()
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def stock_valuation_report(request):
    """Get stock valuation report"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        products = Product.objects.filter(company=company, is_active=True).select_related('category')
        
        total_value = 0
        category_values = {}
        product_data = []
        
        for product in products:
            stock_value = product.stock_value
            total_value += stock_value
            
            # Category-wise aggregation
            category_name = product.category.name
            if category_name not in category_values:
                category_values[category_name] = 0
            category_values[category_name] += stock_value
            
            product_data.append({
                'id': product.id,
                'name': product.name,
                'product_code': product.product_code,
                'category': category_name,
                'current_stock': float(product.current_stock),
                'cost_price': float(product.cost_price),
                'stock_value': float(stock_value),
                'abc_classification': product.abc_classification
            })
        
        # Sort by stock value descending
        product_data.sort(key=lambda x: x['stock_value'], reverse=True)
        
        return Response({
            'total_stock_value': total_value,
            'category_breakdown': category_values,
            'products': product_data,
            'generated_at': timezone.now().isoformat()
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def upload_product_image(request, product_id):
    """Upload product image"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        product = Product.objects.get(
            id=product_id,
            company=service_user.company,
            is_active=True
        )
        
        if 'image' not in request.FILES:
            return Response({'error': 'No image file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        image_file = request.FILES['image']
        
        # Validate file type and size
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        max_size = 5 * 1024 * 1024  # 5MB
        
        if image_file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if image_file.size > max_size:
            return Response({'error': 'File too large. Maximum size is 5MB.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Sanitize filename
        safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '', image_file.name)
        if not safe_filename:
            safe_filename = f'product_{product_id}_{timezone.now().timestamp()}.jpg'
        
        # Upload image with validation
        try:
            file_path = InventoryFileHandler.upload_product_image(
                image_file, product_id, service_user.company.id, safe_filename
            )
        except Exception as e:
            logging.error(f"File upload error: {e}")
            return Response({'error': 'File upload failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Update product image gallery
        if not product.image_gallery:
            product.image_gallery = []
        
        product.image_gallery.append({
            'filename': image_file.name,
            'path': file_path,
            'uploaded_at': timezone.now().isoformat()
        })
        
        # Set as primary image if none exists
        if not product.primary_image:
            product.primary_image = file_path
        
        product.save()
        
        return Response({
            'success': True,
            'file_path': file_path,
            'message': 'Image uploaded successfully'
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def inventory_aging_report(request):
    """Get inventory aging analysis"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        warehouse_id = request.query_params.get('warehouse')
        aging_data = InventoryAgingAnalyzer.get_aging_analysis(company, warehouse_id)
        
        # Categorize data
        aging_summary = {}
        for item in aging_data:
            category = item['aging_category']
            if category not in aging_summary:
                aging_summary[category] = {'count': 0, 'value': 0}
            aging_summary[category]['count'] += 1
            aging_summary[category]['value'] += item['stock_value']
        
        return Response({
            'aging_data': aging_data,
            'aging_summary': aging_summary,
            'total_items': len(aging_data),
            'total_value': sum(item['stock_value'] for item in aging_data),
            'generated_at': timezone.now().isoformat()
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def dead_stock_report(request):
    """Get dead stock report"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        days_threshold = int(request.query_params.get('days', 365))
        report = InventoryAgingAnalyzer.get_dead_stock_report(company, days_threshold)
        
        return Response(report)
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def abc_analysis_report(request):
    """Get ABC analysis report"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        products = Product.objects.filter(company=company, is_active=True)
        
        abc_data = {'A': [], 'B': [], 'C': []}
        abc_summary = {'A': {'count': 0, 'value': 0}, 'B': {'count': 0, 'value': 0}, 'C': {'count': 0, 'value': 0}}
        
        for product in products:
            classification = product.abc_classification
            stock_value = product.stock_value
            
            abc_data[classification].append({
                'id': product.id,
                'name': product.name,
                'product_code': product.product_code,
                'category': product.category.name,
                'stock_value': float(stock_value),
                'current_stock': float(product.current_stock)
            })
            
            abc_summary[classification]['count'] += 1
            abc_summary[classification]['value'] += stock_value
        
        # Sort each category by value
        for classification in abc_data:
            abc_data[classification].sort(key=lambda x: x['stock_value'], reverse=True)
        
        return Response({
            'abc_data': abc_data,
            'abc_summary': abc_summary,
            'generated_at': timezone.now().isoformat()
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PurchaseOrderDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete purchase order"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        from .serializers import PurchaseOrderSerializer
        return PurchaseOrderSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseOrder.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PurchaseOrder.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PurchaseOrder.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key

    def update(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            with transaction.atomic():
                instance = self.get_object()
                serializer = self.get_serializer(instance, data=request.data, partial=True)
                serializer.is_valid(raise_exception=True)
                
                purchase_order = serializer.save()
                
                items_data = request.data.get('items', [])
                if items_data:
                    purchase_order.items.all().delete()
                    
                    for item_data in items_data:
                        PurchaseOrderItem.objects.create(
                            purchase_order=purchase_order,
                            product_id=item_data['product'],
                            quantity_ordered=item_data['quantity_ordered'],
                            unit_price=item_data['unit_price'],
                            notes=item_data.get('notes', '')
                        )
                    
                    items = purchase_order.items.all()
                    subtotal = sum(item.total_price for item in items)
                    tax_amount = subtotal * Decimal('0.18')
                    total_amount = subtotal + tax_amount
                    
                    purchase_order.subtotal = subtotal
                    purchase_order.tax_amount = tax_amount
                    purchase_order.total_amount = total_amount
                    purchase_order.save()
                
                return Response(serializer.data)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PurchaseOrderListCreateView(ListCreateAPIView):
    """List and create purchase orders"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        from .serializers import PurchaseOrderSerializer
        return PurchaseOrderSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseOrder.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = PurchaseOrder.objects.filter(company=company).select_related(
                'supplier', 'warehouse', 'created_by', 'approved_by'
            ).prefetch_related('items__product')
            
            status = self.request.query_params.get('status')
            if status:
                queryset = queryset.filter(status=status)
                
            supplier_id = self.request.query_params.get('supplier')
            if supplier_id:
                queryset = queryset.filter(supplier_id=supplier_id)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return PurchaseOrder.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                purchase_order = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                
                items_data = request.data.get('items', [])
                for item_data in items_data:
                    PurchaseOrderItem.objects.create(
                        purchase_order=purchase_order,
                        product_id=item_data['product'],
                        quantity_ordered=item_data['quantity_ordered'],
                        unit_price=item_data['unit_price'],
                        notes=item_data.get('notes', '')
                    )
                
                items = purchase_order.items.all()
                subtotal = sum(item.total_price for item in items)
                tax_amount = subtotal * Decimal('0.18')
                total_amount = subtotal + tax_amount
                
                purchase_order.subtotal = subtotal
                purchase_order.tax_amount = tax_amount
                purchase_order.total_amount = total_amount
                purchase_order.save()
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class InventoryAuditListCreateView(ListCreateAPIView):
    """List and create inventory audits"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = InventoryAuditSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return InventoryAudit.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = InventoryAudit.objects.filter(company=company).select_related(
                'warehouse', 'supervisor', 'created_by'
            ).prefetch_related('categories', 'products', 'audit_items')
            
            status = self.request.query_params.get('status')
            if status:
                queryset = queryset.filter(status=status)
                
            warehouse_id = self.request.query_params.get('warehouse')
            if warehouse_id:
                queryset = queryset.filter(warehouse_id=warehouse_id)
                
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return InventoryAudit.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(company=service_user.company, created_by=service_user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class ProductBundleDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete product bundle"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        from .serializers import ProductBundleSerializer
        return ProductBundleSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ProductBundle.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return ProductBundle.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return ProductBundle.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH', 'DELETE']:
            session_key = self.request.data.get('session_key') if hasattr(self.request, 'data') else None
        return session_key


class ProductBundleListCreateView(ListCreateAPIView):
    """List and create product bundles"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        from .serializers import ProductBundleSerializer
        return ProductBundleSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ProductBundle.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return ProductBundle.objects.filter(company=company, is_active=True).prefetch_related('bundle_items__product')
        except ServiceUserSession.DoesNotExist:
            return ProductBundle.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                bundle = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                
                # Add bundle items
                items_data = request.data.get('bundle_items', [])
                for item_data in items_data:
                    ProductBundleItem.objects.create(
                        bundle=bundle,
                        product_id=item_data['product'],
                        quantity=item_data['quantity'],
                        unit_price_override=item_data.get('unit_price_override')
                    )
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class CycleCountListCreateView(ListCreateAPIView):
    """List and create cycle counts"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        from .serializers import CycleCountSerializer
        return CycleCountSerializer
    pagination_class = InventoryPagination

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return CycleCount.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            return CycleCount.objects.filter(company=company).select_related('warehouse').prefetch_related('count_items__product')
        except ServiceUserSession.DoesNotExist:
            return CycleCount.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user

            with transaction.atomic():
                serializer = self.get_serializer(data=request.data)
                serializer.is_valid(raise_exception=True)
                
                cycle_count = serializer.save(
                    company=service_user.company,
                    created_by=service_user
                )
                
                # Auto-generate count items based on criteria
                products = Product.objects.filter(
                    company=service_user.company,
                    is_active=True
                )
                
                # Filter by categories if specified
                categories = request.data.get('categories', [])
                if categories:
                    products = products.filter(category_id__in=categories)
                
                # Filter by ABC classes if specified
                abc_classes = request.data.get('abc_classes', [])
                if abc_classes:
                    products = products.filter(abc_classification__in=abc_classes)
                
                # Create count items
                for product in products[:50]:  # Limit to 50 items for demo
                    CycleCountItem.objects.create(
                        cycle_count=cycle_count,
                        product=product,
                        expected_quantity=product.current_stock
                    )
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def start_cycle_count(request, count_id):
    """Start a cycle count"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        cycle_count = CycleCount.objects.get(
            id=count_id,
            company=service_user.company
        )
        
        cycle_count.status = 'in_progress'
        cycle_count.save()
        
        return Response({
            'success': True,
            'message': 'Cycle count started successfully'
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except CycleCount.DoesNotExist:
        return Response({'error': 'Cycle count not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def pause_cycle_count(request, count_id):
    """Pause a cycle count"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        cycle_count = CycleCount.objects.get(
            id=count_id,
            company=service_user.company
        )
        
        cycle_count.status = 'paused'
        cycle_count.save()
        
        return Response({
            'success': True,
            'message': 'Cycle count paused successfully'
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except CycleCount.DoesNotExist:
        return Response({'error': 'Cycle count not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def resolve_stock_alert(request, alert_id):
    """Resolve a stock alert"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.data.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        # Validate alert_id parameter
        try:
            alert_id = int(alert_id)
        except (ValueError, TypeError):
            return Response({'error': 'Invalid alert ID'}, status=status.HTTP_400_BAD_REQUEST)
        
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        
        alert = StockAlert.objects.get(
            id=alert_id,
            company=service_user.company,
            is_resolved=False
        )
        
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = service_user
        alert.save()
        
        return Response({
            'success': True,
            'message': 'Alert resolved successfully'
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)
    except StockAlert.DoesNotExist:
        return Response({'error': 'Alert not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logging.error(f"Error resolving stock alert {alert_id}: {e}")
        return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)