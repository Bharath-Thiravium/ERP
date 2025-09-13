from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_email = serializers.CharField(source='sender.email', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'message',
            'company_id', 'service_id', 'is_read', 'is_archived',
            'read_at', 'created_at', 'expires_at', 'metadata',
            'sender_name', 'sender_email'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'sender_name', 'sender_email']


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications"""
    recipient_email = serializers.EmailField(write_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'recipient_email', 'notification_type', 'priority', 'title', 
            'message', 'company_id', 'service_id', 'expires_at', 'metadata'
        ]
    
    def validate_recipient_email(self, value):
        """Validate that recipient exists"""
        try:
            User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this email does not exist.")
        return value
    
    def create(self, validated_data):
        recipient_email = validated_data.pop('recipient_email')
        recipient = User.objects.get(email=recipient_email)
        
        notification = Notification.objects.create(
            recipient=recipient,
            sender=self.context['request'].user,
            **validated_data
        )
        
        return notification


class NotificationBulkCreateSerializer(serializers.Serializer):
    """Serializer for creating bulk notifications"""
    recipient_emails = serializers.ListField(
        child=serializers.EmailField(),
        write_only=True
    )
    notification_type = serializers.CharField()
    priority = serializers.CharField(default='medium')
    title = serializers.CharField()
    message = serializers.CharField()
    company_id = serializers.IntegerField(required=False)
    service_id = serializers.IntegerField(required=False)
    expires_at = serializers.DateTimeField(required=False)
    metadata = serializers.JSONField(default=dict)
    
    def validate_recipient_emails(self, value):
        """Validate that all recipients exist"""
        existing_users = User.objects.filter(email__in=value)
        existing_emails = set(existing_users.values_list('email', flat=True))
        invalid_emails = set(value) - existing_emails
        
        if invalid_emails:
            raise serializers.ValidationError(
                f"Users with these emails do not exist: {', '.join(invalid_emails)}"
            )
        
        return value
    
    def create(self, validated_data):
        recipient_emails = validated_data.pop('recipient_emails')
        recipients = User.objects.filter(email__in=recipient_emails)
        
        notifications = []
        for recipient in recipients:
            notification = Notification(
                recipient=recipient,
                sender=self.context['request'].user,
                **validated_data
            )
            notifications.append(notification)
        
        created_notifications = Notification.objects.bulk_create(notifications)
        return created_notifications


class NotificationMarkReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read"""
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    
    def validate_notification_ids(self, value):
        """Validate that all notifications belong to the user"""
        user = self.context['request'].user
        user_notifications = Notification.objects.filter(
            id__in=value,
            recipient=user
        ).values_list('id', flat=True)
        
        invalid_ids = set(value) - set(user_notifications)
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid notification IDs: {', '.join(map(str, invalid_ids))}"
            )
        
        return value
    
    def save(self):
        """Mark notifications as read"""
        notification_ids = self.validated_data['notification_ids']
        user = self.context['request'].user
        
        notifications = Notification.objects.filter(
            id__in=notification_ids,
            recipient=user,
            is_read=False
        )
        
        for notification in notifications:
            notification.mark_as_read()
        
        return notifications
