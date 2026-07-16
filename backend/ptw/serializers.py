from rest_framework import serializers
from .models import PermitToWork


class PermitToWorkSerializer(serializers.ModelSerializer):
    class Meta:
        model = PermitToWork
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
