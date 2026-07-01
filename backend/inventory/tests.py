from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from authentication.models import Company, CompanyServiceUser, Service, ServiceUserSession
from .models import Category, Product, PurchaseOrder, StockLevel, Supplier, Warehouse
from .serializers import ProductCreateSerializer
from .viewsets import ProductViewSet, PurchaseOrderViewSet, StockMovementViewSet


class _MockServiceUser:
    """Minimal stand-in for authentication.models.CompanyServiceUser for serializer-context tests."""
    def __init__(self, company):
        self.company = company
        self.is_active = True


def _create_company(prefix, user):
    return Company.objects.create(
        name=f"{prefix} Inc", email=f"{prefix.lower()}@test.com",
        created_by=user, approval_status='approved', company_prefix=prefix
    )


def _create_session(company, user, tag):
    """Create a real CompanyServiceUser + ServiceUserSession so ServiceUserSessionAuthentication succeeds."""
    service, _ = Service.objects.get_or_create(service_type='inventory', defaults={'name': 'Inventory Service'})
    su = CompanyServiceUser.objects.create(
        company=company, service=service, username=f'svc_{tag}', email=f'svc_{tag}@test.com',
        full_name='Service User', password='x', unique_service_id=f'{company.company_prefix}_svc_{tag}',
        created_by=user, password_expires_at=timezone.now() + timedelta(days=90)
    )
    session_key = f'sesskey_{tag}'
    ServiceUserSession.objects.create(
        service_user=su, session_key=session_key, is_active=True,
        expires_at=timezone.now() + timedelta(days=7), ip_address='127.0.0.1'
    )
    return session_key


class InventoryPhase1SecurityTest(TestCase):
    """Regression tests for Inventory Phase 1 critical security & data-integrity fixes:
    negative stock prevention, stock transfer workflow, low_stock crash, cross-company
    FK injection, and transaction.atomic() rollback on partial failure."""

    def setUp(self):
        self.admin_user = User.objects.create(username='inv_admin', email='inv_admin@test.com')
        self.company_a = _create_company('INVA', self.admin_user)
        self.company_b = _create_company('INVB', self.admin_user)
        self.session_key_a = _create_session(self.company_a, self.admin_user, 'a')
        self.session_key_b = _create_session(self.company_b, self.admin_user, 'b')

        self.cat_a = Category.objects.create(company=self.company_a, name='Cat A')
        self.cat_b = Category.objects.create(company=self.company_b, name='Cat B')
        self.product_a = Product.objects.create(
            company=self.company_a, name='Product A', category=self.cat_a,
            min_stock_level=Decimal('10'), barcode='100000000001'
        )
        self.product_b = Product.objects.create(
            company=self.company_b, name='Product B', category=self.cat_b, barcode='100000000002'
        )
        self.warehouse_a = Warehouse.objects.create(
            company=self.company_a, name='WH A', address='addr', city='c', state='s', pincode='000000'
        )
        self.warehouse_a2 = Warehouse.objects.create(
            company=self.company_a, name='WH A2', address='addr', city='c', state='s', pincode='000000'
        )
        self.warehouse_b = Warehouse.objects.create(
            company=self.company_b, name='WH B', address='addr', city='c', state='s', pincode='000000'
        )
        self.supplier_a = Supplier.objects.create(company=self.company_a, name='Supplier A')

        self.factory = APIRequestFactory()

    def _auth(self, session_key):
        return {'HTTP_AUTHORIZATION': f'Bearer {session_key}'}

    def test_negative_stock_prevented_on_sale(self):
        """Selling more than available stock must be rejected, not go negative."""
        view = StockMovementViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'movement_type': 'sale', 'quantity': '50.00', 'unit_cost': '0'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)

    def test_negative_stock_prevented_on_adjustment(self):
        """A negative adjustment larger than the current stock must be rejected."""
        StockLevel.objects.create(product=self.product_a, warehouse=self.warehouse_a, quantity_available=Decimal('5'))
        view = StockMovementViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'movement_type': 'adjustment', 'quantity': '-10.00', 'unit_cost': '0'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)
        stock_level = StockLevel.objects.get(product=self.product_a, warehouse=self.warehouse_a)
        self.assertEqual(stock_level.quantity_available, Decimal('5'))

    def test_stock_transfer_moves_quantity_between_warehouses(self):
        """A transfer movement must decrement the source warehouse and increment the destination."""
        view = StockMovementViewSet.as_view({'post': 'create'})
        req_in = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'movement_type': 'in', 'quantity': '100.00', 'unit_cost': '5'
        }, format='json', **self._auth(self.session_key_a))
        self.assertEqual(view(req_in).status_code, 201)

        req_transfer = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'destination_warehouse': self.warehouse_a2.id,
            'movement_type': 'transfer', 'quantity': '40.00', 'unit_cost': '0'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req_transfer)
        self.assertEqual(resp.status_code, 201)

        source = StockLevel.objects.get(product=self.product_a, warehouse=self.warehouse_a)
        dest = StockLevel.objects.get(product=self.product_a, warehouse=self.warehouse_a2)
        self.assertEqual(source.quantity_available, Decimal('60.00'))
        self.assertEqual(dest.quantity_available, Decimal('40.00'))

    def test_stock_transfer_rejects_insufficient_stock(self):
        view = StockMovementViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'destination_warehouse': self.warehouse_a2.id,
            'movement_type': 'transfer', 'quantity': '10.00', 'unit_cost': '0'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)

    def test_stock_transfer_rejects_cross_company_destination_warehouse(self):
        """Company A must not be able to transfer stock into Company B's warehouse."""
        StockLevel.objects.create(product=self.product_a, warehouse=self.warehouse_a, quantity_available=Decimal('50'))
        view = StockMovementViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_a.id, 'warehouse': self.warehouse_a.id,
            'destination_warehouse': self.warehouse_b.id,
            'movement_type': 'transfer', 'quantity': '5.00', 'unit_cost': '0'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)

    def test_stock_movement_rejects_cross_company_product(self):
        """Company A must not be able to create a stock movement for Company B's product."""
        view = StockMovementViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/stock-movements/', {
            'product': self.product_b.id, 'warehouse': self.warehouse_a.id,
            'movement_type': 'in', 'quantity': '10.00', 'unit_cost': '1'
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)

    def test_low_stock_query_param_does_not_crash(self):
        """GET /products/?low_stock=true must not 500 (previously crashed with AttributeError)."""
        view = ProductViewSet.as_view({'get': 'list'})
        req = self.factory.get('/api/inventory/products/', {'low_stock': 'true'}, **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 200)

    def test_product_create_serializer_rejects_cross_company_category(self):
        request = self.factory.post('/api/inventory/products/')
        request.service_user = _MockServiceUser(self.company_a)
        serializer = ProductCreateSerializer(
            data={'name': 'Cross Co Product', 'category': self.cat_b.id},
            context={'request': request}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn('category', serializer.errors)

    def test_purchase_order_rejects_cross_company_item_and_rolls_back(self):
        """A PO referencing another company's product must be rejected with no partial data left behind."""
        view = PurchaseOrderViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/purchase-orders/', {
            'supplier': self.supplier_a.id, 'warehouse': self.warehouse_a.id,
            'order_date': str(date.today()), 'expected_delivery_date': str(date.today()),
            'items': [{'product': self.product_b.id, 'quantity_ordered': '1', 'unit_price': '1'}]
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(PurchaseOrder.objects.filter(company=self.company_a).count(), 0)

    def test_purchase_order_creation_succeeds_with_valid_items(self):
        view = PurchaseOrderViewSet.as_view({'post': 'create'})
        req = self.factory.post('/api/inventory/purchase-orders/', {
            'supplier': self.supplier_a.id, 'warehouse': self.warehouse_a.id,
            'order_date': str(date.today()), 'expected_delivery_date': str(date.today()),
            'items': [{'product': self.product_a.id, 'quantity_ordered': '10', 'unit_price': '5'}]
        }, format='json', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 201)
        po = PurchaseOrder.objects.get(company=self.company_a)
        self.assertEqual(po.subtotal, Decimal('50.00'))

    def test_product_queryset_excludes_other_company(self):
        view = ProductViewSet.as_view({'get': 'list'})
        req = self.factory.get('/api/inventory/products/', **self._auth(self.session_key_a))
        resp = view(req)
        self.assertEqual(resp.status_code, 200)
        results = resp.data.get('results', resp.data)
        names = [p['name'] for p in results]
        self.assertNotIn('Product B', names)
        self.assertIn('Product A', names)

    def test_stock_value_is_decimal_exact(self):
        """stock_value must use exact Decimal arithmetic, not lossy float conversion."""
        self.product_a.cost_price = Decimal('10.10')
        self.product_a.save()
        StockLevel.objects.create(product=self.product_a, warehouse=self.warehouse_a, quantity_available=Decimal('3'))
        self.assertEqual(self.product_a.stock_value, Decimal('30.30'))
        self.assertIsInstance(self.product_a.stock_value, Decimal)
