from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.http import HttpResponse
from django.db.models import Q, Count, Sum, Avg
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape
from decimal import Decimal
import io
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

try:
    import weasyprint
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False


def _safe(value):
    return escape(str(value or ''))


def _money(value):
    return f"Rs. {float(value or 0):,.2f}"


def _date(value):
    return value.strftime('%d %b %Y') if value else '-'


def _company_logo_file_uri(company):
    try:
        if company and company.logo and company.logo.name:
            import os
            path = company.logo.path
            if os.path.exists(path):
                return f'file://{path}'
    except Exception:
        return ''
    return ''


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

    def perform_create(self, serializer):
        super().perform_create(serializer)
        product = serializer.instance
        from common.sync_services import (
            ensure_master_product_from_inventory_product,
            get_data_sharing_policy,
            request_product_sync_from_inventory,
        )
        policy = get_data_sharing_policy(product.company)
        if policy.auto_sync_enabled and (policy.inventory_to_finance_products or policy.finance_to_inventory_products):
            if policy.require_manual_approval and policy.inventory_to_finance_products:
                request_product_sync_from_inventory(product)
            else:
                ensure_master_product_from_inventory_product(product)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        from common.sync_services import is_shared_record, request_shared_delete
        if is_shared_record(product):
            reason = request.query_params.get('delete_reason') or request.data.get('delete_reason') or request.data.get('reason')
            if not reason:
                return Response(
                    {'error': 'Delete reason is required for shared records.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            sync_request = request_shared_delete(product, reason, requested_by=request.service_user)
            return Response(
                {
                    'message': 'Delete approval request sent to company admin.',
                    'sync_request_id': sync_request.id,
                },
                status=status.HTTP_202_ACCEPTED,
            )
        return super().destroy(request, *args, **kwargs)
    
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

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """Bulk update product prices for the current company."""
        product_ids = request.data.get('product_ids') or []
        updates = request.data.get('updates') or {}

        if not product_ids:
            return Response({'error': 'Select at least one product.'}, status=status.HTTP_400_BAD_REQUEST)

        price_type = updates.get('price_type')
        adjustment_type = updates.get('adjustment_type')
        adjustment_value = updates.get('adjustment_value')
        allowed_price_fields = {'cost_price', 'selling_price', 'mrp'}
        allowed_adjustments = {'percentage', 'fixed'}

        if price_type not in allowed_price_fields:
            return Response({'error': 'Invalid price field.'}, status=status.HTTP_400_BAD_REQUEST)
        if adjustment_type not in allowed_adjustments:
            return Response({'error': 'Invalid adjustment type.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            adjustment_value = Decimal(str(adjustment_value))
        except Exception:
            return Response({'error': 'Adjustment value must be a valid number.'}, status=status.HTTP_400_BAD_REQUEST)

        products = self.get_queryset().filter(id__in=product_ids)
        updated_count = 0

        with transaction.atomic():
            for product in products.select_for_update():
                current_value = Decimal(getattr(product, price_type) or 0)
                if adjustment_type == 'percentage':
                    new_value = current_value + (current_value * adjustment_value / Decimal('100'))
                else:
                    new_value = current_value + adjustment_value

                if new_value < 0:
                    raise ValidationError(f'{product.name} price cannot become negative.')

                setattr(product, price_type, new_value.quantize(Decimal('0.01')))
                product.save(update_fields=[price_type, 'updated_at'])
                updated_count += 1

        return Response({
            'success': True,
            'message': f'{updated_count} products updated successfully.',
            'updated_count': updated_count
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

    @action(detail=True, methods=['get'], url_path='download-pdf')
    def download_pdf(self, request, pk=None):
        """Generate a modern WeasyPrint purchase order PDF."""
        if not WEASYPRINT_AVAILABLE:
            return Response(
                {'error': 'PDF engine is not installed. Please install WeasyPrint.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        purchase_order = self.get_object()
        pdf_content = self._generate_purchase_order_pdf(purchase_order, request)
        filename = f"PurchaseOrder_{purchase_order.po_number}.pdf"
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_content)
        return response

    def _generate_purchase_order_pdf(self, purchase_order, request):
        company = purchase_order.company
        supplier = purchase_order.supplier
        warehouse = purchase_order.warehouse
        logo_uri = _company_logo_file_uri(company)

        company_address = _safe(getattr(company, 'address', '')).replace('\n', '<br>')
        supplier_address = _safe(getattr(supplier, 'address', '')).replace('\n', '<br>')
        warehouse_address = '<br>'.join(filter(None, [
            _safe(getattr(warehouse, 'address', '')),
            _safe(getattr(warehouse, 'city', '')),
            _safe(getattr(warehouse, 'state', '')),
            _safe(getattr(warehouse, 'pincode', '')),
        ]))

        rows = []
        for index, item in enumerate(purchase_order.items.select_related('product').all(), start=1):
            product = item.product
            product_code = getattr(product, 'product_code', '') or getattr(product, 'sku', '')
            rows.append(f"""
              <tr>
                <td class="center muted">{index}</td>
                <td>
                  <div class="item-name">{_safe(product.name)}</div>
                  <div class="item-desc">{_safe(product_code)}</div>
                </td>
                <td class="center">{item.quantity_ordered:g}</td>
                <td class="right">{_money(item.unit_price)}</td>
                <td class="right strong">{_money(item.total_price)}</td>
              </tr>
            """)

        if not rows:
            rows.append('<tr><td colspan="5" class="empty">No line items added.</td></tr>')

        logo_block = (
            f'<img class="logo-img" src="{logo_uri}" alt="{_safe(company.name)} logo" />'
            if logo_uri else
            f'<div class="logo-fallback">{_safe((company.name or "C")[:1]).upper()}</div>'
        )

        status_label = purchase_order.get_status_display()
        notes_block = ''
        if purchase_order.notes:
            notes_block = f"""
              <div class="panel notes">
                <div class="section-title">Notes</div>
                <div>{_safe(purchase_order.notes).replace(chr(10), '<br>')}</div>
              </div>
            """

        terms_block = ''
        if purchase_order.terms_conditions:
            terms_block = f"""
              <div class="panel terms">
                <div class="section-title">Terms & Conditions</div>
                <div>{_safe(purchase_order.terms_conditions).replace(chr(10), '<br>')}</div>
              </div>
            """

        html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {{
      size: A4;
      margin: 16mm 15mm;
      @bottom-center {{
        content: "Purchase Order {_safe(purchase_order.po_number)} - Page " counter(page) " of " counter(pages);
        color: #94a3b8;
        font-size: 9px;
      }}
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      color: #0f172a;
      font-family: Inter, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      background: #fff;
    }}
    .hero {{
      border-radius: 18px;
      padding: 22px 24px;
      color: #fff;
      background: linear-gradient(135deg, #2563eb 0%, #0f766e 100%);
      position: relative;
      overflow: hidden;
    }}
    .hero:after {{
      content: "";
      position: absolute;
      right: -52px;
      top: -64px;
      width: 190px;
      height: 190px;
      border-radius: 999px;
      background: rgba(255,255,255,.16);
    }}
    .header-grid {{
      display: grid;
      grid-template-columns: 1fr 225px;
      gap: 24px;
      position: relative;
      z-index: 1;
    }}
    .brand {{
      display: flex;
      gap: 14px;
      align-items: center;
    }}
    .logo-box {{
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: 0 14px 35px rgba(15,23,42,.22);
    }}
    .logo-img {{
      width: 100%;
      height: 100%;
      object-fit: contain;
      padding: 7px;
    }}
    .logo-fallback {{
      color: #2563eb;
      font-size: 30px;
      font-weight: 800;
    }}
    .company-name {{
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0;
    }}
    .company-meta {{
      margin-top: 5px;
      color: rgba(255,255,255,.88);
      font-size: 11px;
    }}
    .po-title {{
      text-align: right;
    }}
    .po-title h1 {{
      margin: 0;
      font-size: 28px;
      line-height: 1;
      letter-spacing: 0;
    }}
    .po-no {{
      display: inline-block;
      margin-top: 10px;
      border-radius: 999px;
      padding: 6px 11px;
      background: rgba(255,255,255,.18);
      font-weight: 700;
    }}
    .summary {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin: 16px 0 18px;
    }}
    .metric {{
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px;
      background: #f8fafc;
    }}
    .metric span {{
      display: block;
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }}
    .metric strong {{
      display: block;
      margin-top: 4px;
      color: #0f172a;
      font-size: 13px;
    }}
    .two-col {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 18px;
    }}
    .panel {{
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 14px;
      background: #fff;
      page-break-inside: avoid;
    }}
    .section-title {{
      margin-bottom: 10px;
      color: #2563eb;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
    }}
    .big-name {{
      margin-bottom: 5px;
      font-size: 16px;
      font-weight: 800;
    }}
    .muted {{ color: #64748b; }}
    .items {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      overflow: hidden;
      border-radius: 14px;
    }}
    .items thead tr {{
      background: #111827;
      color: #fff;
    }}
    .items th {{
      padding: 11px 10px;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .06em;
    }}
    .items td {{
      border-bottom: 1px solid #e5e7eb;
      padding: 11px 10px;
      vertical-align: top;
    }}
    .items tbody tr:nth-child(even) {{ background: #f8fafc; }}
    .center {{ text-align: center; }}
    .right {{ text-align: right; }}
    .strong {{ font-weight: 800; }}
    .item-name {{ font-weight: 800; }}
    .item-desc {{ margin-top: 3px; color: #64748b; font-size: 10px; }}
    .empty {{ padding: 22px; text-align: center; color: #64748b; }}
    .totals-wrap {{
      display: grid;
      grid-template-columns: 1fr 270px;
      gap: 18px;
      margin-top: 18px;
      align-items: start;
    }}
    .total-card {{
      border-radius: 16px;
      padding: 15px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }}
    .total-row {{
      display: flex;
      justify-content: space-between;
      padding: 7px 0;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }}
    .grand-total {{
      margin-top: 10px;
      border-radius: 14px;
      padding: 13px 14px;
      color: #fff;
      background: linear-gradient(135deg, #2563eb, #0f766e);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}
    .grand-total span {{ font-size: 11px; opacity: .9; text-transform: uppercase; letter-spacing: .06em; }}
    .grand-total strong {{ font-size: 20px; }}
    .signature-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-top: 22px;
    }}
    .signature-line {{
      height: 54px;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 7px;
    }}
    .footer-note {{
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      text-align: center;
      color: #64748b;
      font-size: 10px;
    }}
  </style>
</head>
<body>
  <section class="hero">
    <div class="header-grid">
      <div class="brand">
        <div class="logo-box">{logo_block}</div>
        <div>
          <h2 class="company-name">{_safe(company.name)}</h2>
          <div class="company-meta">
            {_safe(getattr(company, 'email', ''))}{(' | ' + _safe(getattr(company, 'phone', ''))) if getattr(company, 'phone', '') else ''}<br>
            {_safe(getattr(company, 'website', '')) if getattr(company, 'website', '') else ''}
          </div>
        </div>
      </div>
      <div class="po-title">
        <h1>PURCHASE<br>ORDER</h1>
        <div class="po-no">{_safe(purchase_order.po_number)}</div>
      </div>
    </div>
  </section>

  <div class="summary">
    <div class="metric"><span>Order Date</span><strong>{_date(purchase_order.order_date)}</strong></div>
    <div class="metric"><span>Expected Delivery</span><strong>{_date(purchase_order.expected_delivery_date)}</strong></div>
    <div class="metric"><span>Status</span><strong>{_safe(status_label)}</strong></div>
    <div class="metric"><span>Total</span><strong>{_money(purchase_order.total_amount)}</strong></div>
  </div>

  <div class="two-col">
    <div class="panel">
      <div class="section-title">From</div>
      <div class="big-name">{_safe(company.name)}</div>
      <div class="muted">
        {company_address}<br>
        {_safe(getattr(company, 'email', ''))}<br>
        {_safe(getattr(company, 'phone', ''))}
        {('<br>GSTIN: ' + _safe(getattr(company, 'gst_number', ''))) if getattr(company, 'gst_number', '') else ''}
        {('<br>PAN: ' + _safe(getattr(company, 'pan_number', ''))) if getattr(company, 'pan_number', '') else ''}
      </div>
    </div>
    <div class="panel">
      <div class="section-title">Supplier</div>
      <div class="big-name">{_safe(supplier.name)}</div>
      <div class="muted">
        {_safe(getattr(supplier, 'supplier_code', ''))}<br>
        {('Contact: ' + _safe(getattr(supplier, 'contact_person', '')) + '<br>') if getattr(supplier, 'contact_person', '') else ''}
        {_safe(getattr(supplier, 'email', ''))}<br>
        {_safe(getattr(supplier, 'phone', ''))}<br>
        {supplier_address}
        {('<br>GSTIN: ' + _safe(getattr(supplier, 'gst_number', ''))) if getattr(supplier, 'gst_number', '') else ''}
      </div>
    </div>
  </div>

  <div class="two-col">
    <div class="panel">
      <div class="section-title">Ship To Warehouse</div>
      <div class="big-name">{_safe(warehouse.name)}</div>
      <div class="muted">
        {_safe(getattr(warehouse, 'code', ''))}<br>
        {warehouse_address}
      </div>
    </div>
    <div class="panel">
      <div class="section-title">Prepared By</div>
      <div class="big-name">{_safe(getattr(purchase_order.created_by, 'full_name', '') or getattr(purchase_order.created_by, 'username', ''))}</div>
      <div class="muted">
        Created: {_date(purchase_order.created_at.date() if purchase_order.created_at else None)}<br>
        Approved By: {_safe(getattr(purchase_order.approved_by, 'full_name', '') if purchase_order.approved_by else '-')}
      </div>
    </div>
  </div>

  <div class="panel">
    <div class="section-title">Order Items</div>
    <table class="items">
      <thead>
        <tr>
          <th style="width: 42px;" class="center">#</th>
          <th>Product</th>
          <th style="width: 82px;" class="center">Qty</th>
          <th style="width: 120px;" class="right">Unit Price</th>
          <th style="width: 130px;" class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {''.join(rows)}
      </tbody>
    </table>
  </div>

  <div class="totals-wrap">
    <div>
      {notes_block}
      {terms_block}
    </div>
    <div class="total-card">
      <div class="total-row"><span>Subtotal</span><strong>{_money(purchase_order.subtotal)}</strong></div>
      <div class="total-row"><span>Tax</span><strong>{_money(purchase_order.tax_amount)}</strong></div>
      <div class="grand-total"><span>Grand Total</span><strong>{_money(purchase_order.total_amount)}</strong></div>
    </div>
  </div>

  <div class="signature-grid">
    <div>
      <div class="signature-line"></div>
      <div class="muted">Supplier Signature</div>
    </div>
    <div>
      <div class="signature-line"></div>
      <div class="muted">Authorized Signature</div>
    </div>
  </div>

  <div class="footer-note">
    This purchase order was generated by {_safe(company.name)}.
  </div>
</body>
</html>
        """

        pdf_buffer = io.BytesIO()
        html_doc = weasyprint.HTML(string=html, base_url=request.build_absolute_uri('/'), encoding='utf-8')
        html_doc.write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer.getvalue()


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
