from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db.models import Q, Count, Sum, Avg
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import logging

from common.viewsets import CompanyScopedModelViewSet
from .models import (
    Category, Supplier, Warehouse, Product, StockLevel, StockMovement, 
    StockAlert, InventoryAudit, PurchaseOrder, PurchaseOrderItem
)
from .serializers import (
    CategorySerializer, SupplierSerializer, WarehouseSerializer,
    ProductListSerializer, ProductDetailSerializer, ProductCreateSerializer,
    StockLevelSerializer, StockMovementSerializer, StockAlertSerializer,
    InventoryAuditSerializer
)


class CategoryViewSet(CompanyScopedModelViewSet):
    """Category management with centralized tenant enforcement"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True)
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('name')


class SupplierViewSet(CompanyScopedModelViewSet):
    """Supplier management with centralized tenant enforcement"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True)
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(supplier_code__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset.order_by('name')


class WarehouseViewSet(CompanyScopedModelViewSet):
    """Warehouse management with centralized tenant enforcement"""
    queryset = Warehouse.objects.all()
    serializer_class = WarehouseSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True)
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(city__icontains=search)
            )
        
        return queryset.order_by('name')


class ProductViewSet(CompanyScopedModelViewSet):
    """Product management with centralized tenant enforcement"""
    queryset = Product.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCreateSerializer
        elif self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductListSerializer

    def get_queryset(self):
        queryset = super().get_queryset().filter(is_active=True).select_related(
            'category', 'primary_supplier'
        )
        
        # Search functionality
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(product_code__icontains=search) |
                Q(sku__icontains=search) |
                Q(barcode__icontains=search)
            )
        
        # Filtering
        category_id = self.request.query_params.get('category')
        if category_id:
            try:
                category_id = int(category_id)
                queryset = queryset.filter(category_id=category_id)
            except (ValueError, TypeError):
                pass
                
        product_type = self.request.query_params.get('product_type')
        if product_type:
            allowed_types = ['finished_good', 'raw_material', 'semi_finished', 'consumable', 'service', 'digital']
            if product_type in allowed_types:
                queryset = queryset.filter(product_type=product_type)
                
        low_stock = self.request.query_params.get('low_stock')
        if low_stock == 'true':
            # Filtering by IDs keeps this a QuerySet (rather than a plain list), so
            # subsequent .order_by() and any DRF filter backends don't crash on it.
            # This would need to be optimized with database queries.
            matching_ids = [p.id for p in queryset if p.is_low_stock()]
            queryset = queryset.filter(id__in=matching_ids)

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def generate_barcode(self, request, pk=None):
        """Generate barcode for product"""
        product = self.get_object()
        
        import secrets
        import string
        
        # Generate a cryptographically secure barcode
        barcode = ''.join(secrets.choice(string.digits) for _ in range(12))
        
        product.barcode = barcode
        product.save()
        
        return Response({
            'success': True,
            'barcode': barcode,
            'message': 'Barcode generated successfully'
        })

    @action(detail=True, methods=['post'])
    def upload_image(self, request, pk=None):
        """Upload product image"""
        product = self.get_object()
        
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
        
        # Update product image gallery
        if not product.image_gallery:
            product.image_gallery = []
        
        product.image_gallery.append({
            'filename': image_file.name,
            'uploaded_at': timezone.now().isoformat()
        })
        
        # Set as primary image if none exists
        if not product.primary_image:
            product.primary_image = image_file.name
        
        product.save()
        
        return Response({
            'success': True,
            'message': 'Image uploaded successfully'
        })


class StockMovementViewSet(CompanyScopedModelViewSet):
    """Stock Movement management with centralized tenant enforcement"""
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    company_field_name = "product__company"  # Override for nested company field

    def get_queryset(self):
        queryset = super().get_queryset().select_related('product', 'warehouse', 'created_by')
        
        # Filtering
        product_id = self.request.query_params.get('product')
        if product_id:
            try:
                product_id = int(product_id)
                queryset = queryset.filter(product_id=product_id)
            except (ValueError, TypeError):
                pass
                
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            try:
                warehouse_id = int(warehouse_id)
                queryset = queryset.filter(warehouse_id=warehouse_id)
            except (ValueError, TypeError):
                pass
                
        movement_type = self.request.query_params.get('movement_type')
        if movement_type:
            allowed_types = ['in', 'out', 'purchase', 'sale', 'return', 'transfer', 'adjustment', 'damage', 'production']
            if movement_type in allowed_types:
                queryset = queryset.filter(movement_type=movement_type)
                
        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Override create to handle stock level updates"""
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            # Get or create stock level (locked for the duration of this transaction
            # to prevent concurrent movements from racing past the negative-stock check)
            product_id = serializer.validated_data['product'].id
            warehouse_id = serializer.validated_data['warehouse'].id

            stock_level, created = StockLevel.objects.select_for_update().get_or_create(
                product_id=product_id,
                warehouse_id=warehouse_id,
                defaults={'quantity_available': 0}
            )

            # Update stock level based on movement type
            movement_type = serializer.validated_data['movement_type']
            quantity = serializer.validated_data['quantity']

            quantity_before = stock_level.quantity_available
            dest_stock_level = None

            if movement_type in ['in', 'purchase', 'return', 'production']:
                stock_level.quantity_available += quantity
            elif movement_type in ['out', 'sale', 'damage']:
                if stock_level.quantity_available < quantity:
                    raise ValidationError(
                        f'Insufficient stock. Available: {stock_level.quantity_available}, requested: {quantity}'
                    )
                stock_level.quantity_available -= quantity
            elif movement_type == 'adjustment':
                # For adjustments, quantity can be positive or negative
                if stock_level.quantity_available + quantity < 0:
                    raise ValidationError(
                        f'Adjustment would result in negative stock. Available: {stock_level.quantity_available}'
                    )
                stock_level.quantity_available += quantity
            elif movement_type == 'transfer':
                destination_warehouse = serializer.validated_data.get('destination_warehouse')
                if not destination_warehouse:
                    raise ValidationError('destination_warehouse is required for transfer movements')
                if destination_warehouse.id == warehouse_id:
                    raise ValidationError('destination_warehouse must be different from the source warehouse')
                if stock_level.quantity_available < quantity:
                    raise ValidationError(
                        f'Insufficient stock to transfer. Available: {stock_level.quantity_available}, requested: {quantity}'
                    )
                stock_level.quantity_available -= quantity

                dest_stock_level, _ = StockLevel.objects.select_for_update().get_or_create(
                    product_id=product_id,
                    warehouse_id=destination_warehouse.id,
                    defaults={'quantity_available': 0}
                )
                dest_stock_level.quantity_available += quantity
                dest_stock_level.updated_by = request.service_user
                dest_stock_level.save()

            quantity_after = stock_level.quantity_available
            stock_level.updated_by = request.service_user
            stock_level.save()

            # Save movement with before/after quantities
            self.perform_create(serializer)
            movement = serializer.instance
            movement.quantity_before = quantity_before
            movement.quantity_after = quantity_after
            movement.save()
            
            # Generate stock alerts based on new stock levels
            product = serializer.validated_data['product']
            warehouse = serializer.validated_data['warehouse']
            current_stock = product.current_stock
            
            # Check for low stock alert
            if current_stock <= product.min_stock_level and current_stock > 0:
                StockAlert.objects.get_or_create(
                    company=self.get_company(),
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
                    company=self.get_company(),
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
                    company=self.get_company(),
                    product=product,
                    warehouse=warehouse,
                    alert_type__in=['low_stock', 'out_of_stock'],
                    is_resolved=False
                ).update(
                    is_resolved=True,
                    resolved_at=timezone.now(),
                    resolved_by=request.service_user
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        """Override to skip company injection since it's nested"""
        serializer.save(created_by=self.request.service_user)


class StockAlertViewSet(CompanyScopedModelViewSet):
    """Stock Alert management with centralized tenant enforcement"""
    queryset = StockAlert.objects.all()
    serializer_class = StockAlertSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
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

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(product__name__icontains=search)
            
        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a stock alert"""
        alert = self.get_object()
        
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.resolved_by = request.service_user
        alert.save()
        
        return Response({
            'success': True,
            'message': 'Alert resolved successfully'
        })


class PurchaseOrderViewSet(CompanyScopedModelViewSet):
    """Purchase Order management with centralized tenant enforcement"""
    queryset = PurchaseOrder.objects.all()
    
    def get_serializer_class(self):
        from .serializers import PurchaseOrderSerializer
        return PurchaseOrderSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'supplier', 'warehouse', 'created_by', 'approved_by'
        ).prefetch_related('items__product')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        supplier_id = self.request.query_params.get('supplier')
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
            
        return queryset.order_by('-created_at')

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        super().perform_update(serializer)
        new_status = serializer.instance.status

        # When PO is marked as received → create stock movements
        if old_status != 'received' and new_status == 'received':
            po = serializer.instance
            service_user = self.request.service_user
            with transaction.atomic():
                for item in po.items.select_related('product').all():
                    warehouse = po.warehouse
                    if not warehouse:
                        continue
                    stock_level, _ = StockLevel.objects.select_for_update().get_or_create(
                        product=item.product,
                        warehouse=warehouse,
                        defaults={'quantity_available': 0}
                    )
                    qty_before = stock_level.quantity_available
                    stock_level.quantity_available += item.quantity_ordered
                    stock_level.save()
                    StockMovement.objects.create(
                        product=item.product,
                        warehouse=warehouse,
                        movement_type='purchase',
                        quantity=item.quantity_ordered,
                        unit_cost=item.unit_price,
                        reference_number=po.po_number,
                        quantity_before=qty_before,
                        quantity_after=stock_level.quantity_available,
                        notes=f'Received from PO {po.po_number}',
                        created_by=service_user
                    )

    def create(self, request, *args, **kwargs):
        """Override create to handle purchase order items"""
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            self.perform_create(serializer)
            purchase_order = serializer.instance
            company = self.get_company()

            items_data = request.data.get('items', [])
            for item_data in items_data:
                try:
                    product = Product.objects.get(id=item_data['product'], company=company)
                except Product.DoesNotExist:
                    raise ValidationError(f"Product {item_data.get('product')} not found or access denied.")
                PurchaseOrderItem.objects.create(
                    purchase_order=purchase_order,
                    product=product,
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


class InventoryAuditViewSet(CompanyScopedModelViewSet):
    """Inventory Audit management with centralized tenant enforcement"""
    queryset = InventoryAudit.objects.all()
    serializer_class = InventoryAuditSerializer

    def get_queryset(self):
        queryset = super().get_queryset().select_related(
            'warehouse', 'supervisor', 'created_by'
        ).prefetch_related('categories', 'products', 'audit_items')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        warehouse_id = self.request.query_params.get('warehouse')
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)
            
        return queryset.order_by('-created_at')

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get inventory dashboard data with AI insights"""
        company = self.get_company()

        # Basic Statistics
        try:
            total_products = Product.objects.filter(company=company, is_active=True).count()
            total_categories = Category.objects.filter(company=company, is_active=True).count()
            total_suppliers = Supplier.objects.filter(company=company, is_active=True).count()
            total_warehouses = Warehouse.objects.filter(company=company, is_active=True).count()
        except Exception as e:
            logging.error(f"Error fetching basic statistics: {e}")
            total_products = total_categories = total_suppliers = total_warehouses = 0

        # Stock Value Calculation
        try:
            products = Product.objects.filter(company=company, is_active=True)
            total_stock_value = sum(product.stock_value for product in products)
        except Exception as e:
            logging.error(f"Error calculating stock value: {e}")
            total_stock_value = 0
            products = Product.objects.none()

        # Low Stock & Out of Stock
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
                'username': request.service_user.username,
                'email': request.service_user.email,
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
                'inventory_turnover': 0,
                'optimization_score': 0
            }
        }

        return Response(dashboard_data)

    @action(detail=False, methods=['get'])
    def low_stock_report(self, request):
        """Get low stock report"""
        company = self.get_company()
        
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

    @action(detail=False, methods=['get'])
    def stock_valuation_report(self, request):
        """Get stock valuation report"""
        company = self.get_company()
        
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