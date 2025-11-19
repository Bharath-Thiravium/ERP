"""
Enhanced error handling for HR compliance system
"""
import logging
from functools import wraps
from rest_framework import status
from rest_framework.response import Response
from django.core.exceptions import ValidationError
from authentication.models import ServiceUserSession

logger = logging.getLogger(__name__)


class ComplianceError(Exception):
    """Custom compliance error"""
    def __init__(self, message, error_code=None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


def handle_compliance_errors(func):
    """Decorator for handling compliance errors"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ValidationError as e:
            logger.error(f"Validation error in {func.__name__}: {str(e)}")
            return Response({
                'error': 'Validation failed',
                'details': str(e),
                'error_code': 'VALIDATION_ERROR'
            }, status=status.HTTP_400_BAD_REQUEST)
        except ComplianceError as e:
            logger.error(f"Compliance error in {func.__name__}: {str(e)}")
            return Response({
                'error': e.message,
                'error_code': e.error_code or 'COMPLIANCE_ERROR'
            }, status=status.HTTP_400_BAD_REQUEST)
        except ServiceUserSession.DoesNotExist:
            logger.warning(f"Invalid session in {func.__name__}")
            return Response({
                'error': 'Invalid or expired session',
                'error_code': 'INVALID_SESSION'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred',
                'error_code': 'INTERNAL_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return wrapper


def safe_get_session(session_key):
    """Safely get session with proper error handling"""
    try:
        if not session_key:
            raise ComplianceError("Session key is required", "MISSING_SESSION")
        
        session = ServiceUserSession.objects.select_related('service_user__company').get(
            session_key=session_key, 
            is_active=True
        )
        return session
    except ServiceUserSession.DoesNotExist:
        raise ComplianceError("Invalid or expired session", "INVALID_SESSION")


def log_compliance_action(action, company, user, details=None):
    """Log compliance actions for audit trail"""
    logger.info(f"Compliance Action: {action} | Company: {company.name} | User: {user.username} | Details: {details}")


class SafeCalculator:
    """Safe calculation wrapper with error handling"""
    
    @staticmethod
    def safe_divide(numerator, denominator, default=0):
        """Safe division with zero check"""
        try:
            if denominator == 0:
                return default
            return numerator / denominator
        except (TypeError, ValueError):
            return default
    
    @staticmethod
    def safe_multiply(a, b, default=0):
        """Safe multiplication with error handling"""
        try:
            return a * b
        except (TypeError, ValueError):
            return default
    
    @staticmethod
    def safe_percentage(value, percentage, default=0):
        """Safe percentage calculation"""
        try:
            return (value * percentage) / 100
        except (TypeError, ValueError, ZeroDivisionError):
            return default