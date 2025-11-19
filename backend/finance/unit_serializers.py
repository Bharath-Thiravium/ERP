from rest_framework import serializers
from .unit_models import Unit


class UnitSerializer(serializers.ModelSerializer):
    """Serializer for Unit model"""
    class Meta:
        model = Unit
        fields = ['id', 'code', 'name', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class UnitCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new units"""
    class Meta:
        model = Unit
        fields = ['code', 'name']
        
    def validate_code(self, value):
        """Validate unit code"""
        if not value or not value.strip():
            raise serializers.ValidationError("Unit code is required")
        return value.strip().upper()
    
    def validate_name(self, value):
        """Validate unit name"""
        if not value or not value.strip():
            raise serializers.ValidationError("Unit name is required")
        return value.strip()