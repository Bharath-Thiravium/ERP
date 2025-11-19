from rest_framework import serializers
from .integration_models import (
    PaymentGateway, AutomatedTaxPayment, EmailAutomation, MobileAppConfig, IntegrationLog
)





class PaymentGatewaySerializer(serializers.ModelSerializer):
    """Serializer for payment gateways"""
    
    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'gateway_type', 'gateway_name', 'merchant_id', 'webhook_url',
            'auto_gst_payment', 'auto_tds_payment', 'payment_threshold',
            'is_active', 'is_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = ['is_verified']

class AutomatedTaxPaymentSerializer(serializers.ModelSerializer):
    """Serializer for automated tax payments"""
    
    gateway_name = serializers.CharField(source='payment_gateway.gateway_name', read_only=True)
    
    class Meta:
        model = AutomatedTaxPayment
        fields = [
            'id', 'payment_gateway', 'gateway_name', 'tax_type', 'tax_period',
            'amount', 'payment_date', 'due_date', 'challan_number', 'transaction_id',
            'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['challan_number', 'transaction_id', 'status']

class EmailAutomationSerializer(serializers.ModelSerializer):
    """Serializer for email automations"""
    
    class Meta:
        model = EmailAutomation
        fields = [
            'id', 'email_type', 'title', 'recipient_emails', 'include_company_admin',
            'include_finance_users', 'frequency', 'send_days_before', 'send_time',
            'subject_template', 'body_template', 'is_active', 'last_sent', 'next_send',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['last_sent', 'next_send']

class MobileAppConfigSerializer(serializers.ModelSerializer):
    """Serializer for mobile app configuration"""
    
    class Meta:
        model = MobileAppConfig
        fields = [
            'id', 'push_notifications_enabled', 'gst_filing_alerts', 'payment_due_alerts',
            'invoice_alerts', 'offline_mode_enabled', 'biometric_auth_enabled',
            'quick_invoice_enabled', 'expense_capture_enabled', 'auto_sync_enabled',
            'sync_frequency', 'wifi_only_sync', 'session_timeout', 'require_pin',
            'created_at', 'updated_at'
        ]

class IntegrationLogSerializer(serializers.ModelSerializer):
    """Serializer for integration logs"""
    
    class Meta:
        model = IntegrationLog
        fields = [
            'id', 'log_type', 'status', 'message', 'details', 'records_processed',
            'records_success', 'records_failed', 'processing_time', 'created_at'
        ]