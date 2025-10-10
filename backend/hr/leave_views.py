from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import datetime

from authentication.models import ServiceUserSession
from .leave_models import LeaveType, LeaveBalance, LeaveApplication, Holiday
from .models import Employee
from rest_framework import serializers


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = '__all__'


class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = LeaveBalance
        fields = '__all__'


class LeaveApplicationSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = LeaveApplication
        fields = '__all__'


class HolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = Holiday
        fields = '__all__'


class LeaveBalanceViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = LeaveBalanceSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return LeaveBalance.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return LeaveBalance.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'leave_type')
        except ServiceUserSession.DoesNotExist:
            return LeaveBalance.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key


class LeaveApplicationViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = LeaveApplicationSerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return LeaveApplication.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return LeaveApplication.objects.filter(
                employee__company=session.service_user.company
            ).select_related('employee', 'leave_type', 'approved_by')
        except ServiceUserSession.DoesNotExist:
            return LeaveApplication.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            application = self.get_object()
            
            application.status = 'approved'
            application.approved_date = timezone.now()
            application.save()
            
            # Update leave balance
            balance = LeaveBalance.objects.get(
                employee=application.employee,
                leave_type=application.leave_type,
                year=datetime.now().year
            )
            balance.used += application.total_days
            balance.calculate_balance()
            
            return Response({'message': 'Leave approved successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        session_key = self.get_session_key()
        if not session_key:
            return Response({'error': 'Session key required'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            application = self.get_object()
            
            application.status = 'rejected'
            application.rejection_reason = request.data.get('reason', '')
            application.save()
            
            return Response({'message': 'Leave rejected successfully'})
        except ServiceUserSession.DoesNotExist:
            return Response({'error': 'Invalid session'}, status=status.HTTP_401_UNAUTHORIZED)


class HolidayViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = HolidaySerializer

    def get_queryset(self):
        session_key = self.get_session_key()
        if not session_key:
            return Holiday.objects.none()

        try:
            session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
            return Holiday.objects.filter(company=session.service_user.company)
        except ServiceUserSession.DoesNotExist:
            return Holiday.objects.none()

    def get_session_key(self):
        session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = self.request.query_params.get('session_key')
        if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
            session_key = self.request.data.get('session_key')
        return session_key
