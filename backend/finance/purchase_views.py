from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.db.models import Q, Sum
from django.db import transaction
from django.utils import timezone
from authentication.models import ServiceUserSession, CompanyServiceUser
from .models import Vendor, PurchaseRequest, VendorInvoice, PurchasePayment
from .serializers import (
    VendorListSerializer, VendorDetailSerializer, VendorCreateSerializer, VendorUpdateSerializer,
    PurchaseRequestListSerializer, PurchaseRequestDetailSerializer, PurchaseRequestCreateSerializer,
    VendorInvoiceListSerializer, VendorInvoiceDetailSerializer, VendorInvoiceCreateSerializer,
    PurchasePaymentListSerializer, PurchasePaymentDetailSerializer, PurchasePaymentCreateSerializer
)


class PurchasePagination(PageNumberPagination):
    """Custom pagination for purchase management"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================================================
# VENDOR MANAGEMENT VIEWS
# ============================================================================

class VendorListCreateView(ListCreateAPIView):
    """List and create vendors"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = PurchasePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VendorCreateSerializer
        return VendorListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Vendor.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = Vendor.objects.filter(company=company)
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(name__icontains=search) |
                    Q(vendor_code__icontains=search) |
                    Q(email__icontains=search) |
                    Q(phone__icontains=search) |
                    Q(gstin__icontains=search)
                )
            
            # Filtering
            vendor_type = self.request.query_params.get('vendor_type', '')
            if vendor_type:
                queryset = queryset.filter(vendor_type=vendor_type)
            
            is_active = self.request.query_params.get('is_active', '')
            if is_active:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return Vendor.objects.none()

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
            
            vendor = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            detail_serializer = VendorDetailSerializer(vendor)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    def list(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return super().list(request, *args, **kwargs)
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class VendorDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete vendor"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return VendorUpdateSerializer
        return VendorDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Vendor.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Vendor.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Vendor.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key


# ============================================================================
# PURCHASE REQUEST VIEWS
# ============================================================================

class PurchaseRequestListCreateView(ListCreateAPIView):
    """List and create purchase requests"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = PurchasePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PurchaseRequestCreateSerializer
        return PurchaseRequestListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseRequest.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = PurchaseRequest.objects.filter(company=company).select_related(
                'vendor', 'created_by'
            ).prefetch_related('request_items')
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(request_number__icontains=search) |
                    Q(vendor__name__icontains=search) |
                    Q(vendor__vendor_code__icontains=search) |
                    Q(reference__icontains=search)
                )
            
            # Filtering
            status_filter = self.request.query_params.get('status', '')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            vendor_id = self.request.query_params.get('vendor', '')
            if vendor_id:
                queryset = queryset.filter(vendor_id=vendor_id)
            
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return PurchaseRequest.objects.none()

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

            serializer = self.get_serializer(
                data=request.data,
                context={'company': service_user.company}
            )
            serializer.is_valid(raise_exception=True)
            
            purchase_request = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            detail_serializer = PurchaseRequestDetailSerializer(purchase_request)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PurchaseRequestDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete purchase request"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PurchaseRequestDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseRequest.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PurchaseRequest.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PurchaseRequest.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


# ============================================================================
# VENDOR INVOICE VIEWS
# ============================================================================

class VendorInvoiceListCreateView(ListCreateAPIView):
    """List and create vendor invoices"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = PurchasePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return VendorInvoiceCreateSerializer
        return VendorInvoiceListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return VendorInvoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = VendorInvoice.objects.filter(company=company).select_related(
                'vendor', 'purchase_request', 'created_by'
            ).prefetch_related('invoice_items')
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(our_reference_number__icontains=search) |
                    Q(vendor_invoice_number__icontains=search) |
                    Q(vendor__name__icontains=search) |
                    Q(vendor__vendor_code__icontains=search)
                )
            
            # Filtering
            status_filter = self.request.query_params.get('status', '')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            payment_status_filter = self.request.query_params.get('payment_status', '')
            if payment_status_filter:
                queryset = queryset.filter(payment_status=payment_status_filter)
            
            vendor_id = self.request.query_params.get('vendor', '')
            if vendor_id:
                queryset = queryset.filter(vendor_id=vendor_id)
            
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return VendorInvoice.objects.none()

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

            serializer = self.get_serializer(
                data=request.data,
                context={'company': service_user.company}
            )
            serializer.is_valid(raise_exception=True)
            
            vendor_invoice = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            detail_serializer = VendorInvoiceDetailSerializer(vendor_invoice)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class VendorInvoiceDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete vendor invoice"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = VendorInvoiceDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return VendorInvoice.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return VendorInvoice.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return VendorInvoice.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


# ============================================================================
# PURCHASE PAYMENT VIEWS
# ============================================================================

class PurchasePaymentListCreateView(ListCreateAPIView):
    """List and create purchase payments"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = PurchasePagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PurchasePaymentCreateSerializer
        return PurchasePaymentListSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchasePayment.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            company = session.service_user.company
            
            queryset = PurchasePayment.objects.filter(company=company).select_related(
                'vendor', 'vendor_invoice', 'created_by'
            )
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(payment_number__icontains=search) |
                    Q(vendor__name__icontains=search) |
                    Q(vendor_invoice__vendor_invoice_number__icontains=search) |
                    Q(reference_number__icontains=search)
                )
            
            # Filtering
            status_filter = self.request.query_params.get('status', '')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            payment_method_filter = self.request.query_params.get('payment_method', '')
            if payment_method_filter:
                queryset = queryset.filter(payment_method=payment_method_filter)
            
            vendor_id = self.request.query_params.get('vendor', '')
            if vendor_id:
                queryset = queryset.filter(vendor_id=vendor_id)
            
            return queryset.order_by('-created_at')
            
        except ServiceUserSession.DoesNotExist:
            return PurchasePayment.objects.none()

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
            
            payment = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            detail_serializer = PurchasePaymentDetailSerializer(payment)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class PurchasePaymentDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete purchase payment"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = PurchasePaymentDetailSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchasePayment.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PurchasePayment.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return PurchasePayment.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key


# ============================================================================
# UTILITY VIEWS
# ============================================================================

@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def get_vendors(request):
    """Get all vendors for dropdown"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')
    
    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        vendors = Vendor.objects.filter(
            company=session.service_user.company,
            is_active=True
        ).order_by('name')
        serializer = VendorListSerializer(vendors, many=True)
        return Response(serializer.data)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def vendor_ledger(request):
    """Get vendor ledger with transaction history"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.query_params.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=400)

    vendor_id = request.query_params.get('vendor_id')
    if not vendor_id:
        return Response({'error': 'Vendor ID required'}, status=400)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user

        # Get vendor
        vendor = Vendor.objects.get(id=vendor_id, company=service_user.company)

        # Get date range filters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Build ledger entries from vendor invoices and payments
        entries = []

        # Get vendor invoices for this vendor
        vendor_invoices = VendorInvoice.objects.filter(
            vendor=vendor,
            company=service_user.company
        )

        if start_date:
            vendor_invoices = vendor_invoices.filter(vendor_invoice_date__gte=start_date)
        if end_date:
            vendor_invoices = vendor_invoices.filter(vendor_invoice_date__lte=end_date)

        # Add invoice entries (debit entries - we owe them)
        for invoice in vendor_invoices:
            entries.append({
                'id': f'invoice_{invoice.id}',
                'date': invoice.vendor_invoice_date.isoformat(),
                'document_type': 'Vendor Invoice',
                'document_number': invoice.vendor_invoice_number,
                'our_reference': invoice.our_reference_number,
                'description': f'Invoice from {vendor.name}',
                'debit_amount': float(invoice.total_amount),
                'credit_amount': 0,
                'balance': 0,  # Will be calculated later
                'status': invoice.payment_status,
            })

        # Get payments for this vendor
        payments = PurchasePayment.objects.filter(
            vendor=vendor,
            company=service_user.company
        )

        if start_date:
            payments = payments.filter(payment_date__gte=start_date)
        if end_date:
            payments = payments.filter(payment_date__lte=end_date)

        # Add payment entries (credit entries - we paid them)
        for payment in payments:
            entries.append({
                'id': f'payment_{payment.id}',
                'date': payment.payment_date.isoformat(),
                'document_type': 'Payment',
                'document_number': payment.payment_number,
                'our_reference': payment.reference_number,
                'description': f'Payment to {vendor.name} - {payment.payment_method}',
                'debit_amount': 0,
                'credit_amount': float(payment.amount),
                'balance': 0,  # Will be calculated later
                'status': payment.status,
                'tds_amount': float(payment.tds_amount) if payment.tds_amount else 0,
                'net_amount': float(payment.net_amount_paid) if payment.net_amount_paid else float(payment.amount),
            })

        # Sort entries by date
        entries.sort(key=lambda x: x['date'])

        # Calculate running balance
        balance = 0
        for entry in entries:
            balance += entry['debit_amount'] - entry['credit_amount']
            entry['balance'] = balance

        # Calculate summary statistics
        total_invoiced = sum(float(inv.total_amount) for inv in vendor_invoices)
        total_paid = sum(float(pay.amount) for pay in payments if pay.status == 'completed')
        total_tds = sum(float(pay.tds_amount) for pay in payments if pay.tds_amount and pay.status == 'completed')
        outstanding_amount = total_invoiced - total_paid

        return Response({
            'vendor': {
                'id': vendor.id,
                'name': vendor.name,
                'vendor_code': vendor.vendor_code,
                'email': vendor.email,
                'phone': vendor.phone,
            },
            'total_invoiced': total_invoiced,
            'total_paid': total_paid,
            'total_tds_deducted': total_tds,
            'outstanding_amount': outstanding_amount,
            'credit_limit': float(vendor.credit_limit),
            'entries': entries,
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Vendor.DoesNotExist:
        return Response({'error': 'Vendor not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def purchase_expense_stats(request):
    """Get purchase and expense statistics for dashboard"""
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')

    if not session_key:
        return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        service_user = session.service_user
        company = service_user.company

        # Vendor statistics
        total_vendors = Vendor.objects.filter(company=company, is_active=True).count()

        # Purchase Request statistics
        purchase_requests = PurchaseRequest.objects.filter(company=company)
        total_purchase_requests = purchase_requests.count()
        pending_requests = purchase_requests.filter(status='draft').count()

        # Vendor Invoice statistics
        vendor_invoices = VendorInvoice.objects.filter(company=company)
        total_vendor_invoices = vendor_invoices.count()
        pending_invoices = vendor_invoices.filter(payment_status='unpaid').count()
        total_outstanding = vendor_invoices.aggregate(total=Sum('outstanding_amount'))['total'] or 0

        # Payment statistics
        payments = PurchasePayment.objects.filter(company=company, status='completed')
        total_payments = payments.count()
        total_paid = payments.aggregate(total=Sum('amount'))['total'] or 0
        total_tds = payments.aggregate(total=Sum('tds_amount'))['total'] or 0

        return Response({
            'vendor_stats': {
                'total_vendors': total_vendors,
            },
            'purchase_request_stats': {
                'total_requests': total_purchase_requests,
                'pending_requests': pending_requests,
            },
            'vendor_invoice_stats': {
                'total_invoices': total_vendor_invoices,
                'pending_invoices': pending_invoices,
                'total_outstanding': float(total_outstanding),
            },
            'payment_stats': {
                'total_payments': total_payments,
                'total_paid': float(total_paid),
                'total_tds_deducted': float(total_tds),
            }
        })

    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)