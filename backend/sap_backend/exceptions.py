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
        # Log the error
        logger.error(f"API Error: {exc} - Context: {context}")
        
        # Create custom response format
        custom_response_data = {
            'error': True,
            'message': str(exc),
            'status_code': response.status_code,
            'timestamp': timezone.now().isoformat(),
            'path': context['request'].path if 'request' in context else None
        }
        
        # Preserve original error details for debugging
        if hasattr(exc, 'detail'):
            custom_response_data['details'] = exc.detail
            
        response.data = custom_response_data
    
    return response