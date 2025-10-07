from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from django.db.models import Q, Sum
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from authentication.models import ServiceUserSession
from .multicompany_models import (
    Branch, TDSSection, ReverseChargeTransaction, 
    ImportExportTransaction, InterStateTransaction, AdvancedTDSDeductee
)
from .multicompany_serializers import (
    BranchListSerializer, BranchDetailSerializer, BranchCreateSerializer,
    TDSSectionSerializer, ReverseChargeTransactionSerializer,
    ImportExportTransactionSerializer, InterStateTransactionSerializer,
    AdvancedTDSDeducteeSerializer
)

class MultiCompanyPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

# Branch Management Views
class BranchListCreateView(ListCreateAPIView):
    """List and create branches for multi-location GST handling"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    pagination_class = MultiCompanyPagination
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return BranchCreateSerializer
        return BranchListSerializer
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Branch.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            queryset = Branch.objects.filter(company=service_user.company)
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(branch_name__icontains=search) |
                    Q(branch_code__icontains=search) |
                    Q(gstin__icontains=search) |
                    Q(city__icontains=search) |
                    Q(state__icontains=search)
                )
            
            # Filter by active status
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
            return queryset.order_by('-is_head_office', 'branch_name')
            
        except ServiceUserSession.DoesNotExist:
            return Branch.objects.none()
    
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
            
            branch = serializer.save(
                company=service_user.company,
                created_by=service_user
            )
            
            detail_serializer = BranchDetailSerializer(branch)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

class BranchDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, and delete branch"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = BranchDetailSerializer
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Branch.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Branch.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Branch.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

# TDS Section Management
class TDSSectionListView(APIView):
    """List TDS sections for dropdown and selection"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        session_key = request.query_params.get('session_key')
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            
            sections = TDSSection.objects.filter(is_active=True)
            search = request.query_params.get('search', '')
            if search:
                sections = sections.filter(
                    Q(section_code__icontains=search) |
                    Q(section_name__icontains=search)
                )
            
            serializer = TDSSectionSerializer(sections, many=True)
            return Response({'results': serializer.data})
            
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

# Reverse Charge Transaction Views
class ReverseChargeTransactionListCreateView(ListCreateAPIView):
    """List and create reverse charge transactions"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ReverseChargeTransactionSerializer
    pagination_class = MultiCompanyPagination
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ReverseChargeTransaction.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            queryset = ReverseChargeTransaction.objects.filter(company=service_user.company)
            
            # Filter by transaction type
            transaction_type = self.request.query_params.get('transaction_type')
            if transaction_type:
                queryset = queryset.filter(transaction_type=transaction_type)
            
            # Filter by date range
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date:
                queryset = queryset.filter(invoice_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(invoice_date__lte=end_date)
            
            return queryset.order_by('-invoice_date')
            
        except ServiceUserSession.DoesNotExist:
            return ReverseChargeTransaction.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(
                company=session.service_user.company,
                created_by=session.service_user
            )
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

# Import/Export Transaction Views
class ImportExportTransactionListCreateView(ListCreateAPIView):
    """List and create import/export transactions"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = ImportExportTransactionSerializer
    pagination_class = MultiCompanyPagination
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return ImportExportTransaction.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            queryset = ImportExportTransaction.objects.filter(company=service_user.company)
            
            # Filter by transaction type
            transaction_type = self.request.query_params.get('transaction_type')
            if transaction_type:
                queryset = queryset.filter(transaction_type=transaction_type)
            
            # Filter by currency
            currency = self.request.query_params.get('currency')
            if currency:
                queryset = queryset.filter(foreign_currency=currency)
            
            # Filter by date range
            start_date = self.request.query_params.get('start_date')
            end_date = self.request.query_params.get('end_date')
            if start_date:
                queryset = queryset.filter(invoice_date__gte=start_date)
            if end_date:
                queryset = queryset.filter(invoice_date__lte=end_date)
            
            return queryset.order_by('-invoice_date')
            
        except ServiceUserSession.DoesNotExist:
            return ImportExportTransaction.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(
                company=session.service_user.company,
                created_by=session.service_user
            )
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

# Advanced TDS Deductee Views
class AdvancedTDSDeducteeListCreateView(ListCreateAPIView):
    """List and create advanced TDS deductees"""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = AdvancedTDSDeducteeSerializer
    pagination_class = MultiCompanyPagination
    
    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return AdvancedTDSDeductee.objects.none()
        
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            service_user = session.service_user
            
            queryset = AdvancedTDSDeductee.objects.filter(company=service_user.company)
            
            # Search functionality
            search = self.request.query_params.get('search', '')
            if search:
                queryset = queryset.filter(
                    Q(deductee_name__icontains=search) |
                    Q(pan_number__icontains=search)
                )
            
            # Filter by deductee type
            deductee_type = self.request.query_params.get('deductee_type')
            if deductee_type:
                queryset = queryset.filter(deductee_type=deductee_type)
            
            return queryset.order_by('deductee_name')
            
        except ServiceUserSession.DoesNotExist:
            return AdvancedTDSDeductee.objects.none()
    
    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method == 'POST':
            session_key = self.request.data.get('session_key')
        return session_key
    
    def perform_create(self, serializer):
        session_key = self.get_session_key()
        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            serializer.save(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            raise ValidationError({'session_key': 'Invalid session'})

# Analytics and Dashboard Views
@api_view(['GET'])
@authentication_classes([])
@permission_classes([])
def multi_company_dashboard(request):
    """Multi-company dashboard with branch-wise analytics"""
    session_key = request.query_params.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        
        # Branch statistics
        branches = Branch.objects.filter(company=company)
        total_branches = branches.count()
        active_branches = branches.filter(is_active=True).count()
        
        # Inter-state transaction statistics
        interstate_transactions = InterStateTransaction.objects.filter(company=company)
        total_interstate_value = interstate_transactions.aggregate(
            total=Sum('taxable_value')
        )['total'] or 0
        
        # Reverse charge statistics
        reverse_charge_transactions = ReverseChargeTransaction.objects.filter(company=company)
        total_reverse_charge_value = reverse_charge_transactions.aggregate(
            total=Sum('taxable_value')
        )['total'] or 0
        
        # Import/Export statistics
        import_transactions = ImportExportTransaction.objects.filter(
            company=company, transaction_type='import'
        )
        export_transactions = ImportExportTransaction.objects.filter(
            company=company, transaction_type='export'
        )
        
        total_import_value = import_transactions.aggregate(
            total=Sum('inr_amount')
        )['total'] or 0
        
        total_export_value = export_transactions.aggregate(
            total=Sum('inr_amount')
        )['total'] or 0
        
        # TDS statistics
        tds_deductees = AdvancedTDSDeductee.objects.filter(company=company)
        total_deductees = tds_deductees.count()
        
        # Branch-wise revenue (from invoices)
        from .models import Invoice
        branch_revenue = []
        for branch in branches:
            revenue = Invoice.objects.filter(
                company=company,
                # Assuming we add branch field to Invoice model
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            branch_revenue.append({
                'branch_name': branch.branch_name,
                'branch_code': branch.branch_code,
                'gstin': branch.gstin,
                'revenue': float(revenue),
                'is_head_office': branch.is_head_office
            })
        
        return Response({
            'branch_statistics': {
                'total_branches': total_branches,
                'active_branches': active_branches,
                'branch_revenue': branch_revenue
            },
            'transaction_statistics': {
                'interstate_transactions': {
                    'count': interstate_transactions.count(),
                    'total_value': float(total_interstate_value)
                },
                'reverse_charge_transactions': {
                    'count': reverse_charge_transactions.count(),
                    'total_value': float(total_reverse_charge_value)
                },
                'import_transactions': {
                    'count': import_transactions.count(),
                    'total_value': float(total_import_value)
                },
                'export_transactions': {
                    'count': export_transactions.count(),
                    'total_value': float(total_export_value)
                }
            },
            'compliance_statistics': {
                'total_tds_deductees': total_deductees,
                'active_tds_sections': TDSSection.objects.filter(is_active=True).count()
            }
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def calculate_reverse_charge_gst(request):
    """Calculate reverse charge GST for a transaction"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        taxable_value = Decimal(str(request.data.get('taxable_value', 0)))
        supplier_state = request.data.get('supplier_state', '')
        company_state = request.data.get('company_state', '')
        gst_rate = Decimal(str(request.data.get('gst_rate', 18)))
        
        # Determine if inter-state or intra-state
        if supplier_state == company_state:
            # Intra-state: CGST + SGST
            cgst_rate = gst_rate / 2
            sgst_rate = gst_rate / 2
            igst_rate = Decimal('0')
            
            cgst_amount = (taxable_value * cgst_rate) / 100
            sgst_amount = (taxable_value * sgst_rate) / 100
            igst_amount = Decimal('0')
        else:
            # Inter-state: IGST
            cgst_rate = Decimal('0')
            sgst_rate = Decimal('0')
            igst_rate = gst_rate
            
            cgst_amount = Decimal('0')
            sgst_amount = Decimal('0')
            igst_amount = (taxable_value * igst_rate) / 100
        
        total_tax = cgst_amount + sgst_amount + igst_amount
        total_amount = taxable_value + total_tax
        
        return Response({
            'taxable_value': float(taxable_value),
            'cgst_rate': float(cgst_rate),
            'sgst_rate': float(sgst_rate),
            'igst_rate': float(igst_rate),
            'cgst_amount': float(cgst_amount),
            'sgst_amount': float(sgst_amount),
            'igst_amount': float(igst_amount),
            'total_tax': float(total_tax),
            'total_amount': float(total_amount)
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@authentication_classes([])
@permission_classes([])
def calculate_tds_amount(request):
    """Calculate TDS amount for a deductee"""
    session_key = request.data.get('session_key')
    if not session_key:
        return Response({'error': 'Session key required'}, status=400)
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        
        deductee_id = request.data.get('deductee_id')
        payment_amount = Decimal(str(request.data.get('payment_amount', 0)))
        
        deductee = AdvancedTDSDeductee.objects.get(
            id=deductee_id,
            company=session.service_user.company
        )
        
        # Get applicable TDS rate
        tds_rate = deductee.get_applicable_tds_rate()
        
        # Check threshold
        is_threshold_exceeded = deductee.is_threshold_exceeded(payment_amount)
        
        if is_threshold_exceeded:
            tds_amount = (payment_amount * tds_rate) / 100
            net_amount = payment_amount - tds_amount
        else:
            tds_amount = Decimal('0')
            net_amount = payment_amount
        
        return Response({
            'deductee_name': deductee.deductee_name,
            'deductee_type': deductee.deductee_type,
            'payment_amount': float(payment_amount),
            'tds_rate': float(tds_rate),
            'tds_amount': float(tds_amount),
            'net_amount': float(net_amount),
            'is_threshold_exceeded': is_threshold_exceeded,
            'current_year_payments': float(deductee.current_year_payments),
            'annual_threshold': float(deductee.annual_threshold),
            'tds_section': deductee.default_tds_section.section_code if deductee.default_tds_section else None
        })
        
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=404)
    except AdvancedTDSDeductee.DoesNotExist:
        return Response({'error': 'Deductee not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)