from rest_framework.views import exception_handler
from rest_framework.response import Response
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        request = context.get('request')
        request_id = getattr(request, 'correlation_id', None) if request else None

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
