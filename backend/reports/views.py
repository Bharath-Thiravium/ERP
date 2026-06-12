from rest_framework import viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, CharFilter
from django.db.models import Q, Sum, Count
from decimal import Decimal
from finance.models import Quotation, PurchaseOrder, ProformaInvoice, Invoice
from .serializers import (
    QuotationReportSerializer,
    PurchaseOrderReportSerializer,
    ProformaInvoiceReportSerializer,
    InvoiceReportSerializer
)
from authentication.models import ServiceUserSession
from authentication.authentication import ServiceUserSessionAuthentication
from authentication.permissions import IsServiceUserAuthenticated


class QuotationFilter(FilterSet):
    start_date = DateFilter(field_name='quotation_date', lookup_expr='gte')
    end_date = DateFilter(field_name='quotation_date', lookup_expr='lte')
    status = CharFilter(field_name='status', lookup_expr='iexact')
    customer = CharFilter(method='filter_customer')
    
    def filter_customer(self, queryset, name, value):
        return queryset.filter(
            Q(customer__name__icontains=value) |
            Q(customer__customer_code__icontains=value)
        )
    
    class Meta:
        model = Quotation
        fields = ['start_date', 'end_date', 'status', 'customer']


class PurchaseOrderFilter(FilterSet):
    start_date = DateFilter(field_name='po_date', lookup_expr='gte')
    end_date = DateFilter(field_name='po_date', lookup_expr='lte')
    status = CharFilter(field_name='status', lookup_expr='iexact')
    customer = CharFilter(method='filter_customer')
    
    def filter_customer(self, queryset, name, value):
        return queryset.filter(
            Q(customer__name__icontains=value) |
            Q(customer__customer_code__icontains=value)
        )
    
    class Meta:
        model = PurchaseOrder
        fields = ['start_date', 'end_date', 'status', 'customer']


class ProformaInvoiceFilter(FilterSet):
    start_date = DateFilter(field_name='proforma_date', lookup_expr='gte')
    end_date = DateFilter(field_name='proforma_date', lookup_expr='lte')
    payment_status = CharFilter(field_name='payment_status', lookup_expr='iexact')
    customer = CharFilter(method='filter_customer')
    
    def filter_customer(self, queryset, name, value):
        return queryset.filter(
            Q(customer__name__icontains=value) |
            Q(customer__customer_code__icontains=value)
        )
    
    class Meta:
        model = ProformaInvoice
        fields = ['start_date', 'end_date', 'payment_status', 'customer']


class InvoiceFilter(FilterSet):
    start_date = DateFilter(field_name='invoice_date', lookup_expr='gte')
    end_date = DateFilter(field_name='invoice_date', lookup_expr='lte')
    payment_status = CharFilter(field_name='payment_status', lookup_expr='iexact')
    customer = CharFilter(method='filter_customer')
    
    def filter_customer(self, queryset, name, value):
        return queryset.filter(
            Q(customer__name__icontains=value) |
            Q(customer__customer_code__icontains=value)
        )
    
    class Meta:
        model = Invoice
        fields = ['start_date', 'end_date', 'payment_status', 'customer']


class QuotationReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = QuotationReportSerializer
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = QuotationFilter
    search_fields = ['quotation_number', 'customer__name', 'reference']
    ordering_fields = ['quotation_date', 'total_amount', 'created_at']
    ordering = ['-quotation_date']
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Quotation.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Quotation.objects.filter(company=session.service_user.company).select_related('customer')
        except ServiceUserSession.DoesNotExist:
            return Quotation.objects.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        total_count = queryset.count()
        total_amount = queryset.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
        
        status_breakdown = {}
        for status_choice in Quotation.STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(status=status_code).count()
            if count > 0:
                status_breakdown[status_code] = count
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
            'status_breakdown': status_breakdown
        })


class PurchaseOrderReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PurchaseOrderReportSerializer
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PurchaseOrderFilter
    search_fields = ['internal_po_number', 'po_number', 'customer__name']
    ordering_fields = ['po_date', 'total_amount', 'created_at']
    ordering = ['-po_date']
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return PurchaseOrder.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return PurchaseOrder.objects.filter(company=session.service_user.company).select_related('customer')
        except ServiceUserSession.DoesNotExist:
            return PurchaseOrder.objects.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        total_count = queryset.count()
        total_amount = queryset.aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
        
        status_breakdown = {}
        for status_choice in PurchaseOrder.STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(status=status_code).count()
            if count > 0:
                status_breakdown[status_code] = count
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
            'status_breakdown': status_breakdown
        })


class ProformaInvoiceReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProformaInvoiceReportSerializer
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProformaInvoiceFilter
    search_fields = ['proforma_number', 'customer__name', 'reference']
    ordering_fields = ['proforma_date', 'total_amount', 'created_at']
    ordering = ['-proforma_date']
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ProformaInvoice.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return ProformaInvoice.objects.filter(company=session.service_user.company).select_related('customer', 'purchase_order')
        except ServiceUserSession.DoesNotExist:
            return ProformaInvoice.objects.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        aggregates = queryset.aggregate(
            total_amount=Sum('total_amount'),
            total_paid=Sum('paid_amount'),
            total_outstanding=Sum('outstanding_amount')
        )
        
        total_count = queryset.count()
        total_amount = aggregates['total_amount'] or Decimal('0')
        total_paid = aggregates['total_paid'] or Decimal('0')
        total_outstanding = aggregates['total_outstanding'] or Decimal('0')
        
        payment_status_breakdown = {}
        for status_choice in ProformaInvoice.PAYMENT_STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(payment_status=status_code).count()
            if count > 0:
                payment_status_breakdown[status_code] = count
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
            'total_paid': float(total_paid),
            'total_outstanding': float(total_outstanding),
            'payment_status_breakdown': payment_status_breakdown
        })


class InvoiceReportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceReportSerializer
    authentication_classes = [ServiceUserSessionAuthentication]
    permission_classes = [IsServiceUserAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = InvoiceFilter
    search_fields = ['invoice_number', 'customer__name', 'reference']
    ordering_fields = ['invoice_date', 'total_amount', 'created_at']
    ordering = ['-invoice_date']
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        return session_key
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Invoice.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Invoice.objects.filter(company=session.service_user.company).select_related('customer', 'purchase_order')
        except ServiceUserSession.DoesNotExist:
            return Invoice.objects.none()
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        
        aggregates = queryset.aggregate(
            total_amount=Sum('total_amount'),
            total_paid=Sum('paid_amount'),
            total_outstanding=Sum('outstanding_amount')
        )
        
        total_count = queryset.count()
        total_amount = aggregates['total_amount'] or Decimal('0')
        total_paid = aggregates['total_paid'] or Decimal('0')
        total_outstanding = aggregates['total_outstanding'] or Decimal('0')
        
        payment_status_breakdown = {}
        for status_choice in Invoice.PAYMENT_STATUS_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(payment_status=status_code).count()
            if count > 0:
                payment_status_breakdown[status_code] = count
        
        return Response({
            'total_count': total_count,
            'total_amount': float(total_amount),
            'total_paid': float(total_paid),
            'total_outstanding': float(total_outstanding),
            'payment_status_breakdown': payment_status_breakdown
        })
