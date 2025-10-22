from rest_framework import serializers
from .government_credentials_models import CompanyGovernmentCredentials, CompanyGovernmentCredentialLog

class CompanyGovernmentCredentialsSerializer(serializers.ModelSerializer):
    """Serializer for government credentials with security considerations"""
    
    # Read-only fields for display
    api_type_display = serializers.CharField(source='get_api_type_display', read_only=True)
    environment_display = serializers.CharField(source='get_environment_display', read_only=True)
    
    # Masked fields for security (only show partial data)
    client_id_masked = serializers.SerializerMethodField()
    username_masked = serializers.SerializerMethodField()
    gstin_masked = serializers.SerializerMethodField()
    pan_masked = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyGovernmentCredentials
        fields = [
            'id', 'api_type', 'api_type_display', 'environment', 'environment_display',
            'credential_name', 'description', 'base_url',
            'client_id_masked', 'username_masked', 'gstin_masked', 'pan_masked',
            'is_active', 'is_validated', 'last_validated', 'validation_error',
            'last_used', 'usage_count', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = [
            'id', 'is_validated', 'last_validated', 'validation_error',
            'last_used', 'usage_count', 'created_at', 'updated_at'
        ]
    
    def get_client_id_masked(self, obj):
        """Return masked client ID for security"""
        client_id = obj.get_client_id()
        if client_id and len(client_id) > 8:
            return client_id[:4] + '*' * (len(client_id) - 8) + client_id[-4:]
        return '****' if client_id else ''
    
    def get_username_masked(self, obj):
        """Return masked username for security"""
        username = obj.get_username()
        if username and len(username) > 4:
            return username[:2] + '*' * (len(username) - 4) + username[-2:]
        return '****' if username else ''
    
    def get_gstin_masked(self, obj):
        """Return masked GSTIN for security"""
        gstin = obj.get_gstin()
        if gstin and len(gstin) == 15:
            return gstin[:4] + '*' * 7 + gstin[-4:]
        return '****' if gstin else ''
    
    def get_pan_masked(self, obj):
        """Return masked PAN for security"""
        pan = obj.get_pan()
        if pan and len(pan) == 10:
            return pan[:3] + '*' * 4 + pan[-3:]
        return '****' if pan else ''

class CompanyGovernmentCredentialsCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating government credentials"""
    
    # Plain text fields for input (will be encrypted on save)
    client_id_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    client_secret_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    username_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    password_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    api_key_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gstin_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    pan_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tan_plain = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = CompanyGovernmentCredentials
        fields = [
            'api_type', 'environment', 'credential_name', 'description', 'base_url',
            'client_id_plain', 'client_secret_plain', 'username_plain', 'password_plain',
            'api_key_plain', 'gstin_plain', 'pan_plain', 'tan_plain',
            'additional_config', 'is_active'
        ]
    
    def create(self, validated_data):
        """Create new credentials with encryption"""
        # Extract plain text fields
        client_id_plain = validated_data.pop('client_id_plain', '')
        client_secret_plain = validated_data.pop('client_secret_plain', '')
        username_plain = validated_data.pop('username_plain', '')
        password_plain = validated_data.pop('password_plain', '')
        api_key_plain = validated_data.pop('api_key_plain', '')
        gstin_plain = validated_data.pop('gstin_plain', '')
        pan_plain = validated_data.pop('pan_plain', '')
        tan_plain = validated_data.pop('tan_plain', '')
        
        # Create instance
        instance = CompanyGovernmentCredentials.objects.create(**validated_data)
        
        # Set encrypted fields
        if client_id_plain:
            instance.set_client_id(client_id_plain)
        if client_secret_plain:
            instance.set_client_secret(client_secret_plain)
        if username_plain:
            instance.set_username(username_plain)
        if password_plain:
            instance.set_password(password_plain)
        if api_key_plain:
            instance.set_api_key(api_key_plain)
        if gstin_plain:
            instance.set_gstin(gstin_plain)
        if pan_plain:
            instance.set_pan(pan_plain)
        if tan_plain:
            instance.set_tan(tan_plain)
        
        instance.save()
        return instance
    
    def update(self, instance, validated_data):
        """Update credentials with encryption"""
        # Extract plain text fields
        client_id_plain = validated_data.pop('client_id_plain', None)
        client_secret_plain = validated_data.pop('client_secret_plain', None)
        username_plain = validated_data.pop('username_plain', None)
        password_plain = validated_data.pop('password_plain', None)
        api_key_plain = validated_data.pop('api_key_plain', None)
        gstin_plain = validated_data.pop('gstin_plain', None)
        pan_plain = validated_data.pop('pan_plain', None)
        tan_plain = validated_data.pop('tan_plain', None)
        
        # Update regular fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update encrypted fields only if provided
        if client_id_plain is not None:
            instance.set_client_id(client_id_plain)
        if client_secret_plain is not None:
            instance.set_client_secret(client_secret_plain)
        if username_plain is not None:
            instance.set_username(username_plain)
        if password_plain is not None:
            instance.set_password(password_plain)
        if api_key_plain is not None:
            instance.set_api_key(api_key_plain)
        if gstin_plain is not None:
            instance.set_gstin(gstin_plain)
        if pan_plain is not None:
            instance.set_pan(pan_plain)
        if tan_plain is not None:
            instance.set_tan(tan_plain)
        
        instance.save()
        return instance
    
    def validate(self, data):
        """Validate credentials based on API type"""
        api_type = data.get('api_type')
        
        if api_type == 'gst':
            required_fields = ['client_id_plain', 'client_secret_plain', 'username_plain', 'gstin_plain']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise serializers.ValidationError(
                    f"GST API requires: {', '.join(missing_fields)}"
                )
        
        elif api_type == 'tds':
            required_fields = ['username_plain', 'password_plain', 'pan_plain', 'tan_plain']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise serializers.ValidationError(
                    f"TDS API requires: {', '.join(missing_fields)}"
                )
        
        elif api_type == 'einvoice':
            required_fields = ['client_id_plain', 'client_secret_plain', 'gstin_plain']
            missing_fields = [field for field in required_fields if not data.get(field)]
            if missing_fields:
                raise serializers.ValidationError(
                    f"E-Invoice API requires: {', '.join(missing_fields)}"
                )
        
        return data

class CompanyGovernmentCredentialLogSerializer(serializers.ModelSerializer):
    """Serializer for credential audit logs"""
    
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = CompanyGovernmentCredentialLog
        fields = [
            'id', 'action', 'action_display', 'user_email', 'ip_address',
            'details', 'success', 'error_message', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']

class GovernmentAPITestSerializer(serializers.Serializer):
    """Serializer for testing government API credentials"""
    
    credential_id = serializers.IntegerField()
    test_type = serializers.ChoiceField(choices=[
        ('connection', 'Test Connection'),
        ('validate_gstin', 'Validate GSTIN'),
        ('validate_pan', 'Validate PAN'),
        ('get_rates', 'Get Tax Rates')
    ])
    test_data = serializers.JSONField(required=False, default=dict)