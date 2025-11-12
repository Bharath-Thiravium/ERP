from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import datetime, date
from .document_numbering_models import DocumentNumberingConfig, DocumentNumberingHistory, FinancialYearSettings
from .document_numbering_serializers import (
    DocumentNumberingConfigSerializer, DocumentNumberingHistorySerializer,
    FinancialYearSettingsSerializer, DocumentNumberingSetupSerializer,
    ManualOverrideSerializer
)
from authentication.models import Service


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_financial_year(request):
    """Get current financial year for the company"""
    try:
        company = request.user.company_user.company
        
        # Get current date
        today = timezone.now().date()
        
        # Determine financial year (April to March)
        if today.month >= 4:  # April to December
            start_year = today.year
            end_year = today.year + 1
        else:  # January to March
            start_year = today.year - 1
            end_year = today.year
        
        financial_year = f"{start_year}-{str(end_year)[-2:]}"
        
        return Response({
            'financial_year': financial_year,
            'start_date': f"{start_year}-04-01",
            'end_date': f"{end_year}-03-31",
            'is_current': True
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def document_numbering_configs(request):
    """Get or create document numbering configurations"""
    try:
        company = request.user.company_user.company
        
        if request.method == 'GET':
            # Get service filter
            service_id = request.GET.get('service_id')
            financial_year = request.GET.get('financial_year')
            
            configs = DocumentNumberingConfig.objects.filter(company=company)
            
            if service_id:
                configs = configs.filter(service_id=service_id)
            
            if financial_year:
                configs = configs.filter(financial_year=financial_year)
            
            configs = configs.select_related('service').order_by('service__name', 'document_type')
            
            serializer = DocumentNumberingConfigSerializer(configs, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Create or update configuration
            data = request.data.copy()
            data['company'] = company.id
            
            # Check if configuration already exists
            existing_config = DocumentNumberingConfig.objects.filter(
                service_id=data.get('service'),
                company=company,
                document_type=data.get('document_type'),
                financial_year=data.get('financial_year')
            ).first()
            
            if existing_config:
                serializer = DocumentNumberingConfigSerializer(existing_config, data=data, partial=True)
            else:
                serializer = DocumentNumberingConfigSerializer(data=data)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def document_numbering_config_detail(request, config_id):
    """Get, update, or delete specific document numbering configuration"""
    try:
        company = request.user.company_user.company
        
        try:
            config = DocumentNumberingConfig.objects.get(
                id=config_id,
                company=company
            )
        except DocumentNumberingConfig.DoesNotExist:
            return Response(
                {'error': 'Configuration not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            serializer = DocumentNumberingConfigSerializer(config)
            return Response(serializer.data)
        
        elif request.method == 'PUT':
            serializer = DocumentNumberingConfigSerializer(config, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            config.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_setup_numbering(request):
    """Bulk setup document numbering for all document types"""
    try:
        company = request.user.company_user.company
        
        serializer = DocumentNumberingSetupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Get all active services for the company
        company_services = company.company_services.filter(is_active=True).select_related('service')
        
        if not company_services.exists():
            return Response(
                {'error': 'No active services found for this company'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created_configs = []
        
        with transaction.atomic():
            for company_service in company_services:
                service = company_service.service
                
                # Create financial year settings
                financial_year_setting, created = FinancialYearSettings.objects.get_or_create(
                    company=company,
                    service=service,
                    financial_year=data['financial_year'],
                    defaults={
                        'start_date': data['start_date'],
                        'end_date': data['end_date'],
                        'is_active': True,
                        'is_current': True
                    }
                )
                
                # Document type configurations
                document_configs = [
                    ('quotation', data['quotation_prefix']),
                    ('purchase_order', data['purchase_order_prefix']),
                    ('invoice', data['invoice_prefix']),
                    ('proforma_invoice', data['proforma_invoice_prefix']),
                    ('payment', data['payment_prefix']),
                    ('customer', data['customer_prefix']),
                    ('vendor', data['vendor_prefix']),
                    ('product', data['product_prefix']),
                ]
                
                for doc_type, prefix in document_configs:
                    config, created = DocumentNumberingConfig.objects.get_or_create(
                        service=service,
                        company=company,
                        document_type=doc_type,
                        financial_year=data['financial_year'],
                        defaults={
                            'prefix': prefix,
                            'starting_number': data['starting_number'],
                            'current_counter': 0,
                            'number_padding': data['number_padding'],
                            'is_active': True,
                            'allow_manual_override': data['allow_manual_override']
                        }
                    )
                    
                    if created:
                        created_configs.append(config)
        
        return Response({
            'message': f'Successfully created {len(created_configs)} document numbering configurations',
            'created_count': len(created_configs),
            'services_configured': len(company_services)
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_document_number(request):
    """Generate next document number for a specific type"""
    try:
        company = request.user.company_user.company
        
        service_id = request.data.get('service_id')
        document_type = request.data.get('document_type')
        financial_year = request.data.get('financial_year')
        manual_override = request.data.get('manual_override')
        
        if not all([service_id, document_type, financial_year]):
            return Response(
                {'error': 'service_id, document_type, and financial_year are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            config = DocumentNumberingConfig.objects.get(
                service_id=service_id,
                company=company,
                document_type=document_type,
                financial_year=financial_year,
                is_active=True
            )
        except DocumentNumberingConfig.DoesNotExist:
            return Response(
                {'error': 'Document numbering configuration not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Handle manual override
        if manual_override and config.allow_manual_override:
            override_serializer = ManualOverrideSerializer(data=manual_override)
            if not override_serializer.is_valid():
                return Response(override_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            override_data = override_serializer.validated_data
            document_number = override_data['document_number']
            
            # Check for duplicates (basic check - can be enhanced)
            if DocumentNumberingHistory.objects.filter(
                config__company=company,
                config__document_type=document_type,
                document_number=document_number
            ).exists():
                return Response(
                    {'error': 'Document number already exists'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create history record for manual override
            DocumentNumberingHistory.objects.create(
                config=config,
                document_number=document_number,
                is_manual_override=True,
                override_reason=override_data['override_reason'],
                created_by=getattr(request.user, 'company_service_user', None)
            )
            
        else:
            # Generate automatic number
            document_number = config.get_next_number()
            
            # Create history record
            DocumentNumberingHistory.objects.create(
                config=config,
                document_number=document_number,
                is_manual_override=False,
                created_by=getattr(request.user, 'company_service_user', None)
            )
        
        return Response({
            'document_number': document_number,
            'document_type': document_type,
            'is_manual_override': bool(manual_override),
            'next_preview': config.get_next_number_preview()
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def document_numbering_history(request):
    """Get document numbering history"""
    try:
        company = request.user.company_user.company
        
        # Filters
        service_id = request.GET.get('service_id')
        document_type = request.GET.get('document_type')
        financial_year = request.GET.get('financial_year')
        is_manual_override = request.GET.get('is_manual_override')
        
        history = DocumentNumberingHistory.objects.filter(
            config__company=company
        ).select_related('config', 'created_by')
        
        if service_id:
            history = history.filter(config__service_id=service_id)
        
        if document_type:
            history = history.filter(config__document_type=document_type)
        
        if financial_year:
            history = history.filter(config__financial_year=financial_year)
        
        if is_manual_override is not None:
            history = history.filter(is_manual_override=is_manual_override.lower() == 'true')
        
        # Pagination
        page_size = int(request.GET.get('page_size', 50))
        page = int(request.GET.get('page', 1))
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = history.count()
        history_page = history[start:end]
        
        serializer = DocumentNumberingHistorySerializer(history_page, many=True)
        
        return Response({
            'results': serializer.data,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def financial_year_settings(request):
    """Get or create financial year settings"""
    try:
        company = request.user.company_user.company
        
        if request.method == 'GET':
            service_id = request.GET.get('service_id')
            
            settings = FinancialYearSettings.objects.filter(company=company)
            
            if service_id:
                settings = settings.filter(service_id=service_id)
            
            settings = settings.select_related('service').order_by('-financial_year')
            
            serializer = FinancialYearSettingsSerializer(settings, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            data = request.data.copy()
            data['company'] = company.id
            
            serializer = FinancialYearSettingsSerializer(data=data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def numbering_dashboard_stats(request):
    """Get dashboard statistics for document numbering"""
    try:
        company = request.user.company_user.company
        
        # Get current financial year
        today = timezone.now().date()
        if today.month >= 4:
            current_fy = f"{today.year}-{str(today.year + 1)[-2:]}"
        else:
            current_fy = f"{today.year - 1}-{str(today.year)[-2:]}"
        
        # Get configurations for current financial year
        configs = DocumentNumberingConfig.objects.filter(
            company=company,
            financial_year=current_fy,
            is_active=True
        ).select_related('service')
        
        # Calculate statistics
        total_configs = configs.count()
        active_services = configs.values('service').distinct().count()
        
        # Document type statistics
        doc_type_stats = {}
        for config in configs:
            doc_type = config.document_type
            if doc_type not in doc_type_stats:
                doc_type_stats[doc_type] = {
                    'count': 0,
                    'total_generated': 0,
                    'manual_overrides': 0
                }
            doc_type_stats[doc_type]['count'] += 1
            doc_type_stats[doc_type]['total_generated'] += config.current_counter
        
        # Manual override statistics
        manual_overrides = DocumentNumberingHistory.objects.filter(
            config__company=company,
            config__financial_year=current_fy,
            is_manual_override=True
        ).count()
        
        # Recent activity
        recent_history = DocumentNumberingHistory.objects.filter(
            config__company=company,
            config__financial_year=current_fy
        ).select_related('config', 'created_by').order_by('-created_at')[:10]
        
        recent_activity = DocumentNumberingHistorySerializer(recent_history, many=True).data
        
        return Response({
            'current_financial_year': current_fy,
            'total_configurations': total_configs,
            'active_services': active_services,
            'document_type_statistics': doc_type_stats,
            'total_manual_overrides': manual_overrides,
            'recent_activity': recent_activity
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )