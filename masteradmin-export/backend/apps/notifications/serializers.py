from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'priority', 'title', 'message',
            'company_id', 'service_id', 'is_read', 'is_archived',
            'read_at', 'created_at', 'expires_at', 'metadata',
            'sender_name'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'sender_name']

class NotificationCreateSerializer(serializers.ModelSerializer):
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Notification
        fields = [
            'recipient_ids', 'notification_type', 'priority', 'title',
            'message', 'company_id', 'service_id', 'expires_at', 'metadata'
        ]
    
    def create(self, validated_data):
        recipient_ids = validated_data.pop('recipient_ids', [])
        sender = self.context['request'].user
        
        notifications = []
        if recipient_ids:
            for recipient_id in recipient_ids:
                try:
                    recipient = User.objects.get(id=recipient_id)
                    notification = Notification.objects.create(
                        recipient=recipient,
                        sender=sender,
                        **validated_data
                    )
                    notifications.append(notification)
                except User.DoesNotExist:
                    continue
        
        return notifications

class NotificationBulkCreateSerializer(serializers.Serializer):
    notification_type = serializers.ChoiceField(choices=Notification.NOTIFICATION_TYPES)
    priority = serializers.ChoiceField(choices=Notification.PRIORITY_LEVELS, default='medium')
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    company_id = serializers.IntegerField(required=False)
    service_id = serializers.IntegerField(required=False)
    expires_at = serializers.DateTimeField(required=False)
    metadata = serializers.JSONField(default=dict)
    
    # Target selection
    send_to_all = serializers.BooleanField(default=False)
    company_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    
    def create(self, validated_data):
        sender = self.context['request'].user
        send_to_all = validated_data.pop('send_to_all', False)
        company_ids = validated_data.pop('company_ids', [])
        
        notifications = []
        
        if send_to_all:
            recipients = User.objects.all()
        elif company_ids:
            # Get users from specific companies
            recipients = User.objects.filter(company_id__in=company_ids)
        else:
            recipients = []
        
        for recipient in recipients:
            notification = Notification.objects.create(
                recipient=recipient,
                sender=sender,
                **validated_data
            )
            notifications.append(notification)
        
        return notifications

class NotificationMarkReadSerializer(serializers.Serializer):
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )
    mark_all = serializers.BooleanField(default=False)
    
    def create(self, validated_data):
        user = self.context['request'].user
        notification_ids = validated_data.get('notification_ids', [])
        mark_all = validated_data.get('mark_all', False)
        
        if mark_all:
            notifications = Notification.objects.filter(
                recipient=user,
                is_read=False
            )
        else:
            notifications = Notification.objects.filter(
                id__in=notification_ids,
                recipient=user,
                is_read=False
            )
        
        updated_notifications = []
        for notification in notifications:
            notification.mark_as_read()
            updated_notifications.append(notification)
        
        return updated_notifications