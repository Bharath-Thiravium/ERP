from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def simple_master_admin_login(request):
    """Simple master admin login without complex security features"""
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
    
    logger.info(f"Login attempt for email: {email}")
    
    # Try to authenticate with email as username first
    user = authenticate(username=email, password=password)
    logger.info(f"Auth with email as username: {user}")
    
    # If that fails, try to find user by email and authenticate with username
    if not user:
        try:
            user_obj = User.objects.get(email=email)
            logger.info(f"Found user: {user_obj.username} for email: {email}")
            user = authenticate(username=user_obj.username, password=password)
            logger.info(f"Auth with username: {user}")
        except User.DoesNotExist:
            logger.info(f"No user found with email: {email}")
            pass
    
    if user and user.is_active:
        logger.info(f"User authenticated: {user.username}, has master_admin: {hasattr(user, 'master_admin')}")
        # Check if user has master admin profile
        if hasattr(user, 'master_admin'):
            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            return Response({
                'access': str(access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'company_name': user.master_admin.company_name,
                    'is_master_admin': True
                },
                'message': 'Login successful'
            })
        else:
            logger.info(f"User {user.username} is not a master admin")
            return Response({'error': 'User is not a master admin'}, status=status.HTTP_403_FORBIDDEN)
    else:
        logger.info(f"Authentication failed for email: {email}")
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)