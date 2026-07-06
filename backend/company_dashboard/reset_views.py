from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_document_counter(request):
    """Reset document counter to start from 001"""
    return Response(
        {'error': 'Counter reset is disabled in production to prevent document number reuse.'},
        status=status.HTTP_403_FORBIDDEN,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_all_counters(request):
    """Reset all document counters for company"""
    return Response(
        {'error': 'Counter reset is disabled in production to prevent document number reuse.'},
        status=status.HTTP_403_FORBIDDEN,
    )
