from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.utils import timezone
import logging
import traceback

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    """
    response = exception_handler(exc, context)
    
    # Log ALL exceptions, even if DRF doesn't handle them
    request = context.get('request')
    request_id = getattr(request, 'correlation_id', None) if request else None
    
    if response is None:
        # Unhandled exception - log it with full traceback
        logger.error(
            "Unhandled API Error: %s - Context: %s\nTraceback: %s",
            exc,
            context,
            traceback.format_exc(),
            extra={'request_id': request_id},
        )
        # Return a generic 500 error
        return Response({
            'error': True,
            'message': 'Internal server error',
            'details': str(exc),
            'status_code': 500,
            'timestamp': timezone.now().isoformat(),
            'path': request.path if request else None,
        }, status=500)
    
    # Log the error
    logger.error(
        "API Error: %s - Context: %s",
        exc,
        context,
        extra={'request_id': request_id},
    )
    
    # Create custom response format
    custom_response_data = {
        'error': True,
        'message': str(exc),
        'status_code': response.status_code,
        'timestamp': timezone.now().isoformat(),
        'path': request.path if request else None,
    }
    if request_id:
        custom_response_data['request_id'] = request_id
    
    # Preserve original error details for debugging
    if hasattr(exc, 'detail'):
        custom_response_data['details'] = exc.detail
        
    response.data = custom_response_data
    
    return response
