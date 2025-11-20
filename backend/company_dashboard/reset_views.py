from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from .document_numbering_reset import reset_document_counter as reset_counter, reset_all_counters_for_company


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_document_counter(request):
    """Reset document counter to start from 001"""
    try:
        company = request.user.company_user.company
        
        document_type = request.data.get('document_type')
        service_id = request.data.get('service_id')
        
        if not document_type:
            return Response({'error': 'document_type is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get current financial year
        today = timezone.now().date()
        if today.month >= 4:
            current_fy = f"{today.year}-{str(today.year + 1)[-2:]}"
        else:
            current_fy = f"{today.year - 1}-{str(today.year)[-2:]}"
        
        result = reset_counter(
            company_id=company.id,
            document_type=document_type,
            service_id=service_id,
            financial_year=current_fy
        )
        
        return Response({
            'message': result,
            'document_type': document_type,
            'reset_successful': 'Reset' in result
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_all_counters(request):
    """Reset all document counters for company"""
    try:
        company = request.user.company_user.company
        
        result = reset_all_counters_for_company(company.id)
        
        return Response({
            'message': result,
            'company': company.name,
            'reset_successful': 'Reset' in result
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)