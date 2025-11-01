"""
Comprehensive error handling for CRM module
"""
import logging
import traceback
from django.http import JsonResponse
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import IntegrityError, DatabaseError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler
from authentication.models import ServiceUserSession

logger = logging.getLogger('crm_errors')

class CRMException(Exception):
    """Base CRM exception"""
    def __init__(self, message, error_code=None, status_code=400):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        super().__init__(self.message)

class CRMValidationError(CRMException):
    """CRM validation error"""
    def __init__(self, message, field=None):
        self.field = field
        super().__init__(message, 'VALIDATION_ERROR', 400)

class CRMPermissionError(CRMException):
    """CRM permission error"""
    def __init__(self, message):
        super().__init__(message, 'PERMISSION_DENIED', 403)

class CRMNotFoundError(CRMException):
    """CRM resource not found error"""
    def __init__(self, resource_type, resource_id=None):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" (ID: {resource_id})"
        super().__init__(message, 'RESOURCE_NOT_FOUND', 404)

class CRMBusinessLogicError(CRMException):
    """CRM business logic error"""
    def __init__(self, message):
        super().__init__(message, 'BUSINESS_LOGIC_ERROR', 422)

def safe_execute(func, *args, **kwargs):
    """Safely execute a function with comprehensive error handling"""
    try:
        return func(*args, **kwargs)
    except CRMException as e:
        logger.error(f"CRM Error: {e.message}", extra={'error_code': e.error_code})
        return Response({
            'error': e.message,
            'error_code': e.error_code
        }, status=e.status_code)
    except ValidationError as e:
        logger.error(f"Validation Error: {str(e)}")
        return Response({
            'error': 'Validation failed',
            'details': e.message_dict if hasattr(e, 'message_dict') else str(e),
            'error_code': 'VALIDATION_ERROR'
        }, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as e:
        logger.error(f"Database Integrity Error: {str(e)}")
        return Response({
            'error': 'Data integrity constraint violated',
            'error_code': 'INTEGRITY_ERROR'
        }, status=status.HTTP_400_BAD_REQUEST)
    except DatabaseError as e:
        logger.error(f"Database Error: {str(e)}")
        return Response({
            'error': 'Database operation failed',
            'error_code': 'DATABASE_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except PermissionDenied as e:
        logger.error(f"Permission Denied: {str(e)}")
        return Response({
            'error': 'Permission denied',
            'error_code': 'PERMISSION_DENIED'
        }, status=status.HTTP_403_FORBIDDEN)
    except Exception as e:
        logger.error(f"Unexpected Error: {str(e)}", extra={'traceback': traceback.format_exc()})
        return Response({
            'error': 'An unexpected error occurred',
            'error_code': 'INTERNAL_ERROR'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def validate_session(session_key):
    """Validate session with proper error handling"""
    if not session_key:
        raise CRMPermissionError("Session key required")
    
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        return session
    except ServiceUserSession.DoesNotExist:
        raise CRMPermissionError("Invalid or expired session")

def validate_company_access(session, resource):
    """Validate that user has access to company resource"""
    if hasattr(resource, 'company') and resource.company != session.service_user.company:
        raise CRMPermissionError("Access denied to this resource")

def custom_exception_handler(exc, context):
    """Custom exception handler for CRM module"""
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the error
        logger.error(f"API Error: {str(exc)}", extra={
            'view': context.get('view').__class__.__name__ if context.get('view') else 'Unknown',
            'request_method': context.get('request').method if context.get('request') else 'Unknown',
            'status_code': response.status_code
        })
        
        # Customize the response format
        custom_response_data = {
            'error': 'Request failed',
            'details': response.data,
            'error_code': 'API_ERROR',
            'status_code': response.status_code
        }
        response.data = custom_response_data
    
    return response

class ErrorHandlerMixin:
    """Mixin to add error handling to viewsets"""
    
    def handle_errors(self, func, *args, **kwargs):
        """Handle errors for viewset methods"""
        return safe_execute(func, *args, **kwargs)
    
    def dispatch(self, request, *args, **kwargs):
        """Override dispatch to add error handling"""
        try:
            return super().dispatch(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Dispatch Error in {self.__class__.__name__}: {str(e)}")
            return Response({
                'error': 'Request processing failed',
                'error_code': 'DISPATCH_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_session_with_validation(self):
        """Get session with proper validation"""
        session_key = self.get_session_key()
        return validate_session(session_key)
    
    def get_object_with_validation(self):
        """Get object with company access validation"""
        obj = self.get_object()
        session = self.get_session_with_validation()
        validate_company_access(session, obj)
        return obj

def log_crm_activity(user, action, resource_type, resource_id=None, details=None):
    """Log CRM activities for audit trail"""
    try:
        logger.info(f"CRM Activity: {action}", extra={
            'user': user.username if user else 'Anonymous',
            'action': action,
            'resource_type': resource_type,
            'resource_id': resource_id,
            'details': details
        })
    except Exception as e:
        logger.error(f"Failed to log CRM activity: {str(e)}")

def validate_required_fields(data, required_fields):
    """Validate required fields with proper error handling"""
    missing_fields = []
    for field in required_fields:
        if field not in data or not data[field]:
            missing_fields.append(field)
    
    if missing_fields:
        raise CRMValidationError(f"Missing required fields: {', '.join(missing_fields)}")

def validate_field_types(data, field_types):
    """Validate field types"""
    errors = {}
    for field, expected_type in field_types.items():
        if field in data and data[field] is not None:
            if not isinstance(data[field], expected_type):
                errors[field] = f"Expected {expected_type.__name__}, got {type(data[field]).__name__}"
    
    if errors:
        raise CRMValidationError("Field type validation failed", errors)

def handle_database_errors(func):
    """Decorator to handle database errors"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError as e:
            logger.error(f"Database integrity error in {func.__name__}: {str(e)}")
            raise CRMException("Data integrity constraint violated", 'INTEGRITY_ERROR', 400)
        except DatabaseError as e:
            logger.error(f"Database error in {func.__name__}: {str(e)}")
            raise CRMException("Database operation failed", 'DATABASE_ERROR', 500)
    return wrapper